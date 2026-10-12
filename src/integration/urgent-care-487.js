import {DYNAMIC_THERAPIES_487,COMPLIANCE_THERAPIES_487,HEPARIN_SIM_DOSE_487,
 CARE_COVERAGE_FALLBACK_487,csHeparinIssue487,csHeparinClinicalRisk487,
 csHeparinHarm487,csCareCompliance487} from '../clinical/urgent-care-487.js';
import {GLOBAL_TREATMENTS_487,CASE_TRAITS_487,csAssessGeneralTreatment487,
 csAssessCaseRequirements487,csSevereDrugReaction487} from '../clinical/general-therapy-487.js';

// Thin case-aware guard over actual V19 native preparation/administration.
// This does NOT install the blocked global B1 pharmacology engine or write vitals.
export function applyUrgentCare487(html){
 if(html.includes('id="atria-urgent-care-487"'))throw Error('duplicate care requirements adapter');
 const script='<script id="atria-urgent-care-487">\n(function(){\n'+
  'if(window.__csUrgentCare487)return;\n'+
  'const DYNAMIC_THERAPIES_487='+JSON.stringify(DYNAMIC_THERAPIES_487)+';\n'+
  'const COMPLIANCE_THERAPIES_487='+JSON.stringify(COMPLIANCE_THERAPIES_487)+';\n'+
  'const HEPARIN_SIM_DOSE_487='+JSON.stringify(HEPARIN_SIM_DOSE_487)+';\n'+
  'const CARE_COVERAGE_FALLBACK_487='+JSON.stringify(CARE_COVERAGE_FALLBACK_487)+';\n'+
  'const GLOBAL_TREATMENTS_487='+JSON.stringify(GLOBAL_TREATMENTS_487)+';\n'+
  'const CASE_TRAITS_487='+JSON.stringify(CASE_TRAITS_487)+';\n'+
  csHeparinIssue487.toString()+'\n'+csHeparinClinicalRisk487.toString()+'\n'+
  csHeparinHarm487.toString()+'\n'+csCareCompliance487.toString()+'\n'+
  csAssessGeneralTreatment487.toString()+'\n'+csAssessCaseRequirements487.toString()+'\n'+
  csSevereDrugReaction487.toString()+'\n'+
  'const priorGive=addMonitorTherapy,priorDose=defaultDoseForTherapy,priorRecord=recordAdministration,priorSafety=medicationSafetyOffsets,priorUpdate=updateSimulation,priorTherapy=therapyEffectTotals;\n'+
  'defaultDoseForTherapy=function(t,text){\n'+
  " if(t?.id==='anticoagulation')return {...HEPARIN_SIM_DOSE_487};\n"+
  ' return priorDose.apply(this,arguments);\n};\n'+
  'addMonitorTherapy=function(text){\n'+
  " const t=typeof findMonitorTherapy==='function'?findMonitorTherapy(text):null;\n"+
  " if(t?.id==='anticoagulation'){\n"+
  '  const issue=csHeparinIssue487(text,C,sim);\n'+
  "  if(issue){setMonitorFeedback('Heparina NO administrada: '+issue,'warn');nurseSay(issue);return false;}\n"+
  '  const risk=csHeparinClinicalRisk487(C,sim);\n'+
  "  if(risk.caution)nurseSay('ADVERTENCIA clínica: '+risk.caution+' La heparina se aplicará si la preparación se completa.');\n"+
  ' }\n'+
  " if(t?.id&&t.id!=='anticoagulation'){const evaluation=csAssessGeneralTreatment487(t.id,C,sim);\n"+
  "  if(evaluation.known&&(evaluation.risk.length||!evaluation.indicated))\n"+
  "   nurseSay('ADVERTENCIA clínica · '+t.label+': '+(evaluation.risk.join(', ')||'Sin indicación documentada')+'. Orden no bloqueada.');\n"+
  ' }\n'+
  ' return priorGive.apply(this,arguments);\n};\n'+
  'recordAdministration=function(t){\n'+
  ' const p=sim,before=p?.administrationLog?.at(-1),out=priorRecord.apply(this,arguments);\n'+
  " if(!t?.id||t.action==='stop'||!p||p!==sim||!out||p.administrationLog?.at(-1)===before)return out;\n"+
  ' if(t.id!==\'anticoagulation\'){\n'+
  '  const evaluation=csAssessGeneralTreatment487(t.id,C,p),flags=p.clinicalFlags||{};\n'+
  '  if(evaluation.known&&(evaluation.risk.length||!evaluation.indicated)){\n'+
  '   const detail=evaluation.risk.join(\', \')||\'Sin indicación clínica\';\n'+
  "   const msg='Tratamiento confirmado con riesgo contextual: '+t.label+' · '+detail;\n"+
  '   p.events?.push?.({m:p.gameMinute,t:msg});\n'+
  '  }\n'+
  '  const severe=flags.severeAllergies||[],rule=GLOBAL_TREATMENTS_487[t.id];\n'+
  '  if(severe.includes(t.id)||severe.includes(rule?.classId)){\n'+
  '   if(!p.csSevereDrugReaction487||p.csSevereDrugReaction487.patientId!==p.patientInstance?.uid)\n'+
  '    p.csSevereDrugReaction487={drug:t.id,patientId:p.patientInstance?.uid,minute:p.gameMinute,notified:false};\n'+
  "   const msg='Reacción alérgica grave tras '+t.label+': vigilar respiración, perfusión y saturación.';\n"+
  '   p.events?.push?.({m:p.gameMinute,t:msg});nurseSay(msg);\n'+
  '  }\n'+
  '  return out;\n'+
  ' }\n'+
  ' const uid=p.patientInstance?.uid,risk=csHeparinClinicalRisk487(C,p);\n'+
  ' if(!p.csHeparinHarm487||p.csHeparinHarm487.patientId!==uid)\n'+
  '  p.csHeparinHarm487={patientId:uid,firstMinute:Number(p.gameMinute||0),notified:false,escalated:false};\n'+
  ' if(risk.caution){\n'+
  "  const warning='Heparina administrada pese a riesgo: '+risk.caution;\n"+
  '  p.adverseEvents??=[];if(!p.adverseEvents.includes(warning))p.adverseEvents.push(warning);\n'+
  "  p.events?.push?.({m:p.gameMinute,t:warning});\n"+
  "  nurseSay('Heparina aplicada. ATENCIÓN: '+risk.caution+' Vigilá el sangrado y los signos vitales.');\n"+
  ' }\n'+
  ' return out;\n};\n'+
  'therapyEffectTotals=function(){\n'+
  ' const total=priorTherapy.apply(this,arguments);\n'+
  " if(sim&&!['peritonitis','sepsis_source'].includes(C?.physiology?.engine)){\n"+
  "  const blood=sim.monitorTherapies?.get?.('transfusion');\n"+
  '  if(blood)total.spo2-=Number(blood.effects?.spo2||0);\n'+
  ' }\n'+
  ' return total;\n};\n'+
  'medicationSafetyOffsets=function(){\n'+
  ' const total=priorSafety.apply(this,arguments),harm=csHeparinHarm487(C,sim);\n'+
  ' if(!harm.active&&!sim?.csSevereDrugReaction487)return total;\n'+
  ' for(const axis of Object.keys(total))total[axis]+=Number(harm.offsets[axis]||0);\n'+
  ' const allergy=csSevereDrugReaction487(sim);\n'+
  ' for(const axis of Object.keys(total))total[axis]+=Number(allergy.offsets[axis]||0);\n'+
  ' return total;\n};\n'+
  'updateSimulation=function(dt){\n'+
  ' const p=sim,c=C,result=priorUpdate.apply(this,arguments);\n'+
  ' if(!p||p!==sim||c!==C||p.patientDied||p.caseEnded)return result;\n'+
  ' const h=csHeparinHarm487(c,p),state=p.csHeparinHarm487;\n'+
  ' if(state&&h.bleedingSeverity>.18&&!state.notified){\n'+
  "  state.notified=true;const msg='Sangrado agravado tras anticoagulación: revisar perfusión, presión y conducta.';\n"+
  '  p.events?.push?.({m:p.gameMinute,t:msg});nurseSay(msg);\n'+
  ' }\n'+
  ' if(state&&h.bleedingSeverity>.66&&!state.escalated){\n'+
  "  state.escalated=true;const msg='Hemorragia importante: taquicardia e hipotensión por pérdida sanguínea. Priorizar estabilización.';\n"+
  '  p.events?.push?.({m:p.gameMinute,t:msg});nurseSay(msg);\n'+
  ' }\n'+
  ' const allergy=csSevereDrugReaction487(p),adverse=p.csSevereDrugReaction487;\n'+
  ' if(adverse&&allergy.severity>.18&&!adverse.notified){\n'+
  "  adverse.notified=true;nurseSay('ALERTA: reacción alérgica grave tras medicación; deterioro respiratorio y hemodinámico.');\n"+
  ' }\n'+
  ' return result;\n};\n'+
  'window.csCare487=Object.freeze({\n'+
  ' report:(patient=sim,caseDef=C)=>{\n'+
  '  const legacy=csCareCompliance487(caseDef,patient,MONITOR_THERAPY_CATALOG);\n'+
  '  const general=csAssessCaseRequirements487(caseDef,patient);\n'+
  '  return {...legacy,general,coverageComplete:general.coverageComplete===null?legacy.coverageComplete:general.coverageComplete};\n'+
  ' },\n'+
  ' assess:(id,caseDef=C,patient=sim)=>csAssessGeneralTreatment487(id,caseDef,patient),\n'+
  ' requirements:(caseDef=C,patient=sim)=>csAssessCaseRequirements487(caseDef,patient),\n'+
  ' allergy:(patient=sim)=>csSevereDrugReaction487(patient),\n'+
  ' heparinIssue:(text,caseDef=C,patient=sim)=>csHeparinIssue487(text,caseDef,patient),\n'+
  ' heparinRisk:(caseDef=C,patient=sim)=>csHeparinClinicalRisk487(caseDef,patient),\n'+
  ' heparinHarm:(caseDef=C,patient=sim)=>csHeparinHarm487(caseDef,patient),\n'+
  ' roles:()=>({dynamic:[...DYNAMIC_THERAPIES_487],requirement:[...COMPLIANCE_THERAPIES_487]})\n'+
  '});\nwindow.__csUrgentCare487=true;\n})();\n</script>';
 return html.replace('</body>',script+'</body>');
}
