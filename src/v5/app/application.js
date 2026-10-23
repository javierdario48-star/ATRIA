import {FrameScheduler} from '../../app/frame-scheduler.js';
import {Lifecycle} from '../../app/lifecycle.js';
import {createWorld} from './world.js';
import {createHospitalRenderer} from '../render/hospital.js';
import {createPresentationTimeline} from '../render/presentation-timeline.js';
import {createGuardSession} from '../clinical/guard-session.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {createCooperativeLink} from '../social/cooperative-link.js';
import {createCooperativeReplica} from '../social/cooperative-replica.js';
import {createDurableCooperativeReplica} from '../social/durable-cooperative-replica.js';
import {createCooperativeLifecycle,outcomeId} from '../social/cooperative-lifecycle.js';
import {createProgressionLedger} from '../clinical/progression.js';
import {createAtriaKeyboard} from '../ui/atria-keyboard.js';
import {clinicalCompletions,spellingSuggestions} from '../ui/clinical-autocomplete.js';
import {createClinicalInterface} from '../ui/clinical-controller.js';
import {clinicalWorkflow} from '../ui/clinical-workflow.js';
import {caseDebriefHTML} from '../ui/case-debrief.js';
import {createPatientActionWheel} from '../ui/patient-actions.js';
import {createPatientClinicalOverlay} from '../ui/diagnostic-impression.js';
import {createClinicalChecklist} from '../ui/clinical-checklist.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PROFILE_KEY='atria.v5.profile.v1';
const PROGRESS_KEY='atria.v5.progress.v1';
const supportedColors=new Set(['navy','green','gray','pink','teal']);
export function readProfile(storage){
 try{
  const saved=JSON.parse(storage.getItem(PROFILE_KEY)||storage.getItem('clinicalShift.profile.v1')||'null');
  return {name:String(saved?.name||'Médico').slice(0,32),scrubColor:supportedColors.has(saved?.scrubColor)?saved.scrubColor:'navy'};
 }catch{return {name:'Médico',scrubColor:'navy'};}
}

