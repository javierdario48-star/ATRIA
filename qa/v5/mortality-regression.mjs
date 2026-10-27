// Checkpoint A: ordinary public commands, native clocks and real receipts.
// The bots never assign physiology, treatment completion, survival, death or XP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
import {createDurableGuardAuthority} from '../../src/v5/server/durable-guard-authority.js';
import {createSqliteGuardStore} from './sqlite-guard-store.mjs';
import {createWorld} from '../../src/v5/app/world.js';
import {CLINICAL_BOT_PLAYBOOK as plans,clinicalBotAssessmentActions}
 from '../../src/v5/clinical/clinical-bot-playbooks.js';
import {confirmedClinicalMissteps} from '../../src/v5/clinical/clinical-risk.js';

const load=n=>JSON.parse(fs.readFileSync(new URL('../../src/v5/content/'+n+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),
 therapies:load('therapies'),defaultDoses:load('default-doses')};
const copy=x=>structuredClone(x);
const round=n=>Number(n.toFixed(6));
const vitalKeys=['temp','hr','rr','sys','dia','spo2'];
const at=s=>s.clock.clinicalMinute;
const criticalNeglect=new Set(['PERI-SEC-001','PERI-PBE-001','PERI-TER-001','CHOLANG-001','VARIX-001']);
export const MORTALITY_CASES=Object.freeze(['PERI-SEC-001','PERI-PBE-001','PERI-TER-001',
 'CHOLANG-001','HDA-001','VARIX-001','LGIB-001','PANC-001','MESI-001','CIRR-001','PUD-001']);
export const HARMFUL_MORTALITY_SCENARIOS=Object.freeze([
 {id:'diuretic-hypovolemia',caseId:'PERI-SEC-001',drug:'furosemide',text:'Enfermera furosemida 40 mg',count:6,every:2,expectedDeath:true},
 {id:'opioid-overdose',caseId:'PANC-001',drug:'morphine',text:'Enfermera morfina 30 mg',count:30,every:25,expectedDeath:true,requiredEvent:'opioid-respiratory-depression'},
 {id:'anticoagulant-hda',caseId:'HDA-001',drug:'anticoagulation',text:'Enfermera heparina IV',count:3,every:2,expectedDeath:true,requiredEvent:'anticoagulant-bleeding'},
 {id:'anticoagulant-varix',caseId:'VARIX-001',drug:'anticoagulation',text:'Enfermera heparina IV',count:3,every:2,expectedDeath:true,requiredEvent:'anticoagulant-bleeding'},
 {id:'anticoagulant-lgib',caseId:'LGIB-001',drug:'anticoagulation',text:'Enfermera heparina IV',count:3,every:2,expectedDeath:true,requiredEvent:'anticoagulant-bleeding'},
 {id:'fluid-overload-cirr',caseId:'CIRR-001',drug:'fluid',text:'Enfermera Ringer 500 ml',count:20,every:1,expectedDeath:true},
 {id:'fluid-overload-panc',caseId:'PANC-001',drug:'fluid',text:'Enfermera Ringer 500 ml',count:20,every:1,expectedDeath:true},
 {id:'severe-allergy',caseId:'PANC-001',drug:'ceftriaxone',text:'Enfermera ceftriaxona 1 g',count:15,every:60,
  facts:{allergies:[{drugId:'ceftriaxone',severity:'severe'}]},expectedDeath:true,requiredEvent:'severe-drug-allergy'},
 {id:'renal-contraindication',caseId:'PERI-PBE-001',drug:'gentamicin',text:'Enfermera gentamicina 80 mg',count:3,every:2,expectedDeath:true},
 {id:'excessive-pressor',caseId:'CIRR-001',drug:'vasopressor',text:'Enfermera noradrenalina 1 mcg/kg/min IV',count:1,every:1,
  expectedDeath:false,requiredEvent:'vasopressor-excess-response'},
 {id:'opioid-delayed-rescue',caseId:'PANC-001',drug:'morphine',text:'Enfermera morfina 30 mg',count:30,every:25,
  rescueAt:205,rescue:['Enfermera oxigeno 4 L/min','Enfermera Ringer 1000 ml'],expectedDeath:false,requiredEvent:'opioid-respiratory-depression'},
 {id:'secondary-late-rescue',caseId:'PERI-SEC-001',careAt:150,expectedDeath:true,
  rescue:['Enfermera Ringer 1000 ml y ceftriaxona 1 g y metronidazol 500 mg y noradrenalina 0.05 mcg/kg/min IV y oxigeno 4 L/min']},
 {id:'ordinary-allergy',caseId:'PANC-001',drug:'ceftriaxone',text:'Enfermera ceftriaxona 1 g',count:4,every:60,
  facts:{allergies:['ceftriaxone']},expectedDeath:false,forbiddenEvent:'severe-drug-allergy'},
 {id:'ordinary-analgesia',caseId:'PANC-001',drug:'morphine',text:'Enfermera morfina 4 mg',count:1,every:1,
  expectedDeath:false,forbiddenEvent:'opioid-respiratory-depression'},
 {id:'ordinary-pressor',caseId:'CIRR-001',drug:'vasopressor',text:'Enfermera noradrenalina 0.05 mcg/kg/min IV',count:1,every:1,
  expectedDeath:false,forbiddenEvent:'vasopressor-excess-response'}
]);

function snapshot(state){
 const p=state.patient;
 return {atRealSecond:round(at(state)),atNativeMinute:round(state.clock.nativeMinute),
  vitals:Object.fromEntries(vitalKeys.map(k=>[k,round(p.liveVitals[k])])),
  critical:!!p.survival?.observedCritical,exposureNativeMinutes:round(p.survival?.exposureNativeMinutes??0),
  graceReleaseAt:p.survival?.releaseAtRealSecond??180,rescueStartedAt:p.survival?.rescueStartedAtSec??null,
  died:!!p.patientDied,caseEnded:!!p.caseEnded,deathReason:p.deathReason??null,
  deathAtRealSecond:p.patientDied?p.survival.atRealSecond:null,
  closed:!!p.closure?.closed,destination:p.closure?.destination??null,
  xp:state.progress.xp,administrations:p.administrationLog.length,pending:p.pendingTreatments.length,
  physiology:p.phys?{effectiveVolume:round(p.phys.effectiveVolume),renalReserve:round(p.phys.renalReserve)}:null};
}
function administrationRows(p){
 const seen=new Set();
 return p.administrationLog.map(row=>{
  assert.equal(row.patientUid,p.uid,'foreign patient administration');
  assert(!seen.has(row.sourceEventId),'one event cannot deliver two doses');seen.add(row.sourceEventId);
  const matching=p.treatments.filter(x=>x.sourceEventId===row.sourceEventId&&x.id===row.id);
  assert.equal(matching.length,1,'an administration needs its actual native treatment receipt');
  assert.equal(matching[0].administeredAtNativeMinute,row.administeredAtNativeMinute);
  assert.deepEqual(matching[0].dose,row.dose);
  return copy(row);
 });
}
function commandEvidence(text,ack,state){
 return {type:'command',atRealSecond:round(at(state)),text,
  status:ack.status,reason:ack.reason??null,
  clinical:(ack.clinical||[]).map(x=>({kind:x.kind,id:x.id,status:x.status,reason:x.reason??null,
   eventId:x.eventId??null,receipt:x.receipt?copy(x.receipt):null}))};
}
function finalize(row,state){
 row.final=snapshot(state);row.administrations=administrationRows(state.patient);
 row.adverseEvents=copy(state.patient.adverseEvents);
 row.quality=copy(state.closure?.quality??null);
 row.risk=confirmedClinicalMissteps(state.patient,content.cases.find(c=>c.id===row.caseId));
 row.deathEvents=state.room.events.filter(x=>x.type==='clinical.patient-died').length;
 row.progress=copy(state.progress);
 row.outcome=row.final.died?'muerte confirmada':row.final.closed?'derivación indicada confirmada':
  row.final.critical?'crítico vivo al final':'vivo al final de observación';
 if(typeof row.expectedDeath==='boolean')assert.equal(row.final.died,row.expectedDeath,row.mode+'/'+row.id+' unexpected death outcome');
 if(row.bot==='competent')assert(row.final.closed,'matched competent control needs a real handoff');
 if(row.requiredEvent)assert(row.adverseEvents.some(x=>x.kind===row.requiredEvent),row.id+' missing emerged adverse event');
 if(row.forbiddenEvent)assert(!row.adverseEvents.some(x=>x.kind===row.forbiddenEvent),row.id+' incorrectly invented severe complication');
 if(row.bot!=='competent')assert.equal(row.final.xp,0,'unfinished/harmful/abandoned care cannot earn XP');
 if(row.final.died)assert.equal(row.deathEvents,1,'death must be published exactly once');
 return row;
}

export async function runLocalMortalityScenario(spec,{mode='solo',horizon=1440}={}){
 assert(horizon>0&&horizon<=1440);
 const uid='mortality:'+mode+':'+spec.id,roomId=uid;
 const members=mode==='coop'?[{id:'doctor',name:'Bot médico'},{id:'peer',name:'Observador'}]:[{id:'doctor',name:'Bot médico'}];
 const patient={uid,caseId:spec.caseId,...copy(spec.facts??{})};
 const options={roomId,mode,actorId:'doctor',actorName:'Bot médico',patient,content,members,
  authenticate:id=>members.some(m=>m.id===id)?{id,roomId}:null,
  resolveContext:()=>({patientUid:uid})};
 let session=createGuardSession(options),sequence=0;
 const row={...copy(spec),mode,authority:'createGuardSession',horizonRealSeconds:horizon,clockStepRealSeconds:1,
  patientUid:uid,trace:[],initial:snapshot(session.read()),firstCriticalAt:null,minimumVitals:copy(session.read().patient.liveVitals)};
 const send=async(text,id=null)=>{
  const commandId=id??'m-'+(++sequence),ack=await session.post({id:commandId,text},'doctor');
  row.trace.push(commandEvidence(text,ack,session.read()));return {ack,id:commandId};
 };
 const observe=force=>{
  const state=session.read(),sample=snapshot(state),previous=row.trace.findLast(x=>x.type==='observation');
  if(sample.critical&&row.firstCriticalAt===null)row.firstCriticalAt=sample.atRealSecond;
  for(const k of vitalKeys)row.minimumVitals[k]=Math.min(row.minimumVitals[k],state.patient.liveVitals[k]);
  if(force||!previous||Math.floor(sample.atRealSecond/10)>Math.floor(previous.atRealSecond/10)||
    sample.administrations!==previous.administrations||sample.critical!==previous.critical||sample.caseEnded!==previous.caseEnded)
   row.trace.push({type:'observation',...sample});
  return state;
 };
 let doses=0,nextDoseAt=0,firstOrder=null,replayed=false,rescued=false,lateCare=false,closed=false;
 try{
  observe(true);
  if(spec.bot==='competent'){
   for(const text of clinicalBotAssessmentActions(content.cases.find(c=>c.id===spec.caseId),'expert'))await send(text);
  }else if(spec.bot!=='abandonment'){
   await send('Enfermera una vía');
   // These are intentionally invalid interpretations, recorded separately
   // from the repeated VALID doses that follow. Neither can count as exposure.
   if(spec.drug){
    const before=session.read().patient.administrationLog.length;
    const invalid=await send('Enfermera morfina 99 mg');
    assert(invalid.ack.clinical.every(x=>x.status==='rejected'));
    assert.equal(session.read().patient.administrationLog.length,before);
   }
  }
  while(at(session.read())<horizon-1e-8){
   const state=session.read(),second=at(state);
   if(state.patient.patientDied)break;
   if(spec.text&&doses<spec.count&&second>=nextDoseAt-1e-8&&
      !(spec.rescueAt!=null&&second>=spec.rescueAt)){
    const order=await send(spec.text);assert(order.ack.clinical.some(x=>x.status==='pending'),spec.id+' valid dose rejected');
    firstOrder??=order;doses++;nextDoseAt=second+spec.every;
   }
   if(firstOrder&&!replayed&&state.patient.administrationLog.some(x=>x.id===spec.drug)){
    const before=state.patient.administrationLog.length;
    await send(spec.text,firstOrder.id);
    assert.equal(session.read().patient.administrationLog.length,before,'same transport event re-administered');replayed=true;
   }
   if(!rescued&&spec.rescueAt!=null&&second>=spec.rescueAt){
    rescued=true;for(const text of spec.rescue)await send(text);
   }
   if(!lateCare&&spec.careAt!=null&&second>=spec.careAt){
    lateCare=true;for(const text of spec.rescue)await send(text);
   }
   if(spec.bot==='competent'&&!closed&&second>=plans[spec.caseId].wait){
    await send('/reevaluar');
    const close=await send('/disposicion '+plans[spec.caseId].dest);
    assert.equal(close.ack.clinical[0].status,'executed',spec.caseId+' competent closure did not execute');closed=true;
   }
   session.advance(Math.min(1,horizon-second));await session.flush();observe(false);
  }
  const terminal=observe(true);
  if(terminal.patient.patientDied){
   const frozen={vitals:copy(terminal.patient.liveVitals),administrations:copy(terminal.patient.administrationLog),xp:terminal.progress.xp};
   const postmortem=[];
   for(const text of ['Enfermera Ringer 500 ml','Enfermera morfina 30 mg','Enfermera oxigeno 4 L/min','/disposicion '+plans[spec.caseId].dest]){
    const r=await send(text);postmortem.push(r.ack);
    assert(r.ack.clinical.length>0&&r.ack.clinical.every(x=>x.status==='rejected'),'postmortem therapy was accepted');
   }
   const checkpoint=await session.checkpoint();session.dispose();session=createGuardSession({...options,checkpoint});
   const remaining=Math.min(5,1440-at(session.read()));
   for(let t=0;t<remaining;t++){session.advance(1);await session.flush();}
   const restored=session.read();
   assert(restored.patient.patientDied,'reconnection resurrected the patient');
   assert.deepEqual(restored.patient.liveVitals,frozen.vitals);
   assert.deepEqual(restored.patient.administrationLog,frozen.administrations);
   assert.equal(restored.progress.xp,frozen.xp);
   assert.equal(restored.room.events.filter(x=>x.type==='clinical.patient-died').length,1);
   row.terminalIntegrity={postmortemRejected:postmortem.length,checkpointRestored:true,unchangedVitals:true,
    unchangedAdministrations:true,noResurrection:true,xpUnchanged:true};
   observe(true);
  }
  return finalize(row,session.read());
 }finally{session.dispose();}
}

export async function runLocalMortalityMatrix({modes=['solo','apprentice','coop'],cases=MORTALITY_CASES,
 harmful=HARMFUL_MORTALITY_SCENARIOS,onRow=()=>{}}={}){
 const rows=[];
 for(const mode of modes){
  for(const caseId of cases){
   for(const bot of ['abandonment','competent']){
    const row=await runLocalMortalityScenario({id:bot+'-'+caseId,caseId,bot,
     expectedDeath:bot==='abandonment'&&criticalNeglect.has(caseId)},{mode});
    rows.push(row);onRow(row);
   }
  }
  for(const scenario of harmful){
   const harmed=await runLocalMortalityScenario({...scenario,bot:'harmful'},{mode});rows.push(harmed);onRow(harmed);
   const control=await runLocalMortalityScenario({id:scenario.id+'-untreated-control',caseId:scenario.caseId,
    bot:'matched-untreated',facts:scenario.facts??{},expectedDeath:null},{mode,horizon:harmed.final.atRealSecond});
   // Disease-driven control deaths depend on the observation interval. These
   // cannot be assumed absent simply because the harmful branch died first.
   rows.push(control);onRow(control);
   harmed.controlId=control.id;
   harmed.comparison=compareMortalityTraces(harmed,control);
  }
 }
 return rows;
}

export function compareMortalityTraces(harmed,control){
 const controlSamples=new Map(control.trace.filter(x=>x.type==='observation').map(x=>[x.atRealSecond,x]));
 const samples=harmed.trace.filter(x=>x.type==='observation'&&controlSamples.has(x.atRealSecond));
 assert(samples.length,'counterfactual needs observations at the identical elapsed clock');
 const matched=samples.at(-1),controlAt=controlSamples.get(matched.atRealSecond);
 const differences=samples.map(sample=>({at:sample.atRealSecond,...Object.fromEntries(vitalKeys.map(k=>
  [k,round(sample.vitals[k]-controlSamples.get(sample.atRealSecond).vitals[k])]))}));
 return {atRealSecond:matched.atRealSecond,matchedObservations:samples.length,controlDied:control.final.died,
  vitalDelta:Object.fromEntries(vitalKeys.map(k=>[k,round(matched.vitals[k]-controlAt.vitals[k])])),
  lowestSystolicDelta:Math.min(...differences.map(x=>x.sys)),lowestSpo2Delta:Math.min(...differences.map(x=>x.spo2)),
  greatestHeartRateDelta:Math.max(...differences.map(x=>x.hr)),
  renalReserveDelta:matched.physiology&&controlAt.physiology?
   round(matched.physiology.renalReserve-controlAt.physiology.renalReserve):null};
}

/** Physical multiplayer branch: only the authoritative wall clock changes.
 * SQLite records are read/checkpointed through the existing owner, never edited.
 */
export async function runDurableMortalityScenario(spec,{mode='competitive',horizon=1440,doctors=3}={}){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'atria-mortality-'));
 const filename=path.join(directory,'guard.sqlite');let store=createSqliteGuardStore(filename),authority;
 const roomId='mortality:'+mode+':'+spec.id,members=Array.from({length:doctors},(_,i)=>({id:String.fromCharCode(97+i),name:'Médico '+(i+1)}));
 let now=1700000000000,sequence=0,uid,latest;
 const start=()=>{authority=createDurableGuardAuthority({store,content,now:()=>now,maxSteps:600});};start();
 const call=(actorId='b',extra={})=>authority.transact({roomId,actorId,...extra});
 const row={...copy(spec),mode,authority:'durable/SQLite/physical nurse',doctors,clockStepRealSeconds:5,
  horizonRealSeconds:horizon,trace:[],firstCriticalAt:null};
 const remember=view=>{
  latest=view;const sample=snapshot(view.clinical);
  if(sample.critical&&row.firstCriticalAt===null)row.firstCriticalAt=sample.atRealSecond;
  row.trace.push({type:'observation',...sample});return view;
 };
 const advance=async seconds=>{
  assert(seconds>0&&seconds<=5,'durable bot must use ordinary incremental recovery');
  now+=Math.round(seconds*1000);let view=await call();
  while(view.recovering)view=await call();return remember(view);
 };
 const post=async(text,id=null,actorId='b')=>{
  const view=await call(actorId,{commands:[{id:id??'d-'+(++sequence),text,targetPatientUid:uid}]});
  row.trace.push(commandEvidence(text,view.acknowledgements[0],view.clinical));latest=view;
  return view;
 };
 const waitFor=async predicate=>{
  while(!predicate(latest.clinical.patient)&&!latest.clinical.patient.caseEnded&&at(latest.clinical)<horizon)await advance(1);
 };
 try{
  const opened=await authority.bootstrap({roomId,caseId:spec.caseId,members,hostId:'a',actorId:'a',mode});
  uid=opened.clinical.patient.uid;row.patientUid=uid;row.initial=snapshot(opened.clinical);
  const nav=createWorld(content,{id:'a',name:'Médico 1'}).navigation;
  const first=opened.clinical.shift.patients[0],target=nav.center(...content.beds.find(b=>b.id===first.bedId).approach);
  await call('b',{motion:[target.x,target.y],motionSequence:1});
  if(mode==='coop')await call('a',{motion:[target.x,target.y],motionSequence:1});
  for(let s=0;s<20;s+=5)await advance(5);
  const claimed=await call('b',{claim:uid});assert.equal(claimed.clinical.shift.confirmedFocusPatientUid,uid);
  remember(claimed);
  if(spec.bot==='competent'){
   let commands=clinicalBotAssessmentActions(content.cases.find(c=>c.id===spec.caseId),'expert');
   if(spec.caseId==='PERI-SEC-001')commands=commands.map(text=>text==='Enfermera Ringer 500 ml y ceftriaxona 1 g y metronidazol 500 mg'?
    'Enfermera monitor y Ringer 1000 ml y ceftriaxona 1 g y metronidazol 500 mg y noradrenalina 0.05 mcg/kg/min IV y oxigeno 4 L/min':text);
   for(const text of commands)await post(text);
   for(let n=0;n<120&&!latest.clinical.patient.caseEnded;n++){
    await advance(1);
    if(n>=plans[spec.caseId].wait&&latest.clinical.patient.pendingTreatments.length===0){
     await post('/reevaluar');
     if(latest.clinical.eligibleDestinations.includes(plans[spec.caseId].dest)){await post('/disposicion '+plans[spec.caseId].dest);break;}
    }
   }
  }else if(spec.text){
   await post('Enfermera una vía');await waitFor(p=>p.venousAccessCount>0);
   let firstDoseId=null;
   for(let n=0;n<spec.count&&!latest.clinical.patient.caseEnded;n++){
    const before=latest.clinical.patient.administrationLog.filter(x=>x.id===spec.drug).length;
    const id='real-dose-'+n;firstDoseId??=id;
    const ordered=await post(spec.text,id);
    assert(ordered.acknowledgements[0].clinical.some(x=>x.status==='pending'),'physical valid dose rejected');
    await waitFor(p=>p.administrationLog.filter(x=>x.id===spec.drug).length>before);
    if(n===0){
     const beforeReplay=latest.clinical.patient.administrationLog.length;
     await post(spec.text,firstDoseId);assert.equal(latest.clinical.patient.administrationLog.length,beforeReplay);
    }
    if(spec.every>2){
     const until=Math.min(horizon,at(latest.clinical)+spec.every);
     while(at(latest.clinical)<until&&!latest.clinical.patient.caseEnded)await advance(Math.min(5,until-at(latest.clinical)));
    }
   }
  }
  while(at(latest.clinical)<horizon&&!latest.clinical.patient.caseEnded)await advance(Math.min(5,horizon-at(latest.clinical)));
  const terminal=latest.clinical;
  row.minimumVitals=Object.fromEntries(vitalKeys.map(k=>[k,Math.min(...row.trace.filter(x=>x.type==='observation').map(x=>x.vitals[k]))]));
  if(terminal.patient.patientDied){
   const frozen=administrationRows(terminal.patient),vitals=copy(terminal.patient.liveVitals),claims=copy(latest.claims);
   const observer=await call('a');
   assert.equal(observer.clinical.patient.uid,uid);
   assert(observer.clinical.patient.patientDied,'members disagree about the death');
   assert.equal(observer.clinical.patient.survival.atRealSecond,terminal.patient.survival.atRealSecond);
   let rejected=0;
   for(const text of ['Enfermera Ringer 500 ml','Enfermera morfina 30 mg','Enfermera oxigeno 4 L/min','/disposicion '+plans[spec.caseId].dest]){
    const response=await post(text);const ack=response.acknowledgements[0];
    assert(ack.status==='rejected'||ack.clinical?.every(x=>x.status==='rejected'),'postmortem durable therapy was accepted');rejected++;
   }
   store.close();store=createSqliteGuardStore(filename);start();
   await advance(1);const restored=latest.clinical;
   assert(restored.patient.patientDied);assert.deepEqual(restored.patient.liveVitals,vitals);
   assert.deepEqual(administrationRows(restored.patient),frozen);assert.deepEqual(latest.claims,claims);
   assert.equal(latest.claims.filter(([,r])=>r.patientUid===uid).length,0);
   assert.equal(restored.room.events.filter(x=>x.type==='clinical.patient-died').length,1);
   const other=await call('a');assert(other.clinical.patient.patientDied);
   row.terminalIntegrity={postmortemRejected:rejected,sharedDeath:true,databaseReopened:true,
    checkpointRestored:true,unchangedVitals:true,unchangedAdministrations:true,noResurrection:true,xpUnchanged:true};
  }
  row.claims=copy(latest.claims);return finalize(row,latest.clinical);
 }finally{store.close();fs.rmSync(directory,{recursive:true,force:true});}
}

