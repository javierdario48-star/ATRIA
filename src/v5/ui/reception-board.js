import {receptionAcuity,SHIFT_DURATION_SECONDS} from '../clinical/shift-flow.js';
import {esc} from './render-content.js';

// Confirmed occupants only: this view never creates a medical patient and
// never mistakes an unconnected monitor for an active physiological feed.
export function receptionBoardHTML({patients=[],cases=[],clinical=null,elapsedSeconds=0}={}){
 const byCase=new Map(cases.map(c=>[c.id,c]));
 const normalized=patients.map(p=>{
  const caseData=byCase.get(p.caseId),actual=clinical?.patient?.uid===p.uid?clinical.patient:null;
  const acuity=receptionAcuity(caseData,actual);
  return {...p,acuity,caseData,closed:!!actual?.caseEnded};
 });
 const minutes=Math.min(SHIFT_DURATION_SECONDS,Math.max(0,Number(elapsedSeconds)||0));
 const clock=String((8+Math.floor((15+Math.floor(minutes))/60))%24).padStart(2,'0')+':'+
  String((15+Math.floor(minutes))%60).padStart(2,'0');
 const rows=normalized.map(p=>'<article class="reception-patient" data-patient-uid="'+esc(p.uid)+
  '" data-acuity="'+esc(p.acuity.state)+'"><strong>'+esc(p.bedId)+' · '+
  esc(p.name||p.caseData?.demo||'Paciente')+'</strong>'+
  '<span class="reception-label" aria-label="Clasificación de triaje">'+esc(p.closed?'ATENCIÓN CERRADA':p.acuity.label)+'</span>'+
  '<small>'+esc(p.chief||p.caseData?.chief||'Consulta clínica')+'</small>'+
  '<small>'+esc(p.closed?'Caso finalizado':'Triaje de ingreso · no sustituye el monitor clínico')+'</small></article>').join('');
 return '<h2>Recepción · guardia</h2><p>Hora simulada '+clock+
  ' · '+Math.max(0,Math.ceil((SHIFT_DURATION_SECONDS-minutes)/60))+
  ' h restantes</p><p>La prioridad se clasifica por signos iniciales y riesgo conocido. Los monitores muestran únicamente valores confirmados.</p>'+
  '<section class="reception-patients">'+(rows||'<p>No hay pacientes admitidos.</p>')+'</section>';
}
