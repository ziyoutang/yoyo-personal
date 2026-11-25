import * as THREE from './vendor/three.js?v=20261103-compressed-models';
let disposeModel;
export function cleanupModelPlayground() { disposeModel?.(); disposeModel = null; }
export async function setupModelPlayground() {
  const host = document.querySelector('[data-model-exhibit]');
  if (!host) return;
  const status = document.querySelector('[data-model-status]');
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2.5));
  renderer.setSize(host.clientWidth,host.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  const resize = new ResizeObserver(() => {
    renderer.setSize(host.clientWidth,host.clientHeight);
    camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();
  });
  const scene = new THREE.Scene();
  const bubbleScene=new THREE.Scene();
  const occlusionScene=new THREE.Scene();
  const occlusionMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
  occlusionScene.overrideMaterial=occlusionMaterial;
  scene.background = new THREE.Color(0x34313a);
  scene.fog = new THREE.Fog(0x34313a,18,65);
  const camera = new THREE.PerspectiveCamera(40,host.clientWidth/host.clientHeight,.05,100);
  const overview = new THREE.Vector3(3,4,12);
  camera.position.copy(overview);
  resize.observe(host);
  const controls = new THREE.OrbitControls(camera,renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = true;
  controls.minDistance = 10; controls.maxDistance = 22;
  controls.maxPolarAngle = Math.PI*.48;
  controls.target.set(0,1,0);
  const room = new THREE.RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room,.05);
  room.dispose(); pmrem.dispose(); scene.environment=environment.texture; scene.environmentIntensity=.4;
  bubbleScene.environment=environment.texture;
  const key = new THREE.DirectionalLight(0xffdfb5,3.5); key.position.set(-8,14,8);
  key.castShadow=false; key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-18,right:18,top:14,bottom:-14,near:.5,far:50});
  key.shadow.normalBias=.025;key.shadow.bias=-.0001;key.shadow.radius=4;scene.add(key);
  const fill = new THREE.DirectionalLight(0xaacbff,2.8); fill.position.set(6,7,-10); scene.add(fill);
  const materials = new Set(), geometries = new Set(), textures = new Set();
  const floorMaterial = new THREE.MeshStandardMaterial({color:0x45404a,roughness:.4,metalness:.18}); materials.add(floorMaterial);
  const floorGeometry = new THREE.PlaneGeometry(160,160); geometries.add(floorGeometry);
  const floor = new THREE.Mesh(floorGeometry,floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xdce9ff,0x4b3542,.65));
  const exhibits = [
    {id:16,x:0,z:0,color:0x392921}, {id:13,x:0,z:0,color:0x45402c,view:[1,.45,.08],framing:.4}, {id:15,x:0,z:0,color:0x243b2b,view:[0,.13,1],framing:.48}, {id:2,file:'nomad-model-2.glb',x:0,z:0,color:0x424852}, {id:1,file:'nomad-yy.glb',x:0,z:0,color:0x42312b}, {id:6,file:'nomad-installation-6.glb',x:0,z:0,color:0x35404c}, {id:11,x:0,z:0,color:0x443847}, {id:8,file:'nomad-hi-1.glb',x:0,z:0,color:0x65472e,view:[0,.12,1]}, {id:9,file:'nomad-installation-9.glb',x:0,z:0,color:0x423849,view:[1,.2,0],framing:.35}
  ];
  const bubbleGeometry=new THREE.SphereGeometry(.85,32,24);geometries.add(bubbleGeometry);
  const bubbleGlass=new THREE.MeshPhysicalMaterial({color:0xdde9ff,metalness:.35,roughness:.08,transparent:true,opacity:.18,clearcoat:1,depthWrite:false,depthTest:true});materials.add(bubbleGlass);
  const ringGeometry=new THREE.TorusGeometry(.85,.012,8,64);geometries.add(ringGeometry);
  const ringMaterial=new THREE.MeshBasicMaterial({color:0xd6e7ff,transparent:true,opacity:.5,depthWrite:false,depthTest:true});materials.add(ringMaterial);
  const navigation=document.createElement('div');navigation.className='model-bubbles';navigation.setAttribute('aria-label','Explore sculptures');host.append(navigation);
  for(const [index,exhibit] of exhibits.entries()) {
    const button=document.createElement('button');button.type='button';button.className='model-bubble-control';button.dataset.exhibitFocus=exhibit.id;button.setAttribute('aria-label',`Explore sculpture ${index+1}`);button.disabled=true;navigation.append(button);exhibit.button=button;
  }
  for (const exhibit of exhibits) {
    const spot=new THREE.SpotLight(0xffe9d0,240,32,.75,1,2);
    spot.position.set(exhibit.x-3,9,exhibit.z+4);spot.target.position.set(exhibit.x,0,exhibit.z);
    spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.normalBias=.015;spot.shadow.radius=5;
    scene.add(spot,spot.target);exhibit.light=spot;
  }
  const controller = new AbortController();
  let flight = null, disposed = false, journey = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const focus = id => {
    const exhibit = exhibits.find(item=>item.id===id) || exhibits[0];
    journey=exhibits.indexOf(exhibit);
    exhibits.forEach((item,index)=>{if(item.display)item.display.visible=index===journey;});
    const target = new THREE.Vector3(0,exhibit.height?exhibit.height/2:1.8,exhibit.id===9?-.35:0);
    const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    const fitDistance=(exhibit.framing?Math.max(6,(exhibit.height||3)/(2*tangent*exhibit.framing),(exhibit.width||4)/(2*tangent*camera.aspect*(exhibit.id===9?.54:.64))):Math.max(10,(exhibit.height||3)/(2*tangent*.56)))/.846;
    controls.minDistance=fitDistance;
    const position = target.clone().add(new THREE.Vector3(...(exhibit.view||[.18,.1,1])).normalize().multiplyScalar(fitDistance));
    flight = {target,position};
    if(reducedMotion) {camera.position.copy(position);controls.target.copy(target);flight=null;}
    document.querySelectorAll('[data-exhibit-focus]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.exhibitFocus)===id)));
  };
  const navigate = event => {
    const button=event.target.closest('[data-exhibit-focus]');
    if(!button)return;
    if(event.detail && exhibits[journey]?.model) {
      const rect=host.getBoundingClientRect();const ray=new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
      if(ray.intersectObject(exhibits[journey].model,true).length)return;
    }
    focus(Number(button.dataset.exhibitFocus));
  };
  navigation.addEventListener('click',navigate);
  const reset = document.querySelector('[data-model-reset]');
  const resetView = () => focus(exhibits[0].id);reset.addEventListener('click',resetView);
  const stopFlight = () => {flight=null;};controls.addEventListener('start',stopFlight);
  const journeyKey=event=>{
    if(!['ArrowRight','ArrowLeft'].includes(event.key))return;
    event.preventDefault();const index=(journey+(event.key==='ArrowRight'?1:-1)+exhibits.length)%exhibits.length;
    if(exhibits[index].model)focus(exhibits[index].id);
  };
  host.tabIndex=0;host.addEventListener('keydown',journeyKey);
  const makePreview=exhibit=>{
    const previewScene=new THREE.Scene();previewScene.environment=environment.texture;previewScene.environmentIntensity=.7;
    const clone=exhibit.display.clone(true);clone.visible=true;previewScene.add(clone);
    previewScene.add(new THREE.HemisphereLight(0xffffff,0x777788,2));
    const light=new THREE.DirectionalLight(0xffe8d2,3);light.position.set(-3,6,5);previewScene.add(light);
    const previewCamera=new THREE.PerspectiveCamera(42,1,.1,30);previewCamera.position.set(5,3.8,9);previewCamera.lookAt(0,1.5,0);
    const target=new THREE.WebGLRenderTarget(512,512);exhibit.previewTarget=target;
    const oldColor=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();
    renderer.setClearColor(0x000000,0);renderer.setRenderTarget(target);renderer.render(previewScene,previewCamera);renderer.setRenderTarget(null);renderer.setClearColor(oldColor,oldAlpha);
    const group=new THREE.Group();
    const spriteMaterial=new THREE.SpriteMaterial({map:target.texture,transparent:true,depthWrite:false,depthTest:true});materials.add(spriteMaterial);
    const sprite=new THREE.Sprite(spriteMaterial);sprite.scale.set(1.35,1.35,1);group.add(sprite);
    group.add(new THREE.Mesh(bubbleGeometry,bubbleGlass));
    const ring=new THREE.Mesh(ringGeometry,ringMaterial);group.add(ring);exhibit.ring=ring;
    group.traverse(object=>{object.renderOrder=20;});bubbleScene.add(group);exhibit.bubble=group;
  };
  let previous=0;
  renderer.setAnimationLoop(time=>{
    const delta=previous?Math.min((time-previous)/1000,.05):0;previous=time;
    if(flight){const alpha=1-Math.exp(-delta*4);camera.position.lerp(flight.position,alpha);controls.target.lerp(flight.target,alpha);if(camera.position.distanceTo(flight.position)<.01)flight=null;}
    const colorIndex=Math.floor(journey),colorNext=Math.min(colorIndex+1,exhibits.length-1);
    const mood=new THREE.Color(exhibits[colorIndex].color).lerp(new THREE.Color(exhibits[colorNext].color),journey-colorIndex);
    scene.background.lerp(mood,1-Math.exp(-delta*3));scene.fog.color.copy(scene.background);
    floorMaterial.color.copy(scene.background).multiplyScalar(1.3);
    let slot=0;
    exhibits.forEach((item,index)=>{
      item.light.visible=index===journey;
      if(item.display)item.display.visible=index===journey;
      if(item.occluder)item.occluder.visible=index===journey;
      if(!item.bubble)return;
      const visible=index!==journey;item.bubble.visible=visible;item.button.hidden=!visible;
      if(!visible)return;
      const floatTime=reducedMotion?0:time;
      const orbit=slot++/(exhibits.length-1)*Math.PI*2+floatTime*.000035;
      const x=Math.cos(orbit)*.64*.846,y=-.12+Math.sin(orbit)*.48*.846;
      const ray=new THREE.Vector3(x+Math.sin(floatTime*.00055+index)*.025+Math.cos(floatTime*.0003+index)*.008,y+Math.sin(floatTime*.00075+index*1.7)*.018,.5).unproject(camera).sub(camera.position).normalize();
      const forward=camera.getWorldDirection(new THREE.Vector3());
      const bubbleDepth=camera.position.distanceTo(controls.target)+4;
      item.bubble.position.copy(camera.position).addScaledVector(ray,bubbleDepth/ray.dot(forward));
      item.ring.quaternion.copy(camera.quaternion);
      const hover=item.button.matches(':hover,:focus-visible');
      const pixelRadius=Math.min(host.clientWidth*.055,host.clientHeight*.05)*.846;
      const worldRadius=pixelRadius/host.clientHeight*(bubbleDepth*2)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
      item.bubble.scale.setScalar(worldRadius/.85*(hover?1.08:1));
      const projected=item.bubble.position.clone().project(camera);
      const edge=item.bubble.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).cross(camera.up).normalize().multiplyScalar(.9*item.bubble.scale.x)).project(camera);
      item.button.style.left=`${(projected.x*.5+.5)*host.clientWidth}px`;item.button.style.top=`${(-projected.y*.5+.5)*host.clientHeight}px`;
      const diameter=Math.abs(edge.x-projected.x)*host.clientWidth;item.button.style.width=item.button.style.height=`${Math.max(40,diameter)}px`;
    });
    controls.update();renderer.render(scene,camera);
    renderer.autoClear=false;renderer.clearDepth();
    renderer.render(occlusionScene,camera);renderer.render(bubbleScene,camera);
    renderer.autoClear=true;
  });
  disposeModel = () => {
    disposed=true;resize.disconnect();controller.abort();renderer.setAnimationLoop(null);controls.dispose();
    navigation.removeEventListener('click',navigate);reset.removeEventListener('click',resetView);controls.removeEventListener('start',stopFlight);
    host.removeEventListener('keydown',journeyKey);
    exhibits.forEach(item=>item.previewTarget?.dispose());navigation.remove();
    geometries.forEach(item=>item.dispose());materials.forEach(item=>item.dispose());textures.forEach(item=>item.dispose());
    occlusionMaterial.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();
  };
  const metalParts = new Set(['Tube_2','Tube_4','Tube_5','Tube_6','Tube_7','Box','Box_1','Box_10','Box_14','Box_9','Box_15','Box_12','Box_13','Box_16','Box_11','Box_3','Box_4','Box_5','Box_6','Box_2']);
  const supportMetal = new THREE.MeshStandardMaterial({color:0x969ba3,metalness:.92,roughness:.28,side:THREE.DoubleSide});materials.add(supportMetal);
  let loaded=0;
  for (const exhibit of exhibits) {
    if(disposed)return;
    status.textContent=`loading sculpture ${loaded+1} of ${exhibits.length}…`;
    try {
      const file=exhibit.file ?? `nomad-project-${exhibit.id}.glb`;
      const response=await fetch(globalThis.portfolioAsset?.(file) ?? `/assets/${file}?v=20261103-smooth`,{signal:controller.signal});
      if(!response.ok)throw new Error('Model unavailable');
      const data=await response.arrayBuffer();if(disposed)return;
      const model=(await new THREE.GLTFLoader().setMeshoptDecoder(THREE.MeshoptDecoder).parseAsync(data,'')).scene;if(disposed)return;exhibit.model=model;model.userData.exhibitId=exhibit.id;
      model.traverse(item=>{
        if(!item.isMesh)return;
        item.castShadow=true;item.receiveShadow=true;
        geometries.add(item.geometry);
        const original=item.material,colors=item.geometry.attributes.color;
        let neutralVertices=0,metalVertices=0;
        for(let index=0;colors&&index<colors.count;index++) {
          const r=colors.getX(index),g=colors.getY(index),b=colors.getZ(index);
          if(Math.min(r,g,b)>.7&&Math.max(r,g,b)-Math.min(r,g,b)<.035)neutralVertices++;
          if(Math.min(r,g,b)>.35&&Math.max(r,g,b)<.7&&Math.max(r,g,b)-Math.min(r,g,b)<.035)metalVertices++;
        }
        const unpainted=!colors||neutralVertices/colors.count>.98;
        item.material=(exhibit.id===16&&(metalParts.has(original.name)||(colors&&metalVertices/colors.count>.98)))||([6,11].includes(exhibit.id)&&unpainted)?supportMetal:exhibit.id===16&&unpainted
          ?new THREE.MeshStandardMaterial({color:0xb56935,transparent:true,opacity:.5,depthWrite:false,depthTest:true,roughness:.38,side:THREE.DoubleSide})
          :new THREE.MeshStandardMaterial({vertexColors:!!colors,color:0xffffff,roughness:.3,metalness:.08,side:THREE.DoubleSide});
        if(exhibit.id===15&&unpainted) {
          item.material.dispose();
          item.material=new THREE.MeshPhysicalMaterial({color:0xa9b6c5,metalness:.8,roughness:.18,transparent:true,opacity:.5,depthWrite:false,clearcoat:.6,side:THREE.DoubleSide});
        }
        if(exhibit.id===8) {
          if(item.material!==supportMetal)item.material.dispose();
          let r=0,g=0,b=0;
          for(let index=0;colors&&index<colors.count;index++){r+=colors.getX(index);g+=colors.getY(index);b+=colors.getZ(index);}
          if(colors){r/=colors.count;g/=colors.count;b/=colors.count;}
          const body=/^hi(?:-1)?$/.test(item.name);
          const sheet=(r>g*1.1&&g>.3)||(r>.24&&r<.3&&Math.abs(r-g)<.025&&/Front|Back/.test(item.name));
          if(body)item.material=new THREE.MeshStandardMaterial({color:0xd5c5a2,roughness:.68,side:THREE.DoubleSide});
          else if(sheet)item.material=new THREE.MeshPhysicalMaterial({color:0xc59373,roughness:.7,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide});
          else if(r>g*1.6&&r>.05)item.material=new THREE.MeshStandardMaterial({color:r<.15?0x632b19:0xa25832,metalness:r<.15?.55:.2,roughness:r<.15?.22:.4,side:THREE.DoubleSide});
          else item.material=new THREE.MeshStandardMaterial({color:0x87745a,metalness:.88,roughness:.28,side:THREE.DoubleSide});
        }
        materials.add(item.material);(Array.isArray(original)?original:[original]).forEach(material=>material.dispose());
      });
      const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const scale=(exhibit.id===2?6.2:5.4)/Math.max(size.x,size.y,size.z);
      let restingY=bounds.min.y;
      if(exhibit.id===2) {
        // This Nomad export includes a detached base below the sculpture assembly.
        const assemblyBounds=new THREE.Box3();
        model.traverse(item=>{if(item.isMesh){const part=new THREE.Box3().setFromObject(item);if(part.max.y>bounds.min.y+.5)assemblyBounds.union(part);}});
        restingY=assemblyBounds.min.y;
        center.copy(assemblyBounds.getCenter(new THREE.Vector3()));
      }
      const display=new THREE.Group();display.add(model);
      display.scale.setScalar(scale);display.position.set(exhibit.x-center.x*scale,.01-restingY*scale,exhibit.z-center.z*scale);
      exhibit.height=(bounds.max.y-restingY)*scale;exhibit.width=size.x*scale;
      exhibit.display=display;display.visible=exhibits.indexOf(exhibit)===journey;
      scene.add(display);
      exhibit.occluder=display.clone(true);occlusionScene.add(exhibit.occluder);
      makePreview(exhibit);loaded++;
      if(exhibit.id===16)focus(exhibit.id);
      navigation.querySelector(`[data-exhibit-focus="${exhibit.id}"]`).disabled=false;
    } catch(error) {if(error.name==='AbortError')return;}
  }
  status.textContent=loaded===exhibits.length?'click a floating bubble to explore · drag to rotate · scroll to zoom':`${loaded} of ${exhibits.length} sculptures loaded — refresh to retry`;
}