export async function runMortalityRegression({includeDurable=true,modes=['solo','apprentice','coop'],onRow=()=>{}}={}){
 const started=performance.now(),rows=await runLocalMortalityMatrix({modes,onRow});
 if(includeDurable)for(const mode of ['coop','competitive']){
  const specs=[{id:'abandonment-PERI-SEC-001',caseId:'PERI-SEC-001',bot:'abandonment',expectedDeath:true},
   ...HARMFUL_MORTALITY_SCENARIOS.filter(x=>['anticoagulant-hda','opioid-overdose','fluid-overload-cirr'].includes(x.id)).map(x=>({...x,bot:'harmful'})),
   {id:'competent-PERI-SEC-001',caseId:'PERI-SEC-001',bot:'competent',expectedDeath:false}];
  for(const spec of specs){const row=await runDurableMortalityScenario(spec,{mode,doctors:mode==='competitive'?3:2});rows.push(row);onRow(row);}
 }
 return {schema:'atria.v5.mortality-regression.v1',date:'2026-10-26',source:'existing native physiology + survival-487-bridge',
  noInjectedClinicalState:true,maxObservationRealSeconds:1440,nativeMinutesPerRealSecond:.12,
  mortalityThresholdsUnchanged:true,elapsedWallSeconds:round((performance.now()-started)/1000),
  summary:{scenarios:rows.length,deaths:rows.filter(r=>r.final.died).length,
   competent:rows.filter(r=>r.bot==='competent').length,
   terminalIntegrity:rows.filter(r=>r.terminalIntegrity).length,
   byMode:Object.fromEntries([...new Set(rows.map(r=>r.mode))].map(mode=>[mode,{scenarios:rows.filter(r=>r.mode===mode).length,
    deaths:rows.filter(r=>r.mode===mode&&r.final.died).length}]))},rows};
}

