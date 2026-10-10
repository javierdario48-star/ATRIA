import {csCriticalRescueEvidence487,csCriticalRescuePhysiology487,csCriticalRescueWindow487} from '../clinical/critical-rescue-487.js';
export function applyCriticalRescue487(html){
 if(html.includes('id="atria-critical-rescue-487"'))throw Error('duplicate critical-rescue adapter');
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
   csCriticalRescuePhysiology487(target,caseDef,Number(target?.gameMinute||0)-lastMinute);
  return result;
 };
 const priorFatal=csDeathRescueMissing;
 csDeathRescueMissing=function(v,map){
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
  return priorFatal.apply(this,arguments);
 };
 const priorUpdate=updateSimulation;
 updateSimulation=function(dt){
  if(sim&&!sim.caseEnded&&!sim.patientDied){
   sim._criticalSupport487??={elapsedSeconds:0};
   sim._criticalSupport487.elapsedSeconds+=Math.max(0,Math.min(.25,Number(dt)||0));
  }
  return priorUpdate.apply(this,arguments);
 };
 window.csCriticalRescue487={evidence:(p=sim,c=C)=>csCriticalRescueEvidence487(p,c,p?.liveVitals),
  window:(p=sim,c=C)=>csCriticalRescueWindow487(p,c,p?.liveVitals,p?._criticalSupport487?.elapsedSeconds||0)};
})();
</script>`;
 return html.replace('</body>',script+'</body>');
}
