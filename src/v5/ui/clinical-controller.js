import {patientHTML,vitalsHTML,therapyHTML,monitorHTML,historyHTML,esc} from './clinical-panels.js';
import {examinationHTML,renderExamination} from './examination-panel.js';
import {EXAM_REGIONS,isExaminationKind} from '../clinical/exam-contract.js';
import {clinicalWorkflow} from './clinical-workflow.js';
import {closureDecisionHTML} from './clinical-closure-panel.js';
import {setHTML} from './render-content.js';
import {ecgPresentation} from '../clinical/ecg-morphology.js';
import {caseDebriefHTML} from './case-debrief.js';
import {createEcgSweep} from './ecg-sweep.js';
import {monitorOrderExamples,distinctOrderSuggestions} from './monitor-order-suggestions.js';
import {clinicalCompletions,spellingSuggestions} from './clinical-autocomplete.js';
import {monitorOrderLedger,administeredTreatmentHistory,latestMonitorOrderState} from './monitor-order-ledger.js';
import {diagnosisEditorHTML,diagnosisSuggestionsHTML,destinationButtonsHTML} from './diagnostic-impression.js';

/** UI state only. Every clinical action keeps its explicit UID and uses send().
 * The app owns the dialog and event listener; this controller owns neither timers nor listeners.
 */
