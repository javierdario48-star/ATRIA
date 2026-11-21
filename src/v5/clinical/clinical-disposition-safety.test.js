import test from 'node:test';
import assert from 'node:assert/strict';
import {complicationDispositionRequirements as required} from './clinical-disposition-safety.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
import {resp01V2Candidate} from '../content/packs/respiratory-v2-candidate.js';

const cases=[...respiratoryPack.cases,...cardiologyPack.cases,...neurologyPack.cases];
function assess(caseData,{status='active',id=null,done=[],dest='alta',deferred=[],onsetAt=1}={}){
 const def=caseData.clinicalPolicy.complications.find(x=>x.id===(id||caseData.clinicalPolicy.complications[0]?.id));
 return required({patient:{policyState:{complications:def?[{id:def.id,status,onsetAt}]:[]}},
  caseData,destination:dest,fulfilled:new Set(done),continuation:{deferredTreatmentIds:deferred}});
}
test('universal rule is complete and readonly across all declared respiratory, cardiac and neurological case policies',()=>{
 assert.equal(cases.length,30);
 let episodes=0;
 for(const c of cases){
  assert.equal(assess(c).length===0,(c.clinicalPolicy.complications||[]).length===0);
  const before=structuredClone(c);
  for(const def of c.clinicalPolicy.complications||[]){
   if(!Array.isArray(def.rescueAllOf)||!def.rescueAllOf.length)continue;
   episodes++;
   const active=assess(c,{id:def.id});
   assert(active.some(x=>x.type==='treatment'&&x.reason==='manifested-complication-rescue'),
    c.id+': active native complication requires actual initial rescue');
   assert.deepEqual(active[0].anyOf,[def.rescueAllOf],
    c.id+': prescription must be authored and not invented');
   const rescued=assess(c,{id:def.id,done:def.rescueAllOf});
   assert(rescued.some(x=>x.type==='wait'&&x.reason==='manifested-complication-recovery'),
    c.id+': rescue alone cannot justify elective alta');
   const transferred=assess(c,{id:def.id,done:def.rescueAllOf,dest:'uti'});
   assert.equal(transferred.length,0,c.id+': stable prepared transfer does not require completing recovery at bedside');
   assert.equal(assess(c,{id:def.id,status:'recovered'}).length,0);
  }
  assert.deepEqual(c,before,'global transfer assessment must not mutate case '+c.id);
 }
 assert(episodes>=10,'test should traverse the shared complication vocabulary');
});
test('unmanifested random candidates and unknown episode IDs cannot restrict a disposition or expose a future draw',()=>{
 for(const def of [resp01V2Candidate,...cases.filter(c=>c.clinicalPolicy.complications.length).slice(0,5)]){
  const c=def;
  assert.deepEqual(assess(c,{status:'candidate'}),[]);
  assert.deepEqual(assess(c,{onsetAt:undefined}),[]);
  assert.deepEqual(assess(c,{id:'not-real'}),[], 'unknown episode IDs do not create a rescue gate');
  assert.deepEqual(required({patient:{policyState:{complications:[{id:'secret-candidate',status:'active',onsetAt:1}]}},
   caseData:c,destination:'alta',fulfilled:new Set(),continuation:{}}),[]);
 }
});
test('receiver-owned definitive procedures are not falsely required as bedside rescue',()=>{
 const c=resp01V2Candidate,def=c.clinicalPolicy.complications[0];
 const deferred={deferredTreatmentIds:[def.rescueAllOf[1]]};
 const patient={policyState:{complications:[{id:def.id,status:'active',onsetAt:1}]}};
 const ward=required({patient,caseData:c,destination:'sala',fulfilled:new Set([def.rescueAllOf[0]]),continuation:deferred});
 assert.deepEqual(ward,[]);
 const discharge=required({patient,caseData:c,destination:'alta',
  fulfilled:new Set([def.rescueAllOf[0]]),continuation:deferred});
 assert(discharge.some(x=>x.type==='wait'),'deferred rescue never proves full recovery for alta');
});
