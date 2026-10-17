// C12.f gate: adversarial patient trajectories using the REAL V5 session.
// Characterization is always reported; --require-parity exits nonzero on gaps.
// Do not mistake catalog rules, pending orders or a low SpO2 for a confirmed death.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
import {CASE_CLOSURE_RULES_487} from '../../src/clinical/case-completion-487.js';

const read=name=>JSON.parse(readFileSync(new URL('../../src/v5/content/'+name+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const clinicalCases=['APP-001','CIRR-001'];
const vitalKeys=['temp','hr','rr','sys','dia','spo2'];
function bot(caseId,mode='solo'){
 let ordinal=0;
 const patient={uid:caseId+'-'+mode+'-'+(++ordinal),caseId};
 const session=createGuardSession({roomId:'qa-'+caseId+'-'+mode,mode,actorId:'bot',
  actorName:'Clinical bot',patient,content,
  resolveContext:()=>({patientUid:patient.uid})});
 return {session,send:(text)=>session.post({id:'bot-'+(++ordinal),text})};
}
function trajectory(s){
 const state=s.read(),p=state.patient;
 return {atRealMinutes:state.clock.clinicalMinute,atNativeMinutes:state.clock.nativeMinute,
  vitals:Object.fromEntries(vitalKeys.map(id=>[id,Number(p.liveVitals[id].toFixed(3))])),
  caseEnded:!!p.caseEnded,died:!!p.patientDied,deathReason:p.deathReason??null,
  closeDestination:p.closure?.destination??null,xp:state.progress.xp,
  administrations:p.administrationLog.map(x=>({id:x.id,event:x.sourceEventId,
   dose:x.dose?.amount??null,patientUid:x.patientUid})),
  pending:p.pendingTreatments.length};
}
const delta=(a,b)=>Object.fromEntries(vitalKeys.map(k=>[k,Number((b.vitals[k]-a.vitals[k]).toFixed(3))]));
function gap(key,reason){return {key,reason};}
async function successful(caseId){
 const c=content.cases.find(x=>x.id===caseId),f=bot(caseId);
 try{
  const premature=await f.send('/disposicion '+(caseId==='APP-001'?'quirofano':'sala'));
  const initial=trajectory(f.session);
  for(const intentId of (caseId==='APP-001'?['onset','migration','anorexia']:['onset','alcohol'])){
   const x=c.intents.find(item=>item.id===intentId);
   await f.send('¿'+x.keys[0]+'?');
  }
  await f.send('/signos');
  for(const section of ['general','inspection','auscultation','percussion','palpation'])
   await f.send('/examen '+section);
  for(const study of (caseId==='APP-001'?['app_cbc','app_us']:
   ['hepatograma','renal','eco','paracentesis']))await f.send('/estudio '+study);
  if(caseId==='APP-001'){
   await f.send('Enfermera una vía');
   await f.send('Enfermera ceftriaxona 1 g y metronidazol 500 mg');
   await f.send('/consulta cirugia');
   await f.send('/diagnostico apendicitis aguda');
  }else{
   await f.send('Enfermera dieta sin sal');
   await f.send('Enfermera espironolactona 100 mg');
   await f.send('/diagnostico cirrosis descompensada');
  }
  const preCompletion=await f.send('/disposicion '+(caseId==='APP-001'?'quirofano':'sala'));
  f.session.advance(120);await f.session.flush();
  await f.send('/reevaluar');
  const intended=CASE_CLOSURE_RULES_487[caseId].destinations[0];
  const wrong=await f.send('/disposicion '+(caseId==='APP-001'?'alta':'quirofano'));
  const close=await f.send('/disposicion '+intended);
  const closed=trajectory(f.session),after=await f.send('/disposicion '+intended);
  const repeat=trajectory(f.session);
  return {caseId,strategy:'competent',initial,closed,preRejected:premature.clinical[0]?.status==='rejected',
   pendingRejected:preCompletion.clinical[0]?.status==='rejected',
   wrongDestinationRejected:wrong.clinical[0]?.status==='rejected',
   closedStatus:close.clinical[0]?.status,
   repeatStatus:after.clinical[0]?.status,
   uniqueXP:repeat.xp===closed.xp&&f.session.read().progress.receipts.length===1,
   requirements:f.session.read().closure?.missing??[],expectedDestination:intended};
 }finally{f.session.dispose();}
}
async function neglected(caseId){
 const f=bot(caseId);
 try{
  const initial=trajectory(f.session);
  f.session.advance(1440);await f.session.flush();
  const terminal=trajectory(f.session);
  const refusal=await f.send('/disposicion '+CASE_CLOSURE_RULES_487[caseId].destinations[0]);
  return {caseId,strategy:'neglect',initial,terminal,delta:delta(initial,terminal),
   refusal:refusal.clinical[0]?.status,
   autoProgressed:vitalKeys.some(k=>Math.abs(terminal.vitals[k]-initial.vitals[k])>=1),
   declaredGameMinutesFor24RealMinutes:terminal.atNativeMinutes};
 }finally{f.session.dispose();}
}
async function harmful(caseId){
 const f=bot(caseId);
 try{
  const initial=trajectory(f.session);
  await f.send('Enfermera una vía');
  const preDose=trajectory(f.session);
  const n=20;
  for(let i=0;i<n;i++){
   const response=await f.send('Enfermera Ringer 500 ml');
   if(response.clinical[0]?.status!=='pending')
    throw Error('bot requires authentic independent IV orders: '+JSON.stringify(response.clinical));
   f.session.advance(.81);await f.session.flush();
  }
  f.session.advance(720);await f.session.flush();
  const terminal=trajectory(f.session);
  const total=terminal.administrations.filter(x=>x.id==='fluid').reduce((v,x)=>v+x.dose,0);
  const refusal=await f.send('/disposicion '+CASE_CLOSURE_RULES_487[caseId].destinations[0]);
  return {caseId,strategy:'iatrogenic-overload',initial,preDose,terminal,
   delta:delta(initial,terminal),totalConfirmedFluidMl:total,
   fluidEventCount:terminal.administrations.filter(x=>x.id==='fluid').length,
   uniqueDoseEvents:new Set(terminal.administrations.filter(x=>x.id==='fluid').map(x=>x.event)).size,
   refusedUnqualifiedClosure:refusal.clinical[0]?.status==='rejected',
   severePhysiology:terminal.vitals.spo2<80||terminal.vitals.rr>35};
 }finally{f.session.dispose();}
}
export async function runClinicalBotMatrix(){
 const rows=[];
 for(const id of clinicalCases){
  rows.push(await successful(id),await neglected(id),await harmful(id));
 }
 const gaps=[];
 for(const r of rows){
  if(r.strategy==='competent'){
   if(r.closedStatus!=='executed'||r.closed.closeDestination!==r.expectedDestination||
     !r.preRejected||!r.pendingRejected||!r.wrongDestinationRejected||
     !r.uniqueXP||r.closed.died||r.closed.xp<=0)
    gaps.push(gap(r.caseId+'/competent','valid clinical sequence did not close safely and uniquely'));
  }else if(r.strategy==='neglect'){
   if(r.caseId==='APP-001'&&!r.autoProgressed)
    gaps.push(gap(r.caseId+'/untreated-disease','acute appendicitis stays at admission vitals despite 24 real minutes without care'));
   if(r.refusal!=='rejected')
    gaps.push(gap(r.caseId+'/premature-closure','unassessed patient could be discharged/transferred'));
  }else{
   if(r.fluidEventCount!==20||r.totalConfirmedFluidMl!==10000||r.uniqueDoseEvents!==20)
    gaps.push(gap(r.caseId+'/delivery','unsafe medical choices were blocked or failed to generate real receipts'));
   if(r.terminal.vitals.spo2>=r.initial.vitals.spo2-10)
    gaps.push(gap(r.caseId+'/iatrogenic-harm','actual confirmed excess fluid caused no substantial respiratory injury'));
   if(r.severePhysiology&&!r.terminal.died)
    gaps.push(gap(r.caseId+'/fatal-transition','critical measurements do not lead to death over time; there is no verified fatal-exposure owner'));
   if(!r.refusedUnqualifiedClosure)
    gaps.push(gap(r.caseId+'/unsafe-closure','incorrectly treated, unassessed case closed'));
  }
 }
 const minutes=rows.find(r=>r.caseId==='APP-001'&&r.strategy==='neglect').declaredGameMinutesFor24RealMinutes;
 if(Math.abs(minutes-1440)>1)
  gaps.push(gap('clock/24h','24 real minutes advance '+Number(minutes.toFixed(2))+' simulated minutes, not 1440'));
 return {schema:'atria.v5.clinical-bots.v1',source:'real createGuardSession/APP-CIRR native policies',
  legacyDestinations:Object.fromEntries(clinicalCases.map(id=>[id,CASE_CLOSURE_RULES_487[id].destinations])),
  rows,gaps,parityAchieved:gaps.length===0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=await runClinicalBotMatrix();
 console.log('ATRIA_CLINICAL_BOT_REPORT='+JSON.stringify(report,null,2));
 if(process.argv.includes('--require-parity')&&!report.parityAchieved)process.exitCode=1;
}
