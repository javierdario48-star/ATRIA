import {FrameScheduler} from '../../app/frame-scheduler.js';
import {Lifecycle} from '../../app/lifecycle.js';
import {createWorld} from './world.js';
import {createHospitalRenderer} from '../render/hospital.js';
import {createPresentationTimeline} from '../render/presentation-timeline.js';
import {createGuardSession} from '../clinical/guard-session.js';
import {createProgressionLedger} from '../clinical/progression.js';
import {createAtriaKeyboard} from '../ui/atria-keyboard.js';
import {createClinicalInterface} from '../ui/clinical-controller.js';

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
 let savedRewardCount=progress.read().receipts.length;
 let profile=readProfile(window.localStorage),world=createWorld(content,profile),destroyed=false,raf=null,
  toastUntil=0,focusedNpc=null,focusedPatientUid=null,draftMode='solo',composition=false,deferredRecipient=null,drag=null,frames=0,
  guardSession=null,lastPanelUpdate=0,messageNumber=0,lastClinicalFrame=null,clinicalTyping=false;
 const ui=id=>document.getElementById(id),input=ui('dieInput'),canvas=ui('game'),dialog=ui('modal');
 const renderer=await createHospitalRenderer(canvas,content,{signal,window});
 const scheduler=new FrameScheduler({mobileRenderHz:60}),listeners=[];
 const presentation=createPresentationTimeline(world.snapshot());
 const atriaKeyboard=createAtriaKeyboard({document,window,input,host:ui('chatDock'),
  onSubmit:()=>{if(composition)return;const message=input.value.trim();if(message){input.value='';submitText(message);}},
  onRecipient:()=>ui('recipientButton').click()});
 function drawWorld(now=window.performance.now(),alpha=scheduler.presentationAlpha()){
  if(atriaKeyboard.isOpen()&&!ui('chatDock').hidden&&!ui('hud').hidden){
   const origin=canvas.getBoundingClientRect().top;
   renderer.setPlayableBounds({top:ui('hud').getBoundingClientRect().bottom-origin+7,
    bottom:ui('chatDock').getBoundingClientRect().top-origin-5});
  }else renderer.setPlayableBounds(null);
  renderer.draw(presentation.sample(world.snapshot(),alpha),now);
 }
 const history=[];
 function listen(target,type,handler,options){scope.listen(target,type,handler,options);listeners.push(type);}
 function toast(message){ui('toast').textContent=message;ui('toast').hidden=false;toastUntil=window.performance.now()+3200;}
 function open(html){world.stop();drag=null;ui('modalContent').innerHTML=html;if(!dialog.open)dialog.showModal();}
 function close(){if(dialog.open)dialog.close();}
 const clinicalUI=createClinicalInterface({document,session:()=>guardSession,open,close,send:submitText,notify:toast,
  onTalk:uid=>selectRecipient('patient',uid)});
 function line(name,text,system=false){
  history.push({name,text,system});if(history.length>300)history.shift();
  const el=document.createElement('div');el.className='line'+(system?' system':'');
  const who=document.createElement('b');who.textContent=name+':';el.append(who,document.createTextNode(text));
  ui('chatHistory').append(el);while(ui('chatHistory').children.length>300)ui('chatHistory').firstChild.remove();
  ui('chatHistory').scrollTop=ui('chatHistory').scrollHeight;
 }
 function renderGuardCommunication(){
  if(!guardSession)return;const rows=guardSession.read().messages.slice(-300),fragment=document.createDocumentFragment();
  history.length=0;
  for(const row of rows){
   history.push({name:row.name,text:row.text,system:row.role!=='player'});
   const el=document.createElement('div'),who=document.createElement('b');el.className='line';el.dataset.messageId=row.id;
   who.textContent=row.name+':';el.append(who,document.createTextNode(row.text));fragment.append(el);
  }
  ui('chatHistory').replaceChildren(fragment);ui('chatHistory').scrollTop=ui('chatHistory').scrollHeight;
  clinicalUI.render();
  if(progress.read().receipts.length!==savedRewardCount){
   try{window.localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress.read()));savedRewardCount=progress.read().receipts.length;}
   catch{toast('Progreso confirmado en esta sesión; no se pudo guardar en este dispositivo.');}
  }
  updateHud();
 }
 function resetChat(message){history.length=0;ui('chatHistory').replaceChildren();input.value='';focusedNpc=null;focusedPatientUid=null;line('ATRIA',message,true);}
 function advanceClinicalTo(now){
  now=Math.max(lastClinicalFrame??now,now);
  const previous=lastClinicalFrame;lastClinicalFrame=now;
  if(guardSession&&previous!==null)guardSession.advance(Math.max(0,(now-previous)/1000),{typing:clinicalTyping});
 }
 function updateHud(){
  const s=world.snapshot(),guard=s.phase==='guard';
  const minute=Math.floor(guardSession?.read().clock.clinicalMinute||0),total=8*60+15+minute;
  ui('status').textContent=guard?(s.mode==='apprentice'?'Aprendiz':'Solitario')+' · '+String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0')+' · 5.0':'Lobby local · 5.0 experimental';
  ui('guardButton').textContent=guard?'Volver al lobby':'Hacer guardia';
  ui('peopleButton').textContent=guard?'Historia':'Personas';
  const career=progress.read();ui('playerProgress').textContent='Nivel '+career.level+' · '+(career.xp%200)+'/200 XP';world.setLevel(career.level);
  ui('recipientButton').textContent=guard?({nurse:'Enfermera',vega:'Dr. Vega'}[focusedNpc]||'Paciente cercano'):'Lobby · público';
  input.placeholder=guard?'Hablar en la guardia…':'Hablar en el lobby…';
  document.body.dataset.phase=s.phase;document.body.dataset.generation=String(s.generation);
 }
 function enterLobby(){
  advanceClinicalTo(window.performance.now());
  guardSession?.dispose();guardSession=null;clinicalUI.reset();close();world.enterLobby();resetChat('El lobby está listo para hablar.');
  ui('splash').hidden=true;ui('hud').hidden=false;ui('chatDock').hidden=false;updateHud();
 }
 function guardSetup(){
  open(`<h2>Hacer guardia</h2><p>Elegí la modalidad y el caso de práctica.</p><div class="modes">
   <button class="mode ${draftMode==='apprentice'?'active':''}" data-mode="apprentice"><b>Aprendiz</b><small>Con Dr. Vega. Navegación disponible; tutor clínico en migración.</small></button>
   <button class="mode ${draftMode==='solo'?'active':''}" data-mode="solo"><b>Solitario</b><small>Explorá el hospital con los recursos originales.</small></button>
   <button class="mode" disabled><b>Cooperativo</b><small>2–4 jugadores · pendiente de integrar.</small></button>
   <button class="mode" disabled><b>Competitivo</b><small>2–4 jugadores · pendiente de integrar.</small></button></div>
   <label class="field">Caso<select id="caseChoice">${content.cases.map(c=>`<option value="${esc(c.id)}">${esc(c.selector)}</option>`).join('')}</select></label>
   <p class="note">CIRR y APP-001: evaluación, estudios, tratamiento y cierre con XP. Otros casos: navegación y estudios. Tutor, voz y multijugador siguen en migración.</p>
   <div class="actions"><button data-action="close">Cancelar</button><button class="primary" data-action="start-guard">Entrar a la guardia</button></div>`);
 }
 function selectRecipient(kind,patientUid=null){
  if(composition){deferredRecipient=kind;return;}
  focusedNpc=kind==='patient'?null:kind;
  focusedPatientUid=kind==='patient'?patientUid:null;
  const text=input.value.replace(/^(?:(?:dr\.?\s*)?vega|enfermera|enfermero)\s*[,.:]?\s*/i,'');
  const prefix=kind==='nurse'?'Enfermera, ':kind==='vega'?'Vega, ':'';
  input.value=prefix+text;updateHud();input.focus({preventScroll:true});input.setSelectionRange(prefix.length,prefix.length);
 }
 async function submitText(text,{patientUid}={}){
  if(!text.trim())return;
  if(!guardSession){line(profile.name,text);return;}
  advanceClinicalTo(window.performance.now());
  const session=guardSession;
  try{return await session.post({id:'message-'+(++messageNumber),text,...(patientUid?{targetPatientUid:patientUid}:{})});}
  catch{if(guardSession===session)toast('No pude confirmar el mensaje.');}
 }
 function canvasDown(event){
  if(world.snapshot().phase==='title')return;
  const [x,y]=renderer.toWorld(event.clientX,event.clientY),hit=world.interactionAt(x,y);
  if(hit){
   const result=world.beginInteraction(hit.id);drag=null;
   if(result.status==='ready')activateEntity(result.entity);
   else if(result.status==='walking')toast('Acercándote al paciente…');
   else toast('Acercate para interactuar.');
   return;
  }
  document.activeElement?.blur?.();close();
  if(!world.target(x,y))toast('No hay una ruta disponible.');
  drag={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);
 }
 function activateEntity(entity){
  world.stop();
  if(entity.patientUid){
   const p=world.snapshot().patients.find(p=>p.uid===entity.patientUid);if(!p)return;
   if(entity.kind==='monitor')clinicalUI.showMonitor(p);else clinicalUI.showPatient(p);
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
  try{window.localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{/* session still usable */}
  world=createWorld(content,profile);enterLobby();
 });
 listen(ui('guardButton'),'click',()=>world.snapshot().phase==='guard'?enterLobby():guardSetup());
 listen(ui('peopleButton'),'click',()=>world.snapshot().phase==='guard'?clinicalUI.showPatient(world.snapshot().patients.find(p=>p.uid===world.nearby())||world.snapshot().patients[0]):
  open('<h2>Personas</h2><p>Esta compilación funciona en modo local. La presencia, las invitaciones y las salas compartidas todavía no están conectadas.</p>'));
 listen(ui('profileButton'),'click',showProfile);listen(ui('modalClose'),'click',close);
 listen(dialog,'click',async event=>{
  if(await clinicalUI.handle(event.target))return;
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.mode){draftMode=button.dataset.mode;guardSetup();}
  if(button.dataset.action==='close')close();
  if(button.dataset.action==='start-guard'){
   guardSession?.dispose();clinicalUI.reset();world.enterGuard({mode:draftMode,caseId:ui('caseChoice').value});
   const s=world.snapshot(),roomId='guard-'+window.crypto.randomUUID();
   guardSession=createGuardSession({roomId,mode:s.mode,actorId:'local-player',actorName:profile.name,progress,
    patient:s.patients[0],content,resolveContext:({targetPatientUid})=>({
     patientUid:targetPatientUid!==undefined?world.patientInRange(targetPatientUid):focusedPatientUid?world.patientInRange(focusedPatientUid):world.nearby(),focusedNpc}),
    onChange:(_event,room)=>{if(guardSession?.read().room.roomId===room.roomId)renderGuardCommunication();}});
   lastClinicalFrame=window.performance.now();
   close();resetChat(['CIRR-001','APP-001'].includes(s.caseId)?'Guardia clínica. Evaluación, estudios, tratamiento y cierre disponibles.':'Guardia experimental. Estudios disponibles; atención completa en migración.');updateHud();
  }
  if(button.dataset.action==='patient-chart'){
   const p=world.snapshot().patients.find(p=>p.uid===clinicalUI.patientUid());if(p)clinicalUI.showPatient(p);
  }
  if(button.dataset.action==='save-profile'){
   const next={name:ui('aliasChoice').value.trim().slice(0,32)||'Médico',scrubColor:ui('colorChoice').value};
   world.setAppearance(next);profile=next;
   try{window.localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{}
   close();updateHud();
  }
 });
 listen(dialog,'keydown',event=>{
  if(['Enter',' '].includes(event.key)&&event.target.matches('svg [data-exam-region]')){
   event.preventDefault();clinicalUI.handle(event.target);
  }
 });
 listen(ui('recipientButton'),'click',()=>{
  if(world.snapshot().phase==='guard')selectRecipient(focusedNpc==='nurse'?'vega':focusedNpc==='vega'?'patient':'nurse');
 });
 listen(ui('historyButton'),'click',()=>{
  const expanded=ui('chatHistory').classList.toggle('expanded');ui('historyButton').setAttribute('aria-expanded',String(expanded));
 });
 listen(ui('chatForm'),'submit',event=>{
  event.preventDefault();if(composition)return;const text=input.value.trim();if(!text)return;
  input.value='';submitText(text);
 });
 listen(input,'compositionstart',()=>composition=true);
 listen(input,'compositionend',()=>{composition=false;if(deferredRecipient){const target=deferredRecipient;deferredRecipient=null;selectRecipient(target);}});
 listen(canvas,'pointerdown',canvasDown);
 listen(canvas,'pointermove',event=>{
  if(!drag||drag.id!==event.pointerId||Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)return;
  const [x,y]=renderer.toWorld(event.clientX,event.clientY);world.target(x,y);drag={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 const stopDrag=()=>drag=null;listen(canvas,'pointerup',stopDrag);listen(canvas,'pointercancel',stopDrag);
 listen(window,'keydown',event=>{
  if(event.key==='Escape'){close();input.blur();world.stop();return;}
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
  if(destroyed)return;raf=null;frames++;
  advanceClinicalTo(now);
  scheduler.tick(now,{simulate:dt=>{world.step(dt);presentation.advance(world.snapshot());},maintain:()=>{
   if(toastUntil&&now>=toastUntil){ui('toast').hidden=true;toastUntil=0;}
   const interaction=world.takeInteraction();if(interaction)activateEntity(interaction);
   if(guardSession&&now-lastPanelUpdate>=1000){lastPanelUpdate=now;updateHud();clinicalUI.render();}
  },render:()=>drawWorld(now),isMobile:window.innerWidth<700});
  raf=window.requestAnimationFrame(frame);
 }
 function resume(){if(!destroyed&&raf===null){const now=window.performance.now();lastClinicalFrame=now;
  clinicalTyping=/INPUT|TEXTAREA/.test(document.activeElement?.tagName);scheduler.reset(now);presentation.reset(world.snapshot());raf=window.requestAnimationFrame(frame);}}
 function pause(){advanceClinicalTo(window.performance.now());lastClinicalFrame=null;if(raf!==null){window.cancelAnimationFrame(raf);raf=null;}world.stop();}
 function destroy(){if(destroyed)return;destroyed=true;guardSession?.dispose();guardSession=null;pause();close();atriaKeyboard.destroy();rootLifecycle.leave();}
 listen(document,'visibilitychange',()=>document.hidden?pause():resume());
 listen(window,'pagehide',event=>event.persisted?pause():destroy());listen(window,'pageshow',resume);
 if(signal)listen(signal,'abort',destroy,{once:true});
 drawWorld();resume();
 return Object.freeze({snapshot:()=>({...world.snapshot(),history:structuredClone(history),clinical:guardSession?.read()||null}),
  diagnostics:()=>({destroyed,raf:raf===null?0:1,listeners:destroyed?0:listeners.length+atriaKeyboard.listenerCount(),timers:0,frames,
   renderer:renderer.metrics(),keyboard:{open:atriaKeyboard.isOpen()},generation:world.snapshot().generation}),destroy});
}
