import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld} from '../app/world.js';
import {createGuardSession} from './guard-session.js';
const load=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const wire=x=>JSON.parse(JSON.stringify(x));
function fixture(caseId='PERI-PBE-001',saved=null){
 const world=createWorld(content,{id:'doctor',name:'Doctor',scrubColor:'navy'},saved?.world);
 if(!saved)world.enterGuard({mode:'coop',caseId,patientUid:'recovery-patient',members:[{id:'doctor',name:'Doctor'},{id:'guest',name:'Guest'}]});
 const patient=world.snapshot().patients[0];
 const session=createGuardSession({roomId:'recovery',mode:'coop',actorId:'doctor',actorName:'Doctor',patient,content,
  members:[{id:'doctor',name:'Doctor'},{id:'guest',name:'Guest'}],
  resolveContext:()=>({patientUid:patient.uid}),checkpoint:saved?.session,
  nursing:{enqueue:t=>world.enqueueNurseJourney(t),takeArrivals:()=>world.takeNurseArrivals(),accept:r=>world.acceptNurseClinicalResult(r)}});
 return {world,session};
}
async function checkpoint(f){return wire({world:f.world.checkpoint(),session:await f.session.checkpoint()});}
async function step(f,count,typing=false){for(let i=0;i<count;i++){f.world.step(1/60);f.session.finishNurseArrivals();f.session.advance(1/60,{typing});}await f.session.flush();}
function compare(a,b){assert.deepEqual(wire(b.session.read()),wire(a.session.read()));assert.deepEqual(b.world.snapshot(),a.world.snapshot());assert.deepEqual(b.world.nurseJourneySnapshot(),a.world.nurseJourneySnapshot());}
for(const caseId of ['APP-001','CIRR-001','PERI-SEC-001','PERI-PBE-001','PERI-TER-001'])test('complete checkpoint resumes physical access, queued drugs, duplicate studies and consultations: '+caseId,async()=>{
 const live=fixture(caseId);
 await live.session.post({id:'meds',text:'Enfermera monitor y ceftriaxona 1 g y albumina 1.5 g/kg'});
 await live.session.post({id:'study',text:'Enfermera hemograma'});
 await live.session.post({id:'study-alias',text:'Enfermera hemograma'});
 const consult=await live.session.post({id:'consult',text:'/consulta cirugia'});assert.equal(consult.clinical[0].status,'pending');
 const duplicate=await live.session.post({id:'consult-alias',text:'/consulta cirugia'});assert.equal(duplicate.clinical[0].status,'pending');
 await step(live,7,true);
 const saved=await checkpoint(live),resumed=fixture(caseId,saved);
 compare(live,resumed);
 for(let i=0;i<12;i++){
  await step(live,200,i%2===0);await step(resumed,200,i%2===0);compare(live,resumed);
  const next=fixture(caseId,await checkpoint(resumed));resumed.session.dispose();resumed.world.enterLobby();Object.assign(resumed,next);
 }
 const remaining=Math.ceil((live.session.read().patient.orders[0].readyAtMinute-live.session.read().clock.clinicalMinute)*60)+1;
 await step(live,Math.max(0,remaining));await step(resumed,Math.max(0,remaining));compare(live,resumed);
 assert.equal(resumed.session.read().patient.administrationLog.filter(x=>x.id==='ceftriaxone').length,1);
 assert.equal(resumed.session.read().patient.orders.length,1);
 assert.equal(resumed.session.read().patient.orders[0].status,'done');
 const retry={id:'meds',text:'Enfermera monitor y ceftriaxona 1 g y albumina 1.5 g/kg'};
 assert.deepEqual(await resumed.session.post(retry),await live.session.post(retry));
 assert.equal(resumed.session.read().patient.administrationLog.filter(x=>x.id==='ceftriaxone').length,1);
 for(const f of [live,resumed]){f.session.dispose();f.world.enterLobby();}
});
test('checkpoint rejects incompatible schema, patient, room and clock before restoring clinical execution',async()=>{
 const f=fixture(),saved=await checkpoint(f);
 for(const mutate of [s=>s.session.schemaVersion++,s=>s.session.roomId='other',s=>s.session.patient.uid='other',s=>s.session.clock.current.nativeQuanta++]){
  const bad=wire(saved);mutate(bad);assert.throws(()=>fixture('PERI-PBE-001',bad),/checkpoint|clock|patient|room|incompatible/i);
 }
 f.session.dispose();f.world.enterLobby();
});

test('death settles a pending receiving-team consultation before a recovery checkpoint',async()=>{
 const f=fixture();let critical=false;
 for(let i=0;i<2400&&!critical;i++){
  f.session.advance(.25);await f.session.flush();
  critical=(f.session.read().patient.survival?.exposureNativeMinutes??0)>=1.1;
 }
 assert(critical);assert(!f.session.read().patient.patientDied);
 const requested=await f.session.post({id:'team',text:'Enfermera interconsulta UTI'});
 assert.equal(requested.clinical[0].status,'pending');
 const restored=fixture('PERI-PBE-001',await checkpoint(f));
 for(const x of [f,restored]){x.session.advance(3);await x.session.flush();assert(x.session.read().patient.patientDied);}
 compare(f,restored);const saved=await checkpoint(restored);
 assert(!saved.session.port.receipts.some(([,r])=>r.ack.status==='pending'));
 assert.equal(restored.session.read().room.events.filter(x=>x.type==='clinical.patient-died').length,1);
 f.session.dispose();restored.session.dispose();
});

test('mid-preparation checkpoint preserves alias receipts, CIRR oral work and pending pressor rate/stop',async()=>{
 for(const caseId of ['CIRR-001','PERI-TER-001']){
  const make=checkpoint=>createGuardSession({roomId:'prep',mode:'solo',actorId:'doctor',actorName:'Doctor',patient:{uid:'P',caseId},content,
   resolveContext:()=>({patientUid:'P'}),checkpoint});
  let s=make();const send=(id,text)=>s.post({id,text});
  await send('iv','Enfermera una vía');await send('pressor','Enfermera noradrenalina 0.05 mcg/kg/min');
  await send('alias','Enfermera noradrenalina 0.05 mcg/kg/min');
  if(caseId==='CIRR-001'){await send('oral','Enfermera espironolactona');await send('oral-alias','Enfermera espironolactona');}
  for(const action of ['initial','titrate','stop']){
   if(action==='titrate')await send('rate','Enfermera noradrenalina 0.1 mcg/kg/min');
   if(action==='stop')await send('stop','Enfermera suspender noradrenalina');
   s.advance(.2);await s.flush();const state=wire(s.read()),saved=wire(await s.checkpoint());
   assert(saved.care.iv.tasks.length>0);const restored=make(saved);assert.deepEqual(wire(restored.read()),state);
   for(const session of [s,restored]){session.advance(3);await session.flush();}
   assert.deepEqual(wire(restored.read()),wire(s.read()));s.dispose();s=restored;
  }
  assert.equal(s.read().patient.procedures.vasopressor.active,false);
  assert.equal(s.read().patient.administrationLog.filter(x=>x.id==='vasopressor').length,3);
  for(const id of ['pressor','alias'])assert.equal((await send(id,'Enfermera noradrenalina 0.05 mcg/kg/min')).clinical[0].status,'executed');
  s.dispose();
 }
});
