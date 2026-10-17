import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {confirmedMorphineResponse487,morphineOrderIssue487,parseMorphineIVDose487} from './morphine-487.js';
import {morphineOrderIssue487 as originalIssue} from '../../integration/morphine-487.js';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advanceLegacy}
 from '../../../qa/physiology-live/native-journey-487.mjs';
const cases=JSON.parse(readFileSync(new URL('../content/cases.json',import.meta.url)));
// Reidentify real legacy receipts for the pure V5 boundary. No fabricated
// administration is inserted into either running game.
function originalPatient(runtime){
 const old=runtime.ctx.sim,uid=old.patientInstance.uid;
 const rows=old.administrationLog.filter(x=>x.id==='morphine').map((x,i)=>({
  id:x.id,label:x.label,patientUid:uid,sourceEventId:'original-dose-'+i,
  administeredAtNativeMinute:x.m,dose:{amount:Number.parseFloat(x.doseDisplay),unit:'mg'}}));
 return structuredClone({uid,liveVitals:{...old.liveVitals},phys:old.phys?{...old.phys}:null,
  administrationLog:rows,treatments:structuredClone(rows)});
}
function compareReport(actual,expected,label){
 for(const key of ['load','analgesia','halfLifeNative'])
  assert(Math.abs(actual[key]-expected[key])<1e-11,label+' '+key);
 assert.equal(actual.respiratoryRisk,expected.respiratoryRisk,label+' risk');
 for(const [axis,n] of Object.entries(expected.offsets))
  assert(Math.abs(actual.offsets[axis]-n)<1e-11,label+' '+axis);
}
test('morphine interpretation is the original final validator, with its reference and allowed dose range',()=>{
 assert.equal(morphineOrderIssue487.toString(),originalIssue.toString());
 for(const q of ['morfina','morfina IV','morfina 4 mg IV','morfina 12 mg EV','morfina 30 mg vía endovenosa',
  'morfina 0,5 mg IV','morfina 4 mg VO','morfina 4 mg sublingual','morfina 4 mcg',
  'morfina 4 g IV','morfina -4 mg','morfina 4 mg y 8 mg','morfina 31 mg IV']){
  assert.equal(morphineOrderIssue487(q),originalIssue(q),q);
  if(originalIssue(q))assert.throws(()=>parseMorphineIVDose487(q));
  else assert(parseMorphineIVDose487(q).amount>0);
 }
 assert.deepEqual(parseMorphineIVDose487('morfina'),{amount:4,unit:'mg',display:'4 mg',defaultApplied:true});
 assert.equal(parseMorphineIVDose487('morfina 12 mg IV').amount,12);
});
test('all 13 cases match the effective original morphine owner after actual dose, repetition and washout',()=>{
 for(const c of cases){
  const old=createLiveNativeJourney487(c.id);
  assert.equal(old.ctx.addMonitorTherapy('morfina 4 mg IV'),true);
  for(const seconds of [1,1,15,110]){
   if(seconds===15)assert.equal(old.ctx.addMonitorTherapy('morfina 12 mg IV'),true);
   advanceLegacy(old,seconds);
   const p=originalPatient(old),before=structuredClone(p);
   const actual=confirmedMorphineResponse487(p,old.ctx.C,old.ctx.sim.gameMinute);
   compareReport(actual,old.ctx.window.csMorphine487.report(),c.id+' '+old.clock.realSeconds);
   assert.deepEqual(p,before,'PK projection cannot mutate patient or receipts');
  }
 }
});
test('the original current-state vulnerability and renal-dependent half-life remain effective',()=>{
 for(const reserve of [.1,.5,1])for(const [sys,spo2] of [[75,82],[125,98]]){
  const old=createLiveNativeJourney487('PERI-SEC-001');
  old.ctx.addMonitorTherapy('morfina 12 mg IV');advanceLegacy(old,1);
  // Pure-response comparison: observing a different current condition must
  // change the same equation without administrating a second artificial dose.
  old.ctx.sim.phys.renalReserve=reserve;
  old.ctx.sim.liveVitals.sys=sys;old.ctx.sim.liveVitals.spo2=spo2;
  compareReport(confirmedMorphineResponse487(originalPatient(old),old.ctx.C,old.ctx.sim.gameMinute),
   old.ctx.window.csMorphine487.report(),reserve+'/'+sys+'/'+spo2);
 }
});
test('the 24 recent-dose bound preserves the real historical count and matches original saturation',()=>{
 const old=createLiveNativeJourney487('COLON-001');
 for(let i=0;i<30;i++){old.ctx.addMonitorTherapy('morfina 4 mg IV');advanceLegacy(old,1);}
 const p=originalPatient(old),r=confirmedMorphineResponse487(p,old.ctx.C,old.ctx.sim.gameMinute);
 compareReport(r,old.ctx.window.csMorphine487.report(),'30 actual doses');
 assert.equal(r.recentDoseCount,24);assert.equal(p.administrationLog.length,30);assert(r.load<=3.6);
});
test('unconfirmed, duplicate, future, wrong-patient and malformed opioid receipts cannot enter physiology',()=>{
 const old=createLiveNativeJourney487('APP-001');
 assert.equal(confirmedMorphineResponse487(originalPatient(old),old.ctx.C,0),null);
 old.ctx.addMonitorTherapy('morfina 4 mg IV');advanceLegacy(old,1);
 const patient=originalPatient(old),at=old.ctx.sim.gameMinute;
 for(const corrupt of [p=>p.treatments=[],p=>p.administrationLog.push(structuredClone(p.administrationLog[0])),
  p=>p.administrationLog[0].patientUid='other',p=>p.administrationLog[0].administeredAtNativeMinute=at+1,
  p=>p.administrationLog[0].dose.unit='g',p=>p.administrationLog[0].dose.amount=500,
  p=>p.treatments[0].dose.amount=12]){
  const p=structuredClone(patient);corrupt(p);
  assert.throws(()=>confirmedMorphineResponse487(p,old.ctx.C,at),/confirmed patient administration/);
 }
 const late=confirmedMorphineResponse487(patient,old.ctx.C,at+40);
 assert.equal(late.load,0);assert.equal(late.analgesia,0);assert.equal(late.respiratoryRisk,false);
 assert(Object.values(late.offsets).every(x=>x===0));
});
