import { setupPublicContent } from './public-content-service.js?v=20261105-dead-water';
import { setupUISounds, playSpringSound } from './ui-sounds.js?v=20261103-boing';
import { setupModelPlayground, cleanupModelPlayground } from './model-playground.js?v=20261103-all-content-scale';
import { setupAlbum, cleanupAlbum } from './album.js?v=20261103-album-manual';
import { setupInterests, cleanupInterests } from './interests.js?v=20261103-all-content-scale';
import { playgroundPage, setupPlayground, installationPlaygroundPage } from './playground.js?v=20261103-all-content-scale';
import { aboutPage, setupAbout, cleanupAbout, canNavigateAbout } from './about.js?v=20261104-about-portrait';
import { artPage, writingPage, setupGallery, cleanupGallery, canNavigateGallery, setGalleryCategory } from './gallery.js?v=20261105-dead-water';
import { projectsPage, newsReportPage, projectDetailPage, selfPortraitPage, interestsPage, albumPage } from './design-pages.js?v=20261123-kaoru-concise';
import { portfolioWorks } from './portfolio-artworks.js?v=20261105-dead-water';
import { setupBook, cleanupBook } from './book-reader.js?v=20261103-page-sound';
import { artDetailPage, artworkImageGroup } from './art-detail.js?v=20261105-dead-water';
import { projectWorks } from './project-portfolio.js?v=20261123-kaoru-concise';

setupPublicContent();
setupUISounds();
const themeRoot = document.documentElement;
const themeToggle = document.querySelector('[data-theme-toggle]');
const themeLabel = themeToggle.querySelector('span');
const themeColor = document.querySelector('meta[name="theme-color"]');
function setTheme(dark) {
  if (dark) themeRoot.dataset.theme = 'dark';
  else delete themeRoot.dataset.theme;
  themeLabel.textContent = dark ? 'Light mode' : 'Dark mode';
  themeColor.content = getComputedStyle(themeRoot).backgroundColor;
}
setTheme(themeRoot.dataset.theme === 'dark');
themeToggle.addEventListener('click', () => {
  if (themeRoot.hasAttribute('data-theme-reveal')) return;
  const update = () => {
    const dark = themeRoot.dataset.theme !== 'dark';
    setTheme(dark);
    try { localStorage.setItem('portfolio-theme', dark ? 'dark' : 'light'); } catch {}
  };
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }
  const bounds = themeToggle.getBoundingClientRect();
  const x = bounds.left + bounds.width / 2;
  const y = bounds.top + bounds.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  themeRoot.style.setProperty('--theme-reveal-origin', `${x}px ${y}px`);
  themeRoot.style.setProperty('--theme-reveal-radius', `${Math.ceil(radius)}px`);
  themeRoot.setAttribute('data-theme-reveal', '');
  const finish = () => themeRoot.removeAttribute('data-theme-reveal');
  document.startViewTransition(update).finished.then(finish, finish);
});

const main = document.querySelector('main');
const dialog = document.querySelector('#image-dialog');
const imageNavigation = document.createElement('nav');
imageNavigation.className = 'artwork-image-navigation';
imageNavigation.setAttribute('aria-label', 'Artwork images');
imageNavigation.innerHTML = '<button type="button" data-image-step="-1" aria-label="Previous artwork image">← Previous</button><span aria-live="polite"></span><button type="button" data-image-step="1" aria-label="Next artwork image">Next →</button>';
imageNavigation.hidden = true;
dialog.append(imageNavigation);
let imageSlides = [], imageSlideIndex = 0;
let photographFullscreen = false;
function displayImageSlide() {
  dialog.querySelector('img').src = imageSlides[imageSlideIndex];
  imageNavigation.querySelector('span').textContent = `${imageSlideIndex+1} / ${imageSlides.length}`;
  imageNavigation.querySelector('[data-image-step="-1"]').disabled = imageSlideIndex === 0;
  imageNavigation.querySelector('[data-image-step="1"]').disabled = imageSlideIndex === imageSlides.length-1;
}
imageNavigation.addEventListener('click', event => {
  const button = event.target.closest('[data-image-step]');
  if (!button) return;
  imageSlideIndex = Math.max(0,Math.min(imageSlides.length-1,imageSlideIndex+Number(button.dataset.imageStep)));
  displayImageSlide();
});
const contacts = { github: 'https://github.com/ziyoutang', email: 'ziyoutang242@gmail.com', instagram: 'https://www.instagram.com/ziyou_tangtt/', linkedin: 'https://www.linkedin.com/in/ziyou-yoyo-tang/' };
const asset = name => globalThis.portfolioAsset?.(name) ?? `/assets/${name}`;

