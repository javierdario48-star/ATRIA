import test from 'node:test';
import assert from 'node:assert/strict';
import {physicalExamRows,initializeExamination,executePhysicalExam} from './physical-exam.js';
import {readNeurologicalState,readPatientObservations} from './patient-observations.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
import {advanceClinicalComplications} from './clinical-policy-effects.js';

const allCases=[...respiratoryPack.cases,...cardiologyPack.cases,...neurologyPack.cases];
const caseFor=id=>allCases.find(c=>c.id===id);
function patient(c){
 const [sys,dia]=c.vitals.bp.split('/').map(Number),v={...c.vitals,sys,dia};delete v.bp;
 return {uid:'exam-policy:'+c.id,caseId:c.id,liveVitals:v,baselineVitals:{...v},treatments:[],administrationLog:[],
  neurology:structuredClone(c.clinicalPolicy.neurologyBaseline),
  observationResponses:structuredClone(c.clinicalPolicy.observationResponses||[]),
  policyState:{nativeMinute:0,complications:[]}};
}
function perform(p,c,id,regionId,eventId=id){
 return executePhysicalExam(p,c,{eventId,patientUid:p.uid,actorId:'doctor',intent:{kind:'exam.record',id,regionId}},{nativeMinute:p.policyState.nativeMinute});
}

test('all authored policy cases expose their own physical findings without changing patient or content',()=>{
 for(const c of allCases){
  const p=patient(c),before=structuredClone({p,c});
  const rows=physicalExamRows(c.id,p,'auscultation','thorax',0,c);
  assert.equal(rows.find(r=>r.organ==='Corazón')?.text,c.physicalExam.heart,c.id);
  assert.equal(rows.find(r=>r.organ==='Pulmones')?.text,c.physicalExam.lungs,c.id);
  assert.deepEqual({p,c},before,'observing findings is pure');
 }
});

test('policy respiratory inspection and percussion refer to the selected thorax',()=>{
 const c=caseFor('RESP-04'),p=patient(c);
 assert.match(physicalExamRows(c.id,p,'inspection','thorax',0,c)[0].text,/músculos accesorios.*espiración prolongada/);
 assert.match(physicalExamRows(c.id,p,'percussion','thorax',0,c)[0].text,/Hipersonoridad bilateral/);
});

test('new policy exam completion records general and directed thorax evidence without requiring GI examination',()=>{
 const c=caseFor('RESP-04'),p=patient(c);initializeExamination(p);
 assert.equal(perform(p,c,'general','general').status,'executed');
 assert.equal(p.examDone,false);
 const done=perform(p,c,'auscultation','thorax','lungs-proof');
 assert.equal(done.status,'executed');assert.equal(p.examDone,true);
 assert.equal(p.examFindings.thorax.auscultation.patientUid,p.uid);
 assert.equal(p.examFindings.thorax.auscultation.eventId,'lungs-proof');
 assert.equal(p.examFindings.abdomen,undefined);
});

test('neurological policy examination preserves authored deficit and full event provenance',()=>{
 const c=caseFor('NEUR-01'),p=patient(c);initializeExamination(p);
 perform(p,c,'general','general');
 const result=perform(p,c,'neurological','neurological','neuro-proof');
 assert.equal(result.status,'executed');assert.equal(p.examDone,true);
 assert.match(JSON.stringify(result.receipt.rows),/Afasia expresiva/);
 assert.match(JSON.stringify(result.receipt.rows),/Brazo derecho 2\/5/);
 assert.doesNotMatch(JSON.stringify(p.examFindings.general),/pregunta dónde está|no está bien orientado/,
  'expressive aphasia must not be relabeled confusion');
 assert.equal(p.examFindings.neurological.neurological.eventId,'neuro-proof');
 assert.equal(readNeurologicalState(p,0).verbal,4,'aphasia score is authored clinical state');
});

