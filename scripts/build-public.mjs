import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const name of ['assets', 'index.html', 'styles.css', 'gallery.css', 'fonts.css']) await cp(`public/${name}`, `dist/${name}`, { recursive: true });
await build({ entryPoints: ['public/app.js'], outfile: 'dist/app.js', bundle: true, minify: true, format: 'esm' });
const version = createHash('sha256').update(await readFile('dist/app.js')).update(await readFile('dist/gallery.css')).update(await readFile('dist/index.html')).digest('hex').slice(0, 24);
await writeFile('dist/release.json', JSON.stringify({ version, public: true }));
console.log(`Built public portfolio ${version}. No sign-in gate, encryption keys, or account data included.`);
