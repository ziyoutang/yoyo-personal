import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEdit, categories, initialArtworks, validateImage, validateItem } from '../auth/gallery-model.js';

function artwork(overrides = {}) {
  const { id, ...item } = initialArtworks[0];
  return { ...item, ...overrides };
}

const invalid = error => error.code === 'invalid-argument';
const conflict = error => error.code === 'conflict' && /Reload or reapply/.test(error.message);

test('all four seeds satisfy the document schema without their IDs', () => {
  assert.equal(initialArtworks.length, 4);
  assert.equal(new Set(initialArtworks.map(item => item.id)).size, 4);
  for (const { id, ...item } of initialArtworks) assert.deepEqual(validateItem(item), item);
  const news = initialArtworks.find(item => item.id === 'news-report');
  assert.equal(news.overlayText, 'news report');
  assert.equal(news.overlayYear, '2024');
});

test('validates every supported category and uploaded image references', () => {
  for (const category of categories) assert.equal(validateItem(artwork({ category })).category, category);
  assert.equal(validateItem(artwork({ imageKind: 'uploaded', imageRef: 'upload_123-ABC' })).imageKind, 'uploaded');
});

test('rejects unknown fields, missing fields, invalid categories, and unsafe asset references', () => {
  for (const patch of [
    { secret: true }, { title: undefined }, { caption: 12 }, { category: 'Other' },
    { visible: 'true' }, { imageKind: 'external' }, { imageRef: 'other.png' },
    { imageKind: 'uploaded', imageRef: '../private' }, { imageKind: 'uploaded', imageRef: '' },
  ]) assert.throws(() => validateItem(artwork(patch)), invalid);
});

test('text fields accept their documented limits and reject longer values', () => {
  for (const [field, limit] of Object.entries({ title: 160, caption: 3000, alt: 500, overlayText: 100, overlayYear: 20 })) {
    assert.equal(validateItem(artwork({ [field]: 'a'.repeat(limit) }))[field].length, limit);
    assert.throws(() => validateItem(artwork({ [field]: 'a'.repeat(limit + 1) })), invalid);
  }
});

test('rejects invalid positions and noninteger or unsafe revisions', () => {
  for (const order of [-1, NaN, Infinity, 1e15 + 1, '1']) assert.throws(() => validateItem(artwork({ order })), invalid);
  for (const revision of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1']) {
    assert.throws(() => validateItem(artwork({ revision })), invalid);
  }
});

test('editing increments revision while preserving other fields and input objects', () => {
  const current = artwork({ revision: 4, order: 2 });
  const patch = { caption: 'New caption', visible: false };
  const before = structuredClone(current);
  const next = applyEdit(current, 4, patch);
  assert.deepEqual(next, { ...current, caption: 'New caption', visible: false, revision: 5 });
  assert.deepEqual(current, before);
  assert.deepEqual(patch, { caption: 'New caption', visible: false });
});

test('stale, missing, and string revisions produce actionable conflicts without changing data', () => {
  const current = artwork({ revision: 4 });
  for (const expected of [3, 5, undefined, '4']) assert.throws(() => applyEdit(current, expected, { title: 'Conflict' }), conflict);
  assert.throws(() => applyEdit(null, 4, { title: 'Deleted' }), conflict);
  assert.equal(current.title, initialArtworks[0].title);
});

test('patches cannot overwrite server-managed order or revision or inject new fields', () => {
  for (const patch of [{ order: 0 }, { revision: 20 }, { id: 'new-id' }, { canEditGallery: true }]) {
    assert.throws(() => applyEdit(artwork(), 1, patch), invalid);
  }
});

test('moving categories places artwork at the current timestamp; same-category edits retain order', t => {
  const timestamp = 1792092345000;
  t.mock.method(Date, 'now', () => timestamp);
  const current = artwork({ order: 2 });
  const moved = applyEdit(current, 1, { category: 'Paintings' });
  assert.equal(moved.category, 'Paintings');
  assert.equal(moved.order, timestamp);
  assert.equal(moved.revision, 2);
  assert.equal(applyEdit(current, 1, { category: current.category }).order, 2);
  assert.equal(current.category, 'Installation');
  assert.equal(current.order, 2);
});

test('accepts optimized images at the size and dimension boundaries', () => {
  const image = { base64: 'A'.repeat(819200), mimeType: 'image/webp', width: 1600, height: 1 };
  assert.deepEqual(validateImage(image), image);
});

test('accepts GIF and small video metadata within the same media limits', () => {
  for (const mimeType of ['image/gif', 'video/mp4', 'video/webm']) {
    const media = { base64: 'A'.repeat(819200), mimeType, width: 1600, height: 900 };
    assert.deepEqual(validateImage(media), media);
    assert.throws(() => validateImage({ ...media, base64: 'A'.repeat(819201) }), invalid);
    assert.throws(() => validateImage({ ...media, width: 1601 }), invalid);
  }
});

test('rejects active content and unsupported media types', () => {
  for (const mimeType of ['text/html', 'image/svg+xml', 'application/javascript', 'video/quicktime', 'audio/mpeg', 'video/MP4']) {
    assert.throws(() => validateImage({ base64: 'AAAA', mimeType, width: 100, height: 100 }), invalid);
  }
});

test('rejects malformed image metadata, extra fields, and oversized image payloads', () => {
  const image = { base64: 'AAAA', mimeType: 'image/webp', width: 800, height: 600 };
  for (const patch of [
    { base64: '' }, { base64: 'data:image/webp;base64,AAAA' }, { base64: '*invalid*' },
    { base64: 'A'.repeat(819201) }, { mimeType: 'image/png' }, { width: 0 },
    { width: 1601 }, { height: 0.5 }, { height: '600' }, { previewUrl: 'blob:test' },
  ]) assert.throws(() => validateImage({ ...image, ...patch }), invalid);
});
