import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createWorld} from '../app/world.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {CLINICAL_BOT_PLAYBOOK} from '../clinical/clinical-bot-playbooks.js';
const load=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),
 therapies:load('therapies'),defaultDoses:load('default-doses')};
const cases=Object.keys(CLINICAL_EXECUTORS),report=[];
for(const [index,caseId] of cases.entries()){
 const doctors=[2,3,4][index%3];
 test('cooperative intelligent clinical bot '+caseId+' '+doctors+' doctors: full native physiology to destination, shared XP once',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-coop-smart-'));
  const store=createSqliteGuardStore(path.join(dir,'clinical.sqlite'));
  let now=1700000000000,serial=0;
  const members=Array.from({length:doctors},(_,i)=>({id:String.fromCharCode(97+i),name:'QA Doctor '+i}));
  const roomId='coop-closure-'+caseId,plan=CLINICAL_BOT_PLAYBOOK[caseId];
  const make=()=>createDurableGuardAuthority({store,content,now:()=>now,maxSteps:11500});
  let authority=make();
  const call=(actorId,extra={})=>authority.transact({roomId,actorId,...extra});
  const send=text=>call('b',{commands:[{id:'smart-'+(++serial),text}]});
  try{
   const started=await authority.bootstrap({roomId,caseId,members,hostId:'a',actorId:'a',mode:'coop'});
   const patient=started.clinical.shift.patients[0];
   const nav=createWorld(content,{id:'a',name:'QA Doctor 0'}).navigation;
   const point=nav.center(...content.beds.find(b=>b.id===patient.bedId).approach);
   await call('b',{motion:[point.x,point.y],motionSequence:1});
   now+=20000;
   const selected=await call('b',{claim:patient.uid});
   assert.equal(selected.clinical.shift.confirmedFocusPatientUid,patient.uid);
   assert.equal(selected.clinical.shift.patients[0].ownerId,null,
    'cooperative treatment must never create exclusive ownership');
   const commands=[...(plan.history||[]),'/signos',
    ...['general','inspection','auscultation','percussion','palpation'].map(x=>'/examen '+x),
    ...(plan.exams||[]),'/diagnostico '+plan.dx,...(plan.studies||[]).map(x=>'/estudio '+x),
    ...(caseId==='PERI-SEC-001'?
      ['Enfermera una vía',
       'Enfermera monitor y Ringer 1000 ml y ceftriaxona 1 g y metronidazol 500 mg y noradrenalina 0.05 mcg/kg/min IV y oxigeno 4 L/min']:
      plan.meds),...(plan.consult?[plan.consult]:[])];
   for(const text of commands)await send(text);
   assert.equal((await call('b')).claims.length,0,'unfinished clinical actions must not mint XP');
   now+=plan.wait*1000;await call('b');
   await send('/reevaluar');
   let before=await call('b');
   if(caseId==='PERI-SEC-001'&&!before.clinical.eligibleDestinations.includes(plan.dest)&&
       !before.clinical.patient.caseEnded){
    now+=40000;await call('b');await send('/reevaluar');before=await call('b');
   }
   assert(before.clinical.eligibleDestinations.includes(plan.dest),
    caseId+' destination unexpectedly unavailable: '+JSON.stringify({
     destinations:before.clinical.eligibleDestinations,dying:before.clinical.patient.patientDied,
     pending:before.clinical.patient.pendingTreatments}));
   const terminal=await send('/disposicion '+plan.dest);
   assert(terminal.clinical.patient.closure?.closed,caseId+' did not close authentically');
   assert.equal(terminal.clinical.patient.closure.destination,plan.dest);
   assert.equal(terminal.clinical.shift.outcomes.length,1);
   assert.equal(terminal.claims.length,doctors,'each cooperative doctor receives one, and only one, closure receipt');
   for(const member of members){
    const receipt=terminal.claims.find(([key])=>key===member.id)?.[1];
    assert(receipt&&receipt.xp>0,'missing cooperative career XP for '+member.id);
   }
   if(['quirofano','procedimiento'].includes(plan.dest))
    assert(!terminal.clinical.patient.treatments.some(x=>['surgery','source_control'].includes(x.id)),
     'consulted surgical/procedure team accepts care, not a fictitious performed operation');
   const previous=terminal.claims.map(([actor,x])=>[actor,x.xp]);
   authority=make();
   const restored=await call('b');
   assert.deepEqual(restored.claims.map(([actor,x])=>[actor,x.xp]),previous);
   const repeated=await send('/disposicion '+plan.dest);
   assert.deepEqual(repeated.claims.map(([actor,x])=>[actor,x.xp]),previous,
    'duplicate destination after restart cannot mint XP');
   assert.equal(repeated.clinical.shift.patients[0].departed,true);
   report.push({caseId,doctors,destination:plan.dest,sharedReceipts:doctors,score:terminal.clinical.patient.closure.quality?.score});
  }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
 });
}
test('all 25 certified executors have cooperative smart-bot closure and duplicate XP coverage',()=>{
 assert.equal(cases.length,25);assert.equal(report.length,25);
 assert.deepEqual([...new Set(report.map(x=>x.doctors))].sort(),[2,3,4]);
 console.log('ATRIA_COOP_SMART_CLOSURE_BOTS='+JSON.stringify({runs:report.length,results:report}));
});
