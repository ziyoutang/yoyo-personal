import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { portfolioWorks } from '../public/portfolio-artworks.js';
import { categories, validateItem, validateImage } from '../auth/gallery-model.js';
import { normalizeSlots, validateLayout } from '../public/gallery-layout.js';

// Additive import of the artist-provided PDF. Run without --apply to review first.
const project = 'yoyo-personal-portfolio';
assert.equal(JSON.parse(readFileSync('.firebaserc')).projects.default, project);
const apply = process.argv.includes('--apply');
const binary = realpathSync(execFileSync('which', ['firebase'], { encoding: 'utf8' }).trim());
const auth = createRequire(binary)(resolve(dirname(binary), '..', 'auth.js'));
const account = auth.getProjectDefaultAccount(process.cwd());
assert.equal(account?.user.email, 'ziyouhostuiux@gmail.com', 'Select the authorized Firebase account first.');
const { access_token } = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const headers = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };
async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers });
  if (!response.ok) throw Error(`Firestore HTTP ${response.status} for ${path.split('?')[0]}`);
  return response.json();
}
async function list(collection) {
  const documents = []; let token;
  do {
    const result = await request(`/${collection}?pageSize=300${token ? '&pageToken=' + encodeURIComponent(token) : ''}`);
    documents.push(...(result.documents || [])); token = result.nextPageToken;
  } while (token);
  return documents;
}
const decode = value => value.stringValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.doubleValue ?? value.booleanValue ?? (value.arrayValue ? (value.arrayValue.values || []).map(decode) : null));
const fields = document => Object.fromEntries(Object.entries(document.fields).map(([key,value]) => [key,decode(value)]));
const encode = value => value === null ? { nullValue: null } : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value };
const name = (collection,id) => `projects/${project}/databases/(default)/documents/${collection}/${id}`;
const update = (collection,id,data,existing) => ({ update: { name:name(collection,id), fields:Object.fromEntries(Object.entries(data).map(([key,value]) => [key,encode(value)])) }, currentDocument:existing ? { updateTime:existing.updateTime } : { exists:false } });

const [items, layouts] = await Promise.all([list('galleryItems'),list('galleryLayouts')]);
const itemMap = new Map(items.map(document => [document.name.split('/').pop(),document]));
const layoutMap = new Map(layouts.map(document => [document.name.split('/').pop(),document]));
const metadataWrites = [], media = [], additions = new Map(categories.map(category => [category,[]]));
const originalTitles = new Set(['Installation artwork','Installation artwork detail','Installation artwork in a gallery','News report, 2024']);
let refreshed = 0;
for (const [index,work] of portfolioWorks.entries()) {
  const existing = itemMap.get(work.id);
  if (existing) {
    const original = fields(existing);
    // Refresh untouched seed descriptions; preserve any editor changes.
    if (original.imageKind === 'bundled' && originalTitles.has(original.title) && !original.caption) {
      const next = validateItem({...original,title:work.title,caption:work.caption,alt:work.title,overlayText:work.title,overlayYear:work.year,revision:original.revision+1});
      metadataWrites.push(update('galleryItems',work.id,next,existing)); refreshed++;
    }
    continue;
  }
  const bytes = readFileSync(`public/assets/${work.cover}`);
  const imageId = 'portfolio-' + createHash('sha256').update(bytes).digest('hex').slice(0,40);
  const image = validateImage({base64:bytes.toString('base64'),mimeType:'image/webp',width:work.width,height:work.height});
  media.push({id:imageId,image});
  const item = validateItem({title:work.title,caption:work.caption,alt:work.title,category:work.category,visible:true,imageKind:'uploaded',imageRef:imageId,overlayText:work.title,overlayYear:work.year,order:Date.now()+index,revision:1});
  metadataWrites.push(update('galleryItems',work.id,item));
  additions.get(work.category).push(work.id);
}
const layoutWrites = [];
for (const category of categories) {
  const document = layoutMap.get(category);
  assert.ok(document, `Missing layout: ${category}`);
  const layout = validateLayout(fields(document));
  const incoming = additions.get(category);
  if (!incoming.length) continue;
  const slots = layout.slots.some(Boolean) ? [...layout.slots,...incoming] : incoming;
  const next = validateLayout({slots:normalizeSlots(slots),revision:layout.revision+1});
  layoutWrites.push(update('galleryLayouts',category,next,document));
}
console.log(JSON.stringify({project,apply,portfolioWorks:portfolioWorks.length,newWorks:media.length,refreshedSeedDescriptions:refreshed,preservedExistingWorks:items.length-refreshed,byCategory:Object.fromEntries(categories.map(category => [category === 'Paintings' ? 'Photography' : category,portfolioWorks.filter(work => work.category === category).length]))},null,2));
if (!apply) { console.log('Dry run only. No documents changed.'); process.exit(0); }
mkdirSync('.private',{recursive:true,mode:0o700});
const backup = `.private/portfolio-import-${Date.now()}.json`;
writeFileSync(backup,JSON.stringify({project,items,layouts},null,2),{mode:0o600});
console.log('Saved existing metadata and layouts in an ignored private backup.');
// Media are immutable and content-addressed. Failed metadata commits leave only
// unused media; existing works, permissions and release keys are never removed.
let cursor = 0;
await Promise.all(Array.from({length:4},async () => {
  while (cursor < media.length) {
    const entry = media[cursor++];
    const found = await fetch(`${base}/galleryImages/${entry.id}`,{headers});
    if (found.status === 404) await request(':commit',{method:'POST',body:JSON.stringify({writes:[update('galleryImages',entry.id,entry.image)]})});
    else if (!found.ok) throw Error(`Media read failed: HTTP ${found.status}`);
    else assert.deepEqual(fields(await found.json()),entry.image,'Existing content-addressed media differ');
    console.log(`Uploaded/verified media ${cursor}/${media.length}`);
  }
}));
if (metadataWrites.length || layoutWrites.length) {
  await request(':commit',{method:'POST',body:JSON.stringify({writes:[...metadataWrites,...layoutWrites]})});
}
const [savedItems,savedLayouts] = await Promise.all([list('galleryItems'),list('galleryLayouts')]);
for (const work of portfolioWorks) assert.ok(savedItems.some(document => document.name.endsWith('/'+work.id)),`Missing work: ${work.title}`);
for (const category of categories) {
  const layout = validateLayout(fields(savedLayouts.find(document => document.name.endsWith('/'+category))));
  const expected = savedItems.filter(document => fields(document).category === category).map(document => document.name.split('/').pop());
  assert.deepEqual(layout.slots.filter(Boolean).sort(),expected.sort(),`Layout membership differs for ${category}`);
}
for (const original of items.filter(document => !metadataWrites.some(write => write.update.name === document.name))) {
  assert.deepEqual(savedItems.find(document => document.name === original.name)?.fields,original.fields,'Existing unrelated artwork changed');
}
console.log(`Verified all ${portfolioWorks.length} portfolio works and five category layouts; unrelated artwork preserved.`);
