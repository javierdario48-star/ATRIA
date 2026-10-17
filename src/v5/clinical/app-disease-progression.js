// C12.f1b — case-scoped natural history for the V5 APP educational scenario.
// The effective V4 APP reference is STATIC over the short characterization;
// this is an explicitly new, bounded long-horizon game progression, NOT a
// transplant of V4 sepsis/peritonitis physiology.
//
// Returns TARGET offsets only. advanceAppVitals remains the only vital writer.
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {antimicrobialRegimens487} from './antimicrobial-regimens-487.js';
const ZERO=Object.freeze({temp:0,hr:0,rr:0,sys:0,dia:0,spo2:0});
const ramp=(v,from,to)=>Math.max(0,Math.min(1,(v-from)/(to-from)));
function coverageNativeMinute(p,c){
 const regimens=antimicrobialRegimens487(c);
 const completed=[];
 for(const regimen of regimens){
  const ages=[];
  for(const drugId of regimen){
   if(matchesMedicationAllergy487(p,drugId))break;
   const administrations=(p?.administrationLog||[]).filter(a=>
    a.id===drugId&&a.patientUid===p.uid&&
    Number.isFinite(a.administeredAtNativeMinute)&&
    (p.treatments||[]).some(t=>t.id===drugId&&t.patientUid===p.uid&&
     t.sourceEventId===a.sourceEventId&&t.administeredAtNativeMinute===a.administeredAtNativeMinute));
   if(!administrations.length)break;
   ages.push(Math.min(...administrations.map(a=>a.administeredAtNativeMinute)));
  }
  if(ages.length===regimen.length)completed.push(Math.max(...ages));
 }
 return completed.length?Math.min(...completed):null;
}
/** At native min <20, APP matches its characterized legacy baseline exactly.
 * Uncontrolled appendicitis may slowly develop greater infection/volume risk.
 * Confirmed dual-drug coverage SLOWS future progression but never claims to
 * cure an unoperated appendix or rewinds already established injury. Partial
 * coverage, an order, or a dose for another patient has no disease credit.
 */
export function appDiseaseTargetOffsets(p,c,atNativeMinute){
 if(c?.id!=='APP-001')throw Error('APP natural progression belongs only to APP-001');
 if(!Number.isFinite(atNativeMinute)||atNativeMinute<0)throw Error('invalid APP disease time');
 if(p?.caseEnded||atNativeMinute<=20)return ZERO;
 const coveredAt=coverageNativeMinute(p,c);
 const age=coveredAt!==null&&atNativeMinute>coveredAt?
  coveredAt+(atNativeMinute-coveredAt)*.45:atNativeMinute;
 const early=ramp(age,20,180),late=ramp(age,120,480),severe=ramp(age,480,720);
 return {temp:.65*early+.3*late+.35*severe,
  hr:20*early+18*late+28*severe,
  rr:3*early+4*late+7*severe,
  sys:-14*early-26*late-29*severe,
  dia:-7*early-13*late-17*severe,
  spo2:-2*early-5*late-8*severe};
}
