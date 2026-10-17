import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {oxygenationTargetOffset} from './oxygen-physiology.js';
import {initialAppVitals,advanceAppVitals} from './native-app.js';
import {initialCirrVitals,advanceCirrVitals} from './native-cirr.js';
import {executeOxygenSupport} from './observations.js';
import {createWorld} from '../app/world.js';
import {createGuardSession} from './guard-session.js';

const data=id=>JSON.parse(readFileSync(new URL('../content/'+id+'.json',import.meta.url)));
const cases=data('cases');
const fixture=(id,spo2)=>{const c=structuredClone(cases.find(x=>x.id===id));
 c.vitals.spo2=spo2;
 const p={uid:'P1',liveVitals:id==='APP-001'?initialAppVitals(c):initialCirrVitals(c),
  procedures:{},administrationLog:[],treatments:[],caseEnded:false};
 return {p,c,advance:id==='APP-001'?advanceAppVitals:advanceCirrVitals};
};
const command=(key,kind,text)=>({eventId:key,actorId:'doctor',patientUid:'P1',intent:{kind,id:'oxygen',clause:text}});
const run=(p,c,advance,delta,nativeMinute)=>advance(p,c,delta,nativeMinute);
test('C12e confirmed 2 and 4 L/min oxygen raises low Sat gradually in both native cases, no parallel writer',()=>{
 for(const id of ['APP-001','CIRR-001']){
  const a=fixture(id,85),control=structuredClone(a.p),two=structuredClone(a.p),four=a.p;
  const start=cmd=>executeOxygenSupport(cmd,command('oxygen','therapy.request','oxigeno 4 L/min'),{clinicalMinute:0,nativeMinute:1});
  const proof=start(four);
  assert.equal(proof.status,'executed');assert.equal(proof.receipt.patientUid,'P1');
  executeOxygenSupport(two,command('oxygen2','therapy.request','oxigeno 2 L/min'),{clinicalMinute:0,nativeMinute:1});
  assert(oxygenationTargetOffset(four,a.c,1)<.01,'legacy onset has a bounded numerical epsilon at t=0');
  const before=structuredClone(four.liveVitals);
  run(four,a.c,a.advance,30,4);
  run(two,a.c,a.advance,30,4);
  run(control,a.c,a.advance,30,4);
  assert(four.liveVitals.spo2>two.liveVitals.spo2,id+' 4 L/min must improve more than 2 L/min');
  assert(two.liveVitals.spo2>control.liveVitals.spo2,id+' 2 L/min must improve hypoxemia');
  assert(four.liveVitals.spo2<99);
  assert.deepEqual(Object.keys(before).filter(k=>k!=='spo2').map(k=>four.liveVitals[k]),
   Object.keys(before).filter(k=>k!=='spo2').map(k=>control.liveVitals[k]),
   'oxygen cannot change unrelated vitals in this game model');
  assert.equal(four.administrationLog.length,1);
 }
});
test('C12e normoxia has no false oxygen benefit and stopping removes support without extra medicine',()=>{
 for(const id of ['APP-001','CIRR-001']){
  const f=fixture(id,98),p=f.p;
  executeOxygenSupport(p,command('oxygen','therapy.request','oxigeno 4 L/min'),{clinicalMinute:0,nativeMinute:1});
  run(p,f.c,f.advance,25,5);
  assert.equal(p.liveVitals.spo2,98,'normal 98% never gets an extra saturation gain');
  const one=p.administrationLog.length;
  const reused=executeOxygenSupport(p,command('repeat','therapy.request','oxigeno 4 L/min'),{clinicalMinute:30,nativeMinute:5});
  assert.equal(reused.receipt.reused,true);assert.equal(p.administrationLog.length,one);
  const stop=executeOxygenSupport(p,command('stop','therapy.stop','suspender oxigeno'),{clinicalMinute:31,nativeMinute:6});
  assert.equal(stop.status,'executed');assert.equal(oxygenationTargetOffset(p,f.c,7),0);
  assert.deepEqual(p.administrationLog.map(x=>x.action),['start','stop']);
 }
});
test('C12e hypoxemia returns toward disease baseline after stopping oxygen',()=>{
 const f=fixture('CIRR-001',84),p=f.p;
 executeOxygenSupport(p,command('start','therapy.request','oxigeno 4 L/min'),{clinicalMinute:0,nativeMinute:1});
 run(p,f.c,f.advance,45,5);
 const on=p.liveVitals.spo2;
 executeOxygenSupport(p,command('stop','therapy.stop','suspender oxigeno'),{clinicalMinute:46,nativeMinute:6});
 run(p,f.c,f.advance,45,12);
 assert(p.liveVitals.spo2<on,'oxygen must not remain active after stop');
 assert(p.liveVitals.spo2>83&&p.liveVitals.spo2<99);
});
test('C12e forged active-device state without completed bedside receipt cannot affect monitor',()=>{
 const f=fixture('APP-001',86);
 f.p.procedures.oxygen={active:true,flowLpm:4,sourceEventId:'fake'};
 assert.throws(()=>run(f.p,f.c,f.advance,2,4),/unique confirmed receipt/);
 assert.equal(f.p.liveVitals.spo2,86);
 f.p.procedures.oxygen.active=false;
 const other=executeOxygenSupport(f.p,command('actual','therapy.request','oxigeno 4 L/min'),{clinicalMinute:1,nativeMinute:3});
 assert.equal(other.status,'executed');
 // SourceEventId, patient identity, dose and timeline must all agree.
 f.p.procedures.oxygen.sourceEventId='fake';
 assert.throws(()=>oxygenationTargetOffset(f.p,f.c,4),/unique confirmed receipt/);
 f.p.procedures.oxygen.sourceEventId='actual';
 f.p.administrationLog[0].patientUid='other';
 assert.throws(()=>oxygenationTargetOffset(f.p,f.c,4),/unique confirmed receipt/);
 f.p.administrationLog[0].patientUid='P1';
 assert.throws(()=>oxygenationTargetOffset(f.p,f.c,2),/clock disagree/);
});
test('C12e real physical nurse arrival is required before oxygen support begins to affect session',async()=>{
 const content={cases,therapies:data('therapies'),defaultDoses:data('default-doses'),
  map:data('hospital'),beds:data('beds')};
 const world=createWorld(content,{name:'Doctor',scrubColor:'navy'});
 world.enterLobby();world.enterGuard({mode:'solo',caseId:'CIRR-001'});
 const patient=world.snapshot().patients[0];
 const session=createGuardSession({roomId:'oxygen-real-nurse',mode:'solo',actorId:'doctor',
  actorName:'Doctor',patient,content,resolveContext:()=>({patientUid:patient.uid}),
  nursing:{enqueue:task=>world.enqueueNurseJourney(task),
   takeArrivals:()=>world.takeNurseArrivals(),
   accept:r=>world.acceptNurseClinicalResult(r)}});
 try{
  const rx=await session.post({id:'oxygen',text:'Enfermera oxigeno 4 L/min'});
  assert.deepEqual(rx.clinical.map(x=>x.status),['pending']);
  session.advance(8);await session.flush();
  assert.equal(session.read().patient.procedures.oxygen,undefined);
  assert.equal(session.pharmacologyRead().drugs.find(x=>x.id==='oxygen').state,'not-administered');
  let delivered=false;
  for(let i=0;i<900&&!delivered;i++){
   world.step(1/60);session.finishNurseArrivals();
   delivered=!!session.read().patient.procedures.oxygen?.active;
  }
  assert(delivered,'oxygen must have a physical arrival and confirmed receipt');
  const before=session.read().patient.liveVitals.spo2;
  session.advance(40);await session.flush();
  const after=session.read().patient.liveVitals.spo2;
  assert(after>=before,'normal 96% patient should not become more hypoxemic from oxygen');
  assert.equal(session.pharmacologyRead().drugs.find(x=>x.id==='oxygen').state,'confirmed');
  assert.equal(session.pharmacologyRead().drugs.find(x=>x.id==='oxygen').candidateOffsets.spo2,0,
   'native case owns the oxygen saturation axis');
  assert.equal(session.read().patient.administrationLog.filter(x=>x.id==='oxygen').length,1);
 }finally{session.dispose();world.enterLobby();}
});
