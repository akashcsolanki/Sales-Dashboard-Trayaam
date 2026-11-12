import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fitModel,inPlace,acquireModel} from '../src/office/imported-models.js';
import {CHARACTER_MODELS,FURNITURE_MODELS} from '../src/office/model-catalog.js';
test('reviewed model catalog contains self-contained browser-sized GLBs with real rigs',()=>{
 for(const [id,entry] of Object.entries({...CHARACTER_MODELS,...FURNITURE_MODELS})){
  assert.match(entry.url,/^\/office\/models\/[-a-z0-9]+\.glb$/);
  const b=fs.readFileSync('public'+entry.url);
  assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);assert.ok(b.length<25*1024*1024);
  const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
  assert.ok(j.meshes.length);assert.ok(j.images?.length);
  assert.ok([...(j.images||[]),...(j.buffers||[])].every(x=>!x.uri));
  if(CHARACTER_MODELS[id]?.rigged){assert.ok(j.skins?.length);assert.ok(j.animations?.some(a=>/walk|running/i.test(a.name)));}
 }
});
test('asset normalization grounds a model without changing its proportions',()=>{
 const source=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(2,4,2));mesh.position.set(3,5,-2);source.add(mesh);
 const model=fitModel(source,{height:2}),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 assert.ok(Math.abs(box.min.y)<1e-7);assert.ok(Math.abs(size.y-2)<1e-7);assert.ok(Math.abs(size.x-1)<1e-7);assert.ok(Math.abs(center.x)<1e-7);assert.ok(Math.abs(center.z)<1e-7);
 assert.throws(()=>acquireModel('https://example.com/asset.glb'),/Unapproved/);
});
test('walking clips lose horizontal root drift while retaining vertical movement and the source clip',()=>{
 const original=new THREE.AnimationClip('Walking',1,[new THREE.VectorKeyframeTrack('mixamorigHips.position',[0,1],[1,2,3,4,5,6])]);
 const clipped=inPlace(original);
 assert.deepEqual([...clipped.tracks[0].values],[1,2,3,1,5,3]);assert.deepEqual([...original.tracks[0].values],[1,2,3,4,5,6]);
});
