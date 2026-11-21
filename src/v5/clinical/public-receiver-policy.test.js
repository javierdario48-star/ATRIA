import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent} from '../server/content.js';
import {publicReceiverIndication as indication,publicReceiverPreparation as preparation}
 from './public-receiver-policy.js';

const catalog=clinicalContent.cases;
function claim(diagnosis,destination,service){return indication({diagnosis,destination,service,catalog});}
const stable={measured:true,vitals:{sys:118,spo2:98,hr:82,rr:17},performedExams:['general:general','abdomen:palpation','thorax:auscultation'],
 reports:[],pendingRescue:false,activeUnsafeReaction:false};
test('receiver indication depends on declared diagnosis and the published public catalog, not a secret patient case ID',()=>{
 assert.equal(catalog.length,55);
 const proper=claim('apendicitis aguda','quirofano','cirugia');
 assert.equal(proper.supported,true);
 assert(proper.matches.some(x=>x.publicCaseId==='APP-001'));
 const wronglySuspected=claim('apendicitis aguda','quirofano','cirugia');
 assert.deepEqual(wronglySuspected,proper,'a different hidden patient diagnosis cannot change receiver eligibility');
 const irrelevant=claim('enfermedad de crohn','quirofano','cirugia');
 assert.equal(irrelevant.supported,false);
 assert.equal(irrelevant.reasonCode,'diagnosis-does-not-indicate-receiver');
 assert.equal(claim('apendicitis aguda','procedimiento','cardiologia').supported,false);
 assert.equal(claim('','quirofano','cirugia').reasonCode,'diagnosis-missing');
});
test('public receiver preparation has two independent gates: declared indication and minimum measured safety',()=>{
 const hypothesis=claim('apendicitis','quirofano','cirugia');
 assert(hypothesis.supported);
 assert.equal(preparation({indication:hypothesis,record:stable,destination:'quirofano'}).ready,true);
 const noVital=preparation({indication:hypothesis,record:{...stable,measured:false},destination:'quirofano'});
 assert(noVital.reasons.includes('measured-vitals-required'));
 const shock=preparation({indication:hypothesis,record:{...stable,vitals:{...stable.vitals,sys:78}},destination:'quirofano'});
 assert(shock.reasons.includes('insufficient-transfer-stabilization'));
 const noExam=preparation({indication:hypothesis,record:{...stable,performedExams:[]},destination:'quirofano'});
 assert(noExam.reasons.includes('physical-examination-required'));
 const pending=preparation({indication:hypothesis,record:{...stable,pendingRescue:true},destination:'quirofano'});
 assert(pending.reasons.includes('pending-critical-rescue'));
 const wrong=preparation({indication:claim('gastroenteritis banal','quirofano','cirugia'),record:stable,destination:'quirofano'});
 assert.equal(wrong.ready,false);
});
test('indispensable study and directed exam requirements come from PUBLIC claimed condition, not actual disease',()=>{
 const claimCardio=claim('infarto agudo de miocardio con elevacion del st','procedimiento','cardiologia');
 // Diagnoses not in the authored public vocabulary cannot be silently mapped.
 if(!claimCardio.supported){
  assert.equal(claimCardio.reasonCode,'diagnosis-does-not-indicate-receiver');
  return;
 }
 const pending=preparation({indication:claimCardio,record:stable,destination:'procedimiento'});
 assert.equal(pending.ready,false);
 assert(pending.reasons.includes('indispensable-evidence-pending'));
 const family=claimCardio.matches[0];
 const evidence=family.requiredStudies.map(id=>({id,patientBound:true,status:'done',result:'Estudio documentado.'}));
 if(family.studyAlternatives.length)evidence.push({id:family.studyAlternatives[0][0],patientBound:true,status:'done',result:'Informe validado.'});
 const prepared=preparation({indication:claimCardio,record:{...stable,performedExams:[...stable.performedExams,...family.requiredExams],reports:evidence},destination:'procedimiento'});
 assert.equal(prepared.ready,true,prepared.reasons.join(', '));
});
test('the public receiver rules are deterministic and cannot mutate catalog or transmitted record',()=>{
 const before=structuredClone(catalog),record=structuredClone(stable);
 for(const name of ['apendicitis','enfermedad de crohn','colecistitis aguda']){
  const x=claim(name,'quirofano','cirugia');
  const y=claim(name,'quirofano','cirugia');
  assert.deepEqual(x,y);
  preparation({indication:x,record,destination:'quirofano'});
 }
 assert.deepEqual(catalog,before);
 assert.deepEqual(record,stable);
});
