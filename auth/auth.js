import { createAboutService } from './about-service.js';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { createGalleryService } from './gallery-service.js';
import { firebaseConfig } from '../public/firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const status = document.querySelector('#status');
const signIn = document.querySelector('#sign-in');
const switchAccount = document.querySelector('#switch-account');
let stopAccess = () => {};
let accessTimeout;
let generation = 0;
let urls = [];
let frame;
let galleryService;
let aboutService;
globalThis.portfolioAboutForFrame = requestingWindow => {
  if (!frame || requestingWindow !== frame.contentWindow || !aboutService) throw new Error('About session unavailable.');
  return aboutService.api;
};
globalThis.portfolioGalleryForFrame = requestingWindow => {
  if (!frame || requestingWindow !== frame.contentWindow || !galleryService) throw new Error('Gallery session unavailable.');
  return galleryService.api;
};

function clearPortfolio() {
  aboutService?.dispose(); aboutService = null;
  galleryService?.dispose(); galleryService = null;
  frame?.remove(); frame = null;
  urls.forEach(url => URL.revokeObjectURL(url)); urls = [];
  document.querySelector('#gate').hidden = false;
  document.querySelector('#account-bar').hidden = true;
}
function blob(data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  urls.push(url); return url;
}
const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));

async function openPortfolio(version, keyText, ticket) {
  const response = await fetch(`/portfolio-${version}.bin`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Portfolio download failed. Please try again.');
  const encrypted = new Uint8Array(await response.arrayBuffer());
  const key = await crypto.subtle.importKey('raw', decode(keyText), 'AES-GCM', false, ['decrypt']);
  const packed = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: encrypted.slice(0,12) }, key, encrypted.slice(12));
  const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const files = JSON.parse(await new Response(stream).text());
  if (ticket !== generation) return;
  const assets = {};
  for (const [path, file] of Object.entries(files)) if (path.startsWith('assets/')) assets[path.slice(7)] = blob(decode(file.base64), file.type);
  const resolveAssets = text => text.replace(/(?:\.\/|\/)assets\/([\w.-]+)/g, (_, name) => assets[name]);
  let html = resolveAssets(files['index.html']);
  html = html.replace(/\/(fonts|styles|gallery)\.css(?:\?[^"\s]*)?/g, (_, name) => blob(resolveAssets(files[`${name}.css`]), 'text/css'));
  const script = `globalThis.portfolioAbout = parent.portfolioAboutForFrame(window);\n globalThis.portfolioGallery = parent.portfolioGalleryForFrame(window);\n globalThis.portfolioAsset = name => (${JSON.stringify(assets)})[name];\n${files['app.js']}`;
  html = html.replace(/\/app\.js(?:\?[^"\s]*)?/, blob(script, 'text/javascript'));
  galleryService = createGalleryService(db, auth.currentUser, () => ticket === generation, () => {
    if (ticket !== generation) return;
    ++generation; stopAccess(); clearPortfolio();
    status.textContent = 'Gallery access changed. Please sign out and sign in again.';
  });
  aboutService = createAboutService(db, auth.currentUser, () => ticket === generation, () => {
    if (ticket !== generation) return;
    ++generation; stopAccess(); clearPortfolio();
    status.textContent = 'Access changed. Please sign out and sign in again.';
  });
  frame = document.createElement('iframe');
  frame.title = 'Yoyo portfolio';
  frame.src = blob(html, 'text/html') + location.hash;
  document.body.append(frame);
  document.querySelector('#gate').hidden = true;
  document.querySelector('#account-bar').hidden = false;
}

signIn.addEventListener('click', async () => {
  signIn.disabled = true;
  status.textContent = 'Opening Google sign-in…';
  try { await signInWithPopup(auth, provider); }
  catch (error) {
    status.textContent = error.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled. You can try again.' : error.code === 'auth/popup-blocked' ? 'Allow pop-ups for this site, then try again.' : 'Google sign-in could not finish. Please try again.';
  } finally { signIn.disabled = false; }
});
document.querySelector('#sign-out').addEventListener('click', () => { if (frame?.contentWindow.canNavigateGallery?.() === false) return; signOut(auth); });
switchAccount.addEventListener('click', () => { if (frame?.contentWindow.canNavigateGallery?.() === false) return; signOut(auth); });
onAuthStateChanged(auth, async user => {
  const ticket = ++generation;
  clearTimeout(accessTimeout);
  stopAccess(); clearPortfolio();
  signIn.hidden = !!user;
  switchAccount.hidden = !user;
  if (!user) { status.textContent = 'Sign in with an invited Google account.'; return; }
  document.querySelector('#account').textContent = user.email;
  status.textContent = 'Checking access…';
  try {
    const response = await fetch('/release.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Release unavailable');
    const { version } = await response.json();
    if (ticket !== generation) return;
    let loaded = false;
    accessTimeout = setTimeout(() => {
      if (ticket !== generation) return;
      ++generation; stopAccess(); clearPortfolio();
      status.textContent = 'Access verification is unavailable. Please sign out and try again later.';
    }, 20000);
    stopAccess = onSnapshot(doc(db, 'portfolioKeys', version), async snapshot => {
      if (ticket !== generation) return;
      clearTimeout(accessTimeout);
      if (!snapshot.exists()) { ++generation; clearPortfolio(); status.textContent = 'This preview is not ready yet. Please try again later.'; return; }
      if (loaded) return;
      loaded = true;
      status.textContent = 'Opening your private preview…';
      try { await openPortfolio(version, snapshot.data().key, ticket); }
      catch { if (ticket === generation) { clearPortfolio(); status.textContent = 'The preview could not load. Use another account to sign out and retry.'; } }
    }, error => {
      if (ticket !== generation) return;
      clearTimeout(accessTimeout);
      ++generation; clearPortfolio();
      status.textContent = error.code === 'permission-denied' ? 'This Google account is not invited to the preview. Please use an approved account.' : 'Unable to verify access. Please sign out and try again.';
    });
  } catch { if (ticket === generation) status.textContent = 'The preview is unavailable. Please try again later.'; }
});
