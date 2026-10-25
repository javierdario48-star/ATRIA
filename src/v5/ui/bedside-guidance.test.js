import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestedBedsideAction,unassignedPatientMarkers} from './bedside-guidance.js';
function clinical(){return {patient:{uid:'p',diagnosis:'',intentHistory:[],examFindings:{},
  orders:[],treatments:[],administrationLog:[],pendingTreatments:[],pendingConsults:[],
  consults:[],procedures:{}},eligibleDestinations:[]};}
test('visual coaching progresses from talk to nurse diagnosis question to valid closure',()=>{
 const s=clinical();
 assert.equal(suggestedBedsideAction(s),'talk');
 s.patient.intentHistory=[{id:'interview:symptoms'}];
 assert.equal(suggestedBedsideAction(s),'talk','greeting alone must not dismiss Talk coaching');
 s.patient.intentHistory=[{id:'interview:symptoms'},{id:'onset'}];
 assert.equal(suggestedBedsideAction(s),null,'real history progress clears Talk before diagnosis is requested');s.patient.examFindings={abdomen:{palpation:{rows:[]}},
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
test('selectable glow respects availability and mode ownership',()=>{
 const points=[{uid:'a',x:100,y:120},{uid:'b',x:200,y:150},{uid:'c',x:30,y:20}];
 const records=[{uid:'a',ownerId:null},{uid:'b',ownerId:'other'},
  {uid:'c',closed:true,ownerId:null}];
 assert.deepEqual(unassignedPatientMarkers('guard','competitive',points,records).map(x=>x.uid),['a']);
 assert.deepEqual(unassignedPatientMarkers('guard','coop',points,records).map(x=>x.uid),['a','b']);
 assert.deepEqual(unassignedPatientMarkers('guard','solo',points,records,'a').map(x=>x.uid),['b']);
 assert.deepEqual(unassignedPatientMarkers('guard','apprentice',points,records,'b').map(x=>x.uid),['a']);
 assert.deepEqual(unassignedPatientMarkers('lobby','competitive',points,records),[]);
});

test('departed, deceased, and focused shared beds do not glow',()=>{
 const points=[{uid:'a',x:5,y:8},{uid:'b',x:8,y:9,departed:true},
  {uid:'c',x:9,y:12},{uid:'d',x:20,y:21}];
 const records=[{uid:'a',patientDied:true},{uid:'b'},{uid:'c',closed:true},{uid:'d'}];
 for(const mode of ['competitive','coop','solo','apprentice']){
  assert.deepEqual(unassignedPatientMarkers('guard',mode,points,records).map(x=>x.uid),['d']);
  assert.deepEqual(unassignedPatientMarkers('guard',mode,points,records,'d').map(x=>x.uid),
   mode==='competitive'?['d']:[]);
  assert.deepEqual(unassignedPatientMarkers('lobby',mode,points,records),[]);
 }
});
