import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld} from '../app/world.js';
import {createGuardSession} from './guard-session.js';
const load=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),
 therapies:load('therapies'),defaultDoses:load('default-doses')};
function fixture(caseId='APP-001'){
 const world=createWorld(content,{name:'Clinical QA',scrubColor:'navy'});
 world.enterLobby();world.enterGuard({mode:'solo',caseId});
 const patient=world.snapshot().patients[0];
 const events=[];
 const session=createGuardSession({
  roomId:'C08-B1',mode:'solo',actorId:'doctor',actorName:'Doctor',patient,content,
  resolveContext:()=>({patientUid:patient.uid}),
  nursing:{enqueue:task=>world.enqueueNurseJourney(task),
   takeArrivals:()=>world.takeNurseArrivals(),
   accept:result=>world.acceptNurseClinicalResult(result)},
  onChange:event=>events.push(event)
 });
 return {world,session,events,patient};
}
async function walkToCompletion(f,limit=1800){
 for(let i=0;i<limit;i++){
  f.world.step(1/60);
  f.session.finishNurseArrivals();
  if(f.world.nurseJourneySnapshot().every(x=>x.stage==='confirmed')){await f.session.flush();return i;}
 }
 assert.fail('nurse did not finish real spatial journey');
}
test('C08b monitor is not connected until real bed arrival and one native receipt',async()=>{
 const f=fixture('CIRR-001');
 const ack=await f.session.post({id:'monitor',text:'Enfermera monitor'});
 assert.deepEqual(ack.clinical.map(x=>x.status),['pending']);
 assert.equal(f.session.read().patient.procedures.monitor?.connected??false,false);
 assert.equal(f.session.read().patient.lastVitalsKnown,null);
 assert.equal(f.world.nurseJourneySnapshot()[0].stage,'travelling');
 f.world.step(1/60);f.session.finishNurseArrivals();
 assert.equal(f.session.read().patient.procedures.monitor?.connected??false,false);
 await walkToCompletion(f);
 const patient=f.session.read().patient;
 assert.equal(patient.procedures.monitor.connected,true);
 assert(Number.isFinite(patient.lastVitalsKnown.vitals.hr));
 const completed=f.events.filter(x=>x.type==='clinical.completed');
 assert.equal(completed.length,1);
 assert.equal(completed[0].clinical[0].receipt.eventId,'C08-B1:doctor:monitor:0');
 assert.equal(completed[0].clinical[0].receipt.patientUid,f.patient.uid);
 assert.equal(f.world.nurseJourneySnapshot()[0].stage,'confirmed');
 await f.session.post({id:'monitor',text:'Enfermera monitor'});
 assert.equal(f.events.filter(x=>x.type==='clinical.completed').length,1,'retry cannot execute twice');
 f.session.dispose();f.world.enterLobby();
});
test('C08b IV stays pending during nurse travel and native APP access is only confirmed at bed',async()=>{
 const f=fixture('APP-001');
 const ack=await f.session.post({id:'iv',text:'Enfermera dos vías'});
 assert.deepEqual(ack.clinical.map(x=>x.status),['pending']);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 assert.deepEqual(f.session.read().patient.procedures.iv,undefined);
 await walkToCompletion(f);
 assert.equal(f.session.read().patient.venousAccessCount,2);
 assert.equal(f.session.read().patient.procedures.iv.count,2);
 assert.equal(f.events.filter(x=>x.type==='clinical.completed').length,1);
 assert.equal(f.world.nurseJourneySnapshot()[0].stage,'confirmed');
 const medication=await f.session.post({id:'abx',text:'Enfermera ceftriaxona 1 g'});
 assert.equal(medication.clinical[0].status,'pending');
 f.session.advance(1.6);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog,[],
  'native antibiotic cannot administer before physical nurse arrival');
 let reached=false;
 for(let i=0;i<800&&!reached;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  reached=f.session.read().patient.pendingTreatments.some(x=>x.id==='ceftriaxone');
 }
 assert.equal(reached,true);
 f.session.advance(1.51);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog.map(x=>x.id),['ceftriaxone']);
 f.session.dispose();f.world.enterLobby();
});
test('C08b independent monitor and IV requests serialize per patient without duplicating clinical execution',async()=>{
 const f=fixture('APP-001');
 const ack=await f.session.post({id:'multiple',text:'Enfermera una vía y monitor'});
 assert.deepEqual(ack.clinical.map(x=>x.status),['pending','pending']);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 assert.equal(f.session.read().patient.procedures.monitor?.connected??false,false);
 assert.deepEqual(f.world.nurseJourneySnapshot().map(x=>x.stage),['travelling','queued']);
 await walkToCompletion(f);
 assert.equal(f.session.read().patient.venousAccessCount,1);
 assert.equal(f.session.read().patient.procedures.monitor.connected,true);
 assert.equal(f.events.filter(x=>x.type==='clinical.completed').length,2);
 assert.equal(new Set(f.events.filter(x=>x.type==='clinical.completed').map(x=>x.eventId)).size,2);
 f.session.dispose();f.world.enterLobby();
});

