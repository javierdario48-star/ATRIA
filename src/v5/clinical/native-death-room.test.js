import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};

test('C12.f1b: native death closes room once; no XP, repeated closure or medication administration afterwards',async()=>{
 const s=createGuardSession({roomId:'death-room',mode:'solo',actorId:'doc',actorName:'Doctor',
  patient:{uid:'P',caseId:'CIRR-001'},content,resolveContext:()=>({patientUid:'P'})});
 let i=0;const send=text=>s.post({id:'message-'+(++i),text});
 try{
  await send('Enfermera una vía');
  for(let n=0;n<20;n++){
   const res=await send('Enfermera Ringer 500 ml');
   assert.equal(res.clinical[0].status,'pending');
   s.advance(.81);await s.flush();
  }
  s.advance(720);await s.flush();
  const state=s.read(),death=state.room.events.filter(x=>x.type==='clinical.patient-died');
  assert.equal(state.patient.patientDied,true);
  assert.equal(state.patient.caseEnded,true);
  assert.equal(state.patient.closure,null);
  assert.equal(state.room.patients[0].closed,true);
  assert.equal(state.room.patients[0].died,true);
  assert.equal(state.room.patients[0].deathReason,'critical-hypoxemia');
  assert.equal(death.length,1);
  assert.equal(death[0].patientUid,'P');
  assert.equal(state.progress.xp,0);
  assert.equal(state.progress.receipts.length,0);
  assert(state.messages.some(x=>x.role==='system'&&x.text.includes('falleció')));
  const beforeCount=state.patient.administrationLog.length;
  const denied=await send('Enfermera Ringer 500 ml');
  assert.equal(denied.clinical[0].reason,'patient-not-active');
  const deniedClose=await send('Enfermera internar en sala');
  assert.equal(deniedClose.clinical[0].reason,'patient-not-active');
  s.advance(120);await s.flush();
  assert.equal(s.read().room.events.filter(x=>x.type==='clinical.patient-died').length,1);
  assert.equal(s.read().patient.administrationLog.length,beforeCount);
 }finally{s.dispose();}
});
