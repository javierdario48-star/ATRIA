/** Adversarial bot: administer demonstrably wrong drugs using native monitor and
 * nursing routes. Compare identical untreated controls at the SAME game time.
 * Failures are reported, not concealed behind warnings or fabricated death. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance}
 from './physiology-live/native-journey-487.mjs';
import {CARE_JOURNEYS_487} from './clinical-care-journeys-487.js';
const ids=Object.keys(CARE_JOURNEYS_487),rows=[],issues=[];
function vitals(s){return Object.fromEntries(['sys','dia','hr','rr','spo2'].map(x=>[x,Number(s.liveVitals?.[x]||0)]))}
function run(caseId,kind,order,flags,seconds=22){
 const patient=createLiveNativeJourney487(caseId),control=createLiveNativeJourney487(caseId);
 patient.ctx.sim.clinicalFlags={...(patient.ctx.sim.clinicalFlags||{}),...flags};
 control.ctx.sim.clinicalFlags={...(control.ctx.sim.clinicalFlags||{}),...flags};
 if(flags.activeBleeding)for(const r of [patient,control])r.ctx.sim.phys={...(r.ctx.sim.phys||{}),activeBleeding:true};
 if(flags.hypovolemia)for(const r of [patient,control])r.ctx.sim.phys={...(r.ctx.sim.phys||{}),effectiveVolume:.30};
 if(flags.congestion)for(const r of [patient,control])r.ctx.sim.phys={...(r.ctx.sim.phys||{}),congestion:.95};
 const id=patient.ctx.findMonitorTherapy(order)?.id,pre=patient.ctx.sim.administrationLog.length;
 let accepted=false,error=null;
 try{accepted=patient.ctx.addMonitorTherapy(order)!==false}catch(e){error=String(e.message||e)}
 // No clinical harm before execution. Monitor search is not a dose.
 const premature=patient.ctx.window.csCare487.heparinHarm().active;
 assert(!premature,'pending heparin cannot generate injury before execution');
 advance(patient,seconds,{dt:1/30});advance(control,seconds,{dt:1/30});
 const delivered=patient.ctx.sim.administrationLog.slice(pre).some(x=>x.id===id);
 const treated=vitals(patient.ctx.sim),untreated=vitals(control.ctx.sim);
 const delta=Object.fromEntries(Object.keys(treated).map(k=>[k,Number((treated[k]-untreated[k]).toFixed(2))]));
 const report=patient.ctx.window.csCare487.assess(id);
 const adverse=patient.ctx.sim.adverseEvents||[];
 const harm=patient.ctx.window.csCare487.heparinHarm();
 const allergy=patient.ctx.window.csCare487.allergy();
 const signature=kind==='heparinBleed'?harm.bleedingSeverity>0&&delta.sys< -2&&delta.hr>1:
  kind==='severeAllergy'?allergy.severity>0&&delta.sys< -2&&delta.spo2< -1:
  kind==='hypovolemicDiuretic'?delta.sys< -2&&delta.hr>=0:
  kind==='shockBetaBlocker'?delta.sys< -2&&delta.hr< -2:
  kind==='excessMorphine'?delta.rr< -1&&delta.spo2< -.5:
  kind==='fluidOverload'?delta.spo2< -1||delta.rr>1:false;
 const v={caseId,kind,drug:id,accepted,delivered,appropriate:report.appropriate,
  contraindicated:report.contraindicated,risk:report.risk||[],
  signature,treated,untreated,delta,adverse:adverse.length,warningEvents:patient.ctx.sim.events?.filter(x=>/riesgo|alérgica|sangrado|hemorragia/i.test(x.t)).length||0,
  harmSeverity:Number(harm.bleedingSeverity||0),allergySeverity:Number(allergy.severity||0),
  error,death:!!patient.ctx.sim.patientDied};
 rows.push(v);
 if(!signature)issues.push({caseId,kind,drug:id,delivered,delta,reason:'no matching measurable harm at this exposure'});
 if(error||!delivered)issues.push({caseId,kind,drug:id,reason:error||'dose not confirmed'});
 return v;
}
// Every seed: accidental IV heparin in active bleeding and severe allergy to
// ceftriaxone. Neither should be blocked, and neither may trigger damage before
// actual administration. These two harmful mechanisms have active QA writers.
for(const c of ids){
 const heparin=run(c,'heparinBleed','heparina IV',{activeBleeding:true},25);
 assert(heparin.delivered&&heparin.signature,c+' actual anticoagulant bleeding must be observed');
 const allergy=run(c,'severeAllergy','ceftriaxona 1 g',
  {drugAllergies:['ceftriaxone'],severeAllergies:['ceftriaxone']},26);
 assert(allergy.delivered&&allergy.signature,c+' actual severe allergy must worsen BP and oxygenation');
}
for(const c of ['PANC-001','HDA-001','PERI-SEC-001','CHOLANG-001','MESI-001']){
 run(c,'hypovolemicDiuretic','furosemida 40 mg',{hypovolemia:true},8);
 run(c,'shockBetaBlocker','propranolol 40 mg',{hypovolemia:true},8);
}
for(const c of ['CIRR-001','PERI-PBE-001','COLON-001']){
 const patient=createLiveNativeJourney487(c),control=createLiveNativeJourney487(c);
 const before=Number(patient.ctx.sim.therapyTotals.fluidMl||0);
 for(let n=0;n<5;n++){
  patient.ctx.addMonitorTherapy('ringer 500 ml');
  advance(patient,2.7,{dt:1/30});
 }
 advance(control,13.5,{dt:1/30});
 const a=vitals(patient.ctx.sim),b=vitals(control.ctx.sim);
 const observed=a.spo2<b.spo2-.8||a.rr>b.rr+1;
 rows.push({caseId:c,kind:'fluidOverload',drug:'fluid',delivered:patient.ctx.sim.therapyTotals.fluidMl>before,
  signature:observed,treated:a,untreated:b,delta:{spo2:a.spo2-b.spo2,rr:a.rr-b.rr},
  actualVolumeMl:patient.ctx.sim.therapyTotals.fluidMl});
 if(!observed)issues.push({caseId:c,kind:'fluidOverload',reason:'no observable overload after large repeated fluid'});
}
assert(rows.length===39,'26 mandatory harm + 10 drug-context checks + 3 volume challenges');
const grouped=Object.fromEntries([...new Set(rows.map(x=>x.kind))].map(kind=>[kind,{
 attempts:rows.filter(x=>x.kind===kind).length,confirmed:rows.filter(x=>x.kind===kind&&x.delivered).length,
 physiologicResponses:rows.filter(x=>x.kind===kind&&x.signature).length}]));
const result={total:rows.length,grouped,unresolved:issues.length,issues,rows,
 note:'Guardrail checks: heparin/bleeding and severe allergy must harm; other drug-context cases are diagnostic findings, not all validated yet.'};
fs.mkdirSync('qa/closure-harm-results',{recursive:true});
fs.writeFileSync('qa/closure-harm-results/iatrogenic-matrix-487.json',JSON.stringify(result,null,2)+'\n');
console.log('ATRIA WRONG-TREATMENT BOT',JSON.stringify({total:rows.length,grouped,unresolved:issues.length,sample:issues.slice(0,8)}));
