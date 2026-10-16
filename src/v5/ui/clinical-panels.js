// Presentation only: accepts confirmed snapshots and emits markup. No executor.
import {EXAM_TECHNIQUES} from '../clinical/physical-exam.js';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const examNames=EXAM_TECHNIQUES;
export function vitalsHTML(patient){
 if(!patient.lastVitalsKnown)return '<p>Los signos todavía no se registraron.</p>';
 const v=patient.lastVitalsKnown.vitals;
 return '<small>'+(patient.caseEnded?'Última medición al cierre':patient.procedures?.monitor?.connected?'Monitorización continua':'Última medición registrada')+'</small><b>PA '+Math.round(v.sys)+'/'+Math.round(v.dia)+'</b> · FC '+Math.round(v.hr)+' lpm · FR '+Math.round(v.rr)+' · SpO₂ '+Math.round(v.spo2)+'% · '+v.temp.toFixed(1)+' °C';
}
export function monitorHTML(patient){
 const connected=!!patient.procedures?.monitor?.connected&&!patient.caseEnded;
 return '<div class="monitor-state '+(connected?'connected':'')+'"><b>'+(patient.caseEnded?'Atención cerrada':connected?'Monitorización continua':'Monitor desconectado')+'</b>'+
  (patient.caseEnded?'<small>Registro final de la atención · sin monitorización continua.</small>':connected?'<small>Paciente conectado · observaciones actuales</small>':'<small>Conectá el monitor o registrá una medición puntual.</small>')+'</div>'+
  '<div class="clinical-section">'+vitalsHTML(patient)+'</div>';
}
export function examHTML(patient){return Object.entries(patient.exam||{}).map(([id,data])=>
 '<section class="clinical-section"><b>'+esc(examNames[id])+'</b>'+data.rows.map(row=>'<p><strong>'+esc(row.organ)+':</strong> '+esc(row.text)+'</p>').join('')+'</section>').join('')||'<p>Elegí una técnica para explorar al paciente.</p>';}
export function therapyHTML(patient){
 const confirmed=(patient.treatments||[]).map(t=>'<div class="clinical-section"><b>'+esc(t.label)+'</b><small>Ejecutado'+(t.dose?' · '+esc(t.dose.display)+(t.dose.defaultApplied?' · dosis predeterminada':''):'')+'</small></div>');
 const pending=(patient.pendingTreatments||[]).map(t=>'<div class="clinical-section"><b>'+esc(t.label||t.id)+'</b><small>Indicado · en preparación · aún no administrado</small></div>');
 const venous=patient.venousAccessCount?'<div class="clinical-section"><b>Vías venosas confirmadas</b><small>'+patient.venousAccessCount+'</small></div>':'';
 const consults=(patient.consults||[]).map(c=>'<div class="clinical-section"><b>Cirugía</b><small>Recepción confirmada · derivación pendiente</small></div>');
 const pendingConsults=(patient.pendingConsults||[]).map(c=>'<div class="clinical-section"><b>Cirugía</b><small>Respuesta pendiente · no aceptada aún</small></div>');
 return [venous,...pending,...pendingConsults,...confirmed,...consults].join('')||'<p>Sin intervenciones ejecutadas.</p>';
}
export function historyHTML(p){
 const sections=[['Anamnesis adquirida',p.intentHistory?.map(x=>'<p>'+esc(x.answer)+'</p>').join('')||'<p>Todavía no interrogado.</p>'],
  ['Signos registrados',vitalsHTML(p)],['Examen realizado',examHTML(p)],
  ['Glasgow',p.glasgow?Object.entries(p.glasgow).filter(([k])=>['eye','verbal','motor'].includes(k)).map(([,v])=>'<p>'+esc(v.text)+' · '+(v.score??'NT')+'</p>').join('')+
   '<p>Total: '+(p.glasgow.total??'incompleto o no evaluable')+'</p>':'<p>Todavía no evaluado.</p>'],
  ['Estudios y resultados',(p.orders||[]).map(o=>'<p><b>'+esc(o.label)+'</b> · '+(o.status==='done'?'Resultado disponible: '+esc(o.result):'Pendiente')+'</p>').join('')||'<p>No solicitados.</p>'],
  ['Tratamiento y consultas',therapyHTML(p)]];
 return sections.map(([title,body])=>'<section class="clinical-section"><h3>'+title+'</h3>'+body+'</section>').join('');
}
export function patientHTML(p){return `
 <div id="clinicalVitals" class="clinical-section"></div>
 <div class="clinical-actions"><button data-action="examination">Examen físico</button><button data-action="clinical-history">Historia clínica</button><button data-action="record-vitals">Signos vitales</button><button data-action="studies">Estudios</button><button data-action="treatment">Tratamiento</button><button data-action="reassess">Reevaluar</button></div>
 <details><summary>Anamnesis registrada</summary><div id="clinicalHistory"></div></details>
 <details><summary>Intervenciones confirmadas</summary><div id="therapyRecords"></div></details>
 <label class="field">Impresión diagnóstica<input id="diagnosisInput" maxlength="200" value="${esc(p.diagnosis)}" placeholder="Escribí tu impresión diagnóstica"></label>
 <div class="actions"><button data-action="save-diagnosis">Registrar impresión</button></div>
 <p id="caseReadiness" class="note"></p><div id="caseDestinations" class="actions"></div><div id="caseResult" role="status"></div>
 <p class="note">${p.caseId==='APP-001'?'La derivación a quirófano requiere valoración quirúrgica y continuidad del cuidado; no acredita una apendicectomía realizada.':'La espironolactona no produce una reducción inmediata de ascitis en este escenario. Continuá el seguimiento.'}</p>`;}
export const cirrPatientHTML=patientHTML,appPatientHTML=patientHTML;