test('C08b2 APP compound IV, monitor and three medicines require independent bedside arrivals and native timing',async()=>{
 const f=fixture('APP-001');
 const text='Enfermera dos vías, monitor, Ringer 500 ml, ceftriaxona 1 g y metronidazol 500 mg';
 const ack=await f.session.post({id:'combined',text});
 assert.deepEqual(ack.clinical.map(x=>[x.id,x.status]),[
  ['iv','pending'],['monitor','pending'],['fluid','pending'],
  ['ceftriaxone','pending'],['metronidazole','pending']
 ]);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 assert.equal(f.session.read().patient.procedures.monitor?.connected??false,false);
 assert.deepEqual(f.session.read().patient.pendingTreatments,[]);
 const premature=await f.session.post({id:'close-early',text:'/disposicion quirofano'});
 assert.equal(premature.clinical[0].reason,'nursing-work-in-progress');
 f.session.advance(8);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog,[],'preparing without access is prohibited');
 let confirmed=0;
 for(let i=0;i<1800&&confirmed<2;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  confirmed=f.world.nurseJourneySnapshot().filter(t=>t.stage==='confirmed').length;
 }
 assert.equal(confirmed,2,'both IV and monitor must have verified arrivals');
 assert.equal(f.session.read().patient.venousAccessCount,2);
 assert.equal(f.session.read().patient.procedures.monitor.connected,true);
 assert.deepEqual(f.session.read().patient.pendingTreatments,[],'the medicine has not reached the bedside yet');
 // Only the fluid, then each antibiotic, can start their OWN native clocks at bed.
 for(const medicine of ['fluid','ceftriaxone','metronidazole']){
  let ready=false;
  for(let i=0;i<800&&!ready;i++){
   f.world.step(1/60);f.session.finishNurseArrivals();
   ready=f.session.read().patient.pendingTreatments.some(x=>x.id===medicine);
  }
  assert.equal(ready,true,medicine+' must wait for a real nurse arrival');
  const running=f.session.read().patient.pendingTreatments.find(x=>x.id===medicine);
  const before=f.session.read().clock.clinicalMinute;
  assert(running.readyAtRealSecond>before,'preparation starts at arrival only');
  const delay=medicine==='fluid'?.8:1.5;
  f.session.advance(delay-.01);await f.session.flush();
  assert(!f.session.read().patient.treatments.some(x=>x.id===medicine),
   medicine+' cannot be delivered before native preparation finishes');
  f.session.advance(.02);await f.session.flush();
  assert(f.session.read().patient.treatments.some(x=>x.id===medicine),
   medicine+' needs its unique clinical completion receipt');
 }
 await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog.map(x=>x.id),
  ['fluid','ceftriaxone','metronidazole']);
 assert.equal(f.world.nurseJourneySnapshot().filter(x=>x.stage==='confirmed').length,5);
 const completed=f.events.filter(x=>x.type==='clinical.completed');
 assert.equal(completed.length,5);
 assert.equal(new Set(completed.map(x=>x.eventId)).size,5);
 const sourceIds=f.session.read().patient.administrationLog.map(x=>x.sourceEventId);
 await f.session.post({id:'combined',text});
 assert.deepEqual(f.session.read().patient.administrationLog.map(x=>x.sourceEventId),sourceIds);
 f.session.dispose();f.world.enterLobby();
});
test('C08b2 APP medication ordered after IV confirmation stays unadministered while nurse travels',async()=>{
 const f=fixture('APP-001');
 await f.session.post({id:'access',text:'Enfermera una vía'});
 await walkToCompletion(f);
 const order=await f.session.post({id:'med',text:'Enfermera ceftriaxona 1 g'});
 assert.equal(order.clinical[0].status,'pending');
 assert.deepEqual(f.session.read().patient.pendingTreatments,[]);
 f.session.advance(5);await f.session.flush();
 assert.equal(f.session.read().patient.administrationLog.length,0);
 let reached=false;
 for(let i=0;i<800&&!reached;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  reached=f.session.read().patient.pendingTreatments.some(x=>x.id==='ceftriaxone');
 }
 assert.equal(reached,true);
 f.session.advance(1.51);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog.map(x=>x.id),['ceftriaxone']);
 assert.equal(f.world.nurseJourneySnapshot().at(-1).stage,'confirmed');
 f.session.dispose();f.world.enterLobby();
});
test('C08b2 CIRR spironolactone and paracentesis require a nurse, not just elapsed time',async()=>{
 const f=fixture('CIRR-001');
 const first=await f.session.post({id:'spiro',text:'Enfermera espironolactona 100 mg oral'});
 assert.equal(first.clinical[0].status,'pending');
 f.session.advance(5);await f.session.flush();
 assert.equal(f.session.read().patient.treatments.length,0);
 let started=false;
 for(let i=0;i<800&&!started;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  started=f.session.read().patient.pendingTreatments.some(x=>x.id==='espironolactona');
 }
 assert.equal(started,true);
 f.session.advance(.54);await f.session.flush();
 assert.equal(f.session.read().patient.administrationLog.length,0);
 f.session.advance(.02);await f.session.flush();
 assert.equal(f.session.read().patient.administrationLog[0].id,'espironolactona');
 const second=await f.session.post({id:'para',text:'Enfermera paracentesis terapéutica'});
 assert.equal(second.clinical[0].status,'pending');
 let ready=false;
 for(let i=0;i<800&&!ready;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  ready=f.session.read().patient.pendingTreatments.some(x=>x.id==='paracentesis_ter');
 }
 assert.equal(ready,true);
 f.session.advance(.56);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog.map(x=>x.id),
  ['espironolactona','paracentesis_ter']);
 assert.equal(f.world.nurseJourneySnapshot().filter(t=>t.stage==='confirmed').length,2);
 f.session.dispose();f.world.enterLobby();
});
test('C08b malformed dose while IV travels is rejected immediately with no pending fake administration',async()=>{
 const f=fixture('APP-001');
 await f.session.post({id:'iv',text:'Enfermera una vía'});
 const invalid=await f.session.post({id:'bad-dose',text:'Enfermera ceftriaxona 2 g'});
 assert.equal(invalid.clinical[0].status,'rejected');
 assert.equal(invalid.clinical[0].reason,'unsupported-dose');
 assert.equal(f.session.read().patient.administrationLog.length,0);
 await walkToCompletion(f);
 assert.equal(f.session.read().patient.venousAccessCount,1);
 assert.equal(f.session.read().patient.pendingTreatments.length,0);
 assert.equal(f.session.read().patient.administrationLog.length,0);
 f.session.dispose();f.world.enterLobby();
});

