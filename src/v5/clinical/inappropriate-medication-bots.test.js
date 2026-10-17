import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
const load=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
for(const [caseId,medicine] of [['CIRR-001','ceftriaxona 1 g'],['APP-001','furosemida 40 mg']]){
 test(caseId+' bot documents administered mismatched IV medicine with a real adverse decision penalty',async()=>{
  const p={uid:caseId+'-wrong',caseId},c=content.cases.find(x=>x.id===caseId);
  const s=createGuardSession({roomId:'wrong-'+caseId,mode:'solo',actorId:'bot',actorName:'Bot',
   patient:p,content,resolveContext:()=>({patientUid:p.uid})});
  let i=0;const post=text=>s.post({id:'m-'+(++i),text});
  try{
   await post('Enfermera una vía');
   const ack=await post('Enfermera '+medicine);
   assert.equal(ack.clinical[0].status,'pending');
   s.advance(1.51);await s.flush();
   const state=s.read();
   assert.equal(state.patient.administrationLog.length,1);
   const evaluated=confirmedClinicalMissteps(state.patient,c);
   assert(evaluated.adverseCount>=1,medicine+' missing decision penalty');
   assert(evaluated.flags.some(x=>/Ceftriaxona|Furosemida/.test(x)));
   assert(state.closure.quality.penalty>=5);
   assert.equal(state.patient.patientDied,undefined,'one unrelated dose does not become automatic death');
  }finally{s.dispose();}
 });
}
test('repeated but independently verified furosemide doses are counted as excessive clinical decisions',async()=>{
 const p={uid:'CIRR-furo-excess',caseId:'CIRR-001'};
 const s=createGuardSession({roomId:'excess-diuretic',mode:'solo',actorId:'bot',actorName:'Bot',
 patient:p,content,resolveContext:()=>({patientUid:p.uid})});
 let i=0;const post=text=>s.post({id:'m-'+(++i),text});
 try{
  await post('Enfermera una vía');
  for(let n=0;n<5;n++){
   const ack=await post('Enfermera furosemida 40 mg');
   assert.equal(ack.clinical[0].status,'pending');
   s.advance(1.51);await s.flush();
  }
  const state=s.read(),risk=confirmedClinicalMissteps(state.patient,content.cases.find(x=>x.id==='CIRR-001'));
  assert.equal(state.exposure.byDrug.furosemide.administrations,5);
  assert.equal(state.exposure.byDrug.furosemide.totalAmount,200);
  assert(risk.flags.some(x=>x.includes('acumuladas')));
  assert(risk.adverseCount>=1);
  assert(state.closure.quality.penalty>=5);
 }finally{s.dispose();}
});
