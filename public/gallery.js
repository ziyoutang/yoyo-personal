import { moveSlot, initialLayout } from './gallery-layout.js';
import { optimizeImage } from './image-upload.js';
import { portfolioWorks } from './portfolio-artworks.js?v=20261105-dead-water';
import { artworkImageGroup } from './art-detail.js?v=20261105-dead-water';

const asset = name => globalThis.portfolioAsset?.(name) ?? `/assets/${name}`;
const categories = ['Installation', 'Multi-Media', 'Paintings', 'Illustrations', 'Film'];
const categoryLabel = category => category === 'Paintings' ? 'Photography' : category;
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const fields = ['title', 'caption', 'alt', 'category', 'visible', 'imageKind', 'imageRef', 'overlayText', 'overlayYear'];
const editable = item => Object.fromEntries(fields.map(key => [key, item[key]]));
let current;
let preferredCategory = sessionStorage.getItem('portfolio-art-category');
if (!categories.includes(preferredCategory)) preferredCategory = categories[0];
const savedPage = category => Math.max(0, Number(sessionStorage.getItem('portfolio-art-page-' + category)) || 0);
export function setGalleryCategory(category) {
  if (!categories.includes(category)) return;
  preferredCategory = category;
  sessionStorage.setItem('portfolio-art-category', category);
}

export function artPage() {
  return `<section class="gallery-page art-page" aria-labelledby="art-title">
    <span class="gallery-title-glow" aria-hidden="true"></span>
    <h1 id="art-title" class="gallery-page-title">Art</h1>
    <div class="gallery-toolbar"><button type="button" data-action="edit" hidden>Edit gallery</button><button type="button" data-action="add" hidden>Add artwork</button><span class="gallery-status" role="status" aria-live="polite"></span><button type="button" data-action="retry" hidden>Retry</button></div>
    <div class="art-layout"><nav class="art-categories" aria-label="Art categories">${categories.map(category => `<button type="button" class="art-category${category === preferredCategory ? ' selected' : ''}" aria-pressed="${category === preferredCategory}" data-category="${category}">${categoryLabel(category)}</button>`).join('')}</nav>
    <div class="art-gallery-region"><div class="photography-intro" hidden><h2>Hong Kong in Light &amp; Shadows</h2><p>Street photography is how I pay attention. Hong Kong is the city I keep returning to, where dense crowds, quiet corners, and small everyday moments all share the same narrow streets. I’m drawn to what these scenes reveal about people, and to the way light and shadow turn an ordinary moment into something worth stopping for.</p></div><div class="art-gallery" aria-label="Installation artworks" tabindex="0"></div><nav class="gallery-pagination" aria-label="Gallery pages"></nav><p class="gallery-move-help" hidden>Drag a handle to a ghost box. With a focused handle, press Space to pick up, arrows to move, Page Up/Down to change page, Enter to drop, or Escape to cancel.</p><p class="art-empty" role="status">Loading gallery…</p></div></div><div class="photography-peek" role="group" aria-label="Photography previews" hidden></div>
    <button type="button" class="art-arrow art-next" aria-label="Scroll artwork gallery forward" hidden><span aria-hidden="true"></span></button><button type="button" class="art-arrow art-prev" aria-label="Scroll artwork gallery back" hidden><span aria-hidden="true"></span></button>
    <p class="art-explore-hint">hover &amp; click into images to explore work!</p>
    <aside class="gallery-editor" aria-label="Artwork editor" hidden></aside>
  </section>`;
}
export function writingPage() {
  return `<section class="gallery-page writing-page" aria-labelledby="writing-title">
    <span class="gallery-title-glow" aria-hidden="true"></span>
    <h1 id="writing-title" class="gallery-page-title">Writing</h1>
    <div class="writing-decoration writing-decoration-left" aria-hidden="true"><img src="${asset('f482e.png')}" alt=""></div>
    <div class="writing-decoration writing-decoration-right" aria-hidden="true"><img src="${asset('f482e.png')}" alt=""></div>
    <div class="writing-decoration writing-decoration-far-left" aria-hidden="true"><img src="${asset('18aff.png')}" alt=""></div>
    <div class="writing-decoration writing-decoration-far-right" aria-hidden="true"><img src="${asset('18aff.png')}" alt=""></div>
    <div class="writing-books">
      ${['062cd.png', '4f24f.png'].map((file, index) => `<figure class="writing-book writing-book-${index + 1}">
        <button type="button" class="book-cover" ${index === 0 ? 'data-open-book aria-expanded="false" aria-controls="collection-reader"' : `data-zoom="${asset(file)}" data-caption="ziyou’s collection: poem, photography, writing"`} aria-label="${index === 0 ? 'Read ziyou’s collection' : 'View ziyou’s collection cover 2'}"><img src="${asset(file)}" alt="ziyou’s collection, cover ${index + 1}">${index === 1 ? '<span class="book-coming-soon" aria-hidden="true">coming soon</span>' : ''}</button>
        <figcaption><strong>ziyou’s collection</strong>:<br>poem, photography, writing</figcaption>
      </figure>`).join('')}
    </div>
    <div id="collection-reader" class="collection-reader" hidden role="region" aria-label="ziyou’s collection flipbook" tabindex="-1">
      <div class="reader-content">
      <div class="book-stage" role="group" aria-label="Book pages"><button type="button" class="book-previous" data-book-step="-1" aria-label="Previous book pages">←</button><div class="book-spread"><div class="book-page book-left"></div><div class="book-page book-right"></div><div class="book-turn" hidden><div class="book-face book-front"></div><div class="book-face book-back"></div></div></div><button type="button" class="book-next" data-book-step="1" aria-label="Next book pages">→</button></div>
      <p class="book-position" aria-live="polite"></p>
      <div class="reader-toolbar"><button type="button" class="reader-close">← Back to Writing</button><button type="button" class="reader-fullscreen" aria-pressed="false">⛶ Full screen</button></div>
      </div>
    </div>
  </section>`;
}

