import { readFileSync, realpathSync } from 'node:fs';
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
const users = await request('/allowedUsers');
const enabled = (users.documents || []).filter(d => d.fields.enabled?.booleanValue === true);
if (enabled.length !== 2 || users.nextPageToken) throw new Error('Expected exactly two existing enabled accounts; no permissions changed.');
for (const user of enabled) {
  await request('/allowedUsers/' + user.name.split('/').pop() + '?updateMask.fieldPaths=canEditGallery', {
    method: 'PATCH', body: JSON.stringify({ fields: { canEditGallery: { booleanValue: true } } }),
  });
}
const marker = await fetch(base + '/galleryMigrations/art-v1', { headers });
if (marker.ok) {
  console.log('Existing gallery seed preserved. Two existing accounts have editing permission.');
} else {
  if (marker.status !== 404) throw new Error('Cannot check gallery migration.');
  const { initialArtworks } = await import('../auth/gallery-model.js');
  const fields = value => Object.fromEntries(Object.entries(value).map(([key, val]) => [key,
    typeof val === 'string' ? { stringValue: val } : typeof val === 'boolean' ? { booleanValue: val } : { integerValue: String(val) }]));
  const root = `projects/${project}/databases/(default)/documents`;
  const writes = initialArtworks.map(({ id, ...item }) => ({
    update: { name: `${root}/galleryItems/${id}`, fields: fields(item) }, currentDocument: { exists: false },
  }));
  writes.push({ update: { name: root + '/galleryMigrations/art-v1', fields: { complete: { booleanValue: true } } }, currentDocument: { exists: false } });
  await request(':commit', { method: 'POST', body: JSON.stringify({ writes }) });
  console.log('Seeded four artworks once. Two existing accounts have editing permission.');
}
const verified = await request('/allowedUsers');
if (!verified.documents.filter(d => d.fields.enabled?.booleanValue === true).every(d => d.fields.canEditGallery?.booleanValue === true)) throw new Error('Permission verification failed.');
