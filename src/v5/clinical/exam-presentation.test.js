import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {examinedRegions} from '../ui/exam-summary.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
function setup(){
 let near='P1',id=0;
 const session=createGuardSession({roomId:'exam-presentation',mode:'solo',actorId:'doctor',actorName:'Médico',
  patient:{uid:'P1',caseId:'CIRR-001'},content,resolveContext:()=>({patientUid:near})});
 return {session,send:text=>session.post({id:'action-'+(++id),text}),near:uid=>near=uid};
}

test('physician examination records findings without command echoes or nurse narration',async()=>{
 const {session,send}=setup();
 try{
  for(const text of ['/examen abdomen palpation','/examen general general','/glasgow eye','/glasgow all']){
   const ack=await send(text);
   assert.equal(ack.clinical[0]?.status,'executed');
  }
  const state=session.read();
  assert.equal(state.messages.length,0,'examination commands and findings belong to the examination panel');
  assert.equal(state.room.transcript.length,4,'the immutable action history must remain intact');
  assert.equal(state.room.events.filter(e=>e.type==='chat.posted').length,4);
  assert.equal(state.patient.examLog.length,2);
  assert.match(state.patient.examFindings.abdomen.palpation.rows[0].text,/Ascitis moderada/);
  assert.equal(state.patient.glasgow.total,15);
  assert.match(examinedRegions(state.patient).find(s=>s.id==='abdomen').summary,/Ascitis moderada/);
 }finally{session.dispose();}
});

test('ordinary conversation and nursing study and medication receipts survive examination filtering',async()=>{
 const {session,send}=setup();
 try{
  await send('Voy a revisar el examen con mi colega.');
  await send('/examen abdomen palpation');
  await send('Enfermera una vía');
  const order=await send('Enfermera hemograma y ceftriaxona 1 g');
  assert.deepEqual(order.clinical.map(c=>[c.kind,c.status]),[['study.request','pending'],['therapy.request','pending']]);
  session.advance(40);await session.flush();
  const state=session.read(),messages=state.messages;
  assert(messages.some(m=>m.role==='player'&&m.text==='Voy a revisar el examen con mi colega.'));
  assert(messages.some(m=>m.role==='player'&&m.text==='Enfermera hemograma y ceftriaxona 1 g'));
  assert(messages.some(m=>m.role==='nurse'&&/hemograma/i.test(m.text)));
  assert(messages.some(m=>m.role==='nurse'&&/ceftriaxona/i.test(m.text)));
  assert(messages.some(m=>m.id.startsWith('completion:')&&/hemograma/i.test(m.text)));
  assert(messages.some(m=>m.id.startsWith('completion:')&&/ceftriaxona/i.test(m.text)));
  assert(!messages.some(m=>/Ascitis moderada|\/examen/i.test(m.text)));
  assert.equal(state.patient.administrationLog.length,1);
  assert.equal(state.patient.orders[0].status,'done');
 }finally{session.dispose();}
});

test('rejected examination remains visible as an error and never invents findings',async()=>{
 const {session,send,near}=setup();
 try{
  near(null);
  const ack=await send('/examen abdomen palpation');
  assert.equal(ack.status,'received-not-executed');
  assert.equal(ack.routeError,'no-patient-target');
  assert.deepEqual(session.read().patient.examFindings,{});
  assert(session.read().messages.some(m=>m.role==='system'&&/acercate.*paciente/i.test(m.text)));
  assert(!session.read().messages.some(m=>m.role==='nurse'),'the nurse is not the examining physician');
  assert(!session.read().messages.some(m=>m.role==='player'&&/^\/examen/i.test(m.text)),
   'a rejected panel action cannot be replayed as doctor avatar speech');
 }finally{session.dispose();}
});
