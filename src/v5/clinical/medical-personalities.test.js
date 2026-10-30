// All these personalities use the exact production guard executor.
// None of the bots imports a clinical writer or bypasses the nurse.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {CLINICAL_BOT_PLAYBOOK as book,CLINICAL_BOT_PROFILES,clinicalBotAssessmentActions} from './clinical-bot-playbooks.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const cases=Object.keys(CLINICAL_EXECUTORS),modes=['solo','apprentice','coop'];
const report=[];
let serial=0;
function doctor(caseId,mode,skill){
 const uid='bot:'+caseId+':'+mode+':'+skill,roomId='medical-qa-'+(++serial);
 const names=mode==='coop'?[{id:'a',name:'Bot médico'},{id:'b',name:'Bot cooperante'}]:[{id:'a',name:'Bot médico'}];
 const session=createGuardSession({roomId,mode,actorId:'a',actorName:'Bot médico',
  patient:{uid,caseId},content,members:names,resolveContext:()=>({patientUid:uid})});
 let seq=0;const trace=[];
 return {session,trace,async post(text){
  const id='medical-'+(++seq),before=session.read().clock;
  const result=await session.post({id,text});
  trace.push({id,text,atNativeMinute:before.nativeMinute,
   clinical:result.clinical.map(x=>({kind:x.kind,id:x.id,status:x.status,reason:x.reason??null}))});
  return result;
 },advance:async sec=>{session.advance(sec);await session.flush();
  trace.push({action:'advance',seconds:sec,atNativeMinute:session.read().clock.nativeMinute});}};
}
async function assess(bot,caseId,skill){
 const c=content.cases.find(x=>x.id===caseId);
 for(const action of clinicalBotAssessmentActions(c,skill))await bot.post(action);
}
async function scenario(bot,caseId,mode,skill){
 const plan=book[caseId],s=bot.session;
 let clinicalDelay=0;
 assert(plan,'there must be exactly one knowledgeable playbook for '+caseId);
 const start=s.read(),initial={...start.patient.liveVitals};
 if(skill==='beginner'){
  await assess(bot,caseId,skill);
  const attempt=await bot.post('/disposicion '+plan.dest);
  const current=s.read();
  assert.equal(current.progress.xp,0,'partial clinical exam must not mint XP');
  assert(!current.patient.closure,'incomplete work cannot create a closure');
  assert(['rejected','pending'].includes(attempt.clinical[0]?.status));
  report.push({caseId,mode,skill,missing:current.closure?.missing?.length??0,xp:0});
  return;
 }
 if(skill==='dangerous'){
  assert.equal((await bot.post('/disposicion alta')).clinical[0].status,'rejected');
  await bot.post('Enfermera ceftriaxona 99 g');
  await bot.post('Enfermera transfusion 99 unidades');
  assert.equal(s.read().patient.administrationLog.length,0,'rejected doses cannot treat or poison');
  await bot.post('Enfermera una vía');
  const forbidden=await bot.post('Enfermera Ringer 500000 ml');
  assert.equal(forbidden.clinical[0]?.status,'rejected');
  assert.equal(s.read().exposure.confirmedCrystalloidMl,0);
  for(let i=0;i<8;i++){
   const response=await bot.post('Enfermera Ringer 1000 ml');
   assert.equal(response.clinical[0]?.status,'pending');
   await bot.advance(.85);
  }
  const before=s.read(),exposure=before.exposure.confirmedCrystalloidMl;
  assert.equal(exposure,8000,'eight actually administered IV doses, not just orders');
  const c=content.cases.find(x=>x.id===caseId);
  const harm=crystalloidOverloadOffsets(before.patient,c);
  assert(harm.spo2<0&&harm.rr>0,'massive IV fluid must be able to harm respiration');
  await bot.advance(30);
  const after=s.read();
  assert(after.patient.liveVitals.spo2<=initial.spo2+6,'massive IV overhydration cannot cure hypoxemia');
  assert.equal(after.progress.xp,0);
  report.push({caseId,mode,skill,ml:exposure,spo2After:after.patient.liveVitals.spo2,
   rrAfter:after.patient.liveVitals.rr,adverse:confirmedClinicalMissteps(after.patient,c).adverseCount});
  return;
 }
 if(skill==='slow'){
  // The delay has a real opportunity cost: 65 game minutes for an
  // emergency and 90 for a stable outpatient, not merely three minutes.
  const urgent=new Set(['PERI-SEC-001','PERI-TER-001','CHOLANG-001',
   'VARIX-001','MESI-001','PANC-001','HDA-001','LGIB-001']);
  clinicalDelay=urgent.has(caseId)?65:90;
  await bot.advance(clinicalDelay);
 }
 await assess(bot,caseId,skill);
 if(skill==='expert'){
  await bot.advance(plan.wait/2);
  if(!s.read().patient.caseEnded)await bot.post('/reevaluar');
  await bot.advance(plan.wait/2);
 }else await bot.advance(plan.wait);
 if(!s.read().patient.caseEnded)await bot.post('/reevaluar');
 let state=s.read();
 if(!state.patient.caseEnded&&!state.eligibleDestinations.includes(plan.dest)&&caseId==='PERI-SEC-001'){
  await bot.advance(40);await bot.post('/reevaluar');state=s.read();
 }
 if(!state.patient.caseEnded&&plan.consult){
  await bot.post(plan.consult);await bot.advance(3.5);state=s.read();
 }
 if(!state.patient.caseEnded&&state.eligibleDestinations.includes(plan.dest)){
  const closure=await bot.post('/disposicion '+plan.dest);
  assert.equal(closure.clinical[0]?.status,'executed',caseId+' must close by authenticated destination');
 }
 state=s.read();
 // Smart actors must succeed; slow doctors either succeed or earn no
 // fictitious reward if deterioration/death prevents closure.
 if(skill==='expert'||skill==='competent'){
  assert.equal(state.patient.closure?.closed,true,caseId+' '+mode+': '+JSON.stringify(state.closure?.missing));
  assert.equal(state.patient.closure.destination,plan.dest);
  assert(state.progress.xp>0,'smart doctor earns clinically proven XP');
  assert.equal(state.progress.receipts.length,1);
  if(skill==='expert'){
   assert(state.patient.reassessments>=2,'expert follows the response through serial assessments');
   assert(state.patient.procedures.monitor?.connected,'expert monitors actual patient evolution');
  }
 }else if(!state.patient.closure?.closed){
  assert.equal(state.progress.xp,0);
  assert.equal(state.progress.receipts.length,0);
 }
 const xp=state.progress.xp;
 const repeat=await bot.post('/disposicion '+plan.dest);
 assert.equal(s.read().progress.xp,xp,'repeated disposition must never duplicate XP');
 assert(s.read().progress.receipts.length<=1,'at most one authenticated closure');
 report.push({caseId,mode,skill,destination:state.patient.closure?.destination||null,
  died:!!state.patient.patientDied,spent:plan.wait+clinicalDelay,xp,
  quality:state.patient.closure?.quality?.score??null,reassessments:state.patient.reassessments});
}
for(const mode of modes)for(const caseId of cases)
 for(const skill of CLINICAL_BOT_PROFILES){
  test('medical-personality '+mode+' '+caseId+' '+skill,async()=>{
   const bot=doctor(caseId,mode,skill);
   try{await scenario(bot,caseId,mode,skill);const row=report.at(-1);
    row.trace=bot.trace;row.patientUid=bot.session.read().patient.uid;}
   finally{bot.session.dispose();}
  });
 }
