import { doc, onSnapshot, runTransaction } from 'firebase/firestore';

const defaultContent = { heading: 'About me', body: '', revision: 0 };
const aboutError = (code, message) => Object.assign(new Error(message), { code });

function validateContent(content) {
  if (!content || Object.keys(content).length !== 3
    || typeof content.heading !== 'string' || content.heading.length > 160
    || typeof content.body !== 'string' || content.body.length > 10000
    || !Number.isSafeInteger(content.revision) || content.revision < 1) {
    throw aboutError('invalid-argument', 'About me needs a heading of at most 160 characters and text of at most 10,000 characters.');
  }
  return { heading: content.heading, body: content.body, revision: content.revision };
}

export function createAboutService(db, user, isActive, onAccessLost) {
  let disposed = false;
  const state = { content: { ...defaultContent }, canEdit: false, loading: true, error: '' };
  const subscribers = new Set();
  const emit = () => subscribers.forEach(callback => callback(structuredClone(state)));
  const check = (editing = false) => {
    if (disposed || !isActive() || (editing && !state.canEdit)) {
      throw aboutError('permission-denied', 'Your editing permission is unavailable. Sign in again or contact the owner.');
    }
  };
  const ref = doc(db, 'siteContent', 'about');
  const stopRole = onSnapshot(doc(db, 'allowedUsers', user.email), snapshot => {
    if (disposed || !isActive()) return;
    const role = snapshot.data();
    state.canEdit = role?.enabled === true && role?.canEditGallery === true;
    emit();
    if (role?.enabled !== true) onAccessLost();
  }, () => { if (!disposed && isActive()) onAccessLost(); });
  const stopContent = onSnapshot(ref, snapshot => {
    if (disposed || !isActive()) return;
    try {
      state.content = snapshot.exists() ? validateContent(snapshot.data()) : { ...defaultContent };
      state.error = '';
    } catch {
      state.error = 'About me could not be read. Please contact the owner.';
    }
    state.loading = false;
    emit();
  }, error => {
    if (disposed || !isActive()) return;
    state.loading = false; state.canEdit = false;
    state.error = 'About me could not load. Refresh to try again.';
    emit();
    if (error.code === 'permission-denied') onAccessLost();
  });

  const api = Object.freeze({
    subscribe(callback) {
      check(); subscribers.add(callback); callback(structuredClone(state));
      return () => subscribers.delete(callback);
    },
    async save(expectedRevision, input) {
      check(true);
      if (!input || Object.keys(input).length !== 2 || !Object.hasOwn(input, 'heading') || !Object.hasOwn(input, 'body')
        || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        throw aboutError('invalid-argument', 'Unsupported About me fields or revision.');
      }
      const next = validateContent({ ...structuredClone(input), revision: expectedRevision + 1 });
      return runTransaction(db, async tx => {
        check(true);
        const snapshot = await tx.get(ref);
        const current = snapshot.exists() ? validateContent(snapshot.data()) : defaultContent;
        if (current.revision !== expectedRevision) {
          throw aboutError('conflict', 'About me changed in another session. Reload or reapply your text before saving.');
        }
        tx.set(ref, next);
        return { ...next };
      });
    },
  });
  return { api, dispose() { disposed = true; stopRole(); stopContent(); subscribers.clear(); } };
}