test('C08 bedside IV is a real shared CIRR procedure with a verified nurse receipt',async()=>{
 const f=fixture('CIRR-001');
 const command=await f.session.post({id:'user-vias',text:'enfermera vias'});
 assert.deepEqual(command.clinical.map(x=>[x.id,x.status]),[['iv','pending']]);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 await walkToCompletion(f);
 const patient=f.session.read().patient;
 assert.equal(patient.venousAccessCount,2);
 assert.equal(patient.procedures.iv.patientUid,patient.uid);
 assert.equal(patient.procedures.iv.count,2,'plural vías must mean two native accesses');
 const completions=f.events.filter(e=>e.type==='clinical.completed');
 assert.equal(completions.length,1);
 assert.equal(completions[0].clinical[0].receipt.eventId,'C08-B1:doctor:user-vias:0');
 assert.match(f.session.read().messages.at(-1).text,/acceso venoso periférico confirmado/i);
 const originalTasks=f.world.nurseJourneySnapshot().length;
 const again=await f.session.post({id:'again',text:'enfermera via'});
 assert.equal(again.clinical[0].status,'executed','documented access is immediately verified');
 assert.equal(f.world.nurseJourneySnapshot().length,originalTasks,'no fictitious second nursing trip');
 assert.equal(f.session.read().patient.venousAccessCount,2);
 f.session.dispose();f.world.enterLobby();
});
test('C07d isolated Ringer request in a physical guard queues one authorized IV first',async()=>{
 const f=fixture('CIRR-001');
 const action=await f.session.post({id:'ringer-auto-iv',text:'enfermera ringer'});
 assert.deepEqual(action.clinical.map(x=>[x.id,x.status]),[['iv','pending'],['fluid','pending']]);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 assert.equal(f.world.nurseJourneySnapshot().length,1);
 assert.equal(f.world.nurseJourneySnapshot()[0].kind,'iv');
 assert.equal(f.session.read().patient.administrationLog.length,0);
 f.session.dispose();f.world.enterLobby();
});
test('C11 shared formulary executes CIRR Ringer only after IV and bedside preparation without fabricated BP response',async()=>{
 const f=fixture('CIRR-001');
 const before=f.session.read().patient.liveVitals;
 const cmd=await f.session.post({id:'cirr-iv-fluid',text:'enfermera vias y ringer'});
 assert.deepEqual(cmd.clinical.map(x=>[x.id,x.status]),[['iv','pending'],['fluid','pending']]);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 assert.equal(f.session.read().patient.pendingTreatments.length,0);
 let connected=false;
 for(let i=0;i<900&&!connected;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  connected=f.session.read().patient.venousAccessCount===2;
 }
 assert(connected,'both IVs need an actual clinical receipt');
 assert.equal(f.session.read().patient.administrationLog.length,0);
 let preparing=false;
 for(let i=0;i<900&&!preparing;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  preparing=f.session.read().patient.pendingTreatments.some(x=>x.id==='fluid');
 }
 assert(preparing,'Ringer must reach the patient after IV placement');
 f.session.advance(.79);await f.session.flush();
 assert.equal(f.session.read().patient.administrationLog.length,0);
 f.session.advance(.02);await f.session.flush();
 const p=f.session.read().patient;
 assert.deepEqual(p.administrationLog.map(x=>x.id),['fluid']);
 assert.equal(p.administrationLog[0].dose.amount,500);
 assert.equal(p.venousAccessCount,2);
 assert.deepEqual(p.liveVitals,before,
  'the APP-specific crystalloid hemodynamic rescue is not valid in stable CIRR');
 assert.equal(f.events.filter(e=>e.type==='clinical.completed').length,2);
 assert.equal(f.world.nurseJourneySnapshot().filter(t=>t.stage==='confirmed').length,2);
 const log=f.session.read().messages.map(x=>x.text).join(' ');
 assert.match(log,/Administración confirmada: Cristaloides/i);
 f.session.dispose();f.world.enterLobby();
});
test('C11 shared IV formulary validates route and dose in CIRR before any nurse trip',async()=>{
 const f=fixture('CIRR-001');
 await f.session.post({id:'access',text:'enfermera vias'});
 await walkToCompletion(f);
 const previous=f.world.nurseJourneySnapshot().length;
 for(const [id,text] of [
  ['bad-route','enfermera ceftriaxona oral 1 g'],
  ['bad-dose','enfermera ceftriaxona 2 g'],
  ['bad-fluid','enfermera ringer 300 ml']]){
  const cmd=await f.session.post({id,text});
  assert.equal(cmd.clinical[0].status,'rejected',text);
  assert.equal(f.world.nurseJourneySnapshot().length,previous);
 }
 const confirmed=await f.session.post({id:'cef-cirr',text:'enfermera ceftriaxona 1 g IV'});
 assert.equal(confirmed.clinical[0].status,'pending');
 let waiting=false;
 for(let i=0;i<900&&!waiting;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  waiting=f.session.read().patient.pendingTreatments.some(x=>x.id==='ceftriaxone');
 }
 assert(waiting);
 f.session.advance(1.51);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog.map(x=>x.id),['ceftriaxone']);
 assert.equal(f.session.read().patient.administrationLog[0].dose.amount,1000);
 assert.equal(f.session.read().patient.venousAccessCount,2);
 assert.equal(f.session.read().patient.treatments.some(x=>x.id==='metronidazole'),false);
 f.session.dispose();f.world.enterLobby();
});

