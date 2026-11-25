import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectId = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
if (projectId !== 'yoyo-personal-portfolio') {
  console.error('Usage: node scripts/test-firestore-rules.mjs yoyo-personal-portfolio [--dry-run]');
  process.exit(1);
}

// All document dependencies are mocked; no real access-list or key is read.
const identity = { uid: 'rules-test-user', token: {
  email: 'member@example.test', email_verified: true,
  firebase: { sign_in_provider: 'google.com' },
} };
const keyPath = '/databases/(default)/documents/portfolioKeys/test-version';
const memberPath = '/databases/(default)/documents/allowedUsers/member@example.test';
const cases = [
  ['allowlisted verified Google user', 'ALLOW', 'get', keyPath, identity, true],
  ['anonymous user', 'DENY', 'get', keyPath, null, true],
  ['unverified email', 'DENY', 'get', keyPath, { ...identity, token: { ...identity.token, email_verified: false } }, true],
  ['password provider', 'DENY', 'get', keyPath, { ...identity, token: { ...identity.token, firebase: { sign_in_provider: 'password' } } }, true],
  ['missing email claim', 'DENY', 'get', keyPath, { ...identity, token: { email_verified: true, firebase: identity.token.firebase } }, true],
  ['absent allowlist entry', 'DENY', 'get', keyPath, identity, null],
  ['disabled allowlist entry', 'DENY', 'get', keyPath, identity, false],
  ['non-boolean enabled field', 'DENY', 'get', keyPath, identity, 'true'],
  ['key collection listing', 'DENY', 'list', keyPath, identity, true],
  ...['create', 'update', 'delete'].map(method => [`key ${method}`, 'DENY', method, keyPath, identity, true]),
  ['own allowlist read', 'ALLOW', 'get', memberPath, identity, true],
  ['allowlist listing', 'DENY', 'list', memberPath, identity, true],
  ...['create', 'update', 'delete'].map(method => [`allowlist ${method}`, 'DENY', method, memberPath, identity, true]),
  ['other collection read', 'DENY', 'get', '/databases/(default)/documents/other/test', identity, true],
  ['nested key read', 'DENY', 'get', `${keyPath}/nested/test`, identity, true],
];
const itemPath = '/databases/(default)/documents/galleryItems/artwork-test';
const imagePath = '/databases/(default)/documents/galleryImages/image-test';
const artwork = { title: 'Artwork', caption: '', alt: 'Test artwork', category: 'Installation', visible: true,
  imageKind: 'bundled', imageRef: 'f50dd.png', overlayText: '', overlayYear: '', order: 0, revision: 1 };
const image = { base64: 'UklGRg==', mimeType: 'image/webp', width: 100, height: 100 };
// Extra case fields: new document, old document, editing permission, image existence.
const add = (label, expectation, method, path = itemPath, data, oldData, canEdit = true, enabled = true, auth = identity, imageExists = true) =>
  cases.push([label, expectation, method, path, auth, enabled, data, oldData, canEdit, imageExists]);
