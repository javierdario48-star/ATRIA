// Shared, read-only clinical disposition safety. The native physiology and
// administration engines remain sole owners of complications and treatment.
// This policy is applied to every declarative case: no case-ID switches.
import {outstandingClinicalRescue} from './clinical-rescue-logic.js';
const handledDestinations=new Set(['alta','observacion','sala','uti','procedimiento','quirofano']);
const alive=x=>['active','recovering','incipient'].includes(x);
export function complicationDispositionRequirements({patient,caseData,destination,fulfilled,continuation}){
 if(!handledDestinations.has(destination)||!caseData?.clinicalPolicy)return [];
 const definitions=new Map((caseData.clinicalPolicy.complications||[]).map(x=>[x.id,x]));
 const done=new Set(fulfilled||[]),deferred=new Set(continuation?.deferredTreatmentIds||[]);
 const receiver=(caseData.clinicalPolicy.closure?.consult?.[destination]||[]).length>0;
 const definitive=receiver?new Set([
  ...(caseData.clinicalPolicy.definitiveInterventions||[]),
  ...(caseData.clinicalPolicy.closure?.definitiveTreatmentIds||[])
 ]):new Set();
 const requirements=[];
 for(const episode of patient?.policyState?.complications||[]){
  const def=definitions.get(episode.id);
  // An unrecognized or not-yet-manifest complication candidate cannot
  // modify disposition or disclose the future random draw to the physician.
  if(!def||!alive(episode.status)||!Number.isFinite(episode.onsetAt))continue;
  const effective=new Set([...done,...deferred,...definitive]);
  const alternatives=outstandingClinicalRescue(def,effective);
  if(alternatives.length){
   requirements.push({
    type:'treatment',anyOf:alternatives,reason:'manifested-complication-rescue',
    message:'Resolver la estabilización inmediata documentada de la complicación antes del destino.'
   });
  }else if(destination==='alta'){
   // A dose or restored saturation does not prove that the episode resolved.
   // Transfers to monitored services need not wait for physiological recovery
   // when emergency stabilization and the receiving capacity are sufficient.
   requirements.push({type:'wait',reason:'manifested-complication-recovery',
    message:'Esperar recuperación fisiológica confirmada de la complicación antes del alta.'});
  }
 }
 return requirements;
}
