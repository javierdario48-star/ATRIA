import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createWorld} from '../app/world.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {CLINICAL_BOT_PLAYBOOK as plans} from '../clinical/clinical-bot-playbooks.js';
const load=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const cases=Object.keys(CLINICAL_EXECUTORS),report=[];
for(const caseId of cases)for(const doctors of [2,3,4]){
 test('competitive chaotic bot '+caseId+' '+doctors+' doctors: reception race, stale orders, restart and no XP theft',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-bot-')),store=createSqliteGuardStore(path.join(dir,'guard.sqlite'));
  const roomId='race-'+caseId+'-'+doctors,members=Array.from({length:doctors},(_,i)=>({id:String.fromCharCode(97+i),name:'Bot'+i}));
  let now=1700000000000,server=()=>createDurableGuardAuthority({store,content,now:()=>now,maxSteps:11400}),auth=server();
  const call=(actorId,extra={})=>auth.transact({roomId,actorId,...extra});
  try{
   const opened=await auth.bootstrap({roomId,caseId,members,hostId:'a',actorId:'a',mode:'competitive'});
   const [p,q]=opened.clinical.shift.patients;
   assert(p&&q&&p.uid!==q.uid&&p.bedId!==q.bedId);
   for(const m of members){
    const before=await call(m.id,{claim:p.uid});
    assert(before.clinical.shift.patients.every(x=>!x.ownerId),'remote patient claim succeeded');
   }
   const nav=createWorld(content,{id:'a',name:'Bot'}).navigation;
   const bed=id=>nav.center(...content.beds.find(b=>b.id===id).approach);
   const a=bed(q.bedId),b=bed(p.bedId);
   await call('a',{motion:[a.x,a.y],motionSequence:1});
   await call('b',{motion:[b.x,b.y],motionSequence:1});
   now+=20000;await call('a');
   const first=await call('b',{claim:p.uid});
   assert.equal(first.clinical.shift.patients[0].ownerId,'b');
   const next=await call('a',{claim:q.uid});
   assert.equal(next.clinical.shift.patients[1].ownerId,'a');
   await call('a',{claim:p.uid});
   for(const m of members.slice(2))await call(m.id,{claim:p.uid});
   const wrong=await call('a',{commands:[{id:'cross-order',text:'Enfermera ceftriaxona 1 g',targetPatientUid:p.uid}]});
   assert.equal(wrong.acknowledgements[0].reason,'patient-selection-changed');
   const legitimate=await call('b',{commands:[{id:'bedside-signs',text:'/signos'}]});
   assert.equal(legitimate.clinical.patient.uid,p.uid);
   assert.equal(legitimate.clinical.shift.patients[0].ownerId,'b');
   assert.equal(legitimate.clinical.shift.patients[1].ownerId,'a');
   assert.equal(legitimate.claims.length,0,'nonterminal orders granted XP');
   auth=server();
   const resumed=await call('a');
   assert.equal(resumed.clinical.shift.patients[0].ownerId,'b');
   assert.equal(resumed.clinical.shift.patients[1].ownerId,'a');
   assert.equal(resumed.claims.length,0);
   report.push({caseId,doctors,owners:['b','a'],recovered:true});
  }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
 });
}

for(const caseId of cases){
 test('competitive intelligent bot '+caseId+': authentic handoff, exactly one owner XP and durable closure',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-good-bot-'));
  const store=createSqliteGuardStore(path.join(dir,'guard.sqlite'));
  const roomId='smart-'+caseId,members=[{id:'a',name:'Rival'},{id:'b',name:'Physician'}];
  let now=1700000000000,serial=0;
  const server=()=>createDurableGuardAuthority({store,content,now:()=>now,maxSteps:11500});
  let authority=server();
  const call=(actorId,extra={})=>authority.transact({roomId,actorId,...extra});
  const send=text=>call('b',{commands:[{id:'smart-'+(++serial),text}]});
  try{
   const open=await authority.bootstrap({roomId,caseId,members,hostId:'a',actorId:'a',mode:'competitive'});
   const patient=open.clinical.shift.patients[0],p=plans[caseId];
   const nav=createWorld(content,{id:'a',name:'Rival'}).navigation;
   const target=nav.center(...content.beds.find(b=>b.id===patient.bedId).approach);
   await call('b',{motion:[target.x,target.y],motionSequence:1});
   now+=20000;
   const selected=await call('b',{claim:patient.uid});
   assert.equal(selected.clinical.shift.patients[0].ownerId,'b');
   const commands=[...(p.history||[]),'/signos',
    ...['general','inspection','auscultation','percussion','palpation'].map(x=>'/examen '+x),
    '/diagnostico '+p.dx,...(p.studies||[]).map(x=>'/estudio '+x),
    ...(caseId==='PERI-SEC-001'?
      ['Enfermera una vía',
       'Enfermera monitor y Ringer 1000 ml y ceftriaxona 1 g y metronidazol 500 mg y noradrenalina 0.05 mcg/kg/min IV y oxigeno 4 L/min']:
      p.meds),...(p.consult?[p.consult]:[])];
   for(const text of commands)await send(text);
   now+=p.wait*1000;await call('b');
   await send('/reevaluar');
   let before=await call('b');
   // Secondary sepsis uses a physical nursing dispatcher in multiplayer.
   // Reassess again after actual bedside delivery, rather than pretending
   // that a queued IV order has already stabilized the patient.
   if(caseId==='PERI-SEC-001'&&!before.clinical.eligibleDestinations.includes(p.dest)&&
      !before.clinical.patient.caseEnded){
    now+=40000;await call('b');await send('/reevaluar');before=await call('b');
   }
   assert(before.clinical.eligibleDestinations.includes(p.dest),
    caseId+' absent valid handoff: '+JSON.stringify({eligible:before.clinical.eligibleDestinations,
     missing:before.clinical.closure?.missing,
     consults:before.clinical.patient.consults,pending:before.clinical.patient.pendingTreatments,
     died:before.clinical.patient.patientDied,vitals:before.clinical.patient.liveVitals}));
   const terminal=await send('/disposicion '+p.dest);
   assert.equal(terminal.clinical.patient.closure?.closed,true,caseId+' failed clinical closure');
   assert.equal(terminal.clinical.patient.closure.destination,p.dest);
   assert.equal(terminal.clinical.shift.outcomes.length,1);
   assert.equal(terminal.claims.length,1,'only one competitive doctor earns XP');
   assert.equal(terminal.claims[0][0],'b');
   assert(terminal.claims[0][1].xp>0);
   assert.equal(terminal.clinical.shift.patients[0].departed,true);
   if(['quirofano','procedimiento'].includes(p.dest))
    assert(!terminal.clinical.patient.treatments.some(x=>['surgery','source_control'].includes(x.id)),
     'a transfer cannot falsely register a performed operation');
   authority=server();
   const restored=await call('b');
   assert.equal(restored.claims.length,1);
   const again=await send('/disposicion '+p.dest);
   assert.equal(again.claims.length,1,'a repeated disposition cannot mint XP');
   report.push({caseId,doctors:2,strategy:'intelligent',xp:again.claims[0][1].xp,destination:p.dest});
  }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
 });
}

test('28 competitive bot runs cover all seven cases and the 2/3/4-physician capacities',()=>{
 assert.equal(cases.length,7);
 console.log('ATRIA_COMPETITIVE_CHAOS_BOTS='+JSON.stringify(report));
});
