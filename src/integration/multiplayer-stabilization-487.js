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
 s=replaceOnce(s,'</head>',
 '<style id="atria-multiplayer-overlay-lifecycle-487">body.nsLobbyMode #csDxBadge487,body.nsLobbyMode #csDxDialog487,body.nsLobbyMode #csActionsModal,body.nsLobbyMode #csReceptionBoard,body.nsLobbyMode #csShiftBoard,body.nsLobbyMode #csAssistModal,body.nsLobbyMode #csObserverModal,body.nsLobbyMode #csChallengeHud{display:none!important;pointer-events:none!important}</style></head>',
 'hide-guard-only-overlays-in-lobby');
 return s;
}
