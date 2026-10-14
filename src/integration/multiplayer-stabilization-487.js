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
 // Nurse task deduplication is per clinical patient, not per room.
 // Native task ownership is already bound by the V203 queueNurse adapter.
 s=edit(s,
 "if(nurse.task?.kind==='monitor'||nurse.queue.some(t=>t.kind==='monitor'))",
 "if(nurse.task?.kind==='monitor'&&nurse.task._targetSim===sim||nurse.queue.some(t=>t.kind==='monitor'&&t._targetSim===sim))",
 'patient-scoped-monitor-dedupe');
 s=edit(s,
 "const queued=(nurse.task?.kind==='iv_access'?Number(nurse.task.count||1):0)+nurse.queue.filter(t=>t.kind==='iv_access').reduce((a,t)=>a+Number(t.count||1),0);",
 "const queued=(nurse.task?.kind==='iv_access'&&nurse.task._targetSim===sim?Number(nurse.task.count||1):0)+nurse.queue.filter(t=>t.kind==='iv_access'&&t._targetSim===sim).reduce((a,t)=>a+Number(t.count||1),0);",
 'patient-scoped-iv-dedupe');
 // The native late V412 nurse wrapper executes BEFORE the final 4.8.7
 // voice adapter. Visiting mirrors must bypass it as well, otherwise the
 // nurse order gets a delayed local execution instead of the owner relay.
 s=edit(s,
 "const raw=String(text||'').trim();if(!raw||raw.startsWith('/')||!mayTreat()||inferRecipient(raw)!=='nurse')return base.send.apply(this,arguments);",
 "const raw=String(text||'').trim();if(sim?.__csRemoteMirror487||sim?.__csRoomSpectator||!raw||raw.startsWith('/')||!mayTreat()||inferRecipient(raw)!=='nurse')return base.send.apply(this,arguments);",
 'visiting-mirror-skips-late-v412-local-nurse-interceptor');

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
 "if(m.id!==challenge.id)return;\n  if(m.kind==='assist_ack'||m.kind==='assist_apply_ack'){\n   const key=m.kind.slice(0,-4)+':'+m.aid,item=nsReliableChat487.get(key);\n   if(item&&m.targetId===selfId&&m.id===item.roomId&&\n      item.required.includes(m.peerId)&&person(m.peerId)){\n    nsReliableChat487.delete(key);\n    addGlobalChat('system','Orden cooperativa recibida por el responsable; confirmá su ejecución en el historial clínico.');\n    refreshChatDock();\n   }\n   return;\n  }\n  if(m.kind==='team_chat_ack'){\n   const item=nsReliableChat487.get(m.messageId);\n   if(item&&m.targetId===selfId&&m.peerId!==selfId&&person(m.peerId)){\n    item.acks.add(m.peerId);\n    if((item.required.length?item.required:item.acks.size?[m.peerId]:['await-peer']).every(id=>item.acks.has(id)||!person(id))){\n     nsReliableChat487.delete(m.messageId);\n     addGlobalChat('system','Equipo: mensaje recibido.');refreshChatDock();\n    }\n   }\n   return;\n  }\n  if(m.kind==='team_chat'){\n   if(!challenge.active||challenge.ended||typeof m.text!=='string'||m.text.length>180||!person(m.peerId)||m.peerId===selfId)return;\n   const marker=String(m.messageId||'').slice(0,90);\n   if(!marker||!marker.startsWith(m.peerId+':'))return;\n   const seen=challenge._teamMessages||(challenge._teamMessages=new Set());\n   if(typeof send==='function')send('team_chat_ack',{messageId:marker,targetId:m.peerId});\n   if(seen.has(marker))return;seen.add(marker);if(seen.size>160)seen.delete(seen.values().next().value);\n   addGlobalChat('system',(person(m.peerId)?.name||'Compañero')+' · equipo: '+m.text.replace(/[<>]/g,''));\n   refreshChatDock();return;\n  }\n  if(host()){",
 'room-messages-are-distinct-from-clinical-orders');

 s=edit(s,
 "function send(kind,data={}){if(kind==='finish'){const pending=pendingCareers.get(data.uid);if(pending)data={...data,evidence:encodeEvidence(pending.sim,pending.case.id,pending.uid)};}try{if(csCoop?.dc?.readyState==='open')csCoop.dc.send(JSON.stringify({type:'cs_room_v411',kind,id:challenge.id,peerId:selfId,name:name(),...data}))}catch(_){}}",
 "const nsReliableChat487=new Map();let nsChatRetry487=null;\nfunction nsFlushChat487(){\n nsChatRetry487=null;\n const now=Date.now(),dc=csCoop?.dc;\n for(const [id,item] of nsReliableChat487){\n  if(item.roomId!==challenge.id||!challenge.active||challenge.ended){nsReliableChat487.delete(id);continue;}\n  if(now-item.created>30000||item.attempts>=12){\n   nsReliableChat487.delete(id);addGlobalChat('system',(item.kind==='team_chat'?'Mensaje de equipo':'Orden clínica')+' sin confirmar: '+item.preview);refreshChatDock();continue;\n  }\n  if(dc?.readyState!=='open'||now-item.last<1100)continue;\n  try{dc.send(JSON.stringify(item.packet));item.last=now;item.attempts++}catch(_){}\n }\n if(nsReliableChat487.size&&!nsChatRetry487)nsChatRetry487=setTimeout(nsFlushChat487,1200);\n}\nfunction send(kind,data={}){\n if(kind==='finish'){const pending=pendingCareers.get(data.uid);if(pending)data={...data,evidence:encodeEvidence(pending.sim,pending.case.id,pending.uid)};}\n const packet={type:'cs_room_v411',kind,id:challenge.id,peerId:selfId,name:name(),...data};\n const clinical=['assist','assist_apply'].includes(kind)&&typeof data.aid==='string'&&\n  data.aid.startsWith(kind==='assist'?selfId+':':'')&&data.aid.length<=160&&\n  (kind!=='assist_apply'||data.targetId!==selfId);\n if((kind==='team_chat'&&typeof data.messageId==='string'&&data.messageId.startsWith(selfId+':'))||clinical){\n  if(!challenge.active||challenge.ended)return false;\n  if(nsReliableChat487.size>=80){addGlobalChat('system','Envíos pendientes saturados; la orden no fue aceptada.');refreshChatDock();return false;}\n  const key=clinical?kind+':'+data.aid:data.messageId;\n  nsReliableChat487.set(key,{packet,roomId:challenge.id,kind,created:Date.now(),last:0,attempts:0,\n   required:clinical?[kind==='assist'?challenge.hostId:data.targetId]:\n     challenge.players.filter(p=>p.id!==selfId&&p.online!==false).map(p=>p.id),acks:new Set(),\n   preview:String(data.action?.text||data.text||kind).slice(0,100)});\n  nsFlushChat487();return true;\n }\n try{if(csCoop?.dc?.readyState==='open'){csCoop.dc.send(JSON.stringify(packet));return true}}catch(_){}\n return false;\n}",
 'F-reliable-room-chat-outbox-and-receipts');
 // The cooperative helper executes on the native patient's OWNER; the
 // competitive opponent retains read-only access.
 s=edit(s,
 "function assistActionAllowed(p,a){const c=CASES.find(x=>x.id===p?.caseId);if(!c||!a||typeof a.kind!=='string')return false;",
 "function assistActionAllowed(p,a){const c=CASES.find(x=>x.id===p?.caseId);if(!c||!a||typeof a.kind!=='string')return false;if(challenge.mode==='competitive'&&['therapy','study','intervention','iv','monitor','vitals'].includes(a.kind))return false;if(a.kind==='exam')return ['general','abdomen','target','inspection','auscultation','percussion','palpation','ns:inspection','ns:auscultation','ns:percussion','ns:palpation'].includes(a.id);if(a.kind==='speech')return typeof a.text==='string'&&a.text.trim().length>0&&a.text.length<=180;if(a.kind==='therapy')return typeof a.text==='string'&&a.text.length<=180&&!!findMonitorTherapy(a.text);",
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
 "if(team||!canAct()){\n    if(!team&&msg&&challenge.mode==='coop'){const candidates=challenge.patients.filter(p=>p?.instance&&['waiting','in_care'].includes(p.state)&&near(p));if(candidates.length===1){const p=candidates[0];if(p.ownerId&&p.ownerId!==selfId){const accepted=requestAssist(p.index,{kind:'command',text:msg.slice(0,220)});if(accepted){addGlobalChat('doctor',name()+' → '+(p.instance.name||'Paciente')+': '+msg);refreshChatDock()}return accepted;}if(p.ownerId===selfId&&takePatient(p.index))return sendMessage(msg);if(!p.ownerId&&p.state==='waiting'){pendingAutoCommand487=msg;takePatient(p.index);if(canAct()){const q=pendingAutoCommand487;pendingAutoCommand487=null;return sendMessage(q)}return true;}}}if(!team&&challenge.mode==='coop'&&challenge.assistIndex!=null){const p=challenge.patients[challenge.assistIndex];if(p?.ownerId&&p.ownerId!==selfId&&p.state==='in_care'&&near(p))return requestAssist(p.index,{kind:'speech',text:msg.slice(0,180)})}\n    const text=String(team?team[1]:msg).trim().slice(0,180);",
 'helper-free-text-is-patient-question-when-patient-selected');



 // The shared patient has one clinical authority but EVERY cooperative peer
 // gets the real V40 solo UI. A visiting client holds a read-only mirror:
 // native mutations are relayed to the patient's clinical owner.
 s=edit(s,
 "function takePatient(index,monitor=false){",
  "function foreignClinical487(){const p=challenge.patients[shiftSession?.index];return shared()&&p&&p.ownerId&&p.ownerId!==selfId&&p.state==='in_care'&&sim?.patientInstance?.uid===p.uid?p:null}\n function loadSharedPatient487(index,monitor=false){const p=challenge.patients[index],r=shiftSession?.records?.[index];if(!guard()||!p||!r||!p.ownerId||p.state!=='in_care'||!near(p))return false;if(r.sim&&!r.sim.patientInstance)r.sim=null;loading=true;try{const ok=base.load.call(this,index,{keepPosition:true,openMonitor:monitor});if(!ok)return false;sim.patientInstance.uid=p.uid;sim.__csRoomSpectator=false;sim.__csRemoteMirror487=true;sim.mentor.enabled=false;sim.playMode=challenge.mode;challenge.assistIndex=index;modeLabel();refreshChatDock();return true}finally{loading=false}}\n\n function foreignRivalInput487(input){\n  if(challenge.mode!=='competitive'||!shared()||canAct()||challenge.assistIndex==null)return null;\n  const p=challenge.patients[challenge.assistIndex];\n  if(!p||!p.ownerId||p.ownerId===selfId||p.state!=='in_care'||!near(p))return null;\n  const txt=String(input||'').trim();\n  if(!txt||/^\\/(?:equipo|chat)\\s+/i.test(txt))return null;\n  const low=txt.toLowerCase(),nurse=/^(?:\\/)?(?:enfermera|enfermero|enfermeria|orden|estudio|tratamiento)\\b/i.test(low);\n  const monitor=/\\bmonitor(?:izar|izacion)?\\b/i.test(low),vitals=/(?:signos vitales|constantes vitales|tomar signos|control de signos)/i.test(low);\n  const physical=/^(?:\\/)?(?:examen|examinar|explorar|palpar|auscultar|inspeccionar|percutir)\\b/i.test(low);\n  const blocked=/(?:\\b(?:ceftriaxona|metronidazol|ringer|noradrenalina|analgesia|antibiotico|medicamento|farmaco|administrar|inyectar|infundir|hemograma|laboratorio|analisis|ecografia|tomografia|radiografia|estudio|cultivo|gasometria)\\b|\\/estudio|\\/tratamiento)/i.test(low);\n  if(nurse){\n   let did=false;\n   if(monitor){window.csObservePatientV487?.(p.index);did=true}\n   if(vitals){window.csObservePatientV487?.(p.index);did=true}\n   if(blocked||!did)toast('Paciente rival: no podés indicar medicamentos ni nuevos estudios.');\n   return true;\n  }\n  if(physical){\n   const id=/auscult/i.test(low)?'ns:auscultation':/palp/i.test(low)?'ns:palpation':/perc/i.test(low)?'ns:percussion':'ns:inspection';\n   requestAssist(p.index,{kind:'exam',id});return true;\n  }\n  if(blocked){toast('Paciente rival: medicamentos y nuevos estudios solo para su responsable.');return true}\n  if(/^(?:paciente|doctor)\\b/i.test(low)||/[?¿]/.test(txt)||window.nsIsClinicalQuestion?.(txt)){\n   requestAssist(p.index,{kind:'speech',text:txt.slice(0,180)});return true;\n  }\n  return null;\n }\n function takePatient(index,monitor=false){",
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
 "if(a.kind==='therapy')return typeof a.text==='string'&&a.text.length<=180&&!!findMonitorTherapy(a.text);if(a.kind==='command')return challenge.mode==='coop'&&typeof a.text==='string'&&a.text.trim().length>0&&a.text.length<=220;if(a.kind==='finish')return challenge.mode==='coop'&&a.reason==='completed';if(a.kind==='clinical_call')return challenge.mode==='coop'&&['csSetDiagnosticImpression','csSetDisposition','csRequestConsult','captureMonitorVitals'].includes(a.method)&&Array.isArray(a.args)&&a.args.length<=3&&a.args.every(v=>typeof v==='string'||typeof v==='number')&&JSON.stringify(a).length<500;",
 'safe-native-clinical-command-relay');
 s=edit(s,
 "else if(a.kind==='therapy'){addMonitorTherapy(a.text)}};",
 "else if(a.kind==='therapy'){addMonitorTherapy(a.text)}else if(a.kind==='command'){const txt=String(a.text||'').trim();if(!txt)return false;const vega=/^(?:dr\\.?\\s*vega|doctor(?:\\s+vega)?|vega)\\s*[,.:]?\\s*/i;const nursing=/^enfermer(?:a|o|ia|ía)\\s*[,.:]?\\s*/i;addGlobalChat('doctor',(helper||'Compañero')+': '+txt);if(vega.test(txt))mentorUserMessage(txt.replace(vega,''));else if(txt.startsWith('/'))processCommand(txt);else if(nursing.test(txt))nurseNatural(txt);else deliverPatientSpeech(txt.replace(/^paciente\\s*[,.:]?\\s*/i,''),true);}else if(a.kind==='clinical_call'){window[a.method]?.(...a.args)}else if(a.kind==='finish'){const originalIndex=shiftSession?.index;try{if(shiftSession)shiftSession.index=p.index;finishCase('completed')}finally{if(shiftSession)shiftSession.index=originalIndex}}};",
 'owner-executes-visiting-coop-command-on-original-engine');
 s=edit(s,
 "sendMessage=function(q){\n  if(shared()){",
  "sendMessage=function(q){\n  if(shared()){const remote=foreignClinical487();if(challenge.mode==='competitive'){const handled=foreignRivalInput487(q);if(handled!==null)return handled;}if(challenge.mode==='competitive'&&!canAct()&&challenge.assistIndex==null){const txt=String(q||'').trim();const clinical=txt.length<=220&&(['enfermera','enfermero','paciente','doctor','/estudio','/orden','/tratamiento','/enfermera'].some(x=>txt.toLowerCase().startsWith(x))||window.nsIsClinicalQuestion?.(txt));if(clinical){const bedside=challenge.patients.filter(p=>['waiting','in_care'].includes(p.state)&&near(p));if(bedside.length===1&&!bedside[0].ownerId&&bedside[0].state==='waiting'){pendingAutoCommand487=txt;takePatient(bedside[0].index);if(canAct()){const command=pendingAutoCommand487;pendingAutoCommand487=null;return oldSend.call(this,command)}return true}}}if(canAct()&&!String(q||'').trim().startsWith('/')&& !/\\b(?:enfermera|enfermero|enfermeria|vega)\\b/i.test(String(q||''))&& (/[?¿]/.test(String(q||''))||window.nsIsClinicalQuestion?.(String(q||'')))){ const target=currentPatient();if(target?.ownerId===selfId){ const txt=String(q||'').trim();if(txt){addGlobalChat('doctor',txt);return deliverPatientSpeech(txt,true)} }}if(challenge.mode==='coop'&&remote){const text=String(q||'').trim();if(!text)return false;if(!/^\\/(?:equipo|chat)\\s+/i.test(text)){const accepted=requestAssist(remote.index,{kind:'command',text:text.slice(0,220)});if(accepted){addGlobalChat('doctor',name()+' → '+(remote.instance.name||'Paciente')+': '+text);refreshChatDock()}return accepted;}}",
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
 "function requestAssist(index,a){if(challenge.mode==='competitive'&&!['exam','speech'].includes(a?.kind))return false;",
 'competitive-safe-bedside-request');
 s=edit(s,
 "function applyAssistAction(p,a,helper){if(challenge.mode==='competitive')return false;",
 "function applyAssistAction(p,a,helper){if(challenge.mode==='competitive'&&!['exam','speech'].includes(a?.kind))return false;",
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
 "if(p?.uid===m.uid&&m.targetId===selfId)applyAssistAction(p,m.action,m.helperName);return",
 "if(p?.uid===m.uid&&m.targetId===selfId){const stamp=String(m.aid||'');const ids=challenge._appliedAssist487||(challenge._appliedAssist487=new Set());if(stamp&&stamp.length<=160&&!ids.has(stamp)&&applyAssistAction(p,m.action,m.helperName)){ids.add(stamp);if(ids.size>200)ids.delete(ids.values().next().value)}if(ids.has(stamp)&&typeof send==='function')send('assist_apply_ack',{aid:stamp,targetId:m.peerId})}return",
 'deduplicate-remote-clinical-execution');

 s=edit(s,
 "m.querySelector('[data-refresh-observer]').onclick=()=>csOpenObserver(index);",
 "m.querySelector('[data-refresh-observer]').onclick=()=>csOpenObserver(index);if(challenge.mode==='competitive'&&p.ownerId&&p.ownerId!==selfId&&p.state==='in_care'){challenge.assistIndex=index;const box=document.createElement('section');box.className='csRuleBox';box.innerHTML='<b>Entrevista y examen del paciente rival</b><div><input maxlength=\"180\" data-observer-question placeholder=\"Preguntarle al paciente…\"><button type=\"button\" data-observer-ask>Preguntar</button></div><div><button type=\"button\" data-observer-exam=\"ns:inspection\">Inspección</button><button type=\"button\" data-observer-exam=\"ns:auscultation\">Auscultación</button><button type=\"button\" data-observer-exam=\"ns:percussion\">Percusión</button><button type=\"button\" data-observer-exam=\"ns:palpation\">Palpación</button></div><small>Medicación y nuevos estudios: solo el responsable del paciente.</small>';m.querySelector('.csPanel')?.appendChild(box);box.querySelector('[data-observer-ask]').onclick=()=>{const input=box.querySelector('[data-observer-question]');const txt=input.value.trim();if(txt&&requestAssist(index,{kind:'speech',text:txt}))input.value=''};box.querySelectorAll('[data-observer-exam]').forEach(b=>b.onclick=()=>requestAssist(index,{kind:'exam',id:b.dataset.observerExam}))}",
 'competitive-rival-physical-exam-and-anamnesis-tools');

 // A guest closing a cooperative patient must never invoke local XP. The
 // existing V41 case close and verified clinical handoff execute ONCE on the
 // authoritative owner (while temporarily targeting that owner's record).
 s=edit(s,
 "finishCase=function(reason){if(reason==='death'&&!closingDeath&&shiftSession?.records)",
 "finishCase=function(reason){if(challenge.mode==='coop'&&foreignClinical487())return requestAssist(foreignClinical487().index,{kind:'finish',reason:'completed'});if(reason==='death'&&!closingDeath&&shiftSession?.records)",
 'cooperative-visitor-closure-only-on-authoritative-owner');


 // A clear first bedside clinical request claims the ONE nearby free patient.
 // Never guess which patient an ambiguous order addresses.
 s=edit(s,
 "let pendingNav=null,pendingClaim=null,loading=false,buildingPlan=false",
 "let pendingNav=null,pendingClaim=null,pendingAutoCommand487=null,loading=false,buildingPlan=false",
 'one-unambiguous-clinical-first-contact');
 s=edit(s,
 "if(p?.ownerId===selfId){const idx=pendingClaim;pendingClaim=null;loadPatient(idx)}else if(p?.ownerId){pendingClaim=null;toast(",
 "if(p?.ownerId===selfId){const idx=pendingClaim;pendingClaim=null;loadPatient(idx);if(pendingAutoCommand487&&canAct()){const q=pendingAutoCommand487;pendingAutoCommand487=null;sendMessage(q)}}else if(p?.ownerId){pendingClaim=null;pendingAutoCommand487=null;toast(",
 'guest-claim-confirmed-before-running-queued-nurse-order');

 s=edit(s,
 "</body>",
 "<script id=\"atria-coop-physical-access-487\">(function(){const old=window.nsMayExamine;window.nsMayExamine=function(){const r=window.csV41Challenge;if(r?.active&&r.mode==='coop'&&sim?.__csRemoteMirror487&&!sim?.caseEnded){const p=r.patients?.find(x=>x.uid===sim.patientInstance?.uid);if(p?.state==='in_care')return true}return old?.apply(this,arguments)}})();</script></body>",
 'coop-native-physical-access-without-frozen-script-modification');

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

 // The native career receipt is the only source of XP. Persist an authenticated
 // per-player guard total into the existing host-owned room.players snapshots.
 // This does not change competitive clinical points, XP awards or score rules.
 s=edit(s,
 "let pendingNav=null,pendingClaim=null,pendingAutoCommand487=null,loading=false,buildingPlan=false,lastPublish=0,lastProgress=0;const pendingCareers=new Map();",
 "let pendingNav=null,pendingClaim=null,pendingAutoCommand487=null,loading=false,buildingPlan=false,lastPublish=0,lastProgress=0,guardXP487=0,guardXPReceipts487=new Set();\n function recordGuardXP487(receipt,amount){if(!shared()||!challenge.active||guardXPReceipts487.has(receipt))return;const n=Number(amount);if(!Number.isFinite(n)||Math.abs(n)>10000)return;guardXPReceipts487.add(receipt);guardXP487=Math.max(-100000,Math.min(100000,guardXP487+Math.round(n)));if(host()){const me=challenge.players.find(p=>p.id===selfId);if(me){me.xpGuard487=guardXP487;challenge.revision++;publish()}}else send('score_xp',{xp:guardXP487});}\n const pendingCareers=new Map();",
 'native-confirmed-xp-ledger-with-dedup');
 s=edit(s,
 "challenge.hostId=selfId;challenge.practice=",
 "challenge.hostId=selfId;guardXP487=0;guardXPReceipts487.clear();challenge.practice=",
 'fresh-guard-xp-reset-on-host');
 s=edit(s,
 "challenge.assistIndex=null;pendingNav=null;pendingClaim=null;renderHud();decorateReception();",
 "challenge.assistIndex=null;pendingNav=null;pendingClaim=null;guardXP487=0;guardXPReceipts487.clear();renderHud();decorateReception();",
 'clear-xp-when-returning-to-lobby');
 s=edit(s,
 "const same=challenge.id===r.id,oldPatients=challenge.patients;window.nsPractice",
 "const same=challenge.id===r.id,oldPatients=challenge.patients;if(!same){guardXP487=0;guardXPReceipts487.clear()}window.nsPractice",
 'fresh-room-xp-reset-on-guest');
 s=edit(s,
 "sim.__csSharedCareer=base.career.call(this,p.result.score,b);if(csProfile){",
 "sim.__csSharedCareer=base.career.call(this,p.result.score,b);recordGuardXP487('case:'+p.uid,sim.__csSharedCareer?.xpDelta);if(csProfile){",
 'real-confirmed-native-xp-credit');
 s=edit(s,
 "csProfile.xp=(Number(csProfile.xp)||0)+xp;csProfile.totalAssists=",
 "csProfile.xp=(Number(csProfile.xp)||0)+xp;recordGuardXP487('assist:'+p.uid,xp);csProfile.totalAssists=",
 'include-real-assistance-xp-credit');
 s=edit(s,
 "if(!peer)return;if(m.kind==='claim'){",
 "if(!peer)return;if(m.kind==='score_xp'){const n=Number(m.xp);if(Number.isInteger(n)&&n>=-100000&&n<=100000&&peer.xpGuard487!==n){peer.xpGuard487=n;challenge.revision++;publish()}return}if(m.kind==='claim'){",
 'host-accepts-only-member-xp-claims');
 s=edit(s,
 "challenge.players=list.map(x=>({id:x.id,name:String(x.name||'Jugador').slice(0,40)}));",
 "challenge.players=list.map(x=>({id:x.id,name:String(x.name||'Jugador').slice(0,40),xpGuard487:challenge.players.find(p=>p.id===x.id)?.xpGuard487||0}));",
 'preserve-earnings-across-roster-updates');
 s=edit(s,
 "challenge.revision++;applyPatients();publish()}}}else if(m.kind==='member_leave')",
 "challenge.revision++;applyPatients();publish()}if(typeof send==='function')send('assist_ack',{aid:m.aid,targetId:peer.id})}}else if(m.kind==='member_leave')",
 'H-host-receipt-for-accepted-relay');
 // Role-tagged clinical utterances stay visible to every room member.
 // This is a text-only broadcast; no therapy/exam code runs in the listener.
 s=edit(s,
 "if(!challenge.active||challenge.ended||typeof m.text!=='string'||m.text.length>180||!person(m.peerId)||m.peerId===selfId)return;",
 "const npc=['patient','expert','nurse','clinical-ok'].includes(m.npcSpeaker);const source=npc?challenge.patients.find(p=>p.uid===m.patientUid):null;if(!challenge.active||challenge.ended||typeof m.text!=='string'||m.text.length>(npc?1000:180)||!person(m.peerId)||m.peerId===selfId||npc&&source?.ownerId!==m.peerId)return;",
 'public-npc-replies-are-full-text-and-owner-authenticated');
 s=edit(s,
 "addGlobalChat('system',(person(m.peerId)?.name||'Compañero')+' · equipo: '+m.text.replace(/[<>]/g,''));",
 "addGlobalChat(npc?m.npcSpeaker:'system',npc?m.text:(person(m.peerId)?.name||'Compañero')+' · equipo: '+m.text.replace(/[<>]/g,''),{nsRemoteNPC487:true});",
 'public-npc-replies-render-without-clinical-dispatch');
 s=edit(s,
 "if(vega.test(txt))mentorUserMessage(txt.replace(vega,''));else if(txt.startsWith('/'))processCommand(txt);else if(nursing.test(txt))nurseNatural(txt);else deliverPatientSpeech(txt.replace(/^paciente\\s*[,.:]?\\s*/i,''),true);",
 "const route=window.nsChatRecipient487?.(txt);if(txt.startsWith('/'))processCommand(txt);else if(route){if(route.role==='expert')mentorUserMessage(route.text);else if(route.role==='nurse')nurseNatural(txt);else deliverPatientSpeech(route.text,true);}else if(vega.test(txt))mentorUserMessage(txt.replace(vega,''));else if(nursing.test(txt))nurseNatural(txt);else deliverPatientSpeech(txt.replace(/^paciente\\s*[,.:]?\\s*/i,''),true);",
 'one-parser-for-manual-owner-and-guest-mentions');
 s=edit(s,
 "function requestAssist(index,a){",
 "function requestAssist(index,a){if(a?.kind==='command'&&window.nsChatRecipient487)a={...a,recipient:window.nsChatRecipient487(a.text).role};",
 'relay-preserves-explicit-clinical-recipient');
 s=edit(s,
 "if(a.kind==='command')return challenge.mode==='coop'&&typeof a.text==='string'&&a.text.trim().length>0&&a.text.length<=220;",
 "if(a.kind==='command')return challenge.mode==='coop'&&typeof a.text==='string'&&a.text.trim().length>0&&a.text.length<=220&&(!a.recipient||['patient','expert','nurse'].includes(a.recipient)&&(!window.nsChatRecipient487||a.recipient===window.nsChatRecipient487(a.text).role));",
 'validate-recipient-at-authoritative-permission-boundary');
 s=edit(s,
 "function roomCommand(q){",
 "window.csBroadcastAddressedChat487=function(role,raw){if(!shared()||!challenge.active||challenge.ended||!['patient','expert','nurse'].includes(role))return false;const utterance=String(raw||'').trim().slice(0,150);if(!utterance)return false;const to={patient:'Paciente',expert:'Dr. Vega',nurse:'Enfermera'}[role];const text='A '+to+': '+utterance;send('team_chat',{text,recipient:role,patientUid:sim?.patientInstance?.uid||null,messageId:selfId+':'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2,7)});return true;};function roomCommand(q){",
 'addressed-clinical-message-is-public-but-execution-stays-authoritative');
 s=edit(s,
 "function roomCommand(q){",
 "window.csBroadcastNPCReply487=function(role,raw){if(!shared()||!challenge.active||challenge.ended||!['patient','expert','nurse','clinical-ok'].includes(role)||!sim||sim.__csRemoteMirror487||sim.__csRoomSpectator)return false;const p=challenge.patients.find(p=>p.uid===sim.patientInstance?.uid);if(!p||p.ownerId!==selfId)return false;const text=String(raw||'').trim().slice(0,1000);if(!text)return false;send('team_chat',{text,npcSpeaker:role,recipient:'doctor',patientUid:p.uid,messageId:selfId+':'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2,7)});return true;};function roomCommand(q){",
 'npc-answers-use-existing-public-room-chat-transport');
 // Retain the native composer node while it is focused, including an Android
 // IME composition. Only the two text containers need repainting on receipt.
 s=edit(s,
 "dock.innerHTML=`<div class=\"nsLobbyHistory ${state.history?'show':''}\">",
 "const prior=dock.querySelector('#dieInput'),draft=prior?.value||'';if(prior&&document.activeElement===prior){const history=dock.querySelector('.nsLobbyHistory'),recentNode=dock.querySelector('.chatRecent');if(history){history.classList.toggle('show',state.history);history.innerHTML=msgs.map(lineHTML).join('')}if(recentNode)recentNode.innerHTML=recent.map(lineHTML).join('');return}dock.innerHTML=`<div class=\"nsLobbyHistory ${state.history?'show':''}\">",
 'incoming-lobby-chat-preserves-native-focused-composer');
 s=edit(s,
 "const input=dock.querySelector('#dieInput'),send=dock.querySelector('#dieSend'),go=()=>",
 "const input=dock.querySelector('#dieInput'),send=dock.querySelector('#dieSend');input.value=draft;const go=()=>",
 'unfocused-lobby-draft-survives-repaint');
 s=edit(s,
 "const key=m.sequence!=null?'s:'+m.sequence:",
 "const key=m.messageId?(m.optimistic?'pending:':'id:')+m.messageId:m.sequence!=null?'s:'+m.sequence:",
 'lobby-dedupe-by-event-identity');
 s=edit(s,
 "x&&x.optimistic&&x.userId===mine&&x.text===m.text",
 "x&&x.optimistic&&x.userId===mine&&(m.messageId?x.messageId===m.messageId:x.text===m.text)",
 'lobby-reconcile-correct-identical-text-event');
 // The optimistic row and retries carry ONE stable identity. A failed request
 // is never interpreted as a successful send. The same user may deliberately
 // send identical text again; that gets a fresh identity.
 const lobbySendOld="async function sendChat(text){text=String(text||'').trim().slice(0,180);if(!text)return;const u=me(),localId=u?.id||'local',localName=u?.name||csProfile?.name||'Tú',localHandle=u?.handle||'local';const optimistic={userId:localId,name:localName,handle:localHandle,text,createdAt:now(),optimistic:true};appendMessage(optimistic);if(!u)return;try{const data=await lobbyApi('lobby/chat',{method:'POST',body:{text,peerId:csV41Challenge?.selfId||'local'}});if(data.message)appendMessage(data.message)}catch(err){state.status='Chat sin conexión';optimistic.failed=true;renderChat();renderHud()}}";
 const lobbySendNew=String.raw`async function sendChat(text){
 text=String(text||'').trim().slice(0,180);if(!text)return false;
 const u=me(),localId=u?.id||'local',messageId=localId+':'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2);
 const optimistic={userId:localId,name:u?.name||csProfile?.name||'Tú',handle:u?.handle||'local',text,createdAt:now(),optimistic:true,messageId,delivery:'sending'};
 appendMessage(optimistic);if(!u){optimistic.delivery='failed';state.status='Mensaje pendiente: falta conexión social.';renderChat();return false}
 const epoch=state.epoch;
 for(let attempt=0;attempt<6;attempt++){
  try{const data=await lobbyApi('lobby/chat',{method:'POST',body:{text,messageId,peerId:csV41Challenge?.selfId||'local'}});
   if(!data.message)throw Error('Falta confirmación del servidor');
   appendMessage({...data.message,delivery:'received'});return true;
  }catch(err){
   optimistic.failed=true;optimistic.delivery='pending';state.status='Mensaje pendiente. Reintentando conexión…';renderChat();renderHud();
   if(err.status>=400&&err.status<500&&err.status!==429||attempt===5||state.epoch!==epoch||!state.active){optimistic.delivery='failed';state.status='Mensaje sin confirmar: '+(err.message||'sin conexión');renderChat();renderHud();return false}
   await new Promise(resolve=>setTimeout(resolve,Math.min(4000,350*2**attempt)));
  }
 }
}`;
 s=edit(s,lobbySendOld,lobbySendNew,'retry-lobby-chat-with-stable-event-id');
 s=edit(s,
 "${e(m.text||'')}</span></div>`}",
 "${e(m.text||'')}${m.optimistic?' · '+(m.delivery==='failed'?'Sin confirmar':m.delivery==='pending'?'Pendiente':'Enviando…'):m.messageId?' · Recibido':''}</span></div>`}",
 'delivery-feedback-in-existing-lobby-transcript');
 // A reply can arrive before the compressed claim snapshot. Its authenticated
 // envelope is valid, but the local patient still has no owner. Retain that
 // text until the matching owner snapshot arrives instead of silently losing it.
 s=edit(s,
 "if(!challenge.active||challenge.ended||typeof m.text!=='string'||m.text.length>(npc?1000:180)||!person(m.peerId)||m.peerId===selfId||npc&&source?.ownerId!==m.peerId)return;",
 "if(!challenge.active||challenge.ended||typeof m.text!=='string'||m.text.length>(npc?1000:180)||(!person(m.peerId)&&!(typeof csCoop!=='undefined'&&csCoop.remotes?.[m.peerId]))||m.peerId===selfId)return;if(npc&&source?.ownerId!==m.peerId){if(source&&!source.ownerId&&source.state==='waiting'&&typeof setTimeout==='function'){const pending=challenge._pendingChat487||(challenge._pendingChat487=new Map()),key=String(m.messageId||'');if(key&&pending.size<120&&!pending.has(key)){pending.set(key,Date.now());const roomId=challenge.id;const retry=()=>{if(challenge.id!==roomId||!challenge.active||challenge.ended){pending.delete(key);return}const p=challenge.patients.find(p=>p.uid===m.patientUid);if(p?.ownerId===m.peerId){pending.delete(key);receive(m);return}if(p?.ownerId||Date.now()-pending.get(key)>8000){pending.delete(key);addGlobalChat('system','Mensaje de NPC sin confirmar: cambió la asignación del paciente.');refreshChatDock();return}setTimeout(retry,100)};setTimeout(retry,100)}}return}",
 'retain-authenticated-npc-text-until-ownership-snapshot');
 // Phase 4/7 are separate script closures. Their old free `mayTreat` name
 // accidentally relied on a helper private to the native ward-nurse closure.
 // Export that exact guard, then delegate lazily (the native module mounts
 // later). No permission predicate or nursing scheduler is duplicated.
 s=edit(s,
 "function taskSame(t,s=sim){",
 "window.csNativeNurseMayTreat487=mayTreat;\n function taskSame(t,s=sim){",
 'expose-existing-native-nurse-authority-guard');
 s=edit(s,
 "const prevNatural=nurseNatural,prevInfer=inferRecipient,prevCommand=processCommand,prevUpdate=updateSimulation;",
 "const prevNatural=nurseNatural,prevInfer=inferRecipient,prevCommand=processCommand,prevUpdate=updateSimulation;\n const mayTreat=(...args)=>window.csNativeNurseMayTreat487?.(...args)===true;",
 'composite-order-script-uses-native-permission-capability');
 s=edit(s,
 "const oldNatural=nurseNatural,oldInfer=inferRecipient,oldUpdate=updateSimulation,legacyParse=window.csNursingParse487;",
 "const oldNatural=nurseNatural,oldInfer=inferRecipient,oldUpdate=updateSimulation,legacyParse=window.csNursingParse487;\n const mayTreat=(...args)=>window.csNativeNurseMayTreat487?.(...args)===true;",
 'receipt-script-uses-same-native-permission-capability');
 if(reverse)for(const {from,to,label} of undo.reverse())s=replaceOnce(s,to,from,'reverse-'+label);
 return s;
}
