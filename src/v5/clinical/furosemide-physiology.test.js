import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCirrCare} from './cirr-care.js';
import {createAppCare} from './app-care.js';
import {advanceCirrVitals} from './native-cirr.js';
import {advanceAppVitals} from './native-app.js';
import {applyConfirmedIVTargetOffsets} from './pharmacology-catalog.js';
import {summarizeIVExposures} from './medication-exposure.js';
import {createWorld} from '../app/world.js';
import {createGuardSession} from './guard-session.js';

const data=name=>JSON.parse(readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:data('cases'),therapies:data('therapies'),defaultDoses:data('default-doses'),
 map:data('hospital'),beds:data('beds')};
const at=n=>({clinicalMinute:n,nativeMinute:n});
const cmd=(p,key,clause='furosemida 40 mg IV')=>({eventId:key,actorId:'doctor',patientUid:p.uid,
 intent:{kind:'therapy.request',id:'furosemide',clause,sourceText:clause}});
function fixture(id){
 const c=structuredClone(content.cases.find(x=>x.id===id)),p={uid:id+'-patient',caseId:id,orders:[],treatments:[]};
 const opts={mode:'solo',defaultDoses:content.defaultDoses,progress:{award(){}}};
 const care=id==='APP-001'?createAppCare(p,c,opts):createCirrCare(p,c,opts);
 p.venousAccessCount=1;
 return {p,c,care,advance:id==='APP-001'?advanceAppVitals:advanceCirrVitals};
}
function deliver(f,key='dose-a',start=0){
 const req=f.care.execute(cmd(f.p,key),at(start));
 assert.equal(req.status,'pending');
 assert.equal(f.p.administrationLog.length,start===0?0:1);
 // Effective V19 preparation is 550ms in APP/CIRR/PERI, verified against
 // actual legacy receipts. The previous 1.5s assumption was incorrect.
 assert.deepEqual(f.care.advance(at(start),at(start+.54),.54),[]);
 const done=f.care.advance(at(start+.54),at(start+.56),.02);
 assert.equal(done.length,1);assert.equal(done[0].receipt.sourceEventId,key);
 return done[0];
}
test('C12.e2 IV furosemide valid for both native cases; invalid doses/routes never queue',()=>{
 for(const id of ['APP-001','CIRR-001']){
  const f=fixture(id);
  for(const clause of ['furosemida 20 mg','furosemida oral 40 mg','furosemida 40 ml',
   'furosemida 40 mg y 80 mg','furosemida -40 mg'])
   assert.equal(f.care.execute(cmd(f.p,'bad-'+clause,clause),at(0)).status,'rejected');
  assert.equal(f.p.pendingTreatments.length,0);
  assert.equal(f.p.administrationLog.length,0);
  deliver(f);
  assert.equal(f.p.administrationLog[0].dose.amount,40);
  assert.equal(summarizeIVExposures(f.p).byDrug.furosemide.totalAmount,40);
  f.care.dispose();
 }
});
test('C12.e2 pending orders leave vitals untouched; target rises only after confirmed onset',()=>{
 for(const id of ['APP-001','CIRR-001']){
  const f=fixture(id),control=fixture(id);
  assert.equal(f.care.execute(cmd(f.p,'pending'),at(0)).status,'pending');
  f.advance(f.p,f.c,1,1);control.advance(control.p,control.c,1,1);
  assert.deepEqual(f.p.liveVitals,control.p.liveVitals);
  assert.deepEqual(applyConfirmedIVTargetOffsets({...f.p.liveVitals},f.p,f.c,1),f.p.liveVitals);
  f.care.dispose();control.care.dispose();
 }
});
test('C12.e2 diuretic improves CIRR congestion slowly, without false BP or normoxic SpO2 gains',()=>{
 const f=fixture('CIRR-001'),control=fixture('CIRR-001');
 deliver(f);
 const immediate=applyConfirmedIVTargetOffsets({...f.p.liveVitals},f.p,f.c,1.51);
 assert.equal(immediate.rr,f.p.liveVitals.rr);
 f.advance(f.p,f.c,30,31.51);
 control.advance(control.p,control.c,31.51,31.51);
 assert(f.p.liveVitals.rr<control.p.liveVitals.rr);
 assert.equal(f.p.liveVitals.sys,control.p.liveVitals.sys);
 assert(f.p.liveVitals.spo2<=Math.max(97,control.p.liveVitals.spo2)+1e-9);
 f.care.dispose();control.care.dispose();
});
test('C12.e2 APP hypotension worsens if furosemide is prescribed despite no indication',()=>{
 const f=fixture('APP-001'),control=fixture('APP-001');
 deliver(f);
 // This is an acute hypotensive state AT administration, not before the
 // preparation period (when the baseline physiology would restore pressure).
 f.p.liveVitals.sys=75;f.p.liveVitals.dia=42;
 control.p.liveVitals.sys=75;control.p.liveVitals.dia=42;
 f.advance(f.p,f.c,35,36.51);
 control.advance(control.p,control.c,36.51,36.51);
 assert(f.p.liveVitals.sys<control.p.liveVitals.sys-1);
 assert(f.p.liveVitals.dia<control.p.liveVitals.dia);
 f.care.dispose();control.care.dispose();
});
test('C12.e2 same event replay cannot double-dose; distinct legitimate second order can',()=>{
 const f=fixture('CIRR-001');
 deliver(f);
 assert.equal(f.care.execute(cmd(f.p,'dose-a'),at(2)).receipt.reused,true);
 assert.equal(f.p.administrationLog.length,1);
 deliver(f,'dose-b',2);
 assert.deepEqual(f.p.administrationLog.map(x=>x.sourceEventId),['dose-a','dose-b']);
 assert.equal(summarizeIVExposures(f.p).byDrug.furosemide.totalAmount,80);
 for(const edit of [p=>p.administrationLog[1].patientUid='wrong',
  p=>p.administrationLog[1].sourceEventId='dose-a',p=>p.administrationLog[1].dose.amount=80]){
  const p=structuredClone(f.p);edit(p);
  assert.throws(()=>applyConfirmedIVTargetOffsets({...p.liveVitals},p,f.c,50),/invalid or unconfirmed/);
 }
 const other={...structuredClone(f.p),uid:'second-patient'};
 assert.throws(()=>applyConfirmedIVTargetOffsets({...other.liveVitals},other,f.c,50),/invalid or unconfirmed/);
 f.p.caseEnded=true;const before=structuredClone(f.p.liveVitals);
 f.advance(f.p,f.c,30,50);
 assert.deepEqual(f.p.liveVitals,before);
 f.care.dispose();
});
async function walk(f,ready){
 for(let i=0;i<2200;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  if(ready(f.session.read().patient))return;
 }
 assert.fail('physical nurse journey did not finish');
}
test('C12.e2 Solitario/Aprendiz require nurse arrival and IV access before confirmed diuretic',async()=>{
 for(const mode of ['solo','apprentice']){
  const world=createWorld(content,{name:'Doctor',scrubColor:'navy'});
  world.enterLobby();world.enterGuard({mode,caseId:'CIRR-001'});
  const patient=world.snapshot().patients[0];
  const session=createGuardSession({roomId:'furo-'+mode,mode,actorId:'doctor',actorName:'Doctor',
   patient,content,resolveContext:()=>({patientUid:patient.uid}),
   nursing:{enqueue:t=>world.enqueueNurseJourney(t),takeArrivals:()=>world.takeNurseArrivals(),
    accept:t=>world.acceptNurseClinicalResult(t)}});
  try{
   assert.equal((await session.post({id:'iv',text:'Enfermera una vía'})).clinical[0].status,'pending');
   await walk({world,session},p=>p.venousAccessCount===1);
   assert.equal((await session.post({id:'furo',text:'Enfermera furosemida 40 mg IV'})).clinical[0].status,'pending');
   session.advance(3);await session.flush();
   assert.equal(session.read().patient.administrationLog.length,0);
   await walk({world,session},p=>p.pendingTreatments.some(t=>t.id==='furosemide'));
   assert.equal(session.read().patient.administrationLog.length,0);
   session.advance(1.6);await session.flush();
   assert.equal(session.read().patient.administrationLog.filter(x=>x.id==='furosemide').length,1);
   const row=session.pharmacologyRead().drugs.find(x=>x.id==='furosemide');
   assert.equal(row.state,'confirmed');
   assert.deepEqual(row.ownedAxes,['sys','dia','hr','rr','spo2']);
   assert.equal(row.candidateOffsets.rr,0);
   await session.post({id:'furo',text:'Enfermera furosemida 40 mg IV'});
   assert.equal(session.read().patient.administrationLog.filter(x=>x.id==='furosemide').length,1);
   session.advance(40);await session.flush();
   assert(Number.isFinite(session.read().patient.liveVitals.rr));
  }finally{session.dispose();world.enterLobby();}
 }
});

