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
 const requested=c?.id==='MESI-001'||c?.keyInterventions?.includes?.('anticoagulation')||
   c?.pharmacology?.anticoagulationIndicated===true;
 if(!requested)return 'No hay indicación de anticoagulación terapéutica documentada en este caso.';
 if(c?.id==='HDA-001'||patient?.phys?.activeBleeding===true||
   patient?.phys?.majorBleeding===true||patient?.clinicalFlags?.majorBleeding===true||
   patient?.clinicalFlags?.activeBleeding===true||
   patient?.clinicalFlags?.knownHIT===true||patient?.clinicalFlags?.heparinContraindicated===true||
   c?.pharmacology?.contraindications?.includes?.('anticoagulation'))
  return 'Heparina no administrada: hemorragia mayor activa, HIT u otra contraindicación documentada.';
 return null;
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
  if(id==='source_control')return patient?.phys?.sourceControlled===true;
  if(id==='stop_beta_blocker')return rows.some(x=>x?.id===id&&x.action!=='stop');
  if(rows.some(x=>x?.id===id&&x.action!=='stop'&&x.status!=='pending'))return true;
  // Only nurse-sealed bounded receipts can restore oxygen/pressor evidence.
  // An active chip alone cannot certify therapy after the log rolls over.
  if(['oxygen','vasopressor'].includes(id)){
   const receipt=ex?.get?.(id)?.lastConfirmedAdministration487;
   return !!(receipt&&receipt.id===id&&receipt.patientId===patientId);
  }
  return false;
 };
 const required=(c?.keyInterventions||[]).filter(id=>role(id)==='requirement');
 const coverageSets=c?.pharmacology?.coverageSets||c?.physiology?.coverageSets||
  CARE_COVERAGE_FALLBACK_487[c?.id]||[];
 const cover=coverageSets.map(set=>({ids:[...set],met:set.every(delivered)}));
 const missing=required.filter(id=>!delivered(id));
 const coverageComplete=cover.length?cover.some(x=>x.met):null;
 const renal=Number(patient?.phys?.renalReserve??1);
 const exposureRisks=[];
 for(const id of COMPLIANCE_THERAPIES_487){
  if(!delivered(id))continue;
  if(['gentamicin','amikacin','amphotericin'].includes(id)&&renal<.55)
   exposureRisks.push({id,warning:'Reserva renal baja: revisar adecuación y toxicidad; NO implica lesión renal instantánea.'});
  if(id==='anticoagulation'){
   const bad=csHeparinIssue487('heparina IV',c,patient);
   if(bad)exposureRisks.push({id,warning:'Reevaluar anticoagulación: '+bad});
  }
 }
 return {caseId:c?.id||null,catalogueSize:native.size,knownRoles:declared.length,
  missingFromCatalogue:declared.filter(id=>!native.has(id)),roles:{
   dynamic:[...DYNAMIC_THERAPIES_487],requirement:[...COMPLIANCE_THERAPIES_487]},
  required,missing,coverageComplete,coverageSets:cover,delivered:declared.filter(delivered),
  exposureRisks,heparinComplete:delivered('anticoagulation'),
  // A fulfilled requirement is NEVER proof of clinical stabilization or discharge.
  safeForDischarge:null,patientId};
}
