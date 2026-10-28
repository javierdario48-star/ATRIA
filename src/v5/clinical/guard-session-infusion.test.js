import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld} from '../app/world.js';
import {createClinicalContent} from '../content/clinical-content.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {createGuardSession} from './guard-session.js';
import {confirmedClinicalTreatment,isDeliveredClinicalAdministration} from './receipts.js';

const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content=createClinicalContent({map:load('hospital'),beds:load('beds'),cases:load('cases'),
 therapies:load('therapies'),defaultDoses:load('default-doses')},
 {additionalCases:respiratoryPack.cases.filter(c=>c.id==='RESP-01')});
const wire=value=>JSON.parse(JSON.stringify(value));
function fixture(saved){
 const world=createWorld(content,{id:'doctor',name:'Doctor',scrubColor:'navy'},saved?.world);
 if(!saved)world.enterGuard({mode:'solo',caseId:'RESP-01',patientUid:'infusion-patient'});
 const patient=world.snapshot().patients[0];
 const session=createGuardSession({roomId:'infusion-room',mode:'solo',actorId:'doctor',actorName:'Doctor',patient,content,
  resolveContext:()=>({patientUid:patient.uid}),checkpoint:saved?.session,
  nursing:{enqueue:t=>world.enqueueNurseJourney(t),takeArrivals:()=>world.takeNurseArrivals(),accept:r=>world.acceptNurseClinicalResult(r)}});
 return {world,session};
}
async function walkUntil(f,predicate){
 for(let i=0;i<1800&&!predicate();i++){
  f.world.step(1/30);f.session.finishNurseArrivals();f.session.advance(1/30);
 }
 await f.session.flush();assert(predicate(),JSON.stringify({journeys:f.world.nurseJourneySnapshot(),
  administrations:f.session.read().patient.administrationLog,pending:f.session.read().patient.pendingTreatments,
  events:f.session.read().room.events.slice(-2)}));
}
const sameState=(a,b)=>{
 assert.deepEqual(wire(b.session.read()),wire(a.session.read()));
 assert.deepEqual(b.world.nurseJourneySnapshot(),a.world.nurseJourneySnapshot());
};

