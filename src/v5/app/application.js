import {createClinicalHintPresenter,createVegaHintCard} from '../ui/clinical-hint-presenter.js';
import {FrameScheduler} from '../../app/frame-scheduler.js';
import {Lifecycle} from '../../app/lifecycle.js';
import {createWorld} from './world.js';
import {SCRUB_COLORS,AVATAR_SEXES} from './avatar-appearance.js';
import {createHospitalRenderer} from '../render/hospital.js';
import {createAvatarCreator} from '../ui/avatar-creator.js';
import {createWelcomeFlow} from '../ui/welcome-flow.js';
import {createPresentationTimeline} from '../render/presentation-timeline.js';
import {createGuardSession} from '../clinical/guard-session.js';
import {isExaminationCommand} from '../clinical/exam-contract.js';
import {formatGuardTime} from '../ui/guard-time.js';
import {playableClinicalCaseIds} from '../content/clinical-cases.js';
import {eligibleGuardCases,GUARD_SCOPES,guardCaseSpecialty,guardCaseSequence} from '../clinical/guard-selection-policy.js';
import {createCooperativeLink} from '../social/cooperative-link.js';
import {createAccountClient} from '../social/account-client.js';
import {awaitAbortable} from '../core/abortable-operation.js';
import {createGuardRecovery,guardRecoveryHTML} from '../ui/guard-recovery.js';
import {createCooperativeReplica} from '../social/cooperative-replica.js';
import {createDurableCooperativeReplica,CLINICAL_REQUEST_TIMEOUT_MS} from '../social/durable-cooperative-replica.js';
import {createClinicalConnectionNotice} from '../social/clinical-connection-notice.js';
import {createCooperativeLifecycle,outcomeId} from '../social/cooperative-lifecycle.js';
import {createProgressionLedger} from '../clinical/progression.js';
import {createLocalShift} from './local-shift.js';
import {createReceptionAssignment} from './reception-assignment.js';
import {createDirectPatientSelection,directPatientIntent,resolveClinicalMessageTarget} from './patient-selection.js';
import {createReceptionOnboarding} from '../ui/reception-onboarding.js';
import {createShiftFlow,receptionAcuity} from '../clinical/shift-flow.js';
import {receptionBoardHTML} from '../ui/reception-board.js';
import {canHearWardDoctor,canHearWardPatient} from '../ui/spatial-ward-speech.js';
import {createAtriaKeyboard} from '../ui/atria-keyboard.js';
import {createHospitalAudio} from '../ui/hospital-audio.js';
import {uiSoundForTarget,uiSoundForChange} from '../ui/ui-sound-policy.js';
import {audioSettingsHTML,renderMusicToggle} from '../ui/audio-settings.js';
import {createChatTranscript} from '../ui/chat-transcript.js';
import {createGuardChannelView,guardActivityRows,guardTurnDialogHTML} from '../ui/guard-communication-view.js';
import {createGuardSpeechMemory} from '../ui/guard-speech-memory.js';
import {visibleWardChatRows,createWardChatHistory} from '../ui/guard-chat-view.js';
import {clinicalCompletions,spellingSuggestions} from '../ui/clinical-autocomplete.js';
import {createClinicalInterface} from '../ui/clinical-controller.js';
import {clinicalWorkflow} from '../ui/clinical-workflow.js';
import {publicClinicalText,activeNurseGuidance,selectNurseGuidance,
 finalNurseMessage,visibleClinicalRows} from '../ui/guard-message-policy.js';
import {caseDebriefHTML} from '../ui/case-debrief.js';
import {guardScoreModelV5,guardScoreboardHTML} from '../ui/guard-scoreboard.js';
import {createPatientActionWheel} from '../ui/patient-actions.js';
import {createUnassignedPatientGlow,suggestedBedsideAction} from '../ui/bedside-guidance.js';
import {createPatientClinicalOverlay} from '../ui/diagnostic-impression.js';
import {createClinicalChecklist} from '../ui/clinical-checklist.js';
import {createLobbyDirectory} from '../ui/lobby-directory.js';
import {playerProfileCardHTML} from '../ui/player-profile-card.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PROFILE_KEY='atria.v5.profile.v1';
const PROGRESS_KEY='atria.v5.progress.v1';
const supportedColors=new Set(SCRUB_COLORS);
const clinicalRejectionMessages=Object.freeze({
 'approach-patient-to-claim':'Acercate a una cama para hablar con ese paciente.',
 'ambiguous-patient-selection':'Hay varios pacientes cerca. Tocá la cama que querés atender.',
 'other-player-owns-patient':'Ese paciente pertenece a otro médico. Acercate a otro box libre.',
 'patient-selection-changed':'El paciente seleccionado cambió. Repetí la orden en el box correcto.',
 'patient-claim-conflict':'No se pudo confirmar la asignación. Volvé a seleccionar al paciente.',
 'patient-not-active':'La atención ya finalizó. El mensaje no se ejecutó.',
 'shift-ended':'La guardia finalizó. El mensaje no se ejecutó.'
});
export function readProfile(storage){
 try{
  const saved=JSON.parse(storage.getItem(PROFILE_KEY)||storage.getItem('clinicalShift.profile.v1')||'null');
  return {name:String(saved?.name||'Médico').slice(0,32),scrubColor:supportedColors.has(saved?.scrubColor)?saved.scrubColor:'navy',sex:AVATAR_SEXES.includes(saved?.sex)?saved.sex:'male'};
 }catch{return {name:'Médico',scrubColor:'navy',sex:'male'};}
}