test('C07d medication-first compound order executes its explicit IV first, never early medication',async()=>{
 const f=fixture('APP-001');
 const text='Enfermera ceftriaxona 1 g y dos vías';
 const first=await f.session.post({id:'med-first',text});
 assert.deepEqual(first.clinical.map(x=>[x.id,x.status]),[['iv','pending'],['ceftriaxone','pending']]);
 assert.deepEqual(f.world.nurseJourneySnapshot().map(x=>x.kind),['iv']);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 f.session.advance(5);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog,[]);
 let access=false;
 for(let i=0;i<900&&!access;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  access=f.session.read().patient.venousAccessCount===2;
 }
 assert(access);await f.session.flush();
 assert.equal(f.session.read().patient.pendingTreatments.length,0);
 let preparing=false;
 for(let i=0;i<900&&!preparing;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  preparing=f.session.read().patient.pendingTreatments.some(t=>t.id==='ceftriaxone');
 }
 assert(preparing);
 f.session.advance(1.51);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog.map(t=>t.id),['ceftriaxone']);
 assert.equal(f.world.nurseJourneySnapshot().filter(t=>t.stage==='confirmed').length,2);
 assert.equal(f.events.filter(e=>e.type==='clinical.completed').length,2);
 await f.session.post({id:'med-first',text});
 assert.equal(f.events.filter(e=>e.type==='clinical.completed').length,2);
 f.session.dispose();f.world.enterLobby();
});
test('C07d medication-only request creates a visible automatic IV and waits for real nurse travel',async()=>{
 const f=fixture('CIRR-001');
 const order=await f.session.post({id:'auto',text:'Enfermera Ringer 500 ml'});
 assert.deepEqual(order.clinical.map(x=>[x.id,x.status]),[['iv','pending'],['fluid','pending']]);
 assert.equal(f.world.nurseJourneySnapshot().length,1);
 assert.equal(f.world.nurseJourneySnapshot()[0].kind,'iv');
 assert.equal(f.session.read().patient.venousAccessCount,0);
 f.session.advance(12);await f.session.flush();
 assert.equal(f.session.read().patient.administrationLog.length,0);
 let atAccess=false;
 for(let i=0;i<900&&!atAccess;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  atAccess=f.session.read().patient.venousAccessCount===1;
 }
 assert(atAccess);
 let prepping=false;
 for(let i=0;i<900&&!prepping;i++){
  f.world.step(1/60);f.session.finishNurseArrivals();
  prepping=f.session.read().patient.pendingTreatments.some(t=>t.id==='fluid');
 }
 assert(prepping);
 f.session.advance(.81);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog.map(t=>t.id),['fluid']);
 assert.equal(f.world.nurseJourneySnapshot().filter(t=>t.stage==='confirmed').length,2);
 assert.deepEqual(f.session.read().patient.administrationLog.map(t=>t.patientUid),[f.patient.uid]);
 assert.equal(f.events.filter(e=>e.type==='clinical.completed').length,2);
 f.session.dispose();f.world.enterLobby();
});
test('C07d invalid IV route/dose never summons a nurse or creates automatic access',async()=>{
 const f=fixture('APP-001');
 for(const [id,text] of [['invalid','Enfermera ceftriaxona oral 1 g'],
  ['wrong-dose','Enfermera ceftriaxona 2 g'],['bad-volume','Enfermera Ringer 300 ml']]){
  const a=await f.session.post({id,text});
  assert.deepEqual(a.clinical.map(x=>[x.status,x.id]),[['rejected',text.includes('Ringer')?'fluid':'ceftriaxone']]);
 }
 assert.equal(f.session.read().patient.venousAccessCount,0);
 assert.equal(f.world.nurseJourneySnapshot().length,0);
 assert.deepEqual(f.session.read().patient.administrationLog,[]);
 f.session.dispose();f.world.enterLobby();
});
test('C07d a second IV medicine reuses an already pending access, not a second catheterization',async()=>{
 const f=fixture('APP-001');
 const first=await f.session.post({id:'iv',text:'Enfermera dos vías'});
 assert.equal(first.clinical[0].status,'pending');
 const second=await f.session.post({id:'meds',text:'Enfermera ceftriaxona 1 g y metronidazol 500 mg'});
 assert.deepEqual(second.clinical.map(x=>x.id),['ceftriaxone','metronidazole']);
 assert.deepEqual(f.world.nurseJourneySnapshot().map(x=>x.kind),['iv']);
 f.session.dispose();f.world.enterLobby();
});

