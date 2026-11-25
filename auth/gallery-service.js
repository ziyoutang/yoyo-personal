import { collection, doc, getDocFromServer, onSnapshot, runTransaction } from 'firebase/firestore';
import { moveSlot, normalizeSlots, validateLayout } from '../public/gallery-layout.js';
import { applyEdit, categories, editableFields, galleryError, validateImage, validateItem } from './gallery-model.js';

export function createGalleryService(db, user, isActive, onAccessLost) {
  let disposed = false;
  let itemsReady = false, layoutsReady = false;
  let state = { items: [], layouts: {}, canEdit: false, loading: true, error: '' };
  const subscribers = new Set();
  const images = new Map();
  const urls = new Set();
  const snapshotState = () => structuredClone(state);
  const emit = () => subscribers.forEach(callback => callback(snapshotState()));
  const check = (editing = false) => {
    if (disposed || !isActive() || (editing && !state.canEdit)) throw galleryError('permission-denied', 'Your editing permission is unavailable. Sign in again or contact the owner.');
  };
  const itemRef = id => {
    if (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) throw galleryError('invalid-argument', 'Invalid artwork ID.');
    return doc(db, 'galleryItems', id);
  };
  const layoutRef = category => {
    if (!categories.includes(category)) throw galleryError('invalid-argument', 'Invalid artwork category.');
    return doc(db, 'galleryLayouts', category);
  };
  const readLayout = async (tx, category, revision) => {
    const snapshot = await tx.get(layoutRef(category));
    if (!snapshot.exists()) throw galleryError('refresh-required', 'Gallery layout is unavailable. Refresh the website before editing.');
    const layout = validateLayout(snapshot.data());
    if (layout.revision !== revision) throw galleryError('conflict', 'The gallery layout changed in another session. Reload before moving artwork.');
    return layout;
  };
  const writeLayout = (tx, category, layout, slots) => {
    const next = validateLayout({ slots: normalizeSlots(slots), revision: layout.revision + 1 });
    tx.set(layoutRef(category), next);
    return next;
  };
  const insert = (layout, id, slot) => {
    const slots = [...layout.slots];
    if (slot === undefined) { slot = slots.indexOf(null); if (slot === -1) slot = slots.length; }
    if (!Number.isInteger(slot) || slot < 0 || slot >= Math.min(slots.length + 4, 200) || slots[slot] != null) throw galleryError('invalid-argument', 'Choose an empty artwork slot.');
    while (slots.length <= slot) slots.push(null);
    slots[slot] = id;
    return slots;
  };
  const stopRole = onSnapshot(doc(db, 'allowedUsers', user.email), snapshot => {
    if (disposed || !isActive()) return;
    const role = snapshot.data();
    state.canEdit = role?.enabled === true && role?.canEditGallery === true;
    emit();
    if (role?.enabled !== true) onAccessLost();
  }, () => { if (!disposed && isActive()) onAccessLost(); });
  const stopItems = onSnapshot(collection(db, 'galleryItems'), snapshot => {
    if (disposed || !isActive()) return;
    try {
      state.items = snapshot.docs.map(s => ({ id: s.id, ...validateItem(s.data()) })).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      itemsReady = true; state.loading = !layoutsReady;
      state.error = layoutsReady && categories.some(category => !state.layouts[category]) ? 'Gallery layout is unavailable. Refresh the website before editing.' : ''; emit();
    } catch { state.loading = false; state.error = 'Gallery data could not be read. Please contact the owner.'; emit(); }
  }, error => {
    if (disposed || !isActive()) return;
    state.loading = false; state.error = 'The gallery could not load. Refresh to try again.'; state.canEdit = false; emit();
    if (error.code === 'permission-denied') onAccessLost();
  });

  const stopLayouts = onSnapshot(collection(db, 'galleryLayouts'), snapshot => {
    if (disposed || !isActive()) return;
    try {
      const layouts = {};
      snapshot.docs.forEach(s => { if (categories.includes(s.id)) layouts[s.id] = validateLayout(s.data()); });
      state.layouts = layouts; layoutsReady = true; state.loading = !itemsReady;
      state.error = categories.some(category => !layouts[category]) ? 'Gallery layout is unavailable. Refresh the website before editing.' : '';
      emit();
    } catch { state.loading = false; state.error = 'Gallery layout could not be read. Please contact the owner.'; emit(); }
  }, error => {
    if (disposed || !isActive()) return;
    state.loading = false; state.error = 'The gallery layout could not load. Refresh to try again.'; state.canEdit = false; emit();
    if (error.code === 'permission-denied') onAccessLost();
  });

  const api = Object.freeze({
    subscribe(callback) {
      check(); subscribers.add(callback);
      callback(snapshotState());
      return () => subscribers.delete(callback);
    },
    async getImage(id) {
      check();
      if (!/^[\w-]{1,100}$/.test(id)) throw galleryError('invalid-argument', 'Invalid image ID.');
      if (!images.has(id)) {
        const pending = getDocFromServer(doc(db, 'galleryImages', id)).then(snapshot => {
          check();
          if (!snapshot.exists()) throw new Error('Image unavailable.');
          const image = validateImage(snapshot.data());
          const bytes = Uint8Array.from(atob(image.base64), c => c.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes], { type: image.mimeType }));
          urls.add(url); return Object.freeze({ url, mimeType: image.mimeType });
        }).catch(error => { images.delete(id); throw error; });
        images.set(id, pending);
      }
      return images.get(id);
    },
    async save(id, expectedRevision, patch, layoutRevisions) {
      check(true);
      const changes = structuredClone(patch);
      const revisions = layoutRevisions ? { ...layoutRevisions } : Object.fromEntries(Object.entries(state.layouts).map(([category, layout]) => [category, layout.revision]));
      const ref = itemRef(id);
      return runTransaction(db, async tx => {
        check(true);
        const current = await tx.get(ref);
        const next = applyEdit(current.exists() ? current.data() : null, expectedRevision, changes);
        next.order = current.data().order;
        if (current.data().category !== next.category) {
          const sourceCategory = current.data().category;
          const source = await readLayout(tx, sourceCategory, revisions[sourceCategory]);
          const target = await readLayout(tx, next.category, revisions[next.category]);
          if (!source.slots.includes(id)) throw galleryError('conflict', 'Artwork placement changed. Reload before editing.');
          const targetSlots = insert(target, id);
          writeLayout(tx, sourceCategory, source, source.slots.map(value => value === id ? null : value));
          writeLayout(tx, next.category, target, targetSlots);
        }
        tx.set(ref, next);
        return { id, ...next };
      });
    },
    async add(input, placement) {
      check(true);
      if (Object.keys(input).some(key => !editableFields.includes(key))) throw galleryError('invalid-argument', 'Unsupported artwork field.');
      const item = validateItem({ ...structuredClone(input), order: Date.now(), revision: 1 });
      const requested = placement ? { ...placement } : {};
      const revision = requested.revision ?? state.layouts[item.category]?.revision;
      const ref = doc(collection(db, 'galleryItems'));
      await runTransaction(db, async tx => {
        check(true);
        if ((await tx.get(ref)).exists()) throw galleryError('conflict', 'Artwork ID is already in use. Please retry.');
        const layout = await readLayout(tx, item.category, revision);
        writeLayout(tx, item.category, layout, insert(layout, ref.id, requested.slot));
        tx.set(ref, item);
      });
      return { id: ref.id, ...item };
    },
    async move(category, expectedLayoutRevision, from, to) {
      check(true);
      return runTransaction(db, async tx => {
        check(true);
        const layout = await readLayout(tx, category, expectedLayoutRevision);
        return writeLayout(tx, category, layout, moveSlot(layout.slots, from, to));
      });
    },
    async reorder() {
      check(true);
      throw galleryError('refresh-required', 'This version of the gallery is outdated. Refresh the website before moving artwork.');
    },
    async remove(id, expectedRevision, layoutRevision) {
      check(true);
      const revisions = Object.fromEntries(Object.entries(state.layouts).map(([category, layout]) => [category, layout.revision]));
      const ref = itemRef(id);
      await runTransaction(db, async tx => {
        check(true);
        const current = await tx.get(ref);
        if (!current.exists() || current.data().revision !== expectedRevision) throw galleryError('conflict', 'This artwork changed. Reload before removing it.');
        const category = current.data().category;
        const layout = await readLayout(tx, category, layoutRevision ?? revisions[category]);
        if (!layout.slots.includes(id)) throw galleryError('conflict', 'Artwork placement changed. Reload before removing it.');
        writeLayout(tx, category, layout, layout.slots.map(value => value === id ? null : value));
        tx.delete(ref);
      });
    },
    async upload(input) {
      check(true);
      const image = validateImage(structuredClone(input));
      const ref = doc(collection(db, 'galleryImages'));
      await runTransaction(db, async tx => {
        check(true);
        if ((await tx.get(ref)).exists()) throw galleryError('conflict', 'Image ID is already in use. Please retry.');
        tx.set(ref, image);
      });
      return ref.id;
    },
  });
  return { api, dispose() {
    disposed = true; stopRole(); stopItems(); stopLayouts(); subscribers.clear();
    urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); images.clear();
  } };
}
