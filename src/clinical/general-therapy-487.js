import {PHARMA_RULES_487,BASE_CASE_PHARMACOLOGY_487} from './pharmacology-registry-487.js';
import {DYNAMIC_THERAPIES_487,CARE_COVERAGE_FALLBACK_487} from './urgent-care-487.js';

/* Single inherited rule catalog for current and future ED cases.
 Case data: pharmacology.traits, requiredTreatments, coverageSets,
 contraindications and overrides[id]. No new physiology writer. */
export const GLOBAL_TREATMENTS_487=Object.freeze({
 ...PHARMA_RULES_487,
 anticoagulation:{classId:'anticoagulant',route:'iv',
  mechanism:'none',indications:['mesentericIschemia'],hazards:['bleeding','hit']}
});
export const CASE_TRAITS_487=BASE_CASE_PHARMACOLOGY_487;
export function csAssessGeneralTreatment487(id,c,patient){
 const rule=GLOBAL_TREATMENTS_487[id];
 if(!rule)return {id,known:false};
 const cfg=c?.pharmacology||{},f=patient?.clinicalFlags||{},p=patient?.phys||{};
 const traits=new Set(cfg.traits||CASE_TRAITS_487[c?.id]||[]);
 const req=[...(cfg.requiredTreatments||[]),...(c?.keyInterventions||[])];
 const sets=cfg.coverageSets||c?.physiology?.coverageSets||CARE_COVERAGE_FALLBACK_487[c?.id]||[];
 const inCoverage=sets.some(s=>Array.isArray(s)&&s.includes(id));
 const override=cfg.overrides?.[id]||{};
 let indicated=req.includes(id)||inCoverage||rule.indications.some(k=>traits.has(k));
 if(id==='anticoagulation')indicated=indicated||cfg.anticoagulationIndicated===true;
 if(id==='fluid')indicated=indicated||['hypovolemia','shock','bleed'].some(k=>traits.has(k));
 if(id==='vasopressor')indicated=indicated||traits.has('vasoplegia');
 if(id==='transfusion')indicated=indicated||traits.has('bleed')||traits.has('anemia');
 if(id==='source_control')indicated=indicated||traits.has('uncontrolledSource');
 if(['antibiotic','aminoglycoside','antifungal'].includes(rule.classId))
   indicated=req.includes(id)||inCoverage;
 if(typeof override.indicated==='boolean')indicated=override.indicated;
 const allergy=(f.drugAllergies||[]).includes(id)||(f.drugAllergies||[]).includes(rule.classId);
 const severeAllergy=(f.severeAllergies||[]).includes(id)||
   (f.severeAllergies||[]).includes(rule.classId);
 const bleeding=traits.has('bleed')||c?.risk==='bleed'||f.activeBleeding===true||
   f.majorBleeding===true||p.activeBleeding===true;
 const hypovolemia=traits.has('hypovolemia')||Number(p.effectiveVolume??1)<.5;
 const shock=traits.has('shock')||Number(patient?.liveVitals?.sys??120)<85;
 const renal=traits.has('renalRisk')||f.renalImpairment===true||Number(p.renalReserve??1)<.55;
 const risk=[];
 if(allergy)risk.push('knownAllergy');
 if(severeAllergy)risk.push('knownSevereAllergy');
 // Every registered hazard is automatically inherited by future cases.
 // Risk flags are data, not drug-specific code: e.g. riskFlags:['qt'].
 const declaredRisk=[...(cfg.riskFlags||[]),...(f.riskFlags||[])];
 const aliases={qt:['prolongedQT','qtProlongation'],
   hyperkalemia:['hyperkalemia'],hypotension:['hypotension'],
   respiratoryDepression:['respiratoryFailure'],ileus:['ileus'],
   hepatic:['hepaticImpairment'],neurotoxicity:['seizureDisorder'],
   hyperglycemia:['hyperglycemia'],coagulopathy:['coagulopathy'],
   bradycardia:['bradycardia'],electrolytes:['electrolyteDisorder'],
   ototoxicity:['hearingImpairment'],overload:['fluidOverload','pulmonaryEdema'],
   arrhythmia:['arrhythmia'],ischemia:['peripheralIschemia'],
   hypercapnia:['hypercapnia']};
 for(const hazard of rule.hazards||[]){
   if(declaredRisk.includes(hazard)||f[hazard]===true||
     (aliases[hazard]||[]).some(k=>f[k]===true))
     risk.push('context:'+hazard);
 }
 if(bleeding&&id==='anticoagulation')risk.push('activeBleeding');
 if(f.knownHIT&&id==='anticoagulation')risk.push('knownHIT');
 if(hypovolemia&&['furosemide','beta_blocker'].includes(id))risk.push('hypoperfusion');
 if(shock&&id==='beta_blocker')risk.push('shock');
 if(renal&&(rule.hazards||[]).includes('renal'))
   risk.push('renalExposure');
 if(traits.has('congestion')&&['fluid','albumin','transfusion'].includes(id))
   risk.push('volumeOverload');
 if((cfg.contraindications||[]).includes(id)||override.contraindicated===true)
   risk.push('explicitContraindication');
 for(const x of override.extraHazards||[])if(typeof x==='string'&&x.trim())risk.push(x);
 const administered=Number(patient?.therapyExposure?.get?.(id)?.count||0)>0||
   (patient?.administrationLog||[]).some(x=>x?.id===id&&x.action!=='stop'&&x.status!=='pending');
 const exposed=['oxygen','vasopressor'].includes(id)?
   administered&&patient?.monitorTherapies?.has?.(id)===true:
   id==='source_control'?patient?.phys?.sourceControlled===true||
     administered&&patient?.interventions?.has?.(id)===true:administered;
 const contraindicated=risk.some(x=>['knownAllergy','knownSevereAllergy','activeBleeding','knownHIT',
   'hypoperfusion','shock','explicitContraindication'].includes(x));
 return {id,known:true,role:DYNAMIC_THERAPIES_487.includes(id)?'dynamic':'requirement',
  indicated,required:req.includes(id),contraindicated,risk:[...new Set(risk)],
  hazardTypes:[...(rule.hazards||[])],
  administered:exposed,appropriate:exposed&&indicated&&!contraindicated,
  overridesUsed:Object.keys(override).length>0,caseId:c?.id||null};
}

