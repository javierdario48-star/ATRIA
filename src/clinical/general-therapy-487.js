import {PHARMA_RULES_487,BASE_CASE_PHARMACOLOGY_487} from './pharmacology-registry-487.js';
import {DYNAMIC_THERAPIES_487} from './urgent-care-487.js';

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
 const sets=cfg.coverageSets||c?.physiology?.coverageSets||[];
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
 const bleeding=traits.has('bleed')||c?.risk==='bleed'||f.activeBleeding===true||
   f.majorBleeding===true||p.activeBleeding===true;
 const hypovolemia=traits.has('hypovolemia')||Number(p.effectiveVolume??1)<.5;
 const shock=traits.has('shock')||Number(patient?.liveVitals?.sys??120)<85;
 const renal=traits.has('renalRisk')||f.renalImpairment===true||Number(p.renalReserve??1)<.55;
 const risk=[];
 if(allergy)risk.push('knownAllergy');
 if(bleeding&&id==='anticoagulation')risk.push('activeBleeding');
 if(f.knownHIT&&id==='anticoagulation')risk.push('knownHIT');
 if(hypovolemia&&['furosemide','beta_blocker'].includes(id))risk.push('hypoperfusion');
 if(shock&&id==='beta_blocker')risk.push('shock');
 if(renal&&['amikacin','gentamicin','amphotericin','cefepime','imipenem','piptazo'].includes(id))
   risk.push('renalExposure');
 if(traits.has('congestion')&&['fluid','albumin','transfusion'].includes(id))
   risk.push('volumeOverload');
 if((cfg.contraindications||[]).includes(id)||override.contraindicated===true)
   risk.push('explicitContraindication');
 for(const x of override.extraHazards||[])if(typeof x==='string'&&x.trim())risk.push(x);
 const exposed=Number(patient?.therapyExposure?.get?.(id)?.count||0)>0||
   (patient?.administrationLog||[]).some(x=>x.id===id&&x.action!=='stop');
 const contraindicated=risk.some(x=>['knownAllergy','activeBleeding','knownHIT',
   'hypoperfusion','shock','explicitContraindication'].includes(x));
 return {id,known:true,role:DYNAMIC_THERAPIES_487.includes(id)?'dynamic':'requirement',
  indicated,required:req.includes(id),contraindicated,risk:[...new Set(risk)],
  administered:exposed,appropriate:exposed&&indicated&&!contraindicated,
  overridesUsed:Object.keys(override).length>0,caseId:c?.id||null};
}

/** Therapeutic readiness only. Never authorizes discharge/surgery by itself. */
export function csAssessCaseRequirements487(c,patient){
 const cfg=c?.pharmacology||{};
 const traits=cfg.traits||CASE_TRAITS_487[c?.id];
 if(!Array.isArray(traits)||!traits.length)
   throw Error('New case requires pharmacology.traits: '+String(c?.id));
 const sets=cfg.coverageSets||c?.physiology?.coverageSets||[];
 if(traits.includes('infection')&&!sets.length&&!CASE_TRAITS_487[c?.id])
   throw Error('Infectious new case requires explicit coverageSets: '+c.id);
 const required=[...new Set([...(c?.keyInterventions||[]),...(cfg.requiredTreatments||[])])]
   .filter(id=>GLOBAL_TREATMENTS_487[id]);
 for(const id of required)if(!GLOBAL_TREATMENTS_487[id])
   throw Error('Unregistered treatment: '+id);
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