test('active severe-asthma fatigue is visible on re-examination while earlier evidence remains unchanged',()=>{
 const c=caseFor('RESP-04'),p=patient(c);initializeExamination(p);
 perform(p,c,'auscultation','thorax','before-fatigue');
 const old=structuredClone(p.examFindings.thorax.auscultation);
 p.policyState={nativeMinute:35,complications:[{id:'resp04_respiratory_fatigue',effect:'respiratory-fatigue',status:'active',severity:.9,onsetAt:20}]};
 const before=structuredClone(p),rows=physicalExamRows(c.id,p,'auscultation','thorax',35,c);
 assert.match(rows.find(r=>r.organ==='Pulmones').text,/silente|silencio auscultatorio/i);
 assert.match(physicalExamRows(c.id,p,'inspection','thorax',35,c)[0].text,/agotamiento|menor esfuerzo/i);
 assert.match(physicalExamRows(c.id,p,'general','general',35,c)[0].text,/agotamiento|somnolencia/i);
 assert.deepEqual(p,before);assert.deepEqual(p.examFindings.thorax.auscultation,old);
 perform(p,c,'auscultation','thorax','after-fatigue');
 assert.equal(p.examFindings.thorax.auscultation.eventId,'after-fatigue');
 assert.equal(p.examLog.length,2);
 assert.deepEqual(p.examLog[0].rows,old.rows,'the first event retains its sampled findings after re-examination');
});

test('fatigue in pulmonary edema does not invent a bronchospastic silent chest',()=>{
 const c=caseFor('CARD-03'),p=patient(c);
 p.policyState={nativeMinute:35,complications:[{id:'unrelated-id',effect:'respiratory-fatigue',status:'active',severity:1,onsetAt:20}]};
 const rows=physicalExamRows(c.id,p,'auscultation','thorax',35,c);
 assert.match(rows.find(r=>r.organ==='Pulmones').text,/Crepitantes/);
 assert.doesNotMatch(rows.find(r=>r.organ==='Pulmones').text,/tórax silente|silencio auscultatorio/i);
});

test('clinical neurology is independent from personality and policy reads do not erase neuromuscular weakness',()=>{
 for(const id of ['NEUR-01','NEUR-07','NEUR-08','NEUR-09','NEUR-10']){
  const c=caseFor(id),p=patient(c),before=structuredClone(p);
  p.variation={personality:{conversation:'reserved',comprehension:'simple'}};
  assert.deepEqual(readNeurologicalState(p,90),c.clinicalPolicy.neurologyBaseline,id);
  assert.deepEqual(readPatientObservations(p,id,90).neuro,c.clinicalPolicy.neurologyBaseline,id);
  assert.equal(readPatientObservations(p,id,90).trend,'unchanged','initial neurological deficits are part of the baseline');
  delete p.variation;assert.deepEqual(p,before);
 }
});

test('intubation makes verbal Glasgow unassessable while motor weakness remains a separate observation',()=>{
 const c=caseFor('NEUR-09'),p=patient(c);
 const t={id:'intubation',patientUid:p.uid,sourceEventId:'tube',route:'procedure',kind:'procedure.performed',
  completionStatus:'completed',dose:{amount:1,unit:'procedimiento'},administeredAtNativeMinute:5};
 p.treatments.push(t);
 const result=readNeurologicalState(p,6);
 assert.equal(result.verbal,null);assert.equal(result.eye,4);assert.equal(result.motor,6);
 assert.equal(result.limbStrength,2);assert.equal(p.neurology.verbal,5);
 assert.equal(readNeurologicalState(p,4).verbal,5,'future procedures do not affect an earlier assessment');
});

test('current policy neurological observation can worsen without mutating the baseline',()=>{
 const c=caseFor('NEUR-07'),p=patient(c),baseline=structuredClone(p.neurology);
 p.policyState={nativeMinute:35,complications:[],neurology:{...baseline,eye:2,verbal:3,motor:5}};
 assert.deepEqual(readNeurologicalState(p,35),p.policyState.neurology);
 assert.deepEqual(p.neurology,baseline);
 const rows=physicalExamRows(c.id,p,'neurological','neurological',35,c);
 assert.match(rows.find(r=>r.organ==='Consciencia actual').text,/E2.*V3.*M5.*10/);
 assert.match(rows.find(r=>r.organ==='Signos meníngeos').text,/Rigidez de nuca/);
});

