export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 600 * 1024;

async function validateFile(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'].includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, WebP, GIF, MP4, or WebM file.');
  }
  if (isMotion(file.type) && file.size > MAX_IMAGE_BYTES) throw new Error('GIFs and videos must be no larger than 600 KiB. Compress the file before uploading.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Choose an image no larger than 20 MiB.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const matches = file.type === 'image/jpeg'
    ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : file.type === 'image/png'
      ? [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
      : file.type === 'image/gif'
        ? ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...bytes.slice(0, 6)))
        : file.type === 'video/mp4'
          ? String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
          : file.type === 'video/webm'
            ? [0x1a, 0x45, 0xdf, 0xa3].every((value, index) => bytes[index] === value)
            : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!matches) throw new Error('This file is not a valid JPEG, PNG, WebP, GIF, MP4, or WebM file.');
}

function isMotion(type) {
  return type === 'image/gif' || type.startsWith('video/');
}

async function packageMedia(blob, width, height) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return {
    base64: btoa(binary), width, height, mimeType: blob.type,
    previewUrl: URL.createObjectURL(blob), byteLength: blob.size,
  };
}

function motionDimensions(file) {
  return new Promise((resolve, reject) => {
    const video = file.type.startsWith('video/');
    const media = video ? document.createElement('video') : new Image();
    const url = URL.createObjectURL(file);
    const finish = (error) => {
      clearTimeout(timer);
      const width = video ? media.videoWidth : media.naturalWidth;
      const height = video ? media.videoHeight : media.naturalHeight;
      const duration = video ? media.duration : 1;
      media.onload = media.onloadedmetadata = media.onerror = null;
      if (video) { media.removeAttribute('src'); media.load(); }
      else media.src = '';
      URL.revokeObjectURL(url);
      if (error) reject(error);
      else if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        width > 1600 || height > 1600 || !Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Use valid media with dimensions no larger than 1,600 pixels on either edge.'));
      } else resolve({ width, height });
    };
    const timer = setTimeout(() => finish(new Error('This media took too long to open. Export it again and retry.')), 15000);
    media.onerror = () => finish(new Error('Your browser could not open this GIF or video. Export it again in a supported format.'));
    if (video) { media.preload = 'metadata'; media.onloadedmetadata = () => finish(); }
    else media.onload = () => finish();
    media.src = url;
  });
}

function encode(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob || blob.type !== 'image/webp') {
        reject(new Error('Your browser could not create a WebP image. Try a current version of Chrome, Safari, or Firefox.'));
      } else resolve(blob);
    }, 'image/webp', quality);
  });
}

// Optimization stays in the browser. The caller owns and must revoke previewUrl.
export async function optimizeImage(file) {
  await validateFile(file);
  if (isMotion(file.type)) {
    const { width, height } = await motionDimensions(file);
    return packageMedia(file, width, height);
  }
  let bitmap;
  let canvas;
  try {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      throw new Error('This image could not be opened. Export it again as JPEG, PNG, or WebP and retry.');
    }
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 100_000_000) {
      throw new Error('This image is too large to process. Resize it below 100 megapixels and retry.');
    }
    canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not process this image. Please reload and retry.');
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const firstEdge = Math.min(1600, longestEdge);
    const edges = [firstEdge, ...[1400, 1200, 1000, 800].filter(edge => edge < firstEdge)];
    for (const edge of edges) {
      canvas.width = Math.max(1, Math.round(bitmap.width * edge / longestEdge));
      canvas.height = Math.max(1, Math.round(bitmap.height * edge / longestEdge));
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of edge === firstEdge ? [0.85, 0.75, 0.65, 0.6] : [0.6]) {
        const blob = await encode(canvas, quality);
        if (blob.size > MAX_IMAGE_BYTES) continue;
        return packageMedia(blob, canvas.width, canvas.height);
      }
    }
    throw new Error('This image cannot fit within 600 KiB. Crop or simplify it in an image editor, then try again.');
  } finally {
    bitmap?.close();
    if (canvas) canvas.width = canvas.height = 0;
  }
}
