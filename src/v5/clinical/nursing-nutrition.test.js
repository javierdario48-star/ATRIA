import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {clinicalWorkflow} from '../ui/clinical-workflow.js';
import {createClinicalInterface} from '../ui/clinical-controller.js';

const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const members=[{id:'doctor-a',name:'Doctor A'},{id:'doctor-b',name:'Doctor B'}];
const colleague=Symbol('doctor-b credential');

function fixture(caseId='APP-001',checkpoint=null){
 const patient={uid:'P1',caseId};
 const session=createGuardSession({roomId:'nutrition',mode:'coop',actorId:'doctor-a',actorName:'Doctor A',
  patient,content,members,checkpoint,
  authenticate:token=>token===colleague?{id:'doctor-b',roomId:'nutrition'}:null,
  resolveContext:({targetPatientUid})=>({patientUid:!targetPatientUid||targetPatientUid===patient.uid?patient.uid:null})});
 return {patient,session};
}

test('nurse asks about oral intake after assessment in the authored NPO cases',async()=>{
 for(const caseId of ['APP-001','CHOLE-001','PANC-001','ILEO-001','MESI-001','CIRR-001','PERI-SEC-001']){
  const {session}=fixture(caseId);
  try{
   assert.equal(clinicalWorkflow(session.read()).cue,null,caseId+' before assessment');
   await session.post({id:'assessment',text:'¿Desde cuándo tiene dolor?'});
   const cue=clinicalWorkflow(session.read()).cue;
   if(['CIRR-001','PERI-SEC-001'].includes(caseId))assert.notEqual(cue?.id,'oral-nutrition',caseId);
   else{
    assert.equal(cue?.id,'oral-nutrition',caseId);
    assert.match(cue.text,/darle de comer.*ayunas/i);
   }
  }finally{session.dispose();}
 }
});

test('nursing questions and decisions directed at another patient leave oral intake unresolved',async()=>{
 const {session}=fixture();
 try{
  await session.post({id:'assessment',text:'¿Desde cuándo tiene dolor?'});
  for(const [id,text,targetPatientUid] of [
   ['fasting-question','Enfermera, ¿dejalo en ayuno?'],
   ['feeding-question','Enfermera, ¿puede comer?'],
   ['conditional','Enfermera, si puede comer'],
   ['negated','Enfermera, no autorizo alimentación por boca'],
   ['wrong-patient','Enfermera, autorizo alimentación por boca','P2']
  ]){
   const ack=await session.post({id,text,targetPatientUid});
   assert.equal(ack.clinical.length,0,id);
  }
  const state=session.read();
  assert.equal(state.oralNutrition?.decision,null);
  assert.equal(clinicalWorkflow(state).cue?.id,'oral-nutrition');
  assert.deepEqual(state.patient.treatments,[]);
 }finally{session.dispose();}
});

