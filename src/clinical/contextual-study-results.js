// Conservatively link non-algorithmic orders to existing native results for the SAME case.
// Never invent analytic values: an unlinked study returns its established normal/negative fallback.
export const CASE_STUDY_CORRELATIONS=Object.freeze({"CIRR-001":{"pbe_cbc":"hemograma","chole_cbc":"hemograma","chole_liver":"hepatograma","pbe_renal":"renal"},"PANC-001":{"app_cbc":"hemograma","pbe_cbc":"hemograma","chole_cbc":"hemograma","renal":"hemograma","peri_gas":"gasometria","ileo_gas":"gasometria","mesi_gas":"gasometria"},"CROHN-001":{"hemograma":"inflamatorio","pbe_cbc":"inflamatorio","chole_cbc":"inflamatorio","app_cbc":"inflamatorio"},"HDA-001":{"hemograma":"hda_lab","pbe_cbc":"hda_lab","renal":"hda_lab"},"COLON-001":{"hemograma":"iron","pbe_cbc":"iron","chole_cbc":"iron"},"PERI-PBE-001":{"hemograma":"pbe_cbc","chole_cbc":"pbe_cbc","renal":"pbe_renal","paracentesis":"pbe_paracentesis"},"PERI-SEC-001":{"hemograma":"peri_cbc","pbe_cbc":"peri_cbc","chole_cbc":"peri_cbc","gasometria":"peri_gas","renal":"peri_gas","tc":"peri_ct"},"PERI-TER-001":{"hemograma":"ter_cbc","renal":"ter_cbc","tc":"ter_ct"},"APP-001":{"hemograma":"app_cbc","pbe_cbc":"app_cbc","chole_cbc":"app_cbc","tc":"app_ct","eco":"app_us"},"CHOLE-001":{"hemograma":"chole_cbc","pbe_cbc":"chole_cbc","hepatograma":"chole_liver","eco":"chole_us"},"ILEO-001":{"hemograma":"ileo_lab","renal":"ileo_lab","gasometria":"ileo_gas","tc":"ileo_ct"},"MESI-001":{"hemograma":"mesi_lab","gasometria":"mesi_gas"},"CHOLANG-001":{"hemograma":"cholang_cbc","renal":"cholang_cbc","hepatograma":"cholang_liver","eco":"cholang_us"}});
export const CASE_INCIDENTAL_FINDINGS=Object.freeze({"PANC-001":{"amilasa":"Amilasa sérica: elevada, compatible con la pancreatitis aguda. No se dispone de concentración numérica."},"CHOLE-001":{"lipasa":"Lipasa sérica: elevación discreta, menor de 3 veces el límite superior de referencia. Hallazgo inespecífico, por sí solo no diagnóstico de pancreatitis aguda."}});
export function csCaseStudyFallback(study,currentCase){
 const id=String(study?.id||''),caseId=String(currentCase?.id||'');
 const own=(currentCase?.studies||[]).find(s=>s.id===id);
 if(own)return own.result;
 const sourceId=CASE_STUDY_CORRELATIONS[caseId]?.[id];
 if(sourceId){
  const source=(currentCase?.studies||[]).find(s=>s.id===sourceId);
  if(source?.result)return String(study.label||id)+': hallazgos concordantes con el panel '+String(source.label||sourceId)+': '+String(source.result);
 }
 const incident=CASE_INCIDENTAL_FINDINGS[caseId]?.[id];
 if(incident)return incident;
 return study?.normalResult||null;
}
