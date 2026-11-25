export const categories = ['Installation', 'Multi-Media', 'Paintings', 'Illustrations', 'Film'];
export const bundledImages = ['f50dd.png', 'aa09b.png', '60cc7.png', 'f61dc.png'];
const textLimits = { title: 160, caption: 3000, alt: 500, overlayText: 100, overlayYear: 20 };
export const editableFields = [...Object.keys(textLimits), 'category', 'visible', 'imageKind', 'imageRef'];

export function galleryError(code, message) {
  return Object.assign(new Error(message), { code });
}

export function validateItem(item) {
  if (Object.keys(item).some(key => ![...editableFields, 'order', 'revision'].includes(key))) throw galleryError('invalid-argument', 'Unknown artwork field.');
  for (const [field, limit] of Object.entries(textLimits)) {
    if (typeof item[field] !== 'string' || item[field].length > limit) throw galleryError('invalid-argument', `${field} must be text with at most ${limit} characters.`);
  }
  if (!categories.includes(item.category) || typeof item.visible !== 'boolean') throw galleryError('invalid-argument', 'Choose a valid category and visibility.');
  if (!['bundled', 'uploaded'].includes(item.imageKind) || typeof item.imageRef !== 'string' || !/^[\w.-]{1,100}$/.test(item.imageRef)) throw galleryError('invalid-argument', 'Choose an image for this artwork.');
  if (item.imageKind === 'bundled' && !bundledImages.includes(item.imageRef)) throw galleryError('invalid-argument', 'Unknown bundled image.');
  if (!Number.isFinite(item.order) || item.order < 0 || item.order > 1e15 || !Number.isSafeInteger(item.revision) || item.revision < 1) throw galleryError('invalid-argument', 'Invalid artwork revision or position.');
  return item;
}

export function applyEdit(current, expectedRevision, patch) {
  if (!current || current.revision !== expectedRevision) throw galleryError('conflict', 'This artwork changed in another session. Reload or reapply your edits.');
  if (Object.keys(patch).some(key => !editableFields.includes(key))) throw galleryError('invalid-argument', 'Unsupported artwork change.');
  const next = { ...current, ...patch, revision: current.revision + 1 };
  if (next.category !== current.category) next.order = Date.now();
  return validateItem(next);
}

export function validateImage(image) {
  if (Object.keys(image).sort().join(',') !== 'base64,height,mimeType,width' || !['image/webp', 'image/gif', 'video/mp4', 'video/webm'].includes(image.mimeType) || typeof image.base64 !== 'string' || !image.base64.length || image.base64.length > 819200 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64)) throw galleryError('invalid-argument', 'Choose WebP, GIF, MP4, or WebM media no larger than 600 KiB.');
  for (const dim of ['width', 'height']) if (!Number.isInteger(image[dim]) || image[dim] < 1 || image[dim] > 1600) throw galleryError('invalid-argument', 'Media must be at most 1,600 pixels per side.');
  return image;
}

export const initialArtworks = [
  ['installation-1', 'f50dd.png', 'Installation artwork'],
  ['news-report', 'aa09b.png', 'News report, 2024'],
  ['installation-2', '60cc7.png', 'Installation artwork detail'],
  ['installation-3', 'f61dc.png', 'Installation artwork in a gallery'],
].map(([id, imageRef, title], order) => ({ id, title, caption: '', alt: title, category: 'Installation', visible: true, imageKind: 'bundled', imageRef, overlayText: id === 'news-report' ? 'news report' : '', overlayYear: id === 'news-report' ? '2024' : '', order, revision: 1 }));
