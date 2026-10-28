// Pure safety metadata: never administers, triggers random allergy or writes
// patient physiology. Every new formulary item is reviewed globally, even GI.
import {PHARMA_RULES_487,csCasePharmProfile487} from '../../clinical/pharmacology-registry-487.js';
import {GASTRO_REVIEW_ONLY} from './gastro-medication-rules.js';
import {CLINICAL_TREATMENTS} from '../content/clinical-treatment-definitions.js';
const nephro=new Set(['amikacin','gentamicin','amphotericin','vancomycin_iv','acyclovir']);
const groups=Object.freeze({
 penicillin:['ampicillin','piptazo','amoxicillin','amoxiclav'],
 cephalosporin:['ceftriaxone','ceftazidime','cefoperazone','cefepime'],
 carbapenem:['imipenem'],aminoglycoside:['amikacin','gentamicin'],
 macrolide:['azithromycin'],heparin:['anticoagulation','heparin_therapeutic','enoxaparin'],
 corticosteroid:['methylprednisolone','dexamethasone','steroid'],
 benzodiazepine:['lorazepam'],p2y12:['clopidogrel','ticagrelor'],
 betaBlocker:['metoprolol','esmolol','beta_blocker'],
 calciumChannelBlocker:['nicardipine','nimodipine'],
 beta_lactam:['ampicillin','piptazo','amoxicillin','amoxiclav','ceftriaxone','ceftazidime','cefoperazone','cefepime','imipenem']
});
// Combination products expose their actual constituent molecule. This is
// identity matching, not a presumed allergy across an antibiotic family.
const ingredients=Object.freeze({amoxiclav:['amoxicillin','clavulanate'],piptazo:['piperacillin','tazobactam']});
const newClasses={
 amoxicillin:'antibiotic',amoxiclav:'antibiotic',azithromycin:'antibiotic',vancomycin_iv:'antibiotic',
 salbutamol:'bronchodilator',ipratropium:'bronchodilator',magnesium:'electrolyte',
 enoxaparin:'anticoagulant',heparin_therapeutic:'anticoagulant',alteplase_pe:'thrombolytic',alteplase_stroke:'thrombolytic',
 aspirin:'antiplatelet',ticagrelor:'antiplatelet',clopidogrel:'antiplatelet',atorvastatin:'statin',nitroglycerin:'vasodilator',
 adenosine:'antiarrhythmic',amiodarone:'antiarrhythmic',metoprolol:'betaBlocker',esmolol:'betaBlocker',atropine:'antimuscarinic',
 nicardipine:'vasodilator',nimodipine:'vasodilator',anticoagulation_reversal:'reversalAgent',
 lorazepam:'benzodiazepine',levetiracetam:'antiepileptic',dexamethasone:'steroid',acyclovir:'antiviral',ivig:'immunoglobulin',epi_im:'adrenergic'
};
const known=new Set([...Object.keys(PHARMA_RULES_487),...Object.keys(GASTRO_REVIEW_ONLY),...Object.keys(CLINICAL_TREATMENTS),...Object.values(ingredients).flat(),'anticoagulation']);
const classes=new Set([...Object.values(PHARMA_RULES_487).map(x=>x.classId),...Object.values(newClasses),'procedure','conduct']);
const idOf=item=>typeof item==='string'?item:item?.drugId??item?.groupId??item?.classId;
const intolerance=item=>item?.type==='intolerance'||item?.reactionType==='intolerance';
const severe=item=>!intolerance(item)&&(item?.severity==='severe'||item?.type==='severe'||item?.reactionType==='severe');
export function normalizeDocumentedAllergies487(raw=[]){
 if(!Array.isArray(raw)||raw.length>96)throw Error('invalid documented allergy list');
 const out=new Set();
 for(const item of raw){
  const id=idOf(item);
  if(typeof id!=='string'||!id||!known.has(id)&&!Object.hasOwn(groups,id)&&!classes.has(id))
   throw Error('unknown documented drug allergy '+String(id));
  out.add(id);
 }
 return Object.freeze([...out]);
}
/** Typed history exists before it is elicited. Intolerance and unspecified
 * allergy never acquire severe hypersensitivity from a drug hazard label. */
export function patientAllergyFacts487(patient){
 const flags=patient?.clinicalFlags||{};
 const history=[...(patient?.allergyHistory??[]),...(patient?.variation?.allergies??[])];
 const raw=[...(patient?.allergies??[]),...(flags.drugAllergies??[])];
 const intolerances=normalizeDocumentedAllergies487([
  ...(patient?.intolerances??[]),...history.filter(intolerance),...raw.filter(intolerance)]);
 const typedAllergies=[...history,...raw].filter(item=>!intolerance(item));
 const severeAllergies=normalizeDocumentedAllergies487([
  ...(patient?.severeAllergies??[]).filter(item=>!intolerance(item)),
  ...(flags.severeAllergies??[]).filter(item=>!intolerance(item)),...typedAllergies.filter(severe)]);
 const allergies=normalizeDocumentedAllergies487([...typedAllergies,...severeAllergies]);
 const hypersensitivities=normalizeDocumentedAllergies487(typedAllergies.filter(item=>
  typeof item==='object'&&!severe(item)&&['hypersensitivity','allergy'].includes(item.type??item.reactionType)));
 return {allergies,severeAllergies,intolerances,hypersensitivities,
  clinicalFlags:{...flags,drugAllergies:[...allergies],severeAllergies:[...severeAllergies]}};
}
function matches(ids,id){
 const classId=PHARMA_RULES_487[id]?.classId??CLINICAL_TREATMENTS[id]?.classId??newClasses[id];
 return ids.includes(id)||ingredients[id]?.some(ingredient=>ids.includes(ingredient))||!!classId&&ids.includes(classId)||
  Object.entries(groups).some(([name,drugs])=>ids.includes(name)&&drugs.includes(id));
}
export function matchesMedicationAllergy487(p,id,severeOnly=false){
 const facts=patientAllergyFacts487(p);
 return matches(severeOnly?facts.severeAllergies:facts.allergies,id);
}
export function matchesMedicationHypersensitivity487(p,id){
 const facts=patientAllergyFacts487(p);
 return !matches(facts.severeAllergies,id)&&matches(facts.hypersensitivities,id);
}
export function medicationSafety487(c,p,id){
 if(!known.has(id))throw Error('unreviewed medication '+String(id));
 const definition=CLINICAL_TREATMENTS[id];
 const rule=PHARMA_RULES_487[id]||GASTRO_REVIEW_ONLY[id]||
  (definition?{...definition,classId:definition.classId??newClasses[id]??definition.kind}:
   {classId:'anticoagulant',hazards:['bleeding'],indications:['mesentericIschemia']});
 const allergy=matchesMedicationAllergy487(p,id);
 const traits=new Set([...csCasePharmProfile487(c).traits,...(c?.clinicalPolicy?.traits??[])]),warnings=[];
 if(c?.physiology?.avoid?.includes(id))warnings.push('case-avoid');
 if(nephro.has(id)&&(traits.has('renalRisk')||Number(p?.phys?.renalReserve??1)<.55))warnings.push('nephrotoxicity-risk');
 if(rule.hazards.some(h=>['renal','electrolytes','renal_accumulation','crystal_nephropathy','acute_kidney_injury'].includes(h)))warnings.push('renal-dose-review');
 if(rule.hazards.some(h=>['overload','volume_overload'].includes(h))&&(traits.has('congestion')||traits.has('overloadRisk')))warnings.push('fluid-overload-risk');
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