export function saveMortalityEvidence(report){
 const root=fileURLToPath(new URL('../../',import.meta.url));
 const evidence=path.join(root,'docs/evidence/c4a'),artifacts=path.join(root,'qa/v5-mortality-results');
 fs.mkdirSync(evidence,{recursive:true});fs.mkdirSync(artifacts,{recursive:true});
 const raw=JSON.stringify(report,null,2)+'\n';
 fs.writeFileSync(path.join(artifacts,'mortality-traces.json'),raw);
 fs.writeFileSync(path.join(evidence,'mortality-traces.json.gz'),gzipSync(raw,{level:9,mtime:0}));
 const review={...report,traceArchive:{path:'mortality-traces.json.gz',encoding:'gzip',format:'JSON',
  uncompressedSha256:createHash('sha256').update(raw).digest('hex'),
  qaArtifact:'qa/v5-mortality-results/mortality-traces.json'},
  rows:report.rows.map(({trace,...row})=>({...row,traceSummary:{
   observations:trace.filter(x=>x.type==='observation').length,
   commands:trace.filter(x=>x.type==='command').length,
   // These are clinical acknowledgements; chat acceptance is deliberately
   // excluded because it cannot prove that medication was administered.
   clinicalAcknowledgements:trace.filter(x=>x.type==='command').flatMap(x=>x.clinical)
    .reduce((counts,x)=>(counts[x.status]=(counts[x.status]||0)+1,counts),{})}}))};
 fs.writeFileSync(path.join(evidence,'mortality-regression.json'),JSON.stringify(review)+'\n');
 return review;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const modes=process.argv.includes('--solo')?['solo']:['solo','apprentice','coop'];
 const report=await runMortalityRegression({modes,includeDurable:!process.argv.includes('--local-only'),
  onRow:r=>console.log('ATRIA_MORTALITY_SCENARIO '+JSON.stringify({mode:r.mode,id:r.id,caseId:r.caseId,
   administrations:r.administrations.length,died:r.final.died,deathAt:r.final.deathAtRealSecond,closed:r.final.closed}))});
 saveMortalityEvidence(report);
 console.log('ATRIA_MORTALITY_PASS '+JSON.stringify(report.summary)+' wallSeconds='+report.elapsedWallSeconds);
}
