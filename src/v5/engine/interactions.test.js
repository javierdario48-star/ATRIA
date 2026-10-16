import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld} from '../app/world.js';
import {hospitalEntities,hitWorldEntity,canInteract,PATIENT_RANGE} from './interactions.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={map:read('hospital'),beds:read('beds'),cases:read('cases')};
test('each bedside monitor has the original world coordinates, bed ID and explicit patient UID',()=>{
 const patients=content.beds.map((b,i)=>({uid:'P'+i,bedId:b.id,x:b.patient[0],y:b.patient[1]}));
 const entities=hospitalEntities({patients,nurses:[],expert:null},content.map);
 for(const [i,p] of patients.entries()){
  const m=entities.find(e=>e.kind==='monitor'&&e.patientUid===p.uid);
  assert.equal(m.bedId,p.bedId);assert.equal(m.x,p.x+(p.x<512?42:-42));assert.equal(m.y,p.y-27);
  assert.equal(hitWorldEntity(entities,m.x,m.y).id,m.id);
  assert.equal(hitWorldEntity(entities,p.x,p.y).patientUid,p.uid);
 }
});
test('overlapping targets resolve by exact hit center then stable identity, regardless of input order',()=>{
 const entities=hospitalEntities({patients:[{uid:'A',bedId:'B1',x:97,y:409},{uid:'B',bedId:'B2',x:130,y:409}],nurses:[],expert:null},content.map);
 assert.equal(hitWorldEntity(entities,130,409).patientUid,'B');
 assert.equal(hitWorldEntity([...entities].reverse(),130,409).patientUid,'B');
 assert.equal(hitWorldEntity(entities,900,900),null);
});
test('clinical range remains the existing 150 world pixels; a monitor cannot authorize a distant patient',()=>{
 assert.equal(PATIENT_RANGE,150);
 const p={uid:'A',bedId:'B1',x:97,y:409},entities=hospitalEntities({patients:[p],nurses:[],expert:null},content.map);
 const monitor=entities.find(e=>e.kind==='monitor');
 assert(canInteract({x:247,y:409},monitor,[p]));
 assert(!canInteract({x:247.1,y:409},monitor,[p]));
 assert(!canInteract({x:97,y:409},monitor,[]));
});
test('world owns entities and validates explicit targets without falling back to a different nearby patient',()=>{
 const w=createWorld(content,{name:'Javier'});w.enterGuard({caseId:'CIRR-001'});
 assert(w.snapshot().entities.some(e=>e.kind==='monitor'));
 assert.equal(w.interactionAt(139,382).kind,'monitor');
 const uid=w.snapshot().patients[0].uid;
 assert.equal(w.patientInRange(uid),null);
 const b=content.beds[0],point=w.navigation.center(...b.approach);assert(w.target(point.x,point.y));
 for(let i=0;i<1200;i++)w.step(1/60);
 assert.equal(w.patientInRange(uid),uid);assert.equal(w.patientInRange('foreign'),null);
 w.enterLobby();assert.deepEqual(w.snapshot().entities,[]);assert.equal(w.interactionAt(139,382),null);
});
test('a distant entity approach keeps its UID and is cancelled by a new destination or room transition',()=>{
 const w=createWorld(content,{name:'Javier'});w.enterGuard({caseId:'CIRR-001'});
 const m=w.snapshot().entities.find(e=>e.kind==='monitor');
 assert.equal(w.beginInteraction(m.id).status,'walking');assert.equal(w.takeInteraction(),null);
 for(let i=0;i<1200;i++)w.step(1/60);
 const arrived=w.takeInteraction();assert.equal(arrived.patientUid,m.patientUid);assert.equal(arrived.kind,'monitor');
 assert.equal(w.takeInteraction(),null,'one interaction, never a repeated popup');
 w.enterGuard({caseId:'APP-001'});const next=w.snapshot().entities.find(e=>e.kind==='patient');
 assert.equal(w.beginInteraction(next.id).status,'walking');w.target(496,1060);
 for(let i=0;i<1200;i++)w.step(1/60);
 assert.equal(w.takeInteraction(),null);w.enterLobby();assert.equal(w.beginInteraction(next.id).status,'missing');
});
