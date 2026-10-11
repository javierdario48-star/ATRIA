import {DYNAMIC_THERAPIES_487,COMPLIANCE_THERAPIES_487,HEPARIN_SIM_DOSE_487,
 CARE_COVERAGE_FALLBACK_487,csHeparinIssue487,csHeparinClinicalRisk487,
 csHeparinHarm487,csCareCompliance487} from '../clinical/urgent-care-487.js';

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
  csHeparinIssue487.toString()+'\n'+csHeparinClinicalRisk487.toString()+'\n'+
  csHeparinHarm487.toString()+'\n'+csCareCompliance487.toString()+'\n'+
  'const priorGive=addMonitorTherapy,priorDose=defaultDoseForTherapy,priorRecord=recordAdministration,priorSafety=medicationSafetyOffsets,priorUpdate=updateSimulation;\n'+
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
  ' return priorGive.apply(this,arguments);\n};\n'+
  'recordAdministration=function(t){\n'+
  ' const p=sim,before=p?.administrationLog?.at(-1),out=priorRecord.apply(this,arguments);\n'+
  " if(t?.id!=='anticoagulation'||t.action==='stop'||!p||p!==sim||!out||p.administrationLog?.at(-1)===before)return out;\n"+
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
  'medicationSafetyOffsets=function(){\n'+
  ' const total=priorSafety.apply(this,arguments),harm=csHeparinHarm487(C,sim);\n'+
  ' if(!harm.active)return total;\n'+
  ' for(const axis of Object.keys(total))total[axis]+=Number(harm.offsets[axis]||0);\n'+
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
  ' return result;\n};\n'+
  'window.csCare487=Object.freeze({\n'+
  ' report:(patient=sim,caseDef=C)=>csCareCompliance487(caseDef,patient,MONITOR_THERAPY_CATALOG),\n'+
  ' heparinIssue:(text,caseDef=C,patient=sim)=>csHeparinIssue487(text,caseDef,patient),\n'+
  ' heparinRisk:(caseDef=C,patient=sim)=>csHeparinClinicalRisk487(caseDef,patient),\n'+
  ' heparinHarm:(caseDef=C,patient=sim)=>csHeparinHarm487(caseDef,patient),\n'+
  ' roles:()=>({dynamic:[...DYNAMIC_THERAPIES_487],requirement:[...COMPLIANCE_THERAPIES_487]})\n'+
  '});\nwindow.__csUrgentCare487=true;\n})();\n</script>';
 return html.replace('</body>',script+'</body>');
}
