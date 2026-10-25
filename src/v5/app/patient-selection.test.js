import test from 'node:test';
import assert from 'node:assert/strict';
import {directPatientIntent} from './patient-selection.js';

const state=(focus='B1',owner1='doctorA',owner2='doctorA',mode='competitive')=>({
 patient:{uid:focus},shift:{mode,ended:false,patients:[
  {uid:'B1',ownerId:owner1},{uid:'B2',ownerId:owner2},
 ]},
});
test('explicitly tapped own bedside wins even beside another owned bed',()=>{
 const s=state('B1');
 assert.equal(directPatientIntent(s,'B1','doctorA'),'selected');
 assert.equal(directPatientIntent(s,'B2','doctorA'),'claim');
 const switched=state('B2');
 assert.equal(directPatientIntent(switched,'B2','doctorA'),'selected');
 assert.equal(directPatientIntent(switched,'B1','doctorA'),'claim');
 assert.equal(s.shift.patients[0].ownerId,'doctorA','selection never transfers ownership');
});
test('unassigned bedside must receive server confirmation before conversation focus',()=>{
 const s=state('B1',null,'doctorA');
 assert.equal(directPatientIntent(s,'B1','doctorA'),'claim');
 assert.equal(directPatientIntent(state('B1','doctorA'),'B1','doctorA'),'selected');
});
test('rival-owned, unavailable and ended patients are not selectable',()=>{
 const s=state('B1','doctorB','doctorA');
 assert.equal(directPatientIntent(s,'B1','doctorA'),'occupied');
 assert.equal(directPatientIntent(s,'B2','doctorB'),'occupied');
 s.shift.patients[1].closed=true;
 assert.equal(directPatientIntent(s,'B2','doctorA'),'unavailable');
 s.shift.ended=true;
 assert.equal(directPatientIntent(s,'B1','doctorB'),'unavailable');
 assert.equal(directPatientIntent(s,'bogus','doctorA'),'unavailable');
});
test('cooperative bedside focus is independent of competitive ownership',()=>{
 assert.equal(directPatientIntent(state('B1',null,null,'coop'),'B1','doctorB'),'selected');
 assert.equal(directPatientIntent(state('B1',null,null,'coop'),'B2','doctorB'),'claim');
});