add('approved gallery read', 'ALLOW', 'get');
// Rules Test API evaluates list permission at a candidate document path.
add('approved gallery list', 'ALLOW', 'list', itemPath);
add('editor creates artwork', 'ALLOW', 'create', itemPath, artwork);
add('editor updates revision', 'ALLOW', 'update', itemPath, { ...artwork, revision: 2 }, artwork);
add('editor deletes artwork', 'ALLOW', 'delete', itemPath, undefined, artwork);
for (const method of ['create', 'update', 'delete']) {
  add(`viewer cannot ${method} artwork`, 'DENY', method, itemPath, { ...artwork, revision: method === 'update' ? 2 : 1 }, artwork, false);
  add(`disabled editor cannot ${method} artwork`, 'DENY', method, itemPath, artwork, artwork, true, false);
}
add('stale revision denied', 'DENY', 'update', itemPath, artwork, artwork);
add('skipped revision denied', 'DENY', 'update', itemPath, { ...artwork, revision: 3 }, artwork);
for (const [label, patch] of Object.entries({
  'extra field': { secret: 'value' }, 'long title': { title: 'x'.repeat(161) }, 'long caption': { caption: 'x'.repeat(3001) },
  'long alt': { alt: 'x'.repeat(501) }, 'long overlay': { overlayText: 'x'.repeat(101) }, 'long year': { overlayYear: 'x'.repeat(21) },
  'bad category': { category: 'Other' }, 'bad visibility': { visible: 'true' }, 'negative order': { order: -1 },
  'large order': { order: 1e15 + 1 }, 'bad image kind': { imageKind: 'url' }, 'unknown bundled file': { imageRef: 'other.png' },
  'fractional revision': { revision: 1.5 }, 'wrong initial revision': { revision: 2 },
})) add(`artwork ${label}`, 'DENY', 'create', itemPath, { ...artwork, ...patch });
const { alt: omittedAlt, ...missingField } = artwork;
add('missing artwork field', 'DENY', 'create', itemPath, missingField);
add('unsafe artwork id', 'DENY', 'create', itemPath.replace('artwork-test', 'bad.id'), artwork);
add('uploaded artwork reference', 'ALLOW', 'create', itemPath, { ...artwork, imageKind: 'uploaded', imageRef: 'image-test' });
add('missing uploaded image', 'DENY', 'create', itemPath, { ...artwork, imageKind: 'uploaded', imageRef: 'image-test' }, undefined, true, true, identity, false);
// Reordering or editing metadata must not read the already-validated image again.
const uploadedArtwork = { ...artwork, imageKind: 'uploaded', imageRef: 'image-test' };
add('unchanged image needs no existence lookup', 'ALLOW', 'update', itemPath,
  { ...uploadedArtwork, caption: 'Updated', revision: 2 }, uploadedArtwork, true, true, identity, false);
add('replacement image must exist', 'DENY', 'update', itemPath,
  { ...uploadedArtwork, imageRef: 'missing-image', revision: 2 }, uploadedArtwork);
add('switch to uploaded image must exist', 'DENY', 'update', itemPath,
  { ...uploadedArtwork, revision: 2 }, artwork, true, true, identity, false);
