import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent as content} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
import {selectClinicalHint,clinicalHintCoverage} from './clinical-hints.js';
import {hintDestination} from './clinical-hint-requirements.js';
import {additionalCaseClosureSnapshot} from './additional-case-care.js';
import {evaluateGastroDisposition} from './gastro-closure-v5.js';
import {clinicalWorkflow} from '../ui/clinical-workflow.js';

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
test('HEPAT accepts an equivalent INR and glucose panel and shares its status with Ruta clínica',async()=>{
 const f=fixture('HEPAT-001');
 try{
  for(const text of ['/signos','¿Tiene alergias?', '/examen general','/examen inspection','/examen palpation','/diagnostico hepatitis aguda'])
   await f.post(text);
  const requested=await f.post('/estudio g_encef_liver');
  const repeated=await f.post('/estudio g_hepat_inr');
  assert.equal(requested.clinical[0].status,'pending');
  assert.equal(repeated.clinical[0].status,'pending');
  assert.equal(f.session.read().patient.orders.length,1,'equivalent orders share one specimen');
  const stage=()=>clinicalWorkflow(f.session.read()).steps.find(s=>s.id==='studies').status;
  assert.equal(stage(),'partial');
  f.session.advance(180);await f.session.flush();
  const result=f.session.read().patient.orders[0];
  assert.match(result.result,/INR 1,2; glucemia normal/);
  assert.equal(stage(),'done');
  assert(!f.session.clinicalHintRequirements().some(r=>r.type==='study'));
  assert.notEqual(f.next().action?.kind,'study');
  assert.equal((await f.post('/estudio g_hepat_inr')).clinical[0].status,'executed');
  assert.equal(f.session.read().patient.orders.length,1);
 }finally{f.session.dispose();}
});
test('history instructions use an authored question that satisfies the actual closure gate',async()=>{
 const f=fixture();await f.post('/signos');const first=f.next();assert.equal(first.action.kind,'history');
 await f.post(first.action.command);assert.notEqual(f.next().key,first.key);f.session.dispose();
});
test('all 55 initial sessions can calculate their own requirement projection',()=>{
 for(const c of content.cases){const f=fixture(c.id);try{assert(f.next()?.action,c.id);}finally{f.session.dispose();}}
});
test('PUD history hint satisfies the existing gate through actual dialogue',async()=>{
 const f=fixture('PUD-001');await f.post('/signos');const h=f.next();
 assert.equal(h.action.kind,'history');await f.post(h.action.command);
 assert(!f.session.clinicalHintRequirements().some(r=>r.type==='history'));f.session.dispose();
});
test('reperfusion hint starts with the actual pulmonary thrombolysis evidence gate',()=>{
 const f=fixture('RESP-06');const state=f.session.read();
 const hint=selectClinicalHint({patient:state.patient,caseData:f.caseData,content,clock:state.clock,
  requirements:[{type:'treatment',anyOf:[['alteplase_pe']]}]});
 assert.equal(hint.action?.kind,'history');assert.equal(hint.action.id,'bleeding');f.session.dispose();
});
test('an explicit onset question works after a different topic in the native interview',async()=>{
 const f=fixture('NEUR-01');await f.post('¿Tiene alergias a medicamentos?');
 const state=f.session.read();
 const c={...f.caseData,clinicalPolicy:{...f.caseData.clinicalPolicy,eligibility:{
  alteplase_stroke:{requiresHistory:['onset']}}}};
 const hint=selectClinicalHint({patient:state.patient,caseData:c,content,clock:state.clock,
  requirements:[{type:'treatment',anyOf:[['alteplase_stroke']]}]});
 await f.post(hint.action.command);
 assert(f.session.read().patient.intentHistory.some(r=>r.id==='onset'));f.session.dispose();
});
test('destination selection falls back to an authored safe option when the primary route is blocked',()=>{
 const f=fixture('DIARR-001'),p=f.session.read().patient;p.liveVitals.sys=95;
 assert.equal(hintDestination(p,f.caseData,d=>evaluateGastroDisposition(additionalCaseClosureSnapshot(p,f.caseData,d))),'observacion');
 f.session.dispose();
});
test('a refused transfer preserves the order of the remaining clinical checklist',async()=>{
 const f=fixture('APP-001');await f.post('/signos');await f.post('¿Tiene alergias a medicamentos?');
 for(const region of ['general','abdomen']){
  const techniques=region==='general'?['general']:['inspection','auscultation','percussion','palpation'];
  for(const technique of techniques)await f.post('/examen '+region+' '+technique);
 }
 assert.equal(f.next().action.kind,'study');
 const reply=await f.post('/disposicion quirofano');
 assert.equal(reply.clinical[0].receipt.reasonCode,'diagnosis-missing');
 assert.equal(f.next().action.kind,'study');f.session.dispose();
});
test('routed dose phrases remain executable after the actual nursing scanner normalization',async()=>{
 const f=fixture('NEUR-06'),p=f.session.read().patient;
 const h=selectClinicalHint({patient:p,caseData:f.caseData,content,clock:f.session.read().clock,
  requirements:[{type:'treatment',anyOf:[['lorazepam']]}]});
 const reply=await f.post(h.action.command);
 assert(!reply.clinical.some(x=>x.status==='rejected'),JSON.stringify(reply));f.session.dispose();
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
test('a pending indispensable study prevents a premature closure instruction',async()=>{
 const f=fixture();await f.post('/estudio hepatograma');
 const h=selectClinicalHint({patient:f.session.read().patient,caseData:f.caseData,content,clock:f.session.read().clock,destination:'sala',
  requirements:[{type:'study',anyOf:[['hepatograma']]},{type:'closure',destination:'sala'}]});
 assert.equal(h.action.kind,'wait');assert.equal(h.chargeable,false);f.session.dispose();
});
test('neurological region instructions include the real directed exam and Glasgow',async()=>{
 const f=fixture('NEUR-01'),h=selectClinicalHint({patient:f.session.read().patient,caseData:f.caseData,content,clock:f.session.read().clock,
  requirements:[{type:'examination',ids:['neurological:all']}]});
 for(const text of h.action.commands)await f.post(text);
 assert(!f.session.clinicalHintRequirements().some(r=>r.type==='examination'&&r.ids?.includes('neurological:all')));
 f.session.dispose();
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