test('oral nutrition follows the authenticated decision and replay preserves it across restore',async()=>{
 const {session}=fixture('ILEO-001');
 let restored;
 try{
  await session.post({id:'assessment',text:'¿Desde cuándo tiene dolor?'});
  const fasting=await session.post({id:'fast',text:'Enfermera, nada por boca'});
  assert.equal(fasting.clinical[0].status,'executed');
  assert.equal(fasting.clinical[0].receipt.therapyId,'npo');
  assert.notEqual(clinicalWorkflow(session.read()).cue?.id,'oral-nutrition');
  session.advance(2);
  const before=session.read(),command={id:'permit',text:'Enfermera, sí, puede comer',targetPatientUid:'P1'};
  const permission=await session.post(command,colleague);
  assert.deepEqual(permission.clinical.map(x=>[x.kind,x.id,x.status]),[['nutrition.record','oral','executed']]);
  const decision={decision:'oral',patientUid:'P1',actorId:'doctor-b',sourceEventId:'nutrition:doctor-b:permit:0',
   recordedAtRealSecond:before.clock.clinicalMinute,recordedAtNativeMinute:before.clock.nativeMinute};
  assert.deepEqual(permission.clinical[0].receipt.oralNutritionDecision,decision);
  const after=session.read();
  assert.deepEqual(after.oralNutrition.decision,decision);
  assert.notEqual(clinicalWorkflow(after).cue?.id,'oral-nutrition');
  assert.deepEqual(after.patient.treatments,before.patient.treatments);
  assert.deepEqual(after.patient.administrationLog,before.patient.administrationLog);
  assert.deepEqual(after.closure,before.closure);
  assert.deepEqual(after.progress,before.progress);

  restored=fixture('ILEO-001',await session.checkpoint()).session;
  assert.deepEqual(restored.read().oralNutrition.decision,decision);
  assert.notEqual(clinicalWorkflow(restored.read()).cue?.id,'oral-nutrition');
  assert.deepEqual(await restored.post(command,colleague),permission);
  assert.equal(restored.read().messages.filter(row=>row.id==='ack:doctor-b:permit:0').length,1);

  const renewed=await restored.post({id:'fast-again',text:'Enfermera, no, dejalo en ayunas'});
  assert.equal(renewed.clinical[0].status,'executed');
  assert.equal(renewed.clinical[0].receipt.sourceEventId,fasting.clinical[0].receipt.sourceEventId);
  const last=restored.read();
  assert.deepEqual(last.oralNutrition.decision,{...decision,decision:'npo',actorId:'doctor-a',
   sourceEventId:'nutrition:doctor-a:fast-again:0'});
  assert.equal(last.patient.treatments.filter(row=>row.id==='npo').length,1);
  assert.deepEqual(await restored.post(command,colleague),permission);
  assert.deepEqual(restored.read().oralNutrition,last.oralNutrition);
 }finally{restored?.dispose();session.dispose();}
});

test('a pre-nutrition checkpoint recovers the original fasting decision from its native receipt',async()=>{
 const {session}=fixture('PANC-001');
 let restored;
 try{
  await session.post({id:'assessment',text:'¿Desde cuándo tiene dolor?'});
  const ack=await session.post({id:'legacy-fast',text:'Enfermera, NPO'});
  assert.equal(ack.clinical[0]?.status,'executed');
  const saved=JSON.parse(JSON.stringify(await session.checkpoint(),
   (key,value)=>key==='oralNutritionDecision'?undefined:value));
  restored=fixture('PANC-001',saved).session;
  const state=restored.read();
  assert.deepEqual(state.oralNutrition?.decision,{decision:'npo',patientUid:'P1',actorId:'doctor-a',
   sourceEventId:ack.clinical[0].receipt.sourceEventId,recordedAtRealSecond:0,recordedAtNativeMinute:0});
  assert.notEqual(clinicalWorkflow(state).cue?.id,'oral-nutrition');
 }finally{restored?.dispose();session.dispose();}
});

test('bedside treatment buttons submit one patient-bound decision and display the confirmed instruction',async()=>{
 const {patient,session}=fixture('CHOLE-001');
 const nodes={modalContent:{dataset:{}}};
 const document={getElementById:id=>nodes[id]??null,querySelector:()=>null};
 let sequence=0;
 const controller=createClinicalInterface({document,session:()=>session,
  open:html=>{if(html.includes('id="oralNutrition"'))nodes.oralNutrition={innerHTML:''};},close(){},notify(){},
  send:(text,{patientUid})=>session.post({id:'button-'+(++sequence),text,targetPatientUid:patientUid})});
 try{
  controller.openSection(patient,'treatment');
  const html=nodes.oralNutrition?.innerHTML||'';
  assert.match(html,/data-action="nutrition-npo"/);
  assert.match(html,/data-action="nutrition-oral"/);
  const button=action=>({closest:selector=>selector==='button'?{dataset:{action}}:null});
  await Promise.all([controller.handle(button('nutrition-oral')),controller.handle(button('nutrition-oral'))]);
  const state=session.read();
  assert.equal(sequence,1);
  assert.equal(state.room.events.find(x=>x.type==='chat.posted').message.patientUid,patient.uid);
  assert.equal(state.oralNutrition.decision.decision,'oral');
  assert.match(nodes.oralNutrition.innerHTML,/Alimentación por boca autorizada/);
  await controller.handle(button('nutrition-npo'));
  assert.equal(session.read().oralNutrition.decision.decision,'npo');
  assert.match(nodes.oralNutrition.innerHTML,/Nada por boca/);
 }finally{session.dispose();}
});
