// Presentation only: accepts confirmed snapshots and emits markup. No executor.
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const examNames={general:'Impresión general',inspection:'Inspección',auscultation:'Auscultación',percussion:'Percusión',palpation:'Palpación'};
export function vitalsHTML(patient){
 if(!patient.lastVitalsKnown)return '<p>Los signos todavía no se registraron.</p>';
 const v=patient.lastVitalsKnown.vitals;
 return '<small>Última medición registrada</small><b>PA '+Math.round(v.sys)+'/'+Math.round(v.dia)+'</b> · FC '+Math.round(v.hr)+' lpm · FR '+Math.round(v.rr)+' · SpO₂ '+Math.round(v.spo2)+'% · '+v.temp.toFixed(1)+' °C';
}
export function examHTML(patient){return Object.entries(patient.exam||{}).map(([id,data])=>
 '<section class="clinical-section"><b>'+esc(examNames[id])+'</b>'+data.rows.map(row=>'<p><strong>'+esc(row.organ)+':</strong> '+esc(row.text)+'</p>').join('')+'</section>').join('')||'<p>Elegí una técnica para explorar al paciente.</p>';}
export function therapyHTML(patient){
 const confirmed=(patient.treatments||[]).map(t=>'<div class="clinical-section"><b>'+esc(t.label)+'</b><small>Ejecutado'+(t.dose?' · '+esc(t.dose.display)+(t.dose.defaultApplied?' · dosis predeterminada':''):'')+'</small></div>');
 const pending=(patient.pendingTreatments||[]).map(t=>'<div class="clinical-section"><b>'+esc(t.id)+'</b><small>Indicado · en preparación · aún no administrado</small></div>');
 return [...pending,...confirmed].join('')||'<p>Sin intervenciones ejecutadas.</p>';
}
export function cirrPatientHTML(p){return `
 <div id="clinicalVitals" class="clinical-section"></div>
 <div class="actions"><button data-action="record-vitals">Signos vitales</button><button data-action="examination">Examen físico</button><button data-action="studies">Estudios</button><button data-action="treatment">Tratamiento</button><button data-action="reassess">Reevaluar</button></div>
 <details><summary>Anamnesis registrada</summary><div id="clinicalHistory"></div></details>
 <details><summary>Intervenciones confirmadas</summary><div id="therapyRecords"></div></details>
 <label class="field">Impresión diagnóstica<input id="diagnosisInput" maxlength="200" value="${esc(p.diagnosis)}" placeholder="Escribí tu impresión diagnóstica"></label>
 <div class="actions"><button data-action="save-diagnosis">Registrar impresión</button></div>
 <p id="caseReadiness" class="note"></p><div id="caseDestinations" class="actions"></div><div id="caseResult" role="status"></div>
 <p class="note">CIRR conserva los signos del modelo original: no simula una reducción rápida de ascitis ni de diuresis por espironolactona. El destino indica continuidad del cuidado.</p>`;}
