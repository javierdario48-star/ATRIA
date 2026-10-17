// Presentation only: accepts confirmed snapshots and emits markup. No executor.
import {EXAM_TECHNIQUES} from '../clinical/physical-exam.js';
import {ecgPresentation} from '../clinical/ecg-morphology.js';
import {confirmedFluidFeedback,fluidFeedbackLabel} from '../clinical/fluid-feedback.js';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const examNames=EXAM_TECHNIQUES;
export function vitalsHTML(patient){
 if(!patient.lastVitalsKnown)return '<p>Los signos todavía no se registraron.</p>';
 const v=patient.lastVitalsKnown.vitals;
 return '<small>'+(patient.caseEnded?'Última medición al cierre':patient.procedures?.monitor?.connected?'Monitorización continua':'Última medición registrada')+'</small><b>PA '+Math.round(v.sys)+'/'+Math.round(v.dia)+'</b> · FC '+Math.round(v.hr)+' lpm · FR '+Math.round(v.rr)+' · SpO₂ '+Math.round(v.spo2)+'% · '+v.temp.toFixed(1)+' °C';
}
/** Bedside device view: read-only snapshot. No ECG diagnosis or fabricated live data.
 * Animated pulse trace is a presentation cue, NOT a derived ECG measurement.
 */
export function monitorHTML(patient){
 const connected=!!patient.procedures?.monitor?.connected&&!patient.caseEnded;
 const measured=patient.lastVitalsKnown?.vitals||null;
 const shown=(name,format)=>measured&&Number.isFinite(measured[name])?format(measured[name]):'—';
 const status=patient.caseEnded?'Atención cerrada':connected?'Monitorización continua':'Monitor desconectado';
 const note=patient.caseEnded?'Registro final · sin vigilancia continua':
  connected?'Valores medidos · seguimiento continuo':'Última lectura disponible · sin vigilancia continua';
 const ecg=ecgPresentation(patient);
 const trace=ecg.connected&&(ecg.measured||['asystole','ventricular_fibrillation'].includes(ecg.rhythm)&&ecg.rhythmSource==='case-rule');
 const metric=(name,value,unit,className)=>'<div class="device-value '+className+'"><span>'+name+'</span><strong>'+value+
  '</strong><small>'+unit+'</small></div>';
 return '<div class="device-top"><span class="device-indicator '+(connected?'active':'')+'"></span><span>'+status+
  '</span><span class="device-patient">PACIENTE · '+esc(patient.uid)+'</span></div>'+
  '<div class="device-readings" aria-label="Última medición conocida">'+
  metric('FC',shown('hr',Math.round),'lpm','heart')+
  metric('SPO₂',shown('spo2',Math.round),'%','oxygen')+
  metric('PRESIÓN ARTERIAL',measured?shown('sys',Math.round)+'/'+shown('dia',Math.round):'—','mmHg','pressure')+
  metric('FR',shown('rr',Math.round),'rpm','breath')+
  metric('TEMPERATURA',shown('temp',n=>n.toFixed(1)),'°C','temperature')+'</div>'+
  '<div class="device-trace '+(trace?'live':'idle')+'" aria-label="'+
   (trace?'ECG simulado a partir del ritmo autorizado para este paciente; no es un registro diagnóstico':'Sin señal continua disponible')+'">'+
  (trace?'<svg viewBox="0 0 560 76" preserveAspectRatio="none" aria-hidden="true"><path id="monitorEcgPath" d=""/></svg>':
   '<div class="device-no-signal">SIN TRAZADO CONTINUO</div>')+'</div>'+
  '<div class="device-bottom"><span>'+note+'</span><span>'+
  (trace?esc(ecg.label)+' · '+(ecg.rhythmSource==='case-rule'?'PATRÓN DEL CASO':'MODELO SINUSAL')+' · SIMULACIÓN, NO ECG DIAGNÓSTICO':
   'SIN DATOS ELECTROCARDIOGRÁFICOS')+'</span></div>';
}
export function examHTML(patient){return Object.entries(patient.exam||{}).map(([id,data])=>
 '<section class="clinical-section"><b>'+esc(examNames[id])+'</b>'+data.rows.map(row=>'<p><strong>'+esc(row.organ)+':</strong> '+esc(row.text)+'</p>').join('')+'</section>').join('')||'<p>Elegí una técnica para explorar al paciente.</p>';}
