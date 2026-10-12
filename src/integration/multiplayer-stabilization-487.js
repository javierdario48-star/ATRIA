/**
 * Source-anchored QA-only fixes; no pharmacology/case changes.
 * Each replacement refuses to apply if historical source changes.
 */
const replaceOnce=(s,from,to,name)=>{
 const i=s.indexOf(from);
 if(i<0||s.indexOf(from,i+from.length)>=0)throw Error('multiplayer QA anchor changed: '+name);
 return s.slice(0,i)+to+s.slice(i+from.length);
};
export function applyMultiplayerStabilization487(html){
 let s=html;
 // Guest's clinical dock can be built BEFORE late lobby deactivation.
 s=replaceOnce(s,
 "if(dock){dock.classList.remove('nsLobbyChat');dock.innerHTML='';dock.classList.remove('show');}",
 "if(dock){dock.classList.remove('nsLobbyChat');if(C||sim){dock.classList.add('show');dock.setAttribute('aria-hidden','false');refreshChatDock?.()}else{dock.innerHTML='';dock.classList.remove('show')}}",
 'guest-clinical-dock-not-destroyed');
 s=replaceOnce(s,
 "function enter(){if(state.active||state.clinicalTransition||C||sim)return;",
 "function enter(){if(state.active||state.clinicalTransition||C||sim)return;state.groupPlan=null;state.guardDraft=null;state.partyHandshake=null;state.startPromise=null;",
 'fresh-lobby-session-reset');
 s=replaceOnce(s,
 "const oldReturn=csReturnToCases;csReturnToCases=function(){const r=oldReturn.apply(this,arguments);setTimeout(()=>enter(),0);return r};",
 "const oldReturn=csReturnToCases;csReturnToCases=function(){const r=oldReturn.apply(this,arguments);state.groupPlan=null;state.guardDraft=null;state.partyHandshake=null;state.startPromise=null;window.nsSocial?.leave?.(true)?.catch?.(()=>{});setTimeout(()=>enter(),0);return r};",
 'return-to-lobby-closes-old-party');
 s=replaceOnce(s,
 "const data=await api('rooms/'+r.id+'/messages?after='+cursor);lastOK=Date.now();room=data.room;",
 "const data=await api('rooms/'+r.id+'/messages?after='+cursor);if(closed||!room||room.id!==r.id)return;lastOK=Date.now();room=data.room;",
 'discard-closed-transport-late-response');
 s=replaceOnce(s,
 "}catch(e){csCoop.connected=Date.now()-lastOK<8000&&opened;status='Reconectando con el grupo…';render()}finally{polling=false;if(!closed)timer=setTimeout(poll,150)}",
 "}catch(e){if((e.status===404||e.status===410)&&!closed&&room?.id===r.id){dc.close();transport=null;room=null;csCoopDisconnect(false);csCoop.remotes={};window.csV41ResetChallenge?.();window.nsLobbyClearExpiredGroup487?.(r.id);status='La guardia anterior terminó. Podés crear un grupo nuevo.';render();return}csCoop.connected=Date.now()-lastOK<8000&&opened;status='Reconectando con el grupo…';render()}finally{polling=false;if(!closed)timer=setTimeout(poll,150)}",
 'closed-or-expired-party-clears-local-state');
 s=replaceOnce(s,
 "window.nsLobby.enter=enter;window.nsLobby.renderHud=renderHud;window.nsLobby.renderChat=renderChat;window.nsLobby.openGuardia=openGuardia;",
 "window.nsLobbyClearExpiredGroup487=(roomId)=>{if(state.groupPlan?.roomId!==roomId)return;state.groupPlan=null;state.guardDraft=null;state.partyHandshake=null;state.startPromise=null;closeGuard();renderHud()};window.nsLobby.enter=enter;window.nsLobby.renderHud=renderHud;window.nsLobby.renderChat=renderChat;window.nsLobby.openGuardia=openGuardia;",
 'lobby-disconnect-previous-plan');
 s=replaceOnce(s,
 "sendMessage=function(q){if(shared()){if(roomCommand(q))return;if(!requirePatient())return}return oldSend.apply(this,arguments)};",
 "sendMessage=function(q){\n  if(shared()){\n   if(roomCommand(q))return;\n   const msg=String(q||'').trim(),team=msg.match(/^\\/(?:equipo|chat)\\s+([\\s\\S]+)/i);\n   if(team||!canAct()){\n    const text=String(team?team[1]:msg).trim().slice(0,180);\n    if(!text||!challenge.active||challenge.ended)return false;\n    send('team_chat',{text,messageId:selfId+':'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2,7)});\n    addGlobalChat('system','Tú · equipo: '+text);player.bubble=text;player.bubbleUntil=performance.now()+2800;\n    refreshChatDock();return true;\n   }\n  }\n  return oldSend.apply(this,arguments)\n };",
 'unassigned-guest-can-write-team-chat');
 s=replaceOnce(s,
 "if(m.id!==challenge.id)return;if(host()){",
 "if(m.id!==challenge.id)return;\n  if(m.kind==='team_chat'){\n   if(!challenge.active||challenge.ended||typeof m.text!=='string'||m.text.length>180||!person(m.peerId)||m.peerId===selfId)return;\n   const marker=String(m.messageId||'').slice(0,90);\n   if(!marker||!marker.startsWith(m.peerId+':'))return;\n   const seen=challenge._teamMessages||(challenge._teamMessages=new Set());\n   if(seen.has(marker))return;seen.add(marker);if(seen.size>160)seen.delete(seen.values().next().value);\n   addGlobalChat('system',(person(m.peerId)?.name||'Compañero')+' · equipo: '+m.text.replace(/[<>]/g,''));\n   refreshChatDock();return;\n  }\n  if(host()){",
 'room-messages-are-distinct-from-clinical-orders');

 // The cooperative helper executes on the native patient's OWNER; the
 // competitive opponent retains read-only access.
 s=replaceOnce(s,
 "function assistActionAllowed(p,a){const c=CASES.find(x=>x.id===p?.caseId);if(!c||!a||typeof a.kind!=='string')return false;",
 "function assistActionAllowed(p,a){const c=CASES.find(x=>x.id===p?.caseId);if(challenge.mode==='competitive')return false;if(!c||!a||typeof a.kind!=='string')return false;if(a.kind==='exam')return ['general','abdomen','target'].includes(a.id);if(a.kind==='speech')return typeof a.text==='string'&&a.text.trim().length>0&&a.text.length<=180;if(a.kind==='therapy')return typeof a.text==='string'&&a.text.length<=180&&!!findMonitorTherapy(a.text);",
 'cooperative-exam-anamnesis-therapy-validated');
 s=replaceOnce(s,
 "else if(a.kind==='intervention'){const it=c.interventions.find(x=>x.id===a.id);if(it)orderIntervention(it)}};",
 "else if(a.kind==='intervention'){const it=c.interventions.find(x=>x.id===a.id);if(it)orderIntervention(it)}else if(a.kind==='exam'){performExamRegion(a.id)}else if(a.kind==='speech'){sim.chats.patient.push(['doctor',a.text]);const answer=patientReply(a.text);sim.chats.patient.push(['patient',answer]);addGlobalChat('patient',answer)}else if(a.kind==='therapy'){addMonitorTherapy(a.text)}};",
 'cooperative-owner-executes-authorized-actions-once');
 s=replaceOnce(s,
 "m.classList.add('show');m.querySelector('[data-assist-close]')",
 "if(challenge.mode==='coop'){const actions=document.createElement('section');actions.className='csRuleBox';actions.innerHTML='<b>Colaboración clínica</b><p>Anamnesis, examen y fármacos ejecutados sobre el paciente del responsable.</p><div><input id=\"csAssistQuestion487\" maxlength=\"180\" placeholder=\"Preguntarle al paciente…\"><button type=\"button\" data-cs-ask>Preguntar</button></div><div><button type=\"button\" data-cs-exam=\"general\">General</button><button type=\"button\" data-cs-exam=\"abdomen\">Abdomen</button><button type=\"button\" data-cs-exam=\"target\">Dirigido</button></div><div><input id=\"csAssistTherapy487\" maxlength=\"180\" placeholder=\"Tratamiento del monitor…\"><button type=\"button\" data-cs-therapy>Indicar</button></div>';m.querySelector('.csPanel')?.appendChild(actions);actions.querySelector('[data-cs-ask]').onclick=()=>{const el=actions.querySelector('#csAssistQuestion487');if(requestAssist(index,{kind:'speech',text:el.value.trim()}))el.value=''};actions.querySelectorAll('[data-cs-exam]').forEach(b=>b.onclick=()=>requestAssist(index,{kind:'exam',id:b.dataset.csExam}));actions.querySelector('[data-cs-therapy]').onclick=()=>{const el=actions.querySelector('#csAssistTherapy487');if(requestAssist(index,{kind:'therapy',text:el.value.trim()}))el.value=''}}m.classList.add('show');m.querySelector('[data-assist-close]')",
 'cooperative-helper-panel-exam-anamnesis-therapy');
 s=replaceOnce(s,
 "if(team||!canAct()){\n    const text=String(team?team[1]:msg).trim().slice(0,180);",
 "if(team||!canAct()){\n    if(!team&&challenge.mode==='coop'&&challenge.assistIndex!=null){const p=challenge.patients[challenge.assistIndex];if(p?.ownerId&&p.ownerId!==selfId&&p.state==='in_care'&&near(p))return requestAssist(p.index,{kind:'speech',text:msg.slice(0,180)})}\n    const text=String(team?team[1]:msg).trim().slice(0,180);",
 'helper-free-text-is-patient-question-when-patient-selected');


 // Room message payloads include a claimed peerId; only the server envelope
 // identifies the authenticated user. Do not trust a peerId chosen by a
 // competing browser to send forged claims, orders, progress or team chat.
 s=replaceOnce(s,
 "for(const m of data.messages){const packet=m.data;if(packet?.type==='atria_party_prepare'",
 "for(const m of data.messages){const packet=m.data;if(packet?.type==='cs_room_v411'){const member=room.members?.find(x=>x.userId===m.userId);if(!member||packet.peerId!==member.peerId)continue}if(packet?.type==='atria_party_prepare'",
 'room-peer-identity-bound-to-server-envelope');
 s=replaceOnce(s,'</head>',
 '<style id="atria-multiplayer-overlay-lifecycle-487">body.nsLobbyMode #csDxBadge487,body.nsLobbyMode #csDxDialog487,body.nsLobbyMode #csActionsModal,body.nsLobbyMode #csReceptionBoard,body.nsLobbyMode #csShiftBoard,body.nsLobbyMode #csAssistModal,body.nsLobbyMode #csObserverModal,body.nsLobbyMode #csChallengeHud{display:none!important;pointer-events:none!important}</style></head>',
 'hide-guard-only-overlays-in-lobby');
 return s;
}