export function canNavigateGallery() {
  if (!current) return true;
  if (current.busy || current.optimizing) { current.status('Please wait for the current save or media preparation to finish.'); return false; }
  if ((current.dirty() || current.preview) && !confirm('Leave and discard your unsaved gallery changes?')) return false;
  clearTimeout(current.timer);
  return true;
}

export function cleanupGallery() {
  if (!current) return;
  setGalleryCategory(current.category);
  clearTimeout(current.timer);
  current.unsubscribe?.();
  current.observer?.disconnect();
  current.cancelDrag?.();
  window.removeEventListener('beforeunload', current.beforeUnload);
  if (current.preview) URL.revokeObjectURL(current.preview.previewUrl);
  current = null;
}

export function setupGallery() {
  const page = document.querySelector('.art-page');
  if (!page) return;
  cleanupGallery();
  const api = globalThis.portfolioGallery;
  const gallery = page.querySelector('.art-gallery');
  const panel = page.querySelector('.gallery-editor');
  const empty = page.querySelector('.art-empty');
  const statusElement = page.querySelector('.gallery-status');
  statusElement.id = 'gallery-drag-status';
  const action = name => page.querySelector(`[data-action="${name}"]`);
  const state = current = { items: [], category: preferredCategory, editing: false, canEdit: false, draft: null, base: null, busy: false, preview: null, error: null, timer: null, cache: new Map(), layouts: {}, page: savedPage(preferredCategory), loading: true, extraPage: false, tiles: new Map() };
  state.dirty = () => state.draft && (!state.base || fields.some(key => state.draft[key] !== state.base[key]));
  state.status = message => { statusElement.textContent = message; };
  const updateButtons = () => {
    action('edit').hidden = !state.canEdit;
    action('edit').textContent = state.editing ? 'Done editing' : 'Edit gallery';
    action('add').hidden = !state.canEdit || !state.editing;
    action('retry').hidden = !state.retry || state.error === 'conflict';
    page.querySelectorAll('[data-action], [data-place], [data-confirm-place], [data-select], [data-drag]').forEach(button => { button.disabled = !!state.busy || !!state.optimizing || (!state.canEdit && (['remove', 'upload', 'reapply'].includes(button.dataset.action) || button.hasAttribute('data-confirm-place'))); });
    panel.querySelectorAll('input, textarea, select').forEach(input => { input.disabled = !state.canEdit || !!state.lockInputs || !!state.optimizing; });
  };
  let drag;
  const layout = () => state.layouts[state.category] || initialLayout(state.items, state.category);
  const slots = () => {
    const values = [...(state.previewSlots || layout().slots)];
    if (state.extraPage && values.length <= layout().slots.length) values.push(null, null, null, null);
    return values;
  };
  const photographyViewing = () => state.category === 'Paintings' && !state.editing;
  const pageSize = () => photographyViewing() ? (state.page === 0 ? 1 : 2) : state.category === 'Film' && !state.editing ? 1 : state.category === 'Illustrations' && !state.editing ? 2 : 4;
  const viewSlots = () => ['Film','Paintings','Illustrations'].includes(state.category) && !state.editing ? slots().filter(Boolean) : slots();
  const pageCount = () => Math.max(1,photographyViewing() ? 1+Math.ceil((viewSlots().length-1)/2) : Math.ceil(viewSlots().length/pageSize()));
  const pageStart = () => photographyViewing() && state.page > 0 ? state.page*2-1 : state.page*pageSize();
  const mediaSource = item => item.imageKind === 'bundled' ? { url: asset(item.imageRef), mimeType: 'image/png' } : state.cache.get(item.imageRef);
  const viewportScale = () => gallery.getBoundingClientRect().width / gallery.offsetWidth || 1;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const render = () => {
    if (current !== state) return;
    const positions = state.editing
      ? state.animationOrigin || new Map([...state.tiles].map(([id, tile]) => [id, tile.hidden ? null : tile.getBoundingClientRect()]))
      : null;
    state.animationOrigin = null;
    const values = viewSlots(), pages = pageCount();
    gallery.dataset.category = state.category;
    gallery.setAttribute('aria-label', `${categoryLabel(state.category)} artworks`);
    if (!state.loading) state.page = Math.max(0, Math.min(state.page, pages - 1));
    const size = pageSize(), start = pageStart();
    gallery.classList.toggle('is-editing', state.editing);
    gallery.classList.toggle('illustration-pair', !state.editing && state.category === 'Illustrations'
      && values[start] === 'portfolio-cheeks' && values[start + 1] === 'portfolio-maturity');
    const photography = state.category === 'Paintings' && !state.editing;
    const photographyCarousel = photography && state.page > 0;
    page.querySelector('.photography-intro').hidden = !photography || photographyCarousel;
    gallery.classList.toggle('photography-carousel', photographyCarousel);
    const currentWork = portfolioWorks.find(work => work.id === values[start]);
    if (currentWork && photography) page.style.setProperty('--photography-ratio', currentWork.width / currentWork.height);
    else page.style.removeProperty('--photography-ratio');
    if (photographyCarousel) {
      const nextWork = portfolioWorks.find(work => work.id === values[start + 1]);
      page.style.setProperty('--left-photo-ratio', currentWork ? currentWork.width / currentWork.height : 1);
      page.style.setProperty('--right-photo-ratio', nextWork ? nextWork.width / nextWork.height : 1);
    }
    const peek = page.querySelector('.photography-peek');
    const upcoming = values.slice(start + size).map(id => state.items.find(item => item.id === id)).filter(item => item?.visible && mediaSource(item));
    peek.hidden = !photography || photographyCarousel || !upcoming.length;
    if (!peek.hidden) {
      const taxiPhoto = upcoming.find(item => item.id === 'portfolio-night-darkness');
      if (upcoming.length === 8 && taxiPhoto) upcoming.push(taxiPhoto);
      const previews = upcoming.map(item => {
        const work = portfolioWorks.find(work => work.id === item.id);
        const src = escape(mediaSource(item).url);
        const label = escape(item.title || item.alt || 'photograph');
        const image = `<img src="${src}" alt="">`;
        return work
          ? `<a href="#/art/${escape(work.slug)}" aria-label="View ${label}">${image}</a>`
          : `<button type="button" data-zoom="${src}" data-caption="${label}" aria-label="View ${label}">${image}</button>`;
      }).join('');
      if (state.peekHTML !== previews) { peek.innerHTML = previews; state.peekHTML = previews; }
    }
    page.querySelector('.gallery-move-help').hidden = !state.editing;
    if (!gallery.querySelector('.gallery-slot')) {
      for (let index = 0; index < 4; index++) {
        const slot = document.createElement('div'); slot.className = 'gallery-slot';
        slot.style.gridColumn = String(Math.floor(index / 2) + 1); slot.style.gridRow = String(index % 2 + 1);
        gallery.append(slot);
      }
    }
    [...gallery.querySelectorAll('.gallery-slot')].forEach((slot, local) => {
      const index = start + local;
      slot.hidden = local >= size;
      slot.style.gridColumn = String(size < 4 ? local+1 : Math.floor(local / 2) + 1);
      slot.style.gridRow = String(size < 4 ? 1 : local % 2 + 1);
      slot.dataset.slot = index;
      slot.classList.toggle('is-drop-target', drag?.target === index);
      slot.classList.toggle('is-origin', drag?.from === index);
      slot.classList.toggle('is-empty', !values[index] || drag?.id === values[index]);
      slot.innerHTML = state.editing && !values[index] && !drag ? `<button type="button" data-empty="${index}" aria-label="Add artwork to page ${state.page + 1}, slot ${local + 1}">＋<span>Page ${state.page + 1} · Slot ${local + 1}</span></button>` : '';
      slot.setAttribute('aria-label', `Page ${state.page + 1}, slot ${local + 1}`);
    });
    const items = state.items.filter(item => item.category === state.category);
    const live = new Set(items.map(item => item.id));
    for (const [id, tile] of state.tiles) if (!live.has(id)) { tile.remove(); state.tiles.delete(id); }
    for (const item of items) {
      const source = mediaSource(item), src = source?.url || '', video = source?.mimeType.startsWith('video/');
      const signature = JSON.stringify([editable(item), state.editing, src, source?.mimeType]);
      let tile = state.tiles.get(item.id);
      if (!tile || tile.dataset.signature !== signature) {
        const template = document.createElement('template');
        const work = portfolioWorks.find(work => work.id === item.id);
        const media = !state.editing && work?.imageCollection ? artworkImageGroup(work) : video ? `<video src="${escape(src)}" controls playsinline preload="metadata" aria-label="${escape(item.alt || item.title)}"></video>` : `<img ${src ? `src="${escape(src)}"` : ''} alt="${escape(item.alt)}">`;
        const overlay = item.overlayText ? `<span class="news-wash" aria-hidden="true"></span><span class="artwork-overlay-copy"><span class="news-year">${escape(item.overlayYear)}</span><span class="news-title${item.overlayText.length > 20 ? ' news-title-long' : ''}">${escape(item.overlayText)}</span></span>` : '';
        const caption = [item.title, item.caption].filter(Boolean).join(' — ');
        template.innerHTML = state.editing
          ? `<article class="art-tile art-edit-tile${video ? ' art-video-tile' : ''}${item.visible ? '' : ' is-hidden'}"><${video ? 'div' : 'button type="button"'} class="art-edit-image" ${video ? '' : `data-select="${escape(item.id)}" aria-label="Edit ${escape(item.title)}"`}>${media}${overlay}</${video ? 'div' : 'button'}><div class="art-tile-controls"><button type="button" data-drag="${escape(item.id)}" aria-label="Move ${escape(item.title)}" aria-describedby="gallery-drag-status">⠿</button><span>${escape(item.title || 'Untitled')}${item.visible ? '' : ' · Hidden'}</span><button type="button" data-select="${escape(item.id)}">Edit</button><button type="button" data-place="${escape(item.id)}" aria-label="Move ${escape(item.title)} to page and slot">Move</button></div></article>`
          : video ? `<article class="art-tile art-video-tile" aria-label="${escape(caption)}">${media}${overlay}</article>` : `<button type="button" class="art-tile" ${src ? `data-zoom="${escape(src)}"` : 'disabled'} data-caption="${escape(caption)}" aria-label="View ${escape(item.title || item.alt)}">${media}${overlay}</button>`;
        const replacement = template.content.firstElementChild;
        replacement.dataset.item = item.id; replacement.dataset.signature = signature;
        if (tile) tile.replaceWith(replacement); else gallery.append(replacement);
        tile = replacement; state.tiles.set(item.id, tile);
        tile.style.setProperty('--artwork-color', portfolioWorks.find(work => work.id === item.id)?.accentColor || '#125485');
      }
      const index = values.indexOf(item.id), local = index - start;
      if (drag?.id === item.id && !drag.keyboard) continue;
      tile.hidden = local < 0 || local >= size || (!state.editing && !item.visible);
      if (tile.hidden) continue;
      const box = gallery.querySelectorAll('.gallery-slot')[local];
      Object.assign(tile.style, { left: `${box.offsetLeft}px`, top: `${box.offsetTop}px`, width: `${box.offsetWidth}px`, height: `${box.offsetHeight}px` });
      tile.classList.toggle('keyboard-picked', drag?.id === item.id);
      tile.getAnimations().forEach(animation => animation.cancel());
      const old = positions?.get(item.id);
      if (!old || reducedMotion()) continue;
      const next = tile.getBoundingClientRect();
      if (old.left !== next.left || old.top !== next.top) {
        const scale = viewportScale();
        tile.animate([{ transform: `translate(${(old.left - next.left) / scale}px, ${(old.top - next.top) / scale}px)` }, { transform: 'translate(0, 0)' }], { duration: 200, easing: 'ease-out' });
      }
    }
    const fullLast = layout().slots.slice(-4).every(Boolean);
    const pagination = page.querySelector('.gallery-pagination');
    pagination.innerHTML = `<button type="button" data-page="${state.page - 1}" ${state.page === 0 ? 'disabled' : ''} aria-label="Previous gallery page">←</button>${Array.from({length: pages}, (_, index) => `<button type="button" data-page="${index}" aria-label="Gallery page ${index + 1}" aria-current="${index === state.page ? 'page' : 'false'}">${index + 1}</button>`).join('')}<button type="button" data-page="${state.page + 1}" ${state.page === pages - 1 ? 'disabled' : ''} aria-label="Next gallery page">→</button>${state.editing && state.page === pages - 1 && fullLast && !state.extraPage && values.length < 200 ? '<button type="button" data-action="page-add">＋ Add page</button>' : ''}`;
    empty.hidden = !state.loading;
    empty.textContent = 'Loading gallery…';
    for (const item of items.filter(item => item.imageKind === 'uploaded' && !state.cache.has(item.imageRef))) {
      if (!api) continue;
      state.cache.set(item.imageRef, null);
      api.getImage(item.imageRef).then(media => { if (current !== state) return; state.cache.set(item.imageRef, media); render(); }).catch(() => { state.cache.delete(item.imageRef); state.status('Media could not load.'); state.retry = render; updateButtons(); });
    }
    updateButtons();
    gallery.querySelectorAll('[data-zoom]').forEach(tile => {
      const work = portfolioWorks.find(work => work.id === tile.dataset.item);
      if (work) {
        delete tile.dataset.zoom;
        tile.dataset.detail = '#/art/' + work.slug;
      }
    });
  };
  const releasePreview = () => { panel.querySelector('.gallery-media-preview')?.replaceChildren(); if (state.preview) URL.revokeObjectURL(state.preview.previewUrl); state.preview = null; };
  const conflictControls = () => {
    const controls = panel.querySelector('.gallery-conflict');
    if (controls) controls.hidden = state.error !== 'conflict';
  };
  const failed = (error, retry) => {
    state.error = String(error.code || '').split('/').pop();
    if (state.error === 'conflict' && !state.base) state.error = 'stale-order';
    state.retry = retry;
    state.status(state.error === 'conflict' ? 'This artwork changed elsewhere. Your input is preserved. Reload or reapply below.' : `Could not save: ${error.message || 'Check your connection and retry.'}`);
    conflictControls();
  };
  const syncItem = item => { state.items = state.items.filter(existing => existing.id !== item.id).concat(item); };
  const save = async () => {
    clearTimeout(state.timer);
    if (!state.dirty() || state.busy || state.error || !state.canEdit || !state.base) return;
    const sent = { ...state.draft };
    const id = state.base.id;
    state.busy = true; state.status('Saving…'); updateButtons();
    try {
      const result = await api.save(id, state.base.revision, editable(sent));
      if (current !== state) return;
      state.base = result;
      syncItem(result);
      state.status('Saved'); state.retry = null;
    } catch (error) { failed(error, () => { state.error = null; save(); }); }
    finally {
      state.busy = false;
      render();
      if (current === state && state.dirty() && !state.error) state.timer = setTimeout(save, 500);
    }
  };
  const openEditor = item => {
    state.base = item || null;
    state.draft = item ? editable(item) : { title: 'Untitled artwork', caption: '', alt: 'Artwork', category: state.category, visible: true, imageKind: 'uploaded', imageRef: '', overlayText: '', overlayYear: '' };
    state.error = null; state.retry = null; releasePreview();
    const draft = state.draft;
    panel.hidden = false;
    panel.innerHTML = `<div class="gallery-editor-heading"><h2>${item ? 'Edit artwork' : 'Add artwork'}</h2><button type="button" data-action="close">Close</button></div>
      <div class="gallery-conflict" hidden><p>Your input is still here. Reload discards it; reapply saves it over the latest version.</p><button type="button" data-action="reload">Reload latest</button><button type="button" data-action="reapply">Reapply my changes</button></div>
      <form class="gallery-fields"><label>Title<input name="title" maxlength="160" value="${escape(draft.title)}"></label><label>Caption<textarea name="caption" maxlength="3000">${escape(draft.caption)}</textarea></label><label>Media description for accessibility<textarea name="alt" maxlength="500">${escape(draft.alt)}</textarea></label><label>Category<select name="category">${categories.map(category => `<option value="${category}"${draft.category === category ? ' selected' : ''}>${categoryLabel(category)}</option>`).join('')}</select></label><label class="gallery-checkbox"><input name="visible" type="checkbox"${draft.visible ? ' checked' : ''}>Visible in gallery</label><label>News overlay text<input name="overlayText" maxlength="100" value="${escape(draft.overlayText)}"></label><label>News overlay year<input name="overlayYear" maxlength="20" value="${escape(draft.overlayYear)}"></label><label>${item ? 'Replace media' : 'Choose media'}<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"></label><p class="gallery-upload-help">JPEG, PNG or WebP up to 20 MiB are optimized for the web. GIF, MP4 and WebM must already be at most 600 KiB and 1,600 pixels on the longest edge; animation is preserved. Originals stay on your computer.</p><div class="gallery-image-preview" hidden><div class="gallery-media-preview"></div><p></p><button type="button" data-action="upload">${item ? 'Use this media' : 'Add artwork with this media'}</button><button type="button" data-action="cancel-image">Cancel media</button></div>${item ? '<button type="button" class="gallery-remove" data-action="remove">Remove artwork</button>' : '<p>Choose media and review its preview to add this artwork.</p>'}</form>`;
    updateButtons();
    panel.querySelector('input').focus();
  };
  const discardEditor = () => { clearTimeout(state.timer); state.draft = null; state.base = null; state.error = null; state.retry = null; releasePreview(); panel.hidden = true; updateButtons(); };
  const run = async (operation, retry = () => run(operation)) => {
    state.busy = true; state.lockInputs = true; state.status('Saving…'); updateButtons();
    try { await operation(); state.error = null; state.retry = null; state.status('Saved'); }
    catch (error) { failed(error, retry); }
    finally { state.busy = false; state.lockInputs = false; render(); }
  };
  const commitMove = async (from, to, revision = layout().revision) => {
    if (from < 0 || from === to) { state.previewSlots = null; render(); return; }
    const category = state.category;
    state.previewSlots = moveSlot(layout().slots, from, to);
    render();
    await run(async () => {
      const result = await api.move(category, revision, from, to);
      state.layouts[category] = result;
      state.extraPage = false;
    }, () => { state.error = null; commitMove(layout().slots.indexOf(state.moveId), to); });
    state.previewSlots = null;
    render();
  };
  const changePage = index => { state.page = Math.max(0, Math.min(index, pageCount() - 1)); sessionStorage.setItem('portfolio-art-page-' + state.category, state.page); render(); };
  const addPage = () => { if (slots().length >= 200) { state.status('This category has reached its 50-page limit.'); return; } state.extraPage = true; state.page = layout().slots.length / 4; render(); };
  page.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || state.busy || state.optimizing) return;
    if (button.dataset.category) {
      if (!canNavigateGallery()) return;
      state.cancelDrag(); discardEditor(); state.category = button.dataset.category; setGalleryCategory(state.category); state.page = 0; sessionStorage.setItem('portfolio-art-page-' + state.category, 0); state.extraPage = false;
      page.querySelectorAll('.art-category').forEach(other => { other.classList.toggle('selected', other === button); other.setAttribute('aria-pressed', String(other === button)); });
      gallery.setAttribute('aria-label', `${categoryLabel(state.category)} artworks`); gallery.scrollLeft = 0; render(); return;
    }
    if (button.dataset.select) { if (canNavigateGallery()) openEditor(state.items.find(item => item.id === button.dataset.select)); return; }
    if (button.dataset.page !== undefined) { changePage(Number(button.dataset.page)); return; }
    if (button.dataset.empty !== undefined) { if (canNavigateGallery()) { state.placement = { slot: Number(button.dataset.empty), revision: layout().revision }; openEditor(null); } return; }
    if (button.dataset.place) {
      if (!canNavigateGallery()) return;
      discardEditor();
      const id = button.dataset.place;
      panel.hidden = false;
      panel.innerHTML = `<div class="gallery-editor-heading"><h2>Move artwork</h2><button type="button" data-action="close">Close</button></div><label>Destination <select class="gallery-destination">${slots().map((value, index) => `<option value="${index}">Page ${Math.floor(index / 4) + 1}, slot ${index % 4 + 1}${value ? ' · occupied' : ' · empty'}</option>`).join('')}</select></label><button type="button" data-confirm-place="${escape(id)}">Move here</button>`;
      return;
    }
    if (button.dataset.confirmPlace) {
      state.moveId = button.dataset.confirmPlace;
      const to = Number(panel.querySelector('select').value), from = layout().slots.indexOf(state.moveId);
      discardEditor(); await commitMove(from, to); return;
    }
    switch (button.dataset.action) {
      case 'page-add': addPage(); break;
      case 'edit': if (canNavigateGallery()) { state.cancelDrag(); discardEditor(); state.extraPage = false; state.editing = !state.editing; render(); } break;
      case 'add': if (canNavigateGallery()) { state.placement = undefined; openEditor(null); } break;
      case 'close': if (canNavigateGallery()) discardEditor(); break;
      case 'retry': state.retry?.(); break;
      case 'cancel-image': releasePreview(); panel.querySelector('.gallery-image-preview').hidden = true; break;
      case 'reload': {
        const latest = state.items.find(item => item.id === state.base?.id);
        if (confirm('Discard your input and load the latest saved artwork?')) latest ? openEditor(latest) : discardEditor(); break;
      }
      case 'reapply': {
        const latest = state.items.find(item => item.id === state.base?.id);
        if (!latest) { state.status('This artwork was removed. Copy your text before closing, then add a new artwork.'); break; }
        state.base = latest; state.error = null; state.retry = null; conflictControls(); save(); break;
      }
      case 'remove': {
        if (!state.base || !confirm('Remove this artwork from the gallery? Its stored media will be retained.')) break;
        const { id, revision } = state.base; clearTimeout(state.timer);
        await run(async () => { await api.remove(id, revision); state.items = state.items.filter(item => item.id !== id); discardEditor(); }); break;
      }
      case 'upload': {
        if (!state.preview || state.error === 'conflict') break;
        clearTimeout(state.timer);
        const upload = state.preview;
        await run(async () => {
          const imageRef = await api.upload({ base64: upload.base64, width: upload.width, height: upload.height, mimeType: upload.mimeType });
          const draft = { ...state.draft, imageKind: 'uploaded', imageRef };
          const item = state.base ? await api.save(state.base.id, state.base.revision, draft) : await api.add(draft, draft.category === state.category ? state.placement : undefined);
          syncItem(item); state.extraPage = false; state.placement = undefined; openEditor(item);
        }); break;
      }
    }
  });
  panel.addEventListener('submit', event => event.preventDefault());
  panel.addEventListener('input', event => {
    const input = event.target;
    if (!state.draft || !fields.includes(input.name) || !state.canEdit) return;
    state.draft[input.name] = input.type === 'checkbox' ? input.checked : input.value;
    clearTimeout(state.timer);
    if (!state.error) { state.status(state.base ? 'Unsaved changes' : 'Choose and preview media to add this artwork.'); state.timer = setTimeout(save, 500); }
  });
  panel.addEventListener('change', async event => {
    if (event.target.name !== 'image' || !event.target.files[0]) return;
    state.optimizing = true; state.status('Preparing media…'); updateButtons();
    try {
      const optimized = await optimizeImage(event.target.files[0]);
      if (current !== state) { URL.revokeObjectURL(optimized.previewUrl); return; }
      releasePreview(); state.preview = optimized;
      const preview = panel.querySelector('.gallery-image-preview'); preview.hidden = false;
      const media = document.createElement(optimized.mimeType.startsWith('video/') ? 'video' : 'img');
      media.src = optimized.previewUrl;
      if (media.tagName === 'VIDEO') { media.controls = true; media.playsInline = true; media.preload = 'metadata'; media.setAttribute('aria-label', 'Video preview'); }
      else media.alt = 'Media preview';
      preview.querySelector('.gallery-media-preview').replaceChildren(media);
      preview.querySelector('p').textContent = `${optimized.width} × ${optimized.height} · ${Math.ceil(optimized.byteLength / 1024)} KiB. Review before saving.`;
      state.status('Media ready to review.');
    } catch (error) { state.status(error.message); }
    finally { state.optimizing = false; event.target.value = ''; updateButtons(); }
  });
  let suppressDragClick = false;
  const announceTarget = () => state.status(`Moving artwork to page ${Math.floor(drag.target / 4) + 1}, slot ${drag.target % 4 + 1}. Enter to drop; Escape to cancel.`);
  state.cancelDrag = (keepPreview = false) => {
    if (!drag) return;
    const old = drag;
    clearTimeout(old.edgeTimer);
    drag = null;
    state.animationOrigin = new Map([...state.tiles].map(([id, tile]) => [id, tile.hidden ? null : tile.getBoundingClientRect()]));
    if (keepPreview !== true) state.previewSlots = null;
    old.tile.classList.remove('is-lifted');
    old.tile.style.position = ''; old.tile.style.zIndex = ''; old.tile.style.pointerEvents = '';
    gallery.classList.remove('is-dragging');
    if (old.pointerId !== undefined && gallery.hasPointerCapture(old.pointerId)) gallery.releasePointerCapture(old.pointerId);
    render();
  };
  const beginDrag = (id, event) => {
    if (drag) state.cancelDrag();
    if (!canNavigateGallery()) return false;
    discardEditor();
    const tile = state.tiles.get(id), rect = tile.getBoundingClientRect(), bounds = gallery.getBoundingClientRect();
    drag = { id, tile, from: layout().slots.indexOf(id), target: layout().slots.indexOf(id), revision: layout().revision, original: [...slots()], itemRevision: state.items.find(item => item.id === id)?.revision, keyboard: !event, pointerId: event?.pointerId, offsetX: event ? event.clientX - rect.left : 0, offsetY: event ? event.clientY - rect.top : 0 };
    state.moveId = id;
    tile.querySelector('[data-drag]').focus({ preventScroll: true });
    if (event) {
      tile.getAnimations().forEach(animation => animation.cancel());
      const scale = viewportScale();
      Object.assign(tile.style, { position: 'absolute', left: `${(rect.left - bounds.left) / scale}px`, top: `${(rect.top - bounds.top) / scale}px`, width: `${rect.width / scale}px`, height: `${rect.height / scale}px`, zIndex: '20', pointerEvents: 'none' });
      tile.classList.add('is-lifted');
      gallery.setPointerCapture(event.pointerId);
    }
    gallery.classList.add('is-dragging'); announceTarget(); render(); return true;
  };
  const previewTarget = target => {
    if (!drag || target < 0 || target >= slots().length || target === drag.target) return;
    drag.target = target;
    state.previewSlots = moveSlot(drag.original, drag.from, target);
    // Keep the provisional last page visible even when normalization trims it.
    while (state.previewSlots.length < (state.page + 1) * 4) state.previewSlots.push(null);
    announceTarget(); render();
  };
  const finishDrag = async () => {
    if (!drag) return;
    const { from, target, revision } = drag;
    state.cancelDrag(true);
    await commitMove(from, target, revision);
  };
  gallery.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-drag]');
    if (!handle || event.button !== 0 || !event.isPrimary || state.busy || state.optimizing || !state.canEdit) return;
    event.preventDefault(); beginDrag(handle.dataset.drag, event);
  });
  gallery.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const galleryRect = gallery.getBoundingClientRect();
    const scale = viewportScale();
    Object.assign(drag.tile.style, { left: `${(event.clientX - galleryRect.left - drag.offsetX) / scale}px`, top: `${(event.clientY - galleryRect.top - drag.offsetY) / scale}px` });
    const boxes = [...gallery.querySelectorAll('.gallery-slot')];
    const target = boxes.find(box => { const r = box.getBoundingClientRect(); return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom; });
    if (target) previewTarget(Number(target.dataset.slot));
    const bounds = gallery.getBoundingClientRect();
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const edge = under?.closest('[data-action="page-add"]') ? 'add' : event.clientY >= bounds.top && event.clientY <= bounds.bottom ? event.clientX < bounds.left + 35 ? -1 : event.clientX > bounds.right - 35 ? 1 : null : null;
    if (edge !== drag.edge) {
      clearTimeout(drag.edgeTimer); drag.edge = edge;
      if (edge !== null) drag.edgeTimer = setTimeout(() => {
        if (!drag) return;
        const previousPage = state.page, localSlot = drag.target % 4;
        if (edge === 'add') addPage(); else changePage(state.page + edge);
        while (drag.original.length < slots().length) drag.original.push(null);
        if (state.page !== previousPage && edge !== 'add') previewTarget(state.page * 4 + localSlot);
        drag.edge = null;
      }, 600);
    }
  });
  gallery.addEventListener('pointerup', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault(); suppressDragClick = true; setTimeout(() => { suppressDragClick = false; }, 0); finishDrag();
  });
  gallery.addEventListener('pointercancel', state.cancelDrag);
  gallery.addEventListener('lostpointercapture', event => { if (drag?.pointerId === event.pointerId) state.cancelDrag(); });
  gallery.addEventListener('click', event => { if (suppressDragClick) { event.preventDefault(); event.stopPropagation(); } }, true);
  gallery.addEventListener('keydown', event => {
    const handle = event.target.closest('[data-drag]');
    if (!drag && handle && [' ', 'Enter'].includes(event.key) && state.canEdit && !state.busy) { event.preventDefault(); beginDrag(handle.dataset.drag); return; }
    if (!drag) return;
    if (event.key === 'Escape') { event.preventDefault(); state.cancelDrag(); return; }
    if (!drag.keyboard) return;
    if (['Enter', ' '].includes(event.key)) { event.preventDefault(); finishDrag(); return; }
    const mobile = matchMedia('(max-width: 700px)').matches;
    const delta = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: mobile ? -1 : -2, ArrowRight: mobile ? 1 : 2, PageUp: -4, PageDown: 4 }[event.key];
    if (delta) {
      event.preventDefault();
      let target = Math.max(0, drag.target + delta);
      if (target >= slots().length && slots().length < 200 && layout().slots.slice(-4).every(Boolean) && !state.extraPage) { addPage(); while (drag.original.length < slots().length) drag.original.push(null); }
      target = Math.min(target, slots().length - 1); state.page = Math.floor(target / 4); previewTarget(target);
      drag.tile.querySelector('[data-drag]').focus({ preventScroll: true });
    }
  });
  let swipe;
  gallery.addEventListener('pointerdown', event => { swipe = null; if (!state.busy && !state.optimizing && !drag && !event.target.closest('video, .art-tile-controls, .gallery-slot button')) swipe = { x: event.clientX, y: event.clientY }; });
  gallery.addEventListener('pointerup', event => { if (swipe && !state.busy && !state.optimizing && !drag && Math.abs(event.clientX - swipe.x) > 60 && Math.abs(event.clientY - swipe.y) < 45) { suppressDragClick = true; setTimeout(() => { suppressDragClick = false; }, 0); changePage(state.page + (event.clientX < swipe.x ? 1 : -1)); } swipe = null; });
  gallery.addEventListener('pointercancel', () => { swipe = null; });
  page.addEventListener('load', render, true);
  state.observer = new ResizeObserver(() => render()); state.observer.observe(gallery);
  state.beforeUnload = event => { if (state.dirty() || state.busy || state.preview || state.optimizing) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload', state.beforeUnload);
  if (api) state.unsubscribe = api.subscribe(snapshot => {
    if (current !== state) return;
    if (drag && (!snapshot.canEdit || snapshot.layouts?.[state.category]?.revision !== drag.revision || snapshot.items.find(item => item.id === drag.id)?.revision !== drag.itemRevision)) {
      state.cancelDrag(); state.status('The gallery layout changed elsewhere. Your move was cancelled; try again with the latest layout.');
    }
    state.layouts = snapshot.layouts || {};
    state.items = snapshot.items;
    state.loading = snapshot.loading;
    state.canEdit = snapshot.canEdit;
    if (!state.canEdit) {
      state.editing = false;
      clearTimeout(state.timer);
      if (state.dirty() || state.preview) state.status('Editing permission is unavailable. Your unsaved input is preserved below.');
    }
    if (snapshot.error) state.status(snapshot.error);
    render();
  });
  else if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    state.loading = false;
    const existingOrder = ['installation-1', 'news-report', 'installation-2', 'installation-3'];
    state.items = portfolioWorks.map((work, index) => {
      const imageRef = 'local-' + work.slug;
      state.cache.set(imageRef, {url:asset(work.cover),mimeType:'image/webp'});
      const originalIndex = existingOrder.indexOf(work.id);
      return {id:work.id,title:work.title,caption:work.caption,alt:work.title,category:work.category,visible:true,imageKind:'uploaded',imageRef,order:originalIndex < 0 ? index+10 : originalIndex,revision:1,overlayText:work.title,overlayYear:work.year};
    });
    render();
  } else { state.status('The gallery connection is unavailable. Please sign out and sign in again.'); empty.textContent = 'Unable to load gallery.'; }
}
