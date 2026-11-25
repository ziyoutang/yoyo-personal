import { realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const project = 'yoyo-personal-portfolio';
const binary = realpathSync(execFileSync('which', ['firebase'], { encoding: 'utf8' }).trim());
const require = createRequire(binary);
const auth = require(resolve(dirname(binary), '..', 'auth.js'));
const account = auth.getProjectDefaultAccount(process.cwd());
if (!account) throw new Error('Sign in to Firebase CLI as the hosting owner first.');
const { access_token } = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);

const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const headers = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };
async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers });
  if (!response.ok) throw new Error(`Firestore request failed: HTTP ${response.status}`);
  return response.json();
}

// Deploy placement-protecting rules first. This migration never updates artworks or permissions.
const { categories } = await import('../auth/gallery-model.js');
const { initialLayout, validateLayout } = await import('../public/gallery-layout.js');
async function list(collection) {
  const documents = [];
  let token;
  do {
    const page = await request('/' + collection + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    documents.push(...(page.documents || [])); token = page.nextPageToken;
  } while (token);
  return documents;
}
const [artworks, layouts] = await Promise.all([list('galleryItems'), list('galleryLayouts')]);
const items = artworks.map(d => ({ id: d.name.split('/').pop(), category: d.fields.category.stringValue, order: Number(d.fields.order.integerValue ?? d.fields.order.doubleValue) }));
const writes = [];
for (const category of categories) {
  if (layouts.some(d => d.name.split('/').pop() === category)) continue;
  const layout = initialLayout(items, category);
  validateLayout(layout);
  writes.push({
    update: { name: 'projects/' + project + '/databases/(default)/documents/galleryLayouts/' + category,
      fields: { slots: { arrayValue: { values: layout.slots.map(id => id === null ? { nullValue: null } : { stringValue: id }) } }, revision: { integerValue: '1' } } },
    currentDocument: { exists: false },
  });
}
if (writes.length) {
  // Guard against metadata edits that could change category/order while reading the initial state.
  for (const artwork of artworks) writes.push({ verify: artwork.name, currentDocument: { updateTime: artwork.updateTime } });
  await request(':commit', { method: 'POST', body: JSON.stringify({ writes }) });
}
const saved = await list('galleryLayouts');
for (const category of categories) {
  const document = saved.find(d => d.name.split('/').pop() === category);
  if (!document) throw new Error('Layout missing after migration: ' + category);
  validateLayout({slots: document.fields.slots.arrayValue.values.map(v => v.stringValue ?? null), revision: Number(document.fields.revision.integerValue)});
}
console.log('Verified five category layouts. Existing layouts, artwork, media and permissions preserved.');
