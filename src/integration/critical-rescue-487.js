import {csCriticalRescueEvidence487,csCriticalRescuePhysiology487,csCriticalRescueWindow487} from '../clinical/critical-rescue-487.js';
// Patch ONLY the final ns423 assignment. Its post-window lethal policy stays
// true; restoring the older predicate would restore permanent marker immunity.
export const CRITICAL_FINAL_OLD_487='csDeathRescueMissing=function(){return true;};';
export const CRITICAL_FINAL_NEW_487='csDeathRescueMissing=window.csCriticalRescue487.fatalMissing;';
export const CRITICAL_CLOCK_OLD_487='const before=sim.gameMinute||0;__csBaseUpdateSimulation(dt);';
export const CRITICAL_CLOCK_NEW_487='window.csCriticalRescue487?.advance(sim,dt);'+CRITICAL_CLOCK_OLD_487;
export function applyCriticalRescue487(html){
 if(html.includes('id="atria-critical-rescue-487"'))throw Error('duplicate critical-rescue adapter');
 if(html.includes('id="ns423-evolution"')){
  if(html.split(CRITICAL_FINAL_OLD_487).length!==2)throw Error('final ns423 fatal predicate not uniquely located');
  html=html.replace(CRITICAL_FINAL_OLD_487,CRITICAL_FINAL_NEW_487);
  if(html.split(CRITICAL_CLOCK_OLD_487).length!==2)throw Error('native critical clock boundary not uniquely located');
  html=html.replace(CRITICAL_CLOCK_OLD_487,CRITICAL_CLOCK_NEW_487);
 }
 const script=String.raw`<script id="atria-critical-rescue-487">
(function(){
 if(window.__atriaCriticalRescue487)return;window.__atriaCriticalRescue487=true;
 ${csCriticalRescueEvidence487.toString()}
 ${csCriticalRescuePhysiology487.toString()}
 ${csCriticalRescueWindow487.toString()}
 const priorPhysiology=updatePhysiologyState;
 updatePhysiologyState=function(){
  const target=sim,caseDef=C;
  const lastMinute=Number(target?.physLastMinute??target?.gameMinute??0);
  const result=priorPhysiology.apply(this,arguments);
  if(target===sim&&caseDef===C)
   csCriticalRescuePhysiology487(target,caseDef,Number(target?.gameMinute||0)-lastMinute,
    window.csPhysiologyQA487?.ownsRinger?.(target,caseDef)===true);
  return result;
 };
 const priorFatal=csDeathRescueMissing;
 function criticalFatalMissing487(v,map){
  const p=sim;
  if(p&&!p.caseEnded&&!p.patientDied){
   const now=Number(p._criticalSupport487?.elapsedSeconds||0);
   const evidence=csCriticalRescueEvidence487(p,C,v);
   if(evidence.supported&&!p._criticalSupport487?.startedAtSec){
    p._criticalSupport487??={elapsedSeconds:now};
    // Save a timestamp ONCE. Repeated dosing never extends this rescue window.
    p._criticalSupport487.startedAtSec=Math.max(.001,now);
    if(!p._criticalSupport487.notified){
     p._criticalSupport487.notified=true;
     nurseSay('Rescate crítico en curso. El tratamiento registrado está actuando: reevaluemos perfusión, oxigenación y necesidad de más soporte.');
    }
   }
   if(csCriticalRescueWindow487(p,C,v,now).protected)return false;
  }
  return true;
 }
 csDeathRescueMissing=function(v,map){
  if(!criticalFatalMissing487(v,map))return false;
  return priorFatal.apply(this,arguments);
 };
 function advanceCriticalClock487(p,dt){
  if(p&&!p.caseEnded&&!p.patientDied){
   p._criticalSupport487??={elapsedSeconds:0};
   p._criticalSupport487.elapsedSeconds+=Math.max(0,Math.min(.25,Number(dt)||0));
  }
 }
 const priorUpdate=updateSimulation;
 // Actual native fatal entry runs even through V19's cached waiting-patient
 // path. Standalone test fragments have no such boundary and keep the fallback.
 const clockAtNativeBoundary=typeof __csBaseUpdateSimulation==='function';
 updateSimulation=function(dt){
  if(!clockAtNativeBoundary)advanceCriticalClock487(sim,dt);
  return priorUpdate.apply(this,arguments);
 };
 window.csCriticalRescue487={fatalMissing:criticalFatalMissing487,advance:advanceCriticalClock487,
  evidence:(p=sim,c=C)=>csCriticalRescueEvidence487(p,c,p?.liveVitals),
  window:(p=sim,c=C)=>csCriticalRescueWindow487(p,c,p?.liveVitals,p?._criticalSupport487?.elapsedSeconds||0)};
})();
</script>`;
 return html.replace('</body>',script+'</body>');
}
