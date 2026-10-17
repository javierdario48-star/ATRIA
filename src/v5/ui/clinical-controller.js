import {patientHTML,vitalsHTML,therapyHTML,monitorHTML,historyHTML,esc} from './clinical-panels.js';
import {examinationHTML,renderExamination} from './examination-panel.js';
import {setHTML} from './render-content.js';
import {ecgPresentation} from '../clinical/ecg-morphology.js';
import {caseDebriefHTML} from './case-debrief.js';
import {createEcgSweep} from './ecg-sweep.js';
import {monitorOrderExamples} from './monitor-order-suggestions.js';
import {monitorOrderLedger,administeredTreatmentHistory,latestMonitorOrderState} from './monitor-order-ledger.js';
import {diagnosisEditorHTML,diagnosisSuggestionsHTML,destinationButtonsHTML} from './diagnostic-impression.js';

/** UI state only. Every clinical action keeps its explicit UID and uses send().
 * The app owns the dialog and event listener; this controller owns neither timers nor listeners.
 */
export function createClinicalInterface({document,session,open,close,send,onTalk,notify,cases=[]}){
 const ui=id=>document.getElementById(id);
 let patientUid=null,regionId='general',showOrderHints=false,lastEcgAt=-Infinity,lastMonitorOrderId=null;
 const ecgSweep=createEcgSweep();
 const state=()=>{const s=session()?.read();return s&&s.patient.uid===patientUid?s:null;};
 const post=text=>send(text,{patientUid});
 function showPatient(patient){
  const s=session()?.read();if(!s||s.patient.uid!==patient.uid){notify('Ese paciente no está disponible en esta guardia.');return;}
  patientUid=patient.uid;
  open('<h2>'+esc(patient.bedId||'Paciente')+' · Paciente</h2><p>'+esc(patient.name||'')+'</p><div class="note">'+esc(patient.chief||'')+'</div>'+
   (s.patient.liveVitals?patientHTML(s.patient,{readOnly:s.canEdit===false||s.patient.caseEnded}):'<p>Atención completa de este caso en migración.</p><div class="actions"><button data-action="studies">Estudios</button></div>')+
   '<div class="actions"><button data-action="patient-target">Interrogar</button><button data-action="close">Cerrar</button></div>');
  ui('modalContent').dataset.patientUid=patientUid;render();renderDiagnosisSuggestions();
 }
 function showDiagnosis(patient){
  const s=session()?.read();if(!s||s.patient.uid!==patient.uid||!s.patient.liveVitals)return;
  patientUid=patient.uid;
  open('<h2>'+esc(patient.bedId||'Paciente')+' · Impresión diagnóstica</h2>'+
   diagnosisEditorHTML(s.patient,{readOnly:s.canEdit===false||s.patient.caseEnded})+
   '<div class="actions"><button data-action="close">Cerrar</button></div>','diagnosis');
  ui('modalContent').dataset.patientUid=patientUid;renderDiagnosisSuggestions();
  ui('diagnosisInput')?.focus({preventScroll:true});
 }
 function renderDiagnosisSuggestions(){
  const field=ui('diagnosisInput');
  if(field&&!field.readOnly)setHTML(ui('diagnosisSuggestions'),diagnosisSuggestionsHTML(cases,field.value));
 }
 async function saveDiagnosis(clear=false){
  const s=state(),field=ui('diagnosisInput');
  if(!s||s.canEdit===false||s.patient.caseEnded||!field||field.readOnly)return;
  const text=field.value.trim();if(!clear&&!text)return;
  await post(clear?'/diagnostico-borrar':'/diagnostico '+text);
  if(state()?.patient.uid!==s.patient.uid)return;
  field.value=state().patient.diagnosis;renderDiagnosisSuggestions();render();
 }
 async function chooseDestination(patient,id){
  const s=session()?.read();if(!s||s.patient.uid!==patient.uid||s.canEdit===false||!s.eligibleDestinations?.includes(id))return;
  patientUid=patient.uid;await post('/disposicion '+id);
 }
 function showMonitor(patient){
  const s=session()?.read();if(!s||s.patient.uid!==patient.uid||!s.patient.liveVitals){notify('Monitor clínico todavía no disponible para este caso.');return;}
  patientUid=patient.uid;
  showOrderHints=false;lastEcgAt=-Infinity;lastMonitorOrderId=null;ecgSweep.reset();
  open('<div class="bedside-monitor-header"><span class="monitor-device-led" aria-hidden="true"></span><div><h2>Monitor · '+esc(patient.bedId)+'</h2><small>PANTALLA DE CABECERA · '+esc(patient.bedId)+'</small></div></div>'+
   '<div id="bedsideMonitor" class="bedside-monitor-screen"></div>'+
   '<section class="monitor-prescription" aria-label="Indicaciones desde el monitor">'+
    '<div class="monitor-prescription-heading"><label for="monitorOrderInput">INDICAR A ENFERMERÍA</label>'+
    '<button type="button" data-action="monitor-hint" aria-pressed="false">💡 Pistas</button></div>'+
    '<div class="monitor-order-row"><input id="monitorOrderInput" type="text" autocomplete="off" maxlength="200" '+
     'aria-label="Buscar o escribir orden de enfermería" aria-controls="monitorOrderSuggestions" '+
     'placeholder="Buscar: Ringer, espironolactona…"/>'+
    '<button type="button" class="primary" data-action="monitor-order-submit">Indicar</button></div>'+
    '<div id="monitorOrderSuggestions" class="monitor-suggestions" aria-live="polite"></div>'+
    '<p id="monitorOrderFeedback" class="monitor-feedback" role="status" hidden></p>'+
    '<small>Las sugerencias no administran nada: cada orden pasa por enfermería y el motor clínico.</small>'+
   '</section>'+
   '<details class="monitor-order-history" open><summary>Historial de intervenciones y medicamentos</summary>'+
    '<div id="monitorMedicationHistory"></div><div id="monitorOrderHistory"></div></details>'+
   '<div class="bedside-monitor-toolbar" aria-label="Controles del monitor">'+
   '<button data-action="toggle-monitor" class="primary"></button><button data-action="record-vitals">Medir ahora</button>'+
   '<button data-action="patient-chart">Historia</button></div>','monitor');
  ui('modalContent').dataset.patientUid=patientUid;render();renderOrderSuggestions();
 }
 /** Invoked by the world-anchored patient menu; clinical actions still use
  * the existing session, UID, room authority and panel handlers.
  */
 function openSection(patient,section){
  const s=session()?.read();
  if(!s||s.patient.uid!==patient?.uid){notify('Paciente no disponible en esta guardia.');return;}
  patientUid=patient.uid;
  if(section==='talk'){onTalk(patient.uid);return;}
  if(section==='examination'){regionId='general';open(examinationHTML());render();return;}
  if(section==='history'){showHistory();return;}
  if(section==='studies'){showStudies();return;}
  if(section==='treatment'){showTreatment();return;}
  if(section==='patient'){showPatient(patient);return;}
  if(section==='diagnosis'){showDiagnosis(patient);return;}
 }
 function renderOrderSuggestions(){
  const input=ui('monitorOrderInput'),target=ui('monitorOrderSuggestions');
  if(!input||!target)return;
  const options=monitorOrderExamples(state()?.patient.caseId,input.value,{hint:showOrderHints});
  setHTML(target,options.map(item=>
   '<button type="button" data-action="monitor-suggestion" data-order="'+esc(item.command)+'">'+esc(item.label)+'</button>'
  ).join(''));
  const hint=document.querySelector('[data-action="monitor-hint"]');
  if(hint)hint.setAttribute('aria-pressed',String(showOrderHints));
 }
 function onInput(target){if(target?.id==='diagnosisInput'){renderDiagnosisSuggestions();return true;}
  if(target?.id!=='monitorOrderInput')return false;
  showOrderHints=false;lastMonitorOrderId=null;
  const feedback=ui('monitorOrderFeedback');if(feedback)feedback.hidden=true;
  renderOrderSuggestions();return true;
 }
 async function sendMonitorOrder(){
  const input=ui('monitorOrderInput'),feedback=ui('monitorOrderFeedback');
  const text=input?.value.trim();
  if(!text||!state()||state().patient.caseEnded)return;
  // Order never mutates patient from UI. The same room authority decides pending,
  // executed or rejected; no visual confirmation implies administration.
  const reply=await post(/^enfermer[ao]\b/i.test(text)||text.startsWith('/')?text:'Enfermera, '+text);
  lastMonitorOrderId=reply?.clinical?.length?reply.commandId:null;
  if(feedback&&!lastMonitorOrderId){
   feedback.hidden=false;feedback.dataset.status='rejected';
   feedback.textContent=reply?.routeError?'Orden no reconocida. Revisá el chat de enfermería.':
    'No se confirmó ninguna indicación clínica. Revisá el chat.';
  }
  renderOrderSuggestions();render();
 }
 /** Animation is advanced only from the existing application RAF.
  * It never alters patient status, clinical clock or frame scheduler.
  */
 function animate(now){
  const path=ui('monitorEcgPath');
  if(!Number.isFinite(now)||!path)return;
  // At most 30 paint operations per second; the sweep itself samples at 125 Hz
  // against elapsed real time and preserves already drawn intervals.
  if(now-lastEcgAt<33)return;
  const monitor=session()?.monitorRead(patientUid);if(!monitor)return;
  lastEcgAt=now;
  path.setAttribute('d',ecgSweep.update(now,ecgPresentation(monitor)));
 }

 function showStudies(){
  const s=state();if(!s)return;
  open('<h2>Estudios solicitados</h2><p>Los resultados aparecen al completar el tiempo del estudio.</p><div id="studyOrders" class="data-list"></div>'+
   '<label class="field">Estudio<select id="studyChoice">'+session().catalog().map(s=>'<option value="'+esc(s.id)+'">'+esc(s.label)+'</option>').join('')+'</select></label>'+
   '<div class="actions"><button data-action="request-study" class="primary">Pedir a Enfermera</button><button data-action="patient-chart">Volver</button></div>');render();
 }
 function showTreatment(){
  const p=state()?.patient;if(!p)return;
  const isApp=p.caseId==='APP-001',placeholder=isApp?'colocar una vía, ceftriaxona 1 g y metronidazol 500 mg':'espironolactona 100 mg oral';
  open('<h2>Tratamiento · Enfermería</h2><div id="therapyRecords"></div><label class="field">Orden<input id="therapyOrder" maxlength="200" placeholder="'+esc(placeholder)+'"></label>'+
   '<p class="note">Las indicaciones pendientes se distinguen de las intervenciones ejecutadas. Confirmá la preparación, la vía y la respuesta del paciente.</p>'+
   '<div class="actions"><button data-action="request-surgery">Solicitar interconsulta a cirugía</button></div>'+
   '<div class="actions"><button data-action="order-therapy" class="primary">Indicar a Enfermera</button><button data-action="patient-chart">Volver</button></div>');render();
 }
 function showHistory(){if(!state())return;open('<h2>Historia clínica</h2><div id="fullClinicalHistory"></div><div class="actions"><button data-action="patient-chart">Volver al paciente</button></div>');render();}
 function renderMonitorRecords(s){
  const orders=monitorOrderLedger(s.room,s.patient);
  const medicines=administeredTreatmentHistory(s.patient);
  const confirmed=ui('monitorMedicationHistory');
  if(confirmed)setHTML(confirmed,'<h3>Intervenciones registradas · '+medicines.length+'</h3>'+
   (medicines.length?medicines.slice().reverse().map(t=>
    '<div class="monitor-order-record" data-status="executed"><b>'+esc(t.label)+
    '</b><small>'+(t.action==='stop'?'Suspendido y confirmado':t.action==='setRate'?'Flujo ajustado y confirmado':'Administrado y confirmado')+(t.dose?' · '+esc(t.dose):'')+'</small></div>').join(''):
    '<p class="monitor-order-empty">Todavía no se registraron intervenciones.</p>'));
  const history=ui('monitorOrderHistory');
  if(history)setHTML(history,'<h3>Órdenes y procedimientos recientes</h3>'+
   (orders.length?orders.slice(-16).reverse().map(item=>{
    const medicine=s.patient.administrationLog?.find(t=>t.sourceEventId===item.eventId);
    const label=medicine?.label||s.patient.treatments?.find(t=>t.sourceEventId===item.eventId)?.label||
     ({iv:'Acceso venoso',monitor:'Monitor',connect:'Conexión de monitor',disconnect:'Desconexión de monitor',
      fluid:'Ringer / cristaloides',ceftriaxone:'Ceftriaxona',metronidazole:'Metronidazol',
      paracentesis_ter:'Paracentesis terapéutica',espironolactona:'Espironolactona'}[item.id]||item.id);
    const stage=item.status==='executed'?'Confirmado':item.status==='pending'?'Pendiente':
     item.status==='rejected'?'No ejecutado':'Sin confirmar';
    const note=item.status==='executed'&&item.receipt?.message?item.receipt.message:
     item.status==='rejected'?(item.receipt?.message||item.reason||'Orden rechazada'):
     item.status==='pending'?'Enfermería o preparación en curso':'Consultar el chat';
    return '<div class="monitor-order-record" data-status="'+esc(item.status)+'"><b>'+esc(label)+
     '</b><small>'+esc(stage)+' · '+esc(note)+'</small></div>';
   }).join(''):'<p class="monitor-order-empty">Todavía no se registraron órdenes.</p>'));
  const feedback=ui('monitorOrderFeedback');
  if(feedback&&lastMonitorOrderId){
   const status=latestMonitorOrderState(orders,lastMonitorOrderId);
   if(status){
    feedback.hidden=false;feedback.dataset.status=status.status;
    feedback.textContent=status.status==='pending'?
     'En curso · '+status.completed+'/'+status.total+' intervenciones confirmadas.':
     status.status==='executed'?'Intervención confirmada · '+status.completed+'/'+status.total+' completadas.':
      'No ejecutado o parcialmente rechazado · '+status.completed+'/'+status.total+
      ' confirmadas. Consultá el detalle y el chat.';
   }
  }
 }
 function render(){
  const s=state();if(!s){if(patientUid){close();patientUid=null;}return;}const p=s.patient;
  setHTML(ui('studyOrders'),p.orders.length?p.orders.map(order=>'<div data-study="'+esc(order.id)+'" data-status="'+order.status+'"><b>'+esc(order.label)+'</b><small>'+
   (order.status==='done'?'Resultado disponible':'Pendiente · '+Math.max(0,Math.ceil(order.readyAtMinute-s.clock.clinicalMinute))+' min clínicos')+'</small>'+
   (order.status==='done'?'<p>'+esc(order.result)+'</p>':'')+'</div>').join(''):'<p>Todavía no solicitaste estudios.</p>');
  if(!p.liveVitals)return;
  setHTML(ui('clinicalVitals'),vitalsHTML(p));
  const ecg=ecgPresentation(p);
  if(!ecg.connected||!ecg.measured&&!(ecg.rhythmSource==='case-rule'&&['asystole','ventricular_fibrillation'].includes(ecg.rhythm))){
   // Disconnecting clears presentation history, not the clinical observations.
   // Reconnecting must never replay a beat from before the disconnection.
   ecgSweep.reset();lastEcgAt=-Infinity;
  }
  setHTML(ui('bedsideMonitor'),monitorHTML(p));
  renderMonitorRecords(s);
  const monitorButton=document.querySelector('[data-action="toggle-monitor"]');
  if(monitorButton){monitorButton.textContent=p.procedures?.monitor?.connected?'Desconectar monitor':'Conectar monitor';monitorButton.disabled=p.caseEnded;}
  setHTML(ui('fullClinicalHistory'),historyHTML(p));
  setHTML(ui('therapyRecords'),therapyHTML(p));
  setHTML(ui('clinicalHistory'),p.intentHistory.map(x=>'<p>'+esc(x.answer)+'</p>').join('')||'<p>Sin datos interrogados.</p>');
  if(ui('caseReadiness'))ui('caseReadiness').textContent=p.caseEnded?'Atención cerrada.':s.eligibleDestinations?.length?'Evaluación completa. Elegí cómo continúa el cuidado.':(s.closure?.missing||[]).join(' ');
  setHTML(ui('caseDestinations'),p.caseEnded||s.canEdit===false?'':destinationButtonsHTML(s.eligibleDestinations));
  setHTML(ui('caseResult'),caseDebriefHTML(p.closure));
  renderExamination(document,p,regionId);
 }
 async function handle(target){
  const region=target.closest('[data-exam-region]');
  if(region){regionId=region.dataset.examRegion;render();return true;}
  const b=target.closest('button');if(!b||b.disabled)return false;
  if(b.dataset.examSection){await post('/examen '+regionId+' '+b.dataset.examSection);render();return true;}
  if(b.dataset.glasgow){await post('/glasgow '+b.dataset.glasgow);render();return true;}
  if(b.dataset.destination){await post('/disposicion '+b.dataset.destination);render();ui('caseResult')?.scrollIntoView({block:'nearest'});return true;}
  switch(b.dataset.action){
   case 'monitor-hint':showOrderHints=!showOrderHints;renderOrderSuggestions();return true;
   case 'monitor-suggestion':{
    const field=ui('monitorOrderInput');if(field){field.value=b.dataset.order||'';showOrderHints=false;renderOrderSuggestions();field.focus({preventScroll:true});}
    return true;
   }
   case 'monitor-order-submit':await sendMonitorOrder();return true;
   case 'patient-target':close();onTalk(patientUid);return true;
   case 'patient-chart':return false; // World supplies the current identity and spatial metadata.
   case 'clinical-history':showHistory();return true;
   case 'studies':showStudies();return true;
   case 'examination':regionId='general';open(examinationHTML());render();return true;
   case 'treatment':showTreatment();return true;
   case 'record-vitals':await post('/signos');break;
   case 'toggle-monitor':await post('/monitor '+(state()?.patient.procedures?.monitor?.connected?'desconectar':'conectar'));break;
   case 'reassess':await post('/reevaluar');break;
   case 'save-diagnosis':await saveDiagnosis();return true;
   case 'clear-diagnosis':await saveDiagnosis(true);return true;
   case 'diagnosis-suggestion':{
    const field=ui('diagnosisInput');if(field&&!field.readOnly){field.value=b.dataset.diagnosis;renderDiagnosisSuggestions();field.focus({preventScroll:true});}return true;
   }
   case 'request-surgery':close();await post('/consulta cirugia');break;
   case 'order-therapy':{const text=ui('therapyOrder').value.trim();if(text){close();await post(/^enfermer[ao]/i.test(text)?text:'Enfermera, '+text);}break;}
   case 'request-study':{const study=session()?.catalog().find(s=>s.id===ui('studyChoice').value);if(study){close();await post('/estudio '+study.id);}break;}
   default:return false;
  }
  render();return true;
 }
 return Object.freeze({showPatient,showMonitor,showDiagnosis,chooseDestination,saveDiagnosis,openSection,render,animate,onInput,submitMonitorOrder:sendMonitorOrder,handle,patientUid:()=>patientUid,
  reset(){patientUid=null;regionId='general';lastEcgAt=-Infinity;lastMonitorOrderId=null;ecgSweep.reset();delete ui('modalContent').dataset.patientUid;}});
}
