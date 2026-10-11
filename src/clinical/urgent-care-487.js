/**
 * Emergency-department CARE rules, not a second drug-effect engine.
 * Consume the real native administration ledger, patient state and case needs.
 * Any benefit/harm changing vitals remains owned by established native writers.
 */
import {PHARMA_RULES_487} from './pharmacology-registry-487.js';

export const DYNAMIC_THERAPIES_487=Object.freeze([
 'oxygen','fluid','albumin','vasopressor','morphine','analgesia','antiemetic',
 'transfusion','paracentesis_ter','furosemide','beta_blocker'
]);
export const COMPLIANCE_THERAPIES_487=Object.freeze([
 'ppi','espironolactona','steroid','aza','ceftriaxone','metronidazole',
 'imipenem','ceftazidime','cefoperazone','cefepime','piptazo','ampicillin',
 'amikacin','gentamicin','fluconazole','amphotericin','source_control',
 'stop_beta_blocker','anticoagulation'
]);
// The native V19 catalog already contains heparin as the 30th therapy.
// No researched clinical dosage is inferred from a generic search result.
// The sole simulated unit marks execution of an INITIAL local protocol only.
export const HEPARIN_SIM_DOSE_487=Object.freeze({
 amount:1,unit:'protocolo',display:'Inicio de heparina IV (protocolo simulado)',
 defaultApplied:true
});
export const CARE_COVERAGE_FALLBACK_487=Object.freeze({
 'APP-001':[['ceftriaxone','metronidazole'],['piptazo'],['imipenem'],['cefepime','metronidazole']],
 'CHOLE-001':[['ceftriaxone','metronidazole'],['piptazo'],['imipenem'],['cefepime','metronidazole']]
});
export function csHeparinIssue487(raw,c,patient){
 const s=String(raw||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/,/g,'.');
 if(!/\bheparina\b/.test(s))
  return 'Especificá heparina IV: anticoagulación genérica no identifica una molécula.';
 if((s.match(/\bheparina\b/g)||[]).length!==1)
  return 'Indicá una única orden identificada de heparina.';
 if(/\b(?:oral|vo|po|im|sc|subcutan\w*|intranasal|inhalad\w*|sublingual|enoxaparina|warfarina|rivaroxaban|apixaban)\b/.test(s)||
    /\bi\.\s*m\./.test(s)||/\bvia\b/.test(s)&&!/\bvia\s+(?:iv|ev|intravenos[oa]|endovenos[oa])\b/.test(s))
  return 'La entrada actual solo representa heparina no fraccionada IV, no otra vía o fármaco.';
 if(/\d/.test(s)||/\b(?:ui|u\/kg|unidades|mg|ml|bolo|infusion\s+\d)\b/.test(s))
  return 'La dosis/tasa de heparina no puede deducirse: usá «heparina IV» (protocolo inicial simulado).';
 // Medical contraindications are decision consequences, NOT input syntax errors.
 return null;
}
export function csHeparinClinicalRisk487(c,patient){
 const f=patient?.clinicalFlags||{},p=patient?.phys||{};
 const indicated=c?.id==='MESI-001'||c?.keyInterventions?.includes?.('anticoagulation')||
   c?.pharmacology?.anticoagulationIndicated===true;
 const activeBleeding=c?.id==='HDA-001'||c?.risk==='bleed'||
   f.majorBleeding===true||f.activeBleeding===true||
   p.majorBleeding===true||p.activeBleeding===true;
 const vulnerability=f.bleedingRisk===true||f.recentSurgery===true||
   f.thrombocytopenia===true||f.coagulopathy===true||
   c?.pharmacology?.bleedingRisk===true;
 const hit=f.knownHIT===true;
 const explicit=f.heparinContraindicated===true||
   c?.pharmacology?.contraindications?.includes?.('anticoagulation');
 const contraindicated=activeBleeding||hit||explicit;
 return {indicated,contraindicated,activeBleeding,hit,explicit,
   level:activeBleeding?'high':vulnerability||explicit?'moderate':'low',
   caution:activeBleeding?'Hemorragia activa: heparina puede agravar la pérdida sanguínea.':
     hit?'HIT conocida: riesgo trombótico por heparina, no es seguro administrarla.':
     explicit?'Anticoagulación contraindicada en este paciente.':
     !indicated?'Sin indicación terapéutica: riesgo hemorrágico innecesario.':
     vulnerability?'Riesgo hemorrágico aumentado.':null};
}
// Educational risk, intentionally not a clinical bleeding probability model.
// Reads only CONFIRMED native exposure; no native drug effect is replaced here.
export function csHeparinHarm487(c,patient){
 const x=patient?.csHeparinHarm487,uid=patient?.patientInstance?.uid;
 const ex=patient?.therapyExposure?.get?.('anticoagulation');
 const zero={active:false,bleedingSeverity:0,warning:null,
   offsets:{temp:0,hr:0,rr:0,sys:0,dia:0,spo2:0}};
 if(!x||!ex||!Number(ex.count||0)||x.patientId!==uid)return zero;
 const risk=csHeparinClinicalRisk487(c,patient);
 const elapsed=Math.max(0,Number(patient?.gameMinute||0)-Number(x.firstMinute||0));
 const repeats=Math.max(1,Math.min(3,Number(ex.count||1)));
 let severity=0;
 if(risk.level==='high')
   severity=Math.min(1,Math.max(0,(elapsed-.45)/3.8)*(.88+.12*repeats));
 else if(risk.level==='moderate')
   severity=Math.min(.65,Math.max(0,(elapsed-1.25)/7)*(.7+.15*repeats));
 else if(repeats>=3)
   severity=Math.min(.28,Math.max(0,(elapsed-3)/12)*.7);
 return {active:true,bleedingSeverity:severity,riskLevel:risk.level,
   warning:risk.caution,elapsed,patientId:uid,
   offsets:{temp:0,hr:Math.min(29,29*severity),
     rr:Math.min(7,7*severity),sys:-Math.min(39,39*severity),
     dia:-Math.min(24,24*severity),spo2:0}};
}

