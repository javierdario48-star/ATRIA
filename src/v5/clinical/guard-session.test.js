import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies')};
async function setup(){
 assert(fs.existsSync(new URL('./guard-session.js',import.meta.url)),'game study integration is missing');
 const {createGuardSession}=await import('./guard-session.js');let near='P1';
 const session=createGuardSession({roomId:'R1',mode:'solo',actorId:'doctor',actorName:'Javier',
  patient:{uid:'P1',caseId:'CIRR-001'},content,resolveContext:()=>({patientUid:near})});
 return {session,setNear:value=>near=value};
}
test('actual study service runs behind room authority and pending completion retains its original message',async()=>{
 const {session}=await setup();
 await session.post({id:'hello',text:'Hola antes de enfermería'});
 const first=await session.post({id:'cbc',text:'Enfermera hemograma'});
 assert.equal(first.clinical[0].status,'pending');
 assert.equal(session.read().patient.orders.length,1);assert.deepEqual(session.read().patient.treatments,[]);
 await session.post({id:'later',text:'Vega, ¿qué estudio pedí?'});
 const before=session.read().room.revision;
 session.advance(34.999);await session.flush();assert.equal(session.read().patient.orders[0].status,'pending');
 session.advance(.001);await session.flush();
 const final=session.read(),completion=final.room.events.find(e=>e.type==='clinical.completed');
 assert.equal(final.patient.orders[0].status,'done');assert.equal(final.room.revision,before+1);
 assert.equal(completion.commandId,'cbc');assert.equal(completion.patientUid,'P1');assert.equal(completion.actorId,'doctor');
 assert.equal(final.patient.orders[0].result,content.cases.find(c=>c.id==='CIRR-001').studies.find(s=>s.id==='hemograma').result);
 const retry=await session.post({id:'cbc',text:'Enfermera hemograma'});
 assert.equal(retry.clinical[0].status,'executed');assert.equal(session.read().patient.orders.length,1);
 assert.equal(session.read().messages.filter(m=>m.id==='player:cbc').length,1);
 assert.equal(session.read().messages.filter(m=>m.id.startsWith('completion:')).length,1);
 session.dispose();
});
test('composite studies stay separate from unsupported treatments and from another patient',async()=>{
 const {session,setNear}=await setup();
 const meds=await session.post({id:'med',text:'Enfermera ceftriaxona y metronidazol'});
 assert(meds.clinical.every(c=>c.status==='rejected'));assert.deepEqual(session.read().patient.treatments,[]);
 assert.equal(session.read().patient.orders.length,0);
 await session.post({id:'negated',text:'Enfermera no pidas hemograma'});assert.equal(session.read().patient.orders.length,0);
 setNear(null);const rejected=await session.post({id:'far',text:'Enfermera hemograma',patientUid:'P1'});
 assert.equal(rejected.status,'received-not-executed');assert.equal(session.read().patient.orders.length,0);
 setNear('P1');await session.post({id:'real',text:'Enfermera hemograma'});
 assert.equal(session.read().patient.orders.length,1);assert.equal(session.read().patient.orders[0].actorId,'doctor');
 session.dispose();assert.equal((await session.post({id:'late',text:'Enfermera hemograma'})).status,'rejected');
 assert.throws(()=>session.advance(1),/disposed/);
});

test('every native study label routes to its own current-case finding',async()=>{
 const {createGuardSession}=await import('./guard-session.js');
 for(const c of content.cases)for(const study of c.studies){
  const session=createGuardSession({roomId:'R-'+c.id+'-'+study.id,mode:'solo',actorId:'doctor',actorName:'Javier',
   patient:{uid:'P1',caseId:c.id},content,resolveContext:()=>({patientUid:'P1'})});
  const ack=await session.post({id:'native',text:'Enfermera, '+study.label});
  assert.deepEqual(ack.clinical.map(x=>[x.kind,x.id,x.status]),[['study.request',study.id,'pending']],c.id+': '+study.label);
  assert.equal(session.read().patient.orders[0].result,study.result,c.id+': native result');
  session.dispose();
 }
});

test('pending duplicate messages both reconcile to the single original study completion',async()=>{
 const {session}=await setup();
 await session.post({id:'first',text:'Enfermera hemograma'});
 await session.post({id:'second',text:'Enfermera hemograma'});
 assert.equal(session.read().patient.orders.length,1);
 session.advance(35);await session.flush();
 for(const id of ['first','second']){
  const ack=await session.post({id,text:'Enfermera hemograma'});
  assert.equal(ack.clinical[0].status,'executed',id+' original acknowledgement settles');
  assert.equal(ack.clinical[0].receipt.sourceEventId,session.read().patient.orders[0].sourceEventId);
 }
 assert.equal(session.read().messages.filter(m=>m.id.startsWith('completion:')).length,1,'one availability announcement per physical study');
 session.dispose();
});

test('explicit study selection retains its catalog ID through the same chat authority',async()=>{
 const {createGuardSession}=await import('./guard-session.js');
 const session=createGuardSession({roomId:'selection',mode:'solo',actorId:'doctor',actorName:'Javier',
  patient:{uid:'P1',caseId:'APP-001'},content,resolveContext:()=>({patientUid:'P1'})});
 const ack=await session.post({id:'select',text:'/estudio app_ct'});
 assert.deepEqual(ack.clinical.map(x=>x.id),['app_ct']);assert.equal(session.read().patient.orders[0].resultSource,'native');
 const bad=await session.post({id:'invalid',text:'/estudio ceftriaxone'});
 assert.equal(bad.status,'received-not-executed');assert.deepEqual(session.read().patient.treatments,[]);
 session.dispose();
});
