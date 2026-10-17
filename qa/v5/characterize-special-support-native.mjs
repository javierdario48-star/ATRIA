// QA only: actual effective V4 administration/timers and V5 room/port executor.
// No generated wrapper, VM or second pharmacology engine enters the V5 build.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advanceLegacy,
 liveNativeJourneySources487} from '../physiology-live/native-journey-487.mjs';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
import {confirmedNativeSupportEffects487} from '../../src/v5/clinical/native-support-487.js';
const load=async name=>JSON.parse(await fs.readFile(new URL('../../src/v5/content/'+name+'.json',import.meta.url)));
const content={cases:await load('cases'),therapies:await load('therapies'),defaultDoses:await load('default-doses')};
const axes=['temp','hr','rr','sys','dia','spo2'],scenarios=[];
const forms=[
 {id:'albumin',text:'albumina 1.5 g/kg',amount:1.5,unit:'g/kg',seconds:.8},
 {id:'transfusion',text:'transfusion 2 unidades',amount:2,unit:'unidad',seconds:2.6},
 {id:'vasopressor',text:'noradrenalina 1 mcg/kg/min IV',amount:1,unit:'µg/kg/min',seconds:.8},
 {id:'amphotericin',text:'anfotericina 0.7 mg/kg IV',amount:.7,unit:'mg/kg',seconds:1.5}
];
function legacyOffsets(r){
 const nominal=r.ctx.therapyEffectTotals(),risk=r.ctx.medicationSafetyOffsets();
 return Object.fromEntries(axes.map(axis=>[axis,(nominal[axis]||0)+(risk[axis]||0)]));
}
async function pair(caseId){
 const old=createLiveNativeJourney487(caseId),c=content.cases.find(x=>x.id===caseId);let seq=0;
 const s=createGuardSession({roomId:'support-parity',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'})});
 const send=text=>s.post({id:String(++seq),text:'Enfermera '+text});await send('una vía');
 const advance=async seconds=>{advanceLegacy(old,seconds);s.advance(seconds);await s.flush();};
 const compare=()=>{
  const p=s.read().patient,expected=legacyOffsets(old),actual=confirmedNativeSupportEffects487(p,c,s.read().clock.nativeMinute).offsets;
  for(const axis of axes)assert(Math.abs(expected[axis]-actual[axis])<1e-9,caseId+'/'+axis+' target');
  const drift=Object.fromEntries(axes.map(axis=>[axis,p.liveVitals[axis]-old.ctx.sim.liveVitals[axis]]));
  // Legacy flushes its medicine timer after its 60Hz vital update. V5 splits
  // precisely at receipt time; numerical drift may not exceed that one frame.
  for(const axis of axes)assert(Math.abs(drift[axis])<=Math.abs(expected[axis])*.38/60+1e-5,
   caseId+'/'+axis+' more than one original 60Hz frame: '+drift[axis]);
  return {expected,actual,legacyVitals:JSON.parse(JSON.stringify(old.ctx.sim.liveVitals)),v5Vitals:p.liveVitals,drift};
 };
 return {old,s,send,advance,compare};
}
for(const caseId of ['APP-001','CIRR-001'])for(const form of forms){
 const p=await pair(caseId);
 try{
  // The original monitor is the proven original direct medication path. Its
  // nurse albumin alias wrongly collides with the lab; V5 explicitly fixes it.
  p.old.ctx.addMonitorTherapy(form.text);await p.send(form.text);
  await p.advance(form.seconds-.01);
  assert.equal(p.old.ctx.sim.administrationLog.length,0);assert.equal(p.s.read().patient.administrationLog.length,0);
  await p.advance(.02);
  const old=JSON.parse(JSON.stringify(p.old.ctx.sim.administrationLog[0])),migrated=p.s.read().patient.administrationLog[0];
  const oldDose=JSON.parse(JSON.stringify(p.old.ctx.sim.monitorTherapies.get(form.id).dose));
  assert.equal(old.id,form.id);assert.equal(migrated.id,form.id);
  assert.equal(oldDose.amount,form.amount);assert.equal(migrated.dose.amount,form.amount);
  assert.equal(old.doseDisplay,oldDose.display,'actual legacy receipt and administered treatment agree');
  assert.equal(migrated.dose.unit,form.unit);
  if(form.id==='amphotericin')assert.equal(oldDose.unit,'mg','record the original lost /kg defect explicitly');
  else assert.equal(oldDose.unit,form.unit);
  assert(Math.abs(old.m-form.seconds*.12)<1e-8,'original preparation/native clock');
  assert.equal(migrated.administeredAtRealSecond,form.seconds);
  await p.advance(15-form.seconds-.01);
  scenarios.push({caseId,id:form.id,legacy:{receipt:old,dose:oldDose},migrated,...p.compare(),
   ...(form.id==='amphotericin'?{intentionalCorrection:'original receipt lost /kg; V5 retains the prescribed mg/kg'}:{})});
 }finally{p.s.dispose();}
}
// Original repeated-dose respiratory harm, with actual administrations rather
// than synthetic exposure flags. All six receipts must reach the same owner.
{
 const p=await pair('CIRR-001');try{
  for(let i=0;i<6;i++){p.old.ctx.addMonitorTherapy('albumina 1.5 g/kg');await p.send('albumina 1.5 g/kg');await p.advance(.81);}
  await p.advance(15);const compared=p.compare();
  assert(compared.actual.spo2===-7&&compared.actual.rr===8);
  assert(p.s.read().patient.liveVitals.spo2<90);
  assert.equal(p.s.read().patient.adverseEvents.filter(x=>x.kind==='albumin-respiratory-overload').length,1);
  scenarios.push({caseId:'CIRR-001',id:'six-confirmed-albumin-doses',receipts:6,...compared});
 }finally{p.s.dispose();}
}
// Absolute infusion changes replace the rate, while stop is a distinct
// bedside execution (1800ms), not another dose or permanent rescue evidence.
{
 const p=await pair('CIRR-001');try{
  for(const rate of [.05,.02]){
   const text='noradrenalina '+rate+' mcg/kg/min IV';
   p.old.ctx.addMonitorTherapy(text);await p.send(text);await p.advance(1);
  }
  p.old.ctx.nurseNatural('Enfermera suspender noradrenalina');await p.send('suspender noradrenalina');
  await p.advance(1.79);
  assert(p.old.ctx.sim.monitorTherapies.has('vasopressor'));assert(p.s.read().patient.procedures.vasopressor.active);
  await p.advance(.21);
  const old=p.old.ctx.sim.administrationLog.at(-1),migrated=p.s.read().patient.administrationLog.at(-1);
  assert.equal(old.action,'stop');assert.equal(migrated.action,'stop');
  assert.equal(old.dose,undefined);assert.equal(migrated.dose,undefined);
  assert.equal(p.old.ctx.sim.therapyExposure.get('vasopressor').count,2);
  assert.equal(p.s.read().exposure.byDrug.vasopressor.administrations,2);
  assert.equal(p.s.read().exposure.byDrug.vasopressor.currentRate,0);
  assert(!p.old.ctx.sim.monitorTherapies.has('vasopressor'));
  await p.advance(30);
  // The old QA nurse first arrives one 60Hz frame after the request, whereas
  // this V5 port fixture is already bedside. After washout both baselines agree.
  const expected=legacyOffsets(p.old),actual=confirmedNativeSupportEffects487(p.s.read().patient,
   content.cases.find(x=>x.id==='CIRR-001'),p.s.read().clock.nativeMinute).offsets;
  assert.deepEqual(actual,expected);assert(axes.every(axis=>Math.abs(p.s.read().patient.liveVitals[axis]-p.old.ctx.sim.liveVitals[axis])<1e-4));
  scenarios.push({caseId:'CIRR-001',id:'absolute-rates-and-confirmed-stop',doses:2,events:3,expected,actual,
   legacyStop:JSON.parse(JSON.stringify(old)),migratedStop:migrated});
 }finally{p.s.dispose();}
}
const report={schema:'atria-c2c-native-support-parity/v1',testOnly:true,allMatched:true,
 reference:'effective apply487 native runtime including nursing, morphine and final urgent-care wrappers; experimental PHARMA owner not installed',
 sourceHashes:liveNativeJourneySources487.compiled.map(({id,code})=>({id,sha256:createHash('sha256').update(code).digest('hex')})),
 scope:'APP/CIRR physiological owners; other case executors and peritonitis immediate volume/renal state remain C3',
 intentionalCorrections:['explicit albumin g/kg is medication instead of a hepatogram','amphotericin receipt retains mg/kg'],scenarios};
const out=process.env.V5_SUPPORT_EVIDENCE||'qa/v5-browser-results';await fs.mkdir(out,{recursive:true});
await fs.writeFile(out+'/special-support-native-parity.json',JSON.stringify(report,null,2)+'\n');
console.log('SPECIAL SUPPORT V4/V5 PARITY PASS',JSON.stringify({scenarios:scenarios.length,allMatched:true}));
