import {CLINICAL_CONTROLS} from '../content/clinical-controls.js';
import {clinicalWorkflow} from './clinical-workflow.js';
import {destinationButtonsHTML} from './diagnostic-impression.js';
import {esc} from './render-content.js';

/** A small closure decision surface, never an alternative closure executor. */
export function closureDecisionHTML(state){
 const p=state?.patient;if(!p)return '';
 const steps=clinicalWorkflow(state)?.steps||[];
 const canEdit=state.canEdit!==false&&!p.caseEnded&&!p.patientDied;
 // An attempt is always offered; only the native evaluator accepts it.
 const choices=canEdit?['observacion','sala','alta','quirofano','uti','procedimiento']:[];
 const diagnostic=String(p.diagnosis||'').trim();
 const debit=(state.dischargeRewards??state.progress?.penalties??[]).find(row=>
  row.kind==='clinical.unsafe-discharge'&&row.patientUid===p.uid&&row.actorId===state.hintBinding?.actorId);
 const pendingDebit=debit?.creditStatus==='pending';
 const confirmedLoss=Number.isSafeInteger(debit?.loss)&&(debit.creditStatus==='credited'||state.room?.mode!=='coop');
 const consequence=debit?'<p class="note" role="status">Alta insegura registrada. La atención sigue disponible.'+
  (pendingDebit?' Confirmando el descuento de XP…':confirmedLoss?
   (debit.loss?' <strong class="score-loss">−'+debit.loss+' XP</strong>':' Saldo disponible: 0 XP.'):'')+'</p>':'';
 const pending=steps.filter(s=>s.status==='pending'||s.status==='partial'||s.status==='attention')
  .map(s=>s.label);
 return '<div class="case-close-content">'+
  '<h2>'+CLINICAL_CONTROLS.closureTitle+'</h2><p class="case-close-subtitle">Definí el destino del paciente cuando corresponda.</p>'+
  '<div class="case-close-diagnosis"><span>Tu impresión diagnóstica</span><strong>'+
    esc(diagnostic||'Todavía no registrada')+'</strong></div>'+
  consequence+
  (choices.length?
   '<button type="button" data-action="observe-patient">Mantener en observación</button>'+
   '<p class="case-close-ready">Seleccioná un destino para evaluar el cierre</p>'+
   '<div id="caseClosureOptions" class="case-close-choices">'+destinationButtonsHTML(choices)+'</div>'+
   '<p class="case-close-note">Enfermería verifica los signos registrados y coordina la recepción cuando el destino lo requiere.</p>':
   '<p class="case-close-waiting">El servidor aún no habilita un destino de cierre.</p>'+
   '<p class="case-close-note">Revisá la atención documentada y las tareas que siguen pendientes.</p>'+
   (pending.length?'<div class="case-close-pending">Por revisar: '+esc(pending.slice(0,4).join(' · '))+'</div>':''))+
  '<div class="actions case-close-actions">'+
   (canEdit?'<button type="button" data-action="close-diagnosis">Impresión diagnóstica</button>':'')+
   '<button type="button" class="primary" data-action="close">Continuar guardia</button></div>'+
  '</div>';
}
