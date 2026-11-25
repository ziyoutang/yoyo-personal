import { realpathSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { validateItem, validateImage } from '../auth/gallery-model.js';

const binary = realpathSync(execFileSync('which', ['firebase'], { encoding: 'utf8' }).trim());
const require = createRequire(binary);
const auth = require(resolve(dirname(binary), '..', 'auth.js'));
const account = auth.getProjectDefaultAccount(process.cwd());
if (!account) throw new Error('Sign in to Firebase CLI as the hosting owner first.');
const { access_token } = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const base = 'https://firestore.googleapis.com/v1/projects/yoyo-personal-portfolio/databases/(default)/documents';
async function request(path) {
  const response = await fetch(base + path, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!response.ok) throw new Error(`Content export failed: HTTP ${response.status}`);
  return response.json();
}
function decode(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return fields(value.mapValue.fields || {});
  throw new Error('Unsupported published content field.');
}
const fields = values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, decode(value)]));
async function list(collection) {
  const documents = [];
  let token;
  do {
    const page = await request(`/${collection}?pageSize=300${token ? '&pageToken=' + encodeURIComponent(token) : ''}`);
    documents.push(...(page.documents || []));
    token = page.nextPageToken;
  } while (token);
  return documents.map(document => ({ id: document.name.split('/').pop(), ...fields(document.fields) }));
}
const [artworks, placements, aboutDocument] = await Promise.all([list('galleryItems'), list('galleryLayouts'), request('/siteContent/about')]);
const items = artworks.filter(item => item.visible).map(({ id, ...item }) => ({ id, ...validateItem(item) }));
const ids = new Set(items.map(item => item.id));
const layouts = Object.fromEntries(placements.map(layout => [layout.id, { revision: layout.revision, slots: layout.slots.map(id => ids.has(id) ? id : null) }]));
const images = {};
const extensions = { 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' };
for (const id of new Set(items.filter(item => item.imageKind === 'uploaded').map(item => item.imageRef))) {
  const document = await request('/galleryImages/' + encodeURIComponent(id));
  const image = validateImage(fields(document.fields));
  const name = `published-${id}.${extensions[image.mimeType]}`;
  await writeFile('public/assets/' + name, Buffer.from(image.base64, 'base64'));
  images[id] = { url: '/assets/' + name, mimeType: image.mimeType };
}
const about = fields(aboutDocument.fields);
const content = { items, layouts, images, about: { heading: about.heading, body: about.body, revision: about.revision } };
await writeFile('public/published-content.js', `// Published portfolio snapshot. Contains no access credentials or editing permissions.\nexport const publishedContent = ${JSON.stringify(content, null, 2)};\n`);
console.log(`Exported ${items.length} visible artworks and ${Object.keys(images).length} media files. No permissions or database records changed.`);
