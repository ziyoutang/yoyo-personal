import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { seal, unseal } from './private-package.mjs';

test('portfolio content round-trips only with its release key', () => {
  const files = { 'index.html': '<h1>Private portfolio</h1>', 'assets/photo.png': { base64: 'AAEC', type: 'image/png' } };
  const { key, payload } = seal(files);
  assert.deepEqual(unseal(payload, key), files);
  assert.equal(payload.includes(Buffer.from('Private portfolio')), false);
  assert.throws(() => unseal(payload, randomBytes(32)));
});
test('tampered releases fail authenticated decryption', () => {
  const { key, payload } = seal({ 'index.html': 'Original' });
  payload[15] ^= 1;
  assert.throws(() => unseal(payload, key));
});
test('release format decrypts with browser Web Crypto', async () => {
  const files = { 'index.html': '<h1>Private portfolio</h1>' };
  const { key, payload } = seal(files);
  const browserKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
  const packed = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: payload.subarray(0, 12) }, browserKey, payload.subarray(12));
  assert.deepEqual(JSON.parse(gunzipSync(Buffer.from(packed))), files);
});
test('hosted directory matches its public or private release mode without leaking keys', () => {
  const release = JSON.parse(readFileSync('dist/release.json'));
  if (release.public) {
    assert.deepEqual(readdirSync('dist').sort(), ['app.js', 'assets', 'fonts.css', 'gallery.css', 'index.html', 'release.json', 'styles.css'].sort());
    assert.equal(readFileSync('dist/index.html', 'utf8').includes('Private preview'), false);
    const { key } = JSON.parse(readFileSync('.private/release.json'));
    for (const name of ['app.js', 'index.html', 'release.json']) assert.equal(readFileSync(`dist/${name}`, 'utf8').includes(key), false);
    return;
  }
  const { version, key } = JSON.parse(readFileSync('.private/release.json'));
  assert.deepEqual(readdirSync('dist').sort(), ['auth.js', 'index.html', `portfolio-${version}.bin`, 'release.json'].sort());
  for (const name of ['auth.js','index.html','release.json']) {
    const text = readFileSync(`dist/${name}`, 'utf8');
    assert.equal(text.includes(key), false, `${name} must not contain the release key`);
    assert.equal(text.includes('ziyou’s collection'), false);
  }
});
