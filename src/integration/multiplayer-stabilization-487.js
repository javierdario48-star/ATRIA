/**
 * Source-anchored QA-only fixes; no pharmacology/case changes.
 * Each replacement refuses to apply if historical source changes.
 */
const replaceOnce=(s,from,to,name)=>{
 const i=s.indexOf(from);
 if(i<0||s.indexOf(from,i+from.length)>=0)throw Error('multiplayer QA anchor changed: '+name);
 return s.slice(0,i)+to+s.slice(i+from.length);
};
export function applyMultiplayerStabilization487(html,{reverse=false}={}){
 let s=html;
 const undo=[];
 const edit=(text,from,to,label)=>{undo.push({from,to,label});return reverse?text:replaceOnce(text,from,to,label)};
 // Guest's clinical dock can be built BEFORE late lobby deactivation.
 s=edit(s,
 "if(dock){dock.classList.remove('nsLobbyChat');dock.innerHTML='';dock.classList.remove('show');}",
 "if(dock){dock.classList.remove('nsLobbyChat');if(C||sim){dock.classList.add('show');dock.setAttribute('aria-hidden','false');refreshChatDock?.()}else{dock.innerHTML='';dock.classList.remove('show')}}",
 'guest-clinical-dock-not-destroyed');
 s=edit(s,
 "function enter(){if(state.active||state.clinicalTransition||C||sim)return;",
 "function enter(){if(state.active||state.clinicalTransition||C||sim)return;state.groupPlan=null;state.guardDraft=null;state.partyHandshake=null;state.startPromise=null;",
 'fresh-lobby-session-reset');
 s=edit(s,
 "const oldReturn=csReturnToCases;csReturnToCases=function(){const r=oldReturn.apply(this,arguments);setTimeout(()=>enter(),0);return r};",
 "const oldReturn=csReturnToCases;csReturnToCases=function(){const r=oldReturn.apply(this,arguments);state.groupPlan=null;state.guardDraft=null;state.partyHandshake=null;state.startPromise=null;window.nsSocial?.leave?.(true)?.catch?.(()=>{});setTimeout(()=>enter(),0);return r};",
 'return-to-lobby-closes-old-party');
 s=edit(s,
 "const data=await api('rooms/'+r.id+'/messages?after='+cursor);lastOK=Date.now();room=data.room;",
 "const data=await api('rooms/'+r.id+'/messages?after='+cursor);if(closed||!room||room.id!==r.id)return;lastOK=Date.now();room=data.room;",
 'discard-closed-transport-late-response');
 s=edit(s,
 "}catch(e){csCoop.connected=Date.now()-lastOK<8000&&opened;status='Reconectando con el grupo…';render()}finally{polling=false;if(!closed)timer=setTimeout(poll,150)}",
 "}catch(e){if((e.status===404||e.status===410)&&!closed&&room?.id===r.id){dc.close();transport=null;room=null;csCoopDisconnect(false);csCoop.remotes={};window.csV41ResetChallenge?.();window.nsLobbyClearExpiredGroup487?.(r.id);status='La guardia anterior terminó. Podés crear un grupo nuevo.';render();return}csCoop.connected=Date.now()-lastOK<8000&&opened;status='Reconectando con el grupo…';render()}finally{polling=false;if(!closed)timer=setTimeout(poll,150)}",
 'closed-or-expired-party-clears-local-state');
 s=edit(s,
 "window.nsLobby.enter=enter;window.nsLobby.renderHud=renderHud;window.nsLobby.renderChat=renderChat;window.nsLobby.openGuardia=openGuardia;",
 "window.nsLobbyClearExpiredGroup487=(roomId)=>{if(state.groupPlan?.roomId!==roomId)return;state.groupPlan=null;state.guardDraft=null;state.partyHandshake=null;state.startPromise=null;closeGuard();renderHud()};window.nsLobby.enter=enter;window.nsLobby.renderHud=renderHud;window.nsLobby.renderChat=renderChat;window.nsLobby.openGuardia=openGuardia;",
 'lobby-disconnect-previous-plan');
 s=edit(s,
 "sendMessage=function(q){if(shared()){if(roomCommand(q))return;if(!requirePatient())return}return oldSend.apply(this,arguments)};",
 "sendMessage=function(q){\n  if(shared()){\n   if(roomCommand(q))return;\n   const msg=String(q||'').trim(),team=msg.match(/^\\/(?:equipo|chat)\\s+([\\s\\S]+)/i);\n   if(team||!canAct()){\n    const text=String(team?team[1]:msg).trim().slice(0,180);\n    if(!text||!challenge.active||challenge.ended)return false;\n    send('team_chat',{text,messageId:selfId+':'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2,7)});\n    addGlobalChat('system','Tú · equipo: '+text);player.bubble=text;player.bubbleUntil=performance.now()+2800;\n    refreshChatDock();return true;\n   }\n  }\n  return oldSend.apply(this,arguments)\n };",
 'unassigned-guest-can-write-team-chat');
 s=edit(s,
 "if(m.id!==challenge.id)return;if(host()){",
 "if(m.id!==challenge.id)return;\n  if(m.kind==='team_chat'){\n   if(!challenge.active||challenge.ended||typeof m.text!=='string'||m.text.length>180||!person(m.peerId)||m.peerId===selfId)return;\n   const marker=String(m.messageId||'').slice(0,90);\n   if(!marker||!marker.startsWith(m.peerId+':'))return;\n   const seen=challenge._teamMessages||(challenge._teamMessages=new Set());\n   if(seen.has(marker))return;seen.add(marker);if(seen.size>160)seen.delete(seen.values().next().value);\n   addGlobalChat('system',(person(m.peerId)?.name||'Compañero')+' · equipo: '+m.text.replace(/[<>]/g,''));\n   refreshChatDock();return;\n  }\n  if(host()){",
 'room-messages-are-distinct-from-clinical-orders');

 // The cooperative helper executes on the native patient's OWNER; the
 // competitive opponent retains read-only access.
 s=edit(s,
 "function assistActionAllowed(p,a){const c=CASES.find(x=>x.id===p?.caseId);if(!c||!a||typeof a.kind!=='string')return false;",
 "function assistActionAllowed(p,a){const c=CASES.find(x=>x.id===p?.caseId);if(!c||!a||typeof a.kind!=='string')return false;if(challenge.mode==='competitive'&&['therapy','study','intervention'].includes(a.kind))return false;if(a.kind==='exam')return ['general','abdomen','target'].includes(a.id);if(a.kind==='speech')return typeof a.text==='string'&&a.text.trim().length>0&&a.text.length<=180;if(a.kind==='therapy')return typeof a.text==='string'&&a.text.length<=180&&!!findMonitorTherapy(a.text);",
 'cooperative-exam-anamnesis-therapy-validated');
 s=edit(s,
 "else if(a.kind==='intervention'){const it=c.interventions.find(x=>x.id===a.id);if(it)orderIntervention(it)}};",
 "else if(a.kind==='intervention'){const it=c.interventions.find(x=>x.id===a.id);if(it)orderIntervention(it)}else if(a.kind==='exam'){performExamRegion(a.id)}else if(a.kind==='speech'){sim.chats.patient.push(['doctor',a.text]);const answer=patientReply(a.text);sim.chats.patient.push(['patient',answer]);addGlobalChat('patient',answer)}else if(a.kind==='therapy'){addMonitorTherapy(a.text)}};",
 'cooperative-owner-executes-authorized-actions-once');
 s=edit(s,
 "m.classList.add('show');m.querySelector('[data-assist-close]')",
 "if(challenge.mode==='competitive'){const panel=document.createElement('section');panel.className='csRuleBox';panel.innerHTML='<b>Consulta del paciente rival</b><p>Podés conversar, examinar y consultar su monitor. Medicamentos y estudios: solo el responsable.</p><button type=\"button\" data-cs-observe>Ver historia, monitor y resultados</button><div><input maxlength=\"180\" data-cs-question placeholder=\"Preguntarle al paciente…\"><button type=\"button\" data-cs-ask>Preguntar</button></div><div><button type=\"button\" data-cs-exam=\"general\">Inspección general</button><button type=\"button\" data-cs-exam=\"abdomen\">Examen abdominal</button><button type=\"button\" data-cs-exam=\"target\">Examen dirigido</button></div>';m.querySelector('.csPanel')?.appendChild(panel);panel.querySelector('[data-cs-observe]').onclick=()=>window.csObservePatientV487?.(index);panel.querySelector('[data-cs-ask]').onclick=()=>{const el=panel.querySelector('[data-cs-question]');if(requestAssist(index,{kind:'speech',text:el.value.trim()}))el.value=''};panel.querySelectorAll('[data-cs-exam]').forEach(b=>b.onclick=()=>requestAssist(index,{kind:'exam',id:b.dataset.csExam}));}if(challenge.mode==='coop'){const actions=document.createElement('section');actions.className='csRuleBox';actions.innerHTML='<b>Colaboración clínica</b><p>Anamnesis, examen y fármacos ejecutados sobre el paciente del responsable.</p><div><input id=\"csAssistQuestion487\" maxlength=\"180\" placeholder=\"Preguntarle al paciente…\"><button type=\"button\" data-cs-ask>Preguntar</button></div><div><button type=\"button\" data-cs-exam=\"general\">General</button><button type=\"button\" data-cs-exam=\"abdomen\">Abdomen</button><button type=\"button\" data-cs-exam=\"target\">Dirigido</button></div><div><input id=\"csAssistTherapy487\" maxlength=\"180\" placeholder=\"Tratamiento del monitor…\"><button type=\"button\" data-cs-therapy>Indicar</button></div>';m.querySelector('.csPanel')?.appendChild(actions);actions.querySelector('[data-cs-ask]').onclick=()=>{const el=actions.querySelector('#csAssistQuestion487');if(requestAssist(index,{kind:'speech',text:el.value.trim()}))el.value=''};actions.querySelectorAll('[data-cs-exam]').forEach(b=>b.onclick=()=>requestAssist(index,{kind:'exam',id:b.dataset.csExam}));actions.querySelector('[data-cs-therapy]').onclick=()=>{const el=actions.querySelector('#csAssistTherapy487');if(requestAssist(index,{kind:'therapy',text:el.value.trim()}))el.value=''}}m.classList.add('show');m.querySelector('[data-assist-close]')",
 'cooperative-helper-panel-exam-anamnesis-therapy');
 s=edit(s,
 "if(team||!canAct()){\n    const text=String(team?team[1]:msg).trim().slice(0,180);",
 "if(team||!canAct()){\n    if(!team&&challenge.mode==='coop'&&challenge.assistIndex!=null){const p=challenge.patients[challenge.assistIndex];if(p?.ownerId&&p.ownerId!==selfId&&p.state==='in_care'&&near(p))return requestAssist(p.index,{kind:'speech',text:msg.slice(0,180)})}\n    const text=String(team?team[1]:msg).trim().slice(0,180);",
 'helper-free-text-is-patient-question-when-patient-selected');



 // The shared patient has one clinical authority but EVERY cooperative peer
 // gets the real V40 solo UI. A visiting client holds a read-only mirror:
 // native mutations are relayed to the patient's clinical owner.
 s=edit(s,
 "function takePatient(index,monitor=false){",
 "function foreignClinical487(){const p=challenge.patients[shiftSession?.index];return shared()&&p&&p.ownerId&&p.ownerId!==selfId&&p.state==='in_care'&&sim?.patientInstance?.uid===p.uid?p:null}\n function loadSharedPatient487(index,monitor=false){const p=challenge.patients[index],r=shiftSession?.records?.[index];if(!guard()||!p||!r||!p.ownerId||p.state!=='in_care'||!near(p))return false;if(r.sim&&!r.sim.patientInstance)r.sim=null;loading=true;try{const ok=base.load.call(this,index,{keepPosition:true,openMonitor:monitor});if(!ok)return false;sim.patientInstance.uid=p.uid;sim.__csRoomSpectator=false;sim.__csRemoteMirror487=true;sim.mentor.enabled=false;sim.playMode=challenge.mode;challenge.assistIndex=index;modeLabel();refreshChatDock();return true}finally{loading=false}}\n function takePatient(index,monitor=false){",
 'native-solo-UI-for-cooperative-visitors');
 s=edit(s,
 "return challenge.mode==='competitive'?csOpenObserver(index):openAssistPanel(index)}if(!near(p))",
 "return challenge.mode==='competitive'?csOpenObserver(index):loadSharedPatient487(index,monitor)}if(!near(p))",
 'coop-visitors-select-patient-not-limited-helper-modal');
 s=edit(s,
 "n.assist?openAssistPanel(n.index):takePatient(n.index,n.monitor)",
 "n.assist&&challenge.mode==='competitive'?openAssistPanel(n.index):takePatient(n.index,n.monitor)",
 'coop-visitor-auto-navigate-to-real-ui');
 s=edit(s,
 "function canAct(){if(buildingPlan||loading||!shared())return true;if(!guard()||!sim||sim.caseEnded||sim.__csRoomSpectator)return false;const p=challenge.patients.find(p=>p.uid===sim.patientInstance?.uid);return !!p&&p.ownerId===selfId&&p.state==='in_care'}",
 "function canAct(){if(buildingPlan||loading||!shared())return true;if(!guard()||!sim||sim.caseEnded||sim.__csRoomSpectator)return false;const p=challenge.patients.find(p=>p.uid===sim.patientInstance?.uid);return !!p&&p.state==='in_care'&&(p.ownerId===selfId||challenge.mode==='coop'&&!!sim.__csRemoteMirror487)}",
 'coop-visitor-real-clinical-panels');
 s=edit(s,
 "function ownsCurrent(){const p=currentPatient();return !!(p&&p.ownerId===selfId&&p.state!=='done'&&sim&&!sim.__csRoomSpectator)}",
 "function ownsCurrent(){const p=currentPatient();return !!(p&&p.state!=='done'&&sim&&!sim.__csRoomSpectator&&(p.ownerId===selfId||challenge.mode==='coop'&&!!sim.__csRemoteMirror487))}",
 'coop-visitor-clinical-patient-target');
 // In spectator mode the mirrored patient's vitals must NOT be advanced a
 // second time; only the clinical owner's native engine updates physiology.
 s=edit(s,
 "const r=base.update.call(this,dt);syncHost();checkNavigation();publishProgress();",
 "const r=sim?.__csRemoteMirror487?undefined:base.update.call(this,dt);syncHost();checkNavigation();publishProgress();",
 'no-second-physiology-engine-on-visitor');
 // No simulated clinical action from the visiting client is ever authoritative.
 // Route to existing assist relay; owner executes existing native functions.
 s=edit(s,
 "function assistActionAllowed(p,a){const c=CASES.find(x=>x.id===p?.caseId);",
 "function assistActionAllowed(p,a){const c=CASES.find(x=>x.id===p?.caseId);",
 'assist-permission-marker'); // a deliberate source anchor for next permission patch
 s=edit(s,
 "if(a.kind==='therapy')return typeof a.text==='string'&&a.text.length<=180&&!!findMonitorTherapy(a.text);",
 "if(a.kind==='therapy')return typeof a.text==='string'&&a.text.length<=180&&!!findMonitorTherapy(a.text);if(a.kind==='command')return challenge.mode==='coop'&&typeof a.text==='string'&&a.text.trim().length>0&&a.text.length<=220;if(a.kind==='clinical_call')return challenge.mode==='coop'&&['csSetDiagnosticImpression','csSetDisposition','csRequestConsult','captureMonitorVitals'].includes(a.method)&&Array.isArray(a.args)&&a.args.length<=3&&a.args.every(v=>typeof v==='string'||typeof v==='number')&&JSON.stringify(a).length<500;",
 'safe-native-clinical-command-relay');
 s=edit(s,
 "else if(a.kind==='therapy'){addMonitorTherapy(a.text)}};",
 "else if(a.kind==='therapy'){addMonitorTherapy(a.text)}else if(a.kind==='command'){sendMessage(a.text)}else if(a.kind==='clinical_call'){window[a.method]?.(...a.args)}};",
 'owner-executes-visiting-coop-command-on-original-engine');
 s=edit(s,
 "sendMessage=function(q){\n  if(shared()){",
 "sendMessage=function(q){\n  if(shared()){const remote=foreignClinical487();if(challenge.mode==='coop'&&remote){const text=String(q||'').trim();if(!text)return false;if(!/^\\/(?:equipo|chat)\\s+/i.test(text))return requestAssist(remote.index,{kind:'command',text:text.slice(0,220)});}",
 'coop-visitor-all-native-text-orders-forward-to-owner');
 s=edit(s,
 "processCommand=function(q){if(shared()){if(roomCommand(q))return;if(!requirePatient())return}return oldCommand.apply(this,arguments)};",
 "processCommand=function(q){if(shared()){if(roomCommand(q))return;if(challenge.mode==='coop'&&foreignClinical487())return requestAssist(foreignClinical487().index,{kind:'command',text:String(q||'').slice(0,220)});if(!requirePatient())return}return oldCommand.apply(this,arguments)};",
 'coop-visitor-command-palette-to-authoritative-owner');
 // Window APIs used by native monitor, physical exam, study and disposition
 // buttons are guarded at their original V41 interception point.
 s=edit(s,
 "if(!requirePatient())return false;return fn.apply(this,arguments)}",
 "const foreign=foreignClinical487();if(foreign&&challenge.mode==='coop'){const a=key==='orderStudy'?{kind:'study',id:arguments[0]?.id}:key==='orderIntervention'?{kind:'intervention',id:arguments[0]?.id}:key==='addMonitorTherapy'?{kind:'therapy',text:String(arguments[0]||'')}:key==='performExamRegion'?{kind:'exam',id:String(arguments[0]||'')}:key==='csQueueIV'?{kind:'iv',count:arguments[0]}:key==='csQueueMonitor'?{kind:'monitor'}:key==='queueNurse'?{kind:'command',text:String(arguments[0]?.label||'enfermera signos vitales')}:['csSetDiagnosticImpression','csSetDisposition','csRequestConsult','captureMonitorVitals'].includes(key)?{kind:'clinical_call',method:key,args:Array.from(arguments).filter(x=>typeof x==='string'||typeof x==='number').slice(0,3)}:null;if(a){if(!assistActionAllowed(foreign,a))return false;return requestAssist(foreign.index,a)}if(key==='csOpenOrderComposerV203')return fn.apply(this,arguments);return false}if(!requirePatient())return false;return fn.apply(this,arguments)}",
 'native-button-clinical-actions-routed-without-local-dose');
 // Mirror owners' certified monitor, lab and therapy readouts. Never treat
 // these as a second authoritative physiological engine.
 s=edit(s,
 "const v=clone(s.liveVitals||r.vitals),progress={monitorConnected:!!s.monitorConnected,venousAccessCount:Math.max(0,Math.min(2,Number(s.venousAccessCount)||0)),careEvidence:window.nsCareEvidence?.(s,p.caseId)||null,observation:csObservationSnapshot(s,p)};",
 "const v=clone(s.liveVitals||r.vitals),view={history:Array.isArray(s.intentHistory)?s.intentHistory.slice(-48):[],chats:Array.isArray(s.chats?.patient)?s.chats.patient.slice(-60):[],orders:s.orders instanceof Map?[...s.orders].slice(0,40).map(([id,o])=>[id,{status:o?.status,label:o?.label,result:o?.result,readyAt:o?.readyAt}]):[],interventions:s.interventions instanceof Set?[...s.interventions].slice(0,45):[],therapies:s.monitorTherapies instanceof Map?[...s.monitorTherapies].slice(0,30):[],administrations:Array.isArray(s.administrationLog)?s.administrationLog.slice(-60):[],diagnosis:String(s.diagnosis||'').slice(0,300)};const progress={monitorConnected:!!s.monitorConnected,venousAccessCount:Math.max(0,Math.min(2,Number(s.venousAccessCount)||0)),careEvidence:window.nsCareEvidence?.(s,p.caseId)||null,observation:csObservationSnapshot(s,p),sharedView:challenge.mode==='coop'?view:null};",
 'patient-owner-clinical-readouts-available-to-coop');
 s=edit(s,
 "p.progress={monitorConnected:!!m.progress?.monitorConnected,venousAccessCount:Math.max(0,Math.min(2,Number(m.progress?.venousAccessCount)||0)),careEvidence:care,observation};",
 "p.progress={monitorConnected:!!m.progress?.monitorConnected,venousAccessCount:Math.max(0,Math.min(2,Number(m.progress?.venousAccessCount)||0)),careEvidence:care,observation,sharedView:challenge.mode==='coop'&&m.progress?.sharedView&&JSON.stringify(m.progress.sharedView).length<25000?m.progress.sharedView:null};",
 'host-forwards-small-certified-owner-coop-readouts');
 s=edit(s,
 "if(r.remoteOwned&&p.progress)r.sim={...(r.sim||{}),...clone(p.progress),caseEnded:p.state==='done'};",
 "if(r.remoteOwned&&p.progress){if(!r.sim?.patientInstance)r.sim=null;else{r.sim.monitorConnected=!!p.progress.monitorConnected;r.sim.venousAccessCount=p.progress.venousAccessCount||0;if(p.vitals&&r.sim.liveVitals)Object.assign(r.sim.liveVitals,p.vitals);const v=p.progress.sharedView;if(challenge.mode==='coop'&&v){if(Array.isArray(v.history))r.sim.intentHistory=clone(v.history);if(Array.isArray(v.chats)&&r.sim.chats)r.sim.chats.patient=clone(v.chats);if(Array.isArray(v.orders))r.sim.orders=new Map(v.orders);if(Array.isArray(v.interventions))r.sim.interventions=new Set(v.interventions);if(Array.isArray(v.therapies))r.sim.monitorTherapies=new Map(v.therapies);if(Array.isArray(v.administrations))r.sim.administrationLog=clone(v.administrations);if(typeof v.diagnosis==='string')r.sim.diagnosis=v.diagnosis}}}",
 'coop-clinical-mirror-updates-non-authoritative-ui');


 s=edit(s,
 "function requestAssist(index,a){if(challenge.mode==='competitive')return false;",
 "function requestAssist(index,a){if(challenge.mode==='competitive'&&!['exam','speech','vitals','monitor'].includes(a?.kind))return false;",
 'competitive-safe-bedside-request');
 s=edit(s,
 "function applyAssistAction(p,a,helper){if(challenge.mode==='competitive')return false;",
 "function applyAssistAction(p,a,helper){if(challenge.mode==='competitive'&&!['exam','speech','vitals','monitor'].includes(a?.kind))return false;",
 'competitive-owner-executes-only-benign-guest-actions');
 s=edit(s,
 "}else if(m.kind==='assist'&&challenge.mode!=='competitive'){",
 "}else if(m.kind==='assist'){",
 'competitive-guest-exam-relay-authorized-by-host');
 s=edit(s,
 "if(m.kind==='assist_apply'&&challenge.mode!=='competitive'&&m.peerId===challenge.hostId)",
 "if(m.kind==='assist_apply'&&m.peerId===challenge.hostId)",
 'competitive-exam-forwarded-to-patient-owner');
 s=edit(s,
 "return !!p&&p.ownerId===r.selfId&&p.state==='in_care'&&!sim.caseEnded;",
 "return !!p&&p.state==='in_care'&&!sim.caseEnded&&(p.ownerId===r.selfId||!!sim.__csRemoteMirror487);",
 'cooperative-visitor-native-exam-gate');
 s=edit(s,
 "if(p?.uid===m.uid&&m.targetId===selfId)applyAssistAction(p,m.action,m.helperName);return",
 "if(p?.uid===m.uid&&m.targetId===selfId){const stamp=String(m.aid||'');const ids=challenge._appliedAssist487||(challenge._appliedAssist487=new Set());if(stamp&&stamp.length<=160&&!ids.has(stamp)){ids.add(stamp);if(ids.size>200)ids.delete(ids.values().next().value);applyAssistAction(p,m.action,m.helperName)}}return",
 'deduplicate-remote-clinical-execution');

 // Room message payloads include a claimed peerId; only the server envelope
 // identifies the authenticated user. Do not trust a peerId chosen by a
 // competing browser to send forged claims, orders, progress or team chat.
 s=edit(s,
 "for(const m of data.messages){const packet=m.data;if(packet?.type==='atria_party_prepare'",
 "for(const m of data.messages){const packet=m.data;if(packet?.type==='cs_room_v411'){const member=room.members?.find(x=>x.userId===m.userId);if(!member||packet.peerId!==member.peerId)continue}if(packet?.type==='atria_party_prepare'",
 'room-peer-identity-bound-to-server-envelope');

 // Explicitly retire guard overlays on lobby entry; the CSS guard below
 // prevents late repaint races, not a substitute for lifecycle cleanup.
 s=edit(s,
 "try{closeSheet?.();hideRadial?.();closeFloatCard?.()}catch(_){}spawn();renderChat();",
 "try{closeSheet?.();hideRadial?.();closeFloatCard?.()}catch(_){}document.body.classList.remove('keyboardOpen');for(const id of ['csDxDialog487','csActionsModal','csReceptionBoard','csShiftBoard','csAssistModal','csObserverModal','csChallengeSummary']){const el=document.getElementById(id);el?.classList.remove('show','open');if(el)el.setAttribute('aria-hidden','true')}const badge=document.getElementById('csDxBadge487');if(badge)badge.style.display='none';spawn();renderChat();",
 'lobby-entry-physically-closes-stale-guard-modals');
 s=edit(s,'</head>',
 '<style id="atria-multiplayer-overlay-lifecycle-487">body.nsLobbyMode #csDxBadge487,body.nsLobbyMode #csDxDialog487,body.nsLobbyMode #csActionsModal,body.nsLobbyMode #csReceptionBoard,body.nsLobbyMode #csShiftBoard,body.nsLobbyMode #csAssistModal,body.nsLobbyMode #csObserverModal,body.nsLobbyMode #csChallengeHud{display:none!important;pointer-events:none!important}</style></head>',
 'hide-guard-only-overlays-in-lobby');
 if(reverse)for(const {from,to,label} of undo.reverse())s=replaceOnce(s,to,from,'reverse-'+label);
 return s;
}
