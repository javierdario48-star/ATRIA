// ATRIA 4.8.7 QA: persistent, explicit chat recipient. One visible
// shared transcript; only the selected clinical NPC processes the utterance.
// Deliberately does not bypass cooperative/competitive room permissions.
const once=(s,a,b,label)=>{const i=s.indexOf(a);if(i<0||s.indexOf(a,i+a.length)>=0)throw Error('recipient selector anchor: '+label);return s.slice(0,i)+b+s.slice(i+a.length)};
const speechOld="function deliverPatientSpeech(text,localMode=false){const activeSim=sim,activeCase=C;sim.chats.patient.push(['doctor',text]);const a=patientReply(text);setTimeout(()=>{if(!sim||sim!==activeSim||C!==activeCase||sim.caseEnded)return;sim.chats.patient.push(['patient',a]);addGlobalChat('patient',a);patient.bubble=a;patient.bubbleUntil=performance.now()+2800;refreshChatDock()},320)}";
const speechNew=String.raw`function deliverPatientSpeech(text,localMode=false){
 const target=sim,caseId=C?.id,uid=target?.patientInstance?.uid;
 const context=window.nsTreatmentContext?.();
 if(!target||target.caseEnded||target.patientDied)return false;
 target.chats.patient.push(['doctor',text]);const answer=patientReply(text);
 setTimeout(()=>{
  const current=window.nsTreatmentContext?.(),room=window.csV41Challenge;
  if(target.caseEnded||target.patientDied||target.patientInstance?.uid!==uid||
     context&&(!current||context.epoch!==current.epoch||context.shift!==current.shift||
      context.roomId!==current.roomId)||context?.roomId&&(!room?.active||room.ended))return;
  const foreground=sim===target;
  const deliver=()=>{
   target.chats.patient.push(['patient',answer]);addGlobalChat('patient',answer);
   if(foreground){patient.bubble=answer;patient.bubbleUntil=performance.now()+2800;refreshChatDock();}
  };
  if(window.csWithPatientStateV203)window.csWithPatientStateV203(target,caseId,deliver);
  else if(foreground)deliver();
 },320);return true;
}`;
export function applyChatRecipient487(html,{reverse=false}={}){
 let s=html;
 if(!reverse){
 s=once(s,speechOld,speechNew,'delayed-anamnesis-is-patient-bound');
 // Manually summoned Vega is selectable in Solitario as well as Aprendiz.
 const expertLocator="es=sim?.mentor?.enabled?npcScreen('expert'):null";
 if(s.split(expertLocator).length!==3)throw Error('expected one tap and one hit-test Vega locator');
 s=s.split(expertLocator).join("es=(sim?.mentor?.enabled||sim?.nsVegaCalled)?npcScreen('expert'):null");
 s=once(s,
 "if(es&&tapNear(e.clientX,e.clientY,es[0],es[1],38)){mentorFocus();return}",
 "if(es&&tapNear(e.clientX,e.clientY,es[0],es[1],38)){window.nsSelectChatTarget487?.('expert');return}",
 'tap-vega');
 s=once(s,
 "if(tapNear(e.clientX,e.clientY,ps[0],ps[1],42)){if(near==='patient')",
 "if(tapNear(e.clientX,e.clientY,ps[0],ps[1],42)){window.nsSelectChatTarget487?.('patient');if(near==='patient')",
 'tap-patient');
 s=once(s,
 "if(tapNear(e.clientX,e.clientY,ns[0],ns[1],42)){if(near==='nurse')",
 "if(tapNear(e.clientX,e.clientY,ns[0],ns[1],42)){window.nsSelectChatTarget487?.('nurse');if(near==='nurse')",
 'tap-nurse');
 s=once(s,
 "document.getElementById('chatTargetBtn').onclick=()=>{pendingAddress=null;document.getElementById('mentorBtn')?.classList.remove('active');refreshChatDock();document.getElementById('dieInput')?.focus()}",
 "document.getElementById('chatTargetBtn').onclick=()=>{window.nsSelectChatTarget487?.(null);document.getElementById('dieInput')?.focus()}",
 'explicit-clear-recipient');
 s=once(s, "const inp=document.getElementById('dieInput');if(inp&&document.activeElement===inp){inp.blur();document.body.classList.remove('keyboardOpen');syncDiegeticViewport()}", "const inp=document.getElementById('dieInput');const npcTap487=typeof pointerHitsNpc==='function'&&pointerHitsNpc(e);if(inp&&document.activeElement===inp&&!npcTap487){inp.blur();document.body.classList.remove('keyboardOpen');syncDiegeticViewport()}",'npc-tap-retains-focused-editor');
 s=once(s, "if(tapNear(e.clientX,e.clientY,p[0],p[1],34)){wn.bubble='Estoy asignada a este box.'", "if(tapNear(e.clientX,e.clientY,p[0],p[1],34)){window.nsSelectChatTarget487?.('nurse');wn.bubble='Estoy asignada a este box.'",'ward-nurse-tap');
 }
 const script=String.raw`<style id="atria-recipient-selector-style-487">
 #chatDock .chatTarget.csExplicitTarget487{border:1px solid rgba(116,225,208,.67)!important;background:linear-gradient(110deg,rgba(15,75,76,.95),rgba(24,59,74,.91))!important;box-shadow:0 0 0 1px rgba(118,211,199,.08) inset}
 #chatDock .chatTarget.csExplicitTarget487 span{color:#ddfff6!important;font-weight:650}
 #chatDock .chatGlass:has(.csExplicitTarget487) .chatPreview input{border-color:rgba(104,209,188,.38)}
 </style>
 <script id="atria-recipient-selector-487">
 (function(){
  if(window.__atriaRecipientSelector487)return;window.__atriaRecipientSelector487=true;
  const names={patient:'Paciente',expert:'Dr. Vega',nurse:'Enfermera'};
  const leading=/^\s*(dr\.?\s*vega|vega|doctor(?:\s+vega)?|enfermer(?:a|o|ia|ía)|paciente)\s*(?:[,;:]\s*|\s+|$)/i;
  function mentionOf(text){
   const m=String(text||'').match(leading);if(!m)return null;
   const word=m[1].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   return {role:/vega|doctor/.test(word)?'expert':/enfermer/.test(word)?'nurse':'patient',length:m[0].length};
  }
  function compose(){return document.getElementById('dieInput')}
  let composingInput=null,deferredMention=null;
  document.addEventListener?.('compositionstart',event=>{
   if(event.target===compose())composingInput=event.target;
  },true);
  document.addEventListener?.('compositionend',event=>{
   if(event.target!==composingInput)return;
   composingInput=null;
   const request=deferredMention;deferredMention=null;
   // Let the IME commit its final input before editing the prefix.
   if(request)queueMicrotask(()=>{
    if(request.input===compose()&&request.patient===sim)
     window.nsSelectChatTarget487(request.role);
   });
  },true);
  window.nsChatRecipient487=function(text){
   const raw=String(text||'').trim(),mention=mentionOf(raw);
   return {role:mention?.role||'patient',explicit:!!mention,
    text:mention?raw.slice(mention.length).trim():raw};
  };
  function decorate(){
   const dock=document.getElementById('chatDock');
   if(!dock||dock.classList.contains('nsLobbyChat'))return;
   const btn=dock.querySelector('#chatTargetBtn'),span=btn?.querySelector('span'),input=compose();
   if(!btn||!span||!input)return;
   const explicit=mentionOf(input.value),role=explicit?.role||'patient';
   btn.classList.toggle('csExplicitTarget487',!!explicit);
   span.textContent=explicit?'A: '+names[role]:'Paciente · predeterminado';
   btn.setAttribute('aria-label',explicit?'Destinatario: '+names[role]+'. Tocar para volver al paciente.':'Paciente por defecto. Tocar para quitar la mención.');
   input.placeholder='Pregunta al paciente o mencioná a Vega/enfermería…';
  }
  window.nsSelectChatTarget487=function(role,{auto=false}={}){
   if(auto||!sim||role!=null&&!names[role])return false;
   if(document.body?.classList?.contains('nsLobbyMode'))return false;
   const input=compose();if(!input)return false;
   // Focus during the original gesture, before touching the selection. Mobile
   // browsers need this synchronous user activation to retain/open the editor.
   try{input.focus({preventScroll:true})}catch(_){input.focus()}
   if(composingInput===input){deferredMention={role,input,patient:sim};return true;}
   const match=mentionOf(input.value),rest=(match?input.value.slice(match.length):input.value).trimStart();
   const prefix=role?names[role]+', ':'';
   input.value=prefix+rest;
   sim.__atriaRecipient487=role||null;
   pendingAddress=role||'patient';chatRole=role||'patient';
   document.getElementById('mentorBtn')?.classList?.toggle('active',role==='expert');
   try{input.setSelectionRange(prefix.length,prefix.length)}catch(_){}
   decorate();return true;
  };
  window.nsMentionNPC487=window.nsSelectChatTarget487;
  // Late hospital/monitor wrappers can consume taps before the original
  // scene handler. Select the mention once at the outermost map boundary,
  // then retain their native navigation and touch controls.
  if(typeof handleGameTap==='function'){
   const nativeMapTap=handleGameTap;
   handleGameTap=function(event){
    if(C&&sim&&!editorOpen&&!document.body?.classList?.contains('nsLobbyMode')){
     const roles=['expert','patient','nurse'];
     let hitRole=null;
     for(const role of roles){
      if(role==='expert'&&!sim.mentor?.enabled&&!sim.nsVegaCalled)continue;
      const point=npcScreen(role);
      if(point&&tapNear(event.clientX,event.clientY,point[0],point[1],role==='expert'?38:42)){
       hitRole=role;break;
      }
     }
     if(!hitRole&&typeof wardNurses!=='undefined')for(const actor of wardNurses){
      const point=worldToScreen(actor.x,actor.y);
      if(tapNear(event.clientX,event.clientY,point[0],point[1],34)){hitRole='nurse';break;}
     }
     if(hitRole)window.nsSelectChatTarget487(hitRole);
    }
    return nativeMapTap.apply(this,arguments);
   };
  }
  const oldRefresh=refreshChatDock;
  refreshChatDock=function(){
   const prior=compose(),focused=!!prior&&document.activeElement===prior;
   const draft=prior?.value||'';
   const start=prior?.selectionStart,end=prior?.selectionEnd;
   if(prior&&prior===composingInput){decorate();return;}
   const result=oldRefresh.apply(this,arguments);
   const current=compose();
   if(current&&current!==prior)current.value=draft;
   if(current&&current!==prior&&focused){
    try{current.focus({preventScroll:true})}catch(_){current.focus()}
    try{if(start!=null&&end!=null)current.setSelectionRange(start,end)}catch(_){}
   }
   decorate();return result;
  };
  const originalSend=sendMessage;
  const nativeGlobalChat=addGlobalChat;
  addGlobalChat=function(role,text,options={}){
   const result=nativeGlobalChat.apply(this,arguments);
   if(!options.nsRemoteNPC487&&['patient','expert','nurse','clinical-ok'].includes(role))
    window.csBroadcastNPCReply487?.(role,text);
   return result;
  };
  sendMessage=function(message){
   const raw=String(message||'').trim();
   if(!raw||raw.startsWith('/')||!C||!sim||sim.caseEnded||
      document.body?.classList?.contains('nsLobbyMode'))return originalSend.apply(this,arguments);
   const mention=mentionOf(raw),role=mention?.role||'patient';
   const utterance=mention?raw.slice(mention.length).trim():raw;
   if(!utterance)return false;
   const room=window.csV41Challenge;
   if(room?.active){
    const item=room.patients?.find(p=>p.uid===sim.patientInstance?.uid);
    const canOwn=!room.ended&&item?.ownerId===room.selfId&&item?.state==='in_care'&&
     !sim.__csRemoteMirror487&&!sim.__csRoomSpectator;
    if(!canOwn){
     if(role==='expert'&&room.mode==='competitive'){
      addGlobalChat('system','Vega no puede indicar acciones clínicas sobre un paciente rival.');
      refreshChatDock();return false;
     }
     return originalSend.apply(this,arguments);
    }
    window.csBroadcastAddressedChat487?.(role,raw);
   }
   if(window.nsMayExamine?.()===false)return originalSend.apply(this,arguments);
   if(role==='expert'&&!sim.mentor?.enabled&&!sim.nsVegaCalled&&!sim.nsVegaCare?.active){
    addGlobalChat('system','Llamá primero al Dr. Vega para conversar con él.');
    refreshChatDock();return false;
   }
   player.bubble=raw;player.bubbleUntil=performance.now()+2200;
   addGlobalChat('doctor','A '+names[role]+': '+utterance);
   if(role==='expert')mentorUserMessage(utterance);
   else if(role==='nurse')nurseNatural(raw);
   else deliverPatientSpeech(utterance,true);
   refreshChatDock();return true;
  };
 })();
 </script>`;
 if(reverse){
  // Remove exactly our own presentation module, then invert every source
  // replacement in strict reverse order. The immutable baseline still hashes
  // to its original bytes; no digest or fixture is rewritten.
  s=once(s,script+'</body>','</body>','reverse-recipient-module');
  s=once(s,"if(tapNear(e.clientX,e.clientY,p[0],p[1],34)){window.nsSelectChatTarget487?.('nurse');wn.bubble='Estoy asignada a este box.'","if(tapNear(e.clientX,e.clientY,p[0],p[1],34)){wn.bubble='Estoy asignada a este box.'",'reverse-ward-nurse-tap');
  s=once(s,"const inp=document.getElementById('dieInput');const npcTap487=typeof pointerHitsNpc==='function'&&pointerHitsNpc(e);if(inp&&document.activeElement===inp&&!npcTap487){inp.blur();document.body.classList.remove('keyboardOpen');syncDiegeticViewport()}","const inp=document.getElementById('dieInput');if(inp&&document.activeElement===inp){inp.blur();document.body.classList.remove('keyboardOpen');syncDiegeticViewport()}",'reverse-tap-editor-focus');
  s=once(s,
   "document.getElementById('chatTargetBtn').onclick=()=>{window.nsSelectChatTarget487?.(null);document.getElementById('dieInput')?.focus()}",
   "document.getElementById('chatTargetBtn').onclick=()=>{pendingAddress=null;document.getElementById('mentorBtn')?.classList.remove('active');refreshChatDock();document.getElementById('dieInput')?.focus()}",
   'reverse-recipient-clear');
  s=once(s,
   "if(tapNear(e.clientX,e.clientY,ns[0],ns[1],42)){window.nsSelectChatTarget487?.('nurse');if(near==='nurse')",
   "if(tapNear(e.clientX,e.clientY,ns[0],ns[1],42)){if(near==='nurse')",
   'reverse-recipient-nurse');
  s=once(s,
   "if(tapNear(e.clientX,e.clientY,ps[0],ps[1],42)){window.nsSelectChatTarget487?.('patient');if(near==='patient')",
   "if(tapNear(e.clientX,e.clientY,ps[0],ps[1],42)){if(near==='patient')",
   'reverse-recipient-patient');
  s=once(s,
   "if(es&&tapNear(e.clientX,e.clientY,es[0],es[1],38)){window.nsSelectChatTarget487?.('expert');return}",
   "if(es&&tapNear(e.clientX,e.clientY,es[0],es[1],38)){mentorFocus();return}",
   'reverse-recipient-vega');
  const locator="es=(sim?.mentor?.enabled||sim?.nsVegaCalled)?npcScreen('expert'):null";
  if(s.split(locator).length!==3)throw Error('reverse Vega locator is not exactly two occurrences');
  s=s.split(locator).join("es=sim?.mentor?.enabled?npcScreen('expert'):null");
  return once(s,speechNew,speechOld,'reverse-delayed-anamnesis');
 }
 return once(s,'</body>',script+'</body>','recipient-after-existing-nursing-and-multiplayer');
}