test('375 authentic clinical personas cover all 25 cases, 3 local/team modes and 5 skill levels',()=>{
 assert.equal(cases.length,25);
 assert.equal(report.length,375);
 assert.equal(new Set(report.map(x=>x.caseId)).size,25);
 assert.deepEqual([...new Set(report.map(x=>x.mode))].sort(),[...modes].sort());
 assert.equal(report.filter(x=>x.skill==='expert'&&x.xp>0).length,75);
 assert.equal(report.filter(x=>x.skill==='competent'&&x.xp>0).length,75);
 for(const caseId of cases)for(const mode of modes){
  const expert=report.find(x=>x.caseId===caseId&&x.mode===mode&&x.skill==='expert'),
   competent=report.find(x=>x.caseId===caseId&&x.mode===mode&&x.skill==='competent');
  assert(expert.trace.length>competent.trace.length,'expert and competent must execute genuinely distinct plans');
  assert(expert.reassessments>competent.reassessments);
  assert(expert.quality>=competent.quality,'safety screening/serial assessment cannot reduce clinical quality');
 }
 fs.mkdirSync('qa/v5-medical-bot-results',{recursive:true});
 fs.writeFileSync('qa/v5-medical-bot-results/physician-personas.json',
  JSON.stringify({scope:'25 cases / 3 game modes / 5 physician profiles',runs:report},null,2));
 console.log('ATRIA_MEDICAL_375_PERSONALITY_BOTS='+JSON.stringify({
  cases:cases.length,scenarios:report.length,
  skillCount:Object.fromEntries(CLINICAL_BOT_PROFILES
   .map(skill=>[skill,report.filter(x=>x.skill===skill).length])),
  slowUnclosed:report.filter(x=>x.skill==='slow'&&!x.destination).map(x=>x.caseId+'-'+x.mode),
  excessFluid:report.filter(x=>x.skill==='dangerous').map(x=>({caseId:x.caseId,mode:x.mode,ml:x.ml,adverse:x.adverse}))
 }));
});
