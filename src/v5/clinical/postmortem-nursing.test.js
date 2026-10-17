import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};

test('nurse arrivals after native patient death can only reject remaining bedside orders',async()=>{
 const journeys=[],arrivals=[],nativeAccepts=[];
 const nursing={
  enqueue(task){journeys.push({...task});return {status:'travelling'};},
  takeArrivals(){return arrivals.splice(0);},
  accept(result){nativeAccepts.push(result);return {status:result.status==='executed'?'confirmed':'rejected'};}
 };
 const s=createGuardSession({roomId:'death-nurse',mode:'solo',actorId:'doc',
  actorName:'Doctor',patient:{uid:'P',caseId:'CIRR-001'},content,
  resolveContext:()=>({patientUid:'P'}),nursing});
 let number=0;const post=text=>s.post({id:'m-'+(++number),text});
 const arrive=()=>{const job=journeys.shift();assert(job,'expected real pending task');
  arrivals.push(job);return s.finishNurseArrivals();};
 try{
  assert.equal((await post('Enfermera una vía')).clinical[0].status,'pending');
  arrive();await s.flush();
  assert.equal(s.read().patient.venousAccessCount,1);
  for(let i=0;i<20;i++){
   assert.equal((await post('Enfermera Ringer 500 ml')).clinical[0].status,'pending');
   arrive();s.advance(.81);await s.flush();
  }
  assert.equal(s.read().patient.administrationLog.filter(x=>x.id==='fluid').length,20);
  const monitor=await post('Enfermera monitor');
  assert.equal(monitor.clinical[0].status,'pending');
  const wait=journeys[0];assert(wait);
  s.advance(720);await s.flush();
  const state=s.read();
  assert.equal(state.patient.patientDied,true);
  assert.equal(state.room.patients[0].closed,true);
  const completion=state.room.events.filter(x=>x.type==='clinical.completed'&&x.commandId===monitor.commandId);
  assert.equal(completion.length,1);
  assert.equal(completion[0].clinical[0].status,'rejected');
  assert.equal(completion[0].clinical[0].reason,'patient-not-active');
  const n=state.patient.administrationLog.length;
  arrive();await s.flush();
  assert(nativeAccepts.some(x=>x.eventId===wait.eventId&&x.status==='rejected'));
  assert.equal(s.read().patient.administrationLog.length,n);
  assert.equal(s.read().room.events.filter(x=>x.type==='clinical.patient-died').length,1);
 }finally{s.dispose();}
});