/** Exactly one owner for boot, input listeners, RAF and all mode transitions. */
export async function createApplication({document,window,content,signal}){
 const playableIds=new Set(playableClinicalCaseIds(content.cases));
 const rootLifecycle=new Lifecycle(),scope=rootLifecycle.enter('application');
 const account=createAccountClient({window});
 let progress;try{progress=createProgressionLedger(JSON.parse(window.localStorage.getItem(PROGRESS_KEY)||'{}'));}catch{progress=createProgressionLedger();}
 let savedRewardCount=progress.read().receipts.length+progress.read().penalties.length;
 const animatedExperience=new Set();
 const career=()=>account.read()||progress.read();
 let accountTransition=Promise.resolve();
 let guardRecovery=null;
 let profile=readProfile(window.localStorage),world=createWorld(content,profile),destroyed=false,raf=null,
  toastUntil=0,focusedNpc=null,focusedPatientUid=null,draftMode='solo',composition=false,deferredRecipient=null,drag=null,frames=0,
  guardSession=null,lastPanelUpdate=0,messageNumber=0,lastClinicalFrame=null,clinicalTyping=false,
  announcedDeathUid=null,pendingPatientAction=null,announcedClosure=null,coopCaseId=null,coopGuardSelection=null,
  coopRoomId=null,replica=null,durableClient=null,lastSharedPublish=0,sharedSequence=0,lastMotion='',lastRemoteRevision=-1,socialEnabled=false,
  durableStarting=false,durableJoining=false,nextCooperativeAdmission=0,cooperativeCapability=null;
 let frameErrorCount=0,lastFrameError=null;
 let localAdmissions=null,localSessions=new Map(),localRoomId=null,lastReceivedPatientCount=0,lastSelectedPatientUid=null,shiftEndedAnnounced=false;
 // Transient reception travel state is UI-only; the server remains the sole
 // authority for physical proximity, patient ownership and clinical commands.
 const receptionAssignment=createReceptionAssignment({
  claim:uid=>{
   if(durableClient)return durableClient.claim(uid);
   // Same physical arrival controller for local guard. Reuse the already
   // instantiated patient session and map interaction; no parallel owner.
   const next=localSessions.get(uid);
   if(!next)return false;
   const firstContact=!next.read().messages.some(row=>row.role==='player');
   receptionAssignment.cancel();
   activateEntity({kind:'patient',patientUid:uid});
   if(guardSession!==next)return false;
   if(firstContact)void submitText('Hola ¿Qué te pasó?',{patientUid:uid});
   return true;
  },
  cancelClaim:uid=>durableClient?.cancelClaim(uid)
 });
 const cancelReceptionAssignment=()=>receptionAssignment.cancel();
 const directSelection=createDirectPatientSelection();
 const receptionOnboarding=createReceptionOnboarding({
  button:document.getElementById('receptionButton'),
  guide:document.getElementById('receptionGuide'),window
 });
 const messageEpoch=window.crypto.randomUUID(),cooperativeFlow=createCooperativeLifecycle();let pendingCoopLeave=false;
 let invitingColleagues=false,savingShift=false;
 let restoreRoomId=null;try{restoreRoomId=window.localStorage.getItem('atria.v5.coop.room');}catch{}
 const ui=id=>document.getElementById(id),input=ui('dieInput'),canvas=ui('game'),dialog=ui('modal');
 const scheduler=new FrameScheduler({mobileRenderHz:60}),listeners=[];
 const hospitalAudio=createHospitalAudio({window,storage:window.localStorage});
 // Attempt immediately; a blocked browser context is retried inside the first
 // trusted pointer/keyboard gesture, including gestures outside menu buttons.
 listen(document,'pointerdown',()=>hospitalAudio.unlock(),{capture:true,passive:true});
 listen(document,'keydown',()=>hospitalAudio.unlock(),{capture:true});
 hospitalAudio.unlock();
 const renderMusic=()=>renderMusicToggle(document,hospitalAudio.state(),{inHospital:world.snapshot().phase!=='title'});
 renderMusic();
 const renderer=await createHospitalRenderer(canvas,content,{signal,window}).catch(error=>{
  hospitalAudio.destroy();rootLifecycle.leave();throw error;
 });
 const presentation=createPresentationTimeline(world.snapshot());
 const patientWheel=createPatientActionWheel({document,window});
 const unassignedGlow=createUnassignedPatientGlow({document});
 function guidePatientWheel(){
  const state=guardSession?.read(),selected=patientWheel.patientUid();
  patientWheel.guide(selected&&state?.patient.uid===selected?suggestedBedsideAction(state):null);
  patientWheel.hintAvailable(!!selected&&clinicalHintContext()?.patientUid===selected);
 }
 const patientClinical=createPatientClinicalOverlay({document,window,cases:content.cases});
 const clinicalChecklist=createClinicalChecklist({document});
 const vegaHintCard=createVegaHintCard({document,portraitUrl:content.assetUrls.vega});
 function clinicalHintContext(){
  const s=guardSession?.read(),self=durableClient?account.read()?.actorId||social.state().user?.id:
   coopRoomId?social.state().user?.id:'local-player';
  if(world.snapshot().phase!=='guard'||!s?.hintBinding||s.patient.caseEnded||s.patient.patientDied||s.canEdit===false||
   focusedPatientUid!==s.patient.uid||s.shift?.ended||
   durableClient&&s.shift?.confirmedFocusPatientUid!==s.patient.uid||
   s.competition&&s.competition.ownerId!==self)return null;
  return {...s.hintBinding,actorId:self,selectionRevision:s.hintBinding.selectionRevision??0};
 }
 async function revealDiagnosis(uid){
  const binding=clinicalHintContext(),session=guardSession;
  if(!binding||binding.patientUid!==uid||!session)return {status:'rejected'};
  const receipt=await awaitAbortable(session.hint({...binding,op:'reveal-diagnosis',requestId:window.crypto.randomUUID()}),
   AbortSignal.timeout(20000));
  const current=clinicalHintContext();
  if(session!==guardSession||!current||['roomId','encounterId','patientUid','actorId','selectionRevision']
    .some(key=>binding[key]!==current[key]))return {status:'stale'};
  return receipt;
 }
 const clinicalHintPresenter=createClinicalHintPresenter({
  context:clinicalHintContext,request:request=>guardSession?.hint(request)??Promise.resolve({status:'rejected'}),
  show:hint=>vegaHintCard.show(hint,world.snapshot().patients.find(p=>p.uid===hint.patientUid)?.bedId),
  hide:()=>vegaHintCard.hide(),notify:toast,
  pending:waiting=>{
   const message='Dr. Vega está buscando la próxima acción…';
   if(waiting)toast(message);
   else if(ui('toast').textContent===message)ui('toast').hidden=true;
  },
  paint:()=>new Promise(resolve=>window.requestAnimationFrame(resolve)),
  visible:()=>document.visibilityState!=='hidden',
  id:()=>window.crypto.randomUUID(),onCount:()=>updateHud()
 });
 listen(vegaHintCard.close,'click',()=>clinicalHintPresenter.cancel());

 const lobbyDirectory=createLobbyDirectory({document,escape:esc});
 let scoreMarkup='';
 // Unsupported catalog cases remain navigable, but subsequent arrivals rotate
 // only among cases with certified clinical executors.
 const localShift=createLocalShift({caseIds:content.cases.map(c=>c.id),
  rotationCaseIds:[...playableIds]});
 let audioPatient=null,lastAudioRead=-Infinity;
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
  const hudBottom=ui('hud').getBoundingClientRect().bottom,dockTop=ui('chatDock').getBoundingClientRect().top;
  patientWheel.position(renderer,hudBottom,dockTop);
  vegaHintCard.position(hudBottom);
  unassignedGlow.position(renderer,hudBottom,dockTop);
  patientClinical.position(renderer,hudBottom,dockTop,
   {obscured:dialog.open||patientWheel.isOpen()||worldSnapshot.phase!=='guard',
    // Read-only collision query from the SAME navigation owner. The badge
    // cannot intercept a reachable tile when a solid anchor is available.
    isWalkableScreen:(clientX,clientY)=>{
     const [worldX,worldY]=renderer.toWorld(clientX,clientY);
     const [column,row]=world.navigation.tileAt(worldX,worldY);
     return world.navigation.passable(column,row);
    }});
 }
 const history=[],transcript=createChatTranscript({document,element:ui('chatHistory'),history}),
  guardChannels=createGuardChannelView({storage:window.sessionStorage}),
  guardSpeech=createGuardSpeechMemory({storage:window.sessionStorage}),
  wardChatHistory=createWardChatHistory({storage:window.sessionStorage}),
  seenLobbyMessages=new Set(),seenGuardMessages=new Set(),seenNpcMessages=new Set(),
  seenNurseCues=new Set(),nurseCueRows=[];let lastNurseCueAt=-Infinity,lastPatientSpeechAt=-Infinity,selectedLobbyPlayerId=null,selectedLobbyCardState=null;
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
  if(dialog.dataset.panel==='account-recover'&&kind!=='account-recover')guardRecovery?.cancel();
  clinicalHintPresenter.cancel();
  world.stop();drag=null;patientWheel.hide();dialog.dataset.panel=kind;
  ui('modalContent').innerHTML=html;if(!dialog.open)dialog.showModal();
 }
 function close({preserveRecovery=false}={}){
  if(dialog.dataset.panel==='account-recover'&&!preserveRecovery)guardRecovery?.cancel();
  if(dialog.open)dialog.close();delete dialog.dataset.panel;
 }
 function dismissModal(){
  const fromRecovery=dialog.dataset.panel==='account-recover';
  close();
  if(fromRecovery)returnFromGuardRecovery();
 }
 const clinicalUI=createClinicalInterface({document,session:()=>guardSession,open,close,send:(text,options)=>submitText(text,{...options,clinical:true}),notify:toast,cases:content.cases,
  onTalk:uid=>selectRecipient('patient',uid),therapies:content.therapies,revealDiagnosis,
   onMonitorOpen:()=>hospitalAudio.cue('monitorOpen')});
 const social=createCooperativeLink({window,profile,onAccount:value=>account.accept(value),
  onSocial:()=>{if(destroyed)return;const s=social.state();renderNotifications(s);if(world.snapshot().phase==='lobby'){
   if(s.user){profile={...profile,id:s.user.id};world.setSocialIdentity(s.user.id);}world.showLobbyPlayers(s.roster.filter(p=>!p.status||p.status==='disponible'),window.performance.now());renderLobbyMessages(s);renderSocialLists();
   if(dialog.open&&dialog.dataset.panel==='lobby-person'&&selectedLobbyPlayerId){
    const id=selectedLobbyPlayerId,status=lobbyCardState(s,id);
    if(status!==selectedLobbyCardState)showLobbyPlayerCard(id);
   }
   maybeRecoverStoredRoom();
   }else if(durableClient&&coopRoomId&&s.room?.id===coopRoomId&&world.snapshot().phase==='guard'){
    world.showGuardSocialPlayers(s.wardPlayers,coopRoomId,s.room.members.map(m=>m.userId),window.performance.now());
   }},
  onRoom:room=>{if(destroyed)return;
   renderNotifications(social.state());
   if(room.id===coopRoomId)world.reconcileDoctors(room.members);
   if(room.id===restoreRoomId)maybeRecoverStoredRoom();
   maybeBeginCooperativeRoom();
   if(pendingCoopLeave&&outcomeDelivered())enterLobby(true);},
  onPacket:receiveCooperativePacket,onRoomSpeech:showWardSpeech,onClose:()=>{if(durableClient)return;if(coopRoomId&&!guardSession?.read().patient.caseEnded)enterLobby(false);}});
 function renderSocialLists(){lobbyDirectory.render(social.state());}
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
 function showPeople(){socialEnabled=true;open('<h2>Personas</h2><p>Colegas conectados: <strong id="onlineDoctorsCount">0</strong> · tocá para agregar o invitar</p><div id="friendRequests"></div><div id="coopInvitations"></div><div id="lobbyContacts"></div><p>Invitación múltiple (hasta 3 colegas)</p><div id="coopDoctors"></div><div class="actions"><button data-action="close">Cerrar</button></div>','people');renderSocialLists();}
 function friendStatus(s,id){
  return s.friends?.some(x=>x.id===id)?'friend':
   s.requests?.incoming?.some(x=>x.id===id)?'incoming':
   s.requests?.outgoing?.some(x=>x.id===id)?'outgoing':'stranger';
 }
 function lobbyCardState(s,id){
  const doctor=s.roster.find(x=>x.userId===id);
  return JSON.stringify([friendStatus(s,id),doctor?doctor.status||'disponible':'desconectado']);
 }
 async function showLobbyPlayerCard(userId){
  const state=social.state(),person=state.roster.find(x=>x.userId===userId);
  const cardState=lobbyCardState(state,userId);
  selectedLobbyPlayerId=userId;selectedLobbyCardState=cardState;
  open('<p role="status">Cargando perfil…</p>','lobby-person');
  try{const p=await social.readPlayerProfile(userId);
   if(!dialog.open||dialog.dataset.panel!=='lobby-person'||selectedLobbyPlayerId!==userId||selectedLobbyCardState!==cardState)return;
   open(playerProfileCardHTML(p,{friendship:friendStatus(social.state(),userId),canInvite:world.snapshot().phase==='lobby',
    cases:content.cases.filter(c=>playableIds.has(c.id))}),'lobby-person');
   renderer.drawAvatar(ui('socialProfileAvatar'),{color:p.scrubColor,sex:p.sex});
  }catch(error){if(dialog.open&&dialog.dataset.panel==='lobby-person'&&selectedLobbyPlayerId===userId&&selectedLobbyCardState===cardState){
   if(person)open('<h2>'+esc(person.name)+'</h2><p>Perfil no disponible en este momento.</p><div class="actions"><button data-action="close">Cerrar</button></div>','lobby-person');
   else {close();toast(error.message);}
  }}
 }
 async function inviteColleagues(ids,caseId,mode='coop',guardSelection={scope:'specific',selection:caseId}){
  if(invitingColleagues||coopRoomId)return;
  if(!playableIds.has(caseId)){toast('Este caso todavía no tiene atención completa.');return;}
  if(!ids.length){toast('Elegí al menos un médico conectado.');return;}
  invitingColleagues=true;
  cancelSharedIntent();coopCaseId=caseId;coopGuardSelection=guardSelection;
  const intent=cooperativeFlow.begin('host');
  try{await social.invite(ids,mode,guardSelection);
   if(cooperativeFlow.current(intent)&&!coopRoomId)open('<h2>Invitación enviada</h2><p>Esperando que los colegas acepten la guardia '+(mode==='competitive'?'competitiva':'compartida')+'.</p>');
  }catch(error){if(cooperativeFlow.current(intent))toast(error.message);}
  finally{invitingColleagues=false;}
 }
 function clinicalChanged(){
  clinicalHintPresenter.maintain();
  renderGuardCommunication();
  const patient=guardSession?.read()?.patient;
  if(durableClient)announceDeath(patient);
  if(outcomeId(patient))publishCooperativeState(window.performance.now(),true);
 }
 function maybeBeginCooperativeRoom(now=window.performance.now()){
  if(now<nextCooperativeAdmission||coopRoomId||durableStarting||durableJoining)return;
  // An account-owned saved guard requires the explicit, room-bound recovery
  // choice. Social reattachment must not race that transfer of control.
  if(world.snapshot().phase==='lobby'&&account.read()?.activeGuardId)return;
  const state=social.state(),room=state.room,role=social.isHost()?'host':'guest';
  if(room&&role==='host'&&!coopCaseId&&room.guardSelection){
   const p=room.guardSelection,eligible=eligibleGuardCases(content.cases,[...playableIds],p.scope,p.selection);
   if(eligible.length){coopCaseId=eligible[0].id;coopGuardSelection=p;cooperativeFlow.begin('host');}
  }
  if(!room||role==='host'&&!coopCaseId||
   !cooperativeFlow.mayEnter(role,{phase:world.snapshot().phase,hasSession:!!guardSession,recovering:state.recovering}))return;
  nextCooperativeAdmission=now+1000;
  beginCooperativeRoom(room);
 }
 function confirmOutcomeDelivery(host,p){
  if(guardSession!==replica)return;const id=outcomeId(p);if(id)social.send(host,{kind:'outcome.received',eventId:id,patientUid:p.uid});
 }
 function outcomeDelivered(){if(durableClient)return true;const s=social.state();return cooperativeFlow.delivered(guardSession?.read().patient,s.user?.id,s.room?.members||[]);}
 async function requestLobby(){
  cancelReceptionAssignment();
  if(durableClient){
   if(savingShift)return;
   savingShift=true;
   const client=durableClient,turn=client.read()?.shift?.turn;
   let confirmed=false;
   try{
    if(turn?.canLeave){
     const signal=AbortSignal.timeout(CLINICAL_REQUEST_TIMEOUT_MS);
     await awaitAbortable(client.recoverTurn('leave',{signal}),signal);
    }
    confirmed=true;
   }catch{/* The last durable guard and its queued receipts remain recoverable. */}
   finally{savingShift=false;}
   if(client!==durableClient||destroyed)return;
   enterLobby(true);
   toast(confirmed?'Tu guardia está guardada. Podés retomarla desde Hacer guardia.':
    'Volviste al lobby. Podés recuperar la guardia y comprobar las órdenes pendientes desde Hacer guardia.');
   return;
  }
  if(coopRoomId&&social.isHost()&&outcomeId(guardSession?.read().patient)&&!outcomeDelivered()){
   pendingCoopLeave=true;publishCooperativeState(window.performance.now(),true);toast('Esperando que tus colegas reciban el resultado. Si están desconectados, deben reconectarse.');return;
  }enterLobby(true);
 }
 function cancelSharedIntent(){cooperativeFlow.cancel();coopCaseId=null;coopGuardSelection=null;pendingCoopLeave=false;social.leave();}
 function presentGuardTurn(clinical){
  const turn=clinical.shift?.turn,requiresDecision=clinical.shift?.ended||turn?.canResume;
  if(savingShift)return;
  if(requiresDecision){
   const html=guardTurnDialogHTML(turn,{mode:clinical.shift?.mode});
   if(!shiftEndedAnnounced||dialog.dataset.panel==='shift-finished'){
    if(!dialog.open||ui('modalContent').innerHTML!==html)open(html,'shift-finished');
    shiftEndedAnnounced=true;
   }
  }else if(shiftEndedAnnounced){
   shiftEndedAnnounced=false;
   if(dialog.dataset.panel==='shift-finished')close();
  }
 }
 async function controlGuardTurn(op){
  if(!durableClient){
   if(op==='continue'&&localAdmissions?.extend()){
    shiftEndedAnnounced=false;lastClinicalFrame=window.performance.now();close();updateHud();
   }
   return;
  }
  const client=durableClient,turn=client.read()?.shift?.turn;
  if(!turn)return;
  try{
   const receipt=await client.shift({op,turnId:turn.id,requestId:window.crypto.randomUUID()});
   if(client!==durableClient)return;
   if(receipt.status!=='accepted')toast('El estado del turno cambió. Revisá la guardia e intentá nuevamente.');
   presentGuardTurn(client.read());updateHud();
  }catch{toast('Reconectando la guardia. Tu decisión sigue pendiente y tu progreso está guardado.');}
 }
 function makeDurableClient(room,actorId=account.read()?.actorId??null){
  const credentials=social.credentials();
  let client;
  const connectionNotice=createClinicalConnectionNotice();
  client=createDurableCooperativeReplica({window,roomId:room.id,clientKey:credentials.clientKey,actorId,
   authorization:()=>social.credentials().authorization,storage:window.sessionStorage,
   onCommitted:epoch=>{
    if(durableClient===client&&coopRoomId===room.id&&!destroyed)
     social.publishClinicalCommit(epoch).catch(()=>{});
   },
   onError:error=>{
    if(destroyed||coopRoomId!==room.id)return;
    const message=connectionNotice.failed(error,window.performance.now());
    if(message)toast(message);
   },
   onSnapshot:value=>{
    connectionNotice.succeeded();
    if(durableClient!==client||coopRoomId!==room.id||destroyed)return;
    if(value.account)account.accept(value.account);
    world.reconcilePatients(value.clinical.shift?.patients||[]);
    world.applySharedSpatial(value.spatial,window.performance.now(),client.lastAcknowledgedMotion(social.state().user?.id));
    const patientUid=value.clinical.patient.uid;
    if(lastSelectedPatientUid!==patientUid){
     lastSelectedPatientUid=patientUid;clinicalUI.reset();patientWheel.hide();clinicalChecklist.hide();
    }
    const self=social.state().user?.id;
    const receptionResult=receptionAssignment.observe(value.clinical,self);
    if(receptionResult?.status==='unavailable')
     toast('El paciente ya no está disponible en recepción.');
    else if(receptionResult?.status==='occupied')
     toast('Otro médico tomó este paciente. Elegí otro en recepción.');
    else if(receptionResult?.status==='assigned'){
     focusedPatientUid=receptionResult.uid;focusedNpc=null;
     updateHud();
     toast('Paciente asignado en '+receptionResult.bedId+'. Ya podés atenderlo.');
     const p=world.snapshot().patients.find(p=>p.uid===receptionResult.uid);
     if(p){patientWheel.show(p);guidePatientWheel();clinicalChecklist.show(p.uid,guardSession?.read());}
     if(receptionResult.firstContact){
      // Server-confirmed focus is required. On returning to a shared patient,
      // authenticated transcript history prevents repeating this greeting.
      const alreadySpoken=value.clinical.messages?.some(row=>
       row.role==='player'&&row.actorId===self);
      if(!alreadySpoken)void submitText('Hola ¿Qué te pasó?',{patientUid:receptionResult.uid});
     }
    }
    for(const [,receipt] of value.claims||[])if(receipt?.actorId===self){
     try{progress.award(receipt);}catch{/* persisted receipt wins */}
    }
    if(progress.read().receipts.length+progress.read().penalties.length!==savedRewardCount){
     try{window.localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress.read()));
      savedRewardCount=progress.read().receipts.length+progress.read().penalties.length;}catch{}
    }
    const count=value.clinical.shift?.patients.length||1;
    if(count>lastReceivedPatientCount&&lastReceivedPatientCount>0)
     toast('Recepción: ingresó un paciente nuevo. Consultá el tablero.');
    lastReceivedPatientCount=count;
    const reward=value.clinical.caseReward;
    const revision=JSON.stringify([patientUid,value.clinical.room.revision,reward?.eventId,reward?.creditStatus,reward?.xp,
     value.clinical.communication?.revision,value.clinical.shift?.turn,value.clinical.deathReward,
     value.clinical.diagnosisReveal?.requestId,value.clinical.dischargeRewards]);
    if(revision!==lastRemoteRevision){lastRemoteRevision=revision;clinicalChanged();}
    else if(value.acknowledgements?.length)renderGuardCommunication();
    for(const receipt of value.acknowledgements||[])notifyClinicalRejection(receipt);
    const confirmedDirect=directSelection.observe(value.clinical,self);
    if(confirmedDirect?.status==='occupied'||confirmedDirect?.status==='unavailable'){
     pendingPatientAction=null;
     toast(confirmedDirect.status==='occupied'?'Otro médico ya atiende ese paciente.':'El paciente ya no está disponible.');
    }else if(confirmedDirect?.status==='selected'){
     focusedPatientUid=confirmedDirect.uid;focusedNpc=null;
     close();const p=world.snapshot().patients.find(p=>p.uid===confirmedDirect.uid);
     if(p){if(confirmedDirect.kind==='monitor')clinicalUI.showMonitor(p);
      else if(pendingPatientAction?.uid===p.uid){
       const action=pendingPatientAction;pendingPatientAction=null;
       if(action.destination)clinicalUI.chooseDestination(p,action.destination);
       else clinicalUI.showDiagnosis(p);
      }else {patientWheel.show(p);guidePatientWheel();clinicalChecklist.show(p.uid,guardSession?.read());}}
    }
    if(dialog.open&&dialog.dataset.panel==='reception')
     ui('modalContent').innerHTML=receptionBoardHTML(value.clinical.shift,content.cases,self);
    presentGuardTurn(value.clinical);
    const terminal=outcomeId(value.clinical.patient);
    if(terminal)client.confirm(value.clinical.room.revision,terminal);
   }});
  return client;
 }
 function attachDurableRoom(room,client,initialResponse){
  const current=client.read(),spatial=client.snapshotSpatial();
  if(!current?.patient?.uid||!playableIds.has(current.patient.caseId))
   throw Error('Invalid persistent clinical session');
  coopRoomId=room.id;cooperativeFlow.bind(room.id);announcedClosure=null;announcedDeathUid=null;
  lastReceivedPatientCount=current.shift?.patients.length||1;lastSelectedPatientUid=current.patient.uid;shiftEndedAnnounced=false;
  world=createWorld(content,{...profile,id:social.state().user?.id||profile.id});
  world.enterGuard({mode:current.shift?.mode||current.competition?.mode||'coop',
   caseId:current.shift?.patients[0]?.caseId||current.patient.caseId,
   patientUid:current.shift?.patients[0]?.uid||current.patient.uid,
   bedId:current.shift?.patients[0]?.bedId||'B1',
   additionalPatients:(current.shift?.patients||[]).slice(1),
   members:room.members.map(x=>({id:x.userId,name:x.name,color:'navy'})),authoritative:false});
  // Recovery uses a newly created world; its first input must be newer than
  // the sequence persisted for this same doctor in the previous session.
  world.seedMovementSequence(client.lastAcknowledgedMotion(social.state().user?.id));
  durableClient=client;replica=client;guardSession=client;lastRemoteRevision=-1;
  if(initialResponse?.account)account.accept(initialResponse.account);
  if(spatial)world.applySharedSpatial(spatial,window.performance.now(),client.lastAcknowledgedMotion(social.state().user?.id));
  lastClinicalFrame=window.performance.now();clinicalUI.reset();close({preserveRecovery:true});
  seenGuardMessages.clear();seenNpcMessages.clear();seenNurseCues.clear();nurseCueRows.length=0;lastNurseCueAt=-Infinity;lastPatientSpeechAt=-Infinity;
  for(const row of current.messages||[])(row.role==='player'?seenGuardMessages:seenNpcMessages).add(row.id);
  guardSpeech.seed(current,room.id,social.state().user?.id);
  resetChat(current.competition?.mode==='competitive'?'Guardia competitiva: el primer médico en atender al paciente obtiene su responsabilidad clínica.':'Guardia cooperativa: atendé a cualquier paciente y coordiná con tus colegas en Equipo.');
  ui('splash').hidden=true;ui('hud').hidden=false;ui('chatDock').hidden=false;
  clinicalChanged();updateHud();presentGuardTurn(current);
  for(const receipt of initialResponse?.acknowledgements||[])notifyClinicalRejection(receipt);
 }
 async function maybeRecoverStoredRoom(){
  if(!restoreRoomId||durableJoining||durableStarting||coopRoomId||guardSession||
   world.snapshot().phase!=='lobby'||!social.state().user?.id||account.read()?.activeGuardId)return;
  const id=restoreRoomId;durableJoining=true;let client;
  try{
   client=makeDurableClient({id});const initialResponse=await client.sync();
   if(destroyed||coopRoomId||guardSession||world.snapshot().phase!=='lobby'||restoreRoomId!==id){
    client.dispose();return;
   }
   const clinical=client.read(),spatial=client.snapshotSpatial();
   const members=clinical.room.members.map(userId=>({userId,name:spatial.doctors.find(d=>d.id===userId)?.name||'Médico'}));
   const room=social.state().room?.id===id?social.state().room:
    {id,hostUserId:spatial.doctors[0]?.id,members,allAccepted:true};
   restoreRoomId=null;attachDurableRoom(room,client,initialResponse);
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
    const response=await window.fetch('/api/clinical',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(CLINICAL_REQUEST_TIMEOUT_MS),
     headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'capability',clientKey:credentials.clientKey})});
    if(!response.ok)throw Error('No se pudo verificar la autoridad persistente');
    const capability=await response.json();
    if(typeof capability.clinicalEnabled!=='boolean')throw Error('Autoridad clínica sin confirmar');
    cooperativeCapability={roomId:room.id,clinicalEnabled:capability.clinicalEnabled};
   }
   if(destroyed||coopRoomId||social.state().room?.id!==room.id||host&&!coopCaseId)return;
   if(!cooperativeCapability.clinicalEnabled){
    if(room.mode==='competitive')throw Error('La modalidad competitiva necesita autoridad clínica persistente');
    if(host&&room.allAccepted)startCooperativeHost(room);return;}
   // Durable admission depends on the authenticated HTTP room, not an RTC
   // hello. A guest retries a not-yet-created room on the next social poll.
   client=makeDurableClient(room);
   const initialResponse=host?await client.start(coopCaseId,null,coopGuardSelection):await client.sync();
   if(destroyed||coopRoomId||social.state().room?.id!==room.id){client.dispose();return;}
   attachDurableRoom(room,client,initialResponse);
   social.broadcast({kind:'durable.hello',roomId:room.id});
  }catch(error){client?.dispose();if(host&&!destroyed&&!coopRoomId&&!(error.status===403&&!room.allAccepted))
   toast('No se inició la guardia: no se confirmó la autoridad del servidor.');}
  finally{durableStarting=false;}
 }
 async function joinDurableRoom(room){
  if(durableJoining||durableStarting||coopRoomId)return;
  durableJoining=true;let client;
  try{
   client=makeDurableClient(room);const initialResponse=await client.sync();
   if(destroyed||coopRoomId||social.state().room?.id!==room.id){client.dispose();return;}
   attachDurableRoom(room,client,initialResponse);
  }catch{client?.dispose();if(!destroyed)toast('Esperando recuperar la guardia persistente.');}
  finally{durableJoining=false;}
 }
 function startCooperativeHost(room){
  coopRoomId=room.id;cooperativeFlow.bind(room.id);announcedClosure=null;announcedDeathUid=null;
  lastReceivedPatientCount=1;lastSelectedPatientUid=room.id+':patient';shiftEndedAnnounced=false;
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
  if(!coopRoomId&&packet.kind==='durable.hello'&&!account.read()?.activeGuardId&&sender===social.state().room?.hostUserId&&
   packet.roomId===social.state().room?.id&&cooperativeFlow.mayEnter('guest',
   {phase:world.snapshot().phase,hasSession:!!guardSession,recovering:social.state().recovering})){
   joinDurableRoom(social.state().room);return;
  }
  if(packet.kind==='physician.preview'&&durableClient&&coopRoomId===packet.roomId){
   showWardSpeech({roomId:packet.roomId,userId:sender,id:packet.id,text:packet.text});
   return;
  }
  if(packet.kind==='clinical.committed'&&durableClient&&coopRoomId===packet.roomId&&social.isMember(sender)){
   durableClient.invalidate(packet.epoch).catch(()=>{});return;
  }
  if(durableClient)return;
  if(coopRoomId&&social.isHost()&&packet.kind==='hint.request'&&social.isMember(sender)&&guardSession){
   const ack=await guardSession.hint(packet.request,sender);
   social.send(sender,{kind:'hint.ack',roomId:coopRoomId,requestId:packet.request?.requestId,ack});
   if(ack.status==='revealed')publishCooperativeState(window.performance.now(),true);
   return;
  }
  if(!coopRoomId&&packet.kind==='state'&&!account.read()?.activeGuardId&&sender===social.state().room?.hostUserId&&cooperativeFlow.mayEnter('guest',{phase:world.snapshot().phase,hasSession:!!guardSession,recovering:social.state().recovering})){
   const room=social.state().room;if(packet.roomId!==room.id||!playableIds.has(packet.clinical?.patient?.caseId))return;
   coopRoomId=room.id;cooperativeFlow.bind(room.id);announcedClosure=null;announcedDeathUid=null;
   lastReceivedPatientCount=1;lastSelectedPatientUid=packet.clinical.patient.uid;shiftEndedAnnounced=false;
   world=createWorld(content,{...profile,id:social.state().user.id});world.enterGuard({mode:'coop',caseId:packet.clinical.patient.caseId,
    patientUid:packet.clinical.patient.uid,members:room.members.map(x=>({id:x.userId,name:x.name})),authoritative:false});
   replica=createCooperativeReplica({roomId:room.id,hostId:sender,send:social.send,storage:window.sessionStorage,onSnapshot:value=>{
    world.applySharedSpatial(value.spatial,window.performance.now());
    const revision=JSON.stringify([value.clinical.room.revision,value.clinical.diagnosisReveal?.requestId]);
    if(revision!==lastRemoteRevision){lastRemoteRevision=revision;clinicalChanged();}
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
  const sequence=++sharedSequence;
  for(const member of social.state().room?.members||[])if(member.userId!==id)
   social.send(member.userId,{kind:'state',roomId:coopRoomId,sequence,clinical:guardSession.read(member.userId),catalog:guardSession.catalog(),
    spatial:{nurses:s.nurses,doctors:[{...s.player,id,kind:'doctor'},...s.others]}});
 }
 function line(name,text,system=false){transcript.append(name,text,system);}
 function showWardSpeech({roomId,userId,id,text}){
  if(!durableClient||roomId!==coopRoomId||typeof id!=='string'||
     typeof text!=='string'||text.length>280||!social.isMember(userId))return;
  const key='player:'+userId+':'+id;
  if(seenGuardMessages.has(key)||
    !canHearWardDoctor(world.snapshot(),userId,social.state().user?.id,world.navigation))return;
  seenGuardMessages.add(key);
  // Room speech can animate a nearby speaker. Only the authenticated
  // clinical stream and this doctor's pending queue enter the transcript.
  world.showGuardMessage(userId,text,window.performance.now());
 }
 function renderGuardCommunication(){
  if(!guardSession)return;
  const clinicalState=guardSession.read(),scene=world.snapshot(),self=social.state().user?.id,
   nearBed=canHearWardPatient(scene,clinicalState.patient.uid,world.navigation);
  const channel=guardChannels.update({roomId:coopRoomId,actorId:self,communication:clinicalState.communication});
  ui('guardChatTabs').hidden=!channel.available;
  for(const button of ui('guardChatTabs').querySelectorAll('[data-guard-channel]'))
   button.setAttribute('aria-pressed',String(button.dataset.guardChannel===channel.active));
  for(const badge of ui('guardChatTabs').querySelectorAll('[data-channel-unread]')){
   const count=channel.unread[badge.dataset.channelUnread];badge.hidden=!count;badge.textContent=count>99?'99+':String(count);
  }
  const chatContext={clinicalState,scene,self,roomId:coopRoomId,navigation:world.navigation};
  const rows=visibleWardChatRows(chatContext);
  // One contextual nurse, always modest: asks about the next decision based
  // only on confirmed state or the doctor's OWN diagnostic impression.
  const workflow=clinicalWorkflow(clinicalState),cue=workflow?.cue,patientId=clinicalState.patient.uid;
   // Old guidance is not a medical message: invalidate it as soon as the
   // authoritative case state changes (especially after a consult refusal).
   const currentGuidance=activeNurseGuidance(nurseCueRows,cue,patientId);
   nurseCueRows.splice(0,nurseCueRows.length,...currentGuidance);
   const concluded=!!clinicalState.patient.caseEnded||!!clinicalState.patient.patientDied||
    !!clinicalState.patient.closure?.closed;
   if(concluded||coopRoomId&&!nearBed)nurseCueRows.length=0;
   rows.splice(0,rows.length,...visibleClinicalRows(rows,{concluded}));
  const cueTime=window.performance.now();
  const freshPatient=rows.some(row=>row.role==='patient'&&!guardSpeech.has(patientId,row.id));
  const message=(!coopRoomId||nearBed)?selectNurseGuidance({cue,patientId,concluded,freshPatient,
   now:cueTime,lastCueAt:lastNurseCueAt,lastPatientAt:lastPatientSpeechAt,
   seen:seenNurseCues}):null;
  if(message){
   seenNurseCues.add(patientId+':'+cue.id);lastNurseCueAt=cueTime;
   nurseCueRows.push(message);
   if(nurseCueRows.length>5)nurseCueRows.shift();
   world.showNpcMessage('nurse',message.text,window.performance.now());
    hospitalAudio.speech('nurse');
  }
  for(const row of rows){
   if(!['patient','nurse','mentor'].includes(row.role)||!guardSpeech.mark(patientId,row.id))continue;
   seenNpcMessages.add(row.id);
   if(row.role==='patient')lastPatientSpeechAt=window.performance.now();
   world.showNpcMessage(row.role,row.text,window.performance.now(),patientId);
   hospitalAudio.speech(row.role);
   if(row.role==='nurse'&&row.text.includes('solicitado; pendiente de resultado'))hospitalAudio.cue('studyOrder');
   if(row.role==='nurse'&&row.text.includes('resultado disponible'))hospitalAudio.cue('studyReady');
  }
  const actors=[...world.snapshot().others,world.snapshot().player];
  for(const row of rows){
   if(row.role!=='player'||!guardSpeech.mark(patientId,row.id))continue;
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
  // The final sentence is derived from one authenticated clinical receipt.
  const farewell=finalNurseMessage(clinicalState);
  if(farewell&&(!coopRoomId||nearBed)&&guardSpeech.mark(patientId,farewell.id)){
   seenNpcMessages.add(farewell.id);
   world.showNpcMessage('nurse',farewell.text,window.performance.now());
   hospitalAudio.speech('nurse');
  }
  const confirmed=visibleClinicalRows(wardChatHistory.read(chatContext,rows),{concluded});
  const pendingOrders=(durableClient?.pendingCommands()||[])
   .filter(order=>channel.active==='team'?order.channel==='team':order.channel!=='team'&&order.targetPatientUid===patientId);
  const pending=pendingOrders.map(order=>({id:'pending:'+order.id,name:'ATRIA',role:'system',text:'Pendiente de confirmación · '+order.text}));
  const showFarewell=farewell&&(!coopRoomId||nearBed||clinicalState.patient.closure?.actorId===self);
  const display=channel.active==='team'?clinicalState.communication.team:
   channel.active==='activity'?guardActivityRows(clinicalState.communication.activity):
   [...confirmed,...nurseCueRows,...(showFarewell?[farewell]:[])];
  transcript.replace([...display,...(channel.active==='activity'?[]:pending)]);
  clinicalUI.render();
  const closure=clinicalState.caseReward||clinicalState.patient.closure;
  const doctor=clinicalState.hintBinding?.actorId;
  const penalties=(clinicalState.progress?.penalties||[]).filter(p=>p.kind==='clinical.unsafe-discharge'&&
   p.actorId===doctor&&p.patientUid===patientId);
  if(!durableClient&&coopRoomId)for(const penalty of penalties)
   progress.penalizeUnsafeDischarge(penalty);
  if(!durableClient&&closure?.closed){
   if(localAdmissions)settleLocalPatient(closure);
   if(coopRoomId){
    if(clinicalState?.competition?.mode==='competitive'){
     const ownerId=clinicalState.competition.ownerId;
     if(ownerId===social.state().user?.id)progress.award({...closure,actorId:ownerId});
    }else progress.award(closure);
   }
   if(clinicalState?.competition?.mode!=='competitive')localShift.record(closure);
  }
  const practice=progress.read(),rewardCount=practice.receipts.length+practice.penalties.length;
  if(rewardCount!==savedRewardCount){
   try{window.localStorage.setItem(PROGRESS_KEY,JSON.stringify(practice));savedRewardCount=rewardCount;}
   catch{toast('Progreso confirmado en esta sesión; no se pudo guardar en este dispositivo.');}
  }
  updateHud();
  const debits=durableClient?(clinicalState.dischargeRewards||[]).filter(r=>r.creditStatus==='credited'):
   practice.penalties.filter(r=>penalties.some(p=>p.eventId===r.eventId));
  for(const debit of debits)if(animateExperience(debit.eventId,-debit.loss))
   toast('Alta insegura registrada · −'+debit.loss+' XP');
  if(closure?.closed&&(!durableClient||closure.creditStatus==='credited'))animateExperience(closure.eventId,closure.xp);
  if(closure?.closed&&announcedClosure===closure.eventId&&dialog.dataset.panel==='outcome'){
   const outcome=dialog.querySelector('#caseResult'),html=caseDebriefHTML(closure);
   if(outcome&&outcome.innerHTML!==html)outcome.innerHTML=html;
  }
  if(closure?.closed&&announcedClosure!==closure.eventId){announcedClosure=closure.eventId;
    hospitalAudio.cue(closure.quality?.score>=90?'level':'ok');
   const canNext=!!localAdmissions&&localAdmissions.records().some(r=>{
    const p=localSessions.get(r.uid)?.read().patient;
    return r.uid!==closure.patientUid&&!r.closed&&!p?.caseEnded&&!p?.patientDied;
   });
   open('<div id="caseResult">'+caseDebriefHTML(closure)+'</div><div class="actions">'+
    (canNext?'<button class="primary" data-action="next-local-patient">Recibir otro paciente</button>':'')+
    '<button data-action="reception">Recepción</button>'+
    '<button data-action="return-lobby">Volver al lobby</button>'+
    '<button data-action="close">Seguir viendo el caso</button></div>','outcome');}
 }
 function resetChat(message){transcript.clear();input.value='';focusedNpc=null;focusedPatientUid=null;updateTypingAssistance();line('ATRIA',message,true);}
 function announceDeath(p){
  if(!p?.patientDied)return;
  const reward=guardSession?.read()?.deathReward;
  const key=JSON.stringify([p.uid,reward?.creditStatus,reward?.loss]);
  if(announcedDeathUid===key)return;
  const first=!announcedDeathUid||JSON.parse(announcedDeathUid)[0]!==p.uid;announcedDeathUid=key;
  // An accounting receipt may arrive after the first clinical death event.
  // Refresh the open result without reopening a dialog the doctor dismissed.
  if(!first&&dialog.dataset.panel!=='death-result')return;
  world.stop();patientWheel.hide();clinicalChecklist.hide();if(first)hospitalAudio.cue('death');
  const penalty=guardSession?.read()?.progress?.penalties?.find(x=>x.patientUid===p.uid&&x.kind==='clinical.death');
  const loss=durableClient?reward?.loss:penalty?.loss||0;
  open('<h2>Paciente fallecido</h2><p>El paciente falleció tras un deterioro sostenido. Los demás pacientes de la guardia siguen necesitando atención.</p>'+
   '<div class="case-scorecard"><h3>Resultado · paciente fallecido</h3><p>Experiencia ganada: 0 XP</p>'+
   '<p class="score-loss">'+(loss==null?'Confirmando el ajuste de experiencia…':'Experiencia descontada: −'+loss+' XP')+'</p>'+
   '<p>El descuento por daño atribuible se aplica al médico responsable y no supera su saldo anterior.</p></div>'+
   '<div class="actions"><button class="primary" data-action="reception">Recepción</button><button data-action="return-lobby">Volver al lobby</button></div>','death-result');
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
  const delta=Math.max(0,(now-previous)/1000);
  if(localAdmissions){
   const activeDelta=Math.min(delta,localAdmissions.remaining());
   for(const session of localSessions.values())session.advance(activeDelta,{typing:clinicalTyping});
   for(const r of localAdmissions.advance(activeDelta)){
    createLocalPatientSession(r);
    toast('Recepción: nuevo ingreso en '+r.bedId+'. Consultá el tablero.');
   }
   for(const session of localSessions.values()){
    const state=session.read(undefined,{includeChecklist:false}),closure=state.caseReward||state.patient.closure;
    if(closure?.closed)settleLocalPatient(closure);
   }
   if(localAdmissions.ended()&&!shiftEndedAnnounced){
    shiftEndedAnnounced=true;
    open(guardTurnDialogHTML(null),'shift-finished');
   }
  }else guardSession.advance(delta,{typing:clinicalTyping});
  announceDeath(guardSession.read(undefined,{includeChecklist:false})?.patient);
 }
 function animateExperience(eventId,delta){
  if(!eventId||!Number.isSafeInteger(delta)||!delta||animatedExperience.has(eventId))return false;
  animatedExperience.add(eventId);
  if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
   ui('hudXpBar')?.animate?.([{filter:'brightness(1)'},{filter:delta<0?'sepia(1) saturate(3)':'brightness(1.8)'},
    {filter:'brightness(1)'}],{duration:480,easing:'ease-out'});
  return true;
 }
 function updateHud(){
  const s=world.snapshot(),guard=s.phase==='guard',clinical=guardSession?.read();
  const scoreHost=ui('guardScoreboard');
  if(scoreHost){
   scoreHost.hidden=!guard;
   if(guard){
    const score=guardScoreboardHTML(guardScoreModelV5({
     mode:s.mode,patient:clinical?.caseReward?{...clinical.patient,closure:clinical.caseReward}:clinical?.patient,
     players:s.mode==='competitive'?(social.state().room?.members||[]).map(p=>({id:p.userId,name:p.name})):[],
     ownerId:clinical?.competition?.ownerId||null,
     outcomes:clinical?.shift?.outcomes||localShift.outcomes()}));
    if(score!==scoreMarkup){scoreHost.innerHTML=score;scoreMarkup=score;}
   }else{scoreMarkup='';scoreHost.replaceChildren();}
  }
  audioPatient=guard?clinical?.patient??null:null;
  autocompleteCaseId=guard?clinical?.patient?.caseId??null:null;
  const elapsed=clinical?.shift?.elapsedSeconds??localAdmissions?.elapsed()??
   localShift.totalMinutes(clinical?.clock?.gameMinute||0);
  const localTurnElapsed=localAdmissions?elapsed-(localAdmissions.duration()-1440):elapsed;
  const clock=formatGuardTime(clinical?.shift?.turn?.elapsedSeconds??localTurnElapsed),minute=Math.floor(elapsed),total=8*60+15+minute;
  const clockSlot=ui('hudClockSlot');
  const timeBadge=ui('guardTime');
  if(clockSlot&&timeBadge&&timeBadge.parentElement!==clockSlot)clockSlot.append(timeBadge);
  if(timeBadge){
   timeBadge.hidden=!guard;
   if(guard){
    ui('guardTimeNow').textContent=clock.displayTime;
    ui('guardTimeProgress').textContent=clock.progress;
    timeBadge.setAttribute('aria-label',clock.accessible);
    timeBadge.dataset.ended=String(clock.ended);
   }
  }
  ui('status').textContent=guard&&clinical?.patient.patientDied?'Caso finalizado · Paciente fallecido':guard?(s.mode==='competitive'?'Competitivo':s.mode==='coop'?'Cooperativo':s.mode==='apprentice'?'Aprendiz':'Solitario')+' · '+String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0')+' · 5.0':social.state().user?'Lobby social · 5.0 experimental':'Lobby local · 5.0 experimental';
  if(guard)patientClinical.update(s.patients.find(p=>p.uid===clinical?.patient.uid),clinical);else patientClinical.hide();
  if(guard)clinicalChecklist.update(clinical);else clinicalChecklist.hide();
  const receptionPatients=(clinical?.shift||localReceptionSnapshot())?.patients||[];
  unassignedGlow.update(s.phase,s.mode,s.patients,receptionPatients,focusedPatientUid);
  if(guard&&patientWheel.isOpen())guidePatientWheel();
  ui('guardButton').textContent=guard?'Volver al lobby':'Hacer guardia';
  ui('receptionButton').hidden=!guard;
  receptionOnboarding.update({
   phase:s.phase,mode:s.mode,patients:receptionPatients,
   selfId:social.state().user?.id,ended:clinical?.shift?.ended||localAdmissions?.ended(),
   focusedPatientUid,selecting:!!receptionAssignment.status()||!!directSelection.status()
  });
  ui('peopleButton').textContent=guard?'Historia':'Personas';
  const stats=career();ui('playerProgress').textContent='Nivel '+stats.level+' · '+(stats.xp%200)+'/200 XP';
  const xpBar=ui('hudXpBar');if(xpBar)xpBar.value=stats.xp%200;
  world.setLevel(account.read()?stats.level:1);
  const channel=guard?guardChannels.state().active:'clinical';
  ui('recipientButton').textContent=channel==='team'?'Equipo · privado':channel==='activity'?'Actividad clínica':
   guard?({nurse:'Enfermera',vega:'Dr. Vega',companion:'Acompañante'}[focusedNpc]||'Paciente cercano'):'Lobby · público';
  if(nurseQuick)nurseQuick.hidden=!guard||channel!=='clinical';
  ui('guardChatTabs').hidden=!guard||!guardChannels.state().available;
  input.disabled=channel==='activity';ui('chatForm').querySelector('[type="submit"]').disabled=channel==='activity';
  input.placeholder=channel==='team'?'Escribir a tus colegas…':channel==='activity'?'Registro compartido · solo lectura':guard?'Hablar en la guardia…':'Hablar en el lobby…';
  document.body.dataset.phase=s.phase;document.body.dataset.generation=String(s.generation);
  renderMusic();
 }
 function enterLobby(leaveShared=false){
  clinicalHintPresenter.cancel();
  const persistent=!!durableClient;
  if(durableClient&&account.read()){
   const retired=durableClient;retired.dispose();
   accountTransition=retired.flush().catch(()=>{}).then(()=>account.restore()).catch(error=>toast(error.message));
  }
  advanceClinicalTo(window.performance.now());
  if(leaveShared)restoreRoomId=null;
  if(leaveShared){
   if(persistent){cooperativeFlow.cancel();coopCaseId=null;coopGuardSelection=null;pendingCoopLeave=false;void social.leave({preserveRoom:true});}
   else cancelSharedIntent();
  }
  seenGuardMessages.clear();seenNpcMessages.clear();seenNurseCues.clear();nurseCueRows.length=0;
  if(!durableClient){
   if(localSessions.size)for(const session of localSessions.values())session.dispose();
   else guardSession?.dispose();
  }else guardSession?.dispose();
  localSessions.clear();localAdmissions=null;localRoomId=null;
  directSelection.cancel();lastReceivedPatientCount=0;lastSelectedPatientUid=null;shiftEndedAnnounced=false;
  guardSession=null;localShift.reset();audioPatient=null;replica=null;durableClient=null;coopRoomId=null;coopCaseId=null;lastMotion='';announcedClosure=null;announcedDeathUid=null;pendingPatientAction=null;clinicalUI.reset();patientWheel.hide();patientClinical.hide();clinicalChecklist.hide();close();// Everyone joining the lobby participates in the existing social presence loop;
  // opening Personas or choosing Cooperativo must not be a prerequisite.
  world.enterLobby();socialEnabled=true;resetChat('El lobby está listo para hablar.');
  ui('splash').hidden=true;ui('hud').hidden=false;ui('chatDock').hidden=false;updateHud();maybeRecoverStoredRoom();
 }

 function createLocalPatientSession(r){
  if(!world.snapshot().patients.some(p=>p.uid===r.uid))world.addPatient({uid:r.uid,caseId:r.caseId,bedId:r.bedId});
  const patient=world.snapshot().patients.find(p=>p.uid===r.uid);
  if(!patient)return null;
  const session=createGuardSession({roomId:localRoomId,mode:world.snapshot().mode,
   actorId:'local-player',actorName:profile.name,progress,patient,content,
   nursing:{enqueue:task=>world.enqueueNurseJourney(task),
    takeArrivals:()=>world.takeNurseArrivals(r.uid),accept:v=>world.acceptNurseClinicalResult(v)},
   resolveContext:({targetPatientUid})=>({
    patientUid:world.patientInRange(targetPatientUid||r.uid),focusedNpc}),
   onChange:(event,room)=>{
    if(guardSession!==session)return;
    renderGuardCommunication();
   }});
  localSessions.set(r.uid,session);return session;
 }
 function settleLocalPatient(closure){
  if(!localAdmissions||!closure?.closed)return false;
  const updated=localAdmissions.close(closure.patientUid,'local-player',closure.destination);
  if(updated){
   world.departPatient(closure.patientUid);
   localShift.record(closure);
  }
  return updated;
 }
 function localReceptionSnapshot(){
  if(!localAdmissions)return null;
  return {mode:world.snapshot().mode,elapsedSeconds:localAdmissions.elapsed(),
   remainingSeconds:localAdmissions.remaining(),ended:localAdmissions.ended(),
   outcomes:localShift.outcomes(),
   patients:localAdmissions.records().map(r=>{
    const patient=localSessions.get(r.uid)?.read().patient,c=content.cases.find(c=>c.id===r.caseId);
    return {...r,triage:receptionAcuity({caseData:c,patient,
     waitingSeconds:r.closed?0:Math.max(0,localAdmissions.elapsed()-r.arrivalAt)}),
     closed:!!patient?.caseEnded,patientDied:!!patient?.patientDied};
   })};
 }
 function beginLocalPatient(caseId,{continuation=false,allowedCaseIds=null}={}){
  clinicalHintPresenter.cancel();
  if(continuation)return receiveNextLocalPatient();
  if(!playableIds.has(caseId)){
   toast('Este caso todavía no tiene ejecutor clínico completo.');return false;
  }
  if(!localShift.begin({caseId}))return false;
  for(const session of localSessions.values())session.dispose();localSessions.clear();
  localRoomId='guard-'+window.crypto.randomUUID();
  const caseSequence=allowedCaseIds?guardCaseSequence(allowedCaseIds):null;
  if(caseSequence)caseId=caseSequence[0];
  localAdmissions=createShiftFlow({content,mode:draftMode,roomId:localRoomId,firstCaseId:caseId,allowedCaseIds,caseSequence});
  const first=localAdmissions.advance(0)[0];if(!first)return false;
  announcedClosure=null;announcedDeathUid=null;
  seenGuardMessages.clear();seenNpcMessages.clear();seenNurseCues.clear();nurseCueRows.length=0;
  pendingPatientAction=null;clinicalUI.reset();patientWheel.hide();patientClinical.hide();clinicalChecklist.hide();
  world.enterGuard({mode:draftMode,caseId,patientUid:first.uid,bedId:first.bedId});
  guardSession=createLocalPatientSession(first);
  guardSpeech.seed(guardSession.read(),localRoomId,'local-player');
  lastClinicalFrame=window.performance.now();shiftEndedAnnounced=false;
  close();resetChat('Guardia de 24 horas: recepción avisará los ingresos.');
  updateHud();return true;
 }
 function receiveNextLocalPatient(){
  clinicalHintPresenter.cancel();
  if(!localAdmissions)return false;
  const uid=guardSession?.read()?.patient.uid;
  const next=localAdmissions.records().find(r=>{
   const patient=localSessions.get(r.uid)?.read().patient;
   return r.uid!==uid&&!r.closed&&!patient?.caseEnded&&!patient?.patientDied;
  });
  if(!next){toast('Recepción no tiene otro paciente disponible.');return false;}
  guardSession=localSessions.get(next.uid);clinicalUI.reset();patientWheel.hide();announcedClosure=null;
  close();renderGuardCommunication();updateHud();return true;
 }
 guardRecovery=createGuardRecovery({account,notify:toast,
  hide:()=>{if(dialog.dataset.panel==='account-recover')close({preserveRecovery:true});},
  render:state=>open(guardRecoveryHTML(state),'account-recover'),
  resume:target=>recoverAccountGuard(target,'resume'),
  release:target=>recoverAccountGuard(target,'release')});
 function returnFromGuardRecovery(){
  cooperativeFlow.cancel();restoreRoomId=null;coopCaseId=null;coopGuardSelection=null;pendingCoopLeave=false;
  void social.leave({preserveRoom:true});
  if(world.snapshot().phase!=='lobby')enterLobby();
 }
 async function guardSetup({inspect=true}={}){
  if(inspect&&await guardRecovery.show())return;
  if(world.snapshot().phase==='guard')return;
  if(['coop','competitive'].includes(draftMode))socialEnabled=true;
  open(`<h2>Hacer guardia</h2><p>Elegí la modalidad y el caso de práctica.</p><div class="modes">
   <button class="mode ${draftMode==='apprentice'?'active':''}" data-mode="apprentice"><b>Aprendiz</b><small>Con Dr. Vega. Navegación disponible; tutor clínico en migración.</small></button>
   <button class="mode ${draftMode==='solo'?'active':''}" data-mode="solo"><b>Solitario</b><small>Explorá el hospital con los recursos originales.</small></button>
   <button class="mode ${draftMode==='coop'?'active':''}" data-mode="coop"><b>Cooperativo</b><small>2–4 médicos comparten la misma atención.</small></button>
   <button class="mode ${draftMode==='competitive'?'active':''}" data-mode="competitive"><b>Competitivo</b><small>2–4 médicos · el primero que atiende al paciente lo controla; los demás observan.</small></button></div>
   <fieldset class="field"><legend>¿Qué querés atender?</legend>
   <label><input type="radio" name="guardScope" value="random" checked> ${GUARD_SCOPES.random.label} · ×1,5 XP</label>
   <label><input type="radio" name="guardScope" value="specialty"> ${GUARD_SCOPES.specialty.label} · ×1,2 XP</label>
   <label><input type="radio" name="guardScope" value="specific"> ${GUARD_SCOPES.specific.label} · ×1,0 XP</label></fieldset>
   <label class="field" id="guardSpecialtyField" hidden>Especialidad<select id="guardSpecialty">${[...new Set(content.cases.filter(c=>playableIds.has(c.id)).map(guardCaseSpecialty))].map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}</select></label>
   <label class="field" id="guardCaseField" hidden>Patología<select id="caseChoice">${content.cases.filter(c=>playableIds.has(c.id)).map(c=>`<option value="${esc(c.id)}">${esc(c.selector)}</option>`).join("")}</select></label>
   ${['coop','competitive'].includes(draftMode)?'<p>Invitar colegas conectados</p><div id="coopDoctors"></div>':''}
   <p class="note">${playableIds.size} casos clínicos con evaluación, estudios, tratamientos y decisión de destino (alta, observación, sala, UTI, procedimiento o quirófano). El cierre requiere las condiciones clínicas de cada caso; una derivación no equivale a una operación realizada.</p>
   <div class="actions"><button data-action="close">Cancelar</button><button class="primary" data-action="start-guard">Entrar a la guardia</button></div>`);renderSocialLists();
 }
 function updateTypingAssistance(){
  if(!chatSuggestions)return;
  if(guardSession&&guardChannels.state().active!=='clinical'){
   chatSuggestions.replaceChildren();chatSuggestions.hidden=true;return;
  }
  const patient=autocompleteCaseId;
  const nurseContext=!!guardSession&&!!patient&&(focusedNpc==='nurse'||/^\s*enfermer(?:a|o|ia)\b/i.test(input.value));
  const medical=nurseContext?clinicalCompletions(input.value,{
   caseId:patient,cases:content.cases,therapies:content.therapies,
   studies:guardSession.catalog()
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
 const companionAddress=/^\s*(?:acompa[ñn]ante|familiar)\s*[,.:]\s*/i;
 function selectRecipient(kind,patientUid=null){
  guardChannels.select('clinical');
  if(composition){deferredRecipient={kind,patientUid};return;}
  focusedNpc=kind==='patient'?null:kind;
  // Switching to nurse preserves the bedside patient; the server still
  // verifies range/ownership before accepting the nurse's diagnosis or order.
  focusedPatientUid=kind==='patient'||kind==='companion'?patientUid:kind==='nurse'?focusedPatientUid:null;
  const text=input.value.replace(companionAddress,'').replace(/^(?:(?:dr\.?\s*)?vega|enfermera|enfermero)\s*[,.:]?\s*/i,'');
  const prefix={nurse:'Enfermera, ',vega:'Vega, ',companion:'Acompañante, '}[kind]||'';
  input.value=prefix+text;updateHud();input.focus({preventScroll:true});input.setSelectionRange(prefix.length,prefix.length);updateTypingAssistance();
 }
 function notifyClinicalRejection(receipt){
  if(receipt?.status==='rejected')
   toast(clinicalRejectionMessages[receipt.reason]||'El servidor rechazó el mensaje. No se ejecutó ninguna orden.');
 }
 async function submitText(text,{patientUid,clinical=false}={}){
  if(!text.trim())return;
  if(guardSession&&guardChannels.state().active==='team'&&!clinical&&!patientUid){
   const session=guardSession,id='team-'+messageEpoch+'-'+(++messageNumber);
   try{
    const pending=session.post({id,text,channel:'team'});renderGuardCommunication();
    const receipt=await pending;if(guardSession===session)notifyClinicalRejection(receipt);return receipt;
   }catch{toast('El mensaje de equipo sigue pendiente. Se enviará al reconectar.');return;}
  }
  if(guardSession&&guardChannels.state().active==='activity'&&!clinical&&!patientUid)return;
  if(guardSession&&focusedNpc==='companion'&&!clinical&&!patientUid&&
     !/^\s*(?:\/|enfermer(?:a|o|[ií]a)\b|(?:(?:dr|doctor)\.?\s*)?vega\b)/i.test(text)){
   patientUid=focusedPatientUid;
   if(!companionAddress.test(text))text='Acompañante, '+text;
  }
  if(localAdmissions?.ended()&&!durableClient){toast('La guardia finalizó: no se admiten nuevas órdenes.');return;}
  if(guardSession&&/^\s*enfermer(?:a|o|ia)\b/i.test(text)){
   // Keep explicit bedside focus when talking to the nurse.
   focusedNpc=null;updateHud();
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
  // The current clinical snapshot can belong to ANOTHER doctor's box.
  // Never suppress all messages based on its owner. The authority selects
  // this speaker's physical bedside and enforces that bed's ownership.
  advanceClinicalTo(window.performance.now());
  const id='message-'+(coopRoomId?messageEpoch+'-':'')+(++messageNumber);
  const session=guardSession;
  try{
   const actorId=social.state().user?.id,nearbyUids=durableClient?world.nearbyPatientsFor(actorId):null;
   const targetPatientUid=resolveClinicalMessageTarget({
    clinical:session.read(),explicitUid:patientUid,focusedUid:focusedPatientUid,
    actorId,durable:!!durableClient,nearbyUids
   });
   if(durableClient&&!targetPatientUid){
    toast(nearbyUids.length?'Seleccioná al paciente que querés atender.':'Acercate a una cama para hablar con el paciente.');
    return {status:'rejected',reason:'patient-selection-changed'};
   }
   if(!isExaminationCommand(text)){
    if(durableClient&&coopRoomId&&actorId){
     showWardSpeech({roomId:coopRoomId,userId:actorId,id,text});
     social.postRoomSpeech({id,text}).catch(()=>{});
    }else world.showGuardMessage('local-player',text,window.performance.now());
   }
   const sent=session.post({id,text,...(targetPatientUid?{targetPatientUid}:{})});
   if(durableClient)renderGuardCommunication();
   const receipt=await sent;
   if(guardSession!==session)return receipt;
   if(!durableClient)notifyClinicalRejection(receipt);
   return receipt;
  }
  catch{if(guardSession===session)toast('No pude confirmar el mensaje.');}
 }
 function canvasDown(event){
  clinicalHintPresenter.cancel();
  if(world.snapshot().phase==='title')return;
  cancelReceptionAssignment();
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
  if(world.snapshot().phase==='guard'){
   const other=world.snapshot().others.find(p=>Math.hypot(p.x-x,p.y-y)<=22);
   if(other){void showLobbyPlayerCard(other.id);return;}
  }
  document.activeElement?.blur?.();pendingPatientAction=null;patientWheel.hide();close();
  if(!world.target(x,y))toast('No hay una ruta disponible.');
  drag={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);
 }
 function activateEntity(entity){
  guardChannels.select('clinical');
  if(entity.patientUid&&entity.patientUid!==clinicalHintContext()?.patientUid)clinicalHintPresenter.cancel();
  world.stop();
  if(entity.kind==='reception'){
   open(receptionBoardHTML(guardSession?.read()?.shift||localReceptionSnapshot(),
    content.cases,social.state().user?.id),'reception');return;
  }
  if(entity.patientUid){
   const p=world.snapshot().patients.find(p=>p.uid===entity.patientUid);if(!p)return;
   if(!durableClient&&localAdmissions&&guardSession?.read().patient.uid!==p.uid){
    const next=localSessions.get(p.uid);
    if(next){guardSession=next;clinicalUI.reset();patientWheel.hide();announcedClosure=null;
     renderGuardCommunication();updateHud();}
   }
   if(durableClient){
    const selection=directPatientIntent(guardSession.read(),p.uid,social.state().user?.id);
    if(selection==='unavailable')return toast('El paciente ya no está disponible.');
    if(selection==='occupied')return toast('Ese paciente está a cargo de otro médico.');
    if(selection==='selected'&&guardSession.read().shift?.confirmedFocusPatientUid!==p.uid){
     // Opening an authorized view is immediate; establish the persistent
     // bedside binding independently for the existing hint reveal protocol.
     void durableClient.claim(p.uid);
    }
    if(selection==='claim'){
     focusedPatientUid=p.uid;focusedNpc=null;
     directSelection.begin(p.uid,entity.kind);void durableClient.claim(p.uid);
     // A cached authorized cooperative projection is shown synchronously;
     // an uncached one needs only a read, never an exclusive ownership lease.
     if(guardSession.read().patient.uid!==p.uid)return;
     if(world.snapshot().mode==='competitive')return;
    }
    // This UID is already the server-confirmed bedside focus for this actor.
    // Do not let a previously visited bed retain the chat/clinical target.
    focusedPatientUid=p.uid;focusedNpc=null;
   }else if(guardSession?.read()?.patient.uid===p.uid){
    focusedPatientUid=p.uid;focusedNpc=null;
   }
   if(pendingPatientAction?.uid===p.uid){
    const action=pendingPatientAction;pendingPatientAction=null;
    if(action.destination)clinicalUI.chooseDestination(p,action.destination);
    else clinicalUI.showDiagnosis(p);
    return;
   }
   if(entity.kind==='monitor')clinicalUI.showMonitor(p);else{
    patientWheel.show(p);guidePatientWheel();clinicalChecklist.show(p.uid,guardSession?.read());
   }
  }else selectRecipient(entity.kind);
 }
 function showAudioSettings(){
  open(audioSettingsHTML(hospitalAudio.state()),'audio');
 }
 function showProfile(){
  const s=world.snapshot();
  const a=account.read(),stats=career();
  open(`<h2>Perfil</h2><p>${esc(profile.name)} · Nivel ${stats.level} · ${stats.xp} XP</p>
   <p>${a?'@'+esc(a.username)+' · '+a.casesResolved+' casos resueltos':'Práctica guardada en este dispositivo. Vinculá una cuenta para continuar en otros dispositivos.'}</p>
   ${a?.legacyPracticeXP?'<p>Historial anterior conservado: '+a.legacyPracticeXP+' XP de práctica pendientes de verificación. Tu nivel de cuenta usa los cierres verificados.</p>':''}
   <label class="field">Alias<input id="aliasChoice" value="${esc(profile.name)}" maxlength="32"></label>
   <label class="field">Sexo del personaje<select id="sexChoice"><option value="male" ${profile.sex!=='female'?'selected':''}>Masculino</option><option value="female" ${profile.sex==='female'?'selected':''}>Femenino</option></select></label>
   <label class="field">Ambo<select id="colorChoice">${SCRUB_COLORS.map(k=>`<option value="${k}" ${k===profile.scrubColor?'selected':''}>${esc(content.colors[k]?.[0]||({burgundy:'Burdeos clínico',black:'Negro'}[k]||k))}</option>`).join('')}</select></label>
   <div class="actions"><button data-action="close">Cerrar</button><button data-action="save-profile" ${s.phase==='guard'?'disabled':''}>Guardar</button>
    ${a?'<button data-action="own-social-profile">Ver perfil social</button>':''}
    ${s.phase==='guard'?'':a?'<button data-action="account-use-device">Usar este dispositivo</button><button data-action="account-logout">Cerrar sesión</button>':'<button data-action="account-register">Guardar mi cuenta</button><button data-action="account-login">Ya tengo cuenta</button>'}</div>`);
 }
 function showAccountForm(kind='login'){
  close();socialEnabled=false;ui('hud').hidden=true;ui('chatDock').hidden=true;
  if(kind==='register')void welcome.newDoctor();else welcome.login();
 }
 function applyAccount(a,{restore=false}={}){
  account.accept(a);profile={id:a.actorId,name:a.name,sex:a.sex,scrubColor:a.scrubColor,level:a.level};
  social.setProfile(profile);social.useAccount(a,{restore});world=createWorld(content,profile);
  if(!restore||!social.state().recovering)restoreRoomId=null;
  try{window.localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{}
 }
 async function startPersonalAccountGuard(caseId,mode=draftMode,guardSelection=null){
  if(durableStarting||coopRoomId)return;
  durableStarting=true;let client;
  try{
   await accountTransition;
   await social.connect();
   const a=account.read(),id='personal-'+window.crypto.randomUUID();
   const room={id,mode,members:[{userId:a.actorId,name:a.name}]};client=makeDurableClient(room);
   const initialResponse=await client.start(caseId,mode,guardSelection);
   attachDurableRoom(room,client,initialResponse);
  }catch(error){client?.dispose();toast(error.message);}
  finally{durableStarting=false;}
 }
 async function recoverAccountGuard({actorId,roomId,signal},operation){
  if(durableStarting||durableJoining||coopRoomId)throw Error('Otra entrada a guardia sigue en curso. Volvé a intentarlo.');
  durableStarting=true;let client,attached=false;
  try{
   await awaitAbortable(accountTransition,signal);
   await account.call('take-control',{roomId,expectedActorId:actorId},{signal});
   signal.throwIfAborted();
   const controlled=account.read();
   if(controlled?.actorId!==actorId||controlled.activeGuardId!==roomId)
    throw Error('La cuenta o la guardia cambió. Comprobá nuevamente antes de continuar.');
   client=makeDurableClient({id:roomId},actorId);
   const confirmed=await client.recoverTurn(operation==='release'?'leave':'resume',{signal});
   signal.throwIfAborted();
   if(operation==='release'){
    const result=await account.call('release-guard',{roomId,expectedActorId:actorId},{signal});
    signal.throwIfAborted();
    if(result.ok!==true||result.account?.actorId!==actorId||result.account.activeGuardId!==null)
     throw Error('No se confirmó tu salida de la guardia. Volvé a intentarlo.');
    returnFromGuardRecovery();toast('Finalizaste tu participación. Tu progreso está guardado.');
   }else{
    const current=account.read();
    if(current?.actorId!==actorId||current.activeGuardId!==roomId)
     throw Error('La cuenta o la guardia cambió. Comprobá nuevamente antes de continuar.');
    const clinical=client.read(),spatial=client.snapshotSpatial();
    const room={id:roomId,mode:clinical.shift?.mode,members:clinical.room.members.map(userId=>
     ({userId,name:spatial?.doctors.find(d=>d.id===userId)?.name||'Médico'}))};
    restoreRoomId=null;attachDurableRoom(room,client,confirmed);attached=true;
    // The durable roster is already confirmed. Reattach social transport in
    // parallel so an unavailable room cache cannot hold the recovery UI.
    if(['coop','competitive'].includes(room.mode))void social.join(roomId,{preserveRoom:true}).catch(()=>{});
   }
   return true;
  }finally{
   if(!attached)client?.dispose();durableStarting=false;
  }
 }
 ui('playerName').value=profile.name;
 const avatarCreator=createAvatarCreator({document,window,assetUrls:content.assetUrls,profile,listen,signal});
 const welcome=createWelcomeFlow({document,window,account,avatar:avatarCreator,listen,
  clientKey:()=>social.credentials().clientKey,legacyProgress:()=>progress.read(),
  async prepareNew(){socialEnabled=false;await social.flush();await social.leave();restoreRoomId=null;},
  async onLogout(){
   socialEnabled=false;await social.flush();await social.leave();await account.logout();social.useAccount(null);restoreRoomId=null;
   profile={name:'Médico',sex:'male',scrubColor:'navy'};world=createWorld(content,profile);social.setProfile(profile);
   close();ui('hud').hidden=true;ui('chatDock').hidden=true;
  },
  async onEnter(a,{progress:loadingProgress}){
   // Revalidate the cookie before exposing protected progress after a long welcome.
   const verified=await account.restore();if(!verified)throw Error('La sesión venció. Ingresa tu contraseña nuevamente.');
   await social.flush();if(social.state().room)await social.leave();
   applyAccount(verified);restoreRoomId=null;world.enterLobby();drawWorld();loadingProgress(65);
   await social.connect();loadingProgress(100);enterLobby();
   if(account.read()?.activeGuardId)await guardRecovery.show();
  }
 });
 ui('enterButton').textContent='Entrar al hospital →';ui('enterButton').disabled=false;
 // Single gesture-gated sound channel for selection, invitation and menus.
 // This event only drives the existing audio renderer, never any gameplay.
 listen(document,'click',event=>{
  const cue=uiSoundForTarget(event.target);
  if(cue){hospitalAudio.unlock();hospitalAudio.cue(cue);}
 },{capture:true});
 listen(document,'change',event=>{
  const cue=uiSoundForChange(event.target);if(cue){hospitalAudio.unlock();hospitalAudio.cue(cue);}
 },{capture:true});
 listen(ui('profileForm'),'submit',event=>{
  event.preventDefault();hospitalAudio.unlock();if(welcome.avatarSubmit())return;profile={...profile,name:ui('playerName').value.trim().slice(0,32)||'Médico',
   sex:avatarCreator.read().sex,scrubColor:avatarCreator.read().color};
  social.setProfile(profile);
  try{window.localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{/* session still usable */}
  world=createWorld(content,profile);enterLobby();
 });
 listen(ui('notificationsButton'),'click',showPeople);
 listen(ui('audioButton'),'click',()=>{hospitalAudio.unlock();showAudioSettings();});
 listen(ui('musicToggleButton'),'click',()=>{
  hospitalAudio.setChannel('music',!hospitalAudio.state().channels.music);hospitalAudio.unlock();renderMusic();
 });
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
 listen(ui('profileButton'),'click',showProfile);listen(ui('modalClose'),'click',dismissModal);
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
   patientWheel.hide();if(!p)return;
   if(b.dataset.patientAction==='companion'){
    if(p.historyCompanion)selectRecipient('companion',p.uid);
    return;
   }
   if(b.dataset.patientAction==='hint'){
    if(clinicalHintContext()?.patientUid===p.uid){
     ui('hudMenu').open=false;
     void clinicalHintPresenter.reveal();
    }
    return;
   }
   clinicalUI.openSection(p,b.dataset.patientAction);
  });
 listen(dialog,'change',event=>{
  if(!event.target.matches('input[name="guardScope"]'))return;
  const scope=event.target.value;
  const specialty=document.getElementById('guardSpecialtyField');
  const specific=document.getElementById('guardCaseField');
  if(specialty)specialty.hidden=scope!=='specialty';
  if(specific)specific.hidden=scope!=='specific';
 });
 listen(dialog,'click',async event=>{
  if(await clinicalUI.handle(event.target))return;
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.mode){if(!['coop','competitive'].includes(button.dataset.mode))cancelSharedIntent();draftMode=button.dataset.mode;guardSetup({inspect:false});}
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
  if(button.dataset.action==='close'){dismissModal();return;}
  if(button.dataset.action==='return-lobby'){requestLobby();return;}
  if(button.dataset.action==='save-shift'){await requestLobby();return;}
  if(button.dataset.action==='continue-shift'){await controlGuardTurn('continue');return;}
  if(button.dataset.action==='resume-shift'){await controlGuardTurn('resume');return;}
  if(button.dataset.action==='next-local-patient'){receiveNextLocalPatient();return;}
  if(button.dataset.action==='join-coop'){
   await acceptCooperativeInvitation(button.dataset.room);return;
  }
  if(button.dataset.action==='start-guard'){
   const scope=document.querySelector('input[name="guardScope"]:checked')?.value||'random';
   const selection=scope==='specific'?ui('caseChoice').value:scope==='specialty'?ui('guardSpecialty').value:'';
   const allowedCases=eligibleGuardCases(content.cases,[...playableIds],scope,selection);
   if(!allowedCases.length){toast('No hay casos clínicos jugables para esta selección.');return;}
   const chosenCase=allowedCases[0].id;
   const guardSelection={scope,selection};
   if(['coop','competitive'].includes(draftMode)){
    await inviteColleagues([...document.querySelectorAll('#coopDoctors input:checked')].map(x=>x.value),chosenCase,draftMode,guardSelection);return;
   }
   if(account.read()){await startPersonalAccountGuard(chosenCase,draftMode,guardSelection);return;}
   cancelSharedIntent();
   beginLocalPatient(chosenCase,{allowedCaseIds:allowedCases.map(c=>c.id)});
  }
  if(button.dataset.action==='reception'){
   open(receptionBoardHTML(guardSession?.read()?.shift||localReceptionSnapshot(),
    content.cases,social.state().user?.id),'reception');return;
  }
  if(button.dataset.action==='reception-approach'){
   const patient=world.snapshot().patients.find(p=>p.uid===button.dataset.patientUid);
   const current=guardSession?.read()?.shift?.patients?.find(p=>p.uid===button.dataset.patientUid);
   if(!patient||patient.departed||current?.closed||current?.patientDied)
    return toast('El paciente ya no está disponible en recepción.');
   const competitive=world.snapshot().mode==='competitive';
   const self=social.state().user?.id;
   if(competitive&&current?.ownerId&&current.ownerId!==self)
    return toast('Ese paciente está a cargo de otro médico. Elegí uno disponible.');
   cancelReceptionAssignment();close();
   const target=world.navigation.center(...patient.approach);
   if(world.target(target.x,target.y)||world.patientInRange(patient.uid)){
    receptionAssignment.begin(patient.uid,{firstContact:!competitive||!current?.ownerId});
    toast('Yendo a '+patient.bedId+(competitive?' · te lo asignaré al llegar.':'.'));
   }else toast('No hay una ruta libre hacia el box.');
   return;
  }
  if(button.dataset.action==='patient-chart'){
   const p=world.snapshot().patients.find(p=>p.uid===clinicalUI.patientUid());if(p)clinicalUI.showPatient(p);
  }
  if(button.dataset.action==='save-profile'){
   const next={name:ui('aliasChoice').value.trim().slice(0,32)||'Médico',scrubColor:ui('colorChoice').value,sex:ui('sexChoice').value};
   if(account.read()){
    try{const result=await account.call('profile',next);account.accept(result.account);}
    catch(error){toast(error.message);return;}
   }
   world.setAppearance(next);profile={...profile,...next};
   social.setProfile(profile);
   try{window.localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{}
   close();updateHud();
  }
  if(button.dataset.action==='account-login')showAccountForm('login');
  if(button.dataset.action==='account-use-device'){
   try{await account.call('use-device',{});close();toast('Este dispositivo controla tu personaje.');}
   catch(error){toast(error.message);}
  }
  if(button.dataset.action==='own-social-profile')void showLobbyPlayerCard(account.read().actorId);
  if(button.dataset.action==='remove-friend'){
   try{await social.removeFriend(button.dataset.user);void showLobbyPlayerCard(button.dataset.user);}
   catch(error){toast(error.message);}
  }
  if(button.dataset.action==='account-register')showAccountForm('register');
  if(button.dataset.action==='account-logout'){
   try{await welcome.logout();}catch(error){toast(error.message);}
  }
  if(button.dataset.action==='account-check')await guardRecovery.show();
  if(button.dataset.action==='account-recover')await guardRecovery.run('resume');
  if(button.dataset.action==='account-release')await guardRecovery.run('release');
 });
 listen(dialog,'input',event=>{
  if(event.target?.id==='audioVolume'){
   hospitalAudio.setVolume(Number(event.target.value)/100);hospitalAudio.unlock();return;
  }
  if(event.target?.id==='audioMusicVolume'){
   hospitalAudio.setMusicVolume(Number(event.target.value)/100);hospitalAudio.unlock();renderMusic();return;
  }
  if(event.target?.id==='audioEffectsVolume'){
   hospitalAudio.setEffectsVolume(Number(event.target.value)/100);hospitalAudio.unlock();return;
  }
  clinicalUI.onInput(event.target);
 });
 listen(dialog,'change',event=>{
  if(event.target?.id==='audioEnabled'){
   hospitalAudio.setEnabled(event.target.checked);if(event.target.checked)hospitalAudio.unlock();
  }else if(event.target?.dataset.audioChannel){
   hospitalAudio.setChannel(event.target.dataset.audioChannel,event.target.checked);
   if(event.target.checked)hospitalAudio.unlock();
  }else if(event.target?.dataset.audioScreen){
   hospitalAudio.setMusicTrack(event.target.dataset.audioScreen,event.target.value);
  }else if(event.target?.id==='audioTrack')hospitalAudio.setTrack(event.target.value);
  renderMusic();
 });
 listen(dialog,'pointerdown',event=>{if(event.target.closest('[data-action="diagnosis-suggestion"]'))event.preventDefault();});
 listen(dialog,'cancel',event=>{event.preventDefault();dismissModal();});
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
 listen(ui('guardChatTabs'),'click',event=>{
  const button=event.target.closest('[data-guard-channel]');
  if(!button||!guardChannels.select(button.dataset.guardChannel))return;
  if(button.dataset.guardChannel==='activity'){input.blur();atriaKeyboard.setOpen(false);}
  renderGuardCommunication();updateTypingAssistance();updateHud();
 });
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
 listen(ui('receptionButton'),'click',()=>open(receptionBoardHTML(
  guardSession?.read()?.shift||localReceptionSnapshot(),content.cases,social.state().user?.id),'reception'));
 listen(ui('chatForm'),'submit',event=>{
  event.preventDefault();if(composition)return;const text=input.value.trim();if(!text)return;
  input.value='';updateTypingAssistance();submitText(text);
 });
 listen(input,'compositionstart',()=>composition=true);
 listen(input,'compositionend',()=>{
  composition=false;
  if(deferredRecipient){const {kind,patientUid}=deferredRecipient;deferredRecipient=null;selectRecipient(kind,patientUid);}
  updateTypingAssistance();
 });
 listen(canvas,'pointerdown',canvasDown);
 listen(canvas,'pointermove',event=>{
  if(!drag||drag.id!==event.pointerId||Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)return;
  const [x,y]=renderer.toWorld(event.clientX,event.clientY);world.target(x,y);drag={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 const stopDrag=()=>drag=null;listen(canvas,'pointerup',stopDrag);listen(canvas,'pointercancel',stopDrag);
 listen(window,'keydown',event=>{
  if(event.key==='Escape'){clinicalHintPresenter.cancel();pendingPatientAction=null;patientWheel.hide();dismissModal();input.blur();world.stop();return;}
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||dialog.open)return;
  const v={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];
  if(v){event.preventDefault();cancelReceptionAssignment();
   const p=world.snapshot().player;world.target(p.x+v[0]*32,p.y+v[1]*30);}
 });
 function resize(){renderer.resize();}
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
 function recordFrameError(error,stage,now){
  frameErrorCount++;
  const message=String(error?.message||error),previous=lastFrameError;
  lastFrameError={stage,message,name:error?.name||'Error',at:now};
  // Keep the failure observable without flooding the console if it persists.
  if(!previous||previous.message!==message||previous.stage!==stage||now-previous.at>=5000)
   console.error('ATRIA 5 frame failed ('+stage+')',error);
 }
 function frame(now){
  if(destroyed)return;raf=null;frames++;
  let stage='keyboard',painted=false;
  try{
  atriaKeyboard.advance(now);stage='clinical';
  advanceClinicalTo(now);
  stage='audio';
  // Audio follows the confirmed ECG monitor reading, not a cached HUD copy.
  if(now-lastAudioRead>=100){
   lastAudioRead=now;
   const sample=guardSession&&audioPatient?.uid?
    guardSession.monitorRead(audioPatient.uid):null;
   hospitalAudio.tick(now,{phase:document.body.dataset.phase,patient:sample});
   renderMusic();
  }
  stage='scheduler';
  scheduler.tick(now,{simulate:dt=>{stage='simulation';world.step(dt,now);presentation.advance(world.snapshot());},maintain:()=>{stage='maintenance';if(localSessions.size)for(const s of localSessions.values())s.finishNurseArrivals();
   else guardSession?.finishNurseArrivals();
   const s=world.snapshot();if(s.phase!=='title'&&(socialEnabled||coopRoomId||social.state().recovering))social.maintain(now,{...s.player,phase:s.phase,roomId:coopRoomId});
   // Admission can retry while RTC signaling is stalled inside social.poll.
   // The existing RAF/deadline drives it; there is no additional timer.
   if(s.phase==='lobby'&&!guardSession)maybeBeginCooperativeRoom(now);
   if(durableClient){
    durableClient.setTyping(clinicalTyping);
    const intent=world.motionIntent(),key=JSON.stringify(intent);
    if(intent&&key!==lastMotion){lastMotion=key;durableClient.motion(intent.target,intent.sequence);}
    // The reception controller requests a claim only after local arrival.
    // The server independently verifies the bedside pose and ownership.
    durableClient.maintain(now,{moving:s.player.moving});
   }else if(replica){replica.maintain(now);const key=JSON.stringify(s.player.target||[s.player.x,s.player.y]);
    if(key!==lastMotion){lastMotion=key;const host=social.state().room?.hostUserId;if(host)social.send(host,{kind:'motion',target:s.player.target||[s.player.x,s.player.y]});}}
   // The local client also confirms arrival, but only durable server claims
   // can assign a multiplayer patient.
   if(receptionAssignment.arrive(s.player,uid=>!!world.patientInRange(uid))==='missed')
    toast('No llegaste al box. Elegí de nuevo en recepción.');
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
  },render:()=>{stage='render';drawWorld(now);painted=true;stage='clinical-animation';clinicalUI.animate(now);},isMobile:window.innerWidth<700});
  }catch(error){
   recordFrameError(error,stage,now);
   // A failed HUD/clinical/maintenance update must not starve the hospital
   // canvas. Present the current world without replaying clinical actions.
   if(!painted&&stage!=='render')try{drawWorld(now);}catch(renderError){recordFrameError(renderError,'render',now);}
  }finally{
   // A transient Canvas2D failure used to bypass this line and permanently
   // stop the sole RAF, leaving an empty bitmap behind live DOM controls.
   if(!destroyed&&!document.hidden)raf=window.requestAnimationFrame(frame);
  }
 }
 function resume(){if(!destroyed&&raf===null){const now=window.performance.now();lastClinicalFrame=now;
  hospitalAudio.unlock();clinicalTyping=/INPUT|TEXTAREA/.test(document.activeElement?.tagName);scheduler.reset(now);presentation.reset(world.snapshot());raf=window.requestAnimationFrame(frame);}}
 function pause(){if(raf!==null){window.cancelAnimationFrame(raf);raf=null;}
  const now=window.performance.now();
  try{hospitalAudio.pause();advanceClinicalTo(now);}catch(error){recordFrameError(error,'pause',now);}
  finally{lastClinicalFrame=null;world.stop();}
 }
 function destroy(){if(destroyed)return;clinicalHintPresenter.cancel();vegaHintCard.destroy();destroyed=true;guardRecovery?.cancel();cancelReceptionAssignment();directSelection.cancel();unassignedGlow.destroy();guardSession?.dispose();guardSession=null;social.dispose();pendingPatientAction=null;patientWheel.hide();patientClinical.hide();clinicalChecklist.hide();pause();close();atriaKeyboard.destroy();hospitalAudio.destroy();renderer.destroy();rootLifecycle.leave();}
 listen(document,'visibilitychange',()=>document.hidden?pause():resume());
 listen(window,'pagehide',event=>event.persisted?pause():destroy());listen(window,'pageshow',resume);
 if(signal)listen(signal,'abort',destroy,{once:true});
 drawWorld();resume();
 await welcome.restore();
 return Object.freeze({snapshot:()=>({...world.snapshot(),history:structuredClone(history),clinical:guardSession?.read()||null}),
  diagnostics:()=>({destroyed,raf:raf===null?0:1,listeners:destroyed?0:listeners.length+atriaKeyboard.listenerCount()+renderer.metrics().listeners,timers:0,frames,
   frameErrors:{count:frameErrorCount,last:lastFrameError?{...lastFrameError}:null},
   renderer:renderer.metrics(),keyboard:{open:atriaKeyboard.isOpen()},audio:hospitalAudio.state(),generation:world.snapshot().generation,
   cooperative:{roomId:coopRoomId,authority:!!coopRoomId&&!replica,replica:!!replica,durable:!!durableClient,connections:social.state().connections}}),destroy});
}
