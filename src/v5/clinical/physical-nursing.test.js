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
test('C08 case-specific Ringer rejection is clearly explained, not called a missing nurse receipt',async()=>{
 const f=fixture('CIRR-001');
 const action=await f.session.post({id:'ringer-in-cirr',text:'enfermera ringer'});
 assert.deepEqual(action.clinical.map(x=>[x.id,x.status]),[['fluid','rejected']]);
 assert.equal(action.clinical[0].reason,'clinical-action-not-migrated');
 assert.equal(f.session.read().patient.treatments.length,0);
 assert.equal(f.world.nurseJourneySnapshot().length,0);
 const nurse=f.session.read().messages.at(-1);
 assert.equal(nurse.name,'Enfermera');
 assert.match(nurse.text,/no hay una regla de tratamiento validada/i);
 assert.match(nurse.text,/No administrado/i);
 assert.doesNotMatch(nurse.text,/sin confirmación de resultado/i);
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
