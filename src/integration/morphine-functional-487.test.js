/** Integrated native emergency-morphine QA. No live browser, no clinical validation claim. */
import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance}
 from '../../qa/physiology-live/native-journey-487.mjs';
const make=id=>createLiveNativeJourney487(id);
const med=r=>r.ctx.sim.administrationLog.filter(x=>x.id==='morphine');
const score=r=>r.ctx.window.csMorphine487.report();
let checks=0;
function check(name,fn){fn();checks++;console.log('MORPHINE NATIVE QA PASS',name);}

check('no morphine exposure before verified native administration',()=>{
 const r=make('PERI-SEC-001');
 assert.equal(r.ctx.window.__csMorphine487,true);
 assert.equal(score(r),null);
 assert.equal(med(r).length,0);
 assert.notEqual(r.ctx.window.__csPharmacology487,true,'unfinished global B1 must remain inactive');
});
check('shared executor rejects wrong route, units, ambiguous numbers and extreme input',()=>{
 const r=make('PERI-SEC-001');
 for(const q of ['morfina 4 mg oral','morfina 4 mg VO','morfina 4 mcg IV',
   'morfina 4 g IV','morfina 4 ml IV','morfina 4','morfina -4 mg IV',
   'morfina 0 mg IV','morfina 40 mg IV','morfina 4 mg y 8 mg']){
  assert.equal(r.ctx.addMonitorTherapy(q),false,q);
  assert.equal(med(r).length,0,'invalid order must not create native dose '+q);
 }
 assert.equal(score(r),null);
});
check('monitor lookup and actual nurse prescription share validated 4mg delivery',()=>{
 const a=make('PERI-SEC-001'),b=make('PERI-SEC-001');
 assert.equal(a.ctx.findMonitorTherapy('morfina 4 mg IV')?.id,'morphine');
 assert.equal(a.ctx.addMonitorTherapy('morfina 4 mg IV'),true);
 assert.equal(med(a).length,1);
 assert.equal(a.ctx.sim.therapyExposure.get('morphine').count,1);
 b.ctx.nurseNatural('enfermera morfina 4 mg IV');
 assert.equal(med(b).length,0,'nurse order before completion cannot change pharmacology');
 advance(b,1);
 assert.equal(med(b).length,1,'nursing native execution must have real administration');
 assert.equal(med(b)[0].doseDisplay,med(a)[0].doseDisplay);
 const nurse=score(b),monitor=score(a);
 assert(nurse&&monitor);
 assert(nurse.analgesia>0&&monitor.analgesia>0);
 assert(Math.abs(nurse.load-monitor.load)<.1,'same verified dose has comparable owner response');
 assert.equal(a.ctx.sim.therapyExposure.get('morphine').csRecentMorphine487.length,1);
 assert.equal(b.ctx.sim.therapyExposure.get('morphine').csRecentMorphine487.length,1);
});
check('pending nurse IV and pending manual monitor IV are not pharmacologic effects',()=>{
 for(const route of ['nurse','monitor']){
  const r=createLiveNativeJourney487('PERI-SEC-001',{confirmedIV:0});
  if(route==='nurse')r.ctx.nurseNatural('enfermera morfina 4 mg IV');
  else r.ctx.addMonitorTherapy('morfina 4 mg IV');
  assert.equal(med(r).length,0,route+' must not mark a dose');
  assert.equal(score(r),null,route+' must not yield opioid response before IV and completion');
 }
});
check('repetition increases respiratory cost; risk fades instead of remaining a permanent toxicity flag',()=>{
 const r=make('PANC-001');
 r.ctx.addMonitorTherapy('morfina 4 mg IV');
 const one=score(r),early={...r.ctx.therapyEffectTotals()};
 assert(one.analgesia>0&&one.offsets.rr<0);
 assert.equal(one.offsets.spo2,0);
 advance(r,1);
 r.ctx.addMonitorTherapy('morfina 4 mg IV');
 const two=score(r);
 assert.equal(med(r).length,2);
 assert(two.load>one.load&&two.offsets.rr<one.offsets.rr,
  'a repeated recent dose must increase suppression');
 assert(two.offsets.spo2<one.offsets.spo2,'higher recent exposure can impair oxygenation');
 const nativeSafety=r.ctx.medicationSafetyOffsets();
 assert(Math.abs(nativeSafety.rr)<1e-8&&Math.abs(nativeSafety.spo2)<1e-8,
  'permanent legacy morphine toxicity removed only when owner is active');
 const afterRepeat=r.ctx.therapyEffectTotals();
 assert(afterRepeat.rr<early.rr);
 advance(r,110);
 const late=score(r);
 assert(late.load<two.load*.55,'morphine educational effect must decay');
 assert(late.offsets.rr>two.offsets.rr,'respiratory effect diminishes');
 assert.equal(r.ctx.sim.therapyExposure.get('morphine').count,2,'dose history remains intact');
 assert(Math.abs(r.ctx.medicationSafetyOffsets().rr)<1e-8,
  'old permanent overdose writer cannot revive during washout');
});
check('unindicated morphine can harm without fictitious analgesic benefit',()=>{
 const r=make('COLON-001');
 r.ctx.addMonitorTherapy('morfina 12 mg IV');
 const e=score(r);
 assert.equal(e.analgesia,0,'case without pain does not gain analgesic benefit');
 assert(e.offsets.rr<-3&&e.offsets.spo2<0);
 assert(e.offsets.sys<0,'opioid can reduce pressure');
});
check('dose risk depends on current hemodynamic and respiratory vulnerability',()=>{
 const a=make('PERI-SEC-001'),b=make('PERI-SEC-001');
 a.ctx.sim.liveVitals.sys=75;a.ctx.sim.liveVitals.spo2=82;
 b.ctx.sim.liveVitals.sys=125;b.ctx.sim.liveVitals.spo2=98;
 a.ctx.addMonitorTherapy('morfina 10 mg IV');b.ctx.addMonitorTherapy('morfina 10 mg IV');
 const low=score(a),normal=score(b);
 assert(low.offsets.sys<normal.offsets.sys);
 assert(low.offsets.spo2<normal.offsets.spo2);
});
check('native non-morphine medication retains its existing writer',()=>{
 const a=make('PERI-SEC-001');
 const before=a.ctx.therapyEffectTotals();
 a.ctx.addMonitorTherapy('oxigeno 4 L/min');
 const after=a.ctx.therapyEffectTotals();
 assert(after.spo2>before.spo2);
 assert.equal(score(a),null,'oxygen must not create ghost morphine exposure');
});
check('all thirteen clinical seeds admit a finite, independent morphine response',()=>{
 const ids=['CIRR-001','PANC-001','CROHN-001','HDA-001','COLON-001',
 'PERI-PBE-001','PERI-SEC-001','PERI-TER-001','APP-001','CHOLE-001',
 'ILEO-001','MESI-001','CHOLANG-001'];
 for(const id of ids){
  const r=make(id);
  r.ctx.addMonitorTherapy('morfina 4 mg IV');
  assert.equal(med(r).length,1,id);
  const x=score(r),o=r.ctx.therapyEffectTotals();
  assert(x&&Number.isFinite(x.load)&&Object.values(x.offsets).every(Number.isFinite),id);
  assert(Object.values(o).every(Number.isFinite),id);
  assert.equal(r.ctx.sim.therapyExposure.get('morphine').count,1,id);
 }
});
check('bounded recent-dose subrecord preserves cumulative historical native count',()=>{
 const r=make('COLON-001');
 for(let i=0;i<30;i++)assert.equal(r.ctx.addMonitorTherapy('morfina 4 mg IV'),true);
 const exposure=r.ctx.sim.therapyExposure.get('morphine');
 assert.equal(exposure.count,30);
 assert.equal(med(r).length,30);
 assert(exposure.csRecentMorphine487.length<=24);
 assert(score(r).load<=3.6);
});
console.log('MORPHINE NATIVE FUNCTIONAL COMPLETE',JSON.stringify({
 checks,entries:13,interfaces:['bedside-monitor-search','native-nursing'],
 boundedNativeExposure:true,physiologicalOwner:'native-replacement',
 b1OwnerEnabled:false,noNewDrugCatalogue:true,
 unchangedRescuePolicies:true,physicalDevice:false
}));
