import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPLOYEES} from '../src/model.js';
import {employeeStyle,defaultOffice} from '../src/office/config.js';
import {DEPARTMENTS,PLATFORMS,ROOM_KEYS,membersFor,employeePlatform,makeRoom} from '../src/office/workspaces.js';
import {validOfficeConfig} from '../functions/office-config.js';
test('cast has 128 distinct names and reference cells with a 96-woman majority',()=>{
 assert.equal(new Set(EMPLOYEES.map(e=>e.name)).size,128);
 assert.equal(new Set(EMPLOYEES.map(e=>e.portrait)).size,128);
 assert.equal(EMPLOYEES.filter(e=>e.gender==='woman').length,96);
 assert.ok(EMPLOYEES.every(e=>employeeStyle(e.id).displayName===e.name));
 for(const role of new Set(EMPLOYEES.map(e=>e.role))) assert.equal(EMPLOYEES.filter(e=>e.role===role&&e.gender==='woman').length,3);
});
test('department and platform workspaces partition the roster and preserve explicit reassignment',()=>{
 const config=defaultOffice();
 for(const keys of [DEPARTMENTS.map(d=>d.id),PLATFORMS.map(p=>'platform-'+p.id)]) {
  const ids=keys.flatMap(key=>membersFor(key,config).map(e=>e.id));assert.equal(ids.length,128);assert.equal(new Set(ids).size,128);
 }
 const researcher=EMPLOYEES.find(e=>e.role==='dataresearch');
 config.employees[researcher.id]={platform:'linkedin'};
 assert.equal(employeePlatform(researcher,config),'linkedin');
 assert.ok(membersFor('platform-linkedin',config).some(e=>e.id===researcher.id));
 assert.ok(!membersFor('platform-research',config).some(e=>e.id===researcher.id));
});
test('room configurations retain independent furniture and enforce bounded data-only schema',()=>{
 const config={...defaultOffice(),rooms:Object.fromEntries(ROOM_KEYS.map(key=>[key,makeRoom(key,membersFor(key,{}).length)]))};
 config.employees[EMPLOYEES[0].id]={platform:'email',hairStyle:'braid',wardrobe:'dress',accessory:'earrings'};
 assert.ok(validOfficeConfig(config));
 const other=config.rooms['dept-outbound'].objects[0].x;
 config.rooms['dept-data-lab'].objects[0].x=3;
 assert.equal(config.rooms['dept-outbound'].objects[0].x,other);
 for(const alter of [c=>c.rooms.secret=makeRoom('dept-data-lab'),c=>c.rooms['dept-data-lab'].positions.unknown={x:0,z:0},c=>c.rooms['dept-data-lab'].objects[0].x=Infinity,c=>c.employees[EMPLOYEES[0].id].platform='https://evil.example',c=>c.rooms['dept-data-lab'].code='run']) {
  const invalid=structuredClone(config);alter(invalid);assert.equal(validOfficeConfig(invalid),false);
 }
 assert.ok(Buffer.byteLength(JSON.stringify(config))<128*1024);
});
