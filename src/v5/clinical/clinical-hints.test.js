import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent as content} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
import {selectClinicalHint,clinicalHintCoverage} from './clinical-hints.js';

function fixture(caseId='CIRR-001',supplied=content){
 const patient={uid:'hint-patient',caseId};
 const session=createGuardSession({roomId:'hint-room',mode:'solo',actorId:'doctor',actorName:'Médico',patient,content:supplied,
  resolveContext:()=>({patientUid:patient.uid})});
 return {session,caseData:supplied.cases.find(c=>c.id===caseId),
  next:()=>session.clinicalHint(),post:text=>session.post({id:crypto.randomUUID(),text})};
}
test('first hint is one executable priority and selection never mutates a patient',()=>{
 const f=fixture(),before=f.session.read().patient;
 const hint=f.next();assert.equal(hint.action.kind,'vitals');
 assert.equal(hint.action.command,'/signos');assert(hint.text.length<180);
 assert.deepEqual(f.session.read().patient,before);f.session.dispose();
});
test('real closure gates advance the hint when an action is completed',async()=>{
 const f=fixture();await f.post('/signos');
 assert.notEqual(f.next().action.kind,'vitals');f.session.dispose();
});
test('critical hypoxemia chooses oxygen before secondary examination',()=>{
 const f=fixture('RESP-03');const p=f.session.read().patient;
 const hint=selectClinicalHint({patient:{...p,liveVitals:{...p.liveVitals,spo2:80}},caseData:f.caseData,content,
  clock:{nativeMinute:0,clinicalMinute:0},requirements:[{type:'treatment',anyOf:[['oxygen']]}]});
 assert.equal(hint.action.id,'oxygen');f.session.dispose();
});
test('completed alternatives satisfy one shared requirement, rather than all branches',async()=>{
 const f=fixture('APP-001');await f.post('Enfermera una vía');await f.post('Enfermera piperacilina tazobactam 4.5 g');f.session.advance(4);await f.session.flush();
 const requirements=f.session.clinicalHintRequirements();
 assert(!requirements.some(r=>r.type==='treatment'&&r.anyOf?.some(g=>g.includes('ceftriaxone'))));f.session.dispose();
});
test('pending nursing/native orders cannot be recommended a second time',async()=>{
 const f=fixture('CIRR-001');await f.post('Enfermera espironolactona 100 mg oral');
 const hint=selectClinicalHint({patient:f.session.read().patient,caseData:f.caseData,content,clock:f.session.read().clock,
  requirements:[{type:'treatment',anyOf:[['espironolactona']]}]});
 assert.equal(hint.chargeable,false);assert.equal(hint.action.kind,'wait');f.session.dispose();
});
test('a modified canonical rule is reflected without authored hint prose',()=>{
 const changed=structuredClone(content),c=changed.cases.find(c=>c.id==='RESP-01');
 c.clinicalPolicy.closure.requiredStudies.push(c.studies.find(s=>s.id!==c.clinicalPolicy.closure.requiredStudies[0]).id);
 const f=fixture(c.id,changed),requirements=f.session.clinicalHintRequirements();
 for(const id of c.clinicalPolicy.closure.requiredStudies)assert(requirements.some(r=>r.type==='study'&&r.anyOf.some(g=>g.includes(id))));
 f.session.dispose();
});
test('all active cases expose real requirements and executable action references',()=>{
 const census=clinicalHintCoverage(content);assert.equal(census.cases.length,55);assert.deepEqual(census.errors,[]);
});
