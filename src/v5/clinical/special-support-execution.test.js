import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
function fixture(caseId='APP-001',mode='solo'){
 let seq=0;const s=createGuardSession({roomId:'support',mode,actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'})});
 return {s,send:(text,id=String(++seq))=>s.post({id,text}),async advance(dt){s.advance(dt);await s.flush();}};
}
for(const caseId of ['APP-001','CIRR-001'])test(caseId+' explicit albumin g/kg is an actual IV dose, never a hepatogram, including a compound order',async()=>{
 const f=fixture(caseId);await f.send('Enfermera una vía');
 const baseline=f.s.read().patient.liveVitals;
 const ack=await f.send('Enfermera monitor y albumina 1,5 g/kg','albumin');
 assert.deepEqual(ack.clinical.map(x=>[x.id,x.status]),[['monitor','executed'],['albumin','pending']]);
 assert.deepEqual(f.s.read().patient.orders,[]);
 await f.advance(.79);assert.deepEqual(f.s.read().patient.liveVitals,baseline);
 assert.equal(f.s.read().patient.administrationLog.length,0);
 await f.advance(.02);
 const dose=f.s.read().patient.administrationLog[0];
 assert.equal(dose.id,'albumin');assert.equal(dose.dose.unit,'g/kg');assert.equal(dose.dose.amount,1.5);
 assert.equal(dose.dose.defaultApplied,false);assert.equal(dose.administeredAtRealSecond,.8);
 assert.equal(f.s.read().exposure.byDrug.albumin.totalAmount,1.5);
 await f.send('Enfermera monitor y albumina 1,5 g/kg','albumin');
 assert.equal(f.s.read().patient.administrationLog.length,1);
 await f.advance(5);assert(f.s.read().patient.liveVitals.sys>baseline.sys);
 assert(f.s.read().patient.liveVitals.hr<baseline.hr);
 f.s.dispose();
});
for(const caseId of ['APP-001','CIRR-001'])test(caseId+' transfusion waits for original preparation, preserves units and does not increase saturation',async()=>{
 const f=fixture(caseId);await f.send('Enfermera una vía');const baseline=f.s.read().patient.liveVitals;
 const ack=await f.send('Enfermera transfusion 2 unidades','blood');
 assert.equal(ack.clinical[0].id,'transfusion');assert.equal(ack.clinical[0].status,'pending');
 await f.advance(2.59);assert.deepEqual(f.s.read().patient.liveVitals,baseline);
 await f.advance(.02);const row=f.s.read().patient.administrationLog[0];
 assert.equal(row.dose.unit,'unidad');assert.equal(row.dose.amount,2);
 assert.equal(row.administeredAtRealSecond,2.6);
 await f.advance(5);const p=f.s.read().patient;
 assert(p.liveVitals.sys>baseline.sys);assert(p.liveVitals.hr<baseline.hr);
 assert.equal(p.liveVitals.spo2,baseline.spo2,'oxygen content is not saturation');
 assert.equal(f.s.read().exposure.byDrug.transfusion.totalAmount,2);
 f.s.dispose();
});
test('noradrenaline start, absolute titration and confirmed stop have distinct native receipts and active support',async()=>{
 const f=fixture();await f.send('Enfermera una vía');const baseline=f.s.read().patient.liveVitals;
 const first=await f.send('Enfermera noradrenalina 0,05 µg/kg/min IV','start');
 assert.equal(first.clinical[0].status,'pending');await f.advance(.79);
 assert.deepEqual(f.s.read().patient.liveVitals,baseline);
 await f.advance(.02);let p=f.s.read().patient;
 assert.equal(p.procedures.vasopressor.active,true);assert.equal(p.procedures.vasopressor.dose.amount,.05);
 assert.equal(p.administrationLog[0].action,'start');const original=structuredClone(p.administrationLog[0]);
 const next=await f.send('Enfermera noradrenalina 0.02 mcg/kg/min IV','rate');assert.equal(next.clinical[0].status,'pending');
 await f.advance(.79);assert.equal(f.s.read().patient.procedures.vasopressor.dose.amount,.05);
 await f.advance(.02);p=f.s.read().patient;
 assert.equal(p.administrationLog[1].action,'setRate');assert.equal(p.procedures.vasopressor.dose.amount,.02);
 assert.deepEqual(p.administrationLog[0],original);
 await f.advance(5);assert(f.s.read().patient.liveVitals.sys>baseline.sys);
 const stop=await f.send('Enfermera suspender noradrenalina','stop');assert.equal(stop.clinical[0].status,'pending');
 await f.advance(1.79);assert.equal(f.s.read().patient.procedures.vasopressor.active,true);
 await f.advance(.02);p=f.s.read().patient;
 assert.equal(p.procedures.vasopressor.active,false);assert.equal(p.administrationLog[2].action,'stop');
 assert.equal(p.administrationLog[2].dose,undefined);assert.equal(p.administrationLog[2].previousDose.amount,.02);
 assert.equal(f.s.pharmacologyRead().drugs.find(x=>x.id==='vasopressor').state,'stopped');
 assert.equal(f.s.read().exposure.byDrug.vasopressor.administrations,2,'stop is not another dose');
 assert.equal(f.s.read().exposure.byDrug.vasopressor.currentRate,0);
 const again=await f.send('Enfermera suspender noradrenalina','stop');assert.equal(again.clinical[0].status,'executed');
 assert.equal(f.s.read().patient.administrationLog.length,3);
 await f.advance(30);assert(Math.abs(f.s.read().patient.liveVitals.sys-baseline.sys)<.02);
 f.s.dispose();
});
test('invalid special units and routes never partially connect a compound monitor or borrow a previous support receipt',async()=>{
 const f=fixture('CIRR-001');await f.send('Enfermera una vía');
 for(const text of ['Enfermera monitor y albumina 1.5 mg/kg','Enfermera monitor y albumina -1 g/kg',
  'Enfermera monitor y albumina 1.5 g/kg oral','Enfermera monitor y transfusion 1 mg',
  'Enfermera monitor y noradrenalina 0.05 mg IV','Enfermera monitor y noradrenalina 0.05 mcg/kg/min oral']){
  const reply=await f.send(text);assert.equal(reply.routeError,'unsafe-compound-order',text);
  assert.deepEqual(reply.clinical,[],text);
 }
 await f.advance(5);const p=f.s.read().patient;
 assert.equal(p.procedures.monitor?.connected??false,false);
 assert.equal(p.administrationLog.length,0);assert.equal(p.orders.length,0);
 f.s.dispose();
});
test('repeated albumin and excessive pressor rates retain the original physiological harm rather than an XP-only warning',async()=>{
 const albumin=fixture('CIRR-001');await albumin.send('Enfermera una vía');
 for(let i=0;i<6;i++){await albumin.send('Enfermera albumina 1.5 g/kg');await albumin.advance(.81);}
 await albumin.advance(15);
 const harmed=albumin.s.read().patient;
 assert.equal(harmed.administrationLog.length,6);assert(harmed.liveVitals.spo2<90);assert(harmed.liveVitals.rr>27);
 assert.equal(harmed.adverseEvents.filter(x=>x.kind==='albumin-respiratory-overload').length,1);
 assert.equal(albumin.s.read().messages.filter(x=>/Sobrecarga respiratoria tras dosis repetidas de albúmina/.test(x.text)).length,1);
 assert(albumin.s.read().closure.quality.penalty>=5,'documented physiological harm reaches the existing quality evaluator');
 // The already validated V5 oxygen response ramps over native minutes and
 // uses current saturation; it is not an instantaneous fixed +6% bonus.
 await albumin.send('Enfermera oxigeno 4 L/min');await albumin.advance(60);
 const supported=albumin.s.read().patient.liveVitals.spo2;
 assert(supported>92&&supported>harmed.liveVitals.spo2+3,'actual oxygen improves measured oxygenation while overload still needs follow-up');
 albumin.s.dispose();
 const nora=fixture('CIRR-001');await nora.send('Enfermera una vía');
 const ack=await nora.send('Enfermera noradrenalina 1 mcg/kg/min IV');
 assert.equal(ack.clinical[0].status,'pending','wrong clinical dose remains interpretable and executable');
 await nora.advance(15);
 const high=nora.s.read().patient.liveVitals;
 assert(high.sys>155);assert(high.hr>105,'original overdose equation changes heart rate as well as pressure');
 await nora.send('Enfermera suspender noradrenalina');await nora.advance(1.81);await nora.advance(30);
 assert(nora.s.read().patient.liveVitals.sys<109);assert(nora.s.read().patient.liveVitals.hr<95);
 nora.s.dispose();
});
test('explicit amphotericin mg/kg preserves the original formulation through a real administration',async()=>{
 const f=fixture();await f.send('Enfermera una vía');
 const a=await f.send('Enfermera anfotericina 0.7 mg/kg IV');
 assert.equal(a.clinical[0]?.id,'amphotericin');assert.equal(a.clinical[0]?.status,'pending');
 await f.advance(1.49);assert.equal(f.s.read().patient.administrationLog.length,0);
 await f.advance(.02);const dose=f.s.read().patient.administrationLog[0].dose;
 assert.equal(dose.unit,'mg/kg');assert.equal(dose.amount,.7);
 assert.equal(f.s.read().exposure.byDrug.amphotericin.unit,'mg/kg');f.s.dispose();
});
test('only equal in-progress infusion rates coalesce; another rate cannot steal their original completion',async()=>{
 const f=fixture();await f.send('Enfermera una vía');
 await f.send('Enfermera noradrenalina 0.05 mcg/kg/min IV','first');
 await f.send('Enfermera noradrenalina 0.05 mcg/kg/min IV','same');
 const different=await f.send('Enfermera noradrenalina 0.02 mcg/kg/min IV','different');
 assert.equal(different.clinical[0].status,'rejected');assert.equal(different.clinical[0].reason,'infusion-change-pending');
 await f.advance(.81);assert.equal(f.s.read().patient.administrationLog.length,1);
 const same=await f.send('Enfermera noradrenalina 0.05 mcg/kg/min IV','same');
 assert.equal(same.clinical[0].status,'executed');assert.equal(same.clinical[0].receipt.sourceEventId,'support:doctor:first:0');
 assert.equal(same.clinical[0].receipt.reused,true);
 const terminal=await f.send('Enfermera noradrenalina 0.02 mcg/kg/min IV','different');
 assert.equal(terminal.clinical[0].status,'rejected');
 assert.equal(f.s.read().patient.procedures.vasopressor.dose.amount,.05);
 f.s.dispose();
});
test('a pending rate does not survive room disposal or become an administered dose',async()=>{
 const f=fixture('CIRR-001','apprentice');await f.send('Enfermera una vía');
 await f.send('Enfermera noradrenalina 0.05 mcg/kg/min IV');
 f.s.dispose();assert.equal(f.s.read().patient.administrationLog.length,0);
 assert.equal(f.s.read().patient.procedures.vasopressor,undefined);
 assert.throws(()=>f.s.advance(2),/disposed/);
});
test('unsupported case stop requests are interpreted without creating an infusion or throwing on missing native state',async()=>{
 const f=fixture('PERI-SEC-001');
 const reply=await f.send('Enfermera monitor y suspender noradrenalina');
 assert.equal(reply.routeError,'unsafe-compound-order');assert.deepEqual(reply.clinical,[]);
 assert.deepEqual(f.s.read().patient.administrationLog,undefined);f.s.dispose();
});
test('explicit VO, PO and other non-IV routes cannot silently become an IV blood or weight-based medicine',async()=>{
 const f=fixture();await f.send('Enfermera una vía');
 for(const text of ['anfotericina 0.7 mg/kg VO','transfusion 1 unidad VO','anfotericina 0.7 mg/kg V.O.',
  'transfusion 1 unidad P.O.','anfotericina 0.7 mg/kg SL','transfusion 1 unidad rectal']){
  const reply=await f.send('Enfermera '+text);
  assert(reply.clinical[0]?.status==='rejected'||reply.routeError&&reply.clinical.length===0,text);
  const compound=await f.send('Enfermera monitor y '+text);
  assert(compound.routeError,text);assert.deepEqual(compound.clinical,[],text);
 }
 await f.advance(5);assert.equal(f.s.read().patient.administrationLog.length,0);
 assert.equal(f.s.read().patient.procedures.monitor?.connected??false,false);f.s.dispose();
});
test('a long frame cannot skip fatal exposure after repeated albumin in an already hypoxemic patient',async()=>{
 const run=async step=>{
  const f=fixture('CIRR-001');await f.send('Enfermera una vía');
  await f.send('Enfermera Ringer 6000 ml');await f.advance(500);
  assert.equal(!!f.s.read().patient.patientDied,false);
  for(let i=0;i<6;i++)await f.send('Enfermera albumina 1.5 g/kg');
  for(let elapsed=0;elapsed<170;elapsed+=step)await f.advance(Math.min(step,170-elapsed));
  const state=f.s.read();f.s.dispose();return state;
 };
 const large=await run(170),small=await run(.25);
 assert.equal(small.patient.deathReason,'critical-hypoxemia');
 assert.equal(large.patient.patientDied,true,'one frame still follows the original fatal exposure policy');
 assert.equal(large.patient.deathReason,small.patient.deathReason);
 assert.deepEqual(large.patient.survival,small.patient.survival);
 assert.equal(large.patient.administrationLog.filter(x=>x.id==='albumin').length,6);
 assert.deepEqual(large.progress,small.progress);
});
