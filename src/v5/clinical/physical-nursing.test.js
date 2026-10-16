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

test('C08b compound APP IV, monitor and medications await real access before native drug preparation',async()=>{
 const f=fixture('APP-001');
 const ack=await f.session.post({id:'combined',text:'Enfermera dos vías, monitor, Ringer 500 ml, ceftriaxona 1 g y metronidazol 500 mg'});
 assert.deepEqual(ack.clinical.map(x=>[x.id,x.status]),[
  ['iv','pending'],['monitor','pending'],['fluid','pending'],
  ['ceftriaxone','pending'],['metronidazole','pending']
 ]);
 assert.equal(f.session.read().patient.venousAccessCount,0);
 assert.equal(f.session.read().patient.procedures.monitor?.connected??false,false);
 assert.deepEqual(f.session.read().patient.pendingTreatments,[]);
 f.session.advance(8);await f.session.flush();
 assert.equal(f.session.read().patient.administrationLog.length,0,'time alone cannot execute deferred drugs');
 await walkToCompletion(f);
 assert.equal(f.session.read().patient.venousAccessCount,2);
 assert.equal(f.session.read().patient.procedures.monitor.connected,true);
 assert.equal(f.session.read().patient.administrationLog.length,0);
 assert.deepEqual(f.session.read().patient.pendingTreatments.map(x=>x.id).sort(),
  ['ceftriaxone','fluid','metronidazole']);
 const now=f.session.read().clock.clinicalMinute;
 assert(f.session.read().patient.pendingTreatments.every(x=>x.readyAtRealSecond>now));
 f.session.advance(.79);await f.session.flush();
 assert.equal(f.session.read().patient.administrationLog.length,0);
 f.session.advance(.02);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog.map(x=>x.id),['fluid']);
 f.session.advance(.69);await f.session.flush();
 assert.deepEqual(f.session.read().patient.administrationLog.map(x=>x.id),['fluid','ceftriaxone','metronidazole']);
 assert.equal(f.events.filter(x=>x.type==='clinical.completed').length,5);
 assert.equal(new Set(f.events.filter(x=>x.type==='clinical.completed').map(x=>x.eventId)).size,5);
 const original=f.session.read().patient.administrationLog.map(x=>x.sourceEventId);
 await f.session.post({id:'combined',text:'Enfermera dos vías, monitor, Ringer 500 ml, ceftriaxona 1 g y metronidazol 500 mg'});
 assert.deepEqual(f.session.read().patient.administrationLog.map(x=>x.sourceEventId),original);
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