test('an unmodeled directed exam requirement cannot be silently satisfied',()=>{
 const c=structuredClone(caseFor('RESP-04')),p=patient(c);initializeExamination(p);
 c.clinicalPolicy.closure.requiredExams=['not-modeled:all'];
 perform(p,c,'general','general');perform(p,c,'auscultation','thorax');
 assert.equal(p.examDone,false);
});

test('the current seizure exam records postictal improvement without repeating the ictal baseline as a current finding',()=>{
 const c=caseFor('NEUR-06'),p=patient(c);initializeExamination(p);
 perform(p,c,'general','general','ictal-exam');
 const original=structuredClone(p.examFindings.general.general);
 for(const id of ['lorazepam','levetiracetam']){
  const t={id,patientUid:p.uid,sourceEventId:id,route:'iv',dose:{amount:1,unit:'mg'},administeredAtNativeMinute:0};
  p.treatments.push(t);p.administrationLog.push(structuredClone(t));
 }
 p.policyState.nativeMinute=30;
 const current=perform(p,c,'general','general','postictal-exam');
 assert.match(current.receipt.rows.find(r=>r.organ==='Aspecto general').text,/posictal|postictal/i);
 assert.doesNotMatch(current.receipt.rows.find(r=>r.organ==='Aspecto general').text,/Actividad tónico-clónica generalizada/i);
 const neuro=perform(p,c,'neurological','neurological','postictal-neuro').receipt.rows;
 assert.match(neuro.find(r=>r.organ==='Actividad convulsiva actual').text,/sin.*convulsi|no.*convulsi/i);
 assert.match(neuro.find(r=>r.organ==='Consciencia actual').text,/E3.*V3.*M5.*11/);
 assert.doesNotMatch(neuro.find(r=>r.organ==='Fuerza').text,/durante convulsión/);
 assert.deepEqual(p.examLog[0].rows,original.rows,'earlier ictal examination remains a historical sample');
});

test('native non-respiratory complications appear in the physician exam and fade only after actual rescue progression',()=>{
 const c=caseFor('NEUR-08'),p=patient(c);initializeExamination(p);
 p.variation={complicationCandidates:[{id:c.clinicalPolicy.complications[0].id}]};
 advanceClinicalComplications(p,c,25);advanceClinicalComplications(p,c,35);
 let rows=perform(p,c,'neurological','neurological','seizure-complication').receipt.rows;
 assert.match(rows.find(r=>r.organ==='Evolución clínica actual')?.text||'',/Crisis focal prolongada/);
 assert.match(rows.find(r=>r.organ==='Consciencia actual').text,/E2.*V2.*M4.*8/);
 for(const id of ['lorazepam','levetiracetam']){
  const t={id,patientUid:p.uid,sourceEventId:id,route:'iv',dose:{amount:1,unit:'mg'},administeredAtNativeMinute:35};
  p.treatments.push(t);p.administrationLog.push(structuredClone(t));
 }
 advanceClinicalComplications(p,c,45);
 rows=perform(p,c,'neurological','neurological','recovering-complication').receipt.rows;
 assert.match(rows.find(r=>r.organ==='Evolución clínica actual')?.text||'',/recuperación parcial/i);
 advanceClinicalComplications(p,c,55);
 rows=perform(p,c,'neurological','neurological','recovered-complication').receipt.rows;
 assert.equal(rows.find(r=>r.organ==='Evolución clínica actual'),undefined);
 assert.match(rows.find(r=>r.organ==='Consciencia actual').text,/E4.*V4.*M6.*14/);
 assert.match(rows.find(r=>r.organ==='Memoria').text,/Alteración marcada/,'underlying encephalitis is not cured');
});
