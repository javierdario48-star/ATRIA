// Player commands through the production clinical session; never mutate a
// patient or substitute an acceptance. Spatial/durable coverage is explicit.
import {mkdirSync,writeFileSync,readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {clinicalContent as content} from '../../src/v5/server/content.js';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
import {createWorld} from '../../src/v5/app/world.js';
import {clinicalInterventionEligibility} from '../../src/v5/clinical/native-medication-eligibility.js';
import {confirmedClinicalTreatment} from '../../src/v5/clinical/receipts.js';
import {GASTRO_CASE_RULES} from '../../src/v5/clinical/gastro-expansion-policies.js';
import {CASE_CLOSURE_RULES_487} from '../../src/clinical/case-completion-487.js';
import {deriveClinicalCertificationPlan,treatmentCommand,runClinicalCaseScenario} from './certify-clinical-cases.mjs';
export const TRANSFER_BOT_PROFILES=['competent','missing-dx','wrong-dx','insufficient-preparation','wrong-destination','slow','iatrogenic','nursing-recovery','closure-recovery','multiplayer'];
const copy=x=>structuredClone(x);
export function transferCertificationFingerprint(){
 const digest=createHash('sha256').update('atria-transfer-certificate-v2\n').update(JSON.stringify(content));
 const sourceRoot=new URL('../../src/',import.meta.url);
 function visit(directory,prefix=''){
  for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   const path=prefix+entry.name,url=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
   if(entry.isDirectory())visit(url,path+'/');
   else if(/\.(?:js|json)$/.test(path)&&!/(?:\.test\.|(?:^|\/)__tests__\/)/.test(path))
    digest.update(path+'\0').update(readFileSync(url)).update('\0');
  }
 }
 visit(sourceRoot);
 for(const name of ['transfer-certification.mjs','certify-clinical-cases.mjs'])
  digest.update(name+'\0').update(readFileSync(new URL(name,import.meta.url)));
 return digest.digest('hex');
}
export async function runTransferBot(c,{profile='competent',mode='solo'}={}){
 const plan=deriveClinicalCertificationPlan(c,content);
 if(profile==='multiplayer'){
  const row=await runClinicalCaseScenario(c,{content,mode,recovery:true,profile:'competent',seed:'transfer-v1:'+c.id+':'+mode});
  const carePassed=['history','exam','studies','treatment','closure','xp'].every(key=>row.checks?.[key]===true)&&
   Object.values(row.integrityChecks||{}).every(value=>value!==false);
  return {caseId:c.id,profile,mode,passed:carePassed,strictCertificatePassed:row.passed,authority:row.authority,outcome:row.outcome,
   certificateScope:'clinical-destination-flow',checks:row.checks,failures:carePassed?[]:row.failures,
   strictFailures:row.failures,missing:row.readiness?.missing,xp:row.final?.xp,closed:row.closureReceipt?.closed??false};
 }
 let s,world,sequence=0,restored=false,replay=null,unsafeVitals=null;
 const commands=[],failures=[],checks={},uid='transfer:'+c.id+':'+profile;
 const patient={uid,caseId:c.id,variationSeed:'transfer-v1:'+c.id};
 const base={roomId:uid,mode,actorId:'doctor',actorName:'Médica',content,
  members:mode==='coop'?[{id:'doctor',name:'Médica'},{id:'other',name:'Colega'}]:[{id:'doctor',name:'Médica'}],
  resolveContext:()=>({patientUid:uid})};
 const nursing=profile==='nursing-recovery';
 const factory=checkpoint=>createGuardSession({...base,patient,checkpoint,
  ...(world?{nursing:{enqueue:t=>world.enqueueNurseJourney(t),takeArrivals:()=>world.takeNurseArrivals(uid),accept:r=>world.acceptNurseClinicalResult(r)}}:{})});
 const read=()=>s.read();
 async function send(text,id='bot-'+(++sequence)){
  const ack=await s.post({id,text});
  commands.push({id,text,status:ack.status,clinical:copy(ack.clinical||[]),routeError:ack.routeError});
  return ack;
 }
 async function advance(seconds){
  if(world&&world.nurseJourneySnapshot().some(t=>['queued','travelling','at-bed'].includes(t.stage))){
   for(let time=0;time<seconds-1e-9;time+=1/60){
    const dt=Math.min(1/60,seconds-time);world.step(dt);s.finishNurseArrivals();s.advance(dt);
   }
  }else s.advance(seconds);
  await s.flush();
 }
 async function restore(){
  const checkpoint=await s.checkpoint(),scene=world?.checkpoint(),before=read();s.dispose();
  if(scene)world=createWorld(content,{id:'doctor',name:'Médica',scrubColor:'navy'},scene);
  s=factory(checkpoint);const after=read();
  checks.recovery=JSON.stringify(after.patient)===JSON.stringify(before.patient)&&JSON.stringify(after.progress)===JSON.stringify(before.progress);
  restored=true;
 }
 try{
  if(nursing){world=createWorld(content,{id:'doctor',name:'Médica',scrubColor:'navy'});world.enterGuard({mode,caseId:c.id,patientUid:uid});}
  s=factory(null);const initial=copy(read().patient.liveVitals);
  if(profile==='slow')await advance(180);
  for(const q of plan.history)await send(q.text);
  await send('/monitor conectar');
  for(const text of plan.exams)await send(text);
  if(profile==='missing-dx'||profile==='wrong-dx'){
   if(profile==='wrong-dx')await send('/diagnostico resfriado comun');
   const ack=await send('/disposicion '+plan.destination);
   checks.initialRefusal=ack.clinical?.some(x=>x.status==='rejected')&&read().progress.xp===0&&!read().patient.caseEnded;
  }
  const diagnosis=c.id==='VARIX-001'&&profile==='missing-dx'?'Hemorragia digestiva alta':plan.diagnosis;
  await send('/diagnostico '+diagnosis);
  if(profile==='wrong-destination'){
   const rule=c.clinicalPolicy?.closure||GASTRO_CASE_RULES[c.id]||CASE_CLOSURE_RULES_487[c.id];
   const wrong=['alta','quirofano','procedimiento','uti','sala','observacion'].find(id=>!(rule?.destinations||[plan.destination]).includes(id));
   const ack=await send('/disposicion '+wrong);
   checks.initialRefusal=ack.clinical?.some(x=>x.status==='rejected')&&!read().patient.caseEnded;
  }
  if(profile==='insufficient-preparation'){
   const ack=await send('/disposicion '+plan.destination);
   checks.initialRefusal=ack.clinical?.some(x=>x.status==='rejected')&&!read().patient.caseEnded;
  }
  if(profile==='iatrogenic'){
   await send('Enfermera una vía');
   // A therapeutic dose of heparin/diuretic is not universally harmful.
   // Repeated confirmed volume overload is a genuine unsafe decision in
   // every case, with an already authored physiological adverse response.
   for(let dose=0;dose<8&&!read().patient.caseEnded;dose++){
    await send('Enfermera Ringer 1000 ml');await advance(1);
   }
   await advance(30);unsafeVitals=copy(read().patient.liveVitals);
  }
  const requested=new Set(),studies=new Set();let lastAttempt=-Infinity,lastReassessment=-Infinity;
  if(!c.clinicalPolicy){
   for(const text of plan.legacyMedicationCommands||[])await send(text);
  }else await send('Enfermera una vía');
  while(read().clock.clinicalMinute<1440&&!read().patient.caseEnded){
   const state=read(),p=state.patient,at=state.clock.clinicalMinute;
   for(const id of plan.studyIds)if(!studies.has(id)&&!(c.studies.find(x=>x.id===id)?.requiresCompletedTreatments||[])
    .some(t=>!confirmedClinicalTreatment(p,t,state.clock.nativeMinute))){
    await send('/estudio '+id);studies.add(id);
   }
   if(c.clinicalPolicy)for(const id of plan.treatmentIds){
    if(id==='iv'||requested.has(id)||clinicalInterventionEligibility(p,c,id,state.clock))continue;
    const ack=await send(treatmentCommand(c,content,id));
    if(ack.clinical?.some(x=>['pending','executed'].includes(x.status)))requested.add(id);
   }
   if(profile==='nursing-recovery'&&!restored&&at>2)await restore();
   if(at-lastReassessment>=10){await send('/reevaluar');lastReassessment=at;}
   if(at>=plan.minimumObservationSeconds&&at-lastAttempt>=10){
    const command={id:'destination-'+(++sequence),text:'/disposicion '+plan.destination};
    const ack=await send(command.text,command.id);lastAttempt=at;
    if(profile==='closure-recovery'&&!restored&&ack.clinical.some(x=>x.status==='pending')){replay=command;await restore();await send(command.text,command.id);}
   }
   if(read().patient.caseEnded)break;
   await advance(2);
  }
  let final=read(),p=final.patient;
  checks.noDuplicateXP=final.progress.receipts.length<=1;
  checks.monitorRecorded=p.lastVitalsKnown?.patientUid===uid;
  checks.examination=p.examLog?.length>0;
  checks.ordersAnswered=!final.room.events.some(e=>e.clinical?.some(x=>x.status==='unconfirmed'));
  checks.closed=p.closure?.closed===true&&p.closure.destination===plan.destination;
  checks.xp=checks.closed&&final.progress.xp===p.closure.xp&&final.progress.receipts.length===1;
  checks.physiologyChanged=Object.keys(initial).some(key=>Math.abs(initial[key]-p.liveVitals[key])>.01||
   unsafeVitals&&Math.abs(initial[key]-unsafeVitals[key])>.01)||p.patientDied===true;
  if(checks.closed){
   const before=copy(final.progress);await send('/disposicion '+plan.destination);
   if(profile==='closure-recovery'){if(!restored)await restore();if(replay)await send(replay.text,replay.id);}
   await advance(5);final=read();checks.noDuplicateXP&&=JSON.stringify(before)===JSON.stringify(final.progress);
  }
  const adversarial=['slow','iatrogenic'].includes(profile);
  if(!adversarial&&!checks.closed)failures.push('competent recovery route did not close');
  if(!adversarial&&!checks.xp)failures.push('missing unique closure XP');
  if(!checks.noDuplicateXP)failures.push('duplicate XP');
  if(['missing-dx','wrong-dx','insufficient-preparation','wrong-destination'].includes(profile)&&!checks.initialRefusal)failures.push('missing initial refusal');
  if(nursing&&(!checks.recovery||world.nurseJourneySnapshot().some(t=>['queued','travelling','at-bed'].includes(t.stage))))failures.push('nursing recovery not settled');
  if(profile==='iatrogenic'&&!checks.physiologyChanged)failures.push('no observed physiological response');
  return {caseId:c.id,profile,mode,passed:!failures.length,authority:'createGuardSession',checks,failures,
   outcome:p.patientDied?'native-death':checks.closed?'accepted-destination':'alive-unclosed',closed:checks.closed,xp:final.progress.xp,
   missing:final.closure?.missing,initialVitals:initial,finalVitals:p.liveVitals,unsafeVitals,
   evolution:checks.physiologyChanged?'native-change':'no-delta-observed',
   administrations:p.administrationLog.map(x=>({id:x.id,eventId:x.sourceEventId,at:x.administeredAtNativeMinute})),
   consultations:p.consults.map(x=>({id:x.id,accepted:x.accepted,reasonCode:x.reasonCode})),
   commands};
 }catch(error){return {caseId:c.id,profile,mode,passed:false,failures:[error.stack]};}
 finally{s?.dispose();world?.enterLobby();}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),option=name=>args.includes(name)?args[args.indexOf(name)+1]:null;
 const profiles=(option('--profiles')||TRANSFER_BOT_PROFILES.filter(x=>x!=='multiplayer').join(',')).split(',');
 if(profiles.some(x=>!TRANSFER_BOT_PROFILES.includes(x)))throw Error('unknown transfer profile');
 const ids=option('--cases')?.split(','),cases=content.cases.filter(c=>!ids||ids.includes(c.id));
 const output=resolve(option('--output')||'qa/v5-transfer-results');mkdirSync(output,{recursive:true});
 const certificationFingerprint=transferCertificationFingerprint();
 const rows=[];let reused=0,executed=0;
 for(const profile of profiles)for(const [index,c] of cases.entries()){
  const mode=profile==='multiplayer'?index%2?'competitive':'coop':index%2?'apprentice':'solo';
  const path=resolve(output,c.id+'-'+profile+'.json');
  if(args.includes('--resume')&&existsSync(path)){
   const previous=JSON.parse(readFileSync(path));
   if(previous.caseId===c.id&&previous.profile===profile&&previous.mode===mode&&previous.passed&&
    previous.certificationFingerprint===certificationFingerprint){rows.push(previous);reused++;continue;}
  }
  const row={...await runTransferBot(c,{profile,mode}),certificationFingerprint};
  rows.push(row);executed++;writeFileSync(path,JSON.stringify(row,null,2)+'\n');
  console.log(JSON.stringify({caseId:c.id,profile,passed:row.passed,outcome:row.outcome,failures:row.failures,missing:row.passed?undefined:row.missing}));
 }
 const summary={revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),certificationFingerprint,caseCount:cases.length,
  cases:cases.map(c=>c.id),profiles,executions:rows.length,executedNow:executed,reusedPassedCheckpoints:reused,passed:rows.filter(x=>x.passed).length,
  certifiedCases:cases.filter(c=>rows.filter(x=>x.caseId===c.id).every(x=>x.passed)).length,
  outcomes:Object.fromEntries(['accepted-destination','native-death','alive-unclosed'].map(key=>[key,rows.filter(x=>x.outcome===key).length])),
  failures:rows.filter(x=>!x.passed).map(x=>({caseId:x.caseId,profile:x.profile,failures:x.failures,missing:x.missing}))};
 writeFileSync(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
 if(summary.passed!==summary.executions)process.exitCode=1;
}
