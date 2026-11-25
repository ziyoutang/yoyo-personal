import {readFile,writeFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {MeshoptEncoder} from 'meshoptimizer';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {meshopt,dedup,prune} from '@gltf-transform/functions';
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.();});}};
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
for(const path of process.argv.slice(2)) {
 const source=await readFile(path);
 const model=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength),'')).scene;
 model.traverse(item=>{if(item.isMesh){
  const geometry=item.geometry.clone();geometry.deleteAttribute('normal');
  item.geometry=mergeVertices(geometry,1e-5);item.geometry.computeVertexNormals();
 }});
 const binary=await new GLTFExporter().parseAsync(model,{binary:true});
 const document=await io.readBinary(new Uint8Array(binary));
 await document.transform(dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
 const output=await io.writeBinary(document);await writeFile(path,output);console.log(path,output.length);
}
