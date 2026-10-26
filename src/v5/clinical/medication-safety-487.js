// Reuses only registered V4 pharmacology IDs, classes and documented case risks.
// Pure safety metadata: NEVER administers a drug or writes patient physiology.
import {PHARMA_RULES_487,csCasePharmProfile487} from '../../clinical/pharmacology-registry-487.js';
import {GASTRO_REVIEW_ONLY} from './gastro-medication-rules.js';
const nephro=new Set(['amikacin','gentamicin','amphotericin']);
const groups=Object.freeze({
 penicillin:['ampicillin','piptazo'],cephalosporin:['ceftriaxone','ceftazidime','cefoperazone','cefepime'],
 carbapenem:['imipenem'],aminoglycoside:['amikacin','gentamicin']
});
const known=new Set([...Object.keys(PHARMA_RULES_487),...Object.keys(GASTRO_REVIEW_ONLY),'anticoagulation']);
const classes=new Set(Object.values(PHARMA_RULES_487).map(x=>x.classId));
export function normalizeDocumentedAllergies487(raw=[]){
 if(!Array.isArray(raw)||raw.length>32)throw Error('invalid documented allergy list');
 const out=new Set();
 for(const item of raw){
  const id=typeof item==='string'?item:item?.drugId??item?.groupId;
  if(typeof id!=='string'||!id||!known.has(id)&&!Object.hasOwn(groups,id)&&!classes.has(id))
   throw Error('unknown documented drug allergy '+String(id));
  out.add(id);
 }
 return Object.freeze([...out]);
}
/** Facts exist independently of whether the doctor has elicited them.
 * An unspecified allergy never implies severe hypersensitivity.
 */
export function patientAllergyFacts487(patient){
 const flags=patient?.clinicalFlags||{},raw=patient?.allergies??[];
 const severe=normalizeDocumentedAllergies487([
  ...(patient?.severeAllergies??[]),...(flags.severeAllergies??[]),
  ...raw.filter(x=>x?.severity==='severe')]);
 const allergies=normalizeDocumentedAllergies487([
  ...raw,...(flags.drugAllergies??[]),...severe]);
 return {allergies,severeAllergies:severe,
  clinicalFlags:{...flags,drugAllergies:[...allergies],severeAllergies:[...severe]}};
}
export function matchesMedicationAllergy487(p,id,severe=false){
 const raw=severe?p?.severeAllergies??p?.clinicalFlags?.severeAllergies??[]:
  [...(p?.allergies??[]),...(p?.clinicalFlags?.drugAllergies??[])];
 const allergies=normalizeDocumentedAllergies487(raw);
 return allergies.includes(id)||allergies.includes(PHARMA_RULES_487[id]?.classId)||
  Object.entries(groups).some(([name,drugs])=>allergies.includes(name)&&drugs.includes(id));
}
export function medicationSafety487(c,p,id){
 if(!known.has(id))throw Error('unreviewed medication '+String(id));
 const rule=PHARMA_RULES_487[id]||GASTRO_REVIEW_ONLY[id]||{classId:'anticoagulant',hazards:['bleeding'],indications:['mesentericIschemia']};
 const allergy=matchesMedicationAllergy487(p,id);
 const traits=new Set(csCasePharmProfile487(c).traits),warnings=[];
 if(c?.physiology?.avoid?.includes(id))warnings.push('case-avoid');
 if(nephro.has(id)&&(traits.has('renalRisk')||Number(p?.phys?.renalReserve??1)<.55))warnings.push('nephrotoxicity-risk');
 if(rule.hazards.includes('renal')||rule.hazards.includes('electrolytes'))warnings.push('renal-dose-review');
 if(rule.hazards.includes('overload')&&(traits.has('congestion')||traits.has('overloadRisk')))warnings.push('fluid-overload-risk');
 if(['antibiotic','aminoglycoside','antifungal'].includes(rule.classId)){
  if(!traits.has('infection')&&
   !(c?.id==='VARIX-001'&&id==='ceftriaxone')&&
   !(c?.id==='CDI-001'&&['fidaxomicin','vancomycin_po'].includes(id)))
   warnings.push('no-established-infection');
  const sets=c?.pharmacology?.coverageSets||c?.physiology?.coverageSets||[];
  if(sets.length&&!sets.some(set=>set.includes(id)))warnings.push('not-in-case-coverage-regimen');
 }
 return Object.freeze({drugId:id,blocked:false,contraindicated:allergy,
  reason:allergy?'documented-drug-allergy':null,
  cautions:Object.freeze([...new Set(warnings)]),
  classifiedAsNephrotoxic:nephro.has(id),classId:rule.classId});
}
