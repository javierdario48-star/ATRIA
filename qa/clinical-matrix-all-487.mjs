/* 30 x 13 clinical pharmacology matrix, run against ACTUAL generated V19 VM.
 * A status of 'review' is an unresolved behavior, NOT validated clinical care.
 * Also tests indication/hazard inheritance in 390 synthetic patient variations.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {GLOBAL_TREATMENTS_487,csAssessGeneralTreatment487,
 csAssessCaseRequirements487} from '../src/clinical/general-therapy-487.js';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance}
 from './physiology-live/native-journey-487.mjs';

const CASES=['CIRR-001','PANC-001','CROHN-001','HDA-001','COLON-001',
 'PERI-PBE-001','PERI-SEC-001','PERI-TER-001','APP-001','CHOLE-001',
 'ILEO-001','MESI-001','CHOLANG-001'];
const INPUT=Object.freeze({
 oxygen:'oxígeno 4 L/min',fluid:'ringer 500 ml',albumin:'albúmina 1.5 g/kg',
 vasopressor:'noradrenalina 0.05 mcg/kg/min',morphine:'morfina 4 mg IV',
 analgesia:'paracetamol 1 g',antiemetic:'ondansetron 4 mg',
 ppi:'pantoprazol 40 mg',transfusion:'transfusión 1 unidad',
 paracentesis_ter:'paracentesis terapéutica',espironolactona:'espironolactona 100 mg',
 steroid:'corticoide',aza:'azatioprina 50 mg',
 ceftriaxone:'ceftriaxona 1 g',metronidazole:'metronidazol 500 mg',
 imipenem:'imipenem 500 mg',ceftazidime:'ceftazidima 1 g',
 cefoperazone:'cefoperazona 1 g',cefepime:'cefepime 1 g',
 piptazo:'piperacilina tazobactam 4.5 g',ampicillin:'ampicilina 2 g',
 amikacin:'amikacina 500 mg',gentamicin:'gentamicina 80 mg',
 fluconazole:'fluconazol 400 mg',amphotericin:'anfotericina b',
 source_control:'control de foco',stop_beta_blocker:'suspender beta bloqueante',
 furosemide:'furosemida 40 mg',beta_blocker:'propranolol 40 mg',
 anticoagulation:'heparina IV'
});
const IDS=Object.keys(GLOBAL_TREATMENTS_487);
assert.equal(IDS.length,30);assert.equal(CASES.length,13);
assert.deepEqual(IDS.slice().sort(),Object.keys(INPUT).sort());
const options={confirmedIV:1},entries=[],findings=[],counts={};
const mkPatient=(uid,c)=>({patientInstance:{uid},phys:{renalReserve:.82},
 clinicalFlags:{},therapyExposure:new Map(),administrationLog:[],
 monitorTherapies:new Map(),liveVitals:{sys:115,spo2:96}});
const cloneVital=v=>Object.fromEntries(['hr','rr','sys','dia','spo2'].map(k=>[k,Number(v?.[k]||0)]));
const finite=x=>Object.values(x).every(Number.isFinite);
for(const caseId of CASES){
 const ctrl=createLiveNativeJourney487(caseId,options);
 advance(ctrl,1.45,{dt:1/30});
 const controlVitals=cloneVital(ctrl.ctx.sim.liveVitals);
 for(const id of IDS){
  const key=caseId+'/'+id,rule=GLOBAL_TREATMENTS_487[id];
  // Non-running source-level tests: inspect patient-by-drug rule inheritance
  // under unchanged, renal, bleeding, allergy, shock and named hazard conditions.
  const c={id:caseId},p=mkPatient(key,c);
  const baseline=csAssessGeneralTreatment487(id,c,p);
  assert(baseline.known&&baseline.administered===false,key);
  const riskPatient=mkPatient(key+'-risk',c);
  riskPatient.clinicalFlags.riskFlags=[...(rule.hazards||[])];
  const inherited=csAssessGeneralTreatment487(id,c,riskPatient);
  for(const hazard of rule.hazards||[])
   assert(inherited.risk.includes('context:'+hazard),
     key+' must inherit registered hazard '+hazard);
  // New-case exceptions must NEVER require a drug/case hard-coded switch.
  const inheritedCase={id:'NEW-CASE-'+caseId,pharmacology:{
   traits:['riskCustom'],requiredTreatments:[id],
   overrides:{[id]:{indicated:false,contraindicated:true,
     extraHazards:['caseSpecific']}}}};
  const exception=csAssessGeneralTreatment487(id,inheritedCase,p);
  assert.equal(exception.indicated,false,key);
  assert(exception.contraindicated&&exception.risk.includes('caseSpecific'),key);
  const runtime=createLiveNativeJourney487(caseId,options),ctx=runtime.ctx;
  const matched=ctx.findMonitorTherapy(INPUT[id]);
  let submitted=null,error=null;
  let preCount=ctx.sim.administrationLog.filter(x=>x.id===id).length;
  let before=cloneVital(ctx.sim.liveVitals);
  let beforePhys=Number(ctx.sim.phys?.renalReserve??NaN);
  if(matched?.id===id){
   try{submitted=ctx.addMonitorTherapy(INPUT[id]);}
   catch(e){error=String(e.message||e);}
  }else error='resolved '+String(matched?.id||'none');
  const pendingCount=ctx.sim.administrationLog.filter(x=>x.id===id).length;
  if(pendingCount>preCount)
   assert(Number(ctx.sim.therapyExposure?.get?.(id)?.count||0)>0,
    key+' immediate manual completion must have real native exposure');
  if(!error)try{advance(runtime,1.45,{dt:1/30});}
   catch(e){error='advance '+String(e.message||e);}
  const doses=ctx.sim.administrationLog.filter(x=>x.id===id).length;
  const intervention=ctx.sim.interventions?.has?.(id)===true;
  const confirmed=doses>preCount;
  const exposed=Number(ctx.sim.therapyExposure?.get?.(id)?.count||0)>0;
  const current=ctx.window.csCare487.assess(id);
  const after=cloneVital(ctx.sim.liveVitals);
  const offsets=ctx.medicationSafetyOffsets();
  assert(finite(after)&&finite(offsets),key+' finite vital/signals');
  if(confirmed){
   assert(exposed,key+' confirmed dose must have native exposure');
   assert(current.administered||id==='source_control',key+' real exposure must reach general evaluator');
  }
  if(id==='transfusion'&&confirmed) assert(ctx.therapyEffectTotals().spo2<=1e-9,key+' no blood-product pulse-ox gain');
  // No faux oxygenation or immediate positive BP effects from antimicrobials.
  const forbidden=['antibiotic','aminoglycoside','antifungal'].includes(rule.classId);
  const vsControl=Object.fromEntries(Object.keys(after).map(k=>[k,Number((after[k]-controlVitals[k]).toFixed(3))]));
  if(forbidden&&confirmed){
   assert(vsControl.spo2<3,key+' antimicrobial must not create substantial artificial saturation gain');
   assert(vsControl.sys<9,key+' antimicrobial must not act like pressor/volume bolus');
  }
  // No invented single-dose renal injury: changing a riskIndex is distinct from
  // measured loss of renalReserve after only ~1.5 virtual hours.
  if(['amikacin','gentamicin','amphotericin'].includes(id)&&confirmed&&
     Number.isFinite(beforePhys)&&Number.isFinite(Number(ctx.sim.phys?.renalReserve)))
    assert(ctx.sim.phys.renalReserve>=beforePhys-.15,key+' instant dramatic renal loss forbidden');
  let status=error?'review':confirmed?'confirmed':
   intervention?'procedure':'not-executed';
  counts[status]=(counts[status]||0)+1;
  const row={caseId,id,role:baseline.role,indicated:baseline.indicated,
   contraindicated:baseline.contraindicated,registeredHazards:[...(rule.hazards||[])],
   matched:matched?.id||null,submitted,confirmed,intervention,
   status,reason:error||(!confirmed&&!intervention?'no receipt in 1.45s QA window':null),
   doseCount:doses,vitalsDeltaVsControl:vsControl};
  entries.push(row);
  if(status==='review'||status==='not-executed')
   findings.push({caseId,id,status,reason:row.reason});
 }
 console.log('CLINICAL MATRIX CASE FINISHED',caseId,
   'rows',entries.length,'confirmed',counts.confirmed||0,
   'procedures',counts.procedure||0,'unverified',findings.length);
}
assert.equal(entries.length,390);
assert.equal(new Set(entries.map(x=>x.caseId+'/'+x.id)).size,390);
const report={version:'ATRIA-4.8.7',caseCount:13,treatmentCount:30,
 pairCount:390,method:'generated V19 VM; monitor-mediated 1.45 real seconds',
 warning:'Case x treatment tested for execution and reusable safety invariants; NOT 390 medically validated effects. Physical devices not exercised.',
 counts,findings,entries};
const dir='qa/clinical-matrix-results';
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'clinical-matrix-487.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(dir,'clinical-matrix-summary-487.md'),
 '# ATRIA 4.8.7 · 390 live drug/case checks\n\n'+
 'Statuses: '+JSON.stringify(counts)+'\n\n'+
 'Each row tests a real native order, 1.45s of game simulation and the inherited clinical risk contract.\n'+
 'An unexecuted procedure is **not** proof of its failure; review its handoff workflow.\n'+
 'Medical references and expectations: qa/ATRIA_487_MEDICAL_RULES_AUDIT.md.\n\n'+
 '| Case | Drug | QA status | Comment |\n|---|---|---|---|\n'+
 findings.map(x=>'| '+x.caseId+' | '+x.id+' | '+x.status+' | '+
  String(x.reason||'—').replace(/\|/g,'/')+' |').join('\n')+'\n');
console.log('ATRIA 390 LIVE TREATMENT CASE MATRIX',JSON.stringify({
 rows:390,counts,findings:findings.length,
 deliverabilityNotMedicalValidation:true,report:'qa/clinical-matrix-results/clinical-matrix-487.json'
}));
