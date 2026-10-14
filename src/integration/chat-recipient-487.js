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
     const roles=['expert','nurse'];
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
   addGlobalChat('doctor',raw);
   if(role==='expert')mentorUserMessage(utterance);
   else if(role==='nurse')nurseNatural(raw);
   else deliverPatientSpeech(utterance,true);
   refreshChatDock();return true;
  };
  // Exactly one public ward transcript and one native clinical interpreter.
  // The historical "team_chat" name is ONLY a transport packet, not a room,
  // chat tab, mode or second interpreter.
  const audibleRadius487=280,patientRadius487=135;
  const wardBubbles487=new Map();
  function inWard487(){const r=window.csV41Challenge;return !!r?.active&&!r.ended&&!!sim&&!!C&&!document.body?.classList?.contains('nsLobbyMode')}
  // Bed-space selection: use the actual occupied bed, not its single walk-to tile.
  // Box 2A and 2B are 120 world units apart and must remain distinct.
  function patientBedScore487(p,x=player.x,y=player.y){
   const b=p?.instance?.bed,point=b?.patient;
   if(!point||!Number.isFinite(x)||!Number.isFinite(y))return Infinity;
   const dx=Math.abs(x-point[0]),dy=y-point[1];
   if(dx>76||dy< -105||dy>148)return Infinity;
   return (dx/76)**2+(dy<0?dy/105:dy/148)**2;
  }
  window.csWardPatientInZone487=function(p,x=player.x,y=player.y){
   return Number.isFinite(patientBedScore487(p,x,y));
  };
  function nearPatient487(){
   const r=window.csV41Challenge;
   if(!inWard487()||!Array.isArray(r.patients))return null;
   const candidates=r.patients.filter(p=>p?.instance&&['in_care','waiting'].includes(p.state))
    .map(p=>({patient:p,score:patientBedScore487(p)}))
    .filter(x=>Number.isFinite(x.score))
    .sort((a,b)=>a.score-b.score);
   if(!candidates.length){r._wardBedFocus487=null;return null;}
   const focus=r._wardBedFocus487||sim?.patientInstance?.uid;
   const stillHere=candidates.find(x=>x.patient.uid===focus);
   const chosen=stillHere&&stillHere.score<=candidates[0].score+.09?stillHere:candidates[0];
   r._wardBedFocus487=chosen.patient.uid;
   return chosen.patient;
  }
  window.csWardNearestBed487=()=>nearPatient487()?.uid||null;
  window.csWardChatAudible487=function(packet){
   // Absence of position is only for packets from older supported clients;
   // do not silently discard a valid message during an upgrade.
   if(!inWard487()||!packet||!Number.isFinite(packet.x)||!Number.isFinite(packet.y))return true;
   return Math.hypot(player.x-packet.x,player.y-packet.y)<=audibleRadius487;
  };
  window.csWardRemoteSpeech487=function(author,text,x,y,npc=false){
   if(npc||!inWard487()||!author||author===window.csV41Challenge?.selfId)return;
   wardBubbles487.set(author,{text:String(text||'').slice(0,180),until:performance.now()+2900,x,y});
  };
  // The movement sampler and remote sprites remain untouched. Draw a speech
  // overlay at each visible remote's current position, after its nameplate.
  // Paint after the final scene draw, so late multiplayer renderer replacements
  // cannot hide remote speech. This is visual-only: the movement sampler is untouched.
  const installWardBubbleOverlay487=()=>{
   if(typeof draw!=='function'||draw.__atriaWardBubbleOverlay487)return;
   const nativeDraw487=draw;let lastRoster487=0;
   const overlay487=function(){
    const result=nativeDraw487.apply(this,arguments),now=performance.now();
    if(now-lastRoster487>500){lastRoster487=now;window.csWardRefreshRoster487?.();}
    if(!inWard487()){wardBubbles487.clear();return result;}
    for(const [id,speechEvent] of wardBubbles487){
     if(now>speechEvent.until){wardBubbles487.delete(id);continue;}
     const actor=csCoop?.remotes?.[id];
     if(!actor||actor.roomId!==window.csV41Challenge.id||
        !Number.isFinite(actor.x)||!Number.isFinite(actor.y))continue;
     if(Math.hypot(player.x-actor.x,player.y-actor.y)>audibleRadius487)continue;
     speech(speechEvent.text,actor.x,actor.y-54,'#ccecff',speechEvent.until);
    }
    return result;
   };
   overlay487.__atriaWardBubbleOverlay487=true;draw=overlay487;
  };
  installWardBubbleOverlay487();
  if(typeof setTimeout==='function')setTimeout(installWardBubbleOverlay487,0);
  // Room-level history survives switching patients or opening another box.
  // A patient's clinical anamnesis remains separate and authoritative.
  // The HTTP room already provides a server-authenticated participant list.
  // Repair a late V41 game roster from that existing list, never from a
  // self-declared chat nickname or unverified packet.
  window.csWardRefreshRoster487=function(){
   if(!inWard487()||typeof csCoop==='undefined')return 0;
   const dc=csCoop.dc,room=window.csV41Challenge;
   if(dc?.readyState!=='open'||!Array.isArray(dc.peerGameIds))return 0;
   let added=0;
   for(const peerId of dc.peerGameIds.slice(0,3)){
    const remote=csCoop.remotes?.[peerId];
    if(!peerId||peerId===room.selfId||!remote?.name)continue;
    let person=room.players.find(p=>p.id===peerId);
    if(!person&&room.players.length<4){
     room.players.push({id:peerId,name:String(remote.name).slice(0,40),online:remote.online!==false,xpGuard487:0});added++;
    }else if(person)person.name=String(remote.name).slice(0,40);
   }
   return added;
  };
  function sharedWardHistory487(){
   if(!inWard487())return null;
   const room=window.csV41Challenge;
   if(room._wardHistoryRoomId487!==room.id){
    room._wardHistoryRoomId487=room.id;room._wardTranscript487=[];
   }
   if(sim.globalChat!==room._wardTranscript487)sim.globalChat=room._wardTranscript487;
   return room._wardTranscript487;
  }
  const oldActiveChatArray487=typeof activeChatArray==='function'?activeChatArray:()=>sim?.globalChat||[];
  activeChatArray=function(){return sharedWardHistory487()||oldActiveChatArray487.apply(this,arguments)};
  window.csWardChatState487=function(){return {active:inWard487(),
   roomId:window.csV41Challenge?.id||null,history:sharedWardHistory487()?.length||0,
   bubbles:wardBubbles487.size,audibleRadius:audibleRadius487,patientRadius:patientRadius487}};
  const globalChatOld487=addGlobalChat;
  addGlobalChat=function(role,text,options={}){
   sharedWardHistory487();
   if(inWard487()&&role==='doctor'&&options.nsRemoteNPC487){
    const recent=sim.globalChat||[],now=performance.now();
    if(recent.slice(-36).some(v=>v[0]===role&&v[1]===text&&now-Number(v[2]||0)<2500))return;
   }
   if(inWard487()&&role==='doctor'&&!options.nsRemoteNPC487){
    const r=window.csV41Challenge,n=String((typeof csProfile!=='undefined'&&csProfile?.name)||'Médico'),raw=String(text||'');
    const alreadyNamed=(r.players||[]).some(p=>p?.name&&raw.startsWith(p.name+': '));
    if(!alreadyNamed&&!/^[^:]{1,50}:\s/.test(raw.replace(/^A (?:Paciente|Enfermera|Dr\. Vega):\s*/i,'')))
     text=n+': '+raw;
   }
   return globalChatOld487.call(this,role,text,options);
  };
  const globalLabelOld487=typeof chatLineLabel==='function'?chatLineLabel:()=>'';
  chatLineLabel=function(role){return inWard487()&&role==='doctor'?'':globalLabelOld487.call(this,role)};
  function publishSpeech487(raw,role){
   if(!window.csBroadcastAddressedChat487?.(role,raw))return false;
   player.bubble=raw;player.bubbleUntil=performance.now()+2900;
   addGlobalChat('doctor',raw);refreshChatDock();return true;
  }
  // Android IME and hardware Enter must take the same native Send-button path.
  // Run before legacy key handlers; composition must never submit prematurely.
  document.addEventListener?.('keydown',event=>{
   if(!inWard487()||event.target?.id!=='dieInput'||event.key!=='Enter'||
      event.isComposing||event.keyCode===229)return;
   event.preventDefault();event.stopImmediatePropagation();
   const live=document.getElementById('dieInput'),draft=event.target.value||live?.value||'';
   if(!draft.trim())return;
   if(live&&live!==event.target)live.value=draft;
   const sendButton=document.getElementById('dieSend');
   if(sendButton)sendButton.click();
   else{event.target.value='';sendMessage(draft);}
  },true);
  const globalSendOld487=sendMessage;
  sendMessage=function(message){
   const raw=String(message||'').trim();
   if(!inWard487()||!raw||raw.startsWith('/'))return globalSendOld487.apply(this,arguments);
   const parsed=window.nsChatRecipient487(raw),role=parsed.role,target=nearPatient487(),room=window.csV41Challenge;
   // No automatic recipient except the nearest physically audible patient.
   // Explicit "Enfermera, ..." and "Vega, ..." retain their existing native
   // clinical dispatch and competitive permission rules.
   if(role==='patient'){
    if(!target){const selected=room.patients?.find(p=>p.uid===sim.patientInstance?.uid);if(selected?.ownerId===room.selfId&&!sim.__csRoomSpectator&&!sim.__csRemoteMirror487&&!selected.instance)return globalSendOld487.apply(this,arguments);return publishSpeech487(raw,role);}
    const own=target.ownerId===room.selfId&&sim.patientInstance?.uid===target.uid&&!sim.__csRemoteMirror487&&!sim.__csRoomSpectator;
    if(own)return globalSendOld487.apply(this,arguments);
    const routed=window.csWardAskPatient487?.(target.index,raw,role);
    if(routed==='pending')return true; // one send only, after authoritative claim
    if(routed===true)return publishSpeech487(raw,role);
    if(target.ownerId===room.selfId&&sim.patientInstance?.uid===target.uid)
     return globalSendOld487.apply(this,arguments);
    return publishSpeech487(raw,role);
   }
   // Named NPCs use precisely the solo interpreter through the native
   // owner or the already existing cooperative action relay.
   if(target&&target.ownerId&&target.ownerId!==room.selfId&&room.mode==='coop'){
    const routed=window.csWardAskPatient487?.(target.index,raw,role);
    if(routed===true)return publishSpeech487(raw,role);
   }
   return globalSendOld487.apply(this,arguments);
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
