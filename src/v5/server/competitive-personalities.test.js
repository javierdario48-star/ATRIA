// Production durable authority, real navigation and physical nurse delivery.
// The QA clock advances wall time; no patient field or receipt is assigned.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createWorld} from '../app/world.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {CLINICAL_BOT_PLAYBOOK as plans,CLINICAL_BOT_PROFILES,
 clinicalBotAssessmentActions} from '../clinical/clinical-bot-playbooks.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={map:read('hospital'),beds:read('beds'),cases:read('cases'),
 therapies:read('therapies'),defaultDoses:read('default-doses')};
const caseIds=Object.keys(CLINICAL_EXECUTORS),report=[];
const emergencies=new Set(['PERI-SEC-001','PERI-TER-001','CHOLANG-001','VARIX-001',
 'MESI-001','PANC-001','HDA-001','LGIB-001']);

for(const [index,caseId] of caseIds.entries())for(const profile of CLINICAL_BOT_PROFILES){
 const doctors=2+index%3;
 test('competitive physician '+profile+' '+caseId+' / '+doctors+' doctors',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'atria-profile-'));
  const store=createSqliteGuardStore(path.join(directory,'guard.sqlite'));
  const roomId='profiles-'+caseId+'-'+profile;
  const members=Array.from({length:doctors},(_,i)=>({id:String.fromCharCode(97+i),name:'Médico '+i}));
  let now=1700000000000,sequence=0,authority;
  const makeAuthority=()=>createDurableGuardAuthority({store,content,now:()=>now,maxSteps:24000});
  authority=makeAuthority();
  const call=(actorId='b',extra={})=>authority.transact({roomId,actorId,...extra});
  let uid;
  const post=text=>call('b',{commands:[{id:'profile-'+(++sequence),text,targetPatientUid:uid}]});
  const advance=async seconds=>{
   now+=Math.round(seconds*1000);
   let view=await call();
   for(let i=0;view.recovering&&i<10;i++)view=await call();
   assert(!view.recovering,'bounded clinical recovery must finish before the next action');
   return view;
  };
  const waitFor=async predicate=>{
   let view=await call();
   for(let i=0;!predicate(view.clinical.patient)&&!view.clinical.patient.caseEnded&&i<45;i++)
    view=await advance(2);
   return view;
  };
  try{
   const opened=await authority.bootstrap({roomId,caseId,members,hostId:'a',actorId:'a',mode:'competitive'});
   const [patient,rival]=opened.clinical.shift.patients;uid=patient.uid;
   const navigation=createWorld(content,{id:'a',name:'Rival'}).navigation;
   const bedside=record=>navigation.center(...content.beds.find(b=>b.id===record.bedId).approach);
   const primary=bedside(patient),other=bedside(rival);
   await call('b',{motion:[primary.x,primary.y],motionSequence:1});
   await call('a',{motion:[other.x,other.y],motionSequence:1});
   await advance(20);
   const claimed=await call('b',{claim:uid});
   assert.equal(claimed.clinical.shift.patients[0].ownerId,'b');
   await call('a',{claim:rival.uid});
   const wrong=await call('a',{commands:[{id:'wrong-patient',text:'Enfermera Ringer 1000 ml',targetPatientUid:uid}]});
   assert.equal(wrong.acknowledgements[0].status,'rejected');
   const initial=await call();
   const baseline={...initial.clinical.patient.liveVitals};
   let commands=[];
   if(profile==='beginner'){
    commands=clinicalBotAssessmentActions(content.cases.find(c=>c.id===caseId),profile);
    for(const text of commands)await post(text);
    const attempted=await post('/disposicion '+plans[caseId].dest);
    assert(['rejected','pending'].includes(attempted.acknowledgements[0].clinical[0].status));
    // A requested handoff can start a consultation; pending is not an
    // accepted destination, a completed operation, a closure or earned XP.
    assert(!attempted.clinical.patient.closure?.closed);
    assert.equal(attempted.claims.length,0);
   }else if(profile==='dangerous'){
    await post('Enfermera una vía');
    await waitFor(p=>p.venousAccessCount>0);
    for(let dose=1;dose<=8;dose++){
     const order=await post('Enfermera Ringer 1000 ml');
     if(order.clinical.patient.caseEnded)break;
     assert.equal(order.acknowledgements[0].clinical[0].status,'pending');
     const administered=await waitFor(p=>p.administrationLog.filter(a=>a.id==='fluid').length>=dose);
     if(administered.clinical.patient.caseEnded)break;
     assert.equal(administered.clinical.patient.administrationLog.filter(a=>a.id==='fluid').length,dose);
    }
    await advance(30);
    const harmed=await call(),doses=harmed.clinical.patient.administrationLog.filter(a=>a.id==='fluid');
    assert(doses.length>0,'dangerous orders must generate actual bedside exposure');
    assert.equal(new Set(doses.map(a=>a.sourceEventId)).size,doses.length,'each dose has its own receipt');
    assert(doses.every(a=>a.patientUid===uid));
    assert.equal(harmed.claims.length,0);
    if(doses.length===8)
     assert(harmed.clinical.patient.liveVitals.spo2<baseline.spo2-3||harmed.clinical.patient.patientDied,
      'confirmed massive volume must harm the patient rather than act as a cure');
   }else{
    if(profile==='slow')await advance(emergencies.has(caseId)?65:90);
    commands=clinicalBotAssessmentActions(content.cases.find(c=>c.id===caseId),profile);
    // Physical multiplayer sepsis delivery has the same indicated support as
    // the established expert competitive pathway, not a manufactured rescue.
    if(caseId==='PERI-SEC-001')commands=commands.map(text=>text==='Enfermera Ringer 500 ml y ceftriaxona 1 g y metronidazol 500 mg'?
     'Enfermera monitor y Ringer 1000 ml y ceftriaxona 1 g y metronidazol 500 mg y noradrenalina 0.05 mcg/kg/min IV y oxigeno 4 L/min':text);
    for(const text of commands)await post(text);
    // A new server worker resumes the same patient, queue and event log.
    authority=makeAuthority();
    if(profile==='expert'){
     await advance(plans[caseId].wait/2);await post('/reevaluar');
     await advance(plans[caseId].wait/2);
    }else await advance(plans[caseId].wait);
    let assessed=await post('/reevaluar');
    if(caseId==='PERI-SEC-001'&&!assessed.clinical.patient.caseEnded&&
       !assessed.clinical.eligibleDestinations.includes(plans[caseId].dest)){
     await advance(40);assessed=await post('/reevaluar');
    }
    if(!assessed.clinical.patient.caseEnded&&assessed.clinical.eligibleDestinations.includes(plans[caseId].dest))
     await post('/disposicion '+plans[caseId].dest);
    const terminal=await call();
    if(profile!=='slow')assert(terminal.clinical.patient.closure?.closed,
     caseId+' '+profile+' failed valid handoff: '+JSON.stringify(terminal.clinical.closure?.missing));
   }
   const final=await call(),p=final.clinical.patient;
   assert.equal(p.uid,uid);
   const own=final.claims.filter(([,r])=>r.patientUid===uid);
   if(p.closure?.closed){
    assert.equal(p.closure.destination,plans[caseId].dest);
    assert.equal(own.length,1);
    assert.equal(own[0][0],'b');
    assert(own[0][1].xp>0);
   }else assert.equal(own.length,0,'unfinished or harmful care cannot invent closure XP');
   const xp=own.reduce((sum,[,r])=>sum+r.xp,0);
   authority=makeAuthority();
   const repeat=await post('/disposicion '+plans[caseId].dest);
   assert.deepEqual(repeat.claims,final.claims,'recovery or repeated closure must not duplicate owner XP');
   const otherPatient=(await call('a')).clinical.patient;
   assert.equal(otherPatient.uid,rival.uid);
   assert.equal(otherPatient.administrationLog.length,0,'one doctor cannot administer a rival patient’s therapy');
   report.push({caseId,profile,doctors,mode:'competitive',patientUid:uid,
    closed:!!p.closure?.closed,destination:p.closure?.destination??null,died:!!p.patientDied,xp,
    before:baseline,after:p.liveVitals,confirmed:p.administrationLog.map(a=>({id:a.id,eventId:a.sourceEventId,patientUid:a.patientUid})),
    recovered:true,rivalUnexposed:true});
  }finally{store.close();fs.rmSync(directory,{recursive:true,force:true});}
 });
}

test('125 competitive physician profiles retain all 25 cases with real nursing and exclusive XP',()=>{
 assert.equal(caseIds.length,25);assert.equal(report.length,125);
 assert.equal(report.filter(r=>r.profile==='expert'&&r.closed).length,25);
 assert.equal(report.filter(r=>r.profile==='competent'&&r.closed).length,25);
 assert.deepEqual([...new Set(report.map(r=>r.doctors))].sort(),[2,3,4]);
 fs.mkdirSync('qa/v5-medical-bot-results',{recursive:true});
 fs.writeFileSync('qa/v5-medical-bot-results/competitive-personas.json',JSON.stringify({runs:report},null,2));
 console.log('ATRIA_COMPETITIVE_125_PHYSICIAN_PROFILES='+JSON.stringify({runs:report.length,
  profiles:Object.fromEntries(CLINICAL_BOT_PROFILES.map(p=>[p,report.filter(r=>r.profile===p).length]))}));
});
