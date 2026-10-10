import {csPartyEncode,csPartyDecode,b64toBytes} from '../social/party-payload.js';
import {STUDY_TAT_MINUTES,EXTRA_EMERGENCY_STUDIES} from '../clinical/study-registry.js';
import {CASE_STUDY_CORRELATIONS,CASE_INCIDENTAL_FINDINGS,csCaseStudyFallback} from '../clinical/contextual-study-results.js';
import {roomTransportReady} from '../social/party-transport.js';
import {csVoiceWord,csVoiceCleanSpeech,csVoiceCleanMicSpeech,csMergeSpeech,csVoiceNovelText} from '../voice/transcript-normalizer.js';
import {csVoiceStageRevisions,csVoiceCommitRevisions,csVoiceChooseConfirmed} from '../voice/revision-buffer.js';
import {csAnamnesisClassify,csAnamnesisFact} from '../clinical/anamnesis-intents.js';
import {applyPeritonitis487} from './peritonitis-487.js';
import {applyDiagnosticImpression487} from './diagnostic-autocomplete-487.js';
import {applySurgicalNursing487} from './surgical-nursing-487.js';
import {applyNurseVoice487} from './nurse-voice-487.js';
import {applyNurseExecution487} from './nurse-execution-487.js';
import {applyGraceSurvival487} from './grace-survival-487.js';
import {applyVegaStepCoach487} from './vega-step-coach-487.js';
const replaceOnce=(s,from,to,label)=>{const i=s.indexOf(from);if(i<0)throw new Error('integration anchor missing: '+label);if(s.indexOf(from,i+from.length)>=0)throw new Error('integration anchor ambiguous: '+label);return s.slice(0,i)+to+s.slice(i+from.length)};
export function apply487(html){
 let s=html;
 // 4.8.7 replaces the legacy external study-repair pollers with source-level study resolution.
 s=replaceOnce(s,'<script src="/task7.js?v=483"></script>','<!-- legacy study fallback 7 retired in 4.8.7 -->','retire-task7-study-fallback');
 s=replaceOnce(s,'<script src="/task8.js?v=482"></script>','<!-- legacy study poller 8 retired in 4.8.7 -->','retire-task8-study-poller');
 s=replaceOnce(s,'<script src="/task12.js?v=485"></script>','<!-- legacy study poller 12 retired in 4.8.7 -->','retire-task12-study-poller');
 // task13 captures the same clinical PTT gesture before task5 group voice can receive it. Task5 owns mic permission + group peers in 4.8.7.
 s=replaceOnce(s,'<script src="/task13.js?v=486"></script>','<!-- conflicting legacy PTT primer 13 retired in 4.8.7; task5 owns group voice -->','retire-task13-ptt-primer');
 // Prevent the legacy HUD/map from painting before the branded splash exists.
 const bootStyle=`<style id="atria-boot-paint-guard">html:not(.atriaBootReady) body>*{visibility:hidden!important}html:not(.atriaBootReady) body{background:#07121d!important}</style>`;
 s=replaceOnce(s,'</head>',bootStyle+"<style id=\"atria-chat-bottom-anchor\">\n/* Keep the ward transcript immediately above the composer even when the dock expands. */\nbody:not(.keyboardOpen) #chatDock:not(.nsLobbyChat) .chatRecent{position:absolute!important;top:auto!important;bottom:calc(var(--cs-console-input-h,46px) + 3px)!important;height:auto!important;max-height:112px!important}\nbody:not(.keyboardOpen) #chatDock.historyExpanded:not(.nsLobbyChat) .chatRecent{top:auto!important;bottom:calc(var(--cs-console-input-h,46px) + 3px)!important;height:min(42dvh,320px)!important;max-height:min(42dvh,320px)!important;pointer-events:auto!important}\n</style>"+'</head>','first-paint-guard');
 s=replaceOnce(s,`showSplash();renderSelector();brandHud();`,`showSplash();document.documentElement.classList.add('atriaBootReady');renderSelector();brandHud();`,'splash-first-paint-release');
 s=replaceOnce(s,` function showSplash(){const m=document.createElement('section');m.id='nsSplash';m.className='show';m.setAttribute('aria-label','Bienvenido a ATRIA');m.innerHTML='<div class="nsSplashInner">'+logo()+'<p class="nsEyebrow">GUARDIAS QUE ENSEÑAN</p>'+heroHTML()+'<h1>La noche empieza acá.</h1><p>Un hospital vivo. Decisiones clínicas. Tu próximo desafío.</p><button id="nsEnter" class="nsPrimary">'+(csProfile?'Continuar como '+csEscape(csProfile.name):'Crear mi personaje')+' →</button><small>Aprendiz · Solitario · Cooperativo · Competitivo</small></div>';document.body.appendChild(m);m.querySelector('button').onclick=()=>{splashOpen=false;m.classList.remove('show');if(!csProfile)csOpenProfile(true);else if(window.nsLobby?.enter)window.nsLobby.enter();else renderSelector();csHospitalAudio.unlock();};}`,` function showSplash(){const m=document.createElement('section');m.id='nsSplash';m.className='show';m.setAttribute('aria-label','Bienvenido a ATRIA');m.innerHTML='<div class="nsSplashInner">'+logo()+'<p class="nsEyebrow">GUARDIAS QUE ENSEÑAN</p>'+heroHTML()+'<h1>La noche empieza acá.</h1><p>Un hospital vivo. Decisiones clínicas. Tu próximo desafío.</p><button id="nsEnter" class="nsPrimary">'+(csProfile?'Continuar como '+csEscape(csProfile.name):'Crear mi personaje')+' →</button><small>Aprendiz · Solitario · Cooperativo · Competitivo</small></div>';document.body.appendChild(m);m.querySelector('button').onclick=()=>{splashOpen=false;m.classList.remove('show');if(!csProfile)csOpenProfile(true);else if(window.nsLobby?.enter)window.nsLobby.enter();else renderSelector();csHospitalAudio.unlock();};}`,'preserve-direct-splash-lobby-handoff');
 // The golden-master ward transcript disables touch events and hides the log on keyboard focus.
 // Keep these surgical, unique replacements scoped to the ward; lobby styling remains unchanged.
 s=replaceOnce(s,
   'scrollbar-width:none!important;pointer-events:none!important}body:not(.keyboardOpen) #chatDock:not(.nsLobbyChat) .chatRecent::-webkit-scrollbar',
   'scrollbar-width:none!important;pointer-events:auto!important;touch-action:pan-y!important;overscroll-behavior:contain!important}body:not(.keyboardOpen) #chatDock:not(.nsLobbyChat) .chatRecent::-webkit-scrollbar',
   'ward-history-touch-scroll');
 s=replaceOnce(s,
   'body.keyboardOpen #chatDock:not(.nsLobbyChat) .chatRecent{display:none!important}',
   'body.keyboardOpen #chatDock:not(.nsLobbyChat) .chatRecent{display:block!important}',
   'ward-history-keyboard-visibility');
 s=replaceOnce(s,'</head>',
   '<style id="atria-mobile-ward-wrap">#chatDock:not(.nsLobbyChat) .chatRecentLine span{white-space:normal!important;overflow-wrap:anywhere!important}</style></head>',
   'ward-history-word-wrapping');
 // Phase 2: the bed monitor can visually overlap the patient sprite, especially B4.
 // Give an actual patient touch priority while preserving the original monitor target and clinical navigation.
 s=replaceOnce(s," handleGameTap=function(e){\n  if(C&&!editorOpen){\n   const candidates=scene().filter(m=>hit(e.clientX,e.clientY,m));"," function cs413PatientAtTap(x,y){\n  let nearest=null,distance=Infinity;\n  for(const p of patients()){\n   const pos=p.instance?.bed?.patient;if(!pos)continue;\n   const [px,py]=worldToScreen(pos[0],pos[1]);\n   const dx=Math.abs(x-px),dy=Math.abs(y-py);\n   if(dx>Math.max(25,22*scale)||dy>Math.max(26,20*scale))continue;\n   const d=Math.hypot(dx,dy);\n   if(d<distance){nearest=p;distance=d;}\n  }\n  return nearest;\n }\n handleGameTap=function(e){\n  if(C&&!editorOpen){\n   const clickedPatient=cs413PatientAtTap(e.clientX,e.clientY);\n   if(clickedPatient){select(clickedPatient,false);return;}\n   const candidates=scene().filter(m=>hit(e.clientX,e.clientY,m));",'bedside-patient-vs-monitor-hit-priority');
 s=replaceOnce(s,"if(p.index!==null&&p.index!==undefined&&shiftSession?.active){window.csLoadShiftRecordV40(p.index,{keepPosition:true,openMonitor:wantMonitor});}\n  else if(wantMonitor)openBedsideMonitor(monitorFor(p.instance));else openEntity('patient');","if(!wantMonitor&&sim?.patientInstance?.uid===p.instance.uid){openEntity('patient','exam');}\n  else if(p.index!==null&&p.index!==undefined&&shiftSession?.active){window.csLoadShiftRecordV40(p.index,{keepPosition:true,openMonitor:wantMonitor});}\n  else if(wantMonitor)openBedsideMonitor(monitorFor(p.instance));else openEntity('patient','exam');",'active-patient-exam-read-only-access');
 // Phase 3: competitive read-only clinical observation, authorized shared transport.
 s=replaceOnce(s," function publishProgress(force=false)"," // ATRIA 4.8.7: read-only room observation, never executable orders.\n let csObserverIndex=null,csObserverSignature='',csLastObservationPublish=0;\n function csObservationSnapshot(s,p){\n  const str=(v,n=600)=>String(v??'').slice(0,n);\n  return {uid:p.uid,caseId:p.caseId,diagnosis:str(s.diagnosis,160),disposition:str(s.disposition?.id,100),\n   history:(s.intentHistory||[]).slice(-35).map(x=>str(x?.reveal,500)),\n   exam:[...(s.examRegions||new Set())].slice(0,20).map(x=>{const d=(EXAM_SEGMENTS[p.caseId]||{})[x];return str(d?d[0]+': '+d[1]:x,500)}),\n   orders:[...(s.orders?.values?.()||[])].slice(-45).map(x=>({label:str(x?.label,130),status:str(x?.status,30),result:str(x?.result,1000),requestedBy:str(x?.requestedBy,65)})),\n   interventions:[...(s.interventions||new Set())].slice(0,45).map(x=>str(x,100)),\n   medications:(s.administrationLog||[]).slice(-25).map(x=>({label:str(x?.label||x?.drug||x?.id,140),dose:str(x?.doseDisplay||x?.dose||x?.amount,80),status:str(x?.status||'administrado',45)})),\n   conversation:(s.globalChat||[]).slice(-50).filter(x=>Array.isArray(x)&&x.length>=2).map(x=>[str(x[0],24),str(x[1],500)])};\n }\n function csSafeObservation(o){\n  if(!o||typeof o!=='object'||typeof o.uid!=='string'||o.uid.length>140||typeof o.caseId!=='string'||o.caseId.length>100||\n    typeof o.diagnosis!=='string'||o.diagnosis.length>160||typeof o.disposition!=='string'||o.disposition.length>100)return null;\n  for(const [key,max,length] of [['history',35,500],['exam',20,500],['interventions',45,100]]){\n   if(!Array.isArray(o[key])||o[key].length>max||o[key].some(x=>typeof x!=='string'||x.length>length))return null;\n  }\n  if(!Array.isArray(o.orders)||o.orders.length>45||o.orders.some(x=>!x||!['queued','collecting','pending','done'].includes(x.status)||typeof x.label!=='string'||x.label.length>130||typeof x.result!=='string'||x.result.length>1000||typeof x.requestedBy!=='string'||x.requestedBy.length>65))return null;\n  if(!Array.isArray(o.medications)||o.medications.length>25||o.medications.some(x=>!x||typeof x.label!=='string'||x.label.length>140||typeof x.dose!=='string'||x.dose.length>80||typeof x.status!=='string'||x.status.length>45))return null;\n  if(!Array.isArray(o.conversation)||o.conversation.length>50||o.conversation.some(x=>!Array.isArray(x)||x.length!==2||typeof x[0]!=='string'||x[0].length>24||typeof x[1]!=='string'||x[1].length>500))return null;\n  return o;\n }\n function csOpenObserver(index){\n  if(!shared())return false;\n  const p=challenge.patients[Number(index)];if(!p?.instance||!['waiting','in_care','done'].includes(p.state))return false;\n  csObserverIndex=p.index;const prior=document.getElementById('csClinicalObserverV487'),m=prior||document.createElement('div');\n  if(!prior){m.id='csClinicalObserverV487';m.className='csModal csChallengeModal';document.body.appendChild(m)}\n  const o=csSafeObservation(p.progress?.observation);\n  const view=o?.uid===p.uid&&o.caseId===p.caseId?o:null;\n  const val=v=>esc(String(v??''));\n  const section=(title,body)=>'<div class=\"csRuleBox\" style=\"margin:7px 0\"><b>'+title+'</b><div style=\"font-size:12px;line-height:1.4;overflow-wrap:anywhere\">'+body+'</div></div>';\n  const lines=(a,empty='Sin datos registrados')=>a?.length?a.map(x=>'<div style=\"padding:3px 0;border-bottom:1px solid #294552\">'+x+'</div>').join(''):'<span class=\"muted\">'+empty+'</span>';\n  const vit=p.vitals||{},connected=!!p.progress?.monitorConnected;\n  const vitals=connected?['hr','sys','dia','rr','spo2','temp'].map(k=>val(k)+': '+(Number.isFinite(Number(vit[k]))?val(vit[k]):'—')).join(' · '):'Monitor pendiente de conexión';\n  const rows=view?.orders?.map(o=>val(o.label)+' — '+val(o.status)+(o.status==='done'&&o.result?'<div class=\"result\">'+val(o.result)+'</div>':''))||[];\n  const meds=view?.medications?.map(x=>val(x.label)+' '+val(x.dose)+' · '+val(x.status))||[];\n  const chat=view?.conversation?.map(x=>'<b>'+val(x[0])+':</b> '+val(x[1]))||[];\n  const body=section('Monitor '+(connected?'· activo':'· pendiente'),vitals)+\n    section('Historia clínica','<b>'+val(p.instance.name||'Paciente')+'</b> · '+val(p.instance.bed?.label||'')+'<div>Motivo: '+val(CASES.find(c=>c.id===p.caseId)?.chief||'No registrado')+'</div><div>Diagnóstico: '+val(view?.diagnosis||'Pendiente')+'</div><div>Destino: '+val(view?.disposition||'Pendiente')+'</div>')+\n    section('Anamnesis obtenida',lines(view?.history?.map(val),'Esperando sincronización'))+\n    section('Examen físico',lines(view?.exam?.map(val)))+\n    section('Estudios y resultados',lines(rows))+\n    section('Intervenciones',lines(view?.interventions?.map(val)))+\n    section('Medicamentos administrados',lines(meds))+\n    section('Conversación con el paciente',lines(chat,'Esperando sincronización'));\n  const scroll=m.querySelector('[data-observer-scroll]')?.scrollTop||0;\n  m.innerHTML='<div class=\"csPanel\" style=\"max-height:88dvh;display:flex;flex-direction:column\"><div style=\"display:flex;justify-content:space-between;align-items:center\"><b>Consulta clínica · solo lectura</b><button class=\"csClose\" data-close-observer>×</button></div><div data-observer-scroll style=\"flex:1;min-height:0;overflow-y:auto;touch-action:pan-y;overscroll-behavior:contain\">'+body+'</div><button class=\"csBtn secondary\" data-refresh-observer>Actualizar</button></div>';\n  m.classList.add('show');\n  m.querySelector('[data-close-observer]').onclick=()=>{m.classList.remove('show');csObserverIndex=null;csObserverSignature=''};\n  m.querySelector('[data-refresh-observer]').onclick=()=>csOpenObserver(index);\n  m.querySelector('[data-observer-scroll]').scrollTop=scroll;\n  csObserverSignature=JSON.stringify({view,vitals:vit,connected});return true;\n }\n window.csObservePatientV487=csOpenObserver;\n function csObserverRefreshIfOpen(){\n  const box=document.getElementById('csClinicalObserverV487');if(csObserverIndex==null||!box?.classList.contains('show'))return;\n  const p=challenge.patients[csObserverIndex];if(!p)return;\n  if(JSON.stringify({view:csSafeObservation(p.progress?.observation),vitals:p.vitals||{},connected:!!p.progress?.monitorConnected})!==csObserverSignature)csOpenObserver(csObserverIndex);\n }\n function publishProgress(force=false)","phase3-read-model");
 s=replaceOnce(s,"careEvidence:window.nsCareEvidence?.(s,p.caseId)||null};if(host())","careEvidence:window.nsCareEvidence?.(s,p.caseId)||null,observation:csObservationSnapshot(s,p)};if(host())","phase3-progress-projection");
 s=replaceOnce(s,"else send('progress',{index:p.index,vitals:v,progress});}if(host())applyPatients();}","else send('progress',{index:p.index,vitals:v,progress});}if(host()){applyPatients();if(Date.now()-csLastObservationPublish>1800){csLastObservationPublish=Date.now();challenge.revision++;publish('snapshot');}}}","phase3-host-owner-broadcast");
 s=replaceOnce(s,"careEvidence:care};applyPatients()}}else if(m.kind==='assist')","careEvidence:care,observation:csSafeObservation(m.progress?.observation)};if(m.progress?.observation&&(!p.progress.observation||p.progress.observation.uid!==p.uid||p.progress.observation.caseId!==p.caseId))return;applyPatients();if(Date.now()-csLastObservationPublish>1200){csLastObservationPublish=Date.now();challenge.revision++;publish('snapshot');}}}else if(m.kind==='assist'&&challenge.mode!=='competitive')","phase3-host-peer-progress");
 s=replaceOnce(s,"function requestAssist(index,a){const p=","function requestAssist(index,a){if(challenge.mode==='competitive')return false;const p=","phase3-competitive-request-denial");
 s=replaceOnce(s,"function applyAssistAction(p,a,helper){if(!p","function applyAssistAction(p,a,helper){if(challenge.mode==='competitive')return false;if(!p","phase3-competitive-authoritative-denial");
 s=replaceOnce(s,"return openAssistPanel(index)}if(!near(p))","return challenge.mode==='competitive'?csOpenObserver(index):openAssistPanel(index)}if(!near(p))","phase3-competitor-patient-observation");
 s=replaceOnce(s,"function openAssistPanel(index){const p=","function openAssistPanel(index){if(challenge.mode==='competitive')return csOpenObserver(index);const p=","phase3-helper-view-protection");
 s=replaceOnce(s,"m.classList.add('show');m.querySelector('[data-assist-close]')","const see=document.createElement('button');see.className='csBtn secondary';see.textContent='Ver historia, monitor y conversación';see.onclick=()=>csOpenObserver(index);m.querySelector('.csPanel')?.appendChild(see);m.classList.add('show');m.querySelector('[data-assist-close]')","phase3-coop-read-button");
 s=replaceOnce(s,"openEntity=function(id){if(shared()&&['patient','nurse','expert'].includes(id)&&!ownsCurrent())","openEntity=function(id){if(shared()&&id==='patient'&&!ownsCurrent()&&challenge.assistIndex!=null)return csOpenObserver(challenge.assistIndex);if(shared()&&['patient','nurse','expert'].includes(id)&&!ownsCurrent())","phase3-spectator-patient-entity");
 s=replaceOnce(s,"applyPatients();if(r.ended)showChallengeSummary()","applyPatients();csObserverRefreshIfOpen();if(r.ended)showChallengeSummary()","phase3-live-observer-refresh");
 // Phase 3: validate guest observation before mutating authoritative room state.
 s=replaceOnce(s,"const v={};for(const k of ['hr','sys','dia','rr','spo2','temp'])if(Number.isFinite(Number(m.vitals[k])))v[k]=Number(m.vitals[k]);p.vitals=v;p.progress={monitorConnected:","const observation=csSafeObservation(m.progress?.observation);if(m.progress?.observation&&(!observation||observation.uid!==p.uid||observation.caseId!==p.caseId))return;const v={};for(const k of ['hr','sys','dia','rr','spo2','temp'])if(Number.isFinite(Number(m.vitals[k])))v[k]=Number(m.vitals[k]);p.vitals=v;p.progress={monitorConnected:","phase3-check-observation-before-assigning-host-state");
 s=replaceOnce(s,"careEvidence:care,observation:csSafeObservation(m.progress?.observation)};if(m.progress?.observation&&(!p.progress.observation||p.progress.observation.uid!==p.uid||p.progress.observation.caseId!==p.caseId))return;applyPatients();","careEvidence:care,observation};applyPatients();","phase3-dont-poison-host-patient-state");
 s=replaceOnce(s,"if(m.kind==='assist_apply'&&m.peerId===challenge.hostId)","if(m.kind==='assist_apply'&&challenge.mode!=='competitive'&&m.peerId===challenge.hostId)","phase3-reject-competitive-assist-delivery");
 // Phase 5: unify manual, automatic and Vega-aware patient closure with existing scoring.
 s=replaceOnce(s,"  const _finishCaseV19=finishCase;\n  finishCase=function(reason='completed'){\n    if(!sim||sim._careerEndProcessed)return;\n    if(!sim.patientDied&&!sim.disposition){\n      csOpenDisposition(()=>finishCase(reason));\n      nurseSay('Antes de cerrar la atención necesito un destino y un pase claro del paciente.');\n      return\n    }\n    const r=_finishCaseV19.apply(this,arguments);\n    if(shiftSession?.active&&shiftSession.records){\n      const current=shiftSession.records[shiftSession.index];const rec=current?.caseId===C.id&&current.state!=='done'?current:null;\n      if(rec){rec.sim=sim;rec.state='done';rec.score=csBreakdown().score;rec.finishedAt=shiftSession.clock||0}\n    }\n    return r\n  };","  function csCaseClosureEligibilityV487(s=sim){\n    if(!s||!C)return {phase:'OPEN',eligible:false,pending:['No hay un paciente activo.']};\n    if(s._careerEndProcessed||s.caseEnded)return {phase:'CLOSED',eligible:false,pending:[]};\n    if(s._csClosing487)return {phase:'CLOSING',eligible:false,pending:[]};\n    const rec=shiftSession?.active?shiftSession.records?.[shiftSession.index]:null;\n    const currentUid=rec?.patientUid||rec?.instance?.uid;\n    if(currentUid&&s.patientInstance?.uid&&currentUid!==s.patientInstance.uid)\n      return {phase:'OPEN',eligible:false,pending:['Seleccioná el paciente correspondiente antes de cerrarlo.']};\n    const pending=[];\n    if(!s.patientDied&&!s.disposition?.id)\n      pending.push('Elegí el destino del paciente (alta, observación, internación, UTI o quirófano).');\n    return {phase:pending.length?'OPEN':'CLOSURE_ELIGIBLE',eligible:pending.length===0,pending};\n  }\n  window.csCaseClosureEligibilityV487=csCaseClosureEligibilityV487;\n  const _finishCaseV19=finishCase;\n  finishCase=function(reason='completed'){\n    const target=sim,eligibility=csCaseClosureEligibilityV487(target);\n    if(!target||eligibility.phase==='CLOSED'||eligibility.phase==='CLOSING')return false;\n    if(!eligibility.eligible){\n      if(!target.patientDied&&!target.disposition?.id){\n        const first=!target._csClosure487Prompted;\n        if(reason!=='auto'||first){\n          target._csClosure487Prompted=true;\n          csOpenDisposition(()=>{if(sim===target)finishCase(reason);});\n          if(first)nurseSay('La evaluación clínica está lista para cierre. Falta elegir el destino del paciente; sin eso no se acreditan puntos ni XP.');\n        }\n      }else if(reason!=='auto')nurseSay(eligibility.pending.join(' '));\n      return false;\n    }\n    target._csClosure487Phase='CLOSING';\n    target._csClosing487=true;\n    try{\n      const result=_finishCaseV19.apply(this,arguments);\n      if(target._careerEndProcessed){\n        target._csClosure487Phase='CLOSED';\n        if(shiftSession?.active&&shiftSession.records){\n          const current=shiftSession.records[shiftSession.index];\n          const uid=current?.patientUid||current?.instance?.uid;\n          const rec=current?.caseId===C.id&&current.state!=='done'&&(!uid||!target.patientInstance?.uid||uid===target.patientInstance.uid)?current:null;\n          if(rec){rec.sim=target;rec.state='done';rec.score=csBreakdown().score;rec.finishedAt=shiftSession.clock||0}\n        }\n      }else target._csClosure487Phase='OPEN';\n      return result;\n    }finally{target._csClosing487=false;}\n  };",'phase5-closure-single-contract');
 // Phase 6: sequential Dr. Vega guidance, preserving urgent automatic rescues.
 s=replaceOnce(s," function learnerTarget(){"," function csVegaTeachingIntentV487(text){\n  const n=norm(String(text||'')).replace(/^(vega|doctor|dr)\\s*[,.:]?\\s*/,'').trim();\n  if(/^(?:no lo hagas|no hagas nada|no te encargues|no quiero que lo hagas)/.test(n))return 'none';\n  if(/^(?:hazlo tu|hacelo vos|hacelo|hazlo|encargate|toma el relevo|resolvelo|resuelvelo|hace todo|haz todo)(?:\\b|$)/.test(n))return 'delegate';\n  if(/^(?:por que|para que|explicame por que|explicame para que|cual es la razon|que justifica|por que pedimos)/.test(n))return 'why';\n  if(/^(?:ayudame|ayuda con|necesito ayuda|haceme el siguiente paso|hace el siguiente paso|ayudame con el siguiente paso)/.test(n))return 'help';\n  if(/^(?:dame una pista|una pista|pista|orientame|una orientacion)/.test(n))return 'hint';\n  if(/^(?:no se|no entiendo|estoy perdido|no tengo idea|no se que hacer|no puedo seguir|sigo sin entender)/.test(n))return 'uncertain';\n  return 'none';\n }\n function csVegaObservedActionV487(before,after,kind){\n  return kind==='study'?after.orderCount>before.orderCount:\n   after.drugCount>before.drugCount||after.interventionCount>before.interventionCount||after.pendingCount>before.pendingCount;\n }\n function csVegaActionSnapshot487(){\n  return {orderCount:sim?.orders?.size||0,drugCount:sim?.administrationLog?.length||0,interventionCount:sim?.interventions?.size||0,pendingCount:sim?.pendingTherapies?.size||0};\n }\n function csVegaWhy487(step){\n  return {workup:'Un estudio dirigido sirve para contrastar hipótesis diagnósticas; primero elegí qué dato modificaría tu conducta.',\n    results:'El resultado todavía está pendiente. No debemos interpretarlo como confirmado antes de recibirlo.',\n    diagnosis:'La impresión debe integrar anamnesis, examen, signos y resultados efectivamente disponibles.',\n    treatment:'Elegimos una medida por la fisiopatología y el estado actual; indicar no equivale a administrar.',\n    administration:'La enfermera debe completar el procedimiento y debemos reevaluar la respuesta.',\n    handoff:'El destino depende de estabilidad, riesgos y necesidad de monitorización o intervención.',\n    closure:'El caso se cierra después de verificar las acciones realizadas y registrar el destino; la experiencia se acredita una sola vez.',\n    followup:'Reevaluamos signos y respuesta antes de confirmar un desenlace seguro.'}[step]||'Revisemos la decisión clínica pendiente.';\n }\n function learnerTarget(){","phase6-learning-intents-and-action-verification");
 s=replaceOnce(s,"  return 'followup';\n }\n function learnerPrompt(step)","  if(window.csCaseClosureEligibilityV487?.().phase==='CLOSURE_ELIGIBLE')return 'closure';\n  return 'followup';\n }\n function learnerPrompt(step)","phase6-tutor-closure-eligibility");
 s=replaceOnce(s,"handoff:'Definí un destino seguro: ¿observación, sala, UTI, procedimiento o quirófano?',followup:","handoff:'Definí un destino seguro: ¿observación, sala, UTI, procedimiento o quirófano?',closure:'El destino está registrado y las conductas están listas para evaluar. ¿Cerramos el caso desde el plan?',followup:","phase6-tutor-closure-prompt");
 s=replaceOnce(s,"if(now-turn.absentSince>=40000)takeOver(job,'El paciente necesita avanzar el manejo.');return;","if(state.color==='ROJO'&&now-turn.absentSince>=40000)takeOver(job,'El paciente sigue crítico y necesita asistencia inmediata.');return;","phase6-stable-absence-no-delegation");
 s=replaceOnce(s,"if(step==='followup'){job.participatory=false;job.phase='reassessment';return;}\n  if(now-turn.started>=120000){takeOver(job,'Falta avanzar el manejo.');return;}\n  if(['results','administration'].includes(step))return;\n  const idle=now-turn.lastProgress;\n  if(idle>=40000){takeOver(job,'Te está costando seguir.');return;}\n  if(idle>=24000&&!turn.helped){turn.helped=true;helpOne(job,step);}\n  else if(idle>=12000&&!turn.hinted){turn.hinted=true;say(learnerHint(step));}","if(step==='followup'){job.participatory=false;job.phase='reassessment';return;}\n  if(['results','administration','closure'].includes(step))return;\n  const idle=now-turn.lastProgress;\n  if(state.color==='ROJO'&&idle>=30000){takeOver(job,'El paciente continúa crítico sin avance; intervengo por seguridad.');return;}\n  if(idle>=40000&&!turn.helped){turn.helped=true;say('Seguimos con un solo paso: '+learnerHint(step)+' Si querés que ejecute una medida, decime «ayúdame»; para el relevo completo, «hazlo tú».');}\n  else if(idle>=12000&&!turn.hinted){turn.hinted=true;say(learnerHint(step));}","phase6-inactivity-hints-no-automatic-procedures");
 s=replaceOnce(s,"if(delegation||sim.nsVegaStruggles>=2)return begin();","if(delegation)return begin();","phase6-uncertainty-not-delegation");
 s=replaceOnce(s,"const state=window.nsPatientState();actor(()=>{window.csQueueMonitor();if(['ROJO','NARANJA'].includes(state.color))window.csQueueIV(1)});","const state=window.nsPatientState();","phase6-uncertainty-not-clinical-orders");
 // Phase 6: a single explicit action at a time; clinical confirmations use actual state changes.
 s=replaceOnce(s," function learnerMessage(text,intent){\n  const job=sim.nsVegaCare,step=learnerTarget(),n=norm(text),question=/^(como|por que|que|cual|cuando|donde|para que|sirve|puedo|debo|conviene)\\b/.test(n);\n  sim.chats.expert.push(['doctor',text]);\n  if(!question&&intent.type==='study_proposal'&&intent.study){window.nsWithClinicalActor('player',()=>orderStudy(intent.study,true,'Jugador'));say('Estudio solicitado por tu decisión. '+learnerPrompt(learnerTarget()));return;}\n  if(!question&&intent.type==='therapy_proposal'){\n   const id=intent.therapy?.id||intent.intervention?.id,t=MONITOR_THERAPY_CATALOG.find(t=>t.id===id),i=C.interventions.find(i=>i.id===id);\n   if(t||i){window.nsWithClinicalActor('player',()=>t?addMonitorTherapy(text):orderIntervention(i));say('Compruebo la ejecución de tu indicación. '+learnerPrompt(learnerTarget()));return;}\n  }\n  if(['diagnostic_answer','tentative_hypothesis'].includes(intent.type)&&intent.diagnosisMatch){window.nsWithClinicalActor('player',()=>csSetDiagnosticImpression(text,{echo:false}));say('Dejamos tu hipótesis como impresión de trabajo. '+learnerPrompt(learnerTarget()));return;}\n  if(step==='handoff'&&!question){const destination=/quirof|cirug|operar/.test(n)?'quirofano':/uti|cuidados crit|intensiv/.test(n)?'uti':/procedimiento|endoscop/.test(n)?'procedimiento':/observacion/.test(n)?'observacion':/\\bsala\\b|internacion/.test(n)?'sala':/\\balta\\b/.test(n)?'alta':null;if(destination){window.nsWithClinicalActor('player',()=>csSetDisposition(destination));say('Destino registrado por tu decisión. Comprobamos que sea seguro y cómo responde.');return;}}\n  say(learnerHint(step));\n }"," function learnerMessage(text,intent){\n  const job=sim.nsVegaCare,step=learnerTarget(),n=norm(text),teaching=csVegaTeachingIntentV487(text);\n  const question=teaching==='why'||/^(como|por que|que|cual|cuando|donde|para que|sirve|puedo|debo|conviene)\\b/.test(n);\n  sim.chats.expert.push(['doctor',text]);\n  if(teaching==='why'){say(csVegaWhy487(step));return;}\n  if(teaching==='delegate'){begin();return;}\n  if(teaching==='uncertain'||teaching==='hint'){say(learnerHint(step)+' Avancemos con una decisión a la vez; podés pedirme ayuda explícita.');return;}\n  if(teaching==='help'){\n   if(job._csVegaHelpStage===step){say('Ya ejecuté una ayuda en este paso. Confirmemos su resultado antes de hacer algo nuevo.');return;}\n   if(!window.nsMayExamine?.()){say('No puedo indicar un tratamiento para un paciente que no está bajo tu atención.');return;}\n   if(helpOne(job,step)){job._csVegaHelpStage=step;say('Se ejecutó una única ayuda. Revisá el registro de órdenes o el monitor y decidí el próximo paso.');}\n   else say('En esta etapa no hay una medida automática segura. '+learnerHint(step));\n   return;\n  }\n  if(step==='closure'&&/^(?:cerrar|cerremos|cerramos|finalizar|finalicemos|terminar|terminemos)(?: el caso| caso| la atencion)?\\b/.test(n)){\n   finishCase('completed');\n   if(!sim._careerEndProcessed)say('Comprobá el destino y el cierre en el plan; la XP solo se registra al finalizar realmente.');\n   return;\n  }\n  if(!question&&intent.type==='study_proposal'&&intent.study){\n   const before=csVegaActionSnapshot487();\n   window.nsWithClinicalActor('player',()=>orderStudy(intent.study,true,'Jugador'));\n   if(csVegaObservedActionV487(before,csVegaActionSnapshot487(),'study'))say('Pedido confirmado en el registro de estudios. '+learnerPrompt(learnerTarget()));\n   else say('No aparece un nuevo pedido. Revisá si ya estaba solicitado o si falta alguna condición.');\n   return;\n  }\n  if(!question&&intent.type==='therapy_proposal'){\n   const id=intent.therapy?.id||intent.intervention?.id,t=MONITOR_THERAPY_CATALOG.find(t=>t.id===id),i=C.interventions.find(i=>i.id===id);\n   if(t||i){\n    const before=csVegaActionSnapshot487();\n    window.nsWithClinicalActor('player',()=>t?addMonitorTherapy(text):orderIntervention(i));\n    if(csVegaObservedActionV487(before,csVegaActionSnapshot487(),'treatment'))say('Indicación registrada; confirmemos su administración y respuesta antes de avanzar. '+learnerPrompt(learnerTarget()));\n    else say('No se registró una intervención nueva. Revisá vía venosa, seguridad y tareas pendientes.');\n    return;\n   }\n  }\n  if(['diagnostic_answer','tentative_hypothesis'].includes(intent.type)&&intent.diagnosisMatch){\n   window.nsWithClinicalActor('player',()=>csSetDiagnosticImpression(text,{echo:false}));\n   say('Impresión de trabajo registrada. '+learnerPrompt(learnerTarget()));return;\n  }\n  if(step==='handoff'&&!question){\n   const destination=/quirof|cirug|operar/.test(n)?'quirofano':/uti|cuidados crit|intensiv/.test(n)?'uti':/procedimiento|endoscop/.test(n)?'procedimiento':/observacion/.test(n)?'observacion':/\\bsala\\b|internacion/.test(n)?'sala':/\\balta\\b/.test(n)?'alta':null;\n   if(destination){\n    const recorded=window.nsWithClinicalActor('player',()=>csSetDisposition(destination));\n    say(recorded!==false&&sim.disposition?.id===destination?'Destino registrado. Comprobemos elegibilidad de cierre y respuesta clínica.':'No pude registrar el destino; comprobá el contexto del paciente.');\n    return;\n   }\n  }\n  say(learnerHint(step));\n }",'phase6-sequential-learner-message-verified-execution');
 // Phase 7A: keep reception close control visible while patient cards scroll.
 s=replaceOnce(s,"<style id=\"cs-v40-flow-style\">","<style id=\"cs-v40-flow-style\">\n#csReceptionBoard.csModal{padding-top:max(12px,env(safe-area-inset-top,0px));padding-bottom:max(12px,env(safe-area-inset-bottom,0px));}\n#csReceptionBoard.csModal .csPanel{max-height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 24px);min-height:0;display:flex;flex-direction:column;overflow:hidden;}\n#csReceptionBoard .csReceptionPinned487{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;position:relative;z-index:1;}\n#csReceptionBoard .csReceptionPinned487 h2{margin:0;min-width:0;}\n#csReceptionBoard .csReceptionPinned487 .csClose{flex-shrink:0;touch-action:manipulation;}\n#csReceptionBoard .csReceptionScroll487{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;}\n","phase7-board-scroll-style");
 s=replaceOnce(s,"m.innerHTML=`<div class=\"csPanel\"><button class=\"csClose\" id=\"v40BoardClose\">×</button><h2>Recepción · tablero de guardia</h2><p class=\"csReceptionHint\">","m.innerHTML=`<div class=\"csPanel\"><div class=\"csReceptionPinned487\" id=\"csReceptionPinned487\"><h2>Recepción · tablero de guardia</h2><button class=\"csClose\" id=\"v40BoardClose\" aria-label=\"Cerrar recepción\">×</button></div><div class=\"csReceptionScroll487\"><p class=\"csReceptionHint\">","phase7-board-fixed-header");
 s=replaceOnce(s,"Los pacientes siguen evolucionando mientras atendés a otro.</div></div>`;m.classList.add","Los pacientes siguen evolucionando mientras atendés a otro.</div></div></div>`;m.classList.add","phase7-board-scroll-content");
 // Pending study timing is driven by performance.now() and updated by updateOrders().
 // Display the remaining game-hours whenever the Studies panel is rendered; collection has no readyAt yet.
 s=replaceOnce(s,"let st=o.status==='done'?'resultado':o.status==='collecting'?'extracción':o.status==='pending'?'pendiente':'solicitado',cl=","let st=o.status==='done'?'resultado':o.status==='collecting'?'extracción':o.status==='pending'?(o.readyAt?csStudyTimeLabel(o.readyAt):'pendiente de extracción'):'solicitado',cl=",'studies-pending-remaining-game-hours');
 // Results are private to the Studies tab; chart/history only exposes availability.
 s=replaceOnce(s,"const res=[...sim.orders.entries()].filter(([id,o])=>o.status==='done').map(([id,o])=>`<b>${esc(o.label)}</b><br>${esc(o.result)}`).join('<br><br>')||'<span class=\"muted\">Sin resultados objetivos disponibles.</span>';return `<div class=\"section\"><b>Motivo</b>${esc(C.chief)}</div><div class=\"section\"><b>Anamnesis adquirida</b>${hist}</div><div class=\"section\"><b>Signos vitales</b>${vit}</div><div class=\"section\"><b>Examen físico</b>${ex}</div><div class=\"section\"><b>Estudios realizados</b>${res}</div>`","const ready=[...sim.orders.values()].filter(o=>o.status==='done').length,res=ready?`<span class=\"muted\">${ready} resultado${ready===1?'':'s'} disponible${ready===1?'':'s'}. Consultá la pestaña Estudios para ver el contenido.</span>`:'<span class=\"muted\">Sin resultados objetivos disponibles.</span>';return `<div class=\"section\"><b>Motivo</b>${esc(C.chief)}</div><div class=\"section\"><b>Anamnesis adquirida</b>${hist}</div><div class=\"section\"><b>Signos vitales</b>${vit}</div><div class=\"section\"><b>Examen físico</b>${ex}</div><div class=\"section\"><b>Estudios realizados</b>${res}</div>`",'study-results-private-to-studies-tab');
 const oldFind=`function findStudy(text){const n=norm(text);let best=null,score=0;for(const s of C.studies)for(const a of [s.label,...s.aliases]){const na=norm(a);if(n.includes(na)&&na.length>score){best=s;score=na.length}}return best}`;
 const newFind=`const csStudyTiming=${JSON.stringify(STUDY_TAT_MINUTES)};
function csStudyDurationMs(s){const chosen=csStudyTiming[String(s?.id||'')],fallback=Number(s?.gameHours??s?.delayHours??s?.delay??1)*60,minutes=Number.isFinite(chosen)?chosen:(Number.isFinite(fallback)&&fallback>0?fallback:60);return Math.max(1,minutes)*1000}
function csStudyTimeLabel(readyAt,now=performance.now()){const remaining=Math.max(1,Math.ceil((readyAt-now)/1000)),hours=Math.floor(remaining/60),minutes=remaining%60;return 'faltan '+(hours?(hours+' h'+(minutes?' '+minutes+' min':'')):(remaining+' min'))+' de juego'}
function csNormalStudyResult(st){const label=String(st?.label||'Estudio'),n=norm(label);if(/cultivo|microbiolog|clostridium|materia fecal|sangre oculta/.test(n))return label+': sin evidencia de patógenos, toxinas ni sangrado oculto significativo.';if(st?.id==='grupo')return label+': tipificación y pruebas de compatibilidad sin incidencias.';if(st?.type==='imaging')return label+': sin hallazgos patológicos agudos ni alteraciones significativas.';if(st?.type==='procedure')return label+': sin hallazgos patológicos relevantes.';return label+': Sin alteraciones significativas; parámetros dentro de límites de referencia.'}
const CASE_STUDY_CORRELATIONS={"CIRR-001":{"pbe_cbc":"hemograma","chole_cbc":"hemograma","chole_liver":"hepatograma","pbe_renal":"renal"},"PANC-001":{"app_cbc":"hemograma","pbe_cbc":"hemograma","chole_cbc":"hemograma","renal":"hemograma","peri_gas":"gasometria","ileo_gas":"gasometria","mesi_gas":"gasometria"},"CROHN-001":{"hemograma":"inflamatorio","pbe_cbc":"inflamatorio","chole_cbc":"inflamatorio","app_cbc":"inflamatorio"},"HDA-001":{"hemograma":"hda_lab","pbe_cbc":"hda_lab","renal":"hda_lab"},"COLON-001":{"hemograma":"iron","pbe_cbc":"iron","chole_cbc":"iron"},"PERI-PBE-001":{"hemograma":"pbe_cbc","chole_cbc":"pbe_cbc","renal":"pbe_renal","paracentesis":"pbe_paracentesis"},"PERI-SEC-001":{"hemograma":"peri_cbc","pbe_cbc":"peri_cbc","chole_cbc":"peri_cbc","gasometria":"peri_gas","renal":"peri_gas","tc":"peri_ct"},"PERI-TER-001":{"hemograma":"ter_cbc","renal":"ter_cbc","tc":"ter_ct"},"APP-001":{"hemograma":"app_cbc","pbe_cbc":"app_cbc","chole_cbc":"app_cbc","tc":"app_ct","eco":"app_us"},"CHOLE-001":{"hemograma":"chole_cbc","pbe_cbc":"chole_cbc","hepatograma":"chole_liver","eco":"chole_us"},"ILEO-001":{"hemograma":"ileo_lab","renal":"ileo_lab","gasometria":"ileo_gas","tc":"ileo_ct"},"MESI-001":{"hemograma":"mesi_lab","gasometria":"mesi_gas"},"CHOLANG-001":{"hemograma":"cholang_cbc","renal":"cholang_cbc","hepatograma":"cholang_liver","eco":"cholang_us"}};
const CASE_INCIDENTAL_FINDINGS={"PANC-001":{"amilasa":"Amilasa sérica: elevada, compatible con la pancreatitis aguda. No se dispone de concentración numérica."},"CHOLE-001":{"lipasa":"Lipasa sérica: elevación discreta, menor de 3 veces el límite superior de referencia. Hallazgo inespecífico, por sí solo no diagnóstico de pancreatitis aguda."}};
function csCaseStudyFallback(study,currentCase){
 const id=String(study?.id||''),caseId=String(currentCase?.id||'');
 const own=(currentCase?.studies||[]).find(s=>s.id===id);
 if(own)return own.result;
 const sourceId=CASE_STUDY_CORRELATIONS[caseId]?.[id];
 if(sourceId){
  const source=(currentCase?.studies||[]).find(s=>s.id===sourceId);
  if(source?.result)return String(study.label||id)+': hallazgos concordantes con el panel '+String(source.label||sourceId)+': '+String(source.result);
 }
 const incident=CASE_INCIDENTAL_FINDINGS[caseId]?.[id];
 if(incident)return incident;
 return study?.normalResult||null;
}

const csExtraStudies=${JSON.stringify(EXTRA_EMERGENCY_STUDIES)};
function csStudyCatalog(){const m=new Map();for(const c of CASES||[])for(const st of c.studies||[])if(st?.id&&!m.has(st.id))m.set(st.id,{id:st.id,label:st.label,aliases:[...(st.aliases||[])],type:st.type||'lab',delay:csStudyDurationMs(st)/1000,gameHours:csStudyDurationMs(st)/60000,normalResult:csNormalStudyResult(st)});return [...m.values(),...csExtraStudies.filter(st=>!m.has(st.id))]}
function csStudyScore(st,n){let score=0;for(const a of [st.id,st.label,...(st.aliases||[])]){const x=norm(a);if(!x)continue;if(n===x)score=Math.max(score,10000+x.length);else if(n.includes(x))score=Math.max(score,x.length)}return score}
function csStudyAnatomyId(text){const words=norm(text).split(' '),brain=words.some(x=>['cerebral','cerebro','encefalo','craneo','cranial','cabeza'].includes(x)),chest=words.some(x=>['torax','toracico','toracica','pecho','pulmonar'].includes(x)),abdomen=words.some(x=>['abdomen','abdominal','abdominopelvica','abdominopelvico','pelvis'].includes(x)),ct=words.some(x=>['tomografia','tac','tc','escaner'].includes(x)),mr=words.some(x=>['resonancia','rmn','rm'].includes(x)),rx=words.some(x=>['radiografia','rx','placa'].includes(x));if(brain&&ct)return 'tc_cerebral';if(brain&&mr)return 'rm_cerebral';if(chest&&!abdomen&&ct)return 'tc_torax';if(chest&&!abdomen&&rx)return 'rx_torax';return null}
function findStudy(text){const n=norm(text),catalog=csStudyCatalog(),canonical=catalog.find(st=>norm(st.id)===n),anatomy=csStudyAnatomyId(n);if(canonical){const own=(C.studies||[]).find(st=>st.id===canonical.id);return own?{...own,universalFallback:false}:{...canonical,result:csCaseStudyFallback(canonical,C),universalFallback:true}}if(anatomy){const st=catalog.find(x=>x.id===anatomy);if(st)return {...st,result:csCaseStudyFallback(st,C),universalFallback:true}}let best=null,score=0;for(const st of C.studies||[]){const sc=csStudyScore(st,n);if(sc>score){best=st;score=sc}}if(best)return {...best,universalFallback:false};best=null;score=0;for(const st of catalog){const sc=csStudyScore(st,n);if(sc>score){best=st;score=sc}}return best?{...best,result:csCaseStudyFallback(best,C),universalFallback:true}:null}`;
 s=replaceOnce(s,oldFind,newFind,'universal-study-resolution');
 // Natural-language study orders share the same catalog resolver. Multiple named studies in one sentence are allowed.
 const naturalAnchor=`const i=findIntervention(raw.replace(/^orden\\s+/i,''));if(i){orderIntervention(i);return}`;
 const naturalStudy=`const csStudyIntent=/\\b(pedi|pedime|pedir|solicita|solicito|solicitar|haceme|hace|hacer|quiero|ordena|ordenar|necesito|realiza|realizar|sacame)\\b/.test(norm(raw));if(csStudyIntent&&!/[?¿]/.test(raw)&&!/(^|\\s)(no|nunca|tampoco|sin|evita|evitar|cancelar|cancela|descarta)(\\s|$)/.test(norm(raw))){const words=norm(raw).split(' ').filter(Boolean),hits=[],occupied=new Set(),seen=new Set();for(const st of [...(C.studies||[]),...csStudyCatalog()])for(const a of [st.label,...(st.aliases||[])]){const phrase=norm(a).split(' ').filter(Boolean);if(!phrase.length)continue;for(let i=0;i<=words.length-phrase.length;i++)if(phrase.every((w,j)=>words[i+j]===w))hits.push({st,start:i,end:i+phrase.length,size:phrase.length})}hits.sort((a,b)=>b.size-a.size||a.start-b.start);const chosen=[];for(const h of hits){if(seen.has(h.st.id))continue;if(Array.from({length:h.end-h.start},(_,i)=>h.start+i).some(i=>occupied.has(i)))continue;seen.add(h.st.id);for(let i=h.start;i<h.end;i++)occupied.add(i);chosen.push(h)}for(const h of chosen.sort((a,b)=>a.start-b.start))orderStudy(findStudy(h.st.label)||h.st);if(seen.size)return}const i=findIntervention(raw.replace(/^orden\\s+/i,''));if(i){orderIntervention(i);return}`;
 s=replaceOnce(s,naturalAnchor,naturalStudy,'natural-language-study-orders');
 const unknownStudy=`const i=findIntervention(raw.replace(/^orden\\s+/i,''));if(i){orderIntervention(i);return}nurseSay('No pude traducir esa orden. Probá /estudio <nombre> o /orden <conducta>.')`;
 const universalOrder=`const i=findIntervention(raw.replace(/^orden\\s+/i,''));if(i){orderIntervention(i);return}nurseSay(/^estudio\\s+/i.test(raw)?'Ese nombre no corresponde a un estudio del catálogo. Revisá el nombre e intentá de nuevo.':'Indicame el nombre del estudio o la conducta.')`;
 s=replaceOnce(s,unknownStudy,universalOrder,'free-universal-study-order');

 // Later clinical-language overlay replaces findStudy again; preserve universal resolution there.
 s=replaceOnce(s,"findStudy=function(text){return negated(language(text))||question(text)?null:match(C?.studies,text);};","findStudy=function(text){if(negated(language(text))||question(text))return null;const n=norm(text),canonical=csStudyCatalog().find(st=>norm(st.id)===n);if(canonical){const own=(C.studies||[]).find(st=>st.id===canonical.id);return own||{...canonical,result:csCaseStudyFallback(canonical,C),universalFallback:true}}const anatomy=csStudyAnatomyId(text);if(anatomy){const st=csStudyCatalog().find(s=>s.id===anatomy);if(st)return {...st,result:csCaseStudyFallback(st,C),universalFallback:true}}const native=match(C?.studies,text);if(native)return native;const global=match(csStudyCatalog(),text);return global?{...global,result:csCaseStudyFallback(global,C),universalFallback:true}:null;};",'late-language-universal-study-resolution');
 // Continuous Android speech events can re-emit the same finalized result index.
 s=replaceOnce(s,"const csVoice={localActive:false,recognition:null,restarting:false,hearing:false};","const csVoice={localActive:false,recognition:null,restarting:false,hearing:false,sentFinals:new Set(),pendingByIndex:new Map(),pendingText:'',flushTimer:null,lastSentText:'',lastSentAt:0};",'speech-final-index-state');
 s=replaceOnce(s,"r.onstart=()=>{csVoice.hearing=true;csRefreshVoiceButtons()};","r.onstart=()=>{csVoice.sentFinals.clear();csVoice.pendingByIndex.clear();csVoice.pendingText='';csVoice.hearing=true;csRefreshVoiceButtons()};",'speech-new-session-reset');
 s=replaceOnce(s,"r.onresult=e=>{let final='';for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)final+=e.results[i][0].transcript+' ';if(final.trim()&&csVoice.localActive&&!csCoop.radioHeld)sendMessage(final.trim())};","r.onresult=e=>{if(!csVoice.localActive||csCoop.radioHeld)return;const update=csVoiceStageRevisions(csVoice.pendingByIndex,csVoice.sentFinals,e);csVoice.pendingText=update.text;if(update.finalCount)csVoiceReschedule()};",'speech-send-final-once');
 s=replaceOnce(s,"function csEnsureRecognition(){",[csVoiceWord,csVoiceCleanSpeech,csVoiceCleanMicSpeech,csMergeSpeech,csVoiceNovelText,csVoiceStageRevisions,csVoiceCommitRevisions,csVoiceChooseConfirmed].map(fn=>fn.toString()).join('\n')+'\n'+"function csVoiceReschedule(){\n if(csVoice.flushTimer)clearTimeout(csVoice.flushTimer);\n csVoice.flushTimer=setTimeout(csVoiceFlush,1900);\n}\nfunction csVoiceFlush(){\n if(csVoice.flushTimer){clearTimeout(csVoice.flushTimer);csVoice.flushTimer=null}\n const current=csVoice.pendingByIndex.size?csVoiceCommitRevisions(csVoice.pendingByIndex,csVoice.sentFinals):csVoiceCleanSpeech(csVoice.pendingText);\n csVoice.pendingText='';\n if(!current||csCoop.radioHeld)return;\n const now=performance.now(),recent=csVoice.lastSentAt>0&&now-csVoice.lastSentAt<8000;\n const utterance=recent?csVoiceNovelText(csVoice.lastSentText,current):current;\n if(utterance)sendMessage(utterance);\n csVoice.lastSentText=recent?csMergeSpeech(csVoice.lastSentText,current):current;\n csVoice.lastSentAt=now;\n}\nfunction csVoiceQueue(text){\n csVoice.pendingText=csMergeSpeech(csVoice.pendingText,csVoiceCleanSpeech(text));\n csVoiceReschedule()\n}\n"+'function csEnsureRecognition(){','speech-reconcile-cumulative-finals');
 s=replaceOnce(s,"r.onend=()=>{csVoice.hearing=false;csRefreshVoiceButtons();if(csVoice.localActive&&!csCoop.radioHeld&&!csVoice.restarting){csVoice.restarting=true;setTimeout(()=>{csVoice.restarting=false;try{r.start()}catch(e){}},350)}};","r.onend=()=>{csVoiceFlush();csVoice.hearing=false;csRefreshVoiceButtons();if(csVoice.localActive&&!csCoop.radioHeld&&!csVoice.restarting){csVoice.restarting=true;setTimeout(()=>{csVoice.restarting=false;try{r.start()}catch(e){}},350)}};",'speech-flush-on-recognition-end');
 s=replaceOnce(s,"}else{csVoice.localActive=false;try{csVoice.recognition?.stop()}catch(e){}csUpdateMicTrack();toast('Voz local desactivada.')}","}else{csVoice.localActive=false;csVoiceFlush();try{csVoice.recognition?.stop()}catch(e){}csUpdateMicTrack();toast('Voz local desactivada.')}",'speech-flush-on-mic-off');
 let direct=0;s=s.replace(/s\.delay\*1000/g,()=>{direct++;return 'csStudyDurationMs(s)'});if(direct!==1)throw new Error('direct study timing anchor expected 1, got '+direct);
 let lab=0;s=s.replace(/t\.study\.delay\*1000/g,()=>{lab++;return 'csStudyDurationMs(t.study)'});if(lab!==1)throw new Error('lab study timing anchor expected 1, got '+lab);
 const socialExport=`window.nsSocial={state,render,health,connect,register,search,refresh,addFriend:id=>friendAction('friends',id),acceptFriend:id=>friendAction('friends/accept',id),declineFriend:id=>friendAction('friends/decline',id),createRoom,inviteToRoom,joinRoom,declineRoom,removeInvite,cancelRoom,leave,role:()=>room?.role||null,room:()=>room};`;
 const socialExportSafe=`window.nsSocial={state,render,health,connect,register,ensureSession:async()=>{const data=await acquireSession();await refresh();return data.user},search,refresh,addFriend:id=>friendAction('friends',id),acceptFriend:id=>friendAction('friends/accept',id),declineFriend:id=>friendAction('friends/decline',id),createRoom,inviteToRoom,joinRoom,declineRoom,removeInvite,cancelRoom,leave,role:()=>room?.role||null,room:()=>room};`;
 s=replaceOnce(s,socialExport,socialExportSafe,'single-social-session-owner');
 s=replaceOnce(s,"function statePayload(){return{peerId:csV41Challenge?.selfId||'local',x:player.x","function statePayload(){let pid=sessionStorage.getItem('atria.lobby.peer.v2');if(!pid){pid='L_'+Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem('atria.lobby.peer.v2',pid)}return{peerId:pid,x:player.x",'lobby-unique-peer-id-for-network-presence');
 s=replaceOnce(s,"function peerId(){\n    try{\n      if(window.csV41Challenge&&window.csV41Challenge.selfId)return String(window.csV41Challenge.selfId);\n      var k='atria.lobby.peer.v2',v=sessionStorage.getItem(k);\n      if(!v){v='L_'+Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem(k,v)}\n      return v;\n    }catch(_){return 'L_'+Math.random().toString(36).slice(2)}\n  }\n  ","function peerId(){\n    try{\n      if(!window.nsLobby?.active&&window.csV41Challenge&&window.csV41Challenge.selfId)return String(window.csV41Challenge.selfId);\n      var k='atria.lobby.peer.v2',v=sessionStorage.getItem(k);\n      if(!v){v='L_'+Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem(k,v)}\n      return v;\n    }catch(_){return 'L_'+Math.random().toString(36).slice(2)}\n  }\n  ",'lobby-rtc-unique-session-peer');
 s=replaceOnce(s,"const data=await lobbyApi('lobby?after='+state.cursor);if(!state.active||C||sim||epoch!==state.epoch)return;","const data=await lobbyApi('lobby?after='+state.cursor);state._lastServerPollAt=Date.now();state._lastServerPollError=null;if(!state.active||C||sim||epoch!==state.epoch)return;",'lobby-true-poll-timestamp');
 s=replaceOnce(s,"}catch(err){state.status='Lobby reconectando…';renderHud()}finally{state.polling=false}","}catch(err){state._lastServerPollError=String(err?.message||err||'error de conexión');state.status='Lobby reconectando…';renderHud()}finally{state.polling=false}",'lobby-server-poll-errors');
 s=replaceOnce(s,"window.nsLobby.enter=enter;window.nsLobby.renderHud=renderHud;window.nsLobby.renderChat=renderChat;window.nsLobby.openGuardia=openGuardia;window.nsLobby.openPeople=openPeople;","window.nsLobby.enter=enter;window.nsLobby.renderHud=renderHud;window.nsLobby.renderChat=renderChat;window.nsLobby.openGuardia=openGuardia;window.nsLobby.openPeople=openPeople;\nwindow.nsLobbyTransportDiagnostics=()=>{const s=social();return {active:state.active,backendAvailable:!!s.available,backendOrigin:s.endpoint||null,authenticated:!!s.user,serverPollAgeMs:state._lastServerPollAt?Date.now()-state._lastServerPollAt:null,lastServerPollError:state._lastServerPollError||null,visiblePlayers:state.players.size,onlinePlayers:[...state.players.values()].filter(p=>p.online!==false).length,rtc:window.nsLobbyNetStats?.()||null}};",'lobby-transport-readonly-diagnostics');
 s=replaceOnce(s,"async function waitForPartyTransport(roomId){for(let i=0;i<40;i++){if(!state.groupPlan||state.groupPlan.roomId!==roomId)return false;const r=social().room,members=r?.members?.length||0;if(r?.allAccepted&&members>=2){if(csCoop?.connected)return true;await new Promise(res=>setTimeout(res,180));const rr=social().room;if(rr?.allAccepted&&(rr.members?.length||0)>=2){try{csCoop.connected=true}catch(_){}return true}}await new Promise(res=>setTimeout(res,250))}return false}","function roomTransportReady({room,localUserId,connected,channelState}){\n return !!(room?.allAccepted && Array.isArray(room.members) && room.members.length>=2 &&\n room.members.some(p=>p?.userId!==localUserId && p?.online===true) &&\n connected===true && channelState==='open');\n}\n\nasync function waitForPartyTransport(roomId){for(let attempt=0;attempt<40;attempt++){if(!state.groupPlan||state.groupPlan.roomId!==roomId||!state.active)return false;const r=social().room;if(roomTransportReady({room:r,localUserId:uid(),connected:csCoop?.connected,channelState:csCoop?.dc?.readyState}))return true;await new Promise(res=>setTimeout(res,250))}return false}",'party-transport-live-state-requirement');
 s=replaceOnce(s,"if(!r||r.role!=='host'||!p||p.roomId!==r.id||p.started||p.starting||!r.allAccepted||(r.members?.length||0)<2)return;","if(!r||r.role!=='host'||!p||p.roomId!==r.id||p.started||p.starting||!r.allAccepted||(r.members?.length||0)<2||(p.transportRetryAfter&&Date.now()<p.transportRetryAfter))return;",'party-start-backoff-until-live');
 s=replaceOnce(s,"if(!connected){p.starting=false;state.status='Grupo listo · terminando de conectar…';renderHud();return}","if(!connected){p.starting=false;p.transportRetryAfter=Date.now()+15000;state.status='No se confirmó conexión con los compañeros. La sala sigue abierta: reintentá cuando estén en línea.';renderHud();return}",'party-retry-visible-error');
 s=replaceOnce(s,"if(state.groupPlan)state.groupPlan.starting=false;maybeAutoStart()","if(state.groupPlan){state.groupPlan.starting=false;state.groupPlan.transportRetryAfter=0}maybeAutoStart()",'party-manual-retry');
 s=replaceOnce(s,"csCoop.connected=opened&&peers.length>0;if(peers.length&&!opened){opened=true;dc.readyState='open';dc.onopen?.()}if(peers.length)status=peers.length===1?'Conectado con '+peers[0].name:peers.length+' compañeros conectados';else status='Guardia lista · invitá amigos'","csCoop.connected=opened&&live.length>0;if(live.length&&!opened){opened=true;dc.readyState='open';dc.onopen?.()}if(live.length)status=live.length===1?'Conectado con '+live[0].name:live.length+' compañeros conectados';else status=peers.length?'Esperando compañeros en línea…':'Guardia lista · invitá amigos'",'party-connected-only-live-peers');
 s=replaceOnce(s,"results=s.results||[],room=s.room;let html=","results=s.results||[],room=s.room,presenceVerified=!!state._lastServerPollAt&&!state._lastServerPollError&&(Date.now()-state._lastServerPollAt<15000);let html=",'friends-require-fresh-backend-presence');
 s=replaceOnce(s,"else{html+=`<div class=\"nsPeopleAlias\">Conectado como <b>@${e(s.user.handle)}</b></div>`;if(room){","else{html+=`<div class=\"nsPeopleAlias\">Conectado como <b>@${e(s.user.handle)}</b></div>`;if(!presenceVerified)html+='<div class=\"nsPeopleOffline\">Amigos guardados disponibles. No se pudo verificar quién está conectado en el lobby; la presencia se actualizará al restablecer el servidor.</div>';if(room){",'friends-show-server-presence-warning');
 s=replaceOnce(s,"return peopleRow(p,acts)}).join(''):'<div class=\"nsPeopleEmpty\">Todavía no tienes amigos.","return peopleRow(p,acts,presenceVerified?null:('@'+e(p.handle||'jugador')+' · presencia sin verificar'))}).join(''):'<div class=\"nsPeopleEmpty\">Todavía no tienes amigos.",'friends-cache-never-falsely-online');
 // Host may only enter after an authenticated ACK from every guest already polling the real room.
 // Server envelopes carry sender identity: no client-supplied identity is trusted.

 s=replaceOnce(s,
  "function maybeAutoStart(){",
  "window.nsLobbyPartyPacket=function(packet,from,roomId){const room=social().room;if(!room||room.id!==roomId||packet.roomId!==roomId||!room.allAccepted||!room.members?.some(p=>p.userId===from)||!['coop','competitive'].includes(room.mode)||packet.mode!==room.mode)return;if(packet.type==='atria_party_prepare'&&from===room.hostUserId&&room.role!=='host'&&state.active){if(csCoop?.dc?.readyState==='open')csCoop.dc.send(JSON.stringify({type:'atria_party_ready',roomId,mode:room.mode,token:packet.token}));state.status='Preparación confirmada · esperando inicio compartido';renderHud()}else if(packet.type==='atria_party_ready'&&room.role==='host'&&from!==uid()){const h=state.partyHandshake;if(!h||h.roomId!==roomId||h.token!==packet.token||!h.expected.has(from))return;h.acks.add(from);if(h.acks.size===h.expected.size){state.partyHandshake=null;h.finish(true)}}};\nasync function waitForPartyAcknowledgement(roomId){const r=social().room;if(!r||r.id!==roomId||r.role!=='host'||!r.allAccepted||csCoop?.dc?.readyState!=='open')return false;const expected=new Set(r.members.filter(p=>p.userId!==uid()).map(p=>p.userId));if(!expected.size)return false;const token='START_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);return new Promise(resolve=>{let done=false;const finish=ok=>{if(done)return;done=true;if(state.partyHandshake===pending)state.partyHandshake=null;resolve(ok)};const pending={roomId,token,expected,acks:new Set(),finish};state.partyHandshake=pending;setTimeout(()=>finish(false),12000);try{csCoop.dc.send(JSON.stringify({type:'atria_party_prepare',roomId,mode:r.mode,token}))}catch(_){finish(false)}})}\nfunction maybeAutoStart(){",
  'party-host-waits-for-live-guest-ack');
 s=replaceOnce(s,
  "p.started=true;p.starting=false;window.nsPractice?.setMode?.(p.mode);",
  "if(!await waitForPartyAcknowledgement(r.id)){p.starting=false;p.transportRetryAfter=Date.now()+15000;state.status='El compañero no confirmó la preparación. La sala sigue abierta para reintentar.';renderHud();return}if(!state.active||state.groupPlan!==p||social().room?.id!==r.id){p.starting=false;return}p.started=true;p.starting=false;window.nsPractice?.setMode?.(p.mode);",
  'party-do-not-enter-before-guest-ack');
 // Room start/snapshot carries the complete authored clinical snapshot, often > 6 KB.
 // Compress losslessly and frame over existing authenticated QA room messages.
 // Keep server cap intact; reject untrusted chunks (sender verified from server envelope).
 s=replaceOnce(s,'function attach(r){',[csPartyEncode,csPartyDecode,b64toBytes].map(fn=>fn.toString()).join('\n')+'\nfunction attach(r){','party-lossless-payload-codec');
 s=replaceOnce(s,
  "const queue=[];csCoop.remotes=csCoop.remotes||{};",
  "const queue=[],fragmentMap=new Map();csCoop.remotes=csCoop.remotes||{};",
  'party-fragment-buffer-per-room');
 s=replaceOnce(s,
  "send(value){if(closed)return;const data=JSON.parse(value);if(data.type==='state'||data.kind==='snapshot'){",
  "send(value){if(closed)return;const data=JSON.parse(value);if(data.type==='cs_room_v411'&&['start','snapshot'].includes(data.kind)&&String(value).length>4500){const id='room_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);void csPartyEncode(value,r.id,id).then(parts=>{if(closed)return;for(const part of parts)queue.push(part);drain()}).catch(err=>{status='Guardia sin sincronizar: '+String(err?.message||err);render()});return}if(data.type==='state'||data.kind==='snapshot'){",
  'party-encode-large-clinical-start');
 s=replaceOnce(s,
  "for(const m of data.messages)dc.onmessage?.({data:JSON.stringify(m.data)});cursor=data.cursor;",
  "for(const m of data.messages){const packet=m.data;if(packet?.type==='atria_room_fragment'){if(m.userId!==r.hostUserId||packet.roomId!==r.id||packet.codec!=='gzip'||typeof packet.id!=='string'||packet.id.length>100||!Number.isInteger(packet.total)||packet.total<1||packet.total>90||!Number.isInteger(packet.index)||packet.index<0||packet.index>=packet.total||typeof packet.data!=='string'||packet.data.length>3600)continue;const key=m.userId+':'+packet.id;let fragment=fragmentMap.get(key);if(!fragment){fragment={parts:Array(packet.total).fill(null),at:Date.now(),count:0};fragmentMap.set(key,fragment)}if(fragment.parts.length!==packet.total)continue;if(fragment.parts[packet.index]===null){fragment.parts[packet.index]=packet.data;fragment.count++}if(fragment.count===packet.total){fragmentMap.delete(key);try{const full=await csPartyDecode(fragment.parts);dc.onmessage?.({data:JSON.stringify(full)})}catch(err){status='No se pudo reconstruir la guardia compartida: '+String(err?.message||err);render()}}continue}if(packet?.type==='state'&&m.userId===own)continue;dc.onmessage?.({data:JSON.stringify(packet)})}for(const [key,frag] of fragmentMap)if(Date.now()-frag.at>45000)fragmentMap.delete(key);cursor=data.cursor;",
  'party-reassemble-verified-server-fragments');
 s=replaceOnce(s,
  "for(const m of data.messages){const packet=m.data;if(packet?.type==='atria_room_fragment')",
  "for(const m of data.messages){const packet=m.data;if(packet?.type==='atria_party_prepare'||packet?.type==='atria_party_ready'){window.nsLobbyPartyPacket?.(packet,m.userId,r.id);continue}if(packet?.type==='atria_room_fragment')",
  'party-forward-authenticated-start-acks');
 // Social bootstrap is idempotent: acquire/resume the profile instead of racing a second registration.
 const oldEnsureSocial=`async function ensureSocial(){try{await nsSocial?.health?.();let s=social();if(!s.available){state.status='Lobby local · el servidor social no está conectado.';return false}if(!s.user){const raw=(csProfile?.name||'medico').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,22)||'medico';const alias=raw.length>=3?raw:(raw+'_med').slice(0,22);try{await nsSocial.register(alias)}catch(err){state.status='Reconectando tu perfil · '+(err?.message||'sin conexión');return false}s=social()}await nsSocial.refresh();return true}catch(err){state.status='Lobby local · '+(err?.message||'sin conexión');return false}}`;
 const newEnsureSocial=`async function ensureSocial(){try{await nsSocial?.health?.();let s=social();if(!s.available){state.status='Lobby local · el servidor social no está conectado.';return false}if(!s.user){await nsSocial.ensureSession();s=social()}if(!s.user){state.status='Lobby local · perfil social no disponible.';return false}await nsSocial.refresh();return true}catch(err){console.warn('ATRIA social bootstrap',err);state.status='Lobby local · conexión social temporalmente no disponible.';return false}}`;
 s=replaceOnce(s,oldEnsureSocial,newEnsureSocial,'idempotent-social-bootstrap');
 s=replaceOnce(s,"  window.fetch=async function(input,init){\n    try{\n      var raw=typeof input==='string'?input:(input&&input.url)||'',u=new URL(raw,location.href);\n      var method=String((init&&init.method)||((input&&input.method)||'GET')).toUpperCase();\n      if(u.origin===location.origin&&u.pathname==='/api/lobby/state'&&method==='POST'){\n        var now=performance.now();\n        if(now-net.lastLegacyState<5000)return new Response(JSON.stringify({ok:true,transport:'rtc'}),{status:200,headers:{'Content-Type':'application/json'}});\n        net.lastLegacyState=now;return originalFetch(input,init);\n      }\n      if(u.origin===location.origin&&u.pathname==='/api/lobby'&&method==='GET'){\n        var now2=performance.now();\n        if(now2-net.lastLegacyLobby<2400)return new Response(JSON.stringify({players:legacyPlayers([]),messages:[],cursor:Number(u.searchParams.get('after')||0)}),{status:200,headers:{'Content-Type':'application/json'}});\n        net.lastLegacyLobby=now2;\n        try{\n          var rr=await originalFetch(input,init),d=await rr.clone().json();mergeRoster(d.players||[]);d.players=legacyPlayers(d.players||[]);\n          return new Response(JSON.stringify(d),{status:rr.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});\n        }catch(_){return new Response(JSON.stringify({players:legacyPlayers([]),messages:[],cursor:Number(u.searchParams.get('after')||0)}),{status:200,headers:{'Content-Type':'application/json'}})}\n      }\n    }catch(_){}\n    return originalFetch(input,init);\n  };\n\n","  // Leave window.fetch unchanged: the authenticated lobby API is authoritative.\\n  // RTC merely accelerates position updates, never fabricates HTTP responses.\\n\\n",'lobby-remove-fabricated-fetch-responses');
 s=replaceOnce(s,"if(!state.demo&&!state.polling&&(state._lastPoll||0)+320<t)","if(!state.demo&&!state.polling&&(state._lastPoll||0)+900<t)",'lobby-bounded-server-poll');
 s=replaceOnce(s,"  async function discovery(){\n    if(net.discovering||!window.nsLobby||!window.nsLobby.active)return;\n    net.discovering=true;\n    try{\n      var p=localState();\n      var jobs=[p?api('POST',{presence:p}):Promise.resolve(null),api('GET',null,'?roster=1')];\n      var rr=await Promise.allSettled(jobs);\n      if(rr[1]&&rr[1].status==='fulfilled'){var d=rr[1].value;mergeRoster(d.players||[])}\n    }catch(_){}finally{net.discovering=false}\n  }\n","  async function discovery(){\n    if(net.discovering||!window.nsLobby||!window.nsLobby.active||performance.now()<(net.retryAt||0))return;\n    net.discovering=true;\n    try{\n      // RTC is an OPTIONAL accelerator. Never fabricate network success or block the social lobby.\n      // Check GET first, so an unhealthy signaling service is not hit with redundant POST writes.\n      var d=await api('GET',null,'?roster=1');\n      if(!Array.isArray(d.players))throw Error('RTC roster missing players');\n      mergeRoster(d.players);net.syncFailures=0;net.retryAt=0;net.lastSyncError=null;\n      var p=localState();if(p)api('POST',{presence:p}).catch(function(e){net.lastPostError=String(e?.message||e)});\n    }catch(err){\n      net.syncFailures=Math.min(6,(net.syncFailures||0)+1);\n      net.retryAt=performance.now()+Math.min(60000,5000*Math.pow(2,net.syncFailures-1));\n      net.lastSyncError=String(err?.message||err);\n    }finally{net.discovering=false}\n  }\n",'rtc-roster-500-bounded-backoff-and-server-first');
 s=replaceOnce(s,"window.nsLobbyNetStats=function(){return {version:net.version,id:myId(),remotes:net.remotes.size,roster:net.roster.size,peers:window.nsLobbyRtcStats()}};","window.nsLobbyNetStats=function(){return {version:net.version,remotes:net.remotes.size,roster:net.roster.size,syncFailures:net.syncFailures||0,retryInMs:Math.max(0,Math.ceil((net.retryAt||0)-performance.now())),lastSyncError:net.lastSyncError||null,peers:window.nsLobbyRtcStats()}};",'rtc-readonly-health-diagnostics');
 // The legacy RTC lobby installed a second permanent RAF/network scheduler. Keep one owner: nsLobby tick.
 const rtcStatsAnchor=`window.nsLobbyRtcStats=function(){var out=[];net.peers.forEach(function(r,id){out.push({id:id,peerId:r.peerId,open:!!r.open,connecting:!!r.connecting,state:r.pc&&r.pc.connectionState||'none',channel:r.dc&&r.dc.readyState||'none'})});return out};`;
 const rtcStatsSafe=rtcStatsAnchor+`\n  window.nsLobbyRtcStop=function(){net.peers.forEach(function(r){try{if(r.dc)r.dc.close()}catch(_){}try{if(r.pc)r.pc.close()}catch(_){}});net.peers.clear();net.roster.clear();net.remotes.clear();net.discovering=false;net.lastDiscovery=0;net.lastRtcSend=0;net.lastFrame=0};`;
 s=replaceOnce(s,rtcStatsAnchor,rtcStatsSafe,'rtc-lobby-cleanup');
 const deactivateAnchor=`function deactivate({notify=true}={}){state.epoch++;if(!state.active)return;state.active=false;`;
 s=replaceOnce(s,deactivateAnchor,`function deactivate({notify=true}={}){state.epoch++;if(!state.active)return;state.active=false;window.nsLobbyRtcStop?.();`,'rtc-cleanup-on-lobby-leave');
 const rtcStart=`setTimeout(discovery,250);requestAnimationFrame(animate);`;
 s=replaceOnce(s,rtcStart,`// RTC discovery is driven conservatively from the primary lobby scheduler; no second permanent RAF.\n  window.nsLobbyRtcPulse=function(ts){if(!window.nsLobby?.active)return;ts=Number(ts)||performance.now();if(ts-net.lastRtcSend>=220){net.lastRtcSend=ts;var p=localState();if(p)sendRtc(p)}if(ts-net.lastDiscovery>=2500){net.lastDiscovery=ts;discovery()}};`,'single-lobby-scheduler');
 const socialPulse=`if((state._lastSocial||0)+1000<t){state._lastSocial=t;nsSocial?.refresh?.().then(()=>{renderHud();if(document.getElementById('nsLobbyGuard')?.classList.contains('show')&&social().room)openWaitingRoom()}).catch(()=>{})}`;
 s=replaceOnce(s,socialPulse,`if((state._lastSocial||0)+2500<t){state._lastSocial=t;nsSocial?.refresh?.().then(()=>{renderHud();if(document.getElementById('nsLobbyGuard')?.classList.contains('show')&&social().room)openWaitingRoom()}).catch(()=>{})}window.nsLobbyRtcPulse?.(t)`,'bounded-social-rtc-pulse');
 // The second lobby RAF was retired. Wire incoming RTC targets into the ONE surviving lobby tick;
 // otherwise its server-only targets update every ~900 ms and remote avatars crawl or jump.
 s=replaceOnce(s,
  "var now=performance.now(),old=net.remotes.get(p.userId),seq=Number(p.seq)||0;",
  "var now=performance.now(),old=net.remotes.get(p.userId),seq=Number(p.seq)||0; if(old&&old.rtc!==(source==='rtc'))old=null;",
  'lobby-remote-transport-independent-sequences');
 s=replaceOnce(s,
  "window.nsLobbyRtcPulse=function(ts){if(!window.nsLobby?.active)return;ts=Number(ts)||performance.now();if(ts-net.lastRtcSend>=220){net.lastRtcSend=ts;var p=localState();if(p)sendRtc(p)}if(ts-net.lastDiscovery>=2500){net.lastDiscovery=ts;discovery()}};",
  "window.nsLobbyRtcHasFresh=function(id){var r=net.remotes.get(id),peer=net.peers.get(id);return !!(r&&r.rtc&&peer?.open&&peer.dc?.readyState==='open'&&performance.now()-r.at<650)};\n  window.nsLobbyRtcPulse=function(ts){if(!window.nsLobby?.active)return;ts=Number(ts)||performance.now();var map=window.nsLobby.players;net.remotes.forEach(function(r,id){if(!window.nsLobbyRtcHasFresh(id)||!(map instanceof Map))return;var q=map.get(id);if(!q)return;var age=Math.max(0,Math.min(.15,(ts-r.at)/1000));q._tx=r.tx+(r.data?.moving?r.vx*age:0);q._ty=r.ty+(r.data?.moving?r.vy*age:0);q._vx=r.data?.moving?r.vx:0;q._vy=r.data?.moving?r.vy:0;q._seen=r.at;q.dir=r.data?.dir||q.dir;q.moving=!!r.data?.moving;q.walkPhase=Number(q.walkPhase)||0});if(ts-net.lastRtcSend>=100){net.lastRtcSend=ts;var p=localState();if(p)sendRtc(p)}if(ts-net.lastDiscovery>=2500){net.lastDiscovery=ts;discovery()}};",
  'lobby-rtc-sampled-in-single-render-owner');
 s=replaceOnce(s,
  "for(const p of data.players||[]){if(p.userId===mine)continue;const old=state.players.get(p.userId)||{};next.set(p.userId,",
  "for(const p of data.players||[]){if(p.userId===mine)continue;const old=state.players.get(p.userId)||{};if(window.nsLobbyRtcHasFresh?.(p.userId)&&Number.isFinite(old._tx)){next.set(p.userId,{...old,...p,x:old.x,y:old.y,_tx:old._tx,_ty:old._ty,_vx:old._vx,_vy:old._vy,_seen:old._seen,moving:old.moving,dir:old.dir,walkPhase:old.walkPhase});continue}next.set(p.userId,",
  'lobby-server-fallback-not-override-fresh-rtc');


 // Both local and remote sprites use drawSprite; walkPhase must reflect displayed travel,
 // not network packet cadence. advanceActor advances the local phase by traveledPx / 18.
 s=replaceOnce(s,
  "for(const q of state.players.values()){const k=Math.min(1,dt*9),",
  "for(const q of state.players.values()){const beforeX=q.x,beforeY=q.y;const k=Math.min(1,dt*9),",
  'lobby-remote-step-origin');
 s=replaceOnce(s,
  "if(Number.isFinite(y))q.y+=(y-q.y)*k}}catch(_){}",
  "if(Number.isFinite(y))q.y+=(y-q.y)*k;const step=Math.hypot(q.x-beforeX,q.y-beforeY);q.walkPhase=(Number(q.walkPhase)||0)+step/18;q.moving=step>.05}}catch(_){}",
  'lobby-visible-distance-drives-footsteps');
 const activationText='Activa una vez tu perfil social. El alias parte del nombre de tu personaje.';
 const activationAt=s.indexOf(activationText);if(activationAt<0)throw new Error('integration anchor missing: people-auto-presence');
 const activationStart=s.lastIndexOf("else if(!s.user){",activationAt),activationEnd=s.indexOf("}\n else{",activationAt);if(activationStart<0||activationEnd<0)throw new Error('integration anchor malformed: people-auto-presence');
 s=s.slice(0,activationStart)+"else if(!s.user){html+='<div class=\"nsPeopleOffline\">Conectando tu perfil automáticamente…</div>';nsSocial?.ensureSession?.().then(()=>{if(document.getElementById('nsPeopleModal')?.classList.contains('show'))openPeople()}).catch(()=>{})}"+s.slice(activationEnd+1);
 // Smooth the legacy 220 ms guard-network snapshots at render cadence instead of drawing raw packet positions.
 const rawRemote=`function csDrawRemote(){
 const r=csCoop.remote;if(!csCoop.connected||!r||!C||r.caseId!==C.id)return;
 const key=r.coat?'coat':(r.color||'navy'),im=csVariantImgs[key]||csVariantImgs.navy;if(!im?.complete)return;
 const actor={x:r.x||0,y:r.y||0,dir:r.dir||'S',moving:!!r.moving,walkPhase:r.walkPhase||0};drawSprite(im,actor,60);csDrawNameplate(actor,r.name||'Compañero',r.level||1,true)
}`;
 const smoothRemote=`let csRemotePose=null,csRemoteLegs=null;
function csRemoteVisual(r,now=performance.now()){if(!csRemotePose){csRemotePose={x:Number(r.x)||0,y:Number(r.y)||0,fromX:Number(r.x)||0,fromY:Number(r.y)||0,toX:Number(r.x)||0,toY:Number(r.y)||0,at:now}}if(csRemotePose.toX!==(Number(r.x)||0)||csRemotePose.toY!==(Number(r.y)||0)){const p=csRemoteVisualSample(now);csRemotePose={x:p.x,y:p.y,fromX:p.x,fromY:p.y,toX:Number(r.x)||0,toY:Number(r.y)||0,at:now}}return csRemoteVisualSample(now)}
function csRemoteVisualSample(now=performance.now()){const p=csRemotePose;if(!p)return{x:0,y:0};const t=Math.max(0,Math.min(1,(now-p.at)/220)),e=t*t*(3-2*t);return{x:p.fromX+(p.toX-p.fromX)*e,y:p.fromY+(p.toY-p.fromY)*e}}
function csDrawRemote(){
 const r=csCoop.remote;if(!csCoop.connected||!r||!C||r.caseId!==C.id){csRemotePose=null;csRemoteLegs=null;return}
 const key=r.coat?'coat':(r.color||'navy'),im=csVariantImgs[key]||csVariantImgs.navy;if(!im?.complete)return;
 const p=csRemoteVisual(r),prev=csRemoteLegs,step=prev?Math.hypot(p.x-prev.x,p.y-prev.y):0,phase=(prev?.phase||0)+step/18;csRemoteLegs={x:p.x,y:p.y,phase};const actor={x:p.x,y:p.y,dir:r.dir||'S',moving:step>.05,walkPhase:phase};drawSprite(im,actor,60);csDrawNameplate(actor,r.name||'Compañero',r.level||1,true)
}`;
 s=replaceOnce(s,rawRemote,smoothRemote,'guard-remote-interpolation');
 // Shared 2-4 player rooms override the legacy renderer/sender later in the golden master.
 // Wire smoothing/backpressure into that actual override as well, keyed per peer.
 const sharedWireOld=`if(parsed?.type==='state'&&parsed.roomId===challenge.id&&parsed.name){csCoop.remotes=csCoop.remotes||{};const pid=parsed.peerId||parsed._fromPeerId;if(pid)csCoop.remotes[pid]={...(csCoop.remotes[pid]||{}),...parsed,online:true}}`;
 const sharedWireNew=`if(parsed?.type==='state'&&parsed.roomId===challenge.id&&parsed.name){csCoop.remotes=csCoop.remotes||{};const pid=parsed.peerId||parsed._fromPeerId;if(pid&&pid!==selfId&&parsed.userId!==window.nsSocial?.state?.()?.user?.id){const prev=csCoop.remotes[pid],seq=Number(parsed.stateSeq)||0;if(!prev||!seq||seq>Number(prev.stateSeq||0))csCoop.remotes[pid]={...(prev||{}),...parsed,online:true}}}`;
 s=replaceOnce(s,sharedWireOld,sharedWireNew,'shared-room-stale-state-rejection');
 const sharedSendOld=`csSendPeerState=function(){if(!shared())return oldPeerSend.apply(this,arguments);const p=ownsCurrent()?currentPatient():null;try{if(csCoop?.dc?.readyState==='open')csCoop.dc.send(JSON.stringify({type:'state',peerId:selfId,roomId:challenge.id,x:player.x,y:player.y,dir:player.dir,moving:player.moving,walkPhase:player.walkPhase,name:name(),level:csLevel(),color:csProfile?.scrubColor,coat:!!(csProfile?.coatUnlocked&&csProfile?.coatEquipped),caseId:p?.caseId||null,patientUid:p?.uid||null,patientName:p?.instance?.name||null,patientAge:p?.instance?.age||null,bedId:p?.instance?.bedId||null,bedLabel:p?.instance?.bed?.label||null,assignmentMode:challenge.mode,radio:!!csCoop.radioHeld,voice:!!csVoice.localActive}))}catch(_){}};`;
 const sharedSendNew=`let csSharedStateSeq=0;const csSharedRemotePose=new Map();csSendPeerState=function(){if(!shared())return oldPeerSend.apply(this,arguments);const p=ownsCurrent()?currentPatient():null;try{if(csCoop?.dc?.readyState==='open'&&(csCoop.dc.bufferedAmount||0)<=65536)csCoop.dc.send(JSON.stringify({type:'state',stateSeq:++csSharedStateSeq,peerId:selfId,roomId:challenge.id,x:player.x,y:player.y,dir:player.dir,moving:player.moving,walkPhase:player.walkPhase,name:name(),level:csLevel(),color:csProfile?.scrubColor,coat:!!(csProfile?.coatUnlocked&&csProfile?.coatEquipped),caseId:p?.caseId||null,patientUid:p?.uid||null,patientName:p?.instance?.name||null,patientAge:p?.instance?.age||null,bedId:p?.instance?.bedId||null,bedLabel:p?.instance?.bed?.label||null,assignmentMode:challenge.mode,radio:!!csCoop.radioHeld,voice:!!csVoice.localActive}))}catch(_){}};`;
 s=replaceOnce(s,sharedSendOld,sharedSendNew,'shared-room-state-backpressure-sequence');
 const sharedDrawOld=`csDrawRemote=function(){if(!shared())return oldRemoteDraw.apply(this,arguments);const remotes=Object.values(csCoop.remotes||{});for(const r of remotes){if(!r||r.roomId!==challenge.id)continue;const im=csVariantImgs[r.coat?'coat':r.color||'navy']||csVariantImgs.navy;if(!im?.complete)continue;const actor={x:r.x||0,y:r.y||0,dir:r.dir||'S',moving:!!r.moving,walkPhase:r.walkPhase||0};drawSprite(im,actor,60);csDrawNameplate(actor,r.name||'Compañero',r.level||1,true)}};`;
 const sharedDrawNew=`csDrawRemote=function(){if(!shared()){csSharedRemotePose.clear();return oldRemoteDraw.apply(this,arguments)}const now=performance.now(),remotes=Object.values(csCoop.remotes||{}),live=new Set();for(const r of remotes){if(!r||r.roomId!==challenge.id||r.peerId===selfId||r._fromPeerId===selfId||r.userId===window.nsSocial?.state?.()?.user?.id)continue;const id=String(r.peerId||r._fromPeerId||r.userId||r.name||'remote');live.add(id);let p=csSharedRemotePose.get(id);const tx=Number(r.x)||0,ty=Number(r.y)||0;if(!p)p={x:tx,y:ty,fromX:tx,fromY:ty,toX:tx,toY:ty,at:now,phase:0,lastX:tx,lastY:ty};if(p.toX!==tx||p.toY!==ty){const t=Math.max(0,Math.min(1,(now-p.at)/220)),e=t*t*(3-2*t),x=p.fromX+(p.toX-p.fromX)*e,y=p.fromY+(p.toY-p.fromY)*e;p={x,y,fromX:x,fromY:y,toX:tx,toY:ty,at:now,phase:p.phase||0,lastX:p.lastX??x,lastY:p.lastY??y}}const t=Math.max(0,Math.min(1,(now-p.at)/220)),e=t*t*(3-2*t);p.x=p.fromX+(p.toX-p.fromX)*e;p.y=p.fromY+(p.toY-p.fromY)*e;const step=Math.hypot(p.x-(p.lastX??p.x),p.y-(p.lastY??p.y));p.phase=(p.phase||0)+step/18;p.lastX=p.x;p.lastY=p.y;csSharedRemotePose.set(id,p);const im=csVariantImgs[r.coat?'coat':r.color||'navy']||csVariantImgs.navy;if(!im?.complete)continue;const actor={x:p.x,y:p.y,dir:r.dir||'S',moving:step>.05,walkPhase:p.phase};drawSprite(im,actor,60);csDrawNameplate(actor,r.name||'Compañero',r.level||1,true)}for(const id of csSharedRemotePose.keys())if(!live.has(id))csSharedRemotePose.delete(id)};`;
 s=replaceOnce(s,sharedDrawOld,sharedDrawNew,'shared-room-per-peer-interpolation');
 const oldPeer=`function csSendPeerState(){\n if(!csCoop.dc||csCoop.dc.readyState!=='open'||!csProfile)return;`;
 const newPeer=`function csSendPeerState(){\n if(!csCoop.dc||csCoop.dc.readyState!=='open'||!csProfile)return;\n if((csCoop.dc.bufferedAmount||0)>65536)return;`;
 s=replaceOnce(s,oldPeer,newPeer,'peer-backpressure');
 const disabledVoice=` // Player radio needs a voice transport; this release provides clinical data and text only.\n const refreshVoice=csRefreshVoiceButtons;\n csRefreshVoiceButtons=function(){const r=refreshVoice.apply(this,arguments),b=document.getElementById('radioPttBtn');if(b){b.disabled=true;b.hidden=true;b.title='La sala comparte texto y acciones. Radio de voz pendiente.';}return r;};\n csRefreshVoiceButtons();`;
 s=replaceOnce(s,disabledVoice,` // Existing WebRTC audio transport is enabled; task13 handles mic permission priming.\n csRefreshVoiceButtons();`,'social-voice-enable');
 // VoiceV2 (later in the 4.8.6 document) overrides the original mic.
 // Revise the *active* Android recognizer, not only the superseded csVoice.
 s=replaceOnce(s,"const VoiceV2={active:false,rec:null,permissionChecked:false,lastInterim:''};","const VoiceV2={active:false,rec:null,permissionChecked:false,lastInterim:'',pendingByIndex:new Map(),delivered:new Set(),committed:false,aborted:false,commitTimer:null,debugSessions:[],trace:null,traceSeq:0,micClicks:0,startAttempts:0,lastMicEvent:null};",'android-v2-index-buffer');
 const v2Start=s.indexOf('    r.onresult=(ev)=>{'),v2End=s.indexOf('    r.onerror=(ev)=>{',v2Start);
 if(v2Start<0||v2End<0||s.indexOf('    r.onresult=(ev)=>{',v2Start+1)>=0)throw new Error('Android VoiceV2 handler anchor missing or ambiguous');
 s=s.slice(0,v2Start)+"    r.onresult=(ev)=>{\n      if(VoiceV2.rec!==r||VoiceV2.committed||VoiceV2.aborted)return;\n      const update=csVoiceStageRevisions(VoiceV2.pendingByIndex,VoiceV2.delivered,ev,csVoiceChooseConfirmed);\n      csVoiceTraceEventV2(ev,update);\n      let interim='';\n      for(let i=0;i<ev.results.length;i++)if(!ev.results[i].isFinal){\n        const t=String(ev.results[i][0]?.transcript||'').trim();\n        if(t)interim=csMergeSpeech(interim,t);\n      }\n      VoiceV2.lastInterim=interim;\n      voiceUIV2(true,interim||update.text);\n      // Never commit until onend: a final hypothesis can still be revised by Android.\n    };\n"+s.slice(v2End);
 s=replaceOnce(s,'  async function startVoiceV2(){',`  function csVoiceTraceEventV2(ev,update){
    const trace=VoiceV2.trace;if(!trace)return;
    const segments=[];
    for(let i=0;i<Math.min(ev.results?.length||0,8);i++){
      const item=ev.results[i],alternatives=[];
      for(let n=0;n<Math.min(item?.length||1,3);n++){
        const candidate=item?.[n];if(!candidate)continue;
        alternatives.push({text:String(candidate.transcript||'').slice(0,240),confidence:Number(candidate.confidence)||0});
      }
      segments.push({index:i,isFinal:!!item?.isFinal,alternatives,selected:item?.isFinal?csVoiceChooseConfirmed(item):null});
    }
    trace.events.push({resultIndex:Number(ev.resultIndex)||0,segments,staged:String(update.text||'').slice(0,500)});
    if(trace.events.length>24)trace.events.shift();
  }
  window.nsAtriaVoiceReport=()=>JSON.stringify({
    version:'atria-4.8.7-qa',privacy:'Local al dispositivo; no contiene audio grabado ni se envía automáticamente',
    micClicks:VoiceV2.micClicks,startAttempts:VoiceV2.startAttempts,lastMicEvent:VoiceV2.lastMicEvent,
    sessions:VoiceV2.debugSessions.slice(-10)
  },null,2);
  window.nsAtriaVoiceCopyReport=()=>{
    const report=window.nsAtriaVoiceReport();
    const fallback=()=>{if(typeof window.prompt==='function')window.prompt('Copiá el diagnóstico de voz:',report);else toast('No disponible el portapapeles; probá Chrome.')};
    if(navigator.clipboard?.writeText){navigator.clipboard.writeText(report).then(()=>toast('Diagnóstico de voz copiado. Pegalo en el chat de ChatGPT.')).catch(fallback)}
    else fallback();
  };
`+'  async function startVoiceV2(){','android-v2-local-diagnostic');
 s=replaceOnce(s,'  async function startVoiceV2(){','  '+"function voiceV2Commit(){\n    if(VoiceV2.committed||VoiceV2.aborted)return;\n    if(VoiceV2.commitTimer){clearTimeout(VoiceV2.commitTimer);VoiceV2.commitTimer=null}\n    const final=csVoiceCommitRevisions(VoiceV2.pendingByIndex,VoiceV2.delivered);\n    const phrase=final?csVoiceCleanMicSpeech(final):'';\n    if(VoiceV2.trace){VoiceV2.trace.rawFinal=final;VoiceV2.trace.committed=phrase;VoiceV2.trace.status=phrase?'committed':'no-final-result'}\n    VoiceV2.committed=true;VoiceV2.lastInterim='';\n    if(phrase&&!csCoop.radioHeld){\n      const inp=document.getElementById('dieInput');if(inp)inp.value='';\n      sendMessage(phrase);try{csPlaySound('ok')}catch(e){}\n    }\n  }\n  "+'async function startVoiceV2(){','android-v2-single-commit-helper');
 s=replaceOnce(s,"VoiceV2.rec=r; VoiceV2.active=true; VoiceV2.lastInterim=''; VoiceV2.sentThisTurn=false;","VoiceV2.rec=r; VoiceV2.active=true; VoiceV2.lastInterim=''; VoiceV2.committed=false;VoiceV2.aborted=false;VoiceV2.pendingByIndex.clear();VoiceV2.delivered.clear();VoiceV2.trace={id:++VoiceV2.traceSeq,started:new Date().toISOString(),events:[],rawFinal:'',committed:'',status:'listening',error:null};VoiceV2.debugSessions.push(VoiceV2.trace);if(VoiceV2.debugSessions.length>10)VoiceV2.debugSessions.shift();if(VoiceV2.commitTimer)clearTimeout(VoiceV2.commitTimer);VoiceV2.commitTimer=null;",'android-v2-turn-reset');
 s=replaceOnce(s,"    VoiceV2.active=false;\n    try { if(r) cancel?r.abort():r.stop(); } catch(e) {}","    VoiceV2.active=false;VoiceV2.aborted=!!cancel;\n    if(cancel&&VoiceV2.commitTimer){clearTimeout(VoiceV2.commitTimer);VoiceV2.commitTimer=null}\n    try { if(r) cancel?r.abort():r.stop(); } catch(e) {}",'android-v2-cancel');
 s=replaceOnce(s,"      VoiceV2.active=false;voiceUIV2(false);\n      if(code!=='aborted')","      VoiceV2.active=false;VoiceV2.aborted=true;if(VoiceV2.commitTimer){clearTimeout(VoiceV2.commitTimer);VoiceV2.commitTimer=null}voiceUIV2(false);\n      if(code!=='aborted')",'android-v2-error');
 s=replaceOnce(s,"    r.onerror=(ev)=>{\n      const code=","    r.onerror=(ev)=>{\n      if(VoiceV2.rec!==r)return;\n      const code=",'android-v2-stale-error');
 s=replaceOnce(s,"r.onend=()=>{const fallback=!VoiceV2.sentThisTurn?String(VoiceV2.lastInterim||'').trim():'';VoiceV2.active=false;voiceUIV2(false);if(fallback.length>1){sendMessage(fallback);VoiceV2.sentThisTurn=true;}};","r.onend=()=>{if(VoiceV2.rec!==r)return;voiceV2Commit();VoiceV2.active=false;voiceUIV2(false)};",'android-v2-single-send-end');
 // Android may deliver delayed onstart after abort/end; never resurrect a released microphone.
 s=replaceOnce(s,"r.onstart=()=>{VoiceV2.active=true;voiceUIV2(true);","r.onstart=()=>{if(VoiceV2.rec!==r||VoiceV2.aborted||VoiceV2.committed)return;VoiceV2.active=true;voiceUIV2(true);",'android-v2-stale-onstart-guard');
 // Resolve exact anamnesis intentions before fuzzy keywords and case-specific symptom scoring.
 s=replaceOnce(s,'function patientReply(q){',
   [csAnamnesisClassify,csAnamnesisFact].map(fn=>fn.toString()).join('\n')+'\n'+
   "function patientReply(q){\n const fact=csAnamnesisFact(C,q);if(fact){if(!fact.text)return 'No recuerdo ese dato, doctor. ¿Me puede preguntar de otra manera?';if(!sim.intentHistory.some(h=>h.id==='anamnesis:'+fact.intent))sim.intentHistory.push({id:'anamnesis:'+fact.intent,reveal:fact.intent+': '+fact.text,source:fact.source,caseId:C.id});complete('talk');return fact.text;}",
   'live-patient-case-bound-anamnesis');
 // Prevent a response queued in box A from being delivered to box B.
 s=replaceOnce(s,
   "function deliverPatientSpeech(text,localMode=false){sim.chats.patient.push(['doctor',text]);const a=patientReply(text);setTimeout(()=>{if(!sim||sim.caseEnded)return;",
   "function deliverPatientSpeech(text,localMode=false){const activeSim=sim,activeCase=C;sim.chats.patient.push(['doctor',text]);const a=patientReply(text);setTimeout(()=>{if(!sim||sim!==activeSim||C!==activeCase||sim.caseEnded)return;",
   'patient-delayed-answer-case-isolation');
 // Correct the late command adapter: the universal catalog is authoritative, not the current case list.
 s=replaceOnce(s,"nurseSay('No reconozco ese estudio en este caso.');return false;","nurseSay('El estudio no está registrado en el catálogo.');return false;",'late-study-rejection-message');
 s=replaceOnce(s,"const badge=document.getElementById('csRebaseBadge');if(badge)badge.textContent='4.4.0';","const badge=document.getElementById('csRebaseBadge');if(badge)badge.textContent='4.8.7 QA';",'identify-current-qa-preview');
 // The server, not RTC cache, certifies presence. Avoid a misleading "1 online" on HTTP 500.
 s=replaceOnce(s,
  "const {h,n}=overlay(),s=social(),online=1+[...state.players.values()].filter(p=>p.online!==false).length,pending=",
  "const {h,n}=overlay(),s=social(),serverVerified=!!state._lastServerPollAt&&!state._lastServerPollError&&(Date.now()-state._lastServerPollAt<15000),online=serverVerified?1+[...state.players.values()].filter(p=>p.online!==false).length:'—',pending=",
  'lobby-count-requires-server-proof');
 s=replaceOnce(s,
  "state.status='Lobby reconectando…';renderHud()}finally{state.polling=false}",
  "state.status='Sin presencia verificada · '+String(err?.message||'error del servidor').slice(0,72)+' · reintentando';renderHud()}finally{state.polling=false}",
  'lobby-server-error-visible');
 s=replaceOnce(s,
  "if(!r.ok)throw Error(data.error||'No se pudo conectar.');return data}finally{clearTimeout(to)}}\nfunction statePayload()",
  "if(!r.ok)throw Error(typeof data.error==='string'?data.error:'HTTP '+r.status);return data}finally{clearTimeout(to)}}\nfunction statePayload()",
  'lobby-http-status-instead-of-object');

 // Final dispatch is a single source of truth even when Android/Gboard bypasses Web Speech adapters.
 s=replaceOnce(s,"window.nsAtriaNormalizeSpeech=function(text){const raw=String(text||\"\").trim().replace(/\\s+/g,\" \");","window.nsAtriaNormalizeSpeech=function(text){const raw=String(csVoiceCleanSpeech(text)).trim().replace(/\\s+/g,\" \");",'normalize-speech-at-common-send-wrapper');
 s=replaceOnce(s,"function sendMessage(q){const text=String(q||'').trim();","function sendMessage(q){if(String(q||'').trim().toLowerCase()==='/vozdiag'){window.nsAtriaVoiceCopyReport?.();return}const text=String(q||'').trim().startsWith('/')?String(q||'').trim():csVoiceCleanSpeech(q);",'normalize-before-chat-history-and-dialogue');
 // The original csVoice WebSpeech engine also exists in the golden master.
 // Exclusively hand mic ownership to VoiceV2; otherwise two handlers can emit different partials.
 s=replaceOnce(s,
 "    if(VoiceV2.active){ stopVoiceV2(false); return; }\n    const SR=speechCtorV2();",
 "    if(VoiceV2.active){ stopVoiceV2(false); return; }\n    // Disable the legacy mic BEFORE aborting it; its onend must never restart or flush a stale partial.\n    csVoice.localActive=false;csVoice.restarting=false;csVoice.pendingText='';\n    if(csVoice.flushTimer){clearTimeout(csVoice.flushTimer);csVoice.flushTimer=null}\n    csVoice.pendingByIndex?.clear();csVoice.sentFinals?.clear();\n    try{csVoice.recognition?.abort?.()}catch(_){try{csVoice.recognition?.stop?.()}catch(__){}}\n    const SR=speechCtorV2();",
 'v2-exclusive-microphone-ownership');
 // Mirror of csVoice.localActive is reused by V2 voiceUIV2 for HUD/radio state.
 // The legacy onend must NOT interpret that as permission to restart its old recognizer.
 s=replaceOnce(s,
 "if(csVoice.localActive&&!csCoop.radioHeld&&!csVoice.restarting)",
 "if(csVoice.localActive&&!window.__atriaV2OwnsMic&&!csCoop.radioHeld&&!csVoice.restarting)",
 'legacy-voice-onend-must-not-restart-during-v2');
 // An old listener can deliver a late result after its abort/stop.
 s=replaceOnce(s,
 "r.onresult=e=>{if(!csVoice.localActive||csCoop.radioHeld)return;",
 "r.onresult=e=>{if(!csVoice.localActive||window.__atriaV2OwnsMic||csCoop.radioHeld)return;",
 'legacy-mic-ignore-after-v2-ownership');
 s=replaceOnce(s,
 "VoiceV2.rec=r; VoiceV2.active=true; VoiceV2.lastInterim=''; VoiceV2.committed=false;",
 "VoiceV2.rec=r; VoiceV2.active=true; window.__atriaV2OwnsMic=true; VoiceV2.lastInterim=''; VoiceV2.committed=false;",
 'v2-microphone-active-owner');
 s=replaceOnce(s,
 "r.onend=()=>{if(VoiceV2.rec!==r)return;voiceV2Commit();VoiceV2.active=false;voiceUIV2(false)};",
 "r.onend=()=>{if(VoiceV2.rec!==r)return;voiceV2Commit();if(VoiceV2.trace)VoiceV2.trace.ended=new Date().toISOString();VoiceV2.active=false;window.__atriaV2OwnsMic=false;voiceUIV2(false)};",
 'v2-release-mic-on-end');
 s=replaceOnce(s,
 "      VoiceV2.active=false;VoiceV2.aborted=true;if(VoiceV2.commitTimer)",
 "      if(VoiceV2.trace){VoiceV2.trace.error=code;VoiceV2.trace.status='error'}\n      VoiceV2.active=false;window.__atriaV2OwnsMic=false;VoiceV2.aborted=true;if(VoiceV2.commitTimer)",
 'v2-release-mic-on-error');

 // Capture only the local mic. Group radio and all other controls retain their listeners.
 s=replaceOnce(s,
 "  try {\n    // Replace old local-voice behavior; radio/co-op remains independent.",
 "  // Bind at the capture phase: old chat renderers can recreate the microphone button\n  // and reassign onclick, so direct bindings alone cannot guarantee ownership.\n  if(document.addEventListener)document.addEventListener('click',function atriaLocalMicOwner(ev){\n    const button=document.getElementById('voiceLocalBtn');\n    if(!button||!(ev.target===button||button.contains(ev.target)))return;\n    ev.preventDefault();ev.stopImmediatePropagation();\n    VoiceV2.micClicks++;VoiceV2.lastMicEvent=new Date().toISOString();\n    void startVoiceV2();\n  },true);\n"+"  try {\n    // Replace old local-voice behavior; radio/co-op remains independent.",
 'v2-capture-real-mic-button-before-old-target-handlers');
 s=replaceOnce(s,"async function startVoiceV2(){if(csCoop.radioHeld){","async function startVoiceV2(){VoiceV2.startAttempts++;if(csCoop.radioHeld){",'v2-count-button-and-other-start-attempts');

 // Atomic ownership is acquired synchronously, BEFORE awaiting the Android permission primer.
 // A second tap while permission is pending must not initialize another recognizer.
 s=replaceOnce(s,"const VoiceV2={active:false,rec:null,permissionChecked:false,lastInterim:'',pendingByIndex:new Map(),delivered:new Set(),committed:false,aborted:false,commitTimer:null,debugSessions:[],trace:null,traceSeq:0,micClicks:0,startAttempts:0,lastMicEvent:null};","const VoiceV2={active:false,rec:null,permissionChecked:false,lastInterim:'',pendingByIndex:new Map(),delivered:new Set(),committed:false,aborted:false,commitTimer:null,debugSessions:[],trace:null,traceSeq:0,micClicks:0,startAttempts:0,lastMicEvent:null,starting:false,startEpoch:0};",'v2-exclusive-start-state');
 s=replaceOnce(s,"async function startVoiceV2(){VoiceV2.startAttempts++;if(csCoop.radioHeld){","async function startVoiceV2(){VoiceV2.startAttempts++;if(VoiceV2.starting)return;if(csCoop.radioHeld){",'v2-reentrant-tap-guard');
 s=replaceOnce(s,"    if(VoiceV2.active){ stopVoiceV2(false); return; }\n    // Disable","    if(VoiceV2.active){ stopVoiceV2(false); return; }\n    VoiceV2.starting=true;const startEpoch=++VoiceV2.startEpoch;\n    // Disable",'v2-claim-before-permission');
 s=replaceOnce(s,"if(!SR){ toast('Este navegador no ofrece transcripción de voz. Usá Chrome Android actualizado.'); return; }","if(!SR){VoiceV2.starting=false;toast('Este navegador no ofrece transcripción de voz. Usá Chrome Android actualizado.'); return; }",'v2-missing-recognizer-releases-start');
 s=replaceOnce(s,"      await requestMicPermissionV2();","      if(!VoiceV2.permissionChecked)await requestMicPermissionV2();",'v2-prime-mic-permission-once');
 s=replaceOnce(s,"      voiceUIV2(false);return;\n    }\n    if(csCoop.radioHeld)return;const r=new SR();","      if(startEpoch!==VoiceV2.startEpoch)return;VoiceV2.starting=false;voiceUIV2(false);return;\n    }\n    if(startEpoch!==VoiceV2.startEpoch)return;\n    if(csCoop.radioHeld){VoiceV2.starting=false;return}\n    VoiceV2.starting=false;const r=new SR();",'v2-reject-obsolete-permission-continuation');
 s=replaceOnce(s,"    const r=VoiceV2.rec;\n    VoiceV2.active=false;VoiceV2.aborted=!!cancel;","    const r=VoiceV2.rec;\n    VoiceV2.startEpoch++;VoiceV2.starting=false;VoiceV2.active=false;VoiceV2.aborted=!!cancel;",'v2-stop-invalidates-awaiting-activation');
 // The original RTC signaling adapter previously omitted Authorization entirely.
 // Use the same credential as the already-connected social client (QA only).
 s=replaceOnce(s,
  "async function api(method,body,qs){\n    var c=new AbortController()",
  "function csRtcAuth(){try{const obj=JSON.parse(localStorage.getItem('nightShift.social.session.v1@'+location.origin)||'null');return obj?.token?{Authorization:'Bearer '+obj.token}:{}}catch(_){return {}}}\n  async function api(method,body,qs){\n    var c=new AbortController()",
  'rtc-signaling-auth-helper');
 s=replaceOnce(s,
  "headers:body?{'Content-Type':'application/json'}:{},",
  "headers:{...(body?{'Content-Type':'application/json'}:{}),...csRtcAuth()},",
  'rtc-signaling-auth-headers');

 // Existing integration already creates and retains the per-tab peerId.
 // Add sequence IDs after that patch has run; don't replace its stable identity.
 s=replaceOnce(s,
  "return{peerId:pid,x:player.x",
  "return{peerId:pid,seq:(state._qaSeq=(state._qaSeq||0)+1),x:player.x",
  'qa-lobby-monotonic-sequence');

 const phase4Script=String.raw`<script id="atria-phase4-composite-orders">
(function(){
 'use strict';
 if(window.__atriaPhase4Orders)return;
 window.__atriaPhase4Orders=true;
 const prevNatural=nurseNatural,prevInfer=inferRecipient,prevCommand=processCommand,prevUpdate=updateSimulation;
 const normalized=t=>norm(String(t||'').trim());
 const introduction=/^(?:(?:enfermera|enfermero|enfermeria|por favor|solicito|solicitamos|pido|pedimos|quiero pedir|necesito|indico|indicamos|ordenar|orden|solicito estudios? de|solicito estudios?)\s*[,.:]?\s*)+/;
 const explicit=/^(?:enfermera|enfermero|enfermeria|solicito|solicitamos|pido|pedimos|necesito|quiero pedir|indico|indicamos|orden|pedir|ordenar)\b/;
 const ambiguous=/^(?:estudios?|laboratorio|estudios? (?:de )?laboratorio|analisis(?: de sangre)?|antibioticos?|atb|medicamentos?|tratamientos?)$/;
 const ivText=/^(?:(?:dos|2)\s+)?(?:vias?|canaliz(?:a|ar|amos|o)\s+(?:una?\s+)?vias?|acceso\s+venoso|venoclisis|colocar\s+(?:una?\s+)?via)\b/;
 function parse(text){
  const raw=normalized(text);
  if(!raw||String(text).includes('?')||/^(?:no|nunca|evitar|sin)\b/.test(raw)||/\b(?:no administrar|no dar|no pedir|no solicitar|sin medicacion|sin antibioticos)\b/.test(raw))return null;
  const declared=explicit.test(raw),source=raw.replace(introduction,'').replace(/^(?:estudio|estudios de|orden de|ordenar|solicitar|administrar)\s+/,'').replace(/\b(vias?|accesos? venosos?)\s+(ringer|cristaloides|oxigeno)\b/g,'$1, $2').replace(/\b(ringer|cristaloides)\s+(oxigeno)\b/g,'$1, $2');
  if(!declared&&source===raw&&!/[,;]|\s+y\s+/.test(source))return null;
  const parts=source.split(/\s*(?:,|;|\s+y\s+|\s+e\s+|\s+mas\s+)\s*/).map(s=>s.trim()).filter(Boolean);
  if(!parts.length||parts.length>5)return null;
  const result=[];
  for(let phrase of parts){
   phrase=phrase.replace(/^(?:solicito|estudio|estudios de|orden|administrar|poner|dar|canalizar)\s+/,'').trim();
   if(!phrase)continue;
   if(ambiguous.test(phrase)){result.push({kind:'clarify',text:phrase});continue;}
   const via=ivText.test(phrase)&&!/\b(?:via oral|por boca|via intramuscular)\b/.test(phrase);
   if(via){result.push({kind:'iv',count:/^(?:dos|2)\b/.test(phrase)?2:1,text:phrase});continue;}
   const study=typeof findStudy==='function'&&C?.studies?findStudy(phrase):null;
   const therapy=typeof findMonitorTherapy==='function'&&C?findMonitorTherapy(phrase):null;
   const intervention=typeof findIntervention==='function'&&C?findIntervention(phrase):null;
   if(study){result.push({kind:'study',id:study.id,text:phrase});continue;}
   if(therapy||intervention){result.push({kind:'therapy',id:(intervention||therapy).id,text:phrase});continue;}
   result.push({kind:'unknown',text:phrase});
  }
  return declared||result.length>1?result:null;
 }
 window.csNursingParse487=parse;
 function run(text){
  const parts=parse(text);
  if(!parts)return prevNatural.apply(this,arguments);
  if(!mayTreat()){nurseSay('No tenés permiso para ordenar estudios o tratamientos en este paciente. Podés consultar su información.');return false;}
  let accepted=false;const seen=new Set();
  for(const item of parts){
   const key=item.kind+':'+(item.id||item.text);
   if(seen.has(key))continue;seen.add(key);
   if(item.kind==='clarify'){nurseSay('Necesito el nombre del estudio o medicamento específico; no pedí un panel inespecífico.');continue;}
   if(item.kind==='unknown'){nurseSay('No reconocí «'+item.text+'». Los demás pedidos se evalúan por separado.');continue;}
   if(item.kind==='iv'){const done=window.csQueueIV(item.count);accepted=done===true||accepted;continue;}
   if(item.kind==='study'){
    const st=findStudy(item.text);
    if(!st){nurseSay('El estudio solicitado no está disponible para este caso.');continue;}
    const already=sim?.orders?.has(st.id);
    if(already){nurseSay(st.label+' ya fue solicitado; no duplico el pedido.');accepted=true;continue;}
    const done=orderStudy(st);
    accepted=done!==false||accepted;continue;
   }
   if(item.kind==='therapy'){
    // Fluid therapy is a specific IV intervention; a requested access is not a placed access.
    if(item.id==='fluid'&&Number(sim?.venousAccessCount||0)<=0){
     const pending=sim.csPhase4Pending487||(sim.csPhase4Pending487=[]);
     if(!pending.some(x=>x.id==='fluid')){
      pending.push({id:'fluid',text:item.text,uid:sim?.patientInstance?.uid});
      nurseSay('Ringer/cristaloides: pendiente de canalizar la vía. No se administró todavía.');
     }else nurseSay('Ringer ya está pendiente de acceso venoso; no duplico el pedido.');
     accepted=true;continue;
    }
    const t=findMonitorTherapy(item.text),i=findIntervention(item.text);
    if(!t&&!i){nurseSay('La indicación no figura en las opciones clínicas actuales.');continue;}
    const done=prevNatural.call(this,item.text);
    accepted=done!==false||accepted;
   }
  }
  return accepted;
 }
 nurseNatural=function(q){return run.call(this,q)};
 inferRecipient=function(q){const n=normalized(q);if(explicit.test(n)&&parse(q))return 'nurse';return prevInfer.apply(this,arguments)};
 processCommand=function(q){
  const raw=String(q||'').replace(/^\//,'').trim(),n=normalized(raw);
  if(/^(?:enfermera|enfermeria|solicito|solicitamos|pido|ordenar)\b/.test(n)||(/^(?:estudio|orden)\b/.test(n)&&/[,;]|\s+y\s+/.test(n)))return nurseNatural(raw);
  return prevCommand.apply(this,arguments);
 };
 updateSimulation=function(dt){
  const out=prevUpdate.apply(this,arguments),queue=sim?.csPhase4Pending487;
  if(queue?.length&&Number(sim?.venousAccessCount||0)>0&&mayTreat()&&!sim?.caseEnded){
   const item=queue[0];
   if(item.uid===sim.patientInstance?.uid){
    queue.shift();
    if(item.id==='albumin')addMonitorTherapy(item.text);else prevNatural.call(this,item.text);
   }else queue.length=0;
  }
  return out;
 };
})();
</script>
`;
 s=replaceOnce(s,'</body>',phase4Script+'</body>','phase4-nursing-intent-dispatch');
 const phase7Script=String.raw`<script id="atria-phase7-nursing-receipts">
(function(){
 'use strict';
 if(window.__atriaNursingReceipts487)return;
 window.__atriaNursingReceipts487=true;
 const oldNatural=nurseNatural,oldInfer=inferRecipient,oldUpdate=updateSimulation,legacyParse=window.csNursingParse487;
 const ivMeds=new Set(['fluid','albumin','ceftriaxone','metronidazole','imipenem','piptazo','ampicillin','amikacin','gentamicin','fluconazole','amphotericin','transfusion','vasopressor','morphine','ppi']);
 const norm487=v=>norm(String(v||''));
 let sequence=0;
 function csNurseDispatch487(text){
  const n=norm487(text);
  if(!n||String(text).includes('?')||/\b(?:no administrar|no dar|no pedir|no solicitar|sin medicacion)\b/.test(n)||/^(?:no|nunca|evitar)\b/.test(n))return null;
  let items=legacyParse(text);
  if(!items&&/^(?:enfermera|enfermero|solicito|pido|ordenar|necesito)\b/.test(n)){
   const raw=n.replace(/^(?:enfermera|enfermero|solicito|pido|ordenar|necesito)\s*/,'').trim();
   if(raw)items=[{kind:'unknown',text:raw}];
  }
  if(!items)return null;
  return items.map(o=>{
   const phrase=norm487(o.text||'');
   if(/\b(?:canaliz|coloc|pon|poner)\w*.*\b(?:dos|2)\s+vias\b/.test(phrase))return {...o,kind:'iv',count:2,text:o.text,label:'Dos vías venosas'};
   if(/\b(?:opioides?|opiaceos?|analgesicos?|analgesia)\b/.test(phrase)&&!/\b(?:morfina|fentanilo|paracetamol|metamizol)\b/.test(phrase))
    return {...o,kind:'clarify',text:o.text,reason:'Especificá el analgésico u opioide y la dosis; no se administró ninguno.'};
   if(/^(?:albumina|albumin)$/.test(phrase)&&!/\b(?:expandir|administrar|infundir|pasar|necesito)\b/.test(n))return {...o,kind:'clarify',reason:'Especificá si solicitás dosaje de albúmina o administración de albúmina IV.'};
   if(/\b(?:albumina|albumin)\b/.test(phrase)&&!/\b(?:medir|dosar|nivel|analisis|laboratorio)\b/.test(phrase))
    return {...o,kind:'therapy',id:'albumin',text:'albúmina',label:'Albúmina'};
   if(/\b(?:controlar signos|control de presion|tomar signos|signos vitales)\b/.test(phrase))return {...o,kind:'vitals',text:o.text,label:'Control de signos vitales'};
   if(/\b(?:monitorizar|monitorear|conectar monitor)\b/.test(phrase))return {...o,kind:'monitor',text:o.text,label:'Monitor'};
   return o;
  });
 }
 window.csNurse487Parse=csNurseDispatch487;
 function csNurseClinicalStatus487(patient,item){
  if(item.kind==='clarify')return {status:'NEEDS_CLARIFICATION',reason:item.reason||'Necesito especificar la indicación.'};
  if(item.kind==='unknown')return {status:'REJECTED',reason:'No reconocí esta indicación.'};
  if(item.kind==='iv'){
   const actual=Number(patient.venousAccessCount||0);
   return actual>=item.count?{status:'COMPLETED',reason:'Vía venosa permeable'}:{status:'QUEUED',reason:'Canalización pendiente'};
  }
  if(item.kind==='monitor')return patient.monitorConnected?{status:'COMPLETED',reason:'Monitor conectado'}:{status:'QUEUED',reason:'Conexión pendiente'};
  if(item.kind==='vitals')return patient.lastVitalsKnown?{status:'COMPLETED',reason:'Signos registrados'}:{status:'QUEUED',reason:'Control pendiente'};
  if(item.kind==='study'){
   const st=patient.orders?.get(item.id);
   return !st?{status:'REJECTED',reason:'El estudio no fue registrado'}:st.status==='done'?{status:'RESULT_AVAILABLE',reason:'Resultado disponible en historia'}:{status:st.status==='pending'||st.status==='collecting'?'IN_PROGRESS':'QUEUED',reason:'Estudio solicitado; falta el resultado'};
  }
  if(item.kind==='therapy'){
   const administered=(patient.administrationLog||[]).filter(r=>r.id===item.id).length;
   if(administered>item.baselineAdmin)return {status:'COMPLETED',reason:'Administración registrada'};
   if(item.initiallyActive&&administered>0&&administered===item.baselineAdmin)return {status:'COMPLETED',reason:'Administración previamente documentada'};
   const waiting=(patient.csPhase4Pending487||[]).some(q=>q.id===item.id&&q.uid===item.uid);
   if(waiting)return {status:'WAITING',reason:'Falta acceso venoso permeable'};
   if(patient.pendingTherapies?.has(item.id))return {status:'IN_PROGRESS',reason:'Preparación o administración pendiente'};
   if(patient.monitorTherapies?.has(item.id)||patient.interventions?.has(item.id))return {status:'IN_PROGRESS',reason:'Tratamiento indicado; verificando ejecución'};
   return {status:'REJECTED',reason:'No se registró el tratamiento; revisá las condiciones clínicas'};
  }
  return {status:'REJECTED',reason:'Indicación no reconocida'};
 }
 window.csNurse487Status=csNurseClinicalStatus487;
 function csNurseReconcile487(patient,active){
  if(!patient?.csNurse487History?.length)return 0;
  const complete=[];
  for(const receipt of patient.csNurse487History){
   for(const item of receipt.items){
    const next=csNurseClinicalStatus487(patient,item);
    if(item.status===next.status)continue;
    const was=item.status;
    item.status=next.status;item.reason=next.reason;
    if(['COMPLETED','RESULT_AVAILABLE'].includes(next.status)&&!item.notified){
     item.notified=true;
     // Completed before receipt creation is not a newly executed action.
     if(item.preExisting)continue;
     const seen=patient.csNurse487SeenEvents||(patient.csNurse487SeenEvents=new Set());
     const version=item.kind==='therapy'?(patient.administrationLog||[]).filter(r=>r.id===item.id).length:
       item.kind==='iv'?Number(patient.venousAccessCount||0):1;
     const eventKey=item.kind+':'+(item.id||item.text)+':'+next.status+':'+version;
     if(seen.has(eventKey))continue;
     seen.add(eventKey);
     complete.push({name:item.label,status:next.status,uid:receipt.uid,bed:receipt.bed});
    }
   }
  }
  if(!complete.length)return 0;
  const patientName=patient.patientInstance?.name||'Paciente';
  const name=complete.map(v=>v.name).join(', ');
  const msg=complete.map(v=>v.name+(v.status==='RESULT_AVAILABLE'?' — resultado disponible':' — ejecutado')).join('; ');
  const box=complete[0].bed||patient.patientInstance?.bed?.label||'';
  const display='Enfermería · '+(box?box+' · ':'')+name;
  const logs=patient.globalChat||(patient.globalChat=[]);
  if(active&&patient===sim)nurseSay('Doctor, '+msg+'.');
  else logs.push(['nurse',patientName+(box?' · '+box:'')+': '+msg+'.']);
  (patient.events||(patient.events=[])).push({m:patient.gameMinute||0,t:'Enfermería: '+msg});
  toast(display);
  csPlaySound('ok');
  return complete.length;
 }
 window.csNurseReconcile487=csNurseReconcile487;
 function receiptStatusLabel(item){
  return item.label+': '+({
   COMPLETED:'ejecutado',RESULT_AVAILABLE:'resultado disponible',
   IN_PROGRESS:'en curso',WAITING:'pendiente',QUEUED:'solicitado',
   NEEDS_CLARIFICATION:'requiere aclaración',REJECTED:'no ejecutado'
  }[item.status]||'recibido')+(item.status==='WAITING'||item.status==='REJECTED'||item.status==='NEEDS_CLARIFICATION'?' ('+item.reason+')':'');
 }
 nurseNatural=function(input){
  const pieces=csNurseDispatch487(input);
  if(!pieces)return oldNatural.apply(this,arguments);
  if(!mayTreat()){nurseSay('No podés ordenar tratamientos sobre este paciente. Podés consultar su historia y monitor.');return false;}
  const patient=sim;
  const receipt={id:'n487-'+(++sequence),uid:patient?.patientInstance?.uid,bed:patient?.patientInstance?.bed?.label||'',items:[]};
  const seen=new Set();let accepted=false;
  for(const entry of pieces.slice(0,5)){
   const key=entry.kind+':'+(entry.id||entry.text);
   if(seen.has(key))continue;seen.add(key);
   const item={...entry,label:entry.label||entry.id||entry.text,uid:receipt.uid,count:entry.count||1,
    baselineAdmin:(patient.administrationLog||[]).filter(x=>x.id===entry.id).length,
    initiallyActive:entry.kind==='therapy'&&(patient.monitorTherapies?.has(entry.id)||false),
    preExisting:entry.kind==='iv'&&Number(patient.venousAccessCount||0)>=Number(entry.count||1)||
      entry.kind==='study'&&patient.orders?.get(entry.id)?.status==='done'||
      entry.kind==='therapy'&&(patient.monitorTherapies?.has(entry.id)||false),
    status:'RECEIVED',reason:''};
   receipt.items.push(item);
   if(entry.kind==='clarify'||entry.kind==='unknown')continue;
   if(entry.kind==='vitals'){accepted=queueNurse({kind:'vitals',label:'Controlar signos vitales',bedside:true})!==false||accepted;continue;}
   if(entry.kind==='monitor'){accepted=window.csQueueMonitor()!==false||accepted;continue;}
   if(entry.kind==='therapy'&&entry.id==='albumin'&&Number(patient.venousAccessCount||0)>0){
    accepted=addMonitorTherapy('albúmina')!==false||accepted;continue;
   }
   if(entry.kind==='therapy'&&ivMeds.has(entry.id)&&Number(patient.venousAccessCount||0)<=0&&entry.id!=='fluid'){
    const queue=patient.csPhase4Pending487||(patient.csPhase4Pending487=[]);
    if(!queue.some(v=>v.id===entry.id&&v.uid===receipt.uid)){
     queue.push({id:entry.id,text:entry.text,uid:receipt.uid});
    }
    accepted=true;continue;
   }
   const instruction='enfermera '+entry.text;
   accepted=oldNatural.call(this,instruction)!==false||accepted;
  }
  if(!receipt.items.length)return false;
  (patient.csNurse487History||(patient.csNurse487History=[])).push(receipt);
  patient.csNurse487History=patient.csNurse487History.slice(-32);
  for(const item of receipt.items){
   const state=csNurseClinicalStatus487(patient,item);
   item.status=state.status;item.reason=state.reason;
   if(item.preExisting&&['COMPLETED','RESULT_AVAILABLE'].includes(item.status)&&!(item.kind==='therapy'&&(patient.administrationLog||[]).filter(x=>x.id===item.id).length>item.baselineAdmin))item.notified=true;
   if(['COMPLETED','RESULT_AVAILABLE'].includes(item.status)&&!item.notified)item.initialCompletion=true;
  }
  nurseSay('Doctor, recibí '+receipt.items.length+' indicación'+(receipt.items.length===1?'':'es')+'. '+receipt.items.map(receiptStatusLabel).join('; ')+'.');
  for(const item of receipt.items)if(item.initialCompletion){item.status='RECEIVED';delete item.initialCompletion;}
  csNurseReconcile487(patient,true);
  return accepted;
 };
 inferRecipient=function(text){
  if(/^(?:enfermera|enfermero|solicito|pido|necesito|ordenar)\b/.test(norm487(text))&&csNurseDispatch487(text))return 'nurse';
  return oldInfer.apply(this,arguments);
 };
 updateSimulation=function(dt){
  const out=oldUpdate.apply(this,arguments);
  csNurseReconcile487(sim,true);
  for(const rec of shiftSession?.records||[])if(rec?.sim&&rec.sim!==sim&&!rec.remoteOwned)
   csNurseReconcile487(rec.sim,false);
  return out;
 };
})();
</script>`;
 s=replaceOnce(s,'</body>',phase7Script+'</body>','phase7-nurse-audiovisual-receipts');
 s=applyVegaStepCoach487(s);
 s=applyPeritonitis487(s);
 s=applyDiagnosticImpression487(s);
 s=applySurgicalNursing487(s);
 s=applyNurseVoice487(s);
 s=applyNurseExecution487(s);
 s=applyGraceSurvival487(s);
 return s;
}
