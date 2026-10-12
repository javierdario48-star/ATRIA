/* Audit of the EXISTING native grouped beta-blocker. No new drug writer,
 * forced bradycardia, pressure floor change or survival-policy modification. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAndroidIntegratedRuntime487} from './android-integrated-runtime-487.mjs';
import {advanceLiveNativeJourney487 as advance} from './physiology-live/native-journey-487.mjs';
const specs=[
 {name:'stable',id:'CIRR-001'},
 {name:'sinus-tachycardia-no-shock',id:'CIRR-001',vitals:{hr:125}},
 {name:'hypovolemic-shock',id:'HDA-001'},
 {name:'distributive-shock',id:'PERI-SEC-001'},
 {name:'baseline-bradycardia',id:'CIRR-001',vitals:{hr:45}},
 {name:'severe-hypotension',id:'PERI-SEC-001',vitals:{sys:55,dia:30,hr:148}}
],times=[.25,1,5,30,60,90,150],rows=[];
function create(spec){
 const r=createAndroidIntegratedRuntime487(spec.id,{confirmedIV:1});
 if(spec.vitals){
  Object.assign(r.ctx.sim.liveVitals,spec.vitals);
  if(spec.vitals.hr!=null)r.ctx.C.vitals.hr=spec.vitals.hr;
  if(spec.vitals.sys!=null)r.ctx.C.vitals.bp=spec.vitals.sys+'/'+spec.vitals.dia;
 }
 return r;
}
function snapshot(r){
 const p=r.ctx.sim,v=p.liveVitals,e=r.ctx.therapyEffectTotals(),progress=r.ctx.progressionOffsets(),tox=r.ctx.medicationSafetyOffsets(),b=r.ctx.initialLiveVitals();
 return {seconds:r.clock.realSeconds,nativeMinute:p.gameMinute,displayClinicalMinutes:r.clock.realSeconds,
  fc:v.hr,fr:v.rr,pas:v.sys,pad:v.dia,pam:(v.sys+2*v.dia)/3,spo2:v.spo2,
  perfusion:{contractility:p.phys?.contractility??null,effectiveVolume:p.phys?.effectiveVolume??null,
   svr:p.phys?.svr??null,hypoperfusionNativeMinutes:p.nsHypoperfusionMinutes||0},
  rawNativeTarget:{hr:b.hr+e.hr+progress.hr+tox.hr,sys:b.sys+e.sys+progress.sys+tox.sys,
   dia:b.dia+e.dia+progress.dia+tox.dia},
  events:p.adverseEvents||[],caseEnded:!!p.caseEnded,patientDied:!!p.patientDied};
}
for(const spec of specs)for(const count of [1,2,3,4]){
 const treated=create(spec),control=create(spec),initial=snapshot(treated),points=[];
 let doses=0;
 for(const time of times){
  // Real administration attempts at 0, 1, 2 and 3 seconds; timers deliver
  // each independently. A control advances to precisely the same timestamp.
  while(doses<count&&doses<time){
   const at=doses;
   if(treated.clock.realSeconds<at)advance(treated,at-treated.clock.realSeconds,{dt:1/6});
   assert.equal(treated.ctx.addMonitorTherapy('propranolol 40 mg oral'),true);
   doses++;
  }
  if(treated.clock.realSeconds<time)advance(treated,time-treated.clock.realSeconds,{dt:1/6});
  advance(control,time-control.clock.realSeconds,{dt:1/6});
  points.push({treated:snapshot(treated),control:snapshot(control)});
 }
 const p=treated.ctx.sim,receipts=p.administrationLog.filter(x=>x.id==='beta_blocker');
 assert.equal(receipts.length,count,'actual native dose count '+spec.name);
 assert(receipts.every(x=>x.doseDisplay==='40 mg'),'exact administered dose');
 assert.equal(p.therapyExposure.get('beta_blocker').totalAmount,count*40,'native accumulated mg');
 const last=points.at(-1);
 assert(last.treated.fc<last.control.fc,'chronotropic response vs identical control '+spec.name);
 if(p.phys&&spec.id==='PERI-SEC-001')assert(last.treated.perfusion.contractility<last.control.perfusion.contractility,'native inotropic harm');
 rows.push({scenario:spec.name,caseId:spec.id,doses:count,cumulativeMg:count*40,
  identity:{nativeId:'beta_blocker',nativeLabel:treated.ctx.findMonitorTherapy('propranolol 40 mg oral').label,
   explicitlyRequestedMolecule:'propranolol',explicitlyRequestedRoute:'oral',
   model:'native grouped class; separate agent PK/route exposure is not implemented'},
  initial,receipts,points});
}
for(const spec of specs){
 const one=rows.find(x=>x.scenario===spec.name&&x.doses===1),four=rows.find(x=>x.scenario===spec.name&&x.doses===4);
 const a=one.points.at(-1).treated,b=four.points.at(-1).treated;
 assert(b.fc<a.fc||b.rawNativeTarget.hr<a.rawNativeTarget.hr&&Math.abs(b.fc-38)<.01,
  'repeated exposure is observable or reaches the existing bradycardia floor '+spec.name);
}
const result={scenarios:rows.length,states:specs.length,points:rows.reduce((n,x)=>n+x.points.length,0),
 originalMechanismRetained:true,deathProtectionChanged:false,physicalAndroid:false,
 sources:[
  'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=14d0c95d-418f-40a8-bad3-e20c82424960',
  'https://www.dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=454054f1-0730-41b3-844a-c7b65f1b47c5'],
 limitations:['Native class groups propranolol/carvedilol; screenshot cannot identify exact molecule or route.',
  'Native effects/accumulation are simplified, not agent-specific concentration/half-life/conduction modelling.',
  'Oral onset and duration are not quantitatively validated; temporal changes include native preparation and smoothing.',
  'Existing 55/30 display target floors can hide further pressure reduction; native contractility/raw targets show harm.',
  'FC greater than 100 does not imply absent beta blockade; compare identical untreated patients.'],rows};
fs.mkdirSync('qa/android-fix-results',{recursive:true});
fs.writeFileSync('qa/android-fix-results/beta-blocker.json',JSON.stringify(result,null,2)+'\n');
console.log('BETA-BLOCKER NATIVE AUDIT',JSON.stringify({scenarios:result.scenarios,states:result.states,
 points:result.points,originalMechanismRetained:true,distributive:rows.filter(x=>x.scenario==='distributive-shock').map(x=>({
  doses:x.doses,fc:x.points.find(p=>p.treated.seconds>59&&p.treated.seconds<61).treated.fc,
  controlFc:x.points.find(p=>p.treated.seconds>59&&p.treated.seconds<61).control.fc,
  pump:x.points.at(-1).treated.perfusion.contractility}))}));
