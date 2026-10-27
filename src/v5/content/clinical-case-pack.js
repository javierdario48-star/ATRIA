// V5 batch intake gate. This module does not register clinical executors or
// mutate runtime content: passing validation is not certification of playability.
import {validateVariation} from './patient-variation.js';
const validId=x=>typeof x==='string'&&/^[A-Z][A-Z0-9-]{2,63}$/.test(x);
const validRef=x=>typeof x==='string'&&x.trim().length>0;
export function validateClinicalCasePack(pack,{existingCaseIds=[],drugIds=[],progressionIds=[],rescueIds=[]}={}){
 const errors=[],accepted=[],seen=new Set(existingCaseIds);
 if(!pack||pack.schemaVersion!==1||!Array.isArray(pack.cases)||pack.cases.length===0)
  return {ok:false,accepted:[],errors:['schemaVersion 1 and nonempty cases required']};
 for(const [i,entry] of pack.cases.entries()){
  const at='cases['+i+']';
  if(!entry||!validId(entry.id)){errors.push(at+': invalid case id');continue;}
  if(seen.has(entry.id)){errors.push(at+': duplicate/existing case '+entry.id);continue;}
  seen.add(entry.id);
  const before=errors.length;
  for(const field of ['clinicalExecutorId','closurePolicyId','studyPolicyId','examPolicyId'])
   if(!validRef(entry[field]))errors.push(at+': missing '+field);
  if(!entry.variation)errors.push(at+': missing variation');
  else{
   for(const issue of validateVariation(entry.variation))errors.push(at+': '+issue);
   for(const allergy of entry.variation.allergies||[])
    if(!drugIds.includes(allergy.drugId))errors.push(at+': unknown drug '+allergy.drugId);
   for(const complication of entry.variation.complications||[]){
    if(!progressionIds.includes(complication.progressionId))errors.push(at+': unknown progression '+complication.progressionId);
    if(!rescueIds.includes(complication.rescueId))errors.push(at+': unknown rescue '+complication.rescueId);
   }
  }
  if(errors.length===before)accepted.push(entry.id);
 }
 // Atomic batch: one invalid case prevents the entire pack from proceeding.
 return {ok:errors.length===0,accepted:errors.length?[]:accepted,errors};
}
