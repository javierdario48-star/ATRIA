import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardSession} from './guard-session.js';
import {createSurgicalConsultation} from './surgical-consultation.js';
import {publicReceiverRecord,evaluatePublicReceiver} from './public-receiver-record.js';
import {clinicalContent as content} from '../server/content.js';

async function prepared(caseId='APP-001'){
 const roomId='public-chart-'+caseId,uid=roomId+':P';
 const s=createGuardSession({roomId,mode:'solo',actorId:'doctor',actorName:'Doctor',content,
  patient:{uid,caseId},resolveContext:()=>({patientUid:uid})});
 let sequence=0;const post=text=>s.post({id:'cmd-'+(++sequence),text});
 await post('/diagnostico apendicitis aguda');await post('/signos');
 for(const x of ['general','inspection','auscultation','percussion','palpation'])await post('/examen '+x);
 await post('Enfermera una vía');await post('Enfermera ceftriaxona 1 g y metronidazol 500 mg');
 await post('/estudio app_us');s.advance(95);await s.flush();await post('/reevaluar');
 return {s,post,uid};
}
test('the active receiving executor cannot read a hidden case object or its native readiness callback',async()=>{
 const f=await prepared();
 try{
  const patient=structuredClone(f.s.read().patient),before=structuredClone(patient);
  const forbidden=new Proxy({}, {get(){throw Error('private case access');}});
  const service=createSurgicalConsultation(patient,forbidden,{cases:content.cases,
   executed:(cmd,receipt)=>({status:'executed',receipt}),readiness:()=>{throw Error('private readiness access');}});
  const cmd={eventId:'opinion',actorId:'doctor',patientUid:f.uid,intent:{kind:'consult.request',id:'cirugia'}};
  assert.equal(service.request(cmd,{clinicalMinute:95,nativeMinute:95}).status,'pending');
  const task=service.due({}, {clinicalMinute:100})[0];assert(task);
  service.finish(task,98.5,98.5);
  assert.equal(patient.consults.at(-1).accepted,true);
  assert.deepEqual(patient.liveVitals,before.liveVitals);assert.equal(patient.caseEnded,false);
  assert.deepEqual(patient.administrationLog,before.administrationLog);
 }finally{f.s.dispose();}
});
test('public chart omits hidden case identity, unmanifested complications, susceptibility and private drug advisories',async()=>{
 const f=await prepared();
 try{
  const p=f.s.read().patient,record=publicReceiverRecord(p);
  const changed=structuredClone(p);changed.caseId='SECRET';changed.phys={...(changed.phys||{}),secretTruth:'SECRET'};
  changed.variation={secret:'SECRET'};changed.severeAllergies=['SECRET'];
  changed.administrationLog[0].clinicalAdvisories=[{message:'SECRET',caseId:'SECRET'}];
  assert.deepEqual(publicReceiverRecord(changed),record);
  assert.equal(Object.hasOwn(record,'caseId'),false);
 }finally{f.s.dispose();}
});
test('explicitly contradictory communicated imaging prevents acceptance without consulting hidden truth',async()=>{
 const f=await prepared();
 try{
  const record=publicReceiverRecord(f.s.read().patient);
  const options={destination:'quirofano',service:'cirugia',transfer:true};
  assert.equal(evaluatePublicReceiver(record,content.cases,options).accepted,true);
  record.orders.find(o=>o.id==='app_us').result='Sin evidencia de apendicitis aguda.';
  const refusal=evaluatePublicReceiver(record,content.cases,options);
  assert.equal(refusal.accepted,false);assert.equal(refusal.reasonCode,'communicated-evidence-contradicts-hypothesis');
 }finally{f.s.dispose();}
});
test('wrong but publicly prepared surgical hypothesis can be received on a different actual disease and earns zero diagnostic XP',async()=>{
 const f=await prepared('CIRR-001');
 try{
  // No hidden-state mutation: all preparation above used genuine native commands.
  const before=f.s.read().patient;
  const request=await f.post('/disposicion quirofano');
  assert.equal(request.clinical[0].status,'pending',JSON.stringify(request.clinical));
  f.s.advance(3.5);await f.s.flush();const state=f.s.read();
  assert.equal(state.patient.closure?.destination,'quirofano',JSON.stringify(state.closure));
  assert.equal(state.patient.uid,before.uid);assert.equal(state.patient.caseId,'CIRR-001');
  assert.equal(state.patient.diagnosis,'apendicitis aguda');assert.equal(state.patient.closure.quality.diagnosticFactor,0);
  assert.equal(state.progress.xp,0);assert.equal(state.progress.receipts.length,1);
  assert(!state.patient.treatments.some(x=>x.id==='surgery'));
  await f.post('/disposicion quirofano');assert.equal(f.s.read().progress.receipts.length,1);
 }finally{f.s.dispose();}
});
test('a prepared specialty critical-care destination retains its published receiving team without a generic ICU refusal',async()=>{
 const c=content.cases.find(c=>c.id==='CARD-02'),uid='patient';
 const s=createGuardSession({roomId:'hint-bot-CARD-02',mode:'solo',actorId:'hint-bot',actorName:'QA',content,
  patient:{uid,caseId:c.id},resolveContext:()=>({patientUid:uid})});
 let seq=0;
 try{
  for(let n=0;n<120&&!s.read().patient.caseEnded;n++){
   const action=s.clinicalHint().action;assert(action,'the prepared pathway must remain actionable');
   if(action.kind==='wait'){s.advance(2);await s.flush();continue;}
   for(const text of action.kind==='examination'?action.commands:action.kind==='diagnosis'?['/diagnostico '+c.dx[0]]:[action.command]){
    const reply=await s.post({id:'step-'+(++seq),text});assert(!reply.clinical.some(x=>x.status==='rejected'),JSON.stringify(reply.clinical));
   }
   s.advance(.25);await s.flush();
  }
  assert.equal(s.read().patient.closure?.destination,'uti');
  assert(s.read().patient.consults.some(x=>x.id==='cardiologia'&&x.accepted));
  assert.equal(s.read().progress.receipts.length,1);
 }finally{s.dispose();}
});
