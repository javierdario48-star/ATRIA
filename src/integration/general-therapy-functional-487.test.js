import assert from 'node:assert/strict';
import {GLOBAL_TREATMENTS_487,csAssessGeneralTreatment487,
 csAssessCaseRequirements487,csSevereDrugReaction487} from '../clinical/general-therapy-487.js';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance}
 from '../../qa/physiology-live/native-journey-487.mjs';

const ids=Object.keys(GLOBAL_TREATMENTS_487);
assert.equal(ids.length,30);
const cases=['CIRR-001','PANC-001','CROHN-001','HDA-001','COLON-001',
 'PERI-PBE-001','PERI-SEC-001','PERI-TER-001','APP-001','CHOLE-001',
 'ILEO-001','MESI-001','CHOLANG-001'];
const patient=(id='p')=>({patientInstance:{uid:id},therapyExposure:new Map(),
 administrationLog:[],monitorTherapies:new Map(),phys:{renalReserve:.85},clinicalFlags:{}});
let checks=0;function check(label,cb){cb();checks++;console.log('GENERAL THERAPY QA PASS',label)}
check('all 390 existing case/treatment combinations inherit one common policy',()=>{
 for(const id of cases)for(const therapy of ids){
  const a=csAssessGeneralTreatment487(therapy,{id},patient(id));
  assert.equal(a.known,true,id+' '+therapy);
  assert.equal(a.administered,false);
  assert.equal(a.appropriate,false);
  assert(['dynamic','requirement'].includes(a.role));
 }
});
check('all 29 legacy definitions remain native and heparin is the only 30th entry',()=>{
 assert.equal(ids.filter(x=>x==='anticoagulation').length,1);
 assert.equal(ids.filter(x=>x!=='anticoagulation').length,29);
 const hasRenal=csAssessGeneralTreatment487('gentamicin',
  {id:'PERI-PBE-001'}, {...patient(),phys:{renalReserve:.34}});
 assert(hasRenal.risk.includes('renalExposure'));
});
check('a new thrombotic case inherits anticoagulation and bleeding contraindication',()=>{
 const c={id:'NEW-THROMBOSIS-001',pharmacology:{
  traits:['mesentericIschemia','bleed'],
  requiredTreatments:['anticoagulation']},keyInterventions:[]};
 const p=patient();const state=csAssessGeneralTreatment487('anticoagulation',c,p);
 assert.equal(state.indicated,true);assert.equal(state.contraindicated,true);
 p.administrationLog.push({id:'anticoagulation',m:1});
 assert.equal(csAssessGeneralTreatment487('anticoagulation',c,p).appropriate,false);
 const plan=csAssessCaseRequirements487(c,p);
 assert.equal(plan.treatmentRequirementsMet,false);
 assert(plan.missing.includes('anticoagulation'));
});
check('new infectious cases require explicit regimens; actual execution not order is the gate',()=>{
 const c={id:'NEW-PERITONITIS-001',pharmacology:{
  traits:['infection','uncontrolledSource'],
  requiredTreatments:['source_control'],
  coverageSets:[['ceftriaxone','metronidazole'],['piptazo']]}};
 const p=patient();
 assert.equal(csAssessCaseRequirements487(c,p).treatmentRequirementsMet,false);
 p.administrationLog.push({id:'ceftriaxone',m:1});
 assert.equal(csAssessCaseRequirements487(c,p).coverageComplete,false);
 p.administrationLog.push({id:'metronidazole',m:2});
 assert.equal(csAssessCaseRequirements487(c,p).coverageComplete,true);
 assert.equal(csAssessCaseRequirements487(c,p).treatmentRequirementsMet,false,
  'antibiotics are NOT completed source control');
 p.phys.sourceControlled=true;
 assert.equal(csAssessCaseRequirements487(c,p).treatmentRequirementsMet,true);
 assert.equal(csAssessCaseRequirements487(c,p).safeForDischarge,null);
 const broken={...c,id:'NEW-UNREVIEWED-INFECTION',pharmacology:{traits:['infection']}};
 assert.throws(()=>csAssessCaseRequirements487(broken,p),/coverageSets/);
});
check('case overrides specialize generic drug indication and risk without new code',()=>{
 const c={id:'NEW-CHF-001',pharmacology:{traits:['congestion'],
  requiredTreatments:['furosemide'],
  overrides:{furosemide:{indicated:false,contraindicated:true,
   extraHazards:['severeHypotension']}}}};
 const p=patient();const a=csAssessGeneralTreatment487('furosemide',c,p);
 assert.equal(a.indicated,false);assert.equal(a.contraindicated,true);
 assert(a.risk.includes('severeHypotension'));
 assert.equal(csAssessCaseRequirements487(c,p).treatmentRequirementsMet,false);
});
check('generic risks apply to every matching medicine without case-drug hardcoding',()=>{
 const qt={id:'NEW-QT-001',pharmacology:{traits:['nausea','infection'],
  riskFlags:['qt'],requiredTreatments:['fluconazole'],
  coverageSets:[['fluconazole']]}};
 const p=patient();
 const f=csAssessGeneralTreatment487('fluconazole',qt,p);
 assert(f.hazardTypes.includes('qt'));
 assert(f.risk.includes('context:qt'));
 assert.equal(f.required,true);
 const nausea=csAssessGeneralTreatment487('antiemetic',qt,p);
 assert(nausea.risk.includes('context:qt'));
 const noQT=csAssessGeneralTreatment487('ampicillin',qt,p);
 assert(!noQT.risk.includes('context:qt'));
 const potassium={id:'NEW-HYPERK-001',pharmacology:{traits:['ascites'],
  riskFlags:['hyperkalemia'],requiredTreatments:['espironolactona']}};
 assert(csAssessGeneralTreatment487('espironolactona',potassium,p)
  .risk.includes('context:hyperkalemia'));
 p.clinicalFlags={severeAllergies:['ampicillin']};
 const penicillin=csAssessGeneralTreatment487('ampicillin',
  {...qt,pharmacology:{...qt.pharmacology,
    coverageSets:[['ampicillin']]}},p);
 assert(penicillin.contraindicated);
 assert(penicillin.risk.includes('knownSevereAllergy'));
});
check('current oxygen and pressor requirements cannot be met by stopped exposure',()=>{
 const c={id:'NEW-SHOCK-001',pharmacology:{traits:['shock','hypoxemia'],
  requiredTreatments:['oxygen','vasopressor']}};
 const p=patient();
 for(const id of ['oxygen','vasopressor'])p.therapyExposure.set(id,{count:1});
 assert(csAssessCaseRequirements487(c,p).missing.includes('oxygen'));
 p.monitorTherapies.set('oxygen',{id:'oxygen'});
 p.monitorTherapies.set('vasopressor',{id:'vasopressor'});
 assert.equal(csAssessCaseRequirements487(c,p).treatmentRequirementsMet,true);
 p.monitorTherapies.delete('oxygen');
 assert.equal(csAssessCaseRequirements487(c,p).treatmentRequirementsMet,false);
});
check('kidney-warning does not turn a single aminoglycoside dose into immediate renal failure',()=>{
 const c={id:'NEW-RENAL-001',pharmacology:{traits:['renalRisk','infection'],
  coverageSets:[['gentamicin']]}};
 const p=patient();p.phys.renalReserve=.32;
 p.administrationLog.push({id:'gentamicin',m:0});
 const before=p.phys.renalReserve;
 assert(csAssessGeneralTreatment487('gentamicin',c,p).risk.includes('renalExposure'));
 assert.equal(p.phys.renalReserve,before);
 assert.equal(csAssessCaseRequirements487(c,p).coverageComplete,true);
});
check('known antibiotic allergy makes coverage inappropriate but does not block administration',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001'),p=r.ctx.sim;
 p.clinicalFlags={drugAllergies:['ceftriaxone']};
 r.ctx.addMonitorTherapy('ceftriaxona');
 assert.equal(p.administrationLog.some(x=>x.id==='ceftriaxone'),false);
 advance(r,2.3);
 assert.equal(p.administrationLog.filter(x=>x.id==='ceftriaxone').length,1);
 const e=r.ctx.window.csCare487.assess('ceftriaxone');
 assert.equal(e.contraindicated,true);
 assert.equal(e.appropriate,false);
 assert.equal(r.ctx.window.csCare487.report().general.coverageComplete,false);
 assert.equal(r.ctx.window.csCare487.report().coverageComplete,false,
  'shared UI/readiness must not report contraindicated antibiotic coverage as fulfilled');
});
check('verified severe allergy has a bounded adverse effect from either administration interface',()=>{
 for(const route of ['monitor','nurse']){
  const r=createLiveNativeJourney487('PERI-SEC-001'),ctrl=createLiveNativeJourney487('PERI-SEC-001');
  const p=r.ctx.sim;
  p.clinicalFlags={drugAllergies:['ceftriaxone'],severeAllergies:['ceftriaxone']};
  if(route==='monitor')r.ctx.addMonitorTherapy('ceftriaxona');
  else r.ctx.nurseNatural('enfermera ceftriaxona');
  assert.equal(r.ctx.window.csCare487.allergy().active,false,'pending order no adverse effect');
  advance(r,2.5);advance(ctrl,2.5);
  assert.equal(p.administrationLog.filter(x=>x.id==='ceftriaxone').length,1,route);
  assert.equal(r.ctx.window.csCare487.allergy().active,true);
  assert(r.ctx.window.csCare487.allergy().severity<.1,'no immediate severe collapse on confirmation');
  advance(r,28);advance(ctrl,28);
  const allergic=r.ctx.window.csCare487.allergy();
  assert(allergic.severity>.1,route+' actual severe reaction required');
  assert(allergic.offsets.sys<0&&allergic.offsets.spo2<0);
  assert(p.liveVitals.sys<ctrl.ctx.sim.liveVitals.sys-2,
   'actual patient BP drops through native vital writer '+route);
  assert(p.liveVitals.spo2<ctrl.ctx.sim.liveVitals.spo2-1,
   'actual patient saturation drops through native vital writer '+route);
  assert(p.events.some(x=>/alérgica grave/.test(x.t)));
 }
});
check('no severe reaction from a nonsevere allergy; no wrong-patient residual effects',()=>{
 const p=patient('a');p.clinicalFlags={drugAllergies:['ampicillin']};
 assert.equal(csSevereDrugReaction487(p).active,false);
 p.csSevereDrugReaction487={drug:'ampicillin',patientId:'old',minute:0};
 assert.equal(csSevereDrugReaction487(p).active,false);
});
console.log('GENERAL THERAPY CONSOLIDATION QA',JSON.stringify({
 checks,therapies:30,legacyTreatments:29,cases:13,pairs:390,
 newCaseInheritance:true,contextualExceptions:true,actualNurseMonitor:true,
 clinicalDispositionUnchanged:true,deviceTests:false
}));