add('approved image read', 'ALLOW', 'get', imagePath);
add('anonymous image read', 'DENY', 'get', imagePath, undefined, undefined, true, true, null);
add('disabled image read', 'DENY', 'get', imagePath, undefined, undefined, true, false);
add('image listing', 'DENY', 'list', imagePath);
add('editor uploads image', 'ALLOW', 'create', imagePath, image);
for (const mimeType of ['image/gif', 'video/mp4', 'video/webm']) {
  add(`editor uploads ${mimeType}`, 'ALLOW', 'create', imagePath, { ...image, mimeType });
  add(`viewer cannot upload ${mimeType}`, 'DENY', 'create', imagePath, { ...image, mimeType }, undefined, false);
  add(`oversized ${mimeType}`, 'DENY', 'create', imagePath, { ...image, mimeType, base64: 'a'.repeat(819201) });
  add(`large dimensions ${mimeType}`, 'DENY', 'create', imagePath, { ...image, mimeType, width: 1601 });
}
for (const mimeType of ['text/html', 'image/svg+xml', 'application/javascript', 'video/quicktime', 'audio/mpeg', 'video/MP4']) {
  add(`unsupported media ${mimeType}`, 'DENY', 'create', imagePath, { ...image, mimeType });
}
add('viewer image upload', 'DENY', 'create', imagePath, image, undefined, false);
for (const method of ['update', 'delete']) add(`image ${method} immutable`, 'DENY', method, imagePath, image, image);
for (const [label, patch] of Object.entries({
  oversized: { base64: 'a'.repeat(819201) }, empty: { base64: '' }, 'non-string data': { base64: 123 },
  'wrong mime': { mimeType: 'image/png' }, 'zero width': { width: 0 }, 'large width': { width: 1601 },
  'zero height': { height: 0 }, 'large height': { height: 1601 }, 'fractional dimension': { width: 1.5 },
  'extra field': { original: 'no' },
})) add(`image ${label}`, 'DENY', 'create', imagePath, { ...image, ...patch });
add('maximum image dimensions', 'ALLOW', 'create', imagePath, { ...image, width: 1600, height: 1600 });
add('maximum image bytes', 'ALLOW', 'create', imagePath, { ...image, base64: 'a'.repeat(819200) });
add('other allowlist read', 'DENY', 'get', '/databases/(default)/documents/allowedUsers/other@example.test');
add('disabled own permission read', 'ALLOW', 'get', memberPath, undefined, undefined, false, false);
add('anonymous own permission read', 'DENY', 'get', memberPath, undefined, undefined, false, true, null);
for (const [label, auth] of [
  ['unverified', { ...identity, token: { ...identity.token, email_verified: false } }],
  ['password', { ...identity, token: { ...identity.token, firebase: { sign_in_provider: 'password' } } }],
]) {
  add(`${label} gallery read`, 'DENY', 'get', itemPath, undefined, undefined, true, true, auth);
  add(`${label} artwork create`, 'DENY', 'create', itemPath, artwork, undefined, true, true, auth);
  add(`${label} own permission read`, 'DENY', 'get', memberPath, undefined, undefined, true, true, auth);
}
const layoutPath = '/databases/(default)/documents/galleryLayouts/Installation';
const otherLayoutPath = '/databases/(default)/documents/galleryLayouts/Film';
const layout = {slots: ['artwork-test', null, null, null], revision: 1};
const emptyLayout = {slots: [null, null, null, null], revision: 1};
// Per-case mocks override the default atomic create/delete layout changes.
const withMocks = (mocks) => { cases[cases.length - 1][10] = mocks; };
const mock = (fn, path, data) => ({ function: fn, args: [{exactValue: path}], result: {value: data} });
const docMock = (fn, path, data) => mock(fn, path, {data});
add('legacy reorder rejected', 'DENY', 'update', itemPath, {...artwork, order: 8, revision: 2}, artwork);
for (const method of ['create', 'delete']) {
  add(`legacy ${method} without layout rejected`, 'DENY', method, itemPath, method === 'create' ? artwork : undefined, method === 'delete' ? artwork : undefined);
  withMocks([docMock('getAfter', layoutPath, layout)]);
}
add('atomic category move accepted', 'ALLOW', 'update', itemPath, {...artwork, category: 'Film', revision: 2}, artwork);
withMocks([docMock('getAfter', layoutPath, {...emptyLayout, revision: 2}), docMock('get', otherLayoutPath, emptyLayout), docMock('getAfter', otherLayoutPath, {...layout, revision: 2})]);
add('legacy category move rejected', 'DENY', 'update', itemPath, {...artwork, category: 'Film', revision: 2}, artwork);
withMocks([docMock('getAfter', layoutPath, layout)]);
add('approved layout read', 'ALLOW', 'get', layoutPath);
add('anonymous layout read', 'DENY', 'get', layoutPath, undefined, undefined, true, true, null);
add('disabled layout read', 'DENY', 'get', layoutPath, undefined, undefined, true, false);
add('viewer layout read', 'ALLOW', 'get', layoutPath, undefined, undefined, false);
add('layout creation reserved for migration', 'DENY', 'create', layoutPath, layout);
add('layout deletion denied', 'DENY', 'delete', layoutPath, undefined, layout);
const movedLayout = {...layout, slots: [null, null, 'artwork-test', null], revision: 2};
add('empty-slot move allowed', 'ALLOW', 'update', layoutPath, movedLayout, layout);
add('viewer layout write denied', 'DENY', 'update', layoutPath, movedLayout, layout, false);
add('disabled layout write denied', 'DENY', 'update', layoutPath, movedLayout, layout, true, false);
add('anonymous layout write denied', 'DENY', 'update', layoutPath, movedLayout, layout, true, true, null);
for (const [label, patch] of Object.entries({
  'stale revision': {revision: 1}, 'skipped revision': {revision: 3}, 'fractional revision': {revision: 1.5},
  'extra field': {other: true}, 'empty slots': {slots: []}, 'incomplete page': {slots: ['artwork-test', null, null]},
  'too many slots': {slots: ['artwork-test', ...Array(203).fill(null)]}, 'duplicate ID': {slots: ['artwork-test', 'artwork-test', null, null]},
  'numeric ID': {slots: ['artwork-test', 42, null, null]}, 'object ID': {slots: ['artwork-test', {}, null, null]},
  'unsafe ID': {slots: ['artwork-test', 'bad.id', null, null]}, 'missing item': {slots: ['artwork-test', 'missing', null, null]},
})) add(`layout ${label} denied`, 'DENY', 'update', layoutPath, {...movedLayout, ...patch}, layout);
add('full page expansion allowed', 'ALLOW', 'update', layoutPath, {...movedLayout, slots: [...movedLayout.slots, null, null, null, null]}, layout);
add('empty intermediate page preserved', 'ALLOW', 'update', layoutPath, {...movedLayout, slots: [...Array(8).fill(null), ...movedLayout.slots]}, layout);
add('empty trailing page trimmed', 'ALLOW', 'update', layoutPath, movedLayout, {...layout, slots: [...layout.slots, null, null, null, null]});
add('atomic artwork addition to layout', 'ALLOW', 'update', layoutPath, {...layout, revision: 2}, emptyLayout);
withMocks([docMock('getAfter', itemPath, artwork)]);
add('wrong-category artwork addition denied', 'DENY', 'update', layoutPath, {...layout, revision: 2}, emptyLayout);
withMocks([docMock('getAfter', itemPath, {...artwork, category: 'Film'})]);
add('atomic artwork removal from layout', 'ALLOW', 'update', layoutPath, {...emptyLayout, revision: 2}, layout);
withMocks([mock('existsAfter', itemPath, false)]);
add('orphaning artwork denied', 'DENY', 'update', layoutPath, {...emptyLayout, revision: 2}, layout);
withMocks([mock('existsAfter', itemPath, true), docMock('getAfter', itemPath, artwork)]);
add('atomic category departure from layout', 'ALLOW', 'update', layoutPath, {...emptyLayout, revision: 2}, layout);
withMocks([mock('existsAfter', itemPath, true), docMock('getAfter', itemPath, {...artwork, category: 'Film'})]);
add('multiple membership additions denied', 'DENY', 'update', layoutPath, {slots: ['artwork-test', 'another', null, null], revision: 2}, emptyLayout);
add('unknown category layout denied', 'DENY', 'update', layoutPath.replace('Installation', 'Unknown'), movedLayout, layout);
const aboutPath = '/databases/(default)/documents/siteContent/about';
const about = {heading: 'About me', body: 'My biography.', revision: 1};
add('approved About read', 'ALLOW', 'get', aboutPath);
add('viewer About read', 'ALLOW', 'get', aboutPath, undefined, undefined, false);
add('anonymous About read denied', 'DENY', 'get', aboutPath, undefined, undefined, true, true, null);
add('disabled About read denied', 'DENY', 'get', aboutPath, undefined, undefined, true, false);
add('About collection listing denied', 'DENY', 'list', aboutPath);
add('editor creates About', 'ALLOW', 'create', aboutPath, about);
add('editor updates About', 'ALLOW', 'update', aboutPath, {...about, revision: 2}, about);
add('About deletion denied', 'DENY', 'delete', aboutPath, undefined, about);
for (const method of ['create', 'update']) {
  const next = {...about, revision: method === 'update' ? 2 : 1};
  add(`viewer About ${method} denied`, 'DENY', method, aboutPath, next, about, false);
  add(`disabled About ${method} denied`, 'DENY', method, aboutPath, next, about, true, false);
  add(`anonymous About ${method} denied`, 'DENY', method, aboutPath, next, about, true, true, null);
  for (const [label, auth] of [
    ['unverified', {...identity, token: {...identity.token, email_verified: false}}],
    ['password', {...identity, token: {...identity.token, firebase: {sign_in_provider: 'password'}}}],
  ]) add(`${label} About ${method} denied`, 'DENY', method, aboutPath, next, about, true, true, auth);
}
for (const [label, patch] of Object.entries({
  'long heading': {heading: 'x'.repeat(161)}, 'long body': {body: 'x'.repeat(10001)},
  'non-string heading': {heading: 42}, 'non-string body': {body: []},
  'extra field': {canEditGallery: true}, 'zero revision': {revision: 0},
  'fractional revision': {revision: 1.5}, 'wrong initial revision': {revision: 2},
})) add(`About ${label} denied`, 'DENY', 'create', aboutPath, {...about, ...patch});
add('About missing field denied', 'DENY', 'create', aboutPath, {heading: 'About me', revision: 1});
add('About stale revision denied', 'DENY', 'update', aboutPath, about, about);
add('About skipped revision denied', 'DENY', 'update', aboutPath, {...about, revision: 3}, about);
add('About boundary lengths accepted', 'ALLOW', 'create', aboutPath, {...about, heading: 'x'.repeat(160), body: 'x'.repeat(10000)});
add('About empty text accepted', 'ALLOW', 'create', aboutPath, {...about, heading: '', body: ''});
add('other site content write denied', 'DENY', 'create', aboutPath.replace('/about', '/other'), about);
const payload = {
  source: { files: [{ name: 'firestore.rules', content: readFileSync(resolve(root, 'firestore.rules'), 'utf8') }] },
  testSuite: { testCases: cases.map(([, expectation, method, path, auth, enabled, data, oldData, canEditGallery = true, imageExists = true, mocks = []]) => ({
    expectation, request: { auth, method, path, ...(data ? { resource: { data } } : {}) },
    ...(oldData ? { resource: { data: oldData } } : {}), pathEncoding: 'PLAIN',
    functionMocks: [
      ...mocks,
      ...[docMock('get', layoutPath, method === 'create' ? emptyLayout : layout),
        docMock('getAfter', layoutPath, {...(method === 'create' ? layout : method === 'delete' ? emptyLayout : layout), revision: 2})]
        .filter(candidate => !mocks.some(override => override.function === candidate.function && override.args[0].exactValue === candidate.args[0].exactValue)),
      { function: 'get', args: [{ exactValue: memberPath }],
        result: enabled === null ? { undefined: {} } : { value: { data: { enabled, canEditGallery } } } },
      { function: 'exists', args: [{ exactValue: imagePath }], result: { value: imageExists } },
      { function: 'getAfter', args: [{ anyValue: {} }], result: { undefined: {} } },
      { function: 'existsAfter', args: [{ anyValue: {} }], result: { value: false } },
      // Unexpected lookups fail closed; every dependency is synthetic.
      { function: 'get', args: [{ anyValue: {} }], result: { undefined: {} } },
      { function: 'exists', args: [{ anyValue: {} }], result: { value: false } },
    ],
  })) },
};

