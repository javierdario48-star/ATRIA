import {patientHTML,vitalsHTML,therapyHTML,monitorHTML,historyHTML,esc} from './clinical-panels.js';
import {examinationHTML,renderExamination} from './examination-panel.js';
import {setHTML} from './render-content.js';

/** UI state only. Every clinical action keeps its explicit UID and uses send().
 * The app owns the dialog and event listener; this controller owns neither timers nor listeners.
 */
export function createClinicalInterface({document,session,open,close,send,onTalk,notify}){
 const ui=id=>document.getElementById(id);let patientUid=null,regionId='general';
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
  open('<div class="bedside-monitor-header"><span class="monitor-device-led" aria-hidden="true"></span><div><h2>Monitor · '+esc(patient.bedId)+'</h2><small>PANTALLA DE CABECERA · '+esc(patient.bedId)+'</small></div></div>'+
   '<div id="bedsideMonitor" class="bedside-monitor-screen"></div>'+
   '<div class="bedside-monitor-toolbar" aria-label="Controles del monitor">'+
   '<button data-action="toggle-monitor" class="primary"></button><button data-action="record-vitals">Medir ahora</button>'+
   '<button data-action="treatment">Tratamiento</button><button data-action="patient-chart">Historia</button></div>','monitor');
  ui('modalContent').dataset.patientUid=patientUid;render();
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
 return Object.freeze({showPatient,showMonitor,openSection,render,handle,patientUid:()=>patientUid,
  reset(){patientUid=null;regionId='general';delete ui('modalContent').dataset.patientUid;}});
}
