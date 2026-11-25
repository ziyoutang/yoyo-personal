import { readFile, writeFile, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { seal, unseal } from './private-package.mjs';

const files = {};
const types = { mp3: 'audio/mpeg', glb: 'model/gltf-binary', obj: 'text/plain', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml', ttf: 'font/ttf' };
for (const name of await readdir('public/assets')) {
  const data = await readFile(`public/assets/${name}`);
  files[`assets/${name}`] = { base64: data.toString('base64'), type: types[name.split('.').pop()] };
}
for (const name of ['index.html', 'styles.css', 'gallery.css', 'fonts.css']) files[name] = await readFile(`public/${name}`, 'utf8');
const app = await build({ entryPoints: ['public/app.js'], bundle: true, write: false, format: 'iife', minify: true });
files['app.js'] = app.outputFiles[0].text;
const { key, payload } = seal(files);
if (unseal(payload, key)['app.js'] !== files['app.js']) throw new Error('Release round-trip failed');
const version = createHash('sha256').update(payload).digest('hex').slice(0, 24);
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await mkdir('.private', { recursive: true, mode: 0o700 });
await writeFile('.private/release.json', JSON.stringify({ version, key: key.toString('base64') }), { mode: 0o600 });
await writeFile(`dist/portfolio-${version}.bin`, payload);
await writeFile('dist/release.json', JSON.stringify({ version }));
await copyFile('auth/index.html', 'dist/index.html');
await build({ entryPoints: ['auth/auth.js'], outfile: 'dist/auth.js', bundle: true, minify: true, format: 'esm' });
console.log(`Built encrypted release ${version} (${(payload.length / 1024 / 1024).toFixed(1)} MiB). No plaintext portfolio or key in dist.`);
