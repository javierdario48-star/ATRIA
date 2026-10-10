// Isolated septic source-control bridge for the existing, native physiology.
// No treatment is inferred from a chat, button click or pending order.
export function csSecondaryBridgeEvidence487(s,c){
 if(!s||c?.id!=='PERI-SEC-001'||s.caseEnded||s.patientDied)return {ready:false};
 const rows=Array.isArray(s.administrationLog)?s.administrationLog:[];
 const active=id=>s.monitorTherapies?.has?.(id)===true&&rows.some(x=>x?.id===id);
 const fluid=active('fluid')&&Number(s.therapyTotals?.fluidMl||0)>=250;
 const antibiotics=active('ceftriaxone')&&active('metronidazole')||
   active('piptazo')||active('imipenem')||
   active('ceftazidime')&&active('metronidazole')||
   active('cefoperazone')&&active('metronidazole');
 const hypoxic=Number(c?.vitals?.spo2??98)<90;
 const oxygen=!hypoxic||active('oxygen');
 const surgery=s.consults?.get?.('cirugia');
 const accepted=surgery?.status==='done'&&surgery?.accepted!==false;
 const access=Number(s.venousAccessCount||0)>0;
 return {ready:fluid&&antibiotics&&oxygen&&accepted&&access,
  fluid,antibiotics,oxygen,accepted,access,sourceControlled:s.phys?.sourceControlled===true,
  realTreatmentCount:rows.filter(x=>['fluid','ceftriaxone','metronidazole','piptazo','imipenem'].includes(x?.id)).length};
}
// Lower the untreated third-space-loss slope while BOTH appropriate antimicrobials
// and fluid therapy have been administered and urgent surgery has accepted the case.
// Preserve ongoing infection and some capillary leakage until actual source control.
export function csSecondaryBridgePhysiology487(patient,caseDef,previous,minutes){
 const evidence=csSecondaryBridgeEvidence487(patient,caseDef);
 if(!evidence.ready||evidence.sourceControlled||!patient?.phys||!(minutes>0))return {applied:false,evidence};
 const p=patient.phys,dm=Math.max(0,Math.min(1.5,Number(minutes)||0));
 const before=previous||{};
 if(Number.isFinite(before.inflammation))
  p.inflammation=Math.max(before.inflammation,
   before.inflammation+Math.max(0,p.inflammation-before.inflammation)*.40);
 if(Number.isFinite(before.effectiveVolume)){
  const loss=Math.max(0,before.effectiveVolume-p.effectiveVolume);
  const balance=Math.min(.011, .006+Math.min(.005,Math.max(0,Number(patient.therapyTotals?.fluidMl||0)-250)/150000));
  p.effectiveVolume=Math.min(1.12,Math.max(p.effectiveVolume,before.effectiveVolume-loss*.40+dm*balance));
 }
 if(Number.isFinite(p.svr))p.svr=Math.min(1.07,p.svr+dm*.007);
 if(Number.isFinite(p.contractility))p.contractility=Math.min(1.04,p.contractility+dm*.003);
 return {applied:true,evidence};
}