test('real nurse starts concurrent finite infusions and restore preserves gradual delivery and single completion',async t=>{
 const live=fixture();t.after(()=>{live.session.dispose();live.world.enterLobby();});
 const firstOrder={id:'azithro',text:'Enfermera azitromicina 500 mg IV'};
 const first=await live.session.post(firstOrder);
 assert.deepEqual(first.clinical.map(x=>[x.id,x.status]),[['iv','pending'],['azithromycin','pending']]);
 live.session.advance(5);await live.session.flush();
 assert.equal(live.session.read().patient.administrationLog.length,0,'elapsed time cannot manufacture arrival');
 await walkUntil(live,()=>live.session.read().patient.administrationLog.some(x=>x.id==='azithromycin'));
 let p=live.session.read().patient;
 const original=p.administrationLog.find(x=>x.id==='azithromycin'),firstEvent=original.sourceEventId;
 assert.equal(original.status,'administering');assert(original.dose.amount<500);assert.equal(p.treatments.length,0);
 assert.equal(live.world.nurseJourneySnapshot().find(x=>x.eventId===firstEvent).stage,'confirmed');
 assert.equal((await live.session.post(firstOrder)).clinical.at(-1).status,'pending');

 const secondOrder={id:'magnesium',text:'/tratamiento magnesium 2 g IV'};
 const second=await live.session.post(secondOrder);assert.equal(second.clinical[0].status,'pending');
 await walkUntil(live,()=>live.session.read().patient.administrationLog.some(x=>x.id==='magnesium'));
 p=live.session.read().patient;
 assert.deepEqual(p.administrationLog.map(x=>[x.id,x.status]),[['azithromycin','administering'],['magnesium','administering']]);
 assert.equal(p.treatments.length,0);assert(live.world.nurseJourneySnapshot().every(x=>x.stage==='confirmed'));
 assert.equal(confirmedClinicalTreatment(p,'azithromycin',live.session.read().clock.nativeMinute),undefined);
 const saved=wire({world:live.world.checkpoint(),session:await live.session.checkpoint()});
 assert.equal(saved.session.care.iv.tasks.length,2);assert.equal(saved.session.pendingNurseJobs.length,0);
 const restored=fixture(saved);t.after(()=>{restored.session.dispose();restored.world.enterLobby();});sameState(live,restored);
 const amounts=new Map(p.administrationLog.map(x=>[x.id,x.dose.amount]));
 for(const f of [live,restored]){f.session.advance(100,{typing:true});await f.session.flush();}
 sameState(live,restored);
 p=restored.session.read().patient;
 assert(Math.abs(p.administrationLog[0].dose.amount-amounts.get('azithromycin')-25)<1e-6);
 assert(Math.abs(p.administrationLog[1].dose.amount-amounts.get('magnesium')-300)<1e-6);
 assert.equal(p.treatments.length,0);
 for(const row of p.administrationLog)assert(isDeliveredClinicalAdministration(p,row,restored.session.read().clock.nativeMinute));
 for(const f of [live,restored]){f.session.advance(200);await f.session.flush();}
 sameState(live,restored);p=restored.session.read().patient;
 assert.equal(p.administrationLog.find(x=>x.id==='magnesium').status,'completed');
 assert.equal(p.administrationLog.find(x=>x.id==='azithromycin').status,'administering');
 assert.deepEqual(p.treatments.map(x=>x.id),['magnesium']);
 assert.equal((await restored.session.post(firstOrder)).clinical.at(-1).status,'pending');
 const nearCompletion=wire({world:restored.world.checkpoint(),session:await restored.session.checkpoint()});
 const resumedAgain=fixture(nearCompletion);t.after(()=>{resumedAgain.session.dispose();resumedAgain.world.enterLobby();});
 sameState(restored,resumedAgain);
 for(const f of [live,restored,resumedAgain]){f.session.advance(300);await f.session.flush();}
 sameState(live,restored);sameState(restored,resumedAgain);
 p=resumedAgain.session.read().patient;
 assert.deepEqual(p.administrationLog.map(x=>[x.id,x.dose.amount,x.status]),
  [['azithromycin',500,'completed'],['magnesium',2000,'completed']]);
 assert.equal(p.treatments.length,2);assert.equal(p.pendingTreatments.length,0);
 const azithro=p.administrationLog[0];
 assert(Math.abs(azithro.completedAtNativeMinute-azithro.administeredAtNativeMinute-60)<1e-9);
 assert.equal(confirmedClinicalTreatment(p,'azithromycin',azithro.completedAtNativeMinute-1e-6),undefined);
 assert(confirmedClinicalTreatment(p,'azithromycin',azithro.completedAtNativeMinute));
 assert.equal((await resumedAgain.session.post(firstOrder)).clinical.at(-1).status,'executed');
 assert.equal((await resumedAgain.session.post(secondOrder)).clinical[0].status,'executed');
 for(const row of p.administrationLog){
  const events=resumedAgain.session.read().room.events.filter(e=>e.type==='clinical.completed'&&e.eventId===row.sourceEventId);
  assert.equal(events.length,1);assert.equal(events[0].clinical[0].receipt.completionStatus,'completed');
 }
 assert.equal(resumedAgain.world.nurseJourneySnapshot().length,3,'retries and restores cannot schedule extra visits');
 assert.equal(resumedAgain.session.read().progress.xp,0);
});

test('an explicit magnesium dose and IV route requests medication through the nurse rather than a serum study',async t=>{
 const f=fixture();t.after(()=>{f.session.dispose();f.world.enterLobby();});
 const result=await f.session.post({id:'natural-magnesium',text:'Enfermera magnesio 2 g IV'});
 assert.deepEqual(result.clinical.map(x=>[x.kind,x.id,x.status]),
  [['procedure.request','iv','pending'],['therapy.request','magnesium','pending']]);
 assert.equal(f.session.read().patient.orders.length,0);
});
