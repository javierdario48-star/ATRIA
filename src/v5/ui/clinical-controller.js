import {patientHTML,vitalsHTML,therapyHTML,monitorHTML,historyHTML,esc} from './clinical-panels.js';
import {examinationHTML,renderExamination} from './examination-panel.js';
import {setHTML} from './render-content.js';
import {ecgPath,ecgPresentation} from '../clinical/ecg-morphology.js';
import {monitorOrderExamples} from './monitor-order-suggestions.js';

/** UI state only. Every clinical action keeps its explicit UID and uses send().
 * The app owns the dialog and event listener; this controller owns neither timers nor listeners.
 */
export function createClinicalInterface({document,session,open,close,send,onTalk,notify}){
 const ui=id=>document.getElementById(id);
 let patientUid=null,regionId='general',showOrderHints=false,lastEcgAt=-Infinity;
 const state=()=>{const s=session()?.read();return s&&s.patient.uid===patientUid?s:null;};
 const post=text=>send(text,{patientUid});
 function showPatient(patient){
  const s=session()?.read();if(!s||s.patient.uid!==patient.uid){notify('Ese paciente no está disponible en esta guardia.');return;}
  patientUid=patient.uid;
  open('<h2>'+esc(patient.bedId||'Paciente')+' · Paciente</h2><p>'+esc(patient.name||'')+'</p><div class="note">'+esc(patient.chief||'')+'</div>'+
   (s.patient.liveVitals?patientHTML(s.patient):'<p>Atención completa de este caso en migración.</p><div class="actions"><button data-action="studies">Estudios</button></div>')+
   '<div class="actions"><button data-action="patient-target">Interrogar</button><button data-action="close">Cerrar</button></div>');
  ui('modalContent').dataset.patientUid=patientUid;render();
 }
 function showMonitor(patient){
  const s=session()?.read();if(!s||s.patient.uid!==patient.uid||!s.patient.liveVitals){notify('Monitor clínico todavía no disponible para este caso.');return;}
  patientUid=patient.uid;
  showOrderHints=false;lastEcgAt=-Infinity;
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
 function onInput(target){if(target?.id!=='monitorOrderInput')return false;
  showOrderHints=false;renderOrderSuggestions();return true;
 }
 async function sendMonitorOrder(){
  const input=ui('monitorOrderInput'),feedback=ui('monitorOrderFeedback');
  const text=input?.value.trim();
  if(!text||!state()||state().patient.caseEnded)return;
  // Order never mutates patient from UI. The same room authority decides pending,
  // executed or rejected; no visual confirmation implies administration.
  const reply=await post(/^enfermer[ao]\b/i.test(text)||text.startsWith('/')?text:'Enfermera, '+text);
  if(feedback){
   const statuses=reply?.clinical?.map(x=>x.status)||[];
   feedback.hidden=false;
   feedback.dataset.status=statuses.some(x=>x==='rejected')?'rejected':
    statuses.some(x=>x==='pending')?'pending':
    statuses.some(x=>x==='executed')?'executed':'unknown';
   feedback.textContent=feedback.dataset.status==='rejected'?'No ejecutado. Revisá la aclaración de Enfermería en el chat.':
    feedback.dataset.status==='pending'?'Orden recibida; intervención aún pendiente.':
    feedback.dataset.status==='executed'?'Acción confirmada por el motor clínico.':
    'Orden enviada; consultá la respuesta en el chat.';
  }
  renderOrderSuggestions();render();
 }
 /** Animation is advanced only from the existing application RAF.
  * It never alters patient status, clinical clock or frame scheduler.
  */
 function animate(now){
  const path=ui('monitorEcgPath');
  if(!path||!Number.isFinite(now)||now-lastEcgAt<55)return;
  const snapshot=state();
  if(!snapshot)return;
  const presentation=ecgPresentation(snapshot.patient);
  lastEcgAt=now;
  if(!presentation.connected||!presentation.measured)return;
  path.setAttribute('d',ecgPath({seconds:now/1000,hr:presentation.hr,rhythm:presentation.rhythm}));
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
   (isApp?'<div class="actions"><button data-action="request-surgery">Solicitar interconsulta a cirugía</button></div>':'')+
   '<div class="actions"><button data-action="order-therapy" class="primary">Indicar a Enfermera</button><button data-action="patient-chart">Volver</button></div>');render();
 }
 function showHistory(){if(!state())return;open('<h2>Historia clínica</h2><div id="fullClinicalHistory"></div><div class="actions"><button data-action="patient-chart">Volver al paciente</button></div>');render();}
 function render(){
  const s=state();if(!s)return;const p=s.patient;
  setHTML(ui('studyOrders'),p.orders.length?p.orders.map(order=>'<div data-study="'+esc(order.id)+'" data-status="'+order.status+'"><b>'+esc(order.label)+'</b><small>'+
   (order.status==='done'?'Resultado disponible':'Pendiente · '+Math.max(0,Math.ceil(order.readyAtMinute-s.clock.clinicalMinute))+' min clínicos')+'</small>'+
   (order.status==='done'?'<p>'+esc(order.result)+'</p>':'')+'</div>').join(''):'<p>Todavía no solicitaste estudios.</p>');
  if(!p.liveVitals)return;
  setHTML(ui('clinicalVitals'),vitalsHTML(p));
  setHTML(ui('bedsideMonitor'),monitorHTML(p));
  const monitorButton=document.querySelector('[data-action="toggle-monitor"]');
  if(monitorButton){monitorButton.textContent=p.procedures?.monitor?.connected?'Desconectar monitor':'Conectar monitor';monitorButton.disabled=p.caseEnded;}
  setHTML(ui('fullClinicalHistory'),historyHTML(p));
  setHTML(ui('therapyRecords'),therapyHTML(p));
  setHTML(ui('clinicalHistory'),p.intentHistory.map(x=>'<p>'+esc(x.answer)+'</p>').join('')||'<p>Sin datos interrogados.</p>');
  if(ui('caseReadiness'))ui('caseReadiness').textContent=p.caseEnded?'Atención cerrada.':s.closure?.ready?'Evaluación completa. Elegí cómo continúa el cuidado.':(s.closure?.missing||[]).join(' ');
  setHTML(ui('caseDestinations'),p.caseEnded?'':(p.caseId==='APP-001'?['quirofano']:['sala','observacion'])
   .map(id=>'<button data-destination="'+id+'" '+(!s.closure?.ready?'disabled':'')+'>'+({quirofano:'Derivar a quirófano',sala:'Internar en sala',observacion:'Dejar en observación'}[id])+'</button>').join(''));
  setHTML(ui('caseResult'),p.closure?'<h3>Caso cerrado · '+p.closure.quality.score+'/100</h3><p>'+
   ({quirofano:'Derivación a quirófano',sala:'Internación en sala',observacion:'Observación'}[p.closure.destination])+' · +'+p.closure.xp+' XP</p>':'');
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
   case 'save-diagnosis':await post('/diagnostico '+ui('diagnosisInput').value.trim());break;
   case 'request-surgery':close();await post('/consulta cirugia');break;
   case 'order-therapy':{const text=ui('therapyOrder').value.trim();if(text){close();await post(/^enfermer[ao]/i.test(text)?text:'Enfermera, '+text);}break;}
   case 'request-study':{const study=session()?.catalog().find(s=>s.id===ui('studyChoice').value);if(study){close();await post('/estudio '+study.id);}break;}
   default:return false;
  }
  render();return true;
 }
 return Object.freeze({showPatient,showMonitor,openSection,render,animate,onInput,handle,patientUid:()=>patientUid,
  reset(){patientUid=null;regionId='general';delete ui('modalContent').dataset.patientUid;}});
}