/** Therapeutic readiness only. Never authorizes discharge/surgery by itself. */
export function csAssessCaseRequirements487(c,patient){
 const cfg=c?.pharmacology||{};
 const traits=cfg.traits||CASE_TRAITS_487[c?.id];
 if(!Array.isArray(traits)||!traits.length)
   throw Error('New case requires pharmacology.traits: '+String(c?.id));
 const sets=cfg.coverageSets||c?.physiology?.coverageSets||CARE_COVERAGE_FALLBACK_487[c?.id]||[];
 if(traits.includes('infection')&&!sets.length&&!CASE_TRAITS_487[c?.id])
   throw Error('Infectious new case requires explicit coverageSets: '+c.id);
 const declared=[...new Set([...(c?.keyInterventions||[]),...(cfg.requiredTreatments||[])])];
 for(const id of cfg.requiredTreatments||[])if(!GLOBAL_TREATMENTS_487[id])
   throw Error('Unknown required treatment: '+id);
 const required=declared.filter(id=>GLOBAL_TREATMENTS_487[id]);
 const assessments=required.map(id=>csAssessGeneralTreatment487(id,c,patient));
 const coverage=sets.map(set=>({ids:[...set],met:set.every(id=>
   csAssessGeneralTreatment487(id,c,patient).appropriate)}));
 const missing=assessments.filter(a=>!a.appropriate).map(a=>a.id);
 const coverageComplete=coverage.length?coverage.some(s=>s.met):null;
 return {caseId:c?.id,required,missing,coverageSets:coverage,coverageComplete,
   treatmentRequirementsMet:missing.length===0&&coverageComplete!==false,
   // Clinical disposition needs separate diagnosis, stability, tests and source control.
   safeForDischarge:null,assessments};
}

/** A severe hypersensitivity flag is a case exception, not a universal drug risk.
 * Called by the existing native toxicity writer after verified administration.
 * Game coefficients are illustrative, not clinical predictions. */
export function csSevereDrugReaction487(patient){
 const x=patient?.csSevereDrugReaction487,uid=patient?.patientInstance?.uid;
 const zero={active:false,drug:null,severity:0,
  offsets:{temp:0,hr:0,rr:0,sys:0,dia:0,spo2:0}};
 if(!x||x.patientId!==uid)return zero;
 const delta=Math.max(0,Number(patient?.gameMinute||0)-Number(x.minute||0));
 const up=Math.min(1,Math.max(0,(delta-.15)/2.5));
 const down=Math.min(1,Math.max(0,(18-delta)/8));
 const severity=up*down;
 return {active:true,drug:x.drug,severity,
  offsets:{temp:0,hr:22*severity,rr:7*severity,
   sys:-30*severity,dia:-16*severity,spo2:-9*severity}};
}
