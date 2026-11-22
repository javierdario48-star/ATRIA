// Release-blocking counterexamples, explicitly separate from content-only V2 certification.
// Run: node --test qa/v5/release-gates/blind-receiver.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardSession} from '../../../src/v5/clinical/guard-session.js';
import {clinicalContent as content} from '../../../src/v5/server/content.js';

async function surgicalOpinion(caseId,diagnosis='apendicitis aguda'){
 const s=createGuardSession({roomId:'blind-'+caseId,mode:'solo',actorId:'doctor',actorName:'Doctor',
  content,patient:{uid:'P',caseId},resolveContext:()=>({patientUid:'P'})});
 let seq=0;const send=text=>s.post({id:'msg-'+(++seq),text});
 try{
  await send('/diagnostico '+diagnosis);await send('/signos');
  for(const technique of ['general','inspection','auscultation','percussion','palpation'])await send('/examen '+technique);
  await send('/consulta cirugia');s.advance(3.5);await s.flush();
  const state=s.read();
  return {verdict:state.patient.consults.at(-1),patient:state.patient,progress:state.progress};
 }finally{s.dispose();}
}
test('active receiving service accepts the same publicly supported surgical hypothesis on a different hidden disease',async()=>{
 const correct=await surgicalOpinion('APP-001'),mistaken=await surgicalOpinion('CIRR-001');
 assert.equal(correct.verdict.accepted,true);
 assert.equal(mistaken.verdict.accepted,true,'service cannot reject because the real patient is cirrhotic');
 assert.equal(mistaken.verdict.decision,correct.verdict.decision);
 for(const v of [correct,mistaken]){
  assert.equal(v.patient.caseEnded,false,'an opinion does not close care');
  assert.equal(v.progress.receipts.length,0);
  assert.equal(v.patient.administrationLog.length,0,'consultation is not a performed operation');
 }
});
test('an incompatible declared hypothesis is refused by the same receiver on every hidden patient',async()=>{
 for(const id of ['APP-001','CIRR-001']){
  const r=await surgicalOpinion(id,'cirrosis');
  assert.equal(r.verdict.accepted,false);
  assert.equal(r.verdict.reasonCode,'destination-not-indicated');
 }
});