export function therapyHTML(patient){
 const fluid=patient.uid&&patient.caseId?
  confirmedFluidFeedback(patient,{id:patient.caseId,vitals:patient.baselineVitals}):null;
 const fluidRow=fluid?.administrations?'<div class="clinical-section" data-fluid-total-ml="'+fluid.totalMl+
  '"><b>Ringer acumulado, realmente administrado</b><small>'+
  esc(fluidFeedbackLabel(fluid))+'</small></div>':'';
 const confirmed=(patient.treatments||[]).map(t=>'<div class="clinical-section"><b>'+esc(t.label)+'</b><small>Ejecutado'+(t.dose?' · '+esc(t.dose.display)+(t.dose.defaultApplied?' · dosis predeterminada':''):'')+'</small></div>');
 const pending=(patient.pendingTreatments||[]).map(t=>'<div class="clinical-section"><b>'+esc(t.label||t.id)+'</b><small>Indicado · en preparación · aún no administrado</small></div>');
 const venous=patient.venousAccessCount?'<div class="clinical-section"><b>Vías venosas confirmadas</b><small>'+patient.venousAccessCount+'</small></div>':'';
 const consults=(patient.consults||[]).map(c=>'<div class="clinical-section"><b>Cirugía</b><small>Recepción confirmada · derivación pendiente</small></div>');
 const pendingConsults=(patient.pendingConsults||[]).map(c=>'<div class="clinical-section"><b>Cirugía</b><small>Respuesta pendiente · no aceptada aún</small></div>');
 return [venous,fluidRow,...pending,...pendingConsults,...confirmed,...consults].join('')||'<p>Sin intervenciones ejecutadas.</p>';
}
export function historyHTML(p){
 const sections=[['Anamnesis adquirida',p.intentHistory?.map(x=>'<p>'+esc(x.answer)+'</p>').join('')||'<p>Todavía no interrogado.</p>'],
  ['Signos registrados',vitalsHTML(p)],['Examen realizado',examHTML(p)],
  ['Glasgow',p.glasgow?Object.entries(p.glasgow).filter(([k])=>['eye','verbal','motor'].includes(k)).map(([,v])=>'<p>'+esc(v.text)+' · '+(v.score??'NT')+'</p>').join('')+
   '<p>Total: '+(p.glasgow.total??'incompleto o no evaluable')+'</p>':'<p>Todavía no evaluado.</p>'],
  ['Estudios y resultados',(p.orders||[]).map(o=>'<p><b>'+esc(o.label)+'</b> · '+(o.status==='done'?'Resultado disponible: '+esc(o.result):'Pendiente')+'</p>').join('')||'<p>No solicitados.</p>'],
  ['Tratamiento y consultas',therapyHTML(p)]];
 const interview=p.interview,labels={place:'Localización',onset:'Antigüedad',radiation:'Irradiación / desplazamiento',character:'Carácter',intensity:'Intensidad',worse:'Agravantes',relief:'Atenuantes'};
 if(Object.keys(interview?.dimensions||{}).length)sections.splice(1,0,['ALiCIA · datos obtenidos',
  Object.entries(interview.dimensions).map(([id,data])=>'<p><strong>'+esc(labels[id])+':</strong> '+esc(data.answer)+'</p>').join('')]);
 if(interview?.subjective)sections.push(['Última respuesta subjetiva','<p>'+esc(interview.subjective.answer)+'</p>']);
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
