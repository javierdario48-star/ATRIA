// A pack is staged only after every clinical dependency resolves. Staging is
// deliberately separate from publishing into the active case catalogue.
import {validateClinicalCasePack} from './clinical-case-pack.js';
import {compileClinicalCasePack} from './compile-clinical-case-pack.js';
export function stageClinicalCasePack(pack,registries,{strict=false}={}){
 if(strict){
  const compiled=compileClinicalCasePack(pack,registries);
  return compiled.ok?Object.freeze({...compiled,status:'staged'}):compiled;
 }
 const required=['executorIds','closurePolicyIds','studyPolicyIds','examPolicyIds',
  'drugIds','progressionIds','rescueIds','existingCaseIds'];
 for(const key of required)if(!Array.isArray(registries?.[key])||(['executorIds','closurePolicyIds','studyPolicyIds','examPolicyIds'].includes(key)&&!registries[key].length))
  throw Error('missing clinical registry '+key);
 const validation=validateClinicalCasePack(pack,registries);
 if(!validation.ok)return {status:'rejected',errors:validation.errors,cases:[]};
 // Copy prevents caller mutation of the staged snapshot.
 return {status:'staged',errors:[],cases:structuredClone(pack.cases)};
}
