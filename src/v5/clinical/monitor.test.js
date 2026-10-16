import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {monitorHTML} from '../ui/clinical-panels.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
function setup(caseId='CIRR-001'){
 const s=createGuardSession({roomId:'monitor',mode:'solo',actorId:'doctor',actorName:'Javier',
  patient:{uid:'P1',caseId},content,resolveContext:()=>({patientUid:'P1'})});let n=0;
 return {s,send:text=>s.post({id:'m'+(++n),text})};
}
test('unconnected monitor never discloses unmeasured vital values or changes the patient',()=>{
 const f=setup(),before=f.s.read();
 const html=monitorHTML(before.patient);
 assert.match(html,/desconectado/i);assert.doesNotMatch(html,/108\/68|FC 94|SpO₂ 96/);
 assert.deepEqual(f.s.read(),before);f.s.dispose();
});
test('connected monitoring tracks actual physiology with patient/event observations; disconnect freezes the last measurement',async()=>{
 for(const caseId of ['CIRR-001','APP-001']){
  const f=setup(caseId);await f.send('/monitor conectar');
  let p=f.s.read().patient;assert.equal(p.procedures.monitor.connected,true);
  assert.equal(p.lastVitalsKnown.patientUid,'P1');assert.equal(p.lastVitalsKnown.source,'monitor');
  const connectionEvent=p.procedures.monitor.eventId;
  if(caseId==='CIRR-001')await f.send('Enfermera paracentesis terapéutica');
  else await f.send('Enfermera colocar una vía y Ringer 500 ml');
  f.s.advance(8);await f.s.flush();p=f.s.read().patient;
  assert(Math.abs(p.lastVitalsKnown.vitals.hr-p.liveVitals.hr)<=1.4);
  assert(Math.abs(p.lastVitalsKnown.vitals.sys-p.liveVitals.sys)<=2.0);
  assert(Math.abs(p.lastVitalsKnown.vitals.rr-p.liveVitals.rr)<=.8);
  assert.equal(p.lastVitalsKnown.eventId,connectionEvent);
  assert.match(monitorHTML(p),/Monitorización continua/);
  await f.send('/monitor desconectar');const measured=structuredClone(f.s.read().patient.lastVitalsKnown);
  f.s.advance(8);await f.s.flush();p=f.s.read().patient;
  assert.equal(p.procedures.monitor.connected,false);assert.deepEqual(p.lastVitalsKnown,measured);
  assert.match(monitorHTML(p),/Última medición/);assert(p.liveVitals.hr!==measured.vitals.hr);
  f.s.dispose();
 }
});
test('spot vital measurement does not connect the monitor and is not silently refreshed',async()=>{
 const f=setup();await f.send('/signos');const known=f.s.read().patient.lastVitalsKnown;
 assert(!f.s.read().patient.procedures.monitor?.connected);
 await f.send('Enfermera paracentesis terapéutica');f.s.advance(8);await f.s.flush();
 const p=f.s.read().patient;assert.deepEqual(p.lastVitalsKnown,known);
 assert.notEqual(p.liveVitals.hr,p.lastVitalsKnown.vitals.hr);f.s.dispose();
});
test('reassessment measurements retain patient, event and observation source in both case policies',async()=>{
 for(const caseId of ['CIRR-001','APP-001']){
  const f=setup(caseId),ack=await f.send('/reevaluar'),p=f.s.read().patient;
  assert.equal(p.lastVitalsKnown.patientUid,p.uid);assert.equal(p.lastVitalsKnown.eventId,ack.clinical[0].receipt.eventId);
  assert.equal(p.lastVitalsKnown.source,'reassessment');assert.deepEqual(p.lastVitalsKnown.vitals,p.lastReassessment.vitals);
  f.s.dispose();
 }
});
test('closing a monitored case presents the final known measurement instead of claiming live monitoring',async()=>{
 const f=setup();
 await f.send('/monitor conectar');await f.send('¿Desde cuándo empezó?');await f.send('¿Toma alcohol?');
 for(const tech of ['general','inspection','auscultation','percussion','palpation'])await f.send('/examen '+tech);
 await f.send('/estudio renal');await f.send('Enfermera espironolactona');await f.send('/diagnostico cirrosis');
 f.s.advance(120);await f.s.flush();await f.send('/reevaluar');
 assert.equal((await f.send('/disposicion sala')).clinical[0].status,'executed');
 const final=f.s.read().patient.lastVitalsKnown;
 f.s.advance(120);const html=monitorHTML(f.s.read().patient);
 assert.match(html,/cerrada|cierre/i);assert.doesNotMatch(html,/Monitorización continua|observaciones actuales/);
 assert.deepEqual(f.s.read().patient.lastVitalsKnown,final);f.s.dispose();
});

test('monitor reports subtle reproducible non-therapeutic variation while patient physiology remains owned by the case',async()=>{
 const f=setup('CIRR-001');await f.send('/monitor conectar');
 const before=f.s.read().patient.liveVitals;
 const observed=[f.s.read().patient.lastVitalsKnown.vitals];
 for(let i=0;i<12;i++){f.s.advance(2);observed.push(f.s.read().patient.lastVitalsKnown.vitals);}
 const native=f.s.read().patient.liveVitals;
 assert.deepEqual(native,before,'no monitor oscillation is allowed to modify native physiology');
 for(const sample of observed){
  assert(Math.abs(sample.hr-native.hr)<=1.4+1e-9);
  assert(Math.abs(sample.rr-native.rr)<=.8+1e-9);
  assert(Math.abs(sample.sys-native.sys)<=2+1e-9);
  assert(Math.abs(sample.dia-native.dia)<=1.2+1e-9);
  assert(Math.abs(sample.spo2-native.spo2)<=.32+1e-9);
  assert(Math.abs(sample.temp-native.temp)<=.035+1e-9);
 }
 assert(new Set(observed.map(x=>x.hr.toFixed(3))).size>2,'FC should fluctuate smoothly');
 assert(new Set(observed.map(x=>x.rr.toFixed(3))).size>2,'FR should fluctuate smoothly');
 assert(new Set(observed.map(x=>x.sys.toFixed(3))).size>2,'BP should fluctuate smoothly');
 await f.send('/monitor desconectar');
 const frozen=f.s.read().patient.lastVitalsKnown;
 f.s.advance(35);await f.s.flush();
 assert.deepEqual(f.s.read().patient.lastVitalsKnown,frozen);
 f.s.dispose();
});
