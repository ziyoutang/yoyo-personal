import {readFile,writeFile,stat} from 'node:fs/promises';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {MeshStandardMaterial,Uint8BufferAttribute} from 'three';
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.();});}};
for(const name of process.argv.slice(2)) {
 const output=name.replace(/\.obj$/,'.glb');
 const model=new OBJLoader().parse(await readFile(name,'utf8'));
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  mesh.geometry=mergeVertices(mesh.geometry,1e-5);
  const color=mesh.geometry.attributes.color;
  if(color)mesh.geometry.setAttribute('color',new Uint8BufferAttribute(Array.from(color.array,value=>Math.round(Math.min(1,Math.max(0,value))*255)),3,true));
  const original=mesh.material;mesh.material=new MeshStandardMaterial({name:original.name,vertexColors:!!color});
 });
 const data=await new GLTFExporter().parseAsync(model,{binary:true});
 await writeFile(output,Buffer.from(data));console.log(output,(await stat(output)).size);
}