test('C08c real oxygen arrival and idempotence in both native cases',async()=>{
 for(const caseId of ['APP-001','CIRR-001']){
  const f=fixture(caseId),before=f.session.read().patient.liveVitals;
  const first=await f.session.post({id:'oxy',text:'Enfermera oxigeno 4 L/min'});
  assert.deepEqual(first.clinical.map(x=>[x.id,x.status]),[['oxygen','pending']]);
  assert.equal(f.world.nurseJourneySnapshot()[0].kind,'oxygen');
  f.session.advance(5);await f.session.flush();
  assert.equal(f.session.read().patient.procedures.oxygen,undefined);
  assert.deepEqual(f.session.read().patient.administrationLog,[]);
  await walkToCompletion(f);
  const pt=f.session.read().patient;
  assert.equal(pt.procedures.oxygen.flowLpm,4);
  assert.equal(pt.administrationLog[0].sourceEventId,'C08-B1:doctor:oxy:0');
  assert.deepEqual(pt.liveVitals,before);
  assert.equal(f.events.filter(x=>x.type==='clinical.completed')[0].clinical[0].receipt.therapyId,'oxygen');
  const trips=f.world.nurseJourneySnapshot().length;
  const again=await f.session.post({id:'oxy-again',text:'Enfermera oxigeno 4 L/min'});
  assert.equal(again.clinical[0].status,'executed');
  assert.equal(f.world.nurseJourneySnapshot().length,trips);
  assert.equal(f.session.read().patient.administrationLog.length,1);
  f.session.dispose();f.world.enterLobby();
 }
});
test('C08c titration and oxygen suspension use distinct physical trips',async()=>{
 const f=fixture('CIRR-001');
 await f.session.post({id:'start',text:'Enfermera oxigeno 4 L/min'});
 await walkToCompletion(f);
 const change=await f.session.post({id:'change',text:'Enfermera oxigeno 2 L/min'});
 assert.equal(change.clinical[0].status,'pending');
 assert.equal(f.session.read().patient.procedures.oxygen.flowLpm,4);
 await walkToCompletion(f);
 assert.equal(f.session.read().patient.procedures.oxygen.flowLpm,2);
 const stop=await f.session.post({id:'stop',text:'Enfermera suspender oxigeno'});
 assert.deepEqual(stop.clinical.map(x=>[x.kind,x.status]),[['therapy.stop','pending']]);
 assert.equal(f.session.read().patient.procedures.oxygen.active,true);
 await walkToCompletion(f);
 const pt=f.session.read().patient;
 assert.equal(pt.procedures.oxygen.flowLpm,0);
 assert.deepEqual(pt.administrationLog.map(t=>t.action),['start','setRate','stop']);
 assert.equal(f.world.nurseJourneySnapshot().filter(t=>t.stage==='confirmed').length,3);
 assert.equal(f.events.filter(x=>x.type==='clinical.completed').length,3);
 const before=f.world.nurseJourneySnapshot().length;
 const duplicate=await f.session.post({id:'stop-again',text:'Enfermera suspender oxigeno'});
 assert.equal(duplicate.clinical[0].reason,'oxygen-not-active');
 assert.equal(f.world.nurseJourneySnapshot().length,before);
 f.session.dispose();f.world.enterLobby();
});
test('C08c reject invalid oxygen flow/device, negations and questions without nurse movement',async()=>{
 const f=fixture('APP-001');
 for(const [id,text] of [['invalid','Enfermera oxigeno 20 L/min'],
  ['device','Enfermera oxigeno mascara 4 L/min'],
  ['ambiguous','Enfermera oxigeno 2 L/min y 4 L/min']]){
  const ack=await f.session.post({id,text});
  assert.notEqual(ack.clinical[0]?.status,'pending',text);
 }
 await f.session.post({id:'negative',text:'Enfermera no oxigeno'});
 await f.session.post({id:'question',text:'Enfermera oxigeno?'});
 assert.equal(f.world.nurseJourneySnapshot().length,0);
 assert.equal(f.session.read().patient.procedures.oxygen,undefined);
 f.session.dispose();f.world.enterLobby();
});


