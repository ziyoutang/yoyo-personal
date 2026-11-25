import { aboutDesign, aboutDefaults } from './design-pages.js?v=20261104-about-portrait';
let current;
export function aboutPage() {
  return `<section class="gallery-page about-page">${aboutDesign()}<div class="gallery-toolbar"><span role="status" data-about-status></span></div><form class="gallery-editor about-editor" hidden><label>Heading<input name="heading" maxlength="160"></label><label>Biography<textarea name="body" maxlength="10000" rows="12"></textarea></label><div><button type="button" data-about-done>Done editing</button><button type="button" data-about-retry hidden>Retry save</button><button type="button" data-about-reload hidden>Reload latest</button><button type="button" data-about-reapply hidden>Reapply my changes</button></div></form></section>`;
}
export function canNavigateAbout() {
  if (!current || (!current.dirty() && !current.busy)) return true;
  current.status.textContent = 'Wait for your changes to save, or resolve the save error before leaving.';
  return false;
}
export function cleanupAbout() {
  if (!current) return;
  clearTimeout(current.timer); current.unsubscribe?.();
  window.removeEventListener('beforeunload', current.beforeUnload); current = null;
}
export function setupAbout() {
  const page = document.querySelector('.about-page');
  if (!page) return;
  const api = globalThis.portfolioAbout;
  const form = page.querySelector('form');
  const button = action => page.querySelector(`[data-about-${action}]`);
  const state = current = { base: {...aboutDefaults,revision:0}, draft:null, busy:false, canEdit:false, error:null, status:button('status') };
  state.dirty = () => state.draft && ['heading','body'].some(key => state.draft[key] !== state.base[key]);
  const controls = () => {
    form.querySelectorAll('input,textarea').forEach(input => { input.disabled = !state.canEdit; });
    button('done').disabled = state.busy || !!state.dirty();
    button('retry').hidden = !state.error || state.error === 'conflict';
    button('reload').hidden = state.error !== 'conflict';
    button('reapply').hidden = state.error !== 'conflict';
    for (const action of ['retry','reapply']) button(action).disabled = state.busy || !state.canEdit;
  };
  const display = () => {
    button('heading').textContent = state.base.heading;
    button('body').textContent = state.base.body;
    controls();
  };
  const save = async () => {
    clearTimeout(state.timer);
    if (!state.dirty() || state.busy || !state.canEdit || state.error) return;
    state.busy = true; state.status.textContent = 'Saving…'; controls();
    const sent = {...state.draft};
    try {
      const saved = await api.save(state.base.revision, sent);
      if (current !== state) return;
      state.base = saved; state.status.textContent = 'Saved';
      if (state.latest?.revision > saved.revision) {
        state.error = 'conflict';
        state.status.textContent = 'About me changed elsewhere. Your text is preserved. Reload or reapply your changes.';
      }
    } catch (error) {
      if (current !== state) return;
      state.error = error.code?.split('/').pop() || 'save-failed';
      state.status.textContent = state.error === 'conflict' ? 'About me changed elsewhere. Your text is preserved. Reload or reapply your changes.' : `Could not save: ${error.message || 'Please retry.'}`;
    } finally {
      state.busy = false;
      if (current === state) { display(); if (state.dirty() && !state.error) state.timer = setTimeout(save,500); }
    }
  };
  const loadForm = () => {
    state.draft = {heading:state.base.heading,body:state.base.body};
    for (const key of ['heading','body']) form.elements[key].value = state.draft[key];
  };
  button('done').onclick = () => { if (canNavigateAbout()) { state.draft=null; form.hidden=true; controls(); } };
  button('retry').onclick = () => { state.error=null; save(); };
  button('reload').onclick = () => { state.base=state.latest || state.base; state.error=null; loadForm(); state.status.textContent='Loaded latest version'; display(); };
  button('reapply').onclick = () => { state.base=state.latest || state.base; state.error=null; save(); };
  form.onsubmit = event => event.preventDefault();
  form.oninput = event => {
    if (!state.canEdit || !['heading','body'].includes(event.target.name)) return;
    state.draft[event.target.name]=event.target.value;
    clearTimeout(state.timer); if (!state.error) { state.status.textContent='Unsaved changes'; state.timer=setTimeout(save,500); } controls();
  };
  state.beforeUnload = event => { if (state.dirty() || state.busy) { event.preventDefault(); event.returnValue=''; } };
  window.addEventListener('beforeunload',state.beforeUnload);
  if (!api) return;
  state.unsubscribe=api.subscribe(snapshot => {
    if (current !== state) return;
    state.canEdit=snapshot.canEdit;
    const value=snapshot.content?.revision === 0 ? {...aboutDefaults,revision:0} : snapshot.content;
    if (value) {
      state.latest=value;
      if (!state.dirty() && !state.busy) { state.base=value; if (state.draft) loadForm(); }
    }
    if (snapshot.error) state.status.textContent=snapshot.error;
    else if (!state.canEdit && state.dirty()) state.status.textContent='Editing permission was removed. Your unsaved text is preserved.';
    else if (!state.dirty() && !state.busy && !state.error) state.status.textContent=snapshot.loading?'Loading…':'';
    display();
  });
}
