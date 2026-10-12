/**
 * ATRIA 4.8.7 QA — correct ED management vs matched untreated; realistic
 * graded exposures against the ORIGINAL generated native clinical engine.
 * This is not a separate pharmacology writer or an assertion that all
 * medications should alter BP/HR/SpO2 during an ED visit.
 * Clinical clock: 1 real minute represents ~1 displayed hour in guard mode;
 * this bot samples early and intermediate ED observations, not a full 24m run.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CARE_JOURNEYS_487} from './clinical-care-journeys-487.js';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance}
 from './physiology-live/native-journey-487.mjs';
const caseIds=Object.keys(CARE_JOURNEYS_487);
assert.equal(caseIds.length,13);
const fields=['hr','rr','sys','dia','spo2'];
const metric=r=>{
 const p=r.ctx.sim,v=p.liveVitals||{},phys=p.phys||{},e=r.ctx.therapyEffectTotals(),
       safety=r.ctx.medicationSafetyOffsets();
 return {atRealSeconds:Number(r.clock.realSeconds.toFixed(2)),
  vitals:Object.fromEntries(fields.map(k=>[k,Number(v[k])])),
  map:Number((Number(v.sys)+2*Number(v.dia))/3),
  effectiveVolume:phys.effectiveVolume??null,
  contractility:phys.contractility??null,
  totalFluidMl:Number(p.therapyTotals?.fluidMl||0),
  analgesia:Math.abs(Number(e.pain||0)),
  effects:Object.fromEntries(['hr','rr','sys','dia','spo2','pain'].map(k=>[k,Number(e[k]||0)])),
  safety:Object.fromEntries(fields.map(k=>[k,Number(safety[k]||0)])),
  exposures:Object.fromEntries([...p.therapyExposure].map(([k,x])=>[k,{count:x.count||0,totalAmount:x.totalAmount||0}])),
  administrations:p.administrationLog.map(x=>({id:x.id,dose:x.doseDisplay,defaultApplied:x.defaultApplied})),
  caseEnded:!!p.caseEnded,patientDied:!!p.patientDied};
};
const finite=m=>fields.every(k=>Number.isFinite(m.vitals[k]))&&Number.isFinite(m.map);
const delta=(a,b)=>Object.fromEntries(fields.map(k=>[k,Number((a.vitals[k]-b.vitals[k]).toFixed(3))]));
const cases=[],graded=[],findings=[],hard=[];
function runPlan(id,variation){
 const plan=CARE_JOURNEYS_487[id],
       orders=variation==='standard'?plan.orders:plan.alternatives[0];
 const patient=createLiveNativeJourney487(id),control=createLiveNativeJourney487(id);
 const p=patient.ctx.sim,baseline=metric(patient),drugs=[];
 for(const raw of orders){
  const therapy=patient.ctx.findMonitorTherapy(raw),tid=therapy?.id;
  if(!tid){hard.push({id,variation,raw,error:'drug not recognized'});continue;}
  const prior=p.administrationLog.filter(x=>x.id===tid).length;
  let accepted=null,error=null;
  try{accepted=patient.ctx.addMonitorTherapy(raw)!==false;}catch(e){error=e.message;}
  advance(patient,2.7,{dt:1/30});advance(control,2.7,{dt:1/30});
  const rows=p.administrationLog.filter(x=>x.id===tid).slice(prior);
  const status=patient.ctx.window.csCare487?.assess(tid)||{};
  const info={id:tid,raw,accepted,error,delivered:rows.length===1,
   dose:rows[0]?.doseDisplay??null,appropriate:status.appropriate??null,
   indicated:status.indicated??null,contraindicated:status.contraindicated??null};
  drugs.push(info);
  if(!info.delivered||error)hard.push({id,variation,info,error:'missing native receipt or exception'});
 }
 const horizon=36;
 advance(patient,horizon,{dt:1/30});advance(control,horizon,{dt:1/30});
 const treated=metric(patient),untreated=metric(control),deltas=delta(treated,untreated);
 if(!finite(treated)||!finite(untreated))hard.push({id,variation,error:'nonfinite native vitals'});
 if(treated.administrations.some(x=>!drugs.some(y=>y.id===x.id)))
  hard.push({id,variation,error:'unexpected extra treatment'});
 // The ED referral ends responsibility; never synthesize source-control.
 if(['quirofano','procedimiento'].includes(plan.destination)&&p.phys?.sourceControlled)
  hard.push({id,variation,error:'fictional source control without surgical act'});
 const changing=Object.values(deltas).some(x=>Math.abs(x)>.1);
 const treatmentSignals=Object.values(treated.effects).some((x,i)=>Math.abs(x-Object.values(untreated.effects)[i])>.05);
 const expectedNoImmediate=orders.length===0||orders.every(raw=>
  ['ceftriaxona','metronidazol','piptazo','imipenem','ampicilina','amikacina','fluconazol',
   'azatioprina','corticoide','espironolactona'].some(x=>raw.toLowerCase().includes(x)));
 if(!changing&&!treatmentSignals&&!expectedNoImmediate)
  findings.push({kind:'no-observable-acute-response',id,variation,orders,delta:deltas});
 cases.push({id,variation,orders,destination:plan.destination,
  realSecondsObserved:patient.clock.realSeconds,start:baseline,drugs,treated,untreated,
  deltas,changing,treatmentSignals,expectedNoImmediate});
}
for(const id of caseIds)for(const variation of ['standard','alternative'])
 runPlan(id,variation);
assert.equal(cases.length,26);
const gradeSpecs=[
 {id:'PERI-SEC-001',name:'crystalloid shock',text:'ringer 500 ml',drug:'fluid',doses:[1,2,3],step:3,measure:'volume'},
 {id:'CIRR-001',name:'crystalloid overload susceptible',text:'ringer 500 ml',drug:'fluid',doses:[1,2,3],step:3,measure:'oxygenation'},
 {id:'HDA-001',name:'crystalloid hemorrhage',text:'ringer 500 ml',drug:'fluid',doses:[1,2,3],step:3,measure:'perfusion'},
 {id:'PERI-SEC-001',name:'pressor shock',text:'noradrenalina 0.05 mcg/kg/min',drug:'vasopressor',doses:[1,2,3],step:4,measure:'pressure'},
 {id:'PANC-001',name:'opioid pain and repeated doses',text:'morfina 4 mg IV',drug:'morphine',doses:[1,2,3],step:4,measure:'analgesia-and-respiration'},
 {id:'COLON-001',name:'opioid no pain indication',text:'morfina 4 mg IV',drug:'morphine',doses:[1,2,3],step:4,measure:'respiratory-risk'},
 {id:'HDA-001',name:'beta blockade in hypovolemia',text:'propranolol 40 mg oral',drug:'beta_blocker',doses:[1,2,3],step:4,measure:'heart-rate-and-shock'},
 {id:'CIRR-001',name:'diuresis congestion',text:'furosemida 40 mg',drug:'furosemide',doses:[1,2,3],step:4,measure:'renal-fluid-response'},
 {id:'HDA-001',name:'diuresis hypovolemia',text:'furosemida 40 mg',drug:'furosemide',doses:[1,2,3],step:4,measure:'underfilling'},
 {id:'PERI-SEC-001',name:'oxygen titration',text:'oxígeno 4 L/min',drug:'oxygen',doses:[1,2],step:4,measure:'saturation'},
];
function runGrade(s,n){
 const patient=createLiveNativeJourney487(s.id),control=createLiveNativeJourney487(s.id);
 const p=patient.ctx.sim,initial=metric(patient),receipts=[],afterEach=[];
 // Patient and untreated comparator progress with identical time steps.
 for(let i=0;i<n;i++){
  const before=p.administrationLog.filter(x=>x.id===s.drug).length;
  const accepted=patient.ctx.addMonitorTherapy(s.text);
  advance(patient,s.step,{dt:1/30});advance(control,s.step,{dt:1/30});
  const actual=p.administrationLog.filter(x=>x.id===s.drug).slice(before);
  if(accepted===false||actual.length!==1)hard.push({
   id:s.id,name:s.name,n,step:i+1,error:'missing/extra confirmed native graded administration',
   accepted,rows:actual.map(x=>x.doseDisplay)});
  receipts.push(...actual.map(x=>({id:x.id,dose:x.doseDisplay})));
  afterEach.push({at:patient.clock.realSeconds,treated:metric(patient),untreated:metric(control)});
 }
 // Observe short-to-intermediate response, not long-term organ failure.
 advance(patient,35,{dt:1/30});advance(control,35,{dt:1/30});
 const end=metric(patient),controlEnd=metric(control),difference=delta(end,controlEnd);
 if(!finite(end)||!finite(controlEnd))hard.push({name:s.name,n,error:'nonfinite final physiology'});
 graded.push({caseId:s.id,name:s.name,mechanism:s.measure,doseCount:n,text:s.text,
  elapsedRealSeconds:patient.clock.realSeconds,initial,receipts,afterEach,
  finalTreated:end,finalControl:controlEnd,deltaVsUntreated:difference});
}
for(const s of gradeSpecs)for(const n of s.doses)runGrade(s,n);
// Compare *measured* direction, not prescribe a mathematical vital change
// for every medication. Escalation can plateau or hit a native safety floor.
const comparisons=gradeSpecs.map(s=>{
 const runs=graded.filter(x=>x.name===s.name),one=runs[0],more=runs.at(-1);
 const c={name:s.name,caseId:s.id,mechanism:s.measure,
  doseSteps:runs.map(r=>({doses:r.doseCount,delta:r.deltaVsUntreated,actual:r.receipts.length})),
  oneVsHighest:{hr:Number((more.deltaVsUntreated.hr-one.deltaVsUntreated.hr).toFixed(3)),
   sys:Number((more.deltaVsUntreated.sys-one.deltaVsUntreated.sys).toFixed(3)),
   spo2:Number((more.deltaVsUntreated.spo2-one.deltaVsUntreated.spo2).toFixed(3))},
  noVisibleGrading:['hr','sys','spo2'].every(k=>Math.abs(more.deltaVsUntreated[k]-one.deltaVsUntreated[k])<.1)};
 if(c.noVisibleGrading)findings.push({kind:'flat-graded-vitals-review',name:s.name,caseId:s.id});
 return c;
});
const result={schema:'atria-ed-24h-functional-physiology-audit/v1',
 source:'generated current ATRIA 4.8.7 native JavaScript',
 clock:'24 real minutes = 24h displayed guard; bot observes initial minutes, not full 24h',
 coverage:{clinicalCases:caseIds.length,correctJourneys:cases.length,gradedScenarios:graded.length,
  drugFamilies:gradeSpecs.length,physiologicEvaluation:'observable treatment/control differences and native receipts'},
 limitations:['In vitro-like deterministic game simulation with no browser, audio, touch or nursing sprites',
  'Procedural supports, studies, consults and native XP closing are tested by separate bots',
  'A time-limited ED cannot prove all delayed ADRs; short-acting drug effects are compared, others may only satisfy case requirements',
  'Not calibrated to exact real pharmacokinetics, cumulative exposure and vital-sign magnitudes'],
 counts:{correctWithAtLeastOneDose:cases.filter(x=>x.drugs.length>0).length,
  correctWithVitalSignal:cases.filter(x=>x.changing||x.treatmentSignals).length,
  unexecutedCorrectOrders:cases.flatMap(x=>x.drugs).filter(x=>!x.delivered).length,
  duplicateOrMissingGraded:hard.length,
  reviewFindings:findings.length},
 hard,findings,comparisons,correctCases:cases,graded};
fs.mkdirSync('qa/ed-physiology-results',{recursive:true});
fs.writeFileSync('qa/ed-physiology-results/functional-487.json',JSON.stringify(result,null,2)+'\n');
console.log('ATRIA ED CORRECT TREATMENT BOT',JSON.stringify({
 paths:cases.length,withAcuteSignal:result.counts.correctWithVitalSignal,
 drugReceipts:cases.reduce((n,x)=>n+x.drugs.filter(d=>d.delivered).length,0),
 errorCount:hard.length,observations:findings.slice(0,16)}));
console.log('ATRIA ED GRADED PHYSIOLOGY BOT',JSON.stringify({
 trials:graded.length,comparisons,errors:hard.slice(0,12)}));
assert.equal(hard.length,0,'real native administration and finite physiology invariants');
