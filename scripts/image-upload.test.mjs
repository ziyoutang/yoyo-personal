import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeImage, MAX_IMAGE_BYTES, MAX_UPLOAD_BYTES } from '../public/image-upload.js';

const png = () => new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });

function browser(t, { width = 2400, height = 1200, size = () => 120, type = 'image/webp' } = {}) {
  const originalDocument = globalThis.document;
  const originalBitmap = globalThis.createImageBitmap;
  const calls = [];
  let closed = false;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage() {} }),
    toBlob(callback, mimeType, quality) {
      calls.push({ width: this.width, height: this.height, quality });
      callback(new Blob([new Uint8Array(size(this.width, quality))], { type }));
    },
  };
  globalThis.document = { createElement: () => canvas };
  globalThis.createImageBitmap = async (file, options) => {
    assert.equal(options.imageOrientation, 'from-image');
    return { width, height, close() { closed = true; } };
  };
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = originalBitmap;
  });
  return { calls, canvas, isClosed: () => closed };
}

test('rejects unsupported, mislabeled, and oversized files before decoding', async () => {
  await assert.rejects(optimizeImage(new Blob(['text'], { type: 'image/svg+xml' })), /JPEG, PNG, WebP, GIF, MP4, or WebM/);
  await assert.rejects(optimizeImage(new Blob(['not PNG'], { type: 'image/png' })), /not a valid/);
  await assert.rejects(optimizeImage({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 }), /20 MiB/);
});

test('preserves aspect ratio, caps size, and releases decoder and canvas', async t => {
  const state = browser(t);
  const image = await optimizeImage(png());
  t.after(() => URL.revokeObjectURL(image.previewUrl));
  assert.equal(image.width, 1600);
  assert.equal(image.height, 800);
  assert.equal(image.mimeType, 'image/webp');
  assert.equal(Buffer.from(image.base64, 'base64').byteLength, image.byteLength);
  assert.ok(image.previewUrl.startsWith('blob:'));
  assert.equal(state.isClosed(), true);
  assert.equal(state.canvas.width, 0);
});

test('small images are never upscaled', async t => {
  browser(t, { width: 500, height: 1000 });
  const image = await optimizeImage(png());
  t.after(() => URL.revokeObjectURL(image.previewUrl));
  assert.equal(image.width, 500);
  assert.equal(image.height, 1000);
});

test('tries quality reductions then smaller dimensions', async t => {
  const state = browser(t, { size: width => width > 1200 ? MAX_IMAGE_BYTES + 1 : MAX_IMAGE_BYTES });
  const image = await optimizeImage(png());
  t.after(() => URL.revokeObjectURL(image.previewUrl));
  assert.equal(image.width, 1200);
  assert.equal(image.byteLength, MAX_IMAGE_BYTES);
  assert.deepEqual(state.calls.slice(0, 4).map(call => call.quality), [0.85, 0.75, 0.65, 0.6]);
});

test('oversized optimized output is rejected and resources released', async t => {
  const state = browser(t, { size: () => MAX_IMAGE_BYTES + 1 });
  await assert.rejects(optimizeImage(png()), /Crop or simplify/);
  assert.equal(state.calls.at(-1).width, 800);
  assert.equal(state.isClosed(), true);
  assert.equal(state.canvas.width, 0);
});

test('does not silently accept PNG fallback when WebP encoding is unavailable', async t => {
  const state = browser(t, { type: 'image/png' });
  await assert.rejects(optimizeImage(png()), /could not create a WebP/);
  assert.equal(state.isClosed(), true);
  assert.equal(state.canvas.width, 0);
});

test('rejects excessive decoded dimensions and closes the bitmap', async t => {
  const state = browser(t, { width: 12000, height: 12000 });
  await assert.rejects(optimizeImage(png()), /100 megapixels/);
  assert.equal(state.isClosed(), true);
});

test('decoder failure produces a useful error', async t => {
  browser(t);
  globalThis.createImageBitmap = async () => { throw new Error('decoder error'); };
  await assert.rejects(optimizeImage(png()), /Export it again/);
});

const motionFile = type => new Blob([
  type === 'image/gif' ? 'GIF89a original animated bytes' :
    type === 'video/mp4' ? new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109]) :
      new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 1, 2, 3]),
], { type });

