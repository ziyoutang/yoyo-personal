import { bookPages } from './book-pages.js';

const asset = name => globalThis.portfolioAsset?.(name) ?? `/assets/${name}`;
let dispose;
export function cleanupBook() { dispose?.(); dispose = null; }
export function setupBook() {
  const page = document.querySelector('.writing-page');
  if (!page) return;
  const opener = page.querySelector('[data-open-book]');
  const reader = page.querySelector('.collection-reader');
  const left = reader.querySelector('.book-left'), right = reader.querySelector('.book-right');
  const turn = reader.querySelector('.book-turn');
  const fullscreen = reader.querySelector('.reader-fullscreen');
  const previous = reader.querySelector('[data-book-step="-1"]'), next = reader.querySelector('[data-book-step="1"]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  let audioContext, flipBuffer;
  let spread = 0, busy = false, active = true, expanded = false, nativeFullscreen = false;
  function playFlipSound() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      audioContext ??= new Context();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      if (!flipBuffer) {
        flipBuffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * .56), audioContext.sampleRate);
        const samples = flipBuffer.getChannelData(0);
        for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
      }
      const source = audioContext.createBufferSource(), filter = audioContext.createBiquadFilter(), gain = audioContext.createGain();
      const now = audioContext.currentTime;
      source.buffer = flipBuffer;
      filter.type = 'bandpass'; filter.Q.value = .7;
      filter.frequency.setValueAtTime(1500, now);
      filter.frequency.linearRampToValueAtTime(3500, now + .12);
      filter.frequency.exponentialRampToValueAtTime(800, now + .52);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.06, now + .035);
      gain.gain.exponentialRampToValueAtTime(.018, now + .12);
      gain.gain.exponentialRampToValueAtTime(.04, now + .23);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .54);
      source.connect(filter); filter.connect(gain); gain.connect(audioContext.destination);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start(now);
    } catch { /* Sound availability must not interrupt page turns. */ }
  }
  function picture(index) {
    return index >= 0 && index < bookPages.length ? `<img src="${asset(bookPages[index])}" alt="ziyou’s collection — PDF page ${index+1}" draggable="false">` : '';
  }
  function draw() {
    reader.querySelector('.book-spread').classList.toggle('book-closed', spread === 0);
    left.innerHTML = picture(spread*2-1); right.innerHTML = picture(spread*2);
    previous.disabled = spread === 0; next.disabled = spread*2 >= bookPages.length-1;
    reader.querySelector('[aria-live]').textContent = spread === 0 ? `Cover · 1 / ${bookPages.length}` : `Pages ${spread*2}–${Math.min(spread*2+1,bookPages.length)} / ${bookPages.length}`;
    // Decode the following spread before its turn begins.
    for (const index of [spread*2+1,spread*2+2]) if (bookPages[index]) { const image = new Image(); image.src = asset(bookPages[index]); }
  }
  async function animate(element, frames, duration) {
    if (reduced.matches) return;
    const animation = element.animate(frames,{duration,easing:'cubic-bezier(.25,.7,.25,1)',fill:'both'});
    animations.add(animation);
    try { await animation.finished; } catch {} finally { animation.cancel(); animations.delete(animation); }
  }
  async function step(direction) {
    if (busy || (direction < 0 ? previous.disabled : next.disabled)) return;
    busy = true; previous.disabled = next.disabled = true;
    playFlipSound();
    const old = spread, target = spread+direction;
    if (direction > 0) reader.querySelector('.book-spread').classList.remove('book-closed');
    turn.hidden = false;
    turn.querySelector('.book-front').innerHTML = picture(direction > 0 ? old*2 : target*2);
    turn.querySelector('.book-back').innerHTML = picture(direction > 0 ? target*2-1 : old*2-1);
    if (direction > 0) right.innerHTML = picture(target*2);
    else left.innerHTML = picture(target*2-1);
    await animate(turn,[{transform:`rotateY(${direction > 0 ? 0 : -180}deg)`},{transform:`rotateY(${direction > 0 ? -180 : 0}deg)`}],650);
    if (!active) return;
    spread = target; turn.hidden = true; busy = false; draw();
  }
  async function open() {
    if (busy || !reader.hidden) return;
    busy = true;
    const cover = opener.getBoundingClientRect(), bounds = page.getBoundingClientRect();
    const scale = bounds.width / 1512;
    page.classList.add('is-reading');
    opener.setAttribute('aria-expanded','true');
    // Move the selected cover into the center before revealing the open book.
    await animate(opener,[{transform:'translate(0,0) scale(1)'},{transform:`translate(${(bounds.left+bounds.width/2-cover.left-cover.width/2)/scale}px,${(bounds.top+bounds.height/2-cover.top-cover.height/2)/scale}px) scale(1.06)`}],550);
    if (!active) return;
    page.classList.add('reader-open'); reader.hidden = false; spread = 0; draw(); reader.focus({preventScroll:true});
    await animate(reader,[{opacity:0,transform:'translateY(12px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],300);
    busy = false;
  }
  function close() {
    if (busy) return;
    if (expanded) collapse();
    reader.hidden = true; page.classList.remove('is-reading','reader-open'); opener.setAttribute('aria-expanded','false'); opener.focus({preventScroll:true});
  }
  function collapse() {
    expanded = false; nativeFullscreen = false;
    if (document.fullscreenElement === reader) document.exitFullscreen();
    reader.classList.remove('is-fullscreen'); page.append(reader);
    fullscreen.textContent = '⛶ Full screen'; fullscreen.setAttribute('aria-pressed','false');
  }
  async function expand() {
    if (expanded) { collapse(); return; }
    expanded = true; reader.classList.add('is-fullscreen'); document.body.append(reader);
    fullscreen.textContent = '↙ Exit full screen'; fullscreen.setAttribute('aria-pressed','true'); reader.focus({preventScroll:true});
    try { await reader.requestFullscreen(); } catch { /* Keep the viewport reader when native fullscreen is unavailable. */ }
  }
  function fullscreenChanged() {
    if (document.fullscreenElement === reader) nativeFullscreen = true;
    else if (nativeFullscreen) collapse();
  }
  const click = event => { const control = event.target.closest('[data-book-step]'); if (control) step(Number(control.dataset.bookStep)); };
  const key = event => {
    if (reader.hidden) return;
    if (['ArrowLeft','ArrowRight','Escape'].includes(event.key)) event.preventDefault();
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'Escape') { if (expanded) collapse(); else close(); }
  };
  opener.addEventListener('click',open); reader.addEventListener('click',click); reader.addEventListener('keydown',key);
  reader.querySelector('.reader-close').addEventListener('click',close);
  fullscreen.addEventListener('click',expand); document.addEventListener('fullscreenchange',fullscreenChanged);
  dispose = () => { active = false; for (const animation of animations) animation.cancel(); audioContext?.close().catch(() => {}); if (expanded) collapse(); document.removeEventListener('fullscreenchange',fullscreenChanged); };
}
