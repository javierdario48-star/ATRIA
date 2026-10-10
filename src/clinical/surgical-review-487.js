// ATRIA QA: clinical surgical acceptance depends on stated impression + existing evidence.
// No new medical facts, no diagnostic spoilers, and no surgery executed on consultation.
export function csSurgicalReview487(s={},c={}) {
 const norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const dx=String(s.diagnosis||'').trim(),hasDx=!!dx,dxBroad=/^(peritonitis|abdomen agudo|sepsis|infeccion abdominal)$/i.test(norm(dx.trim()));
 const hasVitals=!!s.vitalsKnown,hasExam=!!s.examDone||Number(s.examRegions||0)>=2;
 const sys=Number(s.sys||120),critical=sys<90||s.initialShock===true;
 const matched=!!s.diagnosticCompatible;
 const surgicalSource=(c.keyInterventions||[]).includes('source_control')||(c.keyInterventions||[]).includes('surgery');
 if(!hasDx||dxBroad)return {accepted:false,reason:'Falta registrar una impresión diagnóstica suficientemente específica para fundamentar el pedido.',status:'missing-dx'};
 if(!matched)return {accepted:false,reason:'La impresión registrada no concuerda suficientemente con la evaluación documentada para fundamentar esta indicación.',status:'unsubstantiated'};
 // Suspected secondary perforation with documented shock justifies an urgent
 // surgical TEAM evaluation while the focused exam is completed in parallel.
 // This is not an operation and never bypasses the separate handoff safety gate.
 if(!hasVitals||(!hasExam&&!(critical&&c.id==='PERI-SEC-001')))
   return {accepted:false,reason:'La sospecha es razonable, pero faltan signos vitales y examen físico dirigido para valorar la indicación.',status:'missing-exam'};
 if(!surgicalSource)return {accepted:false,reason:'Con los hallazgos disponibles no hay una indicación de control quirúrgico inmediato. Continuar reevaluación del foco y la evolución.',status:'review'};
 const imaging=!!s.imagingDone;
 if(!critical&&!imaging&&(c.id==='PERI-SEC-001'||c.id==='MESI-001'))
   return {accepted:false,reason:'La sospecha es compatible, pero para este paciente estable todavía falta imagen orientadora o evidencia clínica de urgencia suficiente.',status:'missing-evidence'};
 // No BP cutoff is used to DENY an urgent operation: support continues in parallel.
 return {accepted:true,reason:!hasExam?'Shock y sospecha específica de foco quirúrgico: aceptamos evaluación urgente mientras completan el examen y la reanimación. Esto no autoriza todavía el traslado.':'La impresión diagnóstica y los hallazgos sustentan evaluación quirúrgica urgente. Aceptamos el traslado; mantener reanimación y soporte durante la preparación.',status:'accepted'};
}
