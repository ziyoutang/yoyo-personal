import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { setupPublicContent } from '../public/public-content-service.js';
import { publishedContent } from '../public/published-content.js';

test('public visitors receive current content with no editing methods or permissions', async () => {
  setupPublicContent();
  let gallery, about;
  globalThis.portfolioGallery.subscribe(value => { gallery = value; });
  globalThis.portfolioAbout.subscribe(value => { about = value; });
  assert.equal(gallery.loading, false);
  assert.equal(gallery.canEdit, false);
  assert.equal(about.canEdit, false);
  assert.deepEqual(about.content, publishedContent.about);
  assert.equal(globalThis.portfolioGallery.save, undefined);
  assert.equal(globalThis.portfolioGallery.upload, undefined);
  assert.equal(globalThis.portfolioAbout.save, undefined);
  const ids = new Set(gallery.items.map(item => item.id));
  for (const item of gallery.items) {
    assert.equal(item.visible, true);
    if (item.imageKind === 'uploaded') {
      const image = await globalThis.portfolioGallery.getImage(item.imageRef);
      assert.ok(existsSync('public' + image.url));
    }
  }
  for (const layout of Object.values(gallery.layouts)) for (const id of layout.slots) assert.ok(id === null || ids.has(id));
  gallery.items.length = 0;
  assert.ok(publishedContent.items.length > 0, 'visitors cannot mutate the published snapshot');
});
