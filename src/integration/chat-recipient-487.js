// ATRIA 4.8.7 QA: persistent, explicit chat recipient. One visible
// shared transcript; only the selected clinical NPC processes the utterance.
// Deliberately does not bypass cooperative/competitive room permissions.
const once=(s,a,b,label)=>{const i=s.indexOf(a);if(i<0||s.indexOf(a,i+a.length)>=0)throw Error('recipient selector anchor: '+label);return s.slice(0,i)+b+s.slice(i+a.length)};
export function applyChatRecipient487(html){
 let s=html;
 s=once(s,
 "if(es&&tapNear(e.clientX,e.clientY,es[0],es[1],38)){mentorFocus();return}",
 "if(es&&tapNear(e.clientX,e.clientY,es[0],es[1],38)){window.nsSelectChatTarget487?.('expert');mentorFocus();return}",
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
 const script=String.raw`<style id="atria-recipient-selector-style-487">
 #chatDock .chatTarget.csExplicitTarget487{border:1px solid rgba(116,225,208,.67)!important;background:linear-gradient(110deg,rgba(15,75,76,.95),rgba(24,59,74,.91))!important;box-shadow:0 0 0 1px rgba(118,211,199,.08) inset}
 #chatDock .chatTarget.csExplicitTarget487 span{color:#ddfff6!important;font-weight:650}
 #chatDock .chatGlass:has(.csExplicitTarget487) .chatPreview input{border-color:rgba(104,209,188,.38)}
 </style>
 <script id="atria-recipient-selector-487">
 (function(){
  if(window.__atriaRecipientSelector487)return;window.__atriaRecipientSelector487=true;
  const names={patient:'Paciente',expert:'Dr. Vega',nurse:'Enfermera'};
  function decorate(){
   const dock=document.getElementById('chatDock');if(!dock||dock.classList.contains('nsLobbyChat'))return;
   const role=sim?.__atriaRecipient487;
   const btn=dock.querySelector('#chatTargetBtn'),label=btn?.querySelector('span'),input=dock.querySelector('#dieInput');
   if(!btn||!label||!input)return;
   btn.classList.toggle('csExplicitTarget487',!!names[role]);
   btn.setAttribute('aria-label',role?'Destinatario: '+names[role]+'. Tocar para volver a hablar cerca.':'Elegir conversación cercana');
   if(role){label.textContent='Para: '+names[role];input.placeholder='Escribir a '+names[role]+'…';}
  }
  window.nsSelectChatTarget487=function(role,{auto=false}={}){
   if(!sim)return false;
   if(role!=null&&!names[role])return false;
   // Automatic mentor prompts do not override an explicitly chosen patient
   // or nurse. The user can always switch by touching a character.
   if(auto&&sim.__atriaRecipient487&&sim.__atriaRecipient487!==role)return false;
   sim.__atriaRecipient487=role||null;
   pendingAddress=role||null;chatRole=role||null;
   document.getElementById('mentorBtn')?.classList.toggle('active',role==='expert');
   decorate();return true;
  };
  const originalRefresh=refreshChatDock;
  refreshChatDock=function(){
   const result=originalRefresh.apply(this,arguments);decorate();return result;
  };
  const originalFocus=mentorFocus;
  mentorFocus=function(){
   window.nsSelectChatTarget487('expert');
   return originalFocus.apply(this,arguments);
  };
  const originalMentorSay=mentorSay;
  mentorSay=function(text,opts){
   const result=originalMentorSay.apply(this,arguments);
   if(opts?.question)window.nsSelectChatTarget487('expert',{auto:true});
   return result;
  };
  const originalSend=sendMessage;
  sendMessage=function(message){
   const raw=String(message||'').trim(),role=sim?.__atriaRecipient487;
   if(!raw||!role||!names[role]||!C||!sim||sim.caseEnded||raw.startsWith('/'))
    return originalSend.apply(this,arguments);
   // Multiplayer authorization/clinical owner relays have their own native
   // validation. Never execute directly on a guest read-only mirror or rival.
   const room=window.csV41Challenge;
   if(room?.active){
    const owned=room.patients?.find(p=>p.uid===sim.patientInstance?.uid);
    const mayAct=room.active&&!room.ended&&owned?.ownerId===room.selfId&&
     owned?.state==='in_care'&&!sim.__csRemoteMirror487&&!sim.__csRoomSpectator;
    // This is the SAME owner of the native clinical state. Cooperative
    // visitors and competitive rivals still use the room authorization path.
    if(!mayAct){pendingAddress=role;return originalSend.apply(this,arguments);}
   }
   if(window.nsMayExamine?.()===false)return originalSend.apply(this,arguments);
   if(role==='expert'&&!sim.mentor?.enabled&&!sim.nsVegaCalled){
    addGlobalChat('system','Dr. Vega todavía no está disponible. Llamalo primero.');refreshChatDock();return false;
   }
   player.bubble=raw;player.bubbleUntil=performance.now()+2400;
   addGlobalChat('doctor','A '+names[role]+': '+raw);
   if(role==='expert')mentorUserMessage(raw);
   else if(role==='patient')deliverPatientSpeech(raw,true);
   else nurseNatural(raw);
   refreshChatDock();return true;
  };
 })();
 </script>`;
 return once(s,'</body>',script+'</body>','recipient-after-existing-nursing-and-multiplayer');
}
