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
 const debits=(state.dischargeRewards??state.progress?.penalties??[]).filter(row=>
  ['clinical.unsafe-discharge','clinical.unsafe-observation'].includes(row.kind)&&
  row.patientUid===p.uid&&row.actorId===state.hintBinding?.actorId);
 const pendingDebit=debits.some(row=>row.creditStatus==='pending');
 const loss=debits.filter(row=>row.creditStatus!=='pending'&&
  (row.creditStatus==='credited'||state.room?.mode!=='coop')).reduce((n,row)=>n+Number(row.loss||0),0);
 const consequence=debits.length?'<p class="note" role="status">Decisión de cierre insegura registrada. La atención sigue disponible.'+
  (pendingDebit?' Confirmando el descuento de XP…':'')+
  (loss?' <strong class="score-loss">−'+loss+' XP</strong>':'')+'</p>':'';
 const pending=steps.filter(s=>s.status==='pending'||s.status==='partial'||s.status==='attention')
  .map(s=>s.label);
 return '<div class="case-close-content">'+
  '<h2>'+CLINICAL_CONTROLS.closureTitle+'</h2><p class="case-close-subtitle">Podés elegir cualquier destino; una decisión insegura será evaluada por Dr. Vega.</p>'+
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

/** Visual receipt, not a second disposition evaluator or a second XP owner.
 * Rendering is based only on the immutable response from the clinical server.
 */
export function unsafeDispositionVegaHTML(receipt){
 const kind=receipt?.disposition?.kind;
 if(!['clinical.unsafe-discharge','clinical.unsafe-observation'].includes(kind))return '';
 const loss=Number.isSafeInteger(receipt.disposition.penaltyLoss)?receipt.disposition.penaltyLoss:0;
 const title=kind==='clinical.unsafe-discharge'?'Alta insegura':'Observación insegura';
 const debt=Number.isSafeInteger(receipt.disposition.xpDebt)?receipt.disposition.xpDebt:0;
 return '<section class="case-close-content vega-clinical-reprimand" role="alert" aria-live="assertive">'+
  '<h2>Dr. Vega — '+title+'</h2>'+
  '<p class="note">'+esc(receipt.message||'Esa decisión no es segura para el paciente.')+'</p>'+
  (loss?'<p class="score-loss"><strong>−'+loss+' XP</strong> por esta decisión</p>':
   '<p class="note">La sanción ya estaba registrada; no se vuelve a descontar.</p>')+
  (debt?'<p class="note">Experiencia pendiente de recuperar: '+debt+' XP.</p>':'')+
  '<p><strong>El caso no terminó.</strong> El paciente conserva su estado y puede ser atendido nuevamente por ti u otro médico autorizado.</p>'+
  '<div class="actions"><button type="button" class="primary" data-action="close">Volver al paciente</button></div>'+
  '</section>';
}