test('C07e mixed oxygen, monitor, IV, fluid and ceftriaxone have separate bedside proofs',async()=>{
 const f=fixture('APP-001');
 const before=f.session.read().patient.liveVitals;
 const cmd=await f.session.post({id:'full-combo',
  text:'Enfermera oxigeno 4 L/min, monitor, dos vias, Ringer 500 ml y ceftriaxona 1 g'});
 assert.deepEqual(cmd.clinical.map(x=>[x.id,x.status]),[
  ['iv','pending'],['oxygen','pending'],['monitor','pending'],
  ['fluid','pending'],['ceftriaxone','pending']]);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 assert.equal(f.session.read().patient.procedures.oxygen,undefined);
 assert.equal(f.session.read().patient.procedures.monitor?.connected??false,false);
 assert.deepEqual(f.session.read().patient.administrationLog,[]);
 const early=await f.session.post({id:'early-close',text:'/disposicion quirofano'});
 assert.equal(early.clinical[0].reason,'nursing-work-in-progress');
 let finished=false;
 for(let n=0;n<3000;n++){
  f.world.step(1/60);
  f.session.finishNurseArrivals();
  f.session.advance(1/60);
  if(n%60===0)await f.session.flush();
  const jobs=f.world.nurseJourneySnapshot();
  if(jobs.length===5&&jobs.every(x=>x.stage==='confirmed')){
   finished=true;break;
  }
 }
 assert(finished,'all five tasks require travel and native completion');
 await f.session.flush();
 const patient=f.session.read().patient;
 assert.equal(patient.venousAccessCount,2);
 assert.equal(patient.procedures.monitor.connected,true);
 assert.equal(patient.procedures.oxygen.flowLpm,4);
 assert.deepEqual(patient.administrationLog.map(x=>x.id),['oxygen','fluid','ceftriaxone']);
 assert.equal(patient.administrationLog.find(x=>x.id==='fluid').dose.amount,500);
 assert.equal(patient.administrationLog.find(x=>x.id==='ceftriaxone').dose.amount,1000);
 assert.equal(patient.liveVitals.spo2,before.spo2,'oxygen physical support does not boost native APP SpO2');
 assert.equal(f.events.filter(e=>e.type==='clinical.completed').length,5);
 assert.equal(new Set(f.events.filter(e=>e.type==='clinical.completed').map(e=>e.eventId)).size,5);
 assert.equal(f.world.nurseJourneySnapshot().filter(x=>x.stage==='confirmed').length,5);
 const prior=f.session.read().patient.administrationLog.map(x=>x.sourceEventId);
 await f.session.post({id:'full-combo',
  text:'Enfermera oxigeno 4 L/min, monitor, dos vias, Ringer 500 ml y ceftriaxona 1 g'});
 assert.deepEqual(f.session.read().patient.administrationLog.map(x=>x.sourceEventId),prior);
 f.session.dispose();f.world.enterLobby();
});

