import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),examSegments:read('exam-segments'),defaultDoses:read('default-doses')};
function setup(){let near='P1';const s=createGuardSession({roomId:'C2',mode:'solo',actorId:'doctor',actorName:'Javier',
 patient:{uid:'P1',caseId:'CIRR-001'},content,resolveContext:()=>({patientUid:near})});
 let n=0;return {s,send:(text,id='c'+(++n),extra={})=>s.post({id,text,...extra}),near:x=>near=x};}
async function evaluate(f){
 await f.send('¿Desde cuándo empezó la hinchazón?');await f.send('¿Toma alcohol?');
 await f.send('/signos');for(const section of ['general','inspection','auscultation','percussion','palpation'])await f.send('/examen '+section);
}
test('CIRR evaluation records authentic answers, actual directed exam and measured vitals through authority',async()=>{
 const f=setup();await evaluate(f);const p=f.s.read().patient;
 assert(p.intentHistory.some(x=>x.id==='onset'));assert(p.intentHistory.some(x=>x.id==='alcohol'));
 assert(p.lastVitalsKnown);assert(p.examDone);assert.equal(p.liveVitals.sys,108);
 assert.match(f.s.read().messages.map(m=>m.text).join('\n'),/muchos años|durante años/);
 assert.match(JSON.stringify(p.exam),/Esplenomegalia/);f.s.dispose();
});
test('real oral administration is pending for 550ms; retry, second request and later text cannot duplicate or steal its receipt',async()=>{
 const f=setup();const first=await f.send('Enfermera espironolactona','spiro');
 assert.equal(first.clinical[0].status,'pending');assert.equal(f.s.read().patient.treatments.length,0);
 await f.send('Enfermera espironolactona','spiro');await f.send('Enfermera espironolactona','again');
 await f.send('Hola este mensaje no indicó nada','later');f.s.advance(.549);await f.s.flush();
 assert.equal(f.s.read().patient.treatments.length,0);f.s.advance(.001);await f.s.flush();
 const p=f.s.read().patient;assert.equal(p.treatments.length,1);assert.equal(p.administrationLog.length,1);
 assert.equal(p.treatments[0].dose.amount,100);assert.equal(p.treatments[0].patientUid,'P1');
 const done=await f.send('Enfermera espironolactona','spiro');assert.equal(done.clinical[0].status,'executed');
 assert.equal(done.clinical[0].receipt.therapyId,'espironolactona');assert.equal(done.clinical[0].receipt.eventId,'C2:doctor:spiro:0');
 assert.equal(done.clinical[0].receipt.sourceEventId,'C2:doctor:spiro:0');
 assert(f.s.read().room.events.filter(e=>e.type==='clinical.completed').every(e=>e.commandId!=='later'));
 await f.send('Enfermera espironolactona','after');assert.equal(f.s.read().patient.treatments.length,1);f.s.dispose();
});
test('hemogram, negation, unsupported dose/drugs and foreign or distant patient cannot administer medicine',async()=>{
 const f=setup();await f.send('Enfermera hemograma');await f.send('Enfermera no administres espironolactona');
 for(const text of ['Enfermera espironolactona 0 mg','Enfermera espironolactona 50 mg','Enfermera ceftriaxona'])await f.send(text);
 f.near('other');await f.send('Enfermera espironolactona','foreign');f.near(null);
 await f.send('Enfermera espironolactona','forged',{patientUid:'P1'});f.s.advance(40);await f.s.flush();
 assert.deepEqual(f.s.read().patient.treatments,[]);assert.equal(f.s.read().patient.orders.length,1);
 assert(f.s.read().patient.orders[0].status==='done');f.s.dispose();
});
test('native albumin lab alias remains a hepatogram study and never an albumin infusion',async()=>{
 const f=setup();await f.send('Enfermera albúmina');f.s.advance(120);await f.s.flush();
 assert.deepEqual(f.s.read().patient.orders.map(x=>x.id),['hepatograma']);assert.deepEqual(f.s.read().patient.treatments,[]);f.s.dispose();
});
test('one CIRR case closes through the real executor only after evaluation, result, administration, reevaluation and safe disposition; XP once',async()=>{
 const f=setup();const early=await f.send('/disposicion sala');assert.equal(early.clinical[0].status,'rejected');
 await evaluate(f);for(const study of ['hepatograma','renal','eco','paracentesis'])await f.send('/estudio '+study);
 await f.send('Enfermera dieta sin sal');await f.send('Enfermera espironolactona 100 mg');
 await f.send('/diagnostico cirrosis descompensada');await f.send('/reevaluar');
 assert.equal((await f.send('/disposicion sala')).clinical[0].status,'rejected');
 f.s.advance(120);await f.s.flush();await f.send('/reevaluar');
 assert.equal((await f.send('/disposicion alta')).clinical[0].status,'rejected');
 const ack=await f.send('/disposicion sala','close'),state=f.s.read();
 assert.equal(ack.clinical[0].status,'executed');assert(state.patient.caseEnded);
 assert.equal(state.patient.closure.destination,'sala');assert.equal(state.patient.closure.quality.score,100);
 assert.equal(state.progress.xp,133);assert.equal(state.progress.receipts.length,1);
 assert.equal(state.room.patients[0].closed,true);
 assert.deepEqual(await f.send('/disposicion sala','close'),ack);
 assert.equal((await f.send('/disposicion sala','close-again')).clinical[0].status,'rejected');
 assert.equal(f.s.read().progress.xp,133);assert.equal(f.s.read().progress.receipts.length,1);
 assert.equal(f.s.read().patient.administrationLog.filter(x=>x.id==='espironolactona').length,1);f.s.dispose();
});
test('return/disposal cancels unadministered native work; no late completion',async()=>{
 const f=setup();await f.send('Enfermera espironolactona');f.s.dispose();
 assert.throws(()=>f.s.advance(1),/disposed/);assert.equal(f.s.read().patient.treatments.length,0);
});
