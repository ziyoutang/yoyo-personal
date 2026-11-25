let disposeAlbum;
export function cleanupAlbum() { disposeAlbum?.(); disposeAlbum = null; }
export function setupAlbum() {
  const viewport = document.querySelector('.album-grid');
  if (!viewport) return;
  const images = [...viewport.querySelectorAll('img')];
  const ready = event => {
    const image = event.target;
    image.parentElement.classList.toggle('album-tall',image.naturalHeight > image.naturalWidth * 1.15);
  };
  images.forEach(image => {
    if (image.complete) ready({target:image});
    else image.addEventListener('load',ready,{once:true});
  });
  let frame, previous = 0, position = viewport.scrollLeft, manual = false, dragX = null, dragScroll = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const tick = time => {
    const delta = previous ? Math.min((time-previous)/1000,.05) : 0; previous = time;
    if (!manual && !motion.matches) {
      position = Math.min(position + delta * 35,viewport.scrollWidth-viewport.clientWidth);
      viewport.scrollLeft = position;
    } else position = viewport.scrollLeft;
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  const takeControl = () => { manual = true; };
  const wheel = event => {
    manual = true;
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) { event.preventDefault(); viewport.scrollLeft += event.deltaY; }
  };
  const down = event => {
    manual = true;
    if (event.pointerType !== 'mouse') return;
    dragX = event.clientX; dragScroll = viewport.scrollLeft;
    viewport.setPointerCapture(event.pointerId);
  };
  const move = event => {
    if (dragX === null) return;
    const scale = viewport.getBoundingClientRect().width / viewport.clientWidth;
    viewport.scrollLeft = dragScroll - (event.clientX-dragX)/scale;
  };
  const up = () => { dragX = null; };
  viewport.addEventListener('wheel',wheel,{passive:false});
  viewport.addEventListener('pointerdown',down); viewport.addEventListener('pointermove',move);
  viewport.addEventListener('pointerup',up); viewport.addEventListener('pointercancel',up);
  viewport.addEventListener('keydown',takeControl);
  disposeAlbum = () => {
    cancelAnimationFrame(frame);
    images.forEach(image=>image.removeEventListener('load',ready));
    viewport.removeEventListener('wheel',wheel);
    viewport.removeEventListener('pointerdown',down); viewport.removeEventListener('pointermove',move);
    viewport.removeEventListener('pointerup',up); viewport.removeEventListener('pointercancel',up);
    viewport.removeEventListener('keydown',takeControl);
  };
}