function motionBrowser(t, { width = 320, height = 180, duration = 2, failure = false, timeout = false } = {}) {
  const originals = Object.fromEntries(['Image', 'document', 'setTimeout', 'clearTimeout'].map(key => [key, globalThis[key]]));
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const created = [];
  const revoked = [];
  const media = [];
  let cleared = false;
  class Media {
    naturalWidth = width;
    naturalHeight = height;
    videoWidth = width;
    videoHeight = height;
    duration = duration;
    constructor() { media.push(this); }
    set src(value) {
      this.source = value;
      if (!value || timeout) return;
      queueMicrotask(() => {
        if (failure) this.onerror?.();
        else (this.onload || this.onloadedmetadata)?.();
      });
    }
    removeAttribute(name) { assert.equal(name, 'src'); this.source = ''; }
    load() { this.released = true; }
  }
  globalThis.Image = Media;
  globalThis.document = { createElement(tag) { assert.equal(tag, 'video'); return new Media(); } };
  globalThis.setTimeout = (callback, delay) => {
    assert.equal(delay, 15000);
    if (timeout) queueMicrotask(callback);
    return 1;
  };
  globalThis.clearTimeout = id => { assert.equal(id, 1); cleared = true; };
  URL.createObjectURL = blob => { const url = originalCreate(blob); created.push(url); return url; };
  URL.revokeObjectURL = url => { revoked.push(url); originalRevoke(url); };
  t.after(() => {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    created.forEach(originalRevoke);
  });
  return { created, revoked, media, isCleared: () => cleared };
}

for (const type of ['image/gif', 'video/mp4', 'video/webm']) {
  test(`${type} preserves bytes and MIME and releases metadata decoder`, async t => {
    const state = motionBrowser(t);
    const file = motionFile(type);
    const result = await optimizeImage(file);
    assert.equal(result.mimeType, type);
    assert.equal(result.width, 320);
    assert.equal(result.height, 180);
    assert.equal(result.byteLength, file.size);
    assert.deepEqual(Buffer.from(result.base64, 'base64'), Buffer.from(await file.arrayBuffer()));
    assert.equal(state.created.length, 2);
    assert.deepEqual(state.revoked, [state.created[0]]);
    assert.equal(result.previewUrl, state.created[1]);
    assert.equal(state.media[0].source, '');
    assert.equal(state.isCleared(), true);
    if (type.startsWith('video/')) assert.equal(state.media[0].released, true);
  });

  test(`${type} rejects oversized files and incorrect signatures before decoding`, async () => {
    await assert.rejects(optimizeImage({ type, size: MAX_IMAGE_BYTES + 1 }), /600 KiB/);
    await assert.rejects(optimizeImage(new Blob(['invalid'], { type })), /not a valid/);
  });
}

for (const options of [{ width: 1601 }, { height: 1601 }, { width: 0 }, { duration: Infinity }, { duration: 0 }]) {
  test(`video rejects invalid metadata ${JSON.stringify(options)}`, async t => {
    const state = motionBrowser(t, options);
    await assert.rejects(optimizeImage(motionFile('video/mp4')), /valid media/);
    assert.deepEqual(state.revoked, state.created);
    assert.equal(state.isCleared(), true);
  });
}

for (const type of ['image/gif', 'video/mp4']) {
  test(`${type} decode failure releases its temporary URL`, async t => {
    const state = motionBrowser(t, { failure: true });
    await assert.rejects(optimizeImage(motionFile(type)), /could not open/);
    assert.deepEqual(state.revoked, state.created);
    assert.equal(state.isCleared(), true);
  });
  test(`${type} decode timeout releases its temporary URL`, async t => {
    const state = motionBrowser(t, { timeout: true });
    await assert.rejects(optimizeImage(motionFile(type)), /too long/);
    assert.deepEqual(state.revoked, state.created);
    assert.equal(state.isCleared(), true);
  });
}

test('GIF87a is accepted without canvas conversion', async t => {
  motionBrowser(t);
  const file = new Blob(['GIF87a animation'], { type: 'image/gif' });
  const result = await optimizeImage(file);
  assert.equal(result.base64, Buffer.from(await file.arrayBuffer()).toString('base64'));
});

test('GIF dimension limit rejects instead of flattening animation', async t => {
  const state = motionBrowser(t, { height: 1601 });
  await assert.rejects(optimizeImage(motionFile('image/gif')), /1,600 pixels/);
  assert.deepEqual(state.revoked, state.created);
});

test('motion media accepts the exact byte and dimension limits', async t => {
  motionBrowser(t, { width: 1600, height: 1600 });
  const header = motionFile('video/mp4');
  const file = new Blob([header, new Uint8Array(MAX_IMAGE_BYTES - header.size)], { type: 'video/mp4' });
  const result = await optimizeImage(file);
  assert.equal(result.byteLength, MAX_IMAGE_BYTES);
  assert.equal(result.width, 1600);
  assert.equal(result.height, 1600);
});