export function createClinicalInterface({document,session,open,close,send,onTalk,notify,cases=[],therapies=[],onMonitorOpen=()=>{}}){
 const ui=id=>document.getElementById(id);
 let patientUid=null,regionId='general',flippedRegion=null,examBusy=false,examFeedback=null,showOrderHints=false,lastEcgAt=-Infinity,lastMonitorOrderId=null,lastClosureMarkup='',pendingDisposition=null;
 const ecgSweep=createEcgSweep();
 const state=()=>{const s=session()?.read();return s&&s.patient.uid===patientUid?s:null;};
 const post=text=>send(text,{patientUid});
 function showPatient(patient){
  const s=session()?.read();if(!s||s.patient.uid!==patient.uid){notify('Ese paciente no está disponible en esta guardia.');return;}
  patientUid=patient.uid;
  open('<h2>'+esc(patient.bedId||'Paciente')+' · Paciente</h2><p>'+esc(patient.name||'')+'</p><div class="note">'+esc(patient.chief||'')+'</div>'+
   (s.patient.liveVitals?patientHTML(s.patient,{readOnly:s.canEdit===false||s.patient.caseEnded}):'<p>—</p><div class="actions"><button data-action="studies">Estudios</button></div>')+
   '<div class="actions"><button data-action="patient-target">Interrogar</button><button data-action="close">Cerrar</button></div>');
  ui('modalContent').dataset.patientUid=patientUid;render();renderDiagnosisSuggestions();
 }
 function showClosure(patient){
  const s=session()?.read();
  if(!s||s.patient.uid!==patient?.uid){notify('No hay un caso activo para cerrar.');return;}
  patientUid=patient.uid;
  lastClosureMarkup=closureDecisionHTML(s);
  open(lastClosureMarkup,'case-close');
  ui('modalContent').dataset.patientUid=patientUid;
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
  if(!clear&&ui('modal')?.dataset.panel==='diagnosis')close();
  else{field.value=state().patient.diagnosis;renderDiagnosisSuggestions();}
  render();
 }
 async function chooseDestination(patient,id){
  const s=session()?.read();
  if(!patient||!s||s.patient.uid!==patient.uid||s.canEdit===false||
   s.patient.caseEnded||s.patient.patientDied)return;
  if(!['observacion','sala','alta','quirofano','uti','procedimiento'].includes(id))return;
  patientUid=patient.uid;
  const service=id==='quirofano'?'cirugia':id==='uti'?'uti':null;
  if(service&&!s.patient.consults?.some(c=>c.id===service&&c.status==='done'&&c.accepted)){
   pendingDisposition={patientUid:patient.uid,destination:id,service,
    priorConsults:(s.patient.consults||[]).filter(c=>c.id===service).length};
   notify('Enfermera: aviso a '+(service==='cirugia'?'Cirugía':'UTI')+'. Aguardamos su respuesta.');
   const reply=await post('Enfermera, interconsulta a '+service);
   if(reply?.status==='rejected'||reply?.routeError)pendingDisposition=null;
   return;
  }
  pendingDisposition=null;await post('/cierre-parcial '+id);
 }
 function finishPendingDisposition(s){
  const pending=pendingDisposition;
  if(!pending||s.patient.uid!==pending.patientUid||s.patient.caseEnded||s.patient.patientDied){
   pendingDisposition=null;return;
  }
  const consultations=(s.patient.consults||[]).filter(c=>c.id===pending.service);
  const last=consultations.at(-1);
  if(last?.status==='done'&&last.accepted){
   pendingDisposition=null;
   Promise.resolve().then(()=>post('/cierre-parcial '+pending.destination));
  }else if(consultations.length>pending.priorConsults&&last?.status==='rejected'){
   pendingDisposition=null;
   notify('El servicio no aceptó el traslado. Revisá el diagnóstico y los estudios.');
  }
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
    '<div class="monitor-order-row"><input id="monitorOrderInput" type="text" autocomplete="off" autocorrect="on" spellcheck="true" maxlength="200" '+
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
  onMonitorOpen();
 }
 /** Invoked by the world-anchored patient menu; clinical actions still use
  * the existing session, UID, room authority and panel handlers.
  */
 function openSection(patient,section){
  const s=session()?.read();
  if(!s||s.patient.uid!==patient?.uid){notify('Paciente no disponible en esta guardia.');return;}
  patientUid=patient.uid;
  if(section==='talk'){onTalk(patient.uid);return;}
  if(section==='examination'){regionId='general';flippedRegion=null;examFeedback=null;open(examinationHTML());render();return;}
  if(section==='history'){showHistory();return;}
  if(section==='studies'){showStudies();return;}
  if(section==='treatment'){showTreatment();return;}
  if(section==='patient'){showClosure(patient);return;}
  if(section==='diagnosis'){showDiagnosis(patient);return;}
 }
 function renderOrderSuggestions(){
  const input=ui('monitorOrderInput'),target=ui('monitorOrderSuggestions');
  if(!input||!target)return;
  const active=state(),caseId=active?.patient.caseId;
  const options=input.value.trim()?
   clinicalCompletions(input.value,{mode:'monitor',caseId,cases,therapies,
    studies:session()?.catalog()||[],limit:6}):
   monitorOrderExamples(caseId,'',{hint:showOrderHints});
  const spelling=!options.length?spellingSuggestions(input.value):[];
  setHTML(target,distinctOrderSuggestions([...options,...spelling]).map(item=>
   '<button type="button" data-action="monitor-suggestion" data-order="'+
    esc(item.replacement??item.command)+'">'+esc(item.label)+'</button>'
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
  const acute=['APP-001','PERI-SEC-001'].includes(p.caseId),placeholder=acute?'colocar una vía, ceftriaxona 1 g y metronidazol 500 mg':p.caseId==='PERI-PBE-001'?'ceftriaxona 1 g y albúmina 1.5 g/kg':p.caseId==='PERI-TER-001'?'Ringer 1000 ml y piperacilina tazobactam 4.5 g':'espironolactona 100 mg oral';
  open('<h2>Tratamiento · Enfermería</h2><div id="therapyRecords"></div><label class="field">Orden<input id="therapyOrder" maxlength="200" placeholder="'+esc(placeholder)+'"></label>'+
   '<p class="note">Las indicaciones pendientes se distinguen de las intervenciones ejecutadas. Confirmá la preparación, la vía y la respuesta del paciente.</p>'+
   '<div class="actions"><button data-action="request-surgery">Solicitar interconsulta a cirugía</button><button data-action="request-icu">Solicitar interconsulta a UTI</button></div>'+
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
  finishPendingDisposition(s);
  if(document.getElementById('modal')?.dataset.panel==='case-close'){
   const content=ui('modalContent'),markup=closureDecisionHTML(s);
   if(content&&lastClosureMarkup!==markup){
    lastClosureMarkup=markup;setHTML(content,markup);content.dataset.patientUid=patientUid;
   }
  }
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
  const caseDef=cases.find(c=>c.id===p.caseId);
  setHTML(ui('fullClinicalHistory'),historyHTML(p,caseDef));
  setHTML(ui('therapyRecords'),therapyHTML(p,caseDef));
  setHTML(ui('clinicalHistory'),p.intentHistory.map(x=>'<p>'+esc(x.answer)+'</p>').join('')||'<p>Sin datos interrogados.</p>');
  const workflow=clinicalWorkflow(s),progress=ui('clinicalWorkflow');
  if(progress&&workflow)setHTML(progress,'<h3>Estado de la atención</h3><div class="care-checkpoints">'+workflow.steps.map(step=>
   '<span class="care-step" data-status="'+step.status+'">'+esc(step.label)+' <b>'+
    ({done:'✓',partial:'◐',ready:'→',review:'◐',attention:'!',pending:'·'}[step.status])+'</b></span>').join('')+'</div>'+
   '<small>Progreso documentado, no implica corrección diagnóstica ni tratamiento completo.</small>');
  if(ui('caseReadiness'))ui('caseReadiness').textContent=p.caseEnded?'Atención cerrada.':s.eligibleDestinations?.length?'Evaluación completa. Elegí cómo continúa el cuidado.':(s.closure?.missing||[]).join(' ');
  setHTML(ui('caseDestinations'),p.caseEnded||s.canEdit===false?'':destinationButtonsHTML(s.eligibleDestinations));
  setHTML(ui('caseResult'),caseDebriefHTML(p.closure));
  const feedback=ui('examFeedback');
  if(feedback){feedback.hidden=!examFeedback;feedback.textContent=examFeedback?.text||'';feedback.dataset.status=examFeedback?.status||'';}
  renderExamination(document,p,regionId,flippedRegion);
 }
 async function recordExamination(text){
  const reply=await post(text),items=reply?.clinical?.filter(item=>isExaminationKind(item.kind))||[],
   failure=items.find(item=>item.status!=='executed'),reason=reply?.reason||reply?.routeError||failure?.reason;
  if(reply?.status==='received'&&items.length&&!failure){
   examFeedback={status:'executed',text:'Exploración registrada. Los hallazgos están en este panel.'};return true;
  }
  const explanations={
   'no-patient-target':'Acercate al paciente para explorarlo.',
   'approach-patient-to-claim':'Acercate al paciente para explorarlo.',
   'other-player-owns-patient':'Ese paciente está a cargo de otro médico. Seleccioná un paciente disponible.',
   'patient-selection-changed':'Cambió el paciente seleccionado. Abrí su examen nuevamente.',
   'ambiguous-patient-selection':'Hay varios pacientes cerca. Seleccioná la cama que querés explorar.',
   'patient-not-active':'La atención de este paciente ya terminó.',
   'invalid-clinical-command':'Revisá la región y la maniobra seleccionadas.',
   'unknown-exam':'Revisá la región y la maniobra seleccionadas.'
  };
  const unconfirmed=!reply||reply.status==='unconfirmed'||failure?.status==='unconfirmed';
  examFeedback={status:unconfirmed?'unconfirmed':'rejected',text:unconfirmed?
   'No se pudo confirmar la exploración. Revisá la conexión y volvé a intentarlo.':
   'Examen no registrado. '+(explanations[reason]||'No se autorizó esta exploración. Volvé a seleccionar al paciente.')};
  return false;
 }
 async function handle(target){
  const region=target.closest('[data-exam-region]');
  if(region){
   const selected=region.dataset.examRegion;
   if(examBusy)return true;
   regionId=selected;
   if(state()?.patient.caseEnded){
    flippedRegion=flippedRegion===selected?null:selected;
    examFeedback={status:'review',text:'Atención cerrada. Mostrando el examen registrado.'};
    render();return true;
   }
   if(flippedRegion===selected){flippedRegion=null;render();return true;}
   examBusy=true;examFeedback={status:'pending',text:'Explorando la región seleccionada…'};render();
   try{
    const techniques=selected==='neurological'?['all']:
     (EXAM_REGIONS[selected]?.techniques||[]);
    // One region click, existing validated maneuvers (same nurse/clinical
    // server authority). No client-side findings or fictitious completion.
    let confirmed=true;
    for(const technique of techniques){
     const before=state()?.patient;if(!before||before.caseEnded)break;
     // Deliberate examination must remain repeatable after physiological
     // evolution. The old "already performed" short-circuit froze Glasgow at
     // the admission score even after treatment improved consciousness.
     // An active panel is still protected by examBusy and flip-to-close.
     if(!before.uid)break;
     const recorded=await recordExamination(selected==='neurological'?'/glasgow all':
      '/examen '+selected+' '+technique);
     if(!recorded){confirmed=false;break;}
    }
    if(confirmed)flippedRegion=selected;
   }finally{examBusy=false;render();}
   return true;
  }
  const b=target.closest('button');if(!b||b.disabled)return false;
  if(b.dataset.examSection||b.dataset.glasgow){
   if(examBusy)return true;
   examBusy=true;
   try{await recordExamination(b.dataset.glasgow?'/glasgow '+b.dataset.glasgow:
    '/examen '+regionId+' '+b.dataset.examSection);}finally{examBusy=false;render();}
   return true;
  }
  if(b.dataset.destination){await chooseDestination(state()?.patient,b.dataset.destination);render();return true;}
  switch(b.dataset.action){
   case 'monitor-hint':showOrderHints=!showOrderHints;renderOrderSuggestions();return true;
   case 'monitor-suggestion':{
    const field=ui('monitorOrderInput');if(field){field.value=b.dataset.order||'';showOrderHints=false;renderOrderSuggestions();field.focus({preventScroll:true});field.setSelectionRange(field.value.length,field.value.length);}
    return true;
   }
   case 'monitor-order-submit':await sendMonitorOrder();return true;
   case 'patient-target':close();onTalk(patientUid);return true;
   case 'close-diagnosis':{const p=state()?.patient;if(p)showDiagnosis(p);return true;}
   case 'patient-chart':return false; // World supplies the current identity and spatial metadata.
   case 'clinical-history':showHistory();return true;
   case 'studies':showStudies();return true;
   case 'examination':regionId='general';flippedRegion=null;examFeedback=null;open(examinationHTML());render();return true;
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
   case 'request-icu':close();await post('/consulta uti');break;
   case 'order-therapy':{const text=ui('therapyOrder').value.trim();if(text){close();await post(/^enfermer[ao]/i.test(text)?text:'Enfermera, '+text);}break;}
   case 'request-study':{const study=session()?.catalog().find(s=>s.id===ui('studyChoice').value);if(study){close();await post('/estudio '+study.id);}break;}
   default:return false;
  }
  render();return true;
 }
 return Object.freeze({showPatient,showClosure,showMonitor,showDiagnosis,chooseDestination,saveDiagnosis,openSection,render,animate,onInput,submitMonitorOrder:sendMonitorOrder,handle,patientUid:()=>patientUid,
  reset(){patientUid=null;pendingDisposition=null;regionId='general';lastClosureMarkup='';flippedRegion=null;examBusy=false;examFeedback=null;lastEcgAt=-Infinity;lastMonitorOrderId=null;ecgSweep.reset();delete ui('modalContent').dataset.patientUid;}});
}
