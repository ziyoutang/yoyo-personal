import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {meshopt,dedup,prune} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {stat} from 'node:fs/promises';
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
for(const path of process.argv.slice(2)) {
 const doc=await io.read(path);
 await doc.transform(dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
 await io.write(path,doc);console.log(path,(await stat(path)).size);
}
