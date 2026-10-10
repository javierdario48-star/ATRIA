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
 const oldUpdate=updateSimulation;
 updateSimulation=function(dt){
  const output=oldUpdate.apply(this,arguments);
  if(!sim||!C||sim.caseEnded||sim.patientDied||C.id!=='PERI-SEC-001')return output;
  const mode=sim.playMode||selectedPlayMode;
  if(mode!=='solo'&&mode!=='apprentice')return output;
  const care=csSecondaryBridgeEvidence487(sim,C);
  const consult=sim.consults?.get?.('cirugia');
  if(consult?.status==='done'&&care.fluid&&care.antibiotics&&!sim._csBridgeAdvice487){
   sim._csBridgeAdvice487=true;
   const v=sim.liveVitals||{},map=(Number(v.sys||0)+2*Number(v.dia||0))/3;
   nurseSay('Cirugía aceptó. Ringer y antibióticos constan administrados. '+
    (map<65?'La perfusión aún es insuficiente: reevaluá la PAM, la respuesta a volumen y si necesita vasopresores mientras preparamos quirófano.':
      'Continuá vigilando perfusión y oxigenación hasta el traslado.'));
  }
  if(!care.ready||sim.disposition||sim._csORTransferTimer487)return output;
  const decision=window.csPeritonitisAssessment487?.();
  if(!decision?.ready||decision.action!=='quirofano')return output;
  const target=sim,targetCaseId=C.id;
  target._csORTransferTimer487=true;
  nurseSay('Doctor, el equipo quirúrgico aceptó y ya está coordinado. Preparando traslado a quirófano.');
  // Scheduling the handoff is NOT source control. The patient's physiology
  // evolves normally during this short transfer preparation interval.
  setTimeout(()=>{
   const complete=()=>{
    if(target.caseEnded||target.patientDied||target.disposition)return;
    const now=window.csPeritonitisAssessment487?.();
    if(!now?.ready||now.action!=='quirofano'){
     target._csORTransferTimer487=false;
     nurseSay('El traslado sigue condicionado: '+(now?.missing||[]).join('; ')+'.');
     return;
    }
    if(window.csSetDisposition?.('quirofano')!==true||target.disposition?.id!=='quirofano'){
     target._csORTransferTimer487=false;
     nurseSay('El sistema no confirmó el destino a quirófano; el caso sigue abierto.');
     return;
    }
    target.events?.push?.({m:target.gameMinute,t:'Entrega formal al equipo quirúrgico / quirófano'});
    nurseSay('El equipo de Cirugía recibió al paciente en quirófano. Finalizamos el pase; el control del foco se realizará allí.');
    finishCase('completed');
   };
   if(typeof window.csWithPatientStateV203==='function')
    window.csWithPatientStateV203(target,targetCaseId,complete);
   else if(sim===target&&C?.id===targetCaseId)complete();
  },3200);
  return output;
 };
 window.csSecondaryBridge487={evidence:(s=sim,c=C)=>csSecondaryBridgeEvidence487(s,c)};
})();
</script>`;
 return html.replace('</body>',script+'</body>');
}
