import test from 'node:test';import assert from 'node:assert/strict';
import {findPath,canStand} from '../src/office/navigation.js';
test('walking path routes around a desk rather than crossing it',()=>{const obstacles=[{x:0,z:0,w:4,d:3}];const path=findPath({x:-4,z:0},{x:4,z:0},obstacles);assert.ok(path.length>0);assert.ok(path.every(p=>canStand(p.x,p.z,obstacles)));assert.ok(path.some(p=>Math.abs(p.z)>1.6));});
test('blocked and off-floor destinations are rejected',()=>{assert.deepEqual(findPath({x:-4,z:0},{x:0,z:0},[{x:0,z:0,w:4,d:3}]),[]);assert.equal(canStand(40,0,[]),false);});
