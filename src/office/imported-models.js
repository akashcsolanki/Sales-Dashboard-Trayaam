import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

const pool=new Map();
function disposeTemplate(root) {
  const geometry=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.isMesh){geometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}}});
  geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();t.source?.data?.close?.();});
}
// Fixed local catalog only. Never resolve model URLs from prospect or task content.
export function acquireModel(url) {
  if(!/^\/office\/models\/[a-z0-9-]+\.glb$/.test(url))throw new Error('Unapproved model path');
  let entry=pool.get(url);
  if(!entry){entry={refs:0,promise:new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url)};pool.set(url,entry);}
  entry.refs++;
  let released=false;
  return {
    ready:entry.promise.then(gltf=>{
      const scene=clone(gltf.scene);
      scene.traverse(o=>{o.userData.importedAsset=true;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
      return {scene,animations:gltf.animations};
    }),
    release(){if(released)return;released=true;entry.refs--;if(entry.refs===0){if(pool.get(url)===entry)pool.delete(url);entry.promise.then(g=>disposeTemplate(g.scene)).catch(()=>{});}}
  };
}
export function fitModel(scene,{height,width}={}) {
  scene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(scene), size=bounds.getSize(new THREE.Vector3()), center=bounds.getCenter(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Empty model geometry');
  const group=new THREE.Group();
  scene.position.x-=center.x;scene.position.z-=center.z;scene.position.y-=bounds.min.y;
  group.add(scene);group.scale.setScalar(height?height/size.y:width/Math.max(size.x,size.z));
  return group;
}
export function inPlace(clip) {
  const copy=clip.clone();
  for(const t of copy.tracks)if(/(?:hips|pelvis|root).*\.position$/i.test(t.name))for(let i=0;i<t.values.length;i+=3){t.values[i]=t.values[0];t.values[i+2]=t.values[2];}
  return copy;
}
