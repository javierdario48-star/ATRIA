import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestedBedsideAction,unassignedPatientMarkers} from './bedside-guidance.js';
function clinical(){return {patient:{uid:'p',diagnosis:'',intentHistory:[],examFindings:{},
  orders:[],treatments:[],administrationLog:[],pendingTreatments:[],pendingConsults:[],
  consults:[],procedures:{}},eligibleDestinations:[]};}
test('visual coaching progresses from talk to nurse diagnosis question to valid closure',()=>{
 const s=clinical();
 assert.equal(suggestedBedsideAction(s),'talk');
 s.patient.intentHistory=[{},{}];s.patient.examFindings={abdomen:{palpation:{rows:[]}},
  general:{inspection:{rows:[]}}};s.patient.orders=[{status:'done'}];
 assert.equal(suggestedBedsideAction(s),'diagnosis');
 s.patient.diagnosis='apendicitis aguda';
 assert.equal(suggestedBedsideAction(s),null);
 s.eligibleDestinations=['quirofano'];
 assert.equal(suggestedBedsideAction(s),'patient');
 s.patient.pendingTreatments=[{id:'ceftriaxone'}];
 assert.equal(suggestedBedsideAction(s),null,'unadministered therapy is not ready to close');
 s.patient.pendingTreatments=[];s.patient.caseEnded=true;
 assert.equal(suggestedBedsideAction(s),null);
});
test('unassigned glow is only for available competitive patients',()=>{
 const points=[{uid:'a',x:100,y:120},{uid:'b',x:200,y:150},{uid:'c',x:30,y:20}];
 const records=[{uid:'a',ownerId:null},{uid:'b',ownerId:'other'},
  {uid:'c',closed:true,ownerId:null}];
 assert.deepEqual(unassignedPatientMarkers('guard','competitive',points,records).map(x=>x.uid),['a']);
 assert.deepEqual(unassignedPatientMarkers('guard','coop',points,records),[]);
 assert.deepEqual(unassignedPatientMarkers('lobby','competitive',points,records),[]);
});
