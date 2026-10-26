// All these personalities use the exact production guard executor.
// None of the bots imports a clinical writer or bypasses the nurse.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {CLINICAL_BOT_PLAYBOOK as book} from './clinical-bot-playbooks.js';
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
 let seq=0;
 return {session,post:text=>session.post({id:'medical-'+(++seq),text}),
  advance:async sec=>{session.advance(sec);await session.flush();}};
}
const sections=['general','inspection','auscultation','percussion','palpation'];
async function assess(bot,plan,advanced){
 for(const question of advanced?plan.history:plan.history.slice(0,1))await bot.post(question);
 await bot.post('/signos');
 for(const part of advanced?sections:['general','palpation'])await bot.post('/examen '+part);
 await bot.post('/diagnostico '+plan.dx);
 if(advanced){
  for(const study of plan.studies||[])await bot.post('/estudio '+study);
  for(const medication of plan.meds||[])await bot.post(medication);
  if(plan.consult)await bot.post(plan.consult);
 }
}
async function scenario(bot,caseId,mode,skill){
 const plan=book[caseId],s=bot.session;
 let clinicalDelay=0;
 assert(plan,'there must be exactly one knowledgeable playbook for '+caseId);
 const start=s.read(),initial={...start.patient.liveVitals};
 if(skill==='ignorant'){
  assert.equal((await bot.post('/disposicion alta')).clinical[0].status,'rejected');
  await bot.post('Enfermera ceftriaxona 99 g');
  await bot.post('Enfermera transfusion 99 unidades');
  await bot.post('/diagnostico dolor de cabeza');
  await bot.advance(25);
  const state=s.read();
  assert.equal(state.patient.administrationLog.length,0,'unvalidated doses cannot treat or poison');
  assert.equal(state.progress.xp,0);
  assert.equal(state.progress.receipts.length,0);
  report.push({caseId,mode,skill,closed:state.patient.caseEnded,correct:false,xp:0});
  return;
 }
 if(skill==='beginner'){
  await assess(bot,plan,false);
  const attempt=await bot.post('/disposicion '+plan.dest);
  const current=s.read();
  assert.equal(current.progress.xp,0,'partial clinical exam must not mint XP');
  assert(!current.patient.closure,'incomplete work cannot create a closure');
  assert(['rejected','pending'].includes(attempt.clinical[0]?.status));
  report.push({caseId,mode,skill,missing:current.closure?.missing?.length??0,xp:0});
  return;
 }
 if(skill==='reckless'){
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
 await assess(bot,plan,true);
 await bot.advance(plan.wait);
 if(!s.read().patient.caseEnded)await bot.post('/reevaluar');
 let state=s.read();
 if(!state.patient.caseEnded&&!state.eligibleDestinations.includes(plan.dest)&&caseId==='PERI-SEC-001'){
  await bot.advance(40);await bot.post('/reevaluar');state=s.read();
 }
 if(!state.patient.caseEnded&&state.eligibleDestinations.includes(plan.dest)){
  const closure=await bot.post('/disposicion '+plan.dest);
  assert.equal(closure.clinical[0]?.status,'executed',caseId+' must close by authenticated destination');
 }
 state=s.read();
 // Smart actors must succeed; slow doctors either succeed or earn no
 // fictitious reward if deterioration/death prevents closure.
 if(skill==='intelligent'){
  assert.equal(state.patient.closure?.closed,true,caseId+' '+mode+': '+JSON.stringify(state.closure?.missing));
  assert.equal(state.patient.closure.destination,plan.dest);
  assert(state.progress.xp>0,'smart doctor earns clinically proven XP');
  assert.equal(state.progress.receipts.length,1);
 }else if(!state.patient.closure?.closed){
  assert.equal(state.progress.xp,0);
  assert.equal(state.progress.receipts.length,0);
 }
 const xp=state.progress.xp;
 const repeat=await bot.post('/disposicion '+plan.dest);
 assert.equal(s.read().progress.xp,xp,'repeated disposition must never duplicate XP');
 assert(s.read().progress.receipts.length<=1,'at most one authenticated closure');
 report.push({caseId,mode,skill,destination:state.patient.closure?.destination||null,
  died:!!state.patient.patientDied,spent:plan.wait+clinicalDelay,xp});
}
for(const mode of modes)for(const caseId of cases)
 for(const skill of ['ignorant','beginner','intelligent','slow','reckless']){
  test('medical-personality '+mode+' '+caseId+' '+skill,async()=>{
   const bot=doctor(caseId,mode,skill);
   try{await scenario(bot,caseId,mode,skill);}
   finally{bot.session.dispose();}
  });
 }
test('375 authentic clinical personas cover all 25 cases, 3 local/team modes and 5 skill levels',()=>{
 assert.equal(cases.length,25);
 assert.equal(report.length,375);
 assert.equal(new Set(report.map(x=>x.caseId)).size,25);
 assert.deepEqual([...new Set(report.map(x=>x.mode))].sort(),[...modes].sort());
 assert.equal(report.filter(x=>x.skill==='intelligent'&&x.xp>0).length,75);
 fs.mkdirSync('qa/v5-medical-bot-results',{recursive:true});
 fs.writeFileSync('qa/v5-medical-bot-results/physician-personas.json',
  JSON.stringify({scope:'25 cases / 3 game modes / 5 physician profiles',runs:report},null,2));
 console.log('ATRIA_MEDICAL_375_PERSONALITY_BOTS='+JSON.stringify({
  cases:cases.length,scenarios:report.length,
  skillCount:Object.fromEntries(['ignorant','beginner','intelligent','slow','reckless']
   .map(skill=>[skill,report.filter(x=>x.skill===skill).length])),
  slowUnclosed:report.filter(x=>x.skill==='slow'&&!x.destination).map(x=>x.caseId+'-'+x.mode),
  excessFluid:report.filter(x=>x.skill==='reckless').map(x=>({caseId:x.caseId,mode:x.mode,ml:x.ml,adverse:x.adverse}))
 }));
});
