import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalPolicyTargets,advanceClinicalComplications,complicationStateEligible} from './clinical-policy-effects.js';
const policy={trajectory:{early:[0,10,4,-10,-5,-4],late:[0,20,8,-20,-10,-8],earlyEnd:10,lateEnd:60,fluidResponse:0},responses:[{allOf:['bronchodilator'],delay:1,peak:10,offsets:[0,-8,-6,0,0,3]}],complications:[{id:'fatigue',type:'respiratory-fatigue',progressionId:'offset-ramp-v1',rescueId:'confirmed-rescue-v1',minMinute:20,riseMinutes:15,offsets:[0,12,-12,-12,-7,-12],rescueAllOf:['intubation'],recoveryMinutes:30,manifestation:'Fatiga respiratoria'}]};
const patient=()=>({uid:'p',liveVitals:{temp:37,hr:120,rr:34,sys:132,dia:78,spo2:86},variation:{complicationCandidates:[{id:'fatigue',progressionId:'offset-ramp-v1',rescueId:'confirmed-rescue-v1'}]},treatments:[],administrationLog:[]});
const c={id:'RESP-TEST',clinicalPolicy:policy};
function administered(p,id,minute,route='inhaled'){
 const t={id,patientUid:p.uid,sourceEventId:id+':'+minute,administeredAtNativeMinute:minute,route,
  ...(route==='procedure'?{kind:'procedure.performed',completionStatus:'completed'}:{dose:{amount:5,unit:'mg'}})};
 p.treatments.push(t);if(route!=='procedure')p.administrationLog.push(structuredClone(t));
}
test('native targets require true administration and delayed response',()=>{
 const p=patient(),untreated=clinicalPolicyTargets(p,c,10);p.pendingTreatments=[{id:'bronchodilator'}];
 assert.deepEqual(clinicalPolicyTargets(p,c,10),untreated);
 administered(p,'bronchodilator',10);assert.deepEqual(clinicalPolicyTargets(p,c,10),untreated);
 assert.ok(clinicalPolicyTargets(p,c,20).rr<clinicalPolicyTargets(patient(),c,20).rr);
 assert.equal(p.liveVitals.spo2,86,'pure targets do not write vitals');
});
test('seeded complication persists, progresses despite initial treatment, and recovers gradually after actual rescue',()=>{
 const p=patient();administered(p,'bronchodilator',1);
 assert.equal(advanceClinicalComplications(p,c,19).spo2,0);
 assert.equal(advanceClinicalComplications(p,c,20).spo2,0);
 const deterioration=advanceClinicalComplications(p,c,35);
 assert.equal(deterioration.spo2,-12);assert.equal(p.policyState.complications[0].status,'active');
 p.pendingTreatments=[{id:'intubation'}];assert.equal(advanceClinicalComplications(p,c,36).spo2,-12);
 administered(p,'intubation',36,'procedure');assert.equal(advanceClinicalComplications(p,c,36).spo2,-12);
 const checkpoint=structuredClone(p);assert.deepEqual(advanceClinicalComplications(p,c,45),advanceClinicalComplications(checkpoint,c,45));
 assert.ok(advanceClinicalComplications(p,c,50).spo2>-12);
 assert.equal(advanceClinicalComplications(p,c,66).spo2,0);assert.equal(p.policyState.complications[0].status,'recovered');
 assert.equal(p.liveVitals.spo2,86);assert.equal(p.patientDied,undefined);
});
test('eligibility is a clinical condition, never the random draw alone',()=>{
 const candidate={minMinute:20,requiredState:{spo2:{lt:90},sys:{gt:80}}};
 assert.equal(complicationStateEligible(candidate,{nativeMinute:20,clinicalState:{spo2:92,sys:100}}),false);
 assert.equal(complicationStateEligible(candidate,{nativeMinute:20,clinicalState:{spo2:85,sys:100}}),true);
 const p=patient();p.variation.complicationCandidates=[];advanceClinicalComplications(p,c,60);assert.deepEqual(p.policyState.complications,[]);
});
