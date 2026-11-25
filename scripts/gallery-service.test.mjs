import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { initialArtworks, editableFields, categories } from '../auth/gallery-model.js';

import { initialLayout } from '../public/gallery-layout.js';

// Bundle the actual service against an in-memory SDK boundary, not a copy of its logic.
const bundled = await build({
  entryPoints: [new URL('../auth/gallery-service.js', import.meta.url).pathname],
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'firestore-test-boundary', setup(builder) {
    builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: 'firestore', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
      export const collection = (db, path) => ({ db, path });
      export function doc(parent, collectionName, id) {
        if (collectionName === undefined) {
          id = 'generated-' + ++parent.db.sequence;
          return { db: parent.db, path: parent.path + '/' + id, id };
        }
        return { db: parent, path: collectionName + '/' + id, id };
      }
      export const onSnapshot = (ref, next, error) => ref.db.listen(ref.path, next, error);
      export const getDocFromServer = ref => ref.db.read(ref);
      export const runTransaction = (db, callback) => db.transaction(callback);
    ` }));
  } }],
});
const { createGalleryService } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const editorEmail = 'editor@example.test';
const image = () => ({ base64: 'AAAA', mimeType: 'image/webp', width: 100, height: 50 });
const conflict = error => error.code === 'conflict';
const denied = error => error.code === 'permission-denied';

function harness(t) {
  const records = new Map(initialArtworks.map(({ id, ...item }) => [`galleryItems/${id}`, item]));
  for (const category of categories) records.set(`galleryLayouts/${category}`, initialLayout(initialArtworks, category));
  const listeners = new Map();
  const snapshot = ref => ({ ref, id: ref.id, exists: () => records.has(ref.path), data: () => structuredClone(records.get(ref.path)) });
  const db = {
    sequence: 0, readCount: 0, transactionCount: 0, beforeCommit: null, retryOnce: null,
    listen(path, next, error) { listeners.set(path, { next, error }); return () => listeners.delete(path); },
    async read(ref) { this.readCount++; return snapshot(ref); },
    async transaction(callback) {
      this.transactionCount++;
      const writes = [];
      const tx = {
        get: async ref => snapshot(ref),
        set: (ref, data) => writes.push(() => records.set(ref.path, structuredClone(data))),
        update: (ref, data) => writes.push(() => records.set(ref.path, { ...records.get(ref.path), ...structuredClone(data) })),
        delete: ref => writes.push(() => records.delete(ref.path)),
      };
      const result = await callback(tx);
      if (this.retryOnce) {
        const retry = this.retryOnce; this.retryOnce = null;
        retry();
        return this.transaction(callback);
      }
      if (this.beforeCommit) await this.beforeCommit();
      for (const write of writes) write();
      return result;
    },
  };
  let active = true;
  let accessLost = 0;
  const service = createGalleryService(db, { email: editorEmail }, () => active, () => accessLost++);
  const role = data => listeners.get(`allowedUsers/${editorEmail}`)?.next({ data: () => data });
  const publishItems = () => listeners.get('galleryItems')?.next({ docs: [...records.keys()].filter(path => path.startsWith('galleryItems/')).map(path => snapshot({ path, id: path.split('/')[1] })) });
  const publishLayouts = () => listeners.get('galleryLayouts')?.next({ docs: [...records.keys()].filter(path => path.startsWith('galleryLayouts/')).map(path => snapshot({ path, id: path.split('/')[1] })) });
  role({ enabled: true, canEditGallery: true });
  publishItems();
  publishLayouts();
  t.after(() => service.dispose());
  return { ...service, db, records, listeners, role, publishItems, publishLayouts, accessLost: () => accessLost, deactivate: () => { active = false; } };
}

test('successful edits commit a new revision and stale or deleted edits do not write', async t => {
  const h = harness(t);
  const saved = await h.api.save('installation-1', 1, { caption: 'Saved caption' });
  assert.equal(saved.revision, 2);
  assert.equal(h.records.get('galleryItems/installation-1').caption, 'Saved caption');
  await assert.rejects(h.api.save('installation-1', 1, { caption: 'Stale edit' }), conflict);
  await assert.rejects(h.api.save('deleted', 1, { caption: 'Deleted edit' }), conflict);
  assert.equal(h.records.get('galleryItems/installation-1').caption, 'Saved caption');
});

test('a transaction retry detects a concurrent edit instead of overwriting it', async t => {
  const h = harness(t);
  h.db.retryOnce = () => {
    const current = h.records.get('galleryItems/installation-1');
    h.records.set('galleryItems/installation-1', { ...current, caption: 'Other session', revision: 2 });
  };
  await assert.rejects(h.api.save('installation-1', 1, { caption: 'My edit' }), conflict);
  assert.equal(h.records.get('galleryItems/installation-1').caption, 'Other session');
});

test('failed upload commits neither an image nor an artwork reference; retry is possible', async t => {
  const h = harness(t);
  const before = structuredClone([...h.records]);
  h.db.beforeCommit = () => { throw Object.assign(new Error('Connection interrupted'), { code: 'unavailable' }); };
  await assert.rejects(h.api.upload(image()), { code: 'unavailable' });
  assert.deepEqual([...h.records], before);
  h.db.beforeCommit = null;
  const imageRef = await h.api.upload(image());
  assert.deepEqual(h.records.get(`galleryImages/${imageRef}`), image());
  assert.deepEqual([...h.records].filter(([path]) => path.startsWith('galleryItems/')), before.filter(([path]) => path.startsWith('galleryItems/')));
  await h.api.save('installation-1', 1, { imageKind: 'uploaded', imageRef });
  assert.equal(h.records.get('galleryItems/installation-1').imageRef, imageRef);
});

test('failed replacement preserves the existing reference and retains the uploaded image for retry', async t => {
  const h = harness(t);
  const imageRef = await h.api.upload(image());
  h.db.beforeCommit = () => { throw new Error('Commit interrupted'); };
  await assert.rejects(h.api.save('installation-1', 1, { imageKind: 'uploaded', imageRef }), /interrupted/);
  assert.equal(h.records.get('galleryItems/installation-1').imageRef, 'f50dd.png');
  assert.ok(h.records.has(`galleryImages/${imageRef}`));
});

test('revoked editing permission blocks every write operation without starting a transaction', async t => {
  const h = harness(t);
  h.role({ enabled: true, canEditGallery: false });
  for (const operation of [
    () => h.api.save('installation-1', 1, { title: 'Edit' }),
    () => h.api.add({}), () => h.api.upload(image()),
    () => h.api.remove('installation-1', 1), () => h.api.reorder('Installation', []),
    () => h.api.move('Installation', 1, 0, 3),
  ]) await assert.rejects(operation(), denied);
  assert.equal(h.db.transactionCount, 0);
  h.role({ enabled: false, canEditGallery: true });
  assert.equal(h.accessLost(), 1);
});

test('slot moves update layout revisions only and stale moves leave all records unchanged', async t => {
  const h = harness(t);
  const result = await h.api.move('Installation', 1, 0, 3);
  assert.deepEqual(result.slots, ['news-report', 'installation-2', 'installation-3', 'installation-1']);
  assert.equal(result.revision, 2);
  assert.equal(h.records.get('galleryItems/installation-1').revision, 1);
  const before = structuredClone([...h.records]);
  await assert.rejects(h.api.move('Installation', 1, 3, 0), conflict);
  assert.deepEqual([...h.records], before);
  await assert.rejects(h.api.reorder(), { code: 'refresh-required' });
});

test('new artwork receives a generated ID and removal preserves its uploaded image', async t => {
  const h = harness(t);
  const imageRef = await h.api.upload(image());
  const input = Object.fromEntries(editableFields.map(field => [field, initialArtworks[0][field]]));
  const added = await h.api.add({ ...input, imageKind: 'uploaded', imageRef });
  assert.equal(added.revision, 1);
  assert.ok(h.records.has(`galleryItems/${added.id}`));
  await assert.rejects(h.api.remove(added.id, 2), conflict);
  h.publishLayouts();
  await h.api.remove(added.id, 1);
  assert.equal(h.records.has(`galleryItems/${added.id}`), false);
  assert.ok(h.records.has(`galleryImages/${imageRef}`));
});

test('image reads are cached and disposal revokes URLs and unsubscribes', async t => {
  const h = harness(t);
  const imageRef = await h.api.upload(image());
  const revoked = [];
  const originalRevoke = URL.revokeObjectURL;
  t.mock.method(URL, 'revokeObjectURL', url => { revoked.push(url); originalRevoke.call(URL, url); });
  const first = await h.api.getImage(imageRef);
  assert.equal(await h.api.getImage(imageRef), first);
  assert.equal(h.db.readCount, 1);
  h.dispose();
  assert.equal(first.mimeType, 'image/webp');
  assert.match(first.url, /^blob:/);
  assert.deepEqual(revoked, [first.url]);
  assert.equal(h.listeners.size, 0);
  await assert.rejects(h.api.getImage(imageRef), denied);
});

test('missing images can retry and disabled sessions cannot read', async t => {
  const h = harness(t);
  await assert.rejects(h.api.getImage('missing'), /unavailable/);
  await assert.rejects(h.api.getImage('missing'), /unavailable/);
  assert.equal(h.db.readCount, 2);
  h.deactivate();
  await assert.rejects(h.api.getImage('missing'), denied);
});

test('subscriptions isolate consumer mutation and report permission errors', t => {
  const h = harness(t);
  let latest;
  h.api.subscribe(state => { latest = state; });
  latest.items[0].title = 'Consumer mutation';
  h.api.subscribe(state => { assert.notEqual(state.items[0].title, 'Consumer mutation'); });
  h.listeners.get('galleryItems').error({ code: 'permission-denied' });
  assert.equal(latest.canEdit, false);
  assert.match(latest.error, /could not load/);
  assert.equal(h.accessLost(), 1);
});

for (const mimeType of ['image/gif', 'video/mp4', 'video/webm']) {
  test(`${mimeType} survives upload and media reads without changing bytes`, async t => {
    const h = harness(t);
    const original = { ...image(), mimeType };
    const id = await h.api.upload(original);
    const media = await h.api.getImage(id);
    assert.equal(media.mimeType, mimeType);
    const response = await fetch(media.url);
    assert.equal(response.headers.get('content-type'), mimeType);
    assert.equal(Buffer.from(await response.arrayBuffer()).toString('base64'), original.base64);
    h.dispose();
  });
}

test('category moves atomically update both layouts while retaining artwork order', async t => {
  const h = harness(t);
  const result = await h.api.save('news-report', 1, { category: 'Paintings' });
  assert.equal(result.order, 1);
  assert.deepEqual(h.records.get('galleryLayouts/Installation').slots, ['installation-1', null, 'installation-2', 'installation-3']);
  assert.deepEqual(h.records.get('galleryLayouts/Paintings').slots, ['news-report', null, null, null]);
  assert.equal(h.records.get('galleryLayouts/Paintings').revision, 2);
});

test('category move conflicts and failed layout saves commit nothing', async t => {
  const h = harness(t);
  const before = structuredClone([...h.records]);
  await assert.rejects(h.api.save('news-report', 1, { category: 'Paintings' }, { Installation: 1, Paintings: 99 }), conflict);
  assert.deepEqual([...h.records], before);
  h.db.beforeCommit = () => { throw Object.assign(new Error('Offline'), { code: 'unavailable' }); };
  await assert.rejects(h.api.move('Installation', 1, 0, 4), { code: 'unavailable' });
  assert.deepEqual([...h.records], before);
});

test('explicit new artwork placement preserves gaps and removal trims trailing pages', async t => {
  const h = harness(t);
  const input = Object.fromEntries(editableFields.map(field => [field, initialArtworks[0][field]]));
  const item = await h.api.add(input, { slot: 7, revision: 1 });
  assert.deepEqual(h.records.get('galleryLayouts/Installation').slots.slice(4), [null, null, null, item.id]);
  await h.api.remove(item.id, 1, 2);
  assert.equal(h.records.get('galleryLayouts/Installation').slots.length, 4);
  assert.equal(h.records.has(`galleryItems/${item.id}`), false);
});

test('missing layouts require refresh and snapshot copies cannot mutate service layouts', async t => {
  const h = harness(t);
  let latest;
  h.api.subscribe(state => { latest = state; });
  latest.layouts.Installation.slots[0] = null;
  h.api.subscribe(state => { assert.equal(state.layouts.Installation.slots[0], 'installation-1'); });
  h.records.delete('galleryLayouts/Installation');
  await assert.rejects(h.api.move('Installation', 1, 0, 3), { code: 'refresh-required' });
});

test('a retried layout move detects concurrent reordering', async t => {
  const h = harness(t);
  h.db.retryOnce = () => h.records.set('galleryLayouts/Installation', { slots: ['news-report', 'installation-1', 'installation-2', 'installation-3'], revision: 2 });
  await assert.rejects(h.api.move('Installation', 1, 0, 3), conflict);
  assert.equal(h.records.get('galleryLayouts/Installation').slots[0], 'news-report');
});