export function csCareCompliance487(c,patient,catalogue=[]){
 const native=new Set(catalogue.map(x=>x.id));
 const declared=[...DYNAMIC_THERAPIES_487,...COMPLIANCE_THERAPIES_487];
 const role=id=>DYNAMIC_THERAPIES_487.includes(id)?'dynamic':
   COMPLIANCE_THERAPIES_487.includes(id)?'requirement':null;
 const rows=patient?.administrationLog||[];
 const ex=patient?.therapyExposure;
 const patientId=patient?.patientInstance?.uid;
 const delivered=id=>{
  if(id==='source_control')return patient?.phys?.sourceControlled===true||
   !!(patient?.interventions?.has?.('source_control')&&
      rows.some(x=>x?.id==='source_control'&&x.action!=='stop'));
  if(id==='stop_beta_blocker')return rows.some(x=>x?.id===id&&x.action!=='stop');
  if(rows.some(x=>x?.id===id&&x.action!=='stop'&&x.status!=='pending'))return true;
  // Existing native exposure ledger survives the bounded 80-row visible history.
  if(Number(ex?.get?.(id)?.count||0)>0)return true;
  // Only nurse-sealed bounded receipts can restore oxygen/pressor evidence.
  // An active chip alone cannot certify therapy after the log rolls over.
  if(['oxygen','vasopressor'].includes(id)){
   const receipt=ex?.get?.(id)?.lastConfirmedAdministration487;
   return !!(receipt&&receipt.id===id&&receipt.patientId===patientId);
  }
  return false;
 };
 const heparinRisk=csHeparinClinicalRisk487(c,patient);
 const completed=id=>id==='anticoagulation'?
   delivered(id)&&heparinRisk.indicated&&!heparinRisk.contraindicated:delivered(id);
 const required=(c?.keyInterventions||[]).filter(id=>role(id)==='requirement');
 const coverageSets=c?.pharmacology?.coverageSets||c?.physiology?.coverageSets||
  CARE_COVERAGE_FALLBACK_487[c?.id]||[];
 const cover=coverageSets.map(set=>({ids:[...set],met:set.every(delivered)}));
 const missing=required.filter(id=>!completed(id));
 const coverageComplete=cover.length?cover.some(x=>x.met):null;
 const renal=Number(patient?.phys?.renalReserve??1);
 const exposureRisks=[];
 for(const id of COMPLIANCE_THERAPIES_487){
  if(!delivered(id))continue;
  if(['gentamicin','amikacin','amphotericin'].includes(id)&&renal<.55)
   exposureRisks.push({id,warning:'Reserva renal baja: revisar adecuación y toxicidad; NO implica lesión renal instantánea.'});
  if(id==='anticoagulation'&&heparinRisk.caution)
   exposureRisks.push({id,warning:heparinRisk.caution});
 }
 return {caseId:c?.id||null,catalogueSize:native.size,knownRoles:declared.length,
  missingFromCatalogue:declared.filter(id=>!native.has(id)),roles:{
   dynamic:[...DYNAMIC_THERAPIES_487],requirement:[...COMPLIANCE_THERAPIES_487]},
  required,missing,coverageComplete,coverageSets:cover,delivered:declared.filter(delivered),
  exposureRisks,heparinGiven:delivered('anticoagulation'),
  heparinComplete:completed('anticoagulation'),
  heparinContraindicated:heparinRisk.contraindicated,
  heparinBleedingSeverity:csHeparinHarm487(c,patient).bleedingSeverity,
  // A fulfilled requirement is NEVER proof of clinical stabilization or discharge.
  safeForDischarge:null,patientId};
}
