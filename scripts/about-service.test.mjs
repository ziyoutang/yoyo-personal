import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: [new URL('../auth/about-service.js', import.meta.url).pathname],
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'firestore-test-boundary', setup(builder) {
    builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: 'firestore', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
      export const doc = (db, collection, id) => ({db, path: collection + '/' + id});
      export const onSnapshot = (ref, next, error) => ref.db.listen(ref.path, next, error);
      export const runTransaction = (db, callback) => db.transaction(callback);
    ` }));
  } }],
});
const { createAboutService } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const content = {heading: 'About me', body: 'Biography', revision: 1};
function harness(t, initial = undefined) {
  let record = initial, active = true, accessLost = 0;
  const listeners = new Map();
  const snapshot = () => ({exists: () => record !== undefined, data: () => structuredClone(record)});
  const db = {
    attempts: 0, retry: null, fail: false,
    listen(path, next, error) { listeners.set(path, {next, error}); return () => listeners.delete(path); },
    async transaction(callback) {
      this.attempts++;
      let write;
      const result = await callback({get: async () => snapshot(), set: (ref, data) => { write = structuredClone(data); }});
      if (this.retry) { const retry = this.retry; this.retry = null; retry(); return this.transaction(callback); }
      if (this.fail) throw Object.assign(new Error('Offline'), {code: 'unavailable'});
      record = write;
      return result;
    },
  };
  const service = createAboutService(db, {email: 'editor@example.test'}, () => active, () => accessLost++);
  const role = value => listeners.get('allowedUsers/editor@example.test')?.next({data: () => value});
  const publish = () => listeners.get('siteContent/about')?.next(snapshot());
  role({enabled: true, canEditGallery: true}); publish();
  t.after(service.dispose);
  return {...service, db, role, publish, listeners, record: () => record, set: value => { record = value; },
    deactivate: () => { active = false; }, accessLost: () => accessLost};
}

test('missing About content is shown as defaults and first save creates revision one', async t => {
  const h = harness(t); let state;
  h.api.subscribe(value => { state = value; });
  assert.deepEqual(state.content, {heading: 'About me', body: '', revision: 0});
  assert.equal(state.loading, false);
  const saved = await h.api.save(0, {heading: 'Hello', body: 'My biography'});
  assert.deepEqual(saved, {heading: 'Hello', body: 'My biography', revision: 1});
  assert.deepEqual(h.record(), saved);
  await assert.rejects(h.api.save(0, {heading: 'Stale', body: ''}), {code: 'conflict'});
});

test('edits use revisions and transaction retries cannot overwrite concurrent edits', async t => {
  const h = harness(t, content);
  const saved = await h.api.save(1, {heading: 'Hello', body: 'Saved'});
  assert.equal(saved.revision, 2);
  h.db.retry = () => h.set({...content, body: 'Other editor', revision: 3});
  await assert.rejects(h.api.save(2, {heading: 'Hello', body: 'My draft'}), {code: 'conflict'});
  assert.equal(h.record().body, 'Other editor');
});

test('interrupted save leaves content intact and can retry', async t => {
  const h = harness(t, content); h.db.fail = true;
  await assert.rejects(h.api.save(1, {heading: 'Hello', body: 'Draft'}), {code: 'unavailable'});
  assert.deepEqual(h.record(), content);
  h.db.fail = false;
  assert.equal((await h.api.save(1, {heading: 'Hello', body: 'Draft'})).revision, 2);
});

test('invalid input is rejected before any transaction and text remains literal', async t => {
  const h = harness(t, content);
  for (const input of [null, {}, {heading: 'Hi'}, {heading: 1, body: ''}, {heading: '', body: []},
    {heading: 'x'.repeat(161), body: ''}, {heading: '', body: 'x'.repeat(10001)},
    {heading: '', body: '', permission: true}, {heading: '', body: '', revision: 1}]) {
    await assert.rejects(h.api.save(1, input), {code: 'invalid-argument'});
  }
  for (const revision of [-1, 0.5, '1', Number.MAX_SAFE_INTEGER]) {
    await assert.rejects(h.api.save(revision, {heading: '', body: ''}), {code: 'invalid-argument'});
  }
  assert.equal(h.db.attempts, 0);
  const text = '<script>alert(1)</script>\nSecond paragraph';
  assert.equal((await h.api.save(1, {heading: '', body: text})).body, text);
});

test('viewers, revoked permissions, inactive sessions and disposed services cannot save', async t => {
  const h = harness(t, content);
  h.role({enabled: true, canEditGallery: false});
  await assert.rejects(h.api.save(1, {heading: '', body: ''}), {code: 'permission-denied'});
  h.role({enabled: false, canEditGallery: true});
  assert.equal(h.accessLost(), 1);
  h.role({enabled: true, canEditGallery: true}); h.deactivate();
  await assert.rejects(h.api.save(1, {heading: '', body: ''}), {code: 'permission-denied'});
  assert.equal(h.db.attempts, 0);
  h.dispose(); assert.equal(h.listeners.size, 0);
  assert.throws(() => h.api.subscribe(() => {}), {code: 'permission-denied'});
});

test('subscriptions isolate content and report malformed data or access loss', t => {
  const h = harness(t, content); let state;
  h.api.subscribe(value => { state = value; });
  state.content.body = 'External mutation';
  h.api.subscribe(value => { assert.notEqual(value.content.body, 'External mutation'); });
  h.set({...content, extra: 'invalid'}); h.publish();
  assert.match(state.error, /could not be read/);
  h.listeners.get('siteContent/about').error({code: 'permission-denied'});
  assert.equal(state.canEdit, false);
  assert.match(state.error, /could not load/);
  assert.equal(h.accessLost(), 1);
});