async function accessToken() {
  try {
    const binary = realpathSync(execFileSync('which', ['firebase'], { encoding: 'utf8' }).trim());
    const require = createRequire(binary);
    const auth = require(resolve(dirname(binary), '..', 'auth.js'));
    const account = auth.getProjectDefaultAccount(root);
    if (!account?.tokens?.refresh_token) throw new Error('Missing account.');
    const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/firebase']);
    if (!token.access_token) throw new Error('Missing access token.');
    return token.access_token;
  } catch {
    throw new Error('Unable to authenticate with the selected Firebase CLI account. Use firebase login:use for this directory.');
  }
}

try {
  if (dryRun) {
    console.log(`Prepared ${cases.length} rules cases for ${projectId}; no credentials loaded or network request sent.`);
    for (const [label, expectation] of cases) console.log(`${expectation}: ${label}`);
  } else {
    const token = await accessToken();
    const response = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}:test`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Rules API returned HTTP ${response.status}. Check project existence, API access, and owner permissions.`);
    const result = await response.json();
    const issues = result.issues ?? [];
    for (const issue of issues) console.log(`${issue.severity}: ${issue.description}`);
    const results = result.testResults ?? [];
    for (const [index, [label]] of cases.entries()) {
      console.log(`${results[index]?.state ?? 'NOT_RUN'}: ${label}`);
      if (results[index]?.state !== 'SUCCESS') {
        for (const message of results[index]?.debugMessages ?? []) console.log(message);
      }
    }
    if (issues.some(issue => issue.severity === 'ERROR') || results.length !== cases.length || results.some(test => test.state !== 'SUCCESS')) {
      throw new Error('Rules verification failed. Do not deploy until every expected result passes.');
    }
    console.log(`All ${cases.length} remote rules cases passed. No rules were deployed or documents modified.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Rules verification failed.');
  process.exitCode = 1;
}