test('C07e an oxygen job and automatic IV medicines in parallel never share a fake receipt',async()=>{
 const f=fixture('APP-001');
 const oxygen=await f.session.post({id:'oxygen-first',text:'Enfermera oxigeno 4 L/min'});
 assert.deepEqual(oxygen.clinical.map(x=>[x.id,x.status]),[['oxygen','pending']]);
 const drugs=await f.session.post({id:'drugs',text:'Enfermera ceftriaxona 1 g y metronidazol 500 mg'});
 assert.deepEqual(drugs.clinical.map(x=>[x.id,x.status]),
  [['iv','pending'],['ceftriaxone','pending'],['metronidazole','pending']]);
 assert.deepEqual(f.world.nurseJourneySnapshot().map(x=>x.kind),['oxygen','iv']);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 assert.deepEqual(f.session.read().patient.administrationLog,[]);
 let done=false;
 for(let n=0;n<3000;n++){
  f.world.step(1/60);f.session.finishNurseArrivals();f.session.advance(1/60);
  if(n%60===0)await f.session.flush();
  if(f.world.nurseJourneySnapshot().length===4&&
     f.world.nurseJourneySnapshot().every(x=>x.stage==='confirmed')){done=true;break;}
 }
 assert(done,'oxygen and two antibiotics must have physical bedside proofs');
 await f.session.flush();
 const p=f.session.read().patient;
 assert.equal(p.venousAccessCount,1);
 assert.deepEqual(p.administrationLog.map(x=>x.id),['oxygen','ceftriaxone','metronidazole']);
 assert.equal(f.events.filter(e=>e.type==='clinical.completed').length,4);
 assert.equal(new Set(f.events.filter(e=>e.type==='clinical.completed').map(e=>e.eventId)).size,4);
 f.session.dispose();f.world.enterLobby();
});


