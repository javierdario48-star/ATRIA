import {DYNAMIC_THERAPIES_487,COMPLIANCE_THERAPIES_487,HEPARIN_SIM_DOSE_487,
 CARE_COVERAGE_FALLBACK_487,csHeparinIssue487,csCareCompliance487} from '../clinical/urgent-care-487.js';

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
  csHeparinIssue487.toString()+'\n'+csCareCompliance487.toString()+'\n'+
  'const priorGive=addMonitorTherapy,priorDose=defaultDoseForTherapy;\n'+
  'defaultDoseForTherapy=function(t,text){\n'+
  " if(t?.id==='anticoagulation')return {...HEPARIN_SIM_DOSE_487};\n"+
  ' return priorDose.apply(this,arguments);\n};\n'+
  'addMonitorTherapy=function(text){\n'+
  " const t=typeof findMonitorTherapy==='function'?findMonitorTherapy(text):null;\n"+
  " if(t?.id==='anticoagulation'){\n"+
  '  const issue=csHeparinIssue487(text,C,sim);\n'+
  "  if(issue){setMonitorFeedback('Heparina NO administrada: '+issue,'warn');nurseSay(issue);return false;}\n"+
  ' }\n'+
  ' return priorGive.apply(this,arguments);\n};\n'+
  'window.csCare487=Object.freeze({\n'+
  ' report:(patient=sim,caseDef=C)=>csCareCompliance487(caseDef,patient,MONITOR_THERAPY_CATALOG),\n'+
  ' heparinIssue:(text,caseDef=C,patient=sim)=>csHeparinIssue487(text,caseDef,patient),\n'+
  ' roles:()=>({dynamic:[...DYNAMIC_THERAPIES_487],requirement:[...COMPLIANCE_THERAPIES_487]})\n'+
  '});\nwindow.__csUrgentCare487=true;\n})();\n</script>';
 return html.replace('</body>',script+'</body>');
}
