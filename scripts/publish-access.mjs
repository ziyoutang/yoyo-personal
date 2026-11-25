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
const release = JSON.parse(readFileSync('.private/release.json', 'utf8'));
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const headers = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };
// Allowlist membership is managed in Firebase, never seeded or reset by deployments.
const response = await fetch(`${base}/portfolioKeys/${release.version}`, {
  method: 'PATCH', headers, body: JSON.stringify({ fields: { key: { stringValue: release.key } } }),
});
if (!response.ok) throw new Error(`Key publication failed: HTTP ${response.status}`);
console.log(`Access key published for release ${release.version}. No key material logged.`);
