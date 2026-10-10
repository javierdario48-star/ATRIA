import {csSecondaryBridgeEvidence487,csSecondaryBridgePhysiology487} from '../clinical/secondary-sepsis-bridge-487.js';
export function applySecondaryBridge487(html){
 if(html.includes('id="atria-secondary-sepsis-bridge-487"'))throw Error('duplicate secondary-sepsis adapter');
 const script=String.raw`<script id="atria-secondary-sepsis-bridge-487">
(function(){
 if(window.__csSecondaryBridge487)return;window.__csSecondaryBridge487=true;
 ${csSecondaryBridgeEvidence487.toString()}
 ${csSecondaryBridgePhysiology487.toString()}
 const oldPhys=updatePhysiologyState;
 updatePhysiologyState=function(){
  const target=sim,caseDef=C,initial=Number(target?.physLastMinute??target?.gameMinute??0);
  const previous=target?.phys?{inflammation:target.phys.inflammation,
    effectiveVolume:target.phys.effectiveVolume}:null;
  const output=oldPhys.apply(this,arguments);
  if(target===sim&&caseDef===C&&previous)
   csSecondaryBridgePhysiology487(target,caseDef,previous,Number(target.gameMinute||0)-initial);
  return output;
 };
 // All modes share ONE patient-specific surgical handoff barrier. We do NOT
 // automatically close a case; the authorized player must tap the bedside CTA.
 const originalDeathRescue=csDeathRescueMissing;
 function acceptedAndReady(){
  if(!sim||C?.id!=='PERI-SEC-001'||sim.patientDied||sim.caseEnded)return false;
  const consult=sim.consults?.get?.('cirugia');
  if(consult?.status!=='done'||consult.accepted===false)return false;
  const decision=window.csPeritonitisAssessment487?.();
  if(!decision?.ready||decision.action!=='quirofano')return false;
  if(!csSecondaryBridgeEvidence487(sim,C).ready)return false;
  return true;
 }
 csDeathRescueMissing=function(){
  if(sim?._csORTransit487)return false;
  if(sim?._csSurgeryReady487)return false;
  if(acceptedAndReady()){
   sim._csSurgeryReady487=true;
   sim.events?.push?.({m:sim.gameMinute,t:'Cirugía aceptada con criterios de traslado cumplidos: caso en entrega'});
   return false;
  }
  return originalDeathRescue.apply(this,arguments);
 };
 const oldUpdate=updateSimulation;
 updateSimulation=function(dt){
  if(acceptedAndReady()&&!sim._csSurgeryReady487){
   sim._csSurgeryReady487=true;
   nurseSay('Cirugía aceptó y se verificó la estabilización inicial. Pulsá «Derivar a quirófano» sobre el paciente para completar el pase.');
   window.csPeritonitisRefresh487?.();
  }
  return oldUpdate.apply(this,arguments);
 };
 window.csSecondaryBridge487={evidence:(s=sim,c=C)=>csSecondaryBridgeEvidence487(s,c)};
})();
</script>`;
 return html.replace('</body>',script+'</body>');
}