/** Exactly one owner for boot, input listeners, RAF and all mode transitions. */
export async function createApplication({document,window,content,signal}){
 const rootLifecycle=new Lifecycle(),scope=rootLifecycle.enter('application');
 let progress;try{progress=createProgressionLedger(JSON.parse(window.localStorage.getItem(PROGRESS_KEY)||'{}'));}catch{progress=createProgressionLedger();}
 let savedRewardCount=progress.read().receipts.length+progress.read().penalties.length;
 let profile=readProfile(window.localStorage),world=createWorld(content,profile),destroyed=false,raf=null,
  toastUntil=0,focusedNpc=null,focusedPatientUid=null,draftMode='solo',composition=false,deferredRecipient=null,drag=null,frames=0,
  guardSession=null,lastPanelUpdate=0,messageNumber=0,lastClinicalFrame=null,clinicalTyping=false,
  announcedDeathUid=null,pendingPatientAction=null,announcedClosure=null,coopCaseId=null,
  coopRoomId=null,replica=null,durableClient=null,lastSharedPublish=0,sharedSequence=0,lastMotion='',lastRemoteRevision=-1,socialEnabled=false,
  durableStarting=false,durableJoining=false,lastDurableErrorAt=-Infinity,nextCooperativeAdmission=0,cooperativeCapability=null;
 const messageEpoch=window.crypto.randomUUID(),cooperativeFlow=createCooperativeLifecycle();let pendingCoopLeave=false;
 let restoreRoomId=null;try{restoreRoomId=window.localStorage.getItem('atria.v5.coop.room');}catch{}
 const ui=id=>document.getElementById(id),input=ui('dieInput'),canvas=ui('game'),dialog=ui('modal');
 const renderer=await createHospitalRenderer(canvas,content,{signal,window});
 const scheduler=new FrameScheduler({mobileRenderHz:60}),listeners=[];
 const presentation=createPresentationTimeline(world.snapshot());
 const patientWheel=createPatientActionWheel({document,window});
 const patientClinical=createPatientClinicalOverlay({document,window,cases:content.cases});
 const clinicalChecklist=createClinicalChecklist({document});
 const chatSuggestions=ui('chatSuggestions'),nurseQuick=ui('nurseQuickButton');
 let autocompleteCaseId=null;
 const atriaKeyboard=createAtriaKeyboard({document,window,input,host:ui('chatDock'),
  onSubmit:()=>{if(composition)return;const message=input.value.trim();if(message){input.value='';updateTypingAssistance();submitText(message);}},
  onRecipient:()=>ui('recipientButton').click(),onNurse:()=>{if(guardSession)selectRecipient('nurse');}});
 function drawWorld(now=window.performance.now(),alpha=scheduler.presentationAlpha()){
  if(atriaKeyboard.isOpen()&&!ui('chatDock').hidden&&!ui('hud').hidden){
   const origin=canvas.getBoundingClientRect().top;
   renderer.setPlayableBounds({top:ui('hud').getBoundingClientRect().bottom-origin+7,
    bottom:ui('chatDock').getBoundingClientRect().top-origin-5});
  }else renderer.setPlayableBounds(null);
  const worldSnapshot=world.snapshot();
  renderer.draw(world.presentNurses(presentation.sample(worldSnapshot,alpha)),now);
  patientWheel.position(renderer,ui('hud').getBoundingClientRect().bottom,ui('chatDock').getBoundingClientRect().top);
  patientClinical.position(renderer,ui('hud').getBoundingClientRect().bottom,ui('chatDock').getBoundingClientRect().top,
   {obscured:dialog.open||patientWheel.isOpen()||worldSnapshot.phase!=='guard'});
 }
 const history=[],seenLobbyMessages=new Set(),seenGuardMessages=new Set(),seenNpcMessages=new Set(),seenNurseCues=new Set(),nurseCueRows=[],fastWardSpeech=new Map();let lastNurseCueAt=-Infinity,lastPatientSpeechAt=-Infinity,selectedLobbyPlayerId=null,selectedLobbyCardState=null;
 function listen(target,type,handler,options){scope.listen(target,type,handler,options);listeners.push(type);}
 function renderLobbyMessages(s){
  if(world.snapshot().phase!=='lobby')return;
  for(const message of s.lobbyMessages||[]){
   const id=message.messageId||message.userId+':'+message.sequence+':'+message.createdAt;
   if(seenLobbyMessages.has(id))continue;
   seenLobbyMessages.add(id);
   if(seenLobbyMessages.size>350)seenLobbyMessages.delete(seenLobbyMessages.values().next().value);
   line(message.name||'Médico',message.text);
   if(Date.now()-message.createdAt<4500)world.showLobbyMessage(message.userId,message.text,window.performance.now());
  }
 }
 function toast(message){ui('toast').textContent=message;ui('toast').hidden=false;toastUntil=window.performance.now()+3200;}
 function open(html,kind='clinical'){
  world.stop();drag=null;patientWheel.hide();dialog.dataset.panel=kind;
  ui('modalContent').innerHTML=html;if(!dialog.open)dialog.showModal();
 }
 function close(){if(dialog.open)dialog.close();delete dialog.dataset.panel;}
 const clinicalUI=createClinicalInterface({document,session:()=>guardSession,open,close,send:submitText,notify:toast,cases:content.cases,
  onTalk:uid=>selectRecipient('patient',uid),therapies:content.therapies});
 const social=createCooperativeLink({window,profile,
  onSocial:()=>{if(destroyed)return;const s=social.state();renderNotifications(s);if(world.snapshot().phase==='lobby'){
   if(s.user){profile={...profile,id:s.user.id};world.setSocialIdentity(s.user.id);}world.showLobbyPlayers(s.roster,window.performance.now());renderLobbyMessages(s);renderSocialLists();
   if(dialog.open&&dialog.dataset.panel==='lobby-person'&&selectedLobbyPlayerId){
    const id=selectedLobbyPlayerId,status=friendStatus(s,id);
    if(status!==selectedLobbyCardState)showLobbyPlayerCard(id);
   }
   maybeRecoverStoredRoom();
   }else if(durableClient&&coopRoomId&&s.room?.id===coopRoomId&&world.snapshot().phase==='guard'){
    world.showGuardSocialPlayers(s.roster,coopRoomId,s.room.members.map(m=>m.userId),window.performance.now());
   }},
  onRoom:room=>{if(destroyed)return;
   renderNotifications(social.state());
   if(room.id===coopRoomId)world.reconcileDoctors(room.members);
   if(room.id===restoreRoomId)maybeRecoverStoredRoom();
   maybeBeginCooperativeRoom();
   if(pendingCoopLeave&&outcomeDelivered())enterLobby(true);},
  onPacket:receiveCooperativePacket,onRoomSpeech:showWardSpeech,onClose:()=>{if(durableClient)return;if(coopRoomId&&!guardSession?.read().patient.caseEnded)enterLobby(false);}});
 function renderSocialLists(){
  const s=social.state(),list=ui('coopDoctors'),invitations=ui('coopInvitations');
  if(list){const selected=new Set([...list.querySelectorAll('input:checked')].map(x=>x.value));
   list.innerHTML=s.roster.filter(x=>x.userId!==s.user?.id).map(x=>'<label><input type="checkbox" value="'+esc(x.userId)+'" '+(selected.has(x.userId)?'checked':'')+'>'+esc(x.name)+'</label>').join('')||'<p>Esperando colegas conectados…</p>';}
  if(invitations)invitations.innerHTML=s.invites.map(x=>'<div><b>'+esc(x.host.name)+'</b> invita a una guardia cooperativa. <button data-action="join-coop" data-room="'+esc(x.roomId)+'">Aceptar</button></div>').join('')||'<p>Sin invitaciones pendientes.</p>';
  const requests=ui('friendRequests'),contacts=ui('lobbyContacts');
  if(requests)requests.innerHTML=(s.requests?.incoming||[]).map(x=>
   '<p>'+esc(x.name)+' te agregó. <button data-action="accept-friend" data-user="'+esc(x.id)+'">Aceptar amistad</button></p>').join('');
  if(contacts)contacts.innerHTML=s.roster.filter(x=>x.userId!==s.user?.id).map(x=>
   '<button data-action="inspect-player" data-user="'+esc(x.userId)+'">'+esc(x.name)+
   ((s.friends||[]).some(f=>f.id===x.userId)?' · Amigo':'')+'</button>').join('')||'<p>No hay otros médicos conectados.</p>';
 }
 function renderNotifications(s){
  const incoming=s.requests?.incoming||[],invites=s.invites||[];
  const number=incoming.length+invites.length,count=ui('notificationsCount');
  count.textContent=number>99?'99+':String(number);count.hidden=number===0;
  ui('notificationsButton').setAttribute('aria-label','Notificaciones'+(number?' ('+number+' pendientes)':''));
  renderInvitationNotice(s);
  const notice=ui('friendRequestNotice'),request=incoming[0];
  notice.hidden=world.snapshot().phase!=='lobby'||!request;
  if(request){
   ui('friendRequestSender').textContent=request.name||'Otro médico';
   notice.dataset.user=request.id;
  }else delete notice.dataset.user;
 }
 function renderInvitationNotice(s){
  const notice=ui('coopInviteNotice');
  const invitation=s.invites?.find(x=>x.roomId!==s.room?.id);
  notice.hidden=world.snapshot().phase!=='lobby'||!!coopRoomId||!invitation;
  if(!notice.hidden){
   ui('coopInviteSender').textContent=invitation.host?.name||'Otro médico';
   notice.dataset.room=invitation.roomId;
  }else delete notice.dataset.room;
 }
 async function acceptCooperativeInvitation(roomId){
  if(!roomId||coopRoomId)return;
  cancelSharedIntent();
  const intent=cooperativeFlow.begin('guest');
  ui('coopInviteNotice').hidden=true;
  try{
   await social.join(roomId);
   if(cooperativeFlow.current(intent)&&!coopRoomId)
    open('<h2>Conectando a la guardia…</h2><p>Esperando la autoridad clínica del anfitrión.</p>');
  }catch(error){
   if(cooperativeFlow.current(intent)){toast(error.message);renderInvitationNotice(social.state());}
  }
 }
 function showPeople(){socialEnabled=true;open('<h2>Personas</h2><div id="friendRequests"></div><div id="coopInvitations"></div><p>Colegas conectados · tocá para agregar o invitar</p><div id="lobbyContacts"></div><p>Invitación múltiple (hasta 3 colegas)</p><div id="coopDoctors"></div><div class="actions"><button data-action="close">Cerrar</button></div>','people');renderSocialLists();}
 function friendStatus(s,id){
  return s.friends?.some(x=>x.id===id)?'friend':
   s.requests?.incoming?.some(x=>x.id===id)?'incoming':
   s.requests?.outgoing?.some(x=>x.id===id)?'outgoing':'stranger';
 }
 function showLobbyPlayerCard(userId){
  const state=social.state(),person=state.roster.find(x=>x.userId===userId);
  if(!person)return toast('Ese médico ya no está conectado.');
  selectedLobbyPlayerId=userId;selectedLobbyCardState=friendStatus(state,userId);
  const friend=state.friends?.some(x=>x.id===userId),
    pending=state.requests?.outgoing?.some(x=>x.id===userId),
    incoming=state.requests?.incoming?.some(x=>x.id===userId);
  const cases=content.cases.filter(c=>Object.hasOwn(CLINICAL_EXECUTORS,c.id));
  open('<h2>'+esc(person.name)+'</h2><p>'+ (friend?'Amigo':pending?'Solicitud de amistad enviada':'Médico conectado')+
   '</p><div class="actions">'+(incoming?'<button data-action="accept-friend" data-user="'+esc(userId)+'">Aceptar amistad</button>':
   !friend&&!pending?'<button data-action="add-friend" data-user="'+esc(userId)+'">Agregar a amigos</button>':'')+
   '<label>Paciente<select id="friendCase">'+cases.map(c=>'<option value="'+esc(c.id)+'" '+(c.id==='PERI-PBE-001'?'selected':'')+'>'+esc(c.selector)+'</option>').join('')+
   '</select></label><button class="primary" data-action="invite-friend" data-user="'+esc(userId)+'">Invitar a una guardia</button>'+
   '<button data-action="close">Cerrar</button></div>','lobby-person');
 }
 async function inviteColleagues(ids,caseId){
  if(!Object.hasOwn(CLINICAL_EXECUTORS,caseId)){toast('Este caso todavía no tiene atención completa.');return;}
  if(!ids.length){toast('Elegí al menos un médico conectado.');return;}
  cancelSharedIntent();coopCaseId=caseId;
  const intent=cooperativeFlow.begin('host');
  try{await social.invite(ids);
   if(cooperativeFlow.current(intent)&&!coopRoomId)open('<h2>Invitación enviada</h2><p>Esperando que los colegas acepten la guardia compartida.</p>');
  }catch(error){if(cooperativeFlow.current(intent))toast(error.message);}
 }
 function clinicalChanged(){
  renderGuardCommunication();
  const patient=guardSession?.read()?.patient;
  if(durableClient)announceDeath(patient);
  if(outcomeId(patient))publishCooperativeState(window.performance.now(),true);
 }
 function maybeBeginCooperativeRoom(now=window.performance.now()){
  if(now<nextCooperativeAdmission||coopRoomId||durableStarting||durableJoining)return;
  const state=social.state(),room=state.room,role=social.isHost()?'host':'guest';
  if(!room||role==='host'&&!coopCaseId||
   !cooperativeFlow.mayEnter(role,{phase:world.snapshot().phase,hasSession:!!guardSession,recovering:state.recovering}))return;
  nextCooperativeAdmission=now+1000;
  beginCooperativeRoom(room);
 }
 function confirmOutcomeDelivery(host,p){
  if(guardSession!==replica)return;const id=outcomeId(p);if(id)social.send(host,{kind:'outcome.received',eventId:id,patientUid:p.uid});
 }
 function outcomeDelivered(){if(durableClient)return true;const s=social.state();return cooperativeFlow.delivered(guardSession?.read().patient,s.user?.id,s.room?.members||[]);}
 function requestLobby(){
  if(coopRoomId&&social.isHost()&&outcomeId(guardSession?.read().patient)&&!outcomeDelivered()){
   pendingCoopLeave=true;publishCooperativeState(window.performance.now(),true);toast('Esperando que tus colegas reciban el resultado. Si están desconectados, deben reconectarse.');return;
  }enterLobby(true);
 }
 function cancelSharedIntent(){cooperativeFlow.cancel();coopCaseId=null;pendingCoopLeave=false;social.leave();}
 function makeDurableClient(room){
  const credentials=social.credentials();
  let client;
  client=createDurableCooperativeReplica({window,roomId:room.id,clientKey:credentials.clientKey,
   authorization:()=>social.credentials().authorization,storage:window.sessionStorage,
   onError:()=>{const now=window.performance.now();if(now-lastDurableErrorAt>12000){
    lastDurableErrorAt=now;toast('Esperando la conexión clínica persistente. Las órdenes pendientes se conservan.');
   }},
   onSnapshot:value=>{
    if(durableClient!==client||coopRoomId!==room.id||destroyed)return;
    world.applySharedSpatial(value.spatial,window.performance.now(),client.lastAcknowledgedMotion(social.state().user?.id));
    const revision=value.clinical.room.revision;
    if(revision!==lastRemoteRevision){lastRemoteRevision=revision;clinicalChanged();}
    const terminal=outcomeId(value.clinical.patient);
    if(terminal)client.confirm(revision,terminal);
   }});
  return client;
 }
 function attachDurableRoom(room,client){
  const current=client.read(),spatial=client.snapshotSpatial();
  if(!current?.patient?.uid||!Object.hasOwn(CLINICAL_EXECUTORS,current.patient.caseId))
   throw Error('Invalid persistent clinical session');
  coopRoomId=room.id;cooperativeFlow.bind(room.id);announcedClosure=null;announcedDeathUid=null;
  world=createWorld(content,{...profile,id:social.state().user?.id||profile.id});
  world.enterGuard({mode:'coop',caseId:current.patient.caseId,patientUid:current.patient.uid,
   members:room.members.map(x=>({id:x.userId,name:x.name,color:'navy'})),authoritative:false});
  // Recovery uses a newly created world; its first input must be newer than
  // the sequence persisted for this same doctor in the previous session.
  world.seedMovementSequence(client.lastAcknowledgedMotion(social.state().user?.id));
  durableClient=client;replica=client;guardSession=client;lastRemoteRevision=-1;
  if(spatial)world.applySharedSpatial(spatial,window.performance.now(),client.lastAcknowledgedMotion(social.state().user?.id));
  lastClinicalFrame=window.performance.now();clinicalUI.reset();close();
  seenGuardMessages.clear();seenNpcMessages.clear();seenNurseCues.clear();nurseCueRows.length=0;lastNurseCueAt=-Infinity;lastPatientSpeechAt=-Infinity;fastWardSpeech.clear();resetChat('Guardia cooperativa persistente: el servidor controla la clínica.');
  ui('splash').hidden=true;ui('hud').hidden=false;ui('chatDock').hidden=false;
  clinicalChanged();updateHud();
 }
 async function maybeRecoverStoredRoom(){
  if(!restoreRoomId||durableJoining||durableStarting||coopRoomId||guardSession||
   world.snapshot().phase!=='lobby'||!social.state().user?.id)return;
  const id=restoreRoomId;durableJoining=true;let client;
  try{
   client=makeDurableClient({id});await client.sync();
   if(destroyed||coopRoomId||guardSession||world.snapshot().phase!=='lobby'||restoreRoomId!==id){
    client.dispose();return;
   }
   const clinical=client.read(),spatial=client.snapshotSpatial();
   const members=clinical.room.members.map(userId=>({userId,name:spatial.doctors.find(d=>d.id===userId)?.name||'Médico'}));
   const room=social.state().room?.id===id?social.state().room:
    {id,hostUserId:spatial.doctors[0]?.id,members,allAccepted:true};
   restoreRoomId=null;attachDurableRoom(room,client);
  }catch(error){
   client?.dispose();
   if(error.code==='recovery-client-not-enabled'||error.code==='missing'||error.status===404)
    restoreRoomId=null;
  }finally{durableJoining=false;}
 }
 async function beginCooperativeRoom(room){
  durableStarting=true;let client=null;
  const host=social.isHost();
  try{
   if(cooperativeCapability?.roomId!==room.id){
    const credentials=social.credentials();
    const response=await window.fetch('/api/clinical',{method:'POST',cache:'no-store',
     headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'capability',clientKey:credentials.clientKey})});
    if(!response.ok)throw Error('No se pudo verificar la autoridad persistente');
    const capability=await response.json();
    if(typeof capability.clinicalEnabled!=='boolean')throw Error('Autoridad clínica sin confirmar');
    cooperativeCapability={roomId:room.id,clinicalEnabled:capability.clinicalEnabled};
   }
   if(destroyed||coopRoomId||social.state().room?.id!==room.id||host&&!coopCaseId)return;
   if(!cooperativeCapability.clinicalEnabled){if(host&&room.allAccepted)startCooperativeHost(room);return;}
   // Durable admission depends on the authenticated HTTP room, not an RTC
   // hello. A guest retries a not-yet-created room on the next social poll.
   client=makeDurableClient(room);
   if(host)await client.start(coopCaseId);else await client.sync();
   if(destroyed||coopRoomId||social.state().room?.id!==room.id){client.dispose();return;}
   attachDurableRoom(room,client);
   social.broadcast({kind:'durable.hello',roomId:room.id});
  }catch(error){client?.dispose();if(host&&!destroyed&&!coopRoomId&&!(error.status===403&&!room.allAccepted))
   toast('No se inició la guardia: no se confirmó la autoridad del servidor.');}
  finally{durableStarting=false;}
 }
 async function joinDurableRoom(room){
  if(durableJoining||durableStarting||coopRoomId)return;
  durableJoining=true;let client;
  try{
   client=makeDurableClient(room);await client.sync();
   if(destroyed||coopRoomId||social.state().room?.id!==room.id){client.dispose();return;}
   attachDurableRoom(room,client);
  }catch{client?.dispose();if(!destroyed)toast('Esperando recuperar la guardia persistente.');}
  finally{durableJoining=false;}
 }
 function startCooperativeHost(room){
  coopRoomId=room.id;cooperativeFlow.bind(room.id);announcedClosure=null;announcedDeathUid=null;
  world=createWorld(content,{...profile,id:social.state().user.id});
  const members=room.members.map(x=>({id:x.userId,name:x.name,color:'navy'}));
  world.enterGuard({mode:'coop',caseId:coopCaseId,patientUid:room.id+':patient',members});
  const patient=world.snapshot().patients[0],hostId=social.state().user.id;
  guardSession=createGuardSession({roomId:room.id,mode:'coop',actorId:hostId,actorName:profile.name,members,patient,content,
   authenticate:id=>social.isMember(id)?{id,roomId:room.id}:null,
   nursing:{enqueue:task=>world.enqueueNurseJourney(task),takeArrivals:()=>world.takeNurseArrivals(),accept:r=>world.acceptNurseClinicalResult(r)},
   resolveContext:({actorId,targetPatientUid})=>({patientUid:world.patientInRangeFor(actorId,targetPatientUid||patient.uid),focusedNpc:actorId===hostId?focusedNpc:null}),
   onChange:clinicalChanged});
  lastClinicalFrame=window.performance.now();clinicalUI.reset();close();resetChat('Guardia cooperativa: un paciente, una autoridad y un chat compartido.');updateHud();
 }
 async function receiveCooperativePacket(sender,packet){
  if(destroyed)return;
  if(!coopRoomId&&packet.kind==='durable.hello'&&sender===social.state().room?.hostUserId&&
   packet.roomId===social.state().room?.id&&cooperativeFlow.mayEnter('guest',
   {phase:world.snapshot().phase,hasSession:!!guardSession,recovering:social.state().recovering})){
   joinDurableRoom(social.state().room);return;
  }
  if(packet.kind==='physician.preview'&&durableClient&&coopRoomId===packet.roomId){
   showWardSpeech({roomId:packet.roomId,userId:sender,id:packet.id,text:packet.text});
   return;
  }
  if(durableClient)return;
  if(!coopRoomId&&packet.kind==='state'&&sender===social.state().room?.hostUserId&&cooperativeFlow.mayEnter('guest',{phase:world.snapshot().phase,hasSession:!!guardSession,recovering:social.state().recovering})){
   const room=social.state().room;if(packet.roomId!==room.id||!Object.hasOwn(CLINICAL_EXECUTORS,packet.clinical?.patient?.caseId))return;
   coopRoomId=room.id;cooperativeFlow.bind(room.id);announcedClosure=null;announcedDeathUid=null;
   world=createWorld(content,{...profile,id:social.state().user.id});world.enterGuard({mode:'coop',caseId:packet.clinical.patient.caseId,
    patientUid:packet.clinical.patient.uid,members:room.members.map(x=>({id:x.userId,name:x.name})),authoritative:false});
   replica=createCooperativeReplica({roomId:room.id,hostId:sender,send:social.send,storage:window.sessionStorage,onSnapshot:value=>{
    world.applySharedSpatial(value.spatial,window.performance.now());
    if(value.clinical.room.revision!==lastRemoteRevision){lastRemoteRevision=value.clinical.room.revision;clinicalChanged();}
    confirmOutcomeDelivery(sender,value.clinical.patient);
   }});
   replica.apply(packet);guardSession=replica;clinicalUI.reset();close();resetChat('Guardia cooperativa conectada.');renderGuardCommunication();confirmOutcomeDelivery(sender,packet.clinical.patient);lastClinicalFrame=window.performance.now();return;
  }
  if(!guardSession||!coopRoomId)return;
  if(social.isHost()){
   if(!social.isMember(sender))return;
   if(packet.kind==='command'){
    const value=packet.envelope;if(!value||typeof value.id!=='string'||typeof value.text!=='string')return;
    const ack=await guardSession.post({id:value.id,text:value.text,...(value.targetPatientUid?{targetPatientUid:value.targetPatientUid}:{})},sender);
    social.send(sender,{kind:'ack',ack});publishCooperativeState(window.performance.now(),true);
   }
   if(packet.kind==='motion'&&Array.isArray(packet.target)&&packet.target.length===2&&packet.target.every(Number.isFinite))world.targetRemote(sender,...packet.target);
   if(packet.kind==='outcome.received'&&packet.patientUid===guardSession.read().patient.uid&&cooperativeFlow.confirm(packet.roomId,packet.eventId,sender,guardSession.read().patient,social.state().room.members)&&pendingCoopLeave&&outcomeDelivered())enterLobby(true);
  }else if(sender===social.state().room?.hostUserId)replica?.apply(packet);
 }
 function publishCooperativeState(now,force=false){
  if(durableClient){
   if(!coopRoomId||!social.isHost()||!force&&now-lastSharedPublish<1100)return;
   lastSharedPublish=now;social.broadcast({kind:'durable.hello',roomId:coopRoomId});return;
  }
  if(!coopRoomId||!social.isHost()||!guardSession||!force&&now-lastSharedPublish<100)return;
  lastSharedPublish=now;const s=world.snapshot(),id=social.state().user.id;
  social.broadcast({kind:'state',roomId:coopRoomId,sequence:++sharedSequence,clinical:guardSession.read(),catalog:guardSession.catalog(),
   spatial:{nurses:s.nurses,doctors:[{...s.player,id,kind:'doctor'},...s.others]}});
 }
 function line(name,text,system=false){
  history.push({name,text,system});if(history.length>300)history.shift();
  const el=document.createElement('div');el.className='line'+(system?' system':'');
  const who=document.createElement('b');who.textContent=name+':';el.append(who,document.createTextNode(text));
  ui('chatHistory').append(el);while(ui('chatHistory').children.length>300)ui('chatHistory').firstChild.remove();
  ui('chatHistory').scrollTop=ui('chatHistory').scrollHeight;
 }
 function showWardSpeech({roomId,userId,id,text}){
  if(!durableClient||roomId!==coopRoomId||typeof id!=='string'||
     typeof text!=='string'||text.length>280||!social.isMember(userId))return;
  const key='player:'+userId+':'+id;
  if(seenGuardMessages.has(key)||fastWardSpeech.has(key))return;
  const name=social.state().room?.members.find(m=>m.userId===userId)?.name||'Médico';
  const time=window.performance.now();
  fastWardSpeech.set(key,{id:key,name,text,time});
  seenGuardMessages.add(key);
  world.showGuardMessage(userId,text,time);
  line(name,text); // social speech preview: not a medication or medical receipt
  if(fastWardSpeech.size>60)fastWardSpeech.delete(fastWardSpeech.keys().next().value);
 }
 function renderGuardCommunication(){
  if(!guardSession)return;
  const clinicalState=guardSession.read(),rows=clinicalState.messages.slice(-300),fragment=document.createDocumentFragment();
  // One contextual nurse, always modest: asks about the next decision based
  // only on confirmed state or the doctor's OWN diagnostic impression.
  const workflow=clinicalWorkflow(clinicalState),cue=workflow?.cue,patientId=clinicalState.patient.uid;
  const cueTime=window.performance.now();
  const freshPatient=rows.some(row=>row.role==='patient'&&!seenNpcMessages.has(row.id));
  const canCue=!freshPatient&&cueTime-lastNurseCueAt>=28000&&cueTime-lastPatientSpeechAt>=12000;
  if(cue&&canCue&&!seenNurseCues.has(patientId+':'+cue.id)){
   seenNurseCues.add(patientId+':'+cue.id);lastNurseCueAt=cueTime;
   const message={id:'nurse-guidance:'+patientId+':'+cue.id,
    name:'Enfermera',role:'nurse',text:cue.text};
   nurseCueRows.push(message);
   if(nurseCueRows.length>5)nurseCueRows.shift();
   world.showNpcMessage('nurse',message.text,window.performance.now());
  }
  for(const row of rows){
   if(!['patient','nurse','mentor'].includes(row.role)||seenNpcMessages.has(row.id))continue;
   seenNpcMessages.add(row.id);
   if(row.role==='patient')lastPatientSpeechAt=window.performance.now();
   world.showNpcMessage(row.role,row.text,window.performance.now());
  }
  const actors=[...world.snapshot().others,world.snapshot().player];
  for(const row of rows){
   if(row.role!=='player'||seenGuardMessages.has(row.id))continue;
   seenGuardMessages.add(row.id);
   const actorId=social.state().user?.id;
   const author=actors.find(a=>row.id.startsWith('player:'+a.id+':'));
   if(actorId&&row.id.startsWith('player:'+actorId+':'))
    world.showGuardMessage('local-player',row.text,window.performance.now());
   else if(author)world.showGuardMessage(author.id,row.text,window.performance.now());
   else if(!coopRoomId)world.showGuardMessage('local-player',row.text,window.performance.now());
  }
  if(seenGuardMessages.size>800)for(const id of [...seenGuardMessages].slice(0,seenGuardMessages.size-500))
   seenGuardMessages.delete(id);
  const ids=new Set(rows.map(row=>row.id)),time=window.performance.now();
  for(const [id,preview] of fastWardSpeech)
   if(ids.has(id)||time-preview.time>15000)fastWardSpeech.delete(id);
  history.length=0;
  for(const row of [...rows,...nurseCueRows]){
   history.push({name:row.name,text:row.text,system:row.role!=='player'});
   const el=document.createElement('div'),who=document.createElement('b');
   el.className='line'+(['patient','nurse'].includes(row.role)?' '+row.role:'');
   el.dataset.messageId=row.id;el.dataset.role=row.role;
   who.textContent=row.name+':';el.append(who,document.createTextNode(row.text));fragment.append(el);
  }
  for(const preview of fastWardSpeech.values()){
   history.push({name:preview.name,text:preview.text,system:false});
   const el=document.createElement('div'),who=document.createElement('b');
   el.className='line';el.dataset.messageId=preview.id;
   who.textContent=preview.name+':';el.append(who,document.createTextNode(preview.text));
   fragment.append(el);
  }
  ui('chatHistory').replaceChildren(fragment);ui('chatHistory').scrollTop=ui('chatHistory').scrollHeight;
  clinicalUI.render();
  const closure=guardSession.read().patient.closure;
  if(coopRoomId&&closure?.closed)progress.award(closure);
  if(progress.read().receipts.length+progress.read().penalties.length!==savedRewardCount){
   try{window.localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress.read()));savedRewardCount=progress.read().receipts.length+progress.read().penalties.length;}
   catch{toast('Progreso confirmado en esta sesión; no se pudo guardar en este dispositivo.');}
  }
  updateHud();
  if(closure?.closed&&announcedClosure!==closure.eventId){announcedClosure=closure.eventId;
   open('<div id="caseResult">'+caseDebriefHTML(closure)+'</div><div class="actions"><button class="primary" data-action="return-lobby">Volver al lobby</button><button data-action="close">Seguir viendo el caso</button></div>','outcome');}
 }
 function resetChat(message){history.length=0;ui('chatHistory').replaceChildren();input.value='';focusedNpc=null;focusedPatientUid=null;updateTypingAssistance();line('ATRIA',message,true);}
 function announceDeath(p){
  if(!p?.patientDied||announcedDeathUid===p.uid)return;
  announcedDeathUid=p.uid;world.stop();patientWheel.hide();clinicalChecklist.hide();
  const penalty=guardSession?.read()?.progress?.penalties?.find(x=>x.patientUid===p.uid);
  const loss=penalty?.loss||0;
  open('<h2>Guardia finalizada</h2><p>El paciente falleció tras una alteración crítica sostenida de sus signos vitales. Se cancelaron las intervenciones pendientes.</p>'+
   '<div class="case-scorecard"><h3>Resultado · paciente fallecido</h3><p>Experiencia ganada: 0 XP</p>'+
   '<p class="score-loss">Experiencia descontada: -'+loss+' XP</p>'+
   '<p>La penalización no supera el saldo de experiencia anterior. No se inventa una evaluación después de la muerte.</p></div>'+
   '<div class="actions"><button class="primary" data-action="return-lobby">Volver al lobby</button></div>');
  updateHud();
 }
 function advanceClinicalTo(now){
  now=Math.max(lastClinicalFrame??now,now);
  const previous=lastClinicalFrame;lastClinicalFrame=now;
  if(!guardSession||previous===null)return;
  // The durable session's physiology runs only on the server. Its advance()
  // is a no-op; cloning a complete clinical snapshot 60 times/second here
  // blocked the mobile render loop. Death is handled on fresh snapshots.
  if(durableClient)return;
  guardSession.advance(Math.max(0,(now-previous)/1000),{typing:clinicalTyping});
  announceDeath(guardSession.read()?.patient);
 }
 function updateHud(){
  const s=world.snapshot(),guard=s.phase==='guard',clinical=guardSession?.read();
  autocompleteCaseId=guard?clinical?.patient?.caseId??null:null;
  const minute=Math.floor(clinical?.clock.gameMinute||0),total=8*60+15+minute;
  ui('status').textContent=guard&&clinical?.patient.patientDied?'Caso finalizado · Paciente fallecido':guard?(s.mode==='coop'?'Cooperativo':s.mode==='apprentice'?'Aprendiz':'Solitario')+' · '+String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0')+' · 5.0':social.state().user?'Lobby social · 5.0 experimental':'Lobby local · 5.0 experimental';
  if(guard)patientClinical.update(s.patients.find(p=>p.uid===clinical?.patient.uid),clinical);else patientClinical.hide();
  if(guard)clinicalChecklist.update(clinical);else clinicalChecklist.hide();
  ui('guardButton').textContent=guard?'Volver al lobby':'Hacer guardia';
  ui('peopleButton').textContent=guard?'Historia':'Personas';
  const career=progress.read();ui('playerProgress').textContent='Nivel '+career.level+' · '+(career.xp%200)+'/200 XP';world.setLevel(career.level);
  ui('recipientButton').textContent=guard?({nurse:'Enfermera',vega:'Dr. Vega'}[focusedNpc]||'Paciente cercano'):'Lobby · público';
  if(nurseQuick)nurseQuick.hidden=!guard;
  input.placeholder=guard?'Hablar en la guardia…':'Hablar en el lobby…';
  document.body.dataset.phase=s.phase;document.body.dataset.generation=String(s.generation);
 }
 function enterLobby(leaveShared=false){
  advanceClinicalTo(window.performance.now());
  if(leaveShared)restoreRoomId=null;
  if(leaveShared)cancelSharedIntent();
  seenGuardMessages.clear();seenNpcMessages.clear();seenNurseCues.clear();nurseCueRows.length=0;
  guardSession?.dispose();guardSession=null;replica=null;durableClient=null;coopRoomId=null;coopCaseId=null;lastMotion='';announcedClosure=null;announcedDeathUid=null;pendingPatientAction=null;clinicalUI.reset();patientWheel.hide();patientClinical.hide();clinicalChecklist.hide();close();// Everyone joining the lobby participates in the existing social presence loop;
  // opening Personas or choosing Cooperativo must not be a prerequisite.
  world.enterLobby();socialEnabled=true;resetChat('El lobby está listo para hablar.');
  ui('splash').hidden=true;ui('hud').hidden=false;ui('chatDock').hidden=false;updateHud();maybeRecoverStoredRoom();
 }
 function guardSetup(){
  if(draftMode==='coop')socialEnabled=true;
  open(`<h2>Hacer guardia</h2><p>Elegí la modalidad y el caso de práctica.</p><div class="modes">
   <button class="mode ${draftMode==='apprentice'?'active':''}" data-mode="apprentice"><b>Aprendiz</b><small>Con Dr. Vega. Navegación disponible; tutor clínico en migración.</small></button>
   <button class="mode ${draftMode==='solo'?'active':''}" data-mode="solo"><b>Solitario</b><small>Explorá el hospital con los recursos originales.</small></button>
   <button class="mode ${draftMode==='coop'?'active':''}" data-mode="coop"><b>Cooperativo</b><small>2–4 médicos comparten la misma atención.</small></button>
   <button class="mode" disabled><b>Competitivo</b><small>2–4 jugadores · pendiente de integrar.</small></button></div>
   <label class="field">Caso<select id="caseChoice">${content.cases.map(c=>`<option value="${esc(c.id)}">${esc(c.selector)}</option>`).join('')}</select></label>
   ${draftMode==='coop'?'<p>Invitar colegas conectados</p><div id="coopDoctors"></div>':''}
   <p class="note">CIRR, APP-001, peritonitis secundaria, PBE y terciaria: evaluación, estudios, tratamiento y cierre con XP. Otros casos: navegación y estudios. Tutor, voz y multijugador siguen en migración.</p>
   <div class="actions"><button data-action="close">Cancelar</button><button class="primary" data-action="start-guard">Entrar a la guardia</button></div>`);renderSocialLists();
 }
 function updateTypingAssistance(){
  if(!chatSuggestions)return;
  const patient=autocompleteCaseId;
  const nurseContext=!!guardSession&&!!patient&&(focusedNpc==='nurse'||/^\s*enfermer(?:a|o|ia)\b/i.test(input.value));
  const medical=nurseContext?clinicalCompletions(input.value,{
   caseId:patient,cases:content.cases,therapies:content.therapies
  }):[];
  const suggestions=medical.length?medical:spellingSuggestions(input.value);
  const fragment=document.createDocumentFragment();
  for(const item of suggestions){
   const button=document.createElement('button');button.type='button';
   button.dataset.assistReplacement=item.replacement;button.dataset.assistKind=item.kind;
   button.setAttribute('role','option');button.title='Completar texto sin enviar';
   button.textContent=(item.kind==='spelling'?'✎ ':'')+item.label;fragment.append(button);
  }
  chatSuggestions.replaceChildren(fragment);chatSuggestions.hidden=suggestions.length===0;
 }
 function selectRecipient(kind,patientUid=null){
  if(composition){deferredRecipient=kind;return;}
  focusedNpc=kind==='patient'?null:kind;
  focusedPatientUid=kind==='patient'?patientUid:null;
  const text=input.value.replace(/^(?:(?:dr\.?\s*)?vega|enfermera|enfermero)\s*[,.:]?\s*/i,'');
  const prefix=kind==='nurse'?'Enfermera, ':kind==='vega'?'Vega, ':'';
  input.value=prefix+text;updateHud();input.focus({preventScroll:true});input.setSelectionRange(prefix.length,prefix.length);updateTypingAssistance();
 }
 async function submitText(text,{patientUid}={}){
  if(!text.trim())return;
  if(guardSession&&/^\s*enfermer(?:a|o|ia)\b/i.test(text)){
   focusedNpc=null;focusedPatientUid=null;updateHud();
  }
  if(!guardSession){
   const userId=social.state().user?.id;
   if(!userId){toast('Conectando al lobby. Intentá de nuevo.');return;}
   const messageId=userId+':'+messageEpoch+':'+(++messageNumber);
   // Show the local message immediately, as in the original lobby, while
   // retaining one server-owned delivery for every other connected browser.
   seenLobbyMessages.add(messageId);line(profile.name,text);
   world.showLobbyMessage(userId,text,window.performance.now());
   try{await social.postLobbyMessage(text,messageId);}
   catch{line('ATRIA','Mensaje no enviado. Revisá la conexión y volvé a escribirlo.',true);
    toast('No se pudo enviar al lobby.');}
   return;
  }
  advanceClinicalTo(window.performance.now());
  // Speech is a visual local action, NOT an executed treatment. Display it
  // without waiting for PostgreSQL; clinical replies still require an ACK.
  world.showGuardMessage('local-player',text,window.performance.now());
  const id='message-'+(coopRoomId?messageEpoch+'-':'')+(++messageNumber);
  if(durableClient&&coopRoomId){
   const sender=social.state().user?.id;
   if(sender)showWardSpeech({roomId:coopRoomId,userId:sender,id,text});
   // Room speech is a display preview, never an order or a second authority.
   // Do not wait for this network path before submitting clinical action.
   social.postRoomSpeech({id,text}).catch(()=>{});
  }
  const session=guardSession;
  try{return await session.post({id,text,...(patientUid?{targetPatientUid:patientUid}:{})});}
  catch{if(guardSession===session)toast('No pude confirmar el mensaje.');}
 }
 function canvasDown(event){
  if(world.snapshot().phase==='title')return;
  const [x,y]=renderer.toWorld(event.clientX,event.clientY);
  if(world.snapshot().phase==='lobby'){
   const player=world.snapshot().others.find(p=>Math.hypot(p.x-x,p.y-y)<=25);
   if(player){showLobbyPlayerCard(player.id);return;}
  }
  const hit=world.interactionAt(x,y);
  if(hit){
   pendingPatientAction=null;
   const result=world.beginInteraction(hit.id);drag=null;
   if(result.status==='ready')activateEntity(result.entity);
   else if(result.status==='walking')toast('Acercándote al paciente…');
   else toast('Acercate para interactuar.');
   return;
  }
  document.activeElement?.blur?.();pendingPatientAction=null;patientWheel.hide();close();
  if(!world.target(x,y))toast('No hay una ruta disponible.');
  drag={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);
 }
 function activateEntity(entity){
  world.stop();
  if(entity.patientUid){
   const p=world.snapshot().patients.find(p=>p.uid===entity.patientUid);if(!p)return;
   if(pendingPatientAction?.uid===p.uid){
    const action=pendingPatientAction;pendingPatientAction=null;
    if(action.destination)clinicalUI.chooseDestination(p,action.destination);
    else clinicalUI.showDiagnosis(p);
    return;
   }
   if(entity.kind==='monitor')clinicalUI.showMonitor(p);else{
    patientWheel.show(p);clinicalChecklist.show(p.uid,guardSession?.read());
   }
  }else selectRecipient(entity.kind);
 }
 function showProfile(){
  const s=world.snapshot();
  open(`<h2>Perfil</h2><p>${esc(profile.name)} · Nivel ${progress.read().level} · ${progress.read().xp} XP</p><p>Los progresos de la versión estable se conservan separados de esta prueba.</p>
   <label class="field">Alias<input id="aliasChoice" value="${esc(profile.name)}" maxlength="32"></label>
   <label class="field">Ambo<select id="colorChoice">${['navy','green','gray','pink','teal'].filter(k=>content.assets['player-'+k]).map(k=>`<option value="${k}" ${k===profile.scrubColor?'selected':''}>${esc(content.colors[k]?.[0]||k)}</option>`).join('')}</select></label>
   <div class="actions"><button data-action="close">Cerrar</button><button data-action="save-profile" ${s.phase==='guard'?'disabled':''}>Guardar</button></div>`);
 }
 ui('playerName').value=profile.name;ui('enterButton').textContent='Entrar al hospital →';ui('enterButton').disabled=false;
 listen(ui('profileForm'),'submit',event=>{
  event.preventDefault();profile={...profile,name:ui('playerName').value.trim().slice(0,32)||'Médico'};
  social.setProfile(profile);
  try{window.localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{/* session still usable */}
  world=createWorld(content,profile);enterLobby();
 });
 listen(ui('notificationsButton'),'click',showPeople);
 listen(ui('friendRequestAccept'),'click',async()=>{
  const id=ui('friendRequestNotice').dataset.user;if(!id)return;
  try{await social.acceptFriend(id);}catch(error){toast(error.message||'No se pudo aceptar la amistad.');}
 });
 listen(ui('friendRequestDecline'),'click',async()=>{
  const id=ui('friendRequestNotice').dataset.user;if(!id)return;
  try{await social.declineFriend(id);}catch(error){toast(error.message||'No se pudo rechazar la amistad.');}
 });
 listen(ui('coopInviteAccept'),'click',()=>acceptCooperativeInvitation(ui('coopInviteNotice').dataset.room));
 listen(ui('coopInviteDecline'),'click',async()=>{
  const roomId=ui('coopInviteNotice').dataset.room;
  if(!roomId)return;
  ui('coopInviteNotice').hidden=true;
  try{await social.declineInvitation(roomId);}catch(error){
   toast(error.message||'No se pudo rechazar la invitación.');
   renderInvitationNotice(social.state());
  }
 });
 listen(ui('guardButton'),'click',()=>world.snapshot().phase==='guard'?requestLobby():guardSetup());
 listen(ui('peopleButton'),'click',()=>world.snapshot().phase==='guard'?clinicalUI.showPatient(world.snapshot().patients.find(p=>p.uid===world.nearby())||world.snapshot().patients[0]):
  showPeople());
 listen(ui('profileButton'),'click',showProfile);listen(ui('modalClose'),'click',close);
 listen(clinicalChecklist.root,'click',event=>{
  if(event.target.closest('[data-action="toggle-clinical-checklist"]')){
   clinicalChecklist.toggle();clinicalChecklist.update(guardSession?.read());
  }
 });
 listen(patientClinical.root,'click',event=>{
  const button=event.target.closest('button');if(!button)return;
  const s=world.snapshot(),uid=patientClinical.root.dataset.patientUid;
  const entity=s.entities.find(x=>x.kind==='patient'&&x.patientUid===uid);if(!entity)return;
  pendingPatientAction={uid,destination:button.dataset.patientDestination||null};
  const result=world.beginInteraction(entity.id);
  if(result.status==='ready')activateEntity(result.entity);
  else if(result.status==='walking')toast('Acercándote al paciente…');
  else{pendingPatientAction=null;toast('Acercate para interactuar.');}
 });
  listen(patientWheel.root,'click',event=>{
   const b=event.target.closest('button[data-patient-action]');if(!b)return;
   const p=world.snapshot().patients.find(p=>p.uid===patientWheel.patientUid());
   patientWheel.hide();if(p)clinicalUI.openSection(p,b.dataset.patientAction);
  });
 listen(dialog,'click',async event=>{
  if(await clinicalUI.handle(event.target))return;
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.mode){if(button.dataset.mode!=='coop')cancelSharedIntent();draftMode=button.dataset.mode;guardSetup();}
  if(button.dataset.action==='inspect-player'){showLobbyPlayerCard(button.dataset.user);return;}
  if(button.dataset.action==='add-friend'||button.dataset.action==='accept-friend'){
   try{
    if(button.dataset.action==='accept-friend')await social.acceptFriend(button.dataset.user);
    else await social.addFriend(button.dataset.user);
    if(dialog.dataset.panel==='lobby-person')showLobbyPlayerCard(button.dataset.user);
    else renderSocialLists();
   }catch(error){toast(error.message||'No se confirmó la amistad.');}
   return;
  }
  if(button.dataset.action==='invite-friend'){
   await inviteColleagues([button.dataset.user],ui('friendCase')?.value||'PERI-PBE-001');return;
  }
  if(button.dataset.action==='close')close();
  if(button.dataset.action==='return-lobby'){requestLobby();return;}
  if(button.dataset.action==='join-coop'){
   await acceptCooperativeInvitation(button.dataset.room);return;
  }
  if(button.dataset.action==='start-guard'){
   if(draftMode==='coop'){
    await inviteColleagues([...document.querySelectorAll('#coopDoctors input:checked')].map(x=>x.value),ui('caseChoice').value);return;
   }
   cancelSharedIntent();
   announcedClosure=null;seenGuardMessages.clear();seenNpcMessages.clear();seenNurseCues.clear();nurseCueRows.length=0;
   guardSession?.dispose();announcedDeathUid=null;pendingPatientAction=null;clinicalUI.reset();patientWheel.hide();patientClinical.hide();clinicalChecklist.hide();world.enterGuard({mode:draftMode,caseId:ui('caseChoice').value});
   const s=world.snapshot(),roomId='guard-'+window.crypto.randomUUID();
   guardSession=createGuardSession({roomId,mode:s.mode,actorId:'local-player',actorName:profile.name,progress,
    patient:s.patients[0],content,nursing:{enqueue:task=>world.enqueueNurseJourney(task),takeArrivals:()=>world.takeNurseArrivals(),accept:result=>world.acceptNurseClinicalResult(result)},resolveContext:({targetPatientUid})=>({
     patientUid:targetPatientUid!==undefined?world.patientInRange(targetPatientUid):focusedPatientUid?world.patientInRange(focusedPatientUid):world.nearby(),focusedNpc}),
    onChange:(event,room)=>{
     if(guardSession?.read().room.roomId!==room.roomId)return;
     renderGuardCommunication();
     // A native closure is the ONLY trigger. Chat messages that merely ask
     // for admission, surgery or discharge must never display an XP outcome.
    }});
   lastClinicalFrame=window.performance.now();
   close();resetChat(Object.hasOwn(CLINICAL_EXECUTORS,s.caseId)?'Guardia clínica. Evaluación, estudios, tratamiento y cierre disponibles.':'Guardia abierta. Consultá la historia y elegí cómo evaluar al paciente.');updateHud();
  }
  if(button.dataset.action==='patient-chart'){
   const p=world.snapshot().patients.find(p=>p.uid===clinicalUI.patientUid());if(p)clinicalUI.showPatient(p);
  }
  if(button.dataset.action==='save-profile'){
   const next={name:ui('aliasChoice').value.trim().slice(0,32)||'Médico',scrubColor:ui('colorChoice').value};
   world.setAppearance(next);profile=next;
   social.setProfile(profile);
   try{window.localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{}
   close();updateHud();
  }
 });
 listen(dialog,'input',event=>clinicalUI.onInput(event.target));
 listen(dialog,'pointerdown',event=>{if(event.target.closest('[data-action="diagnosis-suggestion"]'))event.preventDefault();});
 listen(dialog,'keydown',event=>{
  if(event.target?.id==='diagnosisInput'&&event.key==='Enter'&&!event.isComposing){event.preventDefault();clinicalUI.saveDiagnosis();return;}
  if(event.target?.id==='monitorOrderInput'&&event.key==='Enter'){
   event.preventDefault();clinicalUI.submitMonitorOrder();return;
  }
  if(['Enter',' '].includes(event.key)&&event.target.matches('svg [data-exam-region]')){
   event.preventDefault();clinicalUI.handle(event.target);
  }
 });
 listen(nurseQuick,'click',()=>{if(guardSession)selectRecipient('nurse');});
 listen(chatSuggestions,'pointerdown',event=>{
  if(event.target.closest('[data-assist-replacement]'))event.preventDefault();
 });
 listen(chatSuggestions,'click',event=>{
  const button=event.target.closest('[data-assist-replacement]');if(!button)return;
  input.value=button.dataset.assistReplacement||input.value;
  input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);
  input.dispatchEvent(new window.Event('input',{bubbles:true}));
 });
 // Limit fuzzy suggestion renders to one per frame; insert typed letters immediately.
 let assistFrame=0;
 listen(input,'input',()=>{
  if(composition||assistFrame)return;
  assistFrame=window.requestAnimationFrame(()=>{
   assistFrame=0;if(!signal?.aborted)updateTypingAssistance();
  });
 });
 listen(ui('recipientButton'),'click',()=>{
  if(world.snapshot().phase==='guard')selectRecipient(focusedNpc==='nurse'?'patient':'nurse');
 });
 listen(ui('historyButton'),'click',()=>{
  const expanded=ui('chatHistory').classList.toggle('expanded');ui('historyButton').setAttribute('aria-expanded',String(expanded));
 });
 listen(ui('chatForm'),'submit',event=>{
  event.preventDefault();if(composition)return;const text=input.value.trim();if(!text)return;
  input.value='';updateTypingAssistance();submitText(text);
 });
 listen(input,'compositionstart',()=>composition=true);
 listen(input,'compositionend',()=>{composition=false;if(deferredRecipient){const target=deferredRecipient;deferredRecipient=null;selectRecipient(target);}updateTypingAssistance();});
 listen(canvas,'pointerdown',canvasDown);
 listen(canvas,'pointermove',event=>{
  if(!drag||drag.id!==event.pointerId||Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)return;
  const [x,y]=renderer.toWorld(event.clientX,event.clientY);world.target(x,y);drag={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 const stopDrag=()=>drag=null;listen(canvas,'pointerup',stopDrag);listen(canvas,'pointercancel',stopDrag);
 listen(window,'keydown',event=>{
  if(event.key==='Escape'){pendingPatientAction=null;patientWheel.hide();close();input.blur();world.stop();return;}
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||dialog.open)return;
  const v={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];
  if(v){event.preventDefault();const p=world.snapshot().player;world.target(p.x+v[0]*32,p.y+v[1]*30);}
 });
 function resize(){if(document.activeElement!==input||window.innerWidth!==renderer.metrics().width){renderer.resize();}}
 listen(window,'resize',resize);
 const keyboard=()=>{
  const vp=window.visualViewport,gap=vp&&document.activeElement===input?Math.max(0,window.innerHeight-vp.height-vp.offsetTop):0;
  document.documentElement.style.setProperty('--dock-bottom',gap>0?gap+'px':'max(7px, env(safe-area-inset-bottom))');
 };
 if(window.visualViewport){listen(window.visualViewport,'resize',keyboard);listen(window.visualViewport,'scroll',keyboard);}
 listen(input,'focus',()=>{world.stop();drag=null;keyboard();});listen(input,'blur',()=>{keyboard();resize();});
 // Focus transitions split native .12/.03-rate epochs at their actual time;
 // clinical study/preparation time remains independent of text editing.
 listen(document,'focusin',event=>{advanceClinicalTo(window.performance.now());clinicalTyping=/INPUT|TEXTAREA/.test(event.target?.tagName);});
 listen(document,'focusout',event=>{advanceClinicalTo(window.performance.now());clinicalTyping=/INPUT|TEXTAREA/.test(event.relatedTarget?.tagName);});
 function frame(now){
  if(destroyed)return;raf=null;frames++;atriaKeyboard.advance(now);
  advanceClinicalTo(now);
  scheduler.tick(now,{simulate:dt=>{world.step(dt,now);presentation.advance(world.snapshot());},maintain:()=>{guardSession?.finishNurseArrivals();
   const s=world.snapshot();if(s.phase!=='title'&&(socialEnabled||coopRoomId||social.state().recovering))social.maintain(now,{...s.player,phase:s.phase,roomId:coopRoomId});
   // Admission can retry while RTC signaling is stalled inside social.poll.
   // The existing RAF/deadline drives it; there is no additional timer.
   if(s.phase==='lobby'&&!guardSession)maybeBeginCooperativeRoom(now);
   if(durableClient){
    durableClient.setTyping(clinicalTyping);
    const intent=world.motionIntent(),key=JSON.stringify(intent);
    if(intent&&key!==lastMotion){lastMotion=key;durableClient.motion(intent.target,intent.sequence);}
    durableClient.maintain(now,{moving:s.player.moving});
   }else if(replica){replica.maintain(now);const key=JSON.stringify(s.player.target||[s.player.x,s.player.y]);
    if(key!==lastMotion){lastMotion=key;const host=social.state().room?.hostUserId;if(host)social.send(host,{kind:'motion',target:s.player.target||[s.player.x,s.player.y]});}}
   publishCooperativeState(now);
   if(toastUntil&&now>=toastUntil){ui('toast').hidden=true;toastUntil=0;}
   const interaction=world.takeInteraction();if(interaction)activateEntity(interaction);
   if(guardSession&&now-lastPanelUpdate>=1000){
    lastPanelUpdate=now;updateHud();clinicalUI.render();
    if(now-lastNurseCueAt>=28000&&now-lastPatientSpeechAt>=12000){
     const s=guardSession.read(),cue=clinicalWorkflow(s)?.cue;
     if(cue&&!seenNurseCues.has(s.patient.uid+':'+cue.id))renderGuardCommunication();
    }
   }
  },render:()=>{drawWorld(now);clinicalUI.animate(now);},isMobile:window.innerWidth<700});
  raf=window.requestAnimationFrame(frame);
 }
 function resume(){if(!destroyed&&raf===null){const now=window.performance.now();lastClinicalFrame=now;
  clinicalTyping=/INPUT|TEXTAREA/.test(document.activeElement?.tagName);scheduler.reset(now);presentation.reset(world.snapshot());raf=window.requestAnimationFrame(frame);}}
 function pause(){advanceClinicalTo(window.performance.now());lastClinicalFrame=null;if(raf!==null){window.cancelAnimationFrame(raf);raf=null;}world.stop();}
 function destroy(){if(destroyed)return;destroyed=true;guardSession?.dispose();guardSession=null;social.dispose();pendingPatientAction=null;patientWheel.hide();patientClinical.hide();clinicalChecklist.hide();pause();close();atriaKeyboard.destroy();rootLifecycle.leave();}
 listen(document,'visibilitychange',()=>document.hidden?pause():resume());
 listen(window,'pagehide',event=>event.persisted?pause():destroy());listen(window,'pageshow',resume);
 if(signal)listen(signal,'abort',destroy,{once:true});
 drawWorld();resume();
 return Object.freeze({snapshot:()=>({...world.snapshot(),history:structuredClone(history),clinical:guardSession?.read()||null}),
  diagnostics:()=>({destroyed,raf:raf===null?0:1,listeners:destroyed?0:listeners.length+atriaKeyboard.listenerCount(),timers:0,frames,
   renderer:renderer.metrics(),keyboard:{open:atriaKeyboard.isOpen()},generation:world.snapshot().generation,
   cooperative:{roomId:coopRoomId,authority:!!coopRoomId&&!replica,replica:!!replica,durable:!!durableClient,connections:social.state().connections}}),destroy});
}
