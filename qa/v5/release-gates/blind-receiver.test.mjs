// Release-blocking counterexamples, explicitly separate from content-only V2 certification.
// Run: node --test qa/v5/release-gates/blind-receiver.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardSession} from '../../../src/v5/clinical/guard-session.js';
import {clinicalContent as content} from '../../../src/v5/server/content.js';

async function surgicalOpinion(caseId,diagnosis='apendicitis aguda',hiddenDiagnosis=null){
 const candidateContent=hiddenDiagnosis?{...content,cases:content.cases.map(c=>
  c.id===caseId?{...c,dx:[hiddenDiagnosis]}:c)}:content;
 const s=createGuardSession({roomId:'blind-'+caseId,mode:'solo',actorId:'doctor',actorName:'Doctor',
  content:{...candidateContent,receiverCases:content.cases},patient:{uid:'P',caseId},resolveContext:()=>({patientUid:'P'})});
 let seq=0;const send=text=>s.post({id:'msg-'+(++seq),text});
 try{
  await send('/diagnostico '+diagnosis);await send('/signos');
  for(const technique of ['general','inspection','auscultation','percussion','palpation'])await send('/examen '+technique);
  if(caseId==='APP-001'){
   await send('Enfermera una vía');await send('/estudio app_us');
   await send('Enfermera ceftriaxona 1 g y metronidazol 500 mg');
   s.advance(95);await s.flush();await send('/reevaluar');
  }
  await send('/consulta cirugia');s.advance(3.5);await s.flush();
  const state=s.read();
  return {verdict:state.patient.consults.at(-1),patient:state.patient,progress:state.progress};
 }finally{s.dispose();}
}
test('changing only the hidden diagnostic label cannot change the active receiver verdict with identical documented care',async()=>{
 const correct=await surgicalOpinion('APP-001'),mistaken=await surgicalOpinion('APP-001','apendicitis aguda','cirrosis');
 for(const key of ['diagnosis','liveVitals','examFindings','orders','administrationLog'])
  assert.deepEqual(mistaken.patient[key],correct.patient[key],'identical public care: '+key);
 assert.equal(correct.verdict.accepted,true);
 assert.equal(mistaken.verdict.accepted,true,'receiver must not consult the hidden diagnostic answer');
 assert.equal(mistaken.verdict.decision,correct.verdict.decision);
 for(const v of [correct,mistaken]){
  assert.equal(v.patient.caseEnded,false,'an opinion does not close care');
  assert.equal(v.progress.receipts.length,0);
  assert(!v.patient.treatments.some(t=>t.id==='surgery'),'consultation is not a performed operation');
 }
});
test('an incompatible declared hypothesis is refused by the same receiver on every hidden patient',async()=>{
 for(const id of ['APP-001','CIRR-001']){
  const r=await surgicalOpinion(id,'cirrosis');
  assert.equal(r.verdict.accepted,false);
  assert.equal(r.verdict.reasonCode,'destination-not-indicated');
 }
});