test('C12.e2 confirmed excessive repeat diuresis has delayed bounded circulatory harm',()=>{
 for(const id of ['APP-001','CIRR-001']){
  const f=fixture(id),p=f.p;
  for(let i=0;i<13;i++){
   const row={id:'furosemide',patientUid:p.uid,sourceEventId:'repeat-'+i,
    dose:{amount:40,unit:'mg'},route:'iv',administeredAtNativeMinute:i};
   p.administrationLog.push(row);p.treatments.push({...row});
  }
  const firstOnly={...p,administrationLog:p.administrationLog.slice(0,1),
   treatments:p.treatments.slice(0,1)};
  const baseline={...p.liveVitals};
  const early=applyConfirmedIVTargetOffsets({...baseline},firstOnly,f.c,2);
  const lateSingle=applyConfirmedIVTargetOffsets({...baseline},firstOnly,f.c,72);
  const lateRepeated=applyConfirmedIVTargetOffsets({...baseline},p,f.c,72);
  assert(lateRepeated.sys<lateSingle.sys-20,id+' repeated IV furosemide must lower perfusion');
  assert(lateRepeated.dia<lateSingle.dia-10,id+' repeated IV furosemide must lower diastolic pressure');
  assert(lateRepeated.hr>lateSingle.hr+10,id+' compensatory tachycardia expected');
  assert(Number.isFinite(early.sys));
  assert(lateRepeated.sys>baseline.sys-60,'bounded educational adverse response');
  f.care.dispose();
 }
});
