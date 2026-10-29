// Pure identity/history bridge. Never restores, advances or edits physiology.
import {generatePatientVariation,DEFAULT_PATIENT_VARIATION} from './patient-variation.js';

const identityFields=['name','age','personality','behavior','opening','variation','backgroundHistory','allergyHistory','allergies','severeAllergies','intolerances'];
function assertIdentity(patient,caseData){
 if(!patient?.uid||!patient?.caseId||patient.caseId!==caseData?.id)throw Error('patient identity/case mismatch');
}
function guardContext(patient,options){
 if(options.patientIndex!==undefined)return {patientIndex:options.patientIndex,guardSeed:options.guardSeed??patient.uid};
 // The shift owner allocates :patient, :patient-2, :patient-3, ... persistently.
 // Derive the ordinal even when sessions enter out of order.
 const match=/^(.+):patient(?:-([1-9]\d*))?$/.exec(patient.uid);
 if(!match)return {};
 return {guardSeed:options.guardSeed??match[1],patientIndex:match[2]?Number(match[2])-1:0};
}
const drugId=a=>typeof a==='string'?a:a?.drugId??a?.groupId;
const isIntolerance=a=>(a?.type??a?.reactionType)==='intolerance';
const isSevere=a=>a?.severity==='severe'||a?.type==='severe'||a?.reactionType==='severe';

export function materializeGuardPatient(patient,caseData,checkpoint=null,options={}){
 const saved=checkpoint?.patient;
 if(saved?.variation){
  assertIdentity(patient,caseData);
  if(saved.uid!==patient.uid||saved.caseId!==patient.caseId)throw Error('checkpoint patient identity/case mismatch');
  return {...patient,...Object.fromEntries(identityFields.filter(k=>saved[k]!==undefined).map(k=>[k,structuredClone(saved[k])]))};
 }
 // Preserve legacy checkpoints instead of re-rolling an existing patient.
 if(checkpoint)return patient;
 if(patient.variation?.seed!==undefined&&patient.name&&Number.isInteger(patient.age)&&
  patient.personality&&patient.opening&&Array.isArray(patient.allergyHistory)){
  assertIdentity(patient,caseData);return patient;
 }
 const profile=caseData?.variation===true?DEFAULT_PATIENT_VARIATION:caseData?.variation;
 if(!profile)return patient;
 assertIdentity(patient,caseData);
 const v=generatePatientVariation(profile,patient.variation?.seed??patient.uid+':'+caseData.id,guardContext(patient,options));
 const existing=[...(patient.allergies||[]),...(patient.clinicalFlags?.drugAllergies||[])];
 const allergies=new Set();
 const severe=new Set([...(patient.severeAllergies||[]),...(patient.clinicalFlags?.severeAllergies||[])]);
 const intolerances=new Set(patient.intolerances||[]);
 const history=[...(patient.allergyHistory||existing.filter(a=>typeof a==='object'))];
 for(const a of [...existing,...v.allergies]){
  (isIntolerance(a)?intolerances:allergies).add(drugId(a));
  if(!isIntolerance(a)&&isSevere(a))severe.add(drugId(a));
  if(a&&typeof a==='object'&&!history.some(h=>h?.id===a.id&&h?.drugId===a.drugId))history.push(a);
 }
 const name=patient.name&&patient.name!==caseData.demo?patient.name:v.name;
 return {...patient,name,age:patient.age??v.age,
  personality:patient.personality||v.personality,behavior:patient.behavior||v.behavior,opening:patient.opening||v.opening,
  allergies:[...allergies],
  ...(severe.size?{severeAllergies:[...severe]}:{}),
  ...(intolerances.size?{intolerances:[...intolerances]}:{}),
  allergyHistory:history,
  ...(v.backgroundHistory?{backgroundHistory:v.backgroundHistory}:{}),
  // The identity and seed are checkpoint data, never a clinical event.
  variation:{...patient.variation,seed:v.seed,
   ...(v.nameBankId?{nameBankId:v.nameBankId}:{}),
   ...(v.nameIndex!==undefined?{nameIndex:v.nameIndex,guardSeed:v.guardSeed,patientIndex:v.patientIndex}:{}),
   complicationCandidates:v.complicationCandidates}};
}
