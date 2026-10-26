import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {createGuardSession} from './guard-session.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {CLINICAL_BOT_PLAYBOOK as playbook} from './clinical-bot-playbooks.js';
const load=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const ids=Object.keys(CLINICAL_EXECUTORS);
const modes=['solo','apprentice','coop'];
let seq=0;
function bot(caseId,mode,kind){
 const n=++seq,uid=caseId+'-'+mode+'-'+kind+'-'+n;
 const members=mode==='coop'?[{id:'doctor',name:'Doctor bot'},{id:'partner',name:'Observer bot'}]:
  [{id:'doctor',name:'Doctor bot'}];
 const session=createGuardSession({roomId:'stress-'+n,mode,actorId:'doctor',actorName:'Doctor bot',
  patient:{uid,caseId},content,members,resolveContext:()=>({patientUid:uid})});
 let id=0;
 return {s:session,post:async text=>session.post({id:'b'+(++id),text}),
  async advance(sec){session.advance(sec);await session.flush();}};
}
const exam=['general','inspection','auscultation','percussion','palpation'].map(x=>'/examen '+x);
assert.deepEqual(new Set(Object.keys(playbook)),new Set(ids),
 'The bots must cover exactly every actual certified clinical executor.');
const trace=[];
async function intelligent(f,caseId,mode){
 const cfg=playbook[caseId];
 for(const question of cfg.history)await f.post(question);
 await f.post('/signos');
 for(const section of exam)await f.post(section);
 await f.post('/diagnostico '+cfg.dx);
 for(const study of cfg.studies||[])await f.post('/estudio '+study);
 for(const text of cfg.meds)await f.post(text);
 if(cfg.consult)await f.post(cfg.consult);
 await f.advance(cfg.wait);
 await f.post('/reevaluar');
 const status=f.s.read();
 assert.equal(!!status.patient.patientDied,false,caseId+' '+mode+' competent bot died');
 assert.equal(status.patient.pendingTreatments.length,0,
  caseId+' '+mode+' interventions were never administered');
 assert(status.eligibleDestinations.includes(cfg.dest),
  caseId+' '+mode+' destination unexpectedly unavailable: '+JSON.stringify(status.closure?.missing||status.eligibleDestinations));
 const ack=await f.post('/disposicion '+cfg.dest);
 assert.equal(ack.clinical[0]?.status,'executed',caseId+' '+mode+' successful decision must close');
 const end=f.s.read();
 assert.equal(end.patient.caseEnded,true);
 assert.equal(end.patient.closure.destination,cfg.dest);
 assert.equal(end.progress.receipts.length,1);
 assert(end.progress.xp>0);
 assert(end.patient.closure.quality.score>0);
 const original=end.progress.xp;
 const retry=await f.post('/disposicion '+cfg.dest);
 assert.equal(retry.clinical[0]?.status,'rejected');
 assert.equal(f.s.read().progress.xp,original);
 assert.equal(f.s.read().progress.receipts.length,1);
 if(['quirofano','procedimiento'].includes(cfg.dest)){
  assert(!end.patient.treatments.some(t=>t.id==='source_control'||t.id==='surgery'),
   'handoff is not a performed operation');
 }
 trace.push({caseId,mode,strategy:'intelligent',xp:original,destination:cfg.dest,
  score:end.patient.closure.quality.score,confirmed:end.patient.administrationLog.length});
}
async function chaotic(f,caseId,mode){
 const initial=f.s.read(),caseData=content.cases.find(c=>c.id===caseId);
 const early=await f.post('/disposicion alta');
 assert.equal(early.clinical[0]?.status,'rejected');
 await f.post('Enfermera no administrar Ringer');
 const invalid=await f.post('Enfermera ceftriaxona 99 g');
 assert.equal(invalid.clinical[0]?.status,'rejected');
 assert.equal(f.s.read().patient.administrationLog.length,0);
 // Prescriptions must not have a physiological effect before a verified receipt.
 await f.post('Enfermera una vía');
 const first=await f.post('Enfermera Ringer 500 ml');
 assert.equal(first.clinical[0]?.status,'pending');
 assert.equal(f.s.read().exposure.confirmedCrystalloidMl,0);
 await f.advance(.79);
 assert.equal(f.s.read().exposure.confirmedCrystalloidMl,0);
 await f.advance(.02);
 assert.equal(f.s.read().exposure.confirmedCrystalloidMl,500);
 for(let i=1;i<8;i++){
  const response=await f.post('Enfermera Ringer 500 ml');
  assert.equal(response.clinical[0]?.status,'pending');
  await f.advance(.82);
 }
 const result=f.s.read(),doses=result.patient.administrationLog.filter(x=>x.id==='fluid');
 assert.equal(result.exposure.confirmedCrystalloidMl,4000);
 assert.equal(doses.length,8);
 assert.equal(new Set(doses.map(x=>x.sourceEventId)).size,8);
 assert(Number.isFinite(result.patient.liveVitals.spo2));
 assert(Number.isFinite(result.patient.liveVitals.sys));
 assert.equal(result.progress.receipts.length,0,
  'chaotic treatment or erroneous disposition minted clinical XP');
 assert.equal(!!result.patient.caseEnded,false);
 // Do not assert identical harm for all seven native disease writers. Record
 // measured physiology and adverse clinical evaluation per case instead.
 const risk=confirmedClinicalMissteps(result.patient,caseData);
 assert(Number.isInteger(risk.adverseCount));
 trace.push({caseId,mode,strategy:'chaotic',doses:doses.length,
  spo2Before:initial.patient.liveVitals.spo2,spo2After:result.patient.liveVitals.spo2,
  rrBefore:initial.patient.liveVitals.rr,rrAfter:result.patient.liveVitals.rr,
  risk:risk.adverseCount,xp:result.progress.xp});
}
async function neglected(f,caseId,mode){
 const initial=f.s.read().patient;
 await f.advance(180);
 const final=f.s.read();
 assert.equal(final.progress.receipts.length,0);
 assert.equal(final.progress.xp,0);
 assert.equal(final.patient.administrationLog.length,0);
 assert(!final.patient.closure?.closed);
 const keys=['hr','rr','sys','spo2'];
 for(const k of keys)assert(Number.isFinite(final.patient.liveVitals[k]),caseId+' missing '+k);
 trace.push({caseId,mode,strategy:'neglect',died:!!final.patient.patientDied,
  changes:keys.filter(k=>Math.abs(final.patient.liveVitals[k]-initial.liveVitals[k])>.01),
  clinicalSeconds:180});
}
for(const mode of modes)for(const caseId of ids){
 for(const [strategy,run] of [['intelligent',intelligent],['chaotic',chaotic],['neglect',neglected]]){
  test('ATRIA intelligent/chaotic bot '+mode+' '+caseId+' '+strategy,async()=>{
   const f=bot(caseId,mode,strategy);
   try{await run(f,caseId,mode);}finally{f.s.dispose();}
  });
 }
}
test('all seven clinical engines are tested with all three local session modes and three strategies',()=>{
 assert.equal(ids.length,13);
 assert.equal(modes.length,3);
 assert.equal(ids.length*modes.length*3,63);
 console.log('ATRIA_MULTIMODE_CLINICAL_BOTS='+JSON.stringify(trace));
});