function svg(file, x, y) {
  return `<span class="svg-placement" style="left:${x / 15.12}cqw;top:${y / 15.12}cqw"><img src="${asset(file)}" alt=""></span>`;
}
function homePage() {
  return `<h1 class="sr-only">Yoyo — Ziyou Tang</h1><div class="home-scene"><svg width="0" height="0" aria-hidden="true"><defs><filter id="soft-y" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".015 .025" numOctaves="2" seed="4"><animate attributeName="baseFrequency" values=".015 .025;.025 .012;.015 .025" dur=".65s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" scale="16" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>${[[172,481],[425,336],[685,459],[975,362]].map(([x,y]) => svg('45e16.svg',x-300,y-300)).join('')}${[[221,675],[492,521],[753,657],[1032,503]].map(([x,y]) => svg('1b4f7.svg',x-10.1,y)).join('')}${[['Y',279,404],['o',554,251],['Y',809,387],['o',1096,226]].map(([letter,x,y],index) => index===0 ? `<button type="button" class="letter sling-letter" style="left:${x/15.12}cqw;top:${y/15.12}cqw" aria-label="Launch the slingshot" data-letter-sling><span class="sling-glyph">${letter}</span><svg class="sling-band" viewBox="0 0 140 180" aria-hidden="true"><path d="M18 12 Q70 22 122 12"/></svg><span class="sling-ball" aria-hidden="true"></span></button>` : index===2 ? `<button type="button" class="letter mop-letter" style="left:${x/15.12}cqw;top:${y/15.12}cqw" aria-label="Mop out the balls" data-tip="launch balls to use mop!" data-letter-mop><span class="mop-glyph">${letter}</span></button>` : `<span class="letter" aria-hidden="true" style="left:${x/15.12}cqw;top:${y/15.12}cqw">${letter}</span>`).join('')}</div><nav class="home-playground-links" aria-label="Playgrounds"><a class="playground-link" href="#/playground">p5js playground</a><a class="playground-link" href="#/installation-playground">3D Model Playground</a></nav>`;
}
globalThis.canNavigateGallery = () => canNavigateGallery() && canNavigateAbout();
let renderedHash = location.hash;
function render() {
  const switchingCamsPreview = [...main.querySelectorAll('.project-subnav[aria-label="CAMS"] a')]
    .some(link => link.hash === location.hash);
  if (dialog.open) dialog.close();
  cleanupModelPlayground();
  cleanupAlbum();
  cleanupInterests();
  cleanupBook();
  cleanupGallery();
  cleanupAbout();
  renderedHash = location.hash;
  let route = location.hash.replace('#/', '') || 'home';
  const graphicWork = route.startsWith('project/') && projectWorks.find(work => work.slug === route.split('/')[1] && work.category === 'Graphic Works');
  if (graphicWork) {
    route = graphicWork.slug === 'poem-collection' ? 'writing' : 'projects/' + graphicWork.slug;
    history.replaceState(null, '', '#/' + route);
    renderedHash = location.hash;
  }
  const pages = { 'installation-playground': installationPlaygroundPage, album: albumPage, interests: interestsPage, playground: () => playgroundPage(route.split('/')[1]), home: homePage, art: artPage, writing: writingPage, projects: projectsPage, about: aboutPage, 'art/news-report': newsReportPage, 'art-detail': () => artDetailPage(route.split('/')[1]), 'project-detail': () => projectDetailPage(route.split('/')[1]), 'self-portrait': selfPortraitPage, 'self-portrait/art': () => selfPortraitPage('#/art/self-portrait') };
  const current = route.startsWith('playground/') ? 'playground' : route.startsWith('projects/') ? 'projects' : route.startsWith('project/') ? 'project-detail' : pages[route] ? route : route.startsWith('art/') ? 'art-detail' : 'home';
  const selfPortrait = current === 'self-portrait' || current === 'self-portrait/art';
  if (current === 'art-detail' || current === 'art/news-report') setGalleryCategory(portfolioWorks.find(work => work.slug === route.split('/')[1])?.category);
  document.body.classList.toggle('project-scroll', ['project-detail', 'art-detail', 'art/news-report'].includes(current));
  document.body.classList.toggle('playground-immersive', ['playground','installation-playground'].includes(current));
  document.body.classList.toggle('self-portrait-immersive', selfPortrait);
  document.body.dataset.playgroundTheme=current==='playground'?(route.split('/')[1]||'wireframe'):current==='installation-playground'?'exhibition':'';
  main.classList.toggle('home-page', current === 'home');
  main.innerHTML = `<div class="page-content${switchingCamsPreview ? ' instant-page' : ''}">${pages[current]()}</div>`;
  document.querySelector('.site-shell').style.setProperty('--canvas-height', '982px');
  document.querySelector('.site-header').hidden = selfPortrait;
  fitPage();
  document.title = `${selfPortrait ? 'Multi-media self-portrait' : current === 'home' ? 'Yoyo' : current[0].toUpperCase()+current.slice(1)} — Ziyou Tang`;
  document.querySelectorAll('.site-header nav a').forEach(a => {
    const section = ['interests','album'].includes(current) ? 'about' : current.startsWith('project') ? 'projects' : current.startsWith('art') ? 'art' : current.split('/')[0];
    const selected = a.hash === (current === 'home' ? '#/' : '#/'+section);
    if (selected) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const footer = document.querySelector('.socials');
  footer.classList.toggle('about-socials', current === 'about');
  footer.hidden = !['home','about'].includes(current);
  footer.style.display = footer.hidden ? 'none' : '';
  footer.innerHTML = [['github','github.svg','GitHub'],['email','6048b.svg','Email'],['instagram','e1b6f.svg','Instagram'],['linkedin','figma-1311-3-imgAkarIconsLinkedinBoxFill.svg','LinkedIn']].map(([key,file,label]) => `<a target="_blank" rel="noopener noreferrer" href="${key === 'email' ? 'mailto:' : ''}${contacts[key]}" aria-label="${label}"><img src="${asset(file)}" alt=""></a>`).join('');
  setupGallery();
  setupAbout();
  setupBook();
  setupPlayground();
  setupModelPlayground();
  setupInterests();
  setupAlbum();
  window.scrollTo(0, 0);
  if (selfPortrait) main.querySelector('.self-portrait-live').focus({ preventScroll: true });
}
function fitPage() {
  const shell = document.querySelector('.site-shell');
  if (document.body.matches('.playground-immersive, .self-portrait-immersive')) {
    shell.style.setProperty('--viewport-scale',1); shell.style.setProperty('--page-inset','0px'); return;
  }
  const width=document.documentElement.clientWidth;
  const scale = document.body.classList.contains('project-scroll') ? width/1512 : Math.min(width/1512,window.innerHeight/982);
  shell.style.setProperty('--viewport-width', `${width / scale}px`);
  shell.style.setProperty('--viewport-scale', scale);
  shell.style.setProperty('--viewport-height', `${window.innerHeight / scale}px`);
  shell.style.setProperty('--page-inset', '0px');
}
document.documentElement.style.setProperty('--svg-scale', 1);
window.addEventListener('resize', fitPage);
window.visualViewport?.addEventListener('resize', fitPage);
function updateMop() {
  const mop=document.querySelector('[data-letter-mop]');if(!mop)return;
  const empty=!document.querySelector('.launched-ball');
  mop.dataset.tip=empty?'launch balls to use mop!':'mop out the balls';
  if(empty){mop.dataset.x='0';mop.dataset.y='0';mop.style.translate='0px 0px';}
}
document.addEventListener('pointerover',event=>{if(event.target.closest('[data-letter-mop]'))updateMop();});
async function flyMop(mop) {
  if(mop.dataset.flying||!document.querySelector('.launched-ball'))return;
  mop.dataset.flying='true';
  const scene=mop.closest('.home-scene'),bounds=scene.getBoundingClientRect(),origin=mop.getBoundingClientRect(),scale=scene.clientWidth/bounds.width;
  const start={x:(origin.left+origin.width*.4-bounds.left)*scale,y:(origin.top+origin.height*.55-bounds.top)*scale};
  const balls=[...scene.querySelectorAll('.launched-ball')];
  const points=[{x:120,y:300},{x:1320,y:300},{x:1320,y:720},{x:140,y:720},...balls.map(ball=>{const r=ball.getBoundingClientRect();return {x:(r.left+r.width/2-bounds.left)*scale,y:(r.top+r.height/2-bounds.top)*scale,ball};}),start];
  const frame={left:(innerWidth*.063-bounds.left)*scale+100,right:(innerWidth*.915-bounds.left)*scale-100,top:(innerHeight*.236-bounds.top)*scale+110,bottom:(innerHeight*.761-bounds.top)*scale-110};
  points.forEach(point=>{if(point!==start){point.x=Math.max(frame.left,Math.min(frame.right,point.x));point.y=Math.max(frame.top,Math.min(frame.bottom,point.y));}});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flex=mop.querySelector('.mop-glyph').animate([{transform:'rotate(-25deg) scale(1.1,.85) skewX(-12deg)'},{transform:'rotate(20deg) scale(.85,1.15) skewX(14deg)'},{transform:'rotate(-25deg) scale(1.1,.85) skewX(-12deg)'}],{duration:650,iterations:Infinity});
  let previous={x:0,y:0};
  for(const point of points){
    if(!mop.isConnected){flex.cancel();return;}
    const next={x:point.x-start.x,y:point.y-start.y};
    const angle=Math.atan2(next.y-previous.y,next.x-previous.x)*180/Math.PI;
    mop.style.setProperty('--flight-angle',`${angle}deg`);
    await mop.animate([{translate:`${previous.x}px ${previous.y}px`},{translate:`${next.x}px ${next.y}px`}],{duration:reduced?40:(point===start?850:400),easing:'ease-in-out',fill:'forwards'}).finished;
    previous=next;
    if(point.ball?.isConnected){const ball=point.ball;ball.dataset.cleaning='true';ball.animate([{opacity:1},{opacity:0}],{duration:600,fill:'forwards'}).onfinish=()=>{ball.remove();updateMop();};}
  }
  flex.cancel();mop.getAnimations().forEach(animation=>animation.cancel());mop.style.translate='0px 0px';delete mop.dataset.flying;updateMop();
}
document.addEventListener('click', event => {
  const mop=event.target.closest('[data-letter-mop]');if(mop){flyMop(mop);return;}
  const sling=event.target.closest('[data-letter-sling]');
  if(sling) {
    if(sling.dataset.launching)return;
    sling.dataset.launching='true';
    const ball=sling.querySelector('.sling-ball'),band=sling.querySelector('path');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const started=performance.now();
    const duration=reduced?200:1500;
    const launch=time=>{
      if(!sling.isConnected)return;
      const elapsed=(time-started)/duration;
      if(elapsed>=1){delete sling.dataset.launching;ball.style.opacity='0';band.setAttribute('d','M18 12 Q70 22 122 12');return;}
      if(reduced){ball.style.opacity=String(1-elapsed);requestAnimationFrame(launch);return;}
      const stretch=Math.min(elapsed/.42,1);
      const release=Math.max(0,(elapsed-.42)/.58);
      const pull=release?Math.sin(release*35)*12*Math.exp(-release*6):80*stretch*stretch;
      band.setAttribute('d',`M18 12 Q70 ${22+pull*2} 122 12`);
      ball.style.opacity=release?'0':'1';
      ball.style.transform=`translate(-50%,${release?80-release*650:80*stretch*stretch}px) scale(${release?1-release*.4:1})`;
      if(elapsed>=.42&&!sling.dataset.released){
        sling.dataset.released='true';playSpringSound();
        const scene=sling.closest('.home-scene'),bounds=scene.getBoundingClientRect(),origin=ball.getBoundingClientRect();
        const scale=scene.clientWidth/bounds.width;
        const launched=ball.cloneNode();launched.className='launched-ball';launched.removeAttribute('style');
        const x=(origin.left+origin.width/2-bounds.left)*scale,y=(origin.top-bounds.top)*scale;
        launched.style.left=`${x}px`;launched.style.top=`${y}px`;scene.append(launched);updateMop();
        let landingX=120+Math.random()*1100,landingY=700+Math.random()*130;
        const links=scene.parentElement.querySelector('.home-playground-links').getBoundingClientRect();
        const safe={left:(links.left-bounds.left)*scale-30,right:(links.right-bounds.left)*scale+30,top:(links.top-bounds.top)*scale-35,bottom:(links.bottom-bounds.top)*scale+45};
        landingY=Math.min(landingY,(innerHeight*.761-bounds.top)*scale-35);
        if(landingX>safe.left&&landingX<safe.right&&landingY>safe.top&&landingY<safe.bottom)landingY=safe.top-25;
        launched.animate([{transform:'translate(-50%,0)'},{transform:`translate(${(landingX-x)*.5}px,-360px)`,offset:.4},{transform:`translate(${landingX-x}px,${landingY-y}px)`}],{duration:1800,easing:'cubic-bezier(.3,.1,.7,1)',fill:'forwards'});
      }
      requestAnimationFrame(launch);
    };
    delete sling.dataset.released;requestAnimationFrame(launch);
    return;
  }
  const photograph = event.target.closest('[data-photo-fullscreen]');
  if (photograph) {
    dialog.classList.add('photo-fullscreen-dialog');
    imageSlides = [photograph.dataset.photoSrc]; imageSlideIndex = 0; imageNavigation.hidden = true;
    displayImageSlide();
    dialog.querySelector('img').alt = photograph.dataset.photoTitle;
    dialog.querySelector('p').textContent = photograph.dataset.photoTitle;
    const groupWork = portfolioWorks.find(work => work.slug === photograph.dataset.imageGroup);
    if (groupWork) {
      dialog.querySelector('img').hidden = true;
      dialog.insertAdjacentHTML('beforeend', artworkImageGroup(groupWork));
    }
    dialog.showModal();
    dialog.requestFullscreen?.().catch(() => {});
    return;
  }
  const scroll = event.target.closest('[data-scroll]');
  if (scroll) { document.getElementById(scroll.dataset.scroll)?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); return; }
  const detail = event.target.closest('[data-detail]');
  if (detail) { location.hash = detail.dataset.detail; return; }
  const target = event.target.closest('[data-zoom]');
  if (!target) return;
  const img = target.querySelector('img');
  const work = portfolioWorks.find(work => work.id === target.dataset.item);
  imageSlides = [target.dataset.zoom || img.src, ...(work?.documentation || []).map(asset)];
  imageSlideIndex = 0;
  imageNavigation.hidden = imageSlides.length < 2;
  displayImageSlide();
  dialog.querySelector('img').alt = target.dataset.caption || img.alt;
  dialog.querySelector('p').textContent = target.dataset.caption || img.alt;
  const urls = [...new Set((target.dataset.caption || '').match(/https?:\/\/[^\s]+/g) || [])];
  for (const url of urls) {
    const link = document.createElement('a');
    link.href = url; link.textContent = url.includes('youtu') ? 'Watch video ↗' : 'Open interactive artwork ↗';
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    dialog.querySelector('p').append(document.createElement('br'),link);
  }
  dialog.showModal();
});
dialog.querySelector('button').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  photographFullscreen = false;
  dialog.querySelector('img').hidden = false;
  dialog.querySelector('.artwork-image-group')?.remove();
  if (document.fullscreenElement === dialog) document.exitFullscreen().catch(() => {});
  dialog.classList.remove('photo-fullscreen-dialog');
});
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement === dialog) photographFullscreen = true;
  else if (photographFullscreen) { photographFullscreen = false; dialog.close(); }
});
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); });
document.querySelector('.site-header a[href="#/writing"]').addEventListener('click', event => {
  if (location.hash !== '#/writing') return;
  event.preventDefault(); render(); main.focus({preventScroll:true});
});
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
window.addEventListener('hashchange', () => {
  if (location.hash === renderedHash) return;
  if (!globalThis.canNavigateGallery()) { history.replaceState(null, '', renderedHash || '#/'); return; }
  render();
  if (!document.body.classList.contains('self-portrait-immersive')) main.focus({ preventScroll: true });
});
render();