test('C08d nurse spot-vitals are measured only after reaching the bedside',async()=>{
 for(const caseId of ['APP-001','CIRR-001']){
  const f=fixture(caseId),base=f.session.read().patient.liveVitals;
  const ack=await f.session.post({id:'nurse-vitals',text:'Enfermera signos vitales'});
  assert.deepEqual(ack.clinical.map(x=>[x.kind,x.id,x.status]),[['procedure.request','vitals','pending']]);
  assert.equal(f.session.read().patient.lastVitalsKnown,null);
  assert.equal(f.world.nurseJourneySnapshot()[0].kind,'vitals');
  f.session.advance(6);await f.session.flush();
  assert.equal(f.session.read().patient.lastVitalsKnown,null,'clinical time alone cannot fabricate nurse measurement');
  assert.equal(f.events.filter(e=>e.type==='clinical.completed').length,0);
  await walkToCompletion(f);
  const measured=f.session.read().patient;
  assert.equal(measured.lastVitalsKnown.source,'spot');
  assert.equal(measured.lastVitalsKnown.eventId,'C08-B1:doctor:nurse-vitals:0');
  assert.equal(measured.lastVitalsKnown.patientUid,f.patient.uid);
  assert.deepEqual(measured.lastVitalsKnown.vitals,measured.liveVitals);
  assert.deepEqual(measured.liveVitals,base,'observation does not write native physiology');
  assert.equal(measured.procedures.monitor?.connected??false,false);
  assert.deepEqual(measured.administrationLog,[]);
  assert.equal(f.events.filter(e=>e.type==='clinical.completed').length,1);
  const receipt=f.events.find(e=>e.type==='clinical.completed').clinical[0].receipt;
  assert.equal(receipt.kind,'procedure.request');
  assert.equal(receipt.id,'vitals');
  assert.equal(receipt.patientUid,f.patient.uid);
  assert.equal(receipt.eventId,measured.lastVitalsKnown.eventId);
  f.session.dispose();f.world.enterLobby();
 }
});
test('C08d direct physician vitals remain immediate without a fictitious nursing trip',async()=>{
 const f=fixture('CIRR-001');
 const measurement=await f.session.post({id:'doctor-vitals',text:'/signos'});
 assert.equal(measurement.clinical[0].status,'executed');
 assert.equal(f.session.read().patient.lastVitalsKnown.source,'spot');
 assert.equal(f.session.read().patient.lastVitalsKnown.eventId,'C08-B1:doctor:doctor-vitals:0');
 assert.equal(f.world.nurseJourneySnapshot().length,0);
 f.session.dispose();f.world.enterLobby();
});

test('C08d repeated confirmed monitor order never creates a redundant bedside trip',async()=>{
 const f=fixture('APP-001');
 const first=await f.session.post({id:'monitor-1',text:'Enfermera monitor'});
 assert.equal(first.clinical[0].status,'pending');
 await walkToCompletion(f);
 const old=f.session.read().patient.procedures.monitor.eventId;
 const journeys=f.world.nurseJourneySnapshot().length;
 const second=await f.session.post({id:'monitor-2',text:'Enfermera monitor'});
 assert.equal(second.clinical[0].status,'executed');
 assert.equal(second.clinical[0].receipt.connected,true);
 assert.equal(f.world.nurseJourneySnapshot().length,journeys);
 assert.equal(f.session.read().patient.procedures.monitor.eventId,old);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 assert.deepEqual(f.session.read().patient.administrationLog,[]);
 f.session.dispose();f.world.enterLobby();
});
