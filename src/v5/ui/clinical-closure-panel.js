import {clinicalWorkflow} from './clinical-workflow.js';
import {destinationButtonsHTML} from './diagnostic-impression.js';
import {esc} from './render-content.js';

/** A small closure decision surface, never an alternative closure executor. */
export function closureDecisionHTML(state){
 const p=state?.patient;if(!p)return '';
 const steps=clinicalWorkflow(state)?.steps||[];
 const canEdit=state.canEdit!==false&&!p.caseEnded&&!p.patientDied;
 const choices=canEdit?(state.eligibleDestinations||[]):[];
 const diagnostic=String(p.diagnosis||'').trim();
 const pending=steps.filter(s=>s.status==='pending'||s.status==='partial'||s.status==='attention')
  .map(s=>s.label);
 return '<div class="case-close-content">'+
  '<h2>Cierre de atención</h2><p class="case-close-subtitle">Definí el destino del paciente cuando corresponda.</p>'+
  '<div class="case-close-diagnosis"><span>Tu impresión diagnóstica</span><strong>'+
    esc(diagnostic||'Todavía no registrada')+'</strong></div>'+
  (choices.length?
   '<p class="case-close-ready">Destino disponible para evaluación</p>'+
   '<div id="caseDestinations" class="case-close-choices">'+destinationButtonsHTML(choices)+'</div>'+
   '<p class="case-close-note">La elección pasa por el servidor. Una interconsulta no garantiza aceptación.</p>':
   '<p class="case-close-waiting">El servidor aún no habilita un destino de cierre.</p>'+
   '<p class="case-close-note">Revisá la atención documentada. La lista de seguimiento orienta sin revelar los criterios ocultos de cada caso.</p>'+
   (pending.length?'<div class="case-close-pending">Por revisar: '+esc(pending.slice(0,4).join(' · '))+'</div>':''))+
  '<div class="actions case-close-actions">'+
   (canEdit?'<button type="button" data-action="close-diagnosis">Impresión diagnóstica</button>':'')+
   '<button type="button" class="primary" data-action="close">Continuar guardia</button></div>'+
  '</div>';
}
