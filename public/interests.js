import { restaurants, books, movies } from './interests-data.js?v=20261103-movies';
import * as THREE from './vendor/three.js';

let disposeScene;
export function cleanupInterests() { disposeScene?.(); disposeScene = null; }
export function setupInterests() {
  const host = document.querySelector('[data-yoyo-scene]');
  if (!host) return;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.setClearColor(0xffffff, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(35/2))*host.clientHeight/700)), host.clientWidth / host.clientHeight, .1, 100);
  camera.position.set(0, 0, 8.8);
  const room = new THREE.RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const yoyo = new THREE.Group();
  yoyo.rotation.set(.3, -.65, -.22);
  scene.add(yoyo);
  const silver = new THREE.MeshStandardMaterial({ color: 0xc8cdd4, metalness: 1, roughness: .19 });
  // A continuous turned profile gives each half a rolled rim and recessed face.
  const profile = [[.02,.24],[.3,.24],[.45,.28],[.72,.34],[1.05,.4],[1.3,.47],[1.43,.58],[1.47,.72],[1.43,.85],[1.32,.91],[1.18,.88],[1.08,.78],[1,.65],[.86,.58],[.69,.6],[.58,.69],[.48,.77],[.3,.8],[.02,.8]];
  const curve = new THREE.SplineCurve(profile.map(([r,z]) => new THREE.Vector2(r,z)));
  const geometry = new THREE.LatheGeometry(curve.getPoints(100), 128);
  for (const sign of [-1,1]) {
    const half = new THREE.Mesh(geometry, silver);
    half.rotation.x = sign * Math.PI / 2;
    yoyo.add(half);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.55,48), new THREE.MeshStandardMaterial({color:0x777e89,metalness:.8,roughness:.35}));
  axle.rotation.x = Math.PI / 2;
  yoyo.add(axle);
  const cordMaterial = new THREE.MeshStandardMaterial({color:0xa7a9b0,roughness:.85});
  for (let i=0; i<9; i++) {
    const cord = new THREE.Mesh(new THREE.TorusGeometry(.4 + i * .018,.027,8,96),cordMaterial);
    cord.position.z = -.2 + i * .05;
    yoyo.add(cord);
  }
  const label = document.createElement('canvas');
  label.width = label.height = 256;
  const ctx = label.getContext('2d');
  ctx.fillStyle = '#bcc3cc'; ctx.fillRect(0,0,256,256);
  ctx.fillStyle = '#354457'; ctx.font = 'italic 58px Georgia'; ctx.textAlign = 'center';
  ctx.fillText('Yo',128,117); ctx.fillText('Yo',128,173);
  const texture = new THREE.CanvasTexture(label);
  texture.colorSpace = THREE.SRGBColorSpace;
  const badgeMaterial = new THREE.MeshStandardMaterial({map:texture,metalness:.65,roughness:.3});
  for (const sign of [-1,1]) {
    const badge = new THREE.Mesh(new THREE.CircleGeometry(.28,64),badgeMaterial);
    badge.position.z = sign * .807;
    if (sign < 0) badge.rotation.y = Math.PI;
    yoyo.add(badge);
  }
  const light = new THREE.DirectionalLight(0xffffff,3);
  light.position.set(-3,5,4);
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xcbdfff,2);
  rim.position.set(4,2,-3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffe2bf,.7);
  fill.position.set(-4,-1,2); scene.add(fill);
  const pull = document.querySelector('[data-yoyo-pull]');
  const handle = document.querySelector('[data-yoyo-handle]');
  const panel = document.querySelector('[data-interest-panel]');
  const reset = document.querySelector('[data-interest-reset]');
  host.append(handle);
  pull.remove();
  const stringMaterial = new THREE.MeshStandardMaterial({color:0x626975,roughness:.55,metalness:.25});
  const looseString = new THREE.Mesh(new THREE.BufferGeometry(), stringMaterial);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(.12,.035,12,48),stringMaterial);
  const glowMaterial = new THREE.MeshBasicMaterial({color:0xffa844,transparent:true,opacity:0,depthWrite:false});
  const stringGlow = new THREE.Mesh(new THREE.BufferGeometry(),glowMaterial);
  const loopGlow = new THREE.Mesh(new THREE.TorusGeometry(.12,.1,12,48),glowMaterial);
  const stringAssembly = new THREE.Group();
  stringAssembly.add(looseString,loop,stringGlow,loopGlow);
  scene.add(stringAssembly);
  let stringHover = false;
  const endpoint = new THREE.Vector3();
  const updateString = (amount, retract = 0) => {
    const endX = 1.65 + amount * .0025;
    const endY = -1.65 - amount * .003;
    const anchor = new THREE.Vector3(.33,-.38,0);
    const points = [
      new THREE.Vector3(.33,-.38,0),
      new THREE.Vector3(.75,-.8,0),
      new THREE.Vector3(endX-.1,endY*.65,0),
      new THREE.Vector3(endX,endY,0)
    ];
    points.forEach(point=>point.lerp(anchor,retract));
    const path = new THREE.CatmullRomCurve3(points);
    looseString.geometry.dispose();
    looseString.geometry = new THREE.TubeGeometry(path,48,stringHover ? .05 : .035,10,false);
    stringGlow.geometry.dispose();
    stringGlow.geometry = new THREE.TubeGeometry(path,48,.1,10,false);
    loop.scale.setScalar(stringHover ? 1.3 : 1);
    glowMaterial.opacity = stringHover ? .16 : 0;
    loop.position.set(endX+.025,endY-.12,0).lerp(anchor,retract);
    loop.scale.multiplyScalar(1-retract);
    loopGlow.scale.setScalar(1-retract);
    loopGlow.position.copy(loop.position);
    endpoint.copy(loop.position);
  };
  updateString(0);
  const copy = document.querySelector('[data-interest-copy]');
  const showList = category => {
    copy.replaceChildren();
    if (category === 2 || category === 3) {
      const list = document.createElement('ol');
      for (const book of category === 3 ? movies : books) {
        const item = document.createElement('li');
        const title = document.createElement('strong'); title.textContent = book.title;
        const author = document.createElement('small'); author.textContent = book.author || book.director;
        item.append(title,author); list.append(item);
      }
      copy.append(list);
      return;
    }
    const profile = document.createElement('a');
    profile.href = 'https://beliapp.co/app/ziyou243'; profile.target = '_blank'; profile.rel = 'noopener noreferrer';
    profile.textContent = 'Find me on Beli ↗'; copy.append(profile);
    const list = document.createElement('ol');
    for (const restaurant of restaurants) {
      const item = document.createElement('li');
      const name = document.createElement(restaurant.url ? 'a' : 'strong');
      name.textContent = restaurant.name + (restaurant.url ? ' ↗' : '');
      if (restaurant.url) { name.href = restaurant.url; name.target = '_blank'; name.rel = 'noopener noreferrer'; }
      const type = document.createElement('small'); type.textContent = restaurant.type;
      item.append(name,type); list.append(item);
    }
    copy.append(list);
  };
  const hoverString = () => { stringHover = true; updateString(distance); };
  const leaveString = () => { if (!pulling) { stringHover = false; updateString(distance); } };
  handle.addEventListener('pointerenter',hoverString);
  handle.addEventListener('pointerleave',leaveString);
  let pulling = false, pullStart = 0, pullOrigin = 0, distance = 0, selection = 0, rewindTime = null, rewindAngle = 0;
  const setPull = value => {
    distance = THREE.MathUtils.clamp(value, 0, 260);
    document.querySelector('.yoyo-hint').hidden=distance>0;
    updateString(distance);
    const previousSelection = selection;
    selection = distance >= 155 ? 3 : distance >= 95 ? 2 : distance >= 35 ? 1 : 0;
    panel.hidden = !selection;
    document.querySelector('[data-food-photos]').hidden = selection !== 1;
    document.querySelector('[data-book-covers]').hidden = selection !== 2;
    document.querySelector('[data-movie-posters]').hidden = selection !== 3;
    document.querySelector('[data-interest-heading]').textContent = selection === 3 ? "Yoyo’s top 5 movies" : selection === 2 ? "Yoyo’s top 5 books on StoryGraph" : "Yoyo’s top 10 Beli restaurants";
    if (selection && selection !== previousSelection) showList(selection);
    handle.setAttribute('aria-label', selection === 3 ? 'Movies selected. Pull to the end to drop and rewind.' : selection === 2 ? 'Books selected. Pull farther for movies.' : selection === 1 ? 'Restaurants selected. Pull farther for books.' : 'Pull string to explore interests. Use Down arrow for restaurants, books, then movies.');
  };
  const pullDown = event => {
    if (rewindTime !== null) return;
    event.stopPropagation();
    stringHover = true; updateString(distance);
    pulling = true; pullStart = event.clientX + event.clientY; pullOrigin = distance;
    handle.setPointerCapture(event.pointerId);
  };
  const pullMove = event => {
    if (!pulling) return;
    const scale = host.getBoundingClientRect().width / host.clientWidth;
    setPull(pullOrigin + (event.clientX+event.clientY-pullStart)/(scale*1.414));
  };
  let windingAudio;
  const playWinding = () => {
    try {
      windingAudio ||= new (window.AudioContext || window.webkitAudioContext)();
      windingAudio.resume().catch(()=>{});
      const now=windingAudio.currentTime;
      const buffer=windingAudio.createBuffer(1,windingAudio.sampleRate*2,windingAudio.sampleRate);
      const samples=buffer.getChannelData(0);
      for(let index=0;index<samples.length;index++)samples[index]=(Math.random()*2-1)*(.6+.4*Math.sin(index/windingAudio.sampleRate*90));
      const source=windingAudio.createBufferSource();source.buffer=buffer;
      const filter=windingAudio.createBiquadFilter();filter.type='bandpass';filter.Q.value=1.5;
      filter.frequency.setValueAtTime(450,now);filter.frequency.exponentialRampToValueAtTime(1800,now+.8);filter.frequency.exponentialRampToValueAtTime(180,now+2);
      const gain=windingAudio.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.07,now+.15);gain.gain.exponentialRampToValueAtTime(.035,now+1.3);gain.gain.exponentialRampToValueAtTime(.0001,now+2);
      source.connect(filter).connect(gain).connect(windingAudio.destination);source.start();source.stop(now+2);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    } catch { /* Animation remains available when audio is unavailable. */ }
  };
  const beginRewind = () => {
    pulling=false; stringHover=false;
    if(reducedMotion.matches) {setPull(0);return;}
    playWinding();
    rewindTime=0;rewindAngle=yoyo.rotation.z;handle.disabled=true;
    document.querySelector('.yoyo-hint').hidden=true;
  };
  const pullUp = () => { pulling = false; if(distance>=235)beginRewind();else setPull(selection===3?185:selection===2?115:selection===1?55:0); };
  const pullKey = event => {
    if (!['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault();
    if(rewindTime!==null)return;
    if(selection===3&&(event.key==='ArrowDown'||event.key==='ArrowRight')){beginRewind();return;}
    setPull(event.key === 'Home' ? 0 : event.key === 'End' ? 185 : (event.key === 'ArrowDown' || event.key === 'ArrowRight') ? (selection===2?185:selection===1?115:55) : (selection===3?115:selection===2?55:0));
  };
  const rewind = () => setPull(0);
  handle.addEventListener('pointerdown',pullDown); handle.addEventListener('pointermove',pullMove);
  handle.addEventListener('pointerup',pullUp); handle.addEventListener('pointercancel',pullUp);
  handle.addEventListener('keydown',pullKey); reset.addEventListener('click',rewind);
  let dragging = false, x = 0, y = 0;
  const down = event => { if (event.target.closest('[data-yoyo-handle]')) return; dragging = true; x=event.clientX; y=event.clientY; host.setPointerCapture(event.pointerId); host.classList.add('is-dragging'); };
  const move = event => {
    if (!dragging) return;
    yoyo.rotation.y += (event.clientX-x)*.009;
    yoyo.rotation.x += (event.clientY-y)*.009;
    x=event.clientX; y=event.clientY;
  };
  const up = () => { dragging=false; host.classList.remove('is-dragging'); };
  const key = event => {
    if (event.target === handle) return;
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    yoyo.rotation[event.key==='ArrowLeft'||event.key==='ArrowRight'?'y':'x'] += event.key==='ArrowLeft'||event.key==='ArrowUp'?-.15:.15;
  };
  host.addEventListener('pointerdown',down); host.addEventListener('pointermove',move);
  host.addEventListener('pointerup',up); host.addEventListener('pointercancel',up); host.addEventListener('keydown',key);
  let previousTime = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  renderer.setAnimationLoop(time => {
    const delta = previousTime ? Math.min((time-previousTime)/1000,.05) : 0;
    previousTime = time;
    if(rewindTime!==null) {
      rewindTime+=delta;
      const drop=Math.min(rewindTime/.5,1);
      const reel=THREE.MathUtils.smoothstep(rewindTime,.4,1.8);
      const contentOpacity=1-THREE.MathUtils.smoothstep(rewindTime,.1,2.2);
      document.querySelectorAll('[data-interest-panel],[data-food-photos],[data-book-covers],[data-movie-posters]').forEach(element=>element.style.opacity=contentOpacity);
      const rise=THREE.MathUtils.smoothstep(rewindTime,1.8,2.7);
      yoyo.position.y=-.8*drop*drop*(1-rise);
      yoyo.rotation.z=rewindAngle + reel*Math.PI*6;
      updateString(260*(1-reel),Math.min(reel,.995));
      if(rewindTime>=2.7){rewindTime=null;yoyo.position.y=0;yoyo.rotation.z=rewindAngle;handle.disabled=false;setPull(0);document.querySelectorAll('[data-interest-panel],[data-food-photos],[data-book-covers],[data-movie-posters]').forEach(element=>element.style.opacity='');document.querySelector('.yoyo-hint').textContent='pull string slowly to explore many interests!';}
    }
    if (rewindTime===null && !dragging && !reducedMotion.matches) yoyo.rotation.y += delta * .18;
    yoyo.updateMatrixWorld();
    stringAssembly.position.copy(yoyo.position);
    stringAssembly.quaternion.copy(yoyo.quaternion);
    stringAssembly.updateMatrixWorld();
    const screen = stringAssembly.localToWorld(endpoint.clone()).project(camera);
    const start = stringAssembly.localToWorld(new THREE.Vector3(.33,-.38,0)).project(camera);
    const startX = (start.x*.5+.5)*host.clientWidth, startY = (-start.y*.5+.5)*host.clientHeight;
    const endX = (screen.x*.5+.5)*host.clientWidth, endY = (-screen.y*.5+.5)*host.clientHeight;
    handle.style.left = `${startX}px`;
    handle.style.top = `${startY}px`;
    handle.style.height = `${Math.hypot(endX-startX,endY-startY)+32}px`;
    handle.style.transform = `translate(-50%,-16px) rotate(${Math.atan2(-(endX-startX),endY-startY)}rad)`;
    renderer.render(scene,camera);
  });
  disposeScene = () => {
    windingAudio?.close().catch(()=>{});
    renderer.setAnimationLoop(null);
    handle.removeEventListener('pointerenter',hoverString); handle.removeEventListener('pointerleave',leaveString);
    handle.removeEventListener('pointerdown',pullDown); handle.removeEventListener('pointermove',pullMove);
    handle.removeEventListener('pointerup',pullUp); handle.removeEventListener('pointercancel',pullUp);
    handle.removeEventListener('keydown',pullKey); reset.removeEventListener('click',rewind);
    host.removeEventListener('pointerdown',down); host.removeEventListener('pointermove',move);
    host.removeEventListener('pointerup',up); host.removeEventListener('pointercancel',up); host.removeEventListener('keydown',key);
    const geometries = new Set(), materials = new Set();
    scene.traverse(object => { if(object.geometry) geometries.add(object.geometry); if(object.material) materials.add(object.material); });
    geometries.forEach(item=>item.dispose()); materials.forEach(item=>item.dispose());
    texture.dispose(); environment.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}
