import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';

const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
function fixture(caseId='APP-001'){
 let seq=0;
 const s=createGuardSession({roomId:'surgery',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'patient',caseId},content,resolveContext:()=>({patientUid:'patient'})});
 return {s,send:(text,id='c'+(++seq))=>s.post({id,text}),
  async advance(dt){s.advance(dt);await s.flush();}};
}
const examine=async f=>{await f.send('/signos');for(const id of ['general','inspection','auscultation','percussion','palpation'])await f.send('/examen '+id);};

test('surgical reply uses the original 3500ms delay and rejects an unsubstantiated request in shared chat',async()=>{
 const f=fixture();
 const first=await f.send('Enfermera cirugía','first');
 assert.equal(first.clinical[0].status,'pending');
 await f.send('/consulta cirugia','second');
 assert.equal(f.s.read().patient.pendingConsults.length,1,'one outstanding consultation, two command receipts');
 await f.advance(3.49);
 assert.deepEqual(f.s.read().patient.consults,[],'no fabricated early acceptance');
 await f.advance(.01);
 const p=f.s.read().patient;
 assert.equal(p.pendingConsults.length,0);
 assert.equal(p.consults.length,1);
 assert.equal(p.consults[0].accepted,false);
 assert.equal(p.consults[0].reasonCode,'diagnosis-missing');
 assert.match(p.consults[0].advice,/impresión diagnóstica/);
 assert.equal(p.consults[0].status,'rejected');
 assert(f.s.read().messages.some(x=>x.role==='nurse'&&x.text.includes(p.consults[0].advice)));
 for(const id of ['first','second']){
  const retry=await f.send(id==='first'?'Enfermera cirugía':'/consulta cirugia',id);
  assert.equal(retry.clinical[0].status,'executed','reply completed even when the specialist declined');
  assert.equal(retry.clinical[0].receipt.accepted,false);
 }
 assert.equal(p.treatments.length,0);
 assert.deepEqual(f.s.read().eligibleDestinations,[]);
 f.s.dispose();
});

test('a rejected consultation can be corrected, accepted and reused without performing surgery or authorizing premature handoff',async()=>{
 const f=fixture();
 await f.send('/diagnostico cirrosis');await f.send('/consulta cirugia');await f.advance(3.5);
 assert.equal(f.s.read().patient.consults.at(-1).reviewStatus,'unsubstantiated');
 await f.send('/diagnostico apendicitis aguda');await f.send('/consulta cirugia');await f.advance(3.5);
 assert.equal(f.s.read().patient.consults.at(-1).reasonCode,'vitals-missing');
 await examine(f);await f.send('/estudio app_us');await f.send('Enfermera una vía');
 await f.send('Enfermera ceftriaxona 1 g y metronidazol 500 mg');await f.advance(95);
 await f.send('/consulta cirugia','valid');await f.advance(3.5);
 const state=f.s.read(),accepted=state.patient.consults.at(-1);
 assert.equal(accepted.accepted,true);
 assert.equal(accepted.status,'done');
 assert.equal(accepted.sourceEventId,'surgery:doctor:valid:0');
 assert.deepEqual(state.eligibleDestinations,[],'accepted team evaluation is not a completed ED handoff');
 assert(state.closure.missing.some(x=>/tratamiento|estudio|reevalu/i.test(x)));
 assert(!state.patient.treatments.some(t=>['surgery','source_control'].includes(t.id)));
 const prior=await f.send('/consulta cirugia','reuse');
 assert.equal(prior.clinical[0].status,'executed');
 assert.equal(prior.clinical[0].receipt.accepted,true);
 assert.equal(prior.clinical[0].receipt.reused,true);
 assert.equal(f.s.read().patient.pendingConsults.length,0);
 assert.equal(f.s.read().progress.receipts.length,0);
 f.s.dispose();
});

test('medical CIRR consultation receives the original clinical refusal, never a fictional surgical acceptance',async()=>{
 const f=fixture('CIRR-001');await examine(f);
 await f.send('/diagnostico cirrosis');
 await f.send('/consulta cirugia');await f.advance(3.5);
 const p=f.s.read().patient;
 assert.equal(p.consults.at(-1).accepted,false);
 assert.equal(p.consults.at(-1).reasonCode,'destination-not-indicated');
 assert.match(p.consults.at(-1).advice,/no hay una indicación/i);
 assert.equal(p.treatments.length,0);
 f.s.dispose();
});

test('diagnostic impression can be saved, cleared and edited through the same patient authority',async()=>{
 const f=fixture();
 await f.send('/diagnostico apendicitis aguda');
 assert.equal(f.s.read().patient.diagnosis,'apendicitis aguda');
 const cleared=await f.send('/diagnostico-borrar');
 assert.equal(cleared.clinical[0]?.status,'executed');
 assert.equal(f.s.read().patient.diagnosis,'');
 assert.deepEqual(f.s.read().eligibleDestinations,[]);
 await f.send('/diagnostico peritonitis');
 assert.equal(f.s.read().patient.diagnosis,'peritonitis','wrong/broad decisions remain permitted');
 f.s.dispose();
});

test('minimum care enables dynamic destinations and one shared nurse notice even when quality is below 70',async()=>{
 const f=fixture('CIRR-001');
 assert.deepEqual(f.s.read().eligibleDestinations,[]);
 await examine(f);await f.send('¿Desde cuándo empezó la hinchazón?');
 await f.send('/diagnostico cirrosis');await f.send('/estudio renal');await f.send('/estudio app_cbc');
 await f.send('Enfermera espironolactona');await f.advance(120);
 assert.deepEqual(f.s.read().eligibleDestinations,[],'actual administration still requires reassessment');
 await f.send('/reevaluar');await f.s.flush();
 const ready=f.s.read();
 assert.deepEqual(ready.eligibleDestinations,['sala','observacion']);
 assert(ready.closure.quality.score<70,'minimum care is separate from a thorough high-quality review');
 const notices=()=>f.s.read().messages.filter(x=>x.id.startsWith('ready:'));
 assert.equal(notices().length,1);
 assert.match(notices()[0].text,/sala.*observación/i);
 await f.send('/reevaluar');await f.s.flush();
 assert.equal(notices().length,1,'rechecking requirements never spams the guard chat');
 const closed=await f.send('/disposicion observacion');
 assert.equal(closed.clinical[0].status,'executed');
 assert.deepEqual(f.s.read().eligibleDestinations,[]);
 assert.equal(f.s.read().progress.receipts.length,1);
 f.s.dispose();
});
