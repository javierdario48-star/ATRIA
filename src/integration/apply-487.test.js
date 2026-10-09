import assert from'node:assert/strict';import vm from'node:vm';import fs from'node:fs';import{apply487}from'./apply-487.js';
const src=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'),out=apply487(src);
assert.match(out,/function csStudyCatalog\(\)/,'artifact must build one universal catalog from all case study definitions');
assert.match(out,/function csNormalStudyResult\(st\)/,'artifact must provide a normal fallback for every catalog entry');
assert.match(src,/task7\.js\?v=483/,'golden master must retain legacy task7 fallback loader');
assert.doesNotMatch(out,/task7\.js\?v=483/,'4.8.7 artifact must not load superseded task7 study fallback');
assert.match(src,/task8\.js\?v=482/,'golden master must retain legacy task8 loader');
assert.match(src,/task12\.js\?v=485/,'golden master must retain legacy task12 loader');
assert.doesNotMatch(out,/task8\.js\?v=482/,'4.8.7 artifact must not load legacy task8 DOM poller');
assert.doesNotMatch(out,/task12\.js\?v=485/,'4.8.7 artifact must not load legacy task12 DOM poller');
assert.match(src,/task13\.js\?v=486/,'golden master must retain task13 PTT primer');
assert.doesNotMatch(out,/task13\.js\?v=486/,'4.8.7 artifact must not load task13 because its capture handler preempts task5 group voice');
assert.match(out,/task5\.js\?v=475/,'task5 automatic lobby\/room group voice must remain loaded');
assert.match(out,/universalFallback:true/);
assert.doesNotMatch(out,/id:'universal_'/,'unknown names must never create invented studies');
assert.match(out,/Ese nombre no corresponde a un estudio del catálogo/,'only genuinely unknown studies may be rejected');
assert.doesNotMatch(out,/No pude traducir esa orden/,'recognized study commands must not fall into legacy response');
const orderUpdate=out.match(/function updateOrders\(\)\{[\s\S]*?\}\}\nfunction updateSimulation/)?.[0]||'';
assert.doesNotMatch(orderUpdate,/o\.result/,'study completion notification must not reveal result content');
assert.match(orderUpdate,/Resultado disponible: /,'study completion may record availability only');
const background=out.match(/function csBackgroundResultsV203\(\)\{[\s\S]*?setInterval\(csBackgroundResultsV203/)?.[0]||'';
assert.doesNotMatch(background,/o\.result/,'inactive-patient completion notification must not reveal result content');
assert.match(background,/resultado\$\{newResults===1\?'':'s'\} disponible/,'background notification must announce availability only');
const historyView=out.match(/function historyHTML\(\)\{[\s\S]*?\}\nfunction studiesHTML/)?.[0]||'';
assert.doesNotMatch(historyView,/o\.result/,'chart/history must not reveal study result content');
assert.match(historyView,/Consultá la pestaña Estudios/,'chart must direct the player to Studies for result content');
const studiesView=out.match(/function studiesHTML\(\)\{[\s\S]*?\}\nfunction examHTML/)?.[0]||'';
assert.match(studiesView,/o\.result/,'Studies tab must remain the place that renders result content');
assert.match(out,/function csStudyDurationMs\(s\)/,'every order must use ED-specific duration');assert.match(out,/csStudyDurationMs\(t.study\)/,'lab orders must use ED-specific turnaround');assert.match(out,/csStudyTimeLabel\(o.readyAt\)/,'countdown must render fractional game hours');
assert.match(out,/csCoop\.dc\.bufferedAmount\|\|0\)>65536/);
assert.equal(out.includes('s.delay*1000'),false,'legacy seconds-scale study timing must be gone');
assert.equal(src.includes('universalFallback:true'),false,'golden master must remain immutable');
assert.doesNotMatch(out,/Radio de voz pendiente/,'candidate must not intentionally disable existing WebRTC voice transport');
assert.match(src,/Radio de voz pendiente/,'golden master remains unchanged while candidate removes the disable gate');
assert.match(out,/atria-boot-paint-guard/,'first paint must be guarded before legacy HUD can flash');
assert.match(out,/classList\.add\('atriaBootReady'\)/,'boot guard must release only after splash creation');
assert.doesNotMatch(out,/Reconectando tu perfil/,'automatic social bootstrap must not expose legacy re-registration failure state');
assert.match(out,/window\.nsLobbyRtcPulse=function/,'RTC must be scheduled by the primary lobby lifecycle');
assert.doesNotMatch(out,/setTimeout\(discovery,250\);requestAnimationFrame\(animate\)/,'duplicate permanent RTC RAF must be removed');
assert.match(out,/\+2500<t/,'social refresh must be bounded in the lobby scheduler');
assert.doesNotMatch(out,/Activa una vez tu perfil social/,'People must never require manual social activation');
assert.doesNotMatch(out,/>Activar<\/button>/,'manual social activation control must be removed');
assert.match(out,/Conectando tu perfil automáticamente/,'People should represent automatic presence bootstrap');
assert.match(out,/ensureSession:async\(\)=>\{const data=await acquireSession\(\);await refresh\(\);return data\.user\}/,'social module must expose one idempotent session owner');
assert.match(out,/await nsSocial\.ensureSession\(\)/,'lobby bootstrap must use the shared session owner');
assert.doesNotMatch(out,/nsSocial\?\.register\?\.\(\)\.then/,'People must not race a second registration caller');
assert.equal((out.match(/window\.nsLobbyRtcPulse=function/g)||[]).length,1,'integrated artifact must have exactly one RTC pulse owner');
assert.equal((out.match(/ensureSession:async/g)||[]).length,1,'integrated artifact must have exactly one exported social session owner');
assert.match(out,/lastRtcSend>=100/,'RTC movement sends have bounded 10 Hz cadence');
assert.match(out,/window\.nsLobbyRtcHasFresh=function/,'RTC can provide fresh positions to primary lobby frame');
assert.match(out,/lobby-server-fallback-not-override-fresh-rtc|window\.nsLobbyRtcHasFresh\?\.\(p\.userId\)/,'HTTP snapshots must not override newer RTC positions');
assert.match(out,/lastDiscovery>=2500/,'RTC discovery must be bounded');
assert.match(out,/bufferedAmount\|\|0\)>65536/,'shared-mode data channel must apply backpressure');
assert.match(out,/function csRemoteVisual\(/,'guard renderer must interpolate remote network snapshots');
assert.match(out,/\(now-p\.at\)\/220/,'guard interpolation must bridge the legacy 220 ms network cadence');
const remoteDraw=out.match(/function csDrawRemote\(\)\{[\s\S]*?\n\}/)?.[0]||'';
assert.match(remoteDraw,/const p=csRemoteVisual\(r\)/,'guard renderer must sample the interpolated remote pose');
assert.doesNotMatch(remoteDraw,/actor=\{x:r\.x\|\|0,y:r\.y\|\|0/,'guard renderer must not draw raw remote packet coordinates');
assert.match(out,/const csSharedRemotePose=new Map\(\)/,'shared rooms must keep independent interpolation state per remote peer');
assert.match(out,/stateSeq:\+\+csSharedStateSeq/,'shared room state packets must carry monotonic sequence numbers');
assert.match(out,/seq>Number\(prev\.stateSeq\|\|0\)/,'shared rooms must reject stale sequenced state packets');
assert.match(out,/csCoop\.dc\.bufferedAmount\|\|0\)<=65536/,'shared 2-4 player sender must apply data-channel backpressure');
const sharedDraw=out.match(/csDrawRemote=function\(\)\{if\(!shared\(\)\)[\s\S]*?csSharedRemotePose\.delete\(id\)\}\;/)?.[0]||'';
assert.match(sharedDraw,/Object\.values\(csCoop\.remotes\|\|\{\}\)/,'shared renderer must iterate all remote players');
assert.match(sharedDraw,/actor=\{x:p\.x,y:p\.y/,'shared renderer must draw interpolated per-peer positions');
assert.doesNotMatch(sharedDraw,/actor=\{x:r\.x\|\|0,y:r\.y\|\|0/,'shared renderer must not draw raw packet coordinates');

assert.doesNotMatch(out,/sesión social vencida/i,'integrated artifact must not expose expired-social-session UX');
assert.match(out,/window\.nsLobbyRtcStop=function/,'lobby RTC must expose deterministic teardown');
assert.match(out,/net\.peers\.clear\(\);net\.roster\.clear\(\);net\.remotes\.clear\(\)/,'RTC teardown must release peer and interpolation state');
assert.match(out,/state\.active=false;window\.nsLobbyRtcStop\?\.\(\)/,'leaving lobby must invoke RTC teardown');
console.log('4.8.7 source integration OK');

assert.doesNotMatch(out,/html\+=\\\\`/,'integrated inline JS must not contain escaped template delimiters');
assert.doesNotMatch(out,/nsEnterLobbySafe/,'timeout watchdog must not replace deterministic lobby initialization');
assert.match(out,/window\.nsLobby\.enter=enter/,'integrated artifact must export lobby enter');

assert.match(out,/natural-language-study-orders|const csStudyIntent=/,'artifact must accept natural-language study intent');
for(const verb of ['pedime','solicito','haceme','quiero','ordena','necesito'])assert.match(out,new RegExp(verb),'natural study vocabulary missing '+verb);
assert.match(out,/for\(const h of chosen\.sort/,'one natural sentence must order multiple recognized studies in spoken sequence');
assert.match(out,/seen\.has\(h\.st\.id\)/,'multi-study natural orders must deduplicate canonical studies');

assert.ok(out.includes('findStudy=function(text){if(negated(language(text))||question(text))return null;const n=norm(text),canonical='),'late clinical adapter must prioritize canonical IDs before fuzzy case aliases');
assert.match(out,/const global=match\(csStudyCatalog\(\),text\)/,'late language overlay must resolve universal studies');
assert.doesNotMatch(out,/findStudy=function\(text\)\{return negated\(language\(text\)\)\|\|question\(text\)\?null:match\(C\?\.studies,text\)/,'late overlay must not restore case-only study resolution');
assert.match(out,/sentFinals:new Set\(\)/,'speech recognizer tracks finalized result indexes');
assert.match(out,/delivered.has\(i\)/,'speech recognizer must not resend delivered final result indexes');
assert.match(out,/csVoice\.sentFinals\.clear\(\)/,'speech recognizer resets delivered indexes on new recognition session');
assert.match(out,/csVoice\.pendingByIndex\.clear\(\)/,'new recognition clears staged revisions');

assert.match(out,/function csStudyTimeLabel\(readyAt,now=performance.now\(\)\)/,'pending studies display hours and minutes');

assert.match(out,/id="atria-chat-bottom-anchor"/,'ward transcript positioning override must ship in the artifact');
assert.match(out,/body:not\(\.keyboardOpen\) #chatDock:not\(\.nsLobbyChat\) \.chatRecent\{position:absolute!important;top:auto!important;bottom:calc/,'ward transcript must anchor to composer instead of expanded dock top');
assert.match(out,/body:not\(\.keyboardOpen\) #chatDock\.historyExpanded:not\(\.nsLobbyChat\) \.chatRecent\{top:auto!important/,'expanded history must stay bottom-anchored');
// Ward transcript must remain touch-readable both with and without the virtual keyboard.
const wardRule=out.match(/body:not\(\.keyboardOpen\) #chatDock:not\(\.nsLobbyChat\) \.chatRecent\{display:block!important;max-height:112px!important;[^}]+\}/)?.[0]||'';
assert.ok(wardRule.includes('pointer-events:auto!important'),'ward scroll cannot disable pointer events');
assert.ok(wardRule.includes('touch-action:pan-y!important'),'ward scroll must accept vertical gestures');
assert.ok(out.includes('body.keyboardOpen #chatDock:not(.nsLobbyChat) .chatRecent{display:block!important}'),'keyboard must not hide the ward transcript');
assert.ok(out.includes('#chatDock:not(.nsLobbyChat) .chatRecentLine span{white-space:normal!important;overflow-wrap:anywhere!important}'),'long lines must wrap on phones');
assert.match(out,/function csMergeSpeech\(previous,incoming\)/,'speech must reconcile cumulative finalized fragments');
assert.match(out,/csVoiceStageRevisions\(csVoice.pendingByIndex,csVoice.sentFinals,e\)/,'WebSpeech must replace revisions by result index');
assert.match(out,/if\(update.finalCount\)csVoiceReschedule\(\)/,'final revisions only become chat messages after debounce');
assert.match(out,/r\.onend=\(\)=>\{csVoiceFlush\(\)/,'pending final speech must flush when recognition stops');
const speechStart=out.indexOf('function csVoiceWord(word){'),speechEnd=out.indexOf('function csEnsureRecognition(){',speechStart);
assert.ok(speechStart>=0&&speechEnd>speechStart,'recognizer reconciliation helpers must be embedded');
const sent=[];let clock=1000;const mock={csVoice:{sentFinals:new Set(),pendingByIndex:new Map(),pendingText:'',flushTimer:null,lastSentText:'',lastSentAt:0},csCoop:{radioHeld:false},performance:{now:()=>clock},clearTimeout(){},setTimeout(fn){return fn},sendMessage(value){sent.push(value)}};vm.runInNewContext(out.slice(speechStart,speechEnd),mock);
for(const fragment of ['Hola','Hola qué','Hola qué te','Hola qué te pasó'])mock.csVoiceQueue(fragment);
mock.csVoiceFlush();assert.deepEqual(sent,['Hola qué te pasó'],'progressive Android speech must send exactly one complete utterance');
mock.csVoiceQueue('Pedime hemograma');mock.csVoiceQueue('hemograma y lipasa');mock.csVoiceFlush();assert.deepEqual(sent,['Hola qué te pasó','Pedime hemograma y lipasa'],'overlapping speech segments must not repeat words');
mock.csVoiceQueue('Hola hola');mock.csVoiceFlush();assert.equal(sent.at(-1),'Hola hola','literal spoken repetitions in a single final must be retained');
mock.csVoiceFlush();assert.equal(sent.length,3,'flushing empty buffer must never resend speech');
console.log('4.8.7 Android transcript anchoring and speech reconciliation OK');

assert.doesNotMatch(out,/window.fetch=async function\(input,init\)/,'lobby must never monkey-patch fetch into fabricated success or empty rosters');
assert.match(out,/window.nsLobbyRtcPulse=function/,'bounded RTC acceleration remains active');
assert.match(out,/\+900<t\)/,'authoritative backend lobby polling uses bounded cadence');
assert.match(out,/sessionStorage.getItem\('atria.lobby.peer.v2'\)/,'player presence uses a unique tab-local peer id');
assert.match(out,/csStudyTiming=\{/,'integrated artifact must include complete ED turnaround catalog');
console.log('4.8.7 authoritative lobby transport and ED timing source contract OK');

assert.match(out,/window\.nsLobbyTransportDiagnostics=\(\)=>/,'transport diagnostics must ship without credentials');
assert.match(out,/state\._lastServerPollAt=Date\.now\(\)/,'successful backend polls must be recorded');
assert.match(out,/state\._lastServerPollError=String\(/,'actual lobby failures must be reportable');
assert.match(out,/if\(!window\.nsLobby\?\.active&&window\.csV41Challenge/,'RTC lobby identity must remain independent from room identity');
console.log('real backend diagnostics and tab-local RTC identity OK');

assert.match(out,/net\.syncFailures=Math\.min\(6/,'optional RTC discovery must use bounded backoff on server 500');
assert.match(out,/performance\.now\(\)<\(net\.retryAt\|\|0\)/,'RTC discovery must skip API while backoff active');
assert.match(out,/var d=await api\('GET',null,'\?roster=1'\)/,'unhealthy RTC service must not receive speculative presence POSTs');
assert.match(out,/net\.lastSyncError=String\(/,'RTC failures must remain inspectable');
console.log('optional RTC 500 backoff contract OK');

assert.match(out,/function csVoiceCleanSpeech\(value\)/,'Android echo-cleaner must ship in generated artifact');
assert.match(out,/function csVoiceNovelText\(previous,incoming\)/,'previously emitted phrase must not be resent');
assert.match(out,/csVoice\.lastSentAt<8000/,'recently emitted WebSpeech phrase must be compared across flushes');
clock+=9000;
mock.csVoiceQueue('algún algún hábito algún hábito algún hábito algún hábito te va algún hábito te va con cigarro');
mock.csVoiceFlush();assert.equal(sent.at(-1),'algún hábito te va con cigarro','real Android screen transcript repetition must collapse');
const count=sent.length;clock+=100;
mock.csVoiceQueue('algún hábito te va con cigarro');mock.csVoiceFlush();
assert.equal(sent.length,count,'repeated cumulative Android final after an earlier flush must not be sent twice');
clock+=9000;mock.csVoiceQueue('Hola hola');mock.csVoiceFlush();
assert.equal(sent.at(-1),'Hola hola','explicit doubled words are still permissible in a new utterance');
console.log('WebSpeech final/interim, cumulative fragment and echo-loop artifact tests OK');

const rt=(text,isFinal)=>({0:{transcript:text},isFinal});
clock+=10000;
mock.csVoiceStageRevisions(mock.csVoice.pendingByIndex,mock.csVoice.sentFinals,{resultIndex:0,results:[rt('¿Qué medicación toma?',false)]});
assert.equal(mock.csVoice.pendingByIndex.size,0,'interim hypothesis must never enter committed message');
let update=mock.csVoiceStageRevisions(mock.csVoice.pendingByIndex,mock.csVoice.sentFinals,{resultIndex:0,results:[rt('¿Qué medicación toma?',true)]});
assert.equal(update.text,'¿Qué medicación toma?');
update=mock.csVoiceStageRevisions(mock.csVoice.pendingByIndex,mock.csVoice.sentFinals,{resultIndex:0,results:[rt('¿Qué medicación habitual toma?',true)]});
assert.equal(update.text,'¿Qué medicación habitual toma?','the latest final interpretation must replace an earlier version');
mock.csVoice.pendingText=update.text;mock.csVoiceFlush();
assert.equal(sent.at(-1),'¿Qué medicación habitual toma?','only latest reviewed utterance reaches the patient');
assert.equal(mock.csVoice.sentFinals.size,1);
update=mock.csVoiceStageRevisions(mock.csVoice.pendingByIndex,mock.csVoice.sentFinals,{resultIndex:0,results:[rt('¿Qué medicación habitual toma?',true)]});
assert.equal(update.text,'','already committed result index must not be reprocessed');
console.log('WebSpeech latest-revision-only integration regression OK');

assert.match(out,/function csCaseStudyFallback\(study,currentCase\)/,'case-specific fallback must ship in artifact');
assert.match(out,/result:csCaseStudyFallback\(best,C\)/,'direct study resolver must preserve case-native evidence');
assert.match(out,/result:csCaseStudyFallback\(global,C\)/,'late study overlay must preserve case-native evidence');
assert.match(out,/CASE_INCIDENTAL_FINDINGS/,'incidental results must be authored explicitly, never assigned at random');
console.log('contextual result integration source contract OK');

assert.doesNotMatch(out,/try\{csCoop\.connected=true\}catch/,'never fabricate cooperative connection after a timer');
assert.match(out,/roomTransportReady\(\{room:r,localUserId:uid\(\),connected:csCoop\?\.connected,channelState:csCoop\?\.dc\?\.readyState\}\)/,'guard start checks accepted room and real open transport');
assert.match(out,/csCoop\.connected=opened&&live\.length>0/,'only online room peers can mark a channel connected');
assert.match(out,/transportRetryAfter=Date\.now\(\)\+15000/,'failed room handshake must use backoff and give explicit feedback');
console.log('cooperative room no phantom connected state integration contract OK');

assert.match(out,/presenceVerified=!!state\._lastServerPollAt&&!state\._lastServerPollError/,'friends should distinguish true backend presence from cached user records');
assert.match(out,/Amigos guardados disponibles\. No se pudo verificar quién está conectado/,'friends remain accessible with explicit presence warning');
assert.match(out,/presencia sin verificar/,'offline/cached friend rows must not be labeled presently online without server evidence');
console.log('friend list and backend presence truthfulness contract OK');

// The real Android button is rebound to VoiceV2, not the earlier csVoice handler.
assert.match(out,/const VoiceV2=\{active:false,rec:null,permissionChecked:false,lastInterim:'',pendingByIndex:new Map\(\)/);
const v2=out.slice(out.indexOf('    r.onresult=(ev)=>{'),out.indexOf('    r.onerror=(ev)=>{',out.indexOf('    r.onresult=(ev)=>{')));
assert.ok(v2.includes('csVoiceStageRevisions(VoiceV2.pendingByIndex,VoiceV2.delivered,ev,csVoiceChooseConfirmed)'),'active recognizer uses speech alternatives');
assert.doesNotMatch(v2,/sendMessage\(/,'Android WebSpeech revisions must not directly send transient finals');
assert.ok(out.includes('r.onend=()=>{if(VoiceV2.rec!==r)return;voiceV2Commit();if(VoiceV2.trace)VoiceV2.trace.ended='),'recognition end records provenance after commit');
assert.match(out,/function voiceV2Commit\(\)/);
assert.match(out,/if\(VoiceV2\.committed\|\|VoiceV2\.aborted\)return/);
console.log('active Android VoiceV2 indexed single-commit integration OK');

assert.match(out,/const csExtraStudies=/,'additional medically named studies must be embedded in output');
assert.match(out,/Amilasa sérica: elevada, compatible con la pancreatitis aguda/,'case-specific amylase result must be authored');
assert.match(out,/El estudio no está registrado en el catálogo/,'late order handler uses catalog feedback');
assert.doesNotMatch(out,/No reconozco ese estudio en este caso/,'rejecting studies merely for case mismatch is obsolete');
assert.match(out,/badge\.textContent='4\.8\.7 QA'/,'identify current candidate preview');
console.log('amilasa late command integration and QA preview marker OK');

assert.match(out,/serverVerified=!!state\._lastServerPollAt&&!state\._lastServerPollError/,'online count requires a successful and recent server poll');
assert.match(out,/online=serverVerified\?1\+/,'unverified clients never claim a connected headcount');
assert.match(out,/Sin presencia verificada/,'offline lobby must indicate the server failure');
assert.match(out,/HTTP '\+r\.status/,'backend HTTP errors remain diagnosable without exposing tokens');
console.log('lobby presence integrity and HTTP failure visibility OK');

assert.match(out,/function csStudyAnatomyId\(text\)/,'brain study resolver is included in generated artifact');
assert.match(out,/window\.nsAtriaNormalizeSpeech=function\(text\)\{const raw=String\(csVoiceCleanSpeech\(text\)\)/,'final common dispatch normalizes multi-pass Android echo');
assert.ok(out.includes("const text=String(q||'').trim().startsWith('/')"),'raw chat transcript is normalized before NPC and history');
console.log('brain vs abdominal imaging and final speech dispatch integration OK');

assert.match(out,/csVoice\.localActive=false;csVoice\.restarting=false;csVoice\.pendingText=''/,'only one local SpeechRecognition instance owns the microphone');
assert.match(out,/csVoice\.recognition\?\.abort\?\.\(\)/,'legacy SpeechRecognition must be aborted before VoiceV2 start');
assert.match(out,/window\.__atriaV2OwnsMic=true/,'active local voice engine owns mic');
assert.match(out,/if\(!csVoice\.localActive\|\|window\.__atriaV2OwnsMic\|\|csCoop\.radioHeld\)return/,'stale legacy event cannot send duplicate messages');
console.log('SpeechRecognition mic ownership exclusion integration OK');

assert.match(out,/csVoice\.localActive&&!window\.__atriaV2OwnsMic&&!csCoop\.radioHeld/,'legacy recognizer cannot restart from mirrored V2 UI status');

assert.match(out,/const phrase=final\?csVoiceCleanMicSpeech\(final\):''/,'only finalized results are transmitted');
assert.match(out,/function csRtcAuth\(\)/,'RTC signaling uses existing social bearer credential');
assert.match(out,/headers:\{\.\.\.\(body\?\{'Content-Type':'application\/json'\}:\{\}\),\.\.\.csRtcAuth\(\)\}/,'RTC request carries bearer token');
console.log('mic-only ASR short greetings and secure RTC signaling wiring OK');

assert.match(out,/return\{peerId:pid,seq:\(state\._qaSeq=/,'stable peer ID and monotonic sequence coexist');
assert.match(out,/seq:\(state\._qaSeq=\(state\._qaSeq\|\|0\)\+1\)/,'lobby movement is versioned to reject stale updates');
console.log('QA lobby peer ID and monotonic sequence integration OK');

assert.match(out,/if\(chest&&!abdomen&&ct\)return 'tc_torax'/,'active study resolver must distinguish thoracic CT');
assert.match(out,/if\(chest&&!abdomen&&rx\)return 'rx_torax'/,'active study resolver must distinguish chest radiographs');

assert.doesNotMatch(out,/setTimeout\(voiceV2Commit,6000\)/,'final revisions may never auto-send before recognition ends');

assert.ok(out.includes('function csVoiceChooseConfirmed(result)'),'speech alternatives chooser is embedded');
assert.ok(out.includes('csVoiceStageRevisions(VoiceV2.pendingByIndex,VoiceV2.delivered,ev,csVoiceChooseConfirmed)'),'active Android recognizer uses ASR alternatives');

assert.match(out,/function csVoiceTraceEventV2\(ev,update\)/,'active V2 speech trace is embedded');
assert.match(out,/window\.nsAtriaVoiceReport=\(\)=>JSON\.stringify/,'QA-local diagnostic can be copied without telemetry');
assert.match(out,/window\.nsAtriaVoiceCopyReport=\(\)=>/,'in-game diagnostic is directly available');
assert.match(out,/q\|\|''\)\.trim\(\)\.toLowerCase\(\)==='\/vozdiag'/,'/vozdiag intercepts before NPC and patient dispatch');
assert.doesNotMatch(out,/fetch\(['"]\/api\/(?:voice|transcript|trace)/,'ASR diagnostics must not automatically upload');

assert.match(out,/VoiceV2\.starting=true;const startEpoch=\+\+VoiceV2\.startEpoch/,'voice claims ownership before async permission');
assert.match(out,/if\(!VoiceV2\.permissionChecked\)await requestMicPermissionV2\(\)/,'repeated taps avoid extra getUserMedia');
assert.match(out,/if\(VoiceV2\.starting\)return/,'overlapping click ignored');
assert.match(out,/startEpoch!==VoiceV2\.startEpoch/,'stale permission response rejected');


 // Regression Phase 2: B4 patient sprite must win over overlapping B4 monitor target.
 const cs413Start=out.indexOf(' function cs413PatientAtTap(');
 const cs413Stop=out.indexOf(' openBedsideMonitor=function(anchor){',cs413Start);
 assert.ok(cs413Start>0&&cs413Stop>cs413Start,'effective 4.13 scene must expose patient-specific hit routing');
 const cs413Calls=[];
 const b4={index:3,instance:{uid:'case-B4',bedId:'B4',bed:{patient:[947,424]}}};
 const b3={index:2,instance:{uid:'case-B3',bedId:'B3',bed:{patient:[827,424]}}};
 const cs413={C:{},editorOpen:false,scale:1,handleGameTap:null,pending:null,monitorIntent:null,
   patients:()=>[b3,b4],worldToScreen:(x,y)=>[x,y],
   scene:()=>[{bedId:'B4',x:978,y:391,width:30,height:25},{bedId:'B3',x:830,y:394,width:30,height:25}],
   hit:(x,y,m)=>Math.abs(x-m.x)<=22&&Math.abs(y-m.y)<=22,
   select:(p,monitor)=>cs413Calls.push([p.instance.bedId,monitor]),
   toast:(message)=>cs413Calls.push(['toast',message]),base:{tap:()=>cs413Calls.push(['base'])}};
 vm.runInNewContext(out.slice(cs413Start,cs413Stop),cs413);
 cs413.handleGameTap({clientX:965,clientY:412});
 assert.deepEqual(cs413Calls,[['B4',false]],'overlapping B4 patient sprite must select patient and never open monitor');
 cs413Calls.length=0;cs413.handleGameTap({clientX:978,clientY:391});
 assert.deepEqual(cs413Calls,[['B4',true]],'tapping the real B4 monitor must still open monitor');
 cs413Calls.length=0;cs413.handleGameTap({clientX:827,clientY:424});
 assert.deepEqual(cs413Calls,[['B3',false]],'B3 patient touch must not select the neighboring B4');
 cs413Calls.length=0;cs413.handleGameTap({clientX:830,clientY:394});
 assert.deepEqual(cs413Calls,[['B3',true]],'B3 monitor functionality must be preserved');
 // Every bed's visible patient center resolves to its own entity, not its monitor or neighbor.
 const bedPositions={B1:[97,409],B2:[224,423],B3:[827,424],B4:[947,424],B5:[96,611],B6:[96,794],B7:[946,611],B8:[946,794]};
 const allBeds=Object.entries(bedPositions).map(([id,pos],i)=>({index:i,instance:{uid:'case-'+id,bedId:id,bed:{patient:pos}}}));
 cs413.patients=()=>allBeds;
 for(const patientRecord of allBeds){
   const [x,y]=patientRecord.instance.bed.patient;cs413Calls.length=0;
   cs413.handleGameTap({clientX:x,clientY:y});
   assert.deepEqual(cs413Calls,[[patientRecord.instance.bedId,false]],'patient sprite resolves correct bed '+patientRecord.instance.bedId);
 }
 cs413Calls.length=0;cs413.handleGameTap({clientX:505,clientY:510});
 assert.deepEqual(cs413Calls,[['base']],'tapping an empty region preserves movement/navigation');
 // A current, nearby patient tap opens the existing examination sheet as a read-only view.
 const csSelectStart=out.indexOf(' function select(p,wantMonitor=true){',out.indexOf('// Screen centres measured'));
 const csSelectStop=out.indexOf(' function checkMonitorIntent(){',csSelectStart);
 assert.ok(csSelectStop>csSelectStart,'effective patient selection function must be identifiable');
 const csOpen=[];const csSelect={normalizeRoom(){},normalizeApproach(){},shared:()=>false,nearby:()=>true,
   sim:{patientInstance:{uid:'case-B4'}},shiftSession:{active:true},openEntity:(entity,tab)=>csOpen.push([entity,tab]),
   window:{csLoadShiftRecordV40:()=>csOpen.push(['reload'])},openBedsideMonitor:()=>csOpen.push(['monitor'])};
 vm.runInNewContext(out.slice(csSelectStart,csSelectStop),csSelect);
 csSelect.select(b4,false);
 assert.deepEqual(csOpen,[['patient','exam']],'current patient opens examination without resetting the case');

 // Phase 3: competitors may READ all shared clinical information, but cannot order
 // studies / interventions for an opponent. The host enforces the latter, not just UI.
 assert.match(out,/function csObservationSnapshot\(s,p\)/,'owner must export patient conversation, investigations and medicines');
 assert.match(out,/function csSafeObservation\(o\)/,'host must validate observation payloads');
 assert.match(out,/function csOpenObserver\(index\)/,'read-only spectator view must exist');
 assert.match(out,/window\.csObservePatientV487=csOpenObserver/,'reader should be addressable from patient controls');
 assert.match(out,/observation:csObservationSnapshot\(s,p\)/,'owner progress must include read data');
 assert.match(out,/const observation=csSafeObservation\(m\.progress\?\.observation\)/,'host must validate relayed view');
 assert.match(out,/challenge\.mode==='competitive'\)return csOpenObserver\(index\)/,'competitive opponent opens viewer instead of action helper');
 assert.match(out,/challenge\.mode==='competitive'\)return false;const p=/,'competitive help actions are blocked at originating client');
 assert.match(out,/m\.kind==='assist'&&challenge\.mode!=='competitive'/,'host rejects opponent assist packets in competitive');
 assert.match(out,/csObserverRefreshIfOpen\(\)/,'observation view refreshes on updates');
 assert.match(out,/conversation:\(s\.globalChat\|\|\[\]\)/,'conversation should be included');
 assert.match(out,/orders:\[\.\.\.\(s\.orders\?\.values/,'real study statuses and results should be included');
 assert.match(out,/csOpenObserver\(index\)[\s\S]*p\.vitals/,'monitor data from player must be shown, not guessed');

 // Model-level two-identity QA: shared facts remain viewable, competing interventions denied.
 const observationA=out.indexOf(' function csObservationSnapshot(s,p){');
 const observationB=out.indexOf(' function csOpenObserver(index){',observationA);
 assert.ok(observationA>0&&observationB>observationA,'observation projection and validation must be accessible');
 const observationContext={Map,Set,EXAM_SEGMENTS:{peritonitis:{abdomen:['Abdomen','Defensa abdominal']}}};
 vm.runInNewContext(out.slice(observationA,observationB),observationContext);
 const owner={uid:'room1:P3',caseId:'peritonitis'};
 const ownSim={
  diagnosis:'Peritonitis',disposition:{id:'uti'},intentHistory:[{reveal:'Dolor desde ayer'}],
  examRegions:new Set(['abdomen']),orders:new Map([['hemograma',{label:'Hemograma',status:'done',result:'Leucocitos 16000',requestedBy:'Rival'}]]),
  interventions:new Set(['antibiotico']),administrationLog:[{label:'Ceftriaxona',doseDisplay:'2 g',status:'administrado'}],
  globalChat:[['doctor','¿Desde cuándo te duele?'],['patient','Desde ayer, doctor.']]
 };
 const copied=vm.runInNewContext('csObservationSnapshot',observationContext)(ownSim,owner);
 const accepted=vm.runInNewContext('csSafeObservation',observationContext)(copied);
 assert.ok(accepted&&accepted.uid===owner.uid,'client 2 may read validated client 1 clinical state');
 assert.equal(accepted.orders[0].result,'Leucocitos 16000');
 assert.equal(accepted.conversation[0][1],'¿Desde cuándo te duele?');
 assert.equal(accepted.conversation[1][1],'Desde ayer, doctor.');
 assert.equal(accepted.medications[0].dose,'2 g');
 assert.equal(accepted.exam[0],'Abdomen: Defensa abdominal','viewer sees documented physical findings, not just region IDs');
 assert.equal(vm.runInNewContext('csSafeObservation',observationContext)({...copied,conversation:[['doctor','x'.repeat(501)]]}),null,'oversized remote speech must be rejected');
 assert.equal(vm.runInNewContext('csSafeObservation',observationContext)({...copied,orders:[{label:'fake',status:'wrong',result:'',requestedBy:'x'}]}),null,'unknown remote study status must be rejected');
 const requestAt=out.indexOf(' function requestAssist(index,a){');
 const requestEnd=out.indexOf(' function openAssistPanel(index){',requestAt);
 assert.ok(requestAt>0&&requestEnd>requestAt,'existing coop assist request authority located');
 for(const viewerId of ['guest','host']){
  const accessContext={challenge:{mode:'competitive'},selfId:viewerId};
  vm.runInNewContext(out.slice(requestAt,requestEnd),accessContext);
  assert.equal(vm.runInNewContext('requestAssist',accessContext)(3,{kind:'study',id:'hemograma'}),false,'rival '+viewerId+' must not order tests');
  assert.equal(vm.runInNewContext('requestAssist',accessContext)(3,{kind:'intervention',id:'antibiotico'}),false,'rival '+viewerId+' must not order medicines');
 }
 assert.match(out,/m\.kind==='assist_apply'&&challenge\.mode!=='competitive'/,'owner client must ignore forged competitive intervention delivery');
 assert.match(out,/const observation=csSafeObservation\(m\.progress\?\.observation\);if\(m\.progress\?\.observation&&/,'host must reject bad remote observation before committing state');

 // Phase 4: the original golden master lacks the multi-intent dispatcher.
 assert.doesNotMatch(src,/id="atria-phase4-composite-orders"/);
 assert.match(out,/id="atria-phase4-composite-orders"/,'new clinical dispatcher ships in generated artifact');
 const phase4Start=out.indexOf('<script id="atria-phase4-composite-orders">');
 const phase4End=out.indexOf('</script>',phase4Start);
 assert.ok(phase4Start>0&&phase4End>phase4Start,'phase4 script is uniquely bounded');
 const nursingJS=out.slice(phase4Start+'<script id="atria-phase4-composite-orders">'.length,phase4End);
 new vm.Script(nursingJS);
 const drugs={fluid:{id:'fluid'},oxygen:{id:'oxygen'},ceftriaxone:{id:'ceftriaxone'}};
 const studies={hemograma:{id:'hemograma',label:'Hemograma'},lipasa:{id:'lipasa',label:'Lipasa'},tac:{id:'tac',label:'Tomografía cerebral'}};
 const events=[];
 const sharedSim={orders:new Map(),venousAccessCount:0,monitorTherapies:new Map(),patientInstance:{uid:'case-1'},csPhase4Pending487:[]};
 let permission=true;
 const normalize487=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s,;?]/g,' ').replace(/\s+/g,' ').trim();
 const sampleCtx={window:{csQueueIV:count=>{events.push(['iv',count]);return true;}},C:{studies:Object.values(studies)},
  sim:sharedSim,norm:normalize487,mayTreat:()=>permission,findStudy:t=>Object.values(studies).find(s=>normalize487(t).includes(normalize487(s.label))||normalize487(t).includes(s.id))||null,
  findMonitorTherapy:t=>/ringer|cristalo|expandir/.test(normalize487(t))?drugs.fluid:/oxigen/.test(normalize487(t))?drugs.oxygen:/ceftria/.test(normalize487(t))?drugs.ceftriaxone:null,
  findIntervention:t=>null,
  nurseNatural:t=>{events.push(['old-nurse',t]);return true;},
  inferRecipient:t=>'patient',processCommand:t=>events.push(['old-slash',t]),
  updateSimulation:t=>{events.push(['update',t]);return true;},
  orderStudy:st=>{events.push(['study',st.id]);sharedSim.orders.set(st.id,{status:'queued'});return true;},
  nurseSay:t=>events.push(['reply',t])};
 vm.runInNewContext(nursingJS,sampleCtx);
 const parse=sampleCtx.window.csNursingParse487;
 assert.deepEqual(Array.from(parse('Enfermera, vías, Ringer y oxígeno'),x=>x.kind),['iv','therapy','therapy']);
 assert.deepEqual(Array.from(parse('Enfermera vías Ringer y oxígeno'),x=>x.kind),['iv','therapy','therapy'],'no comma between access and fluid is accepted');
 assert.equal(parse('Enfermera, ¿podemos administrar ceftriaxona?'),null,'questions directed to nurse do not administer medication');
 assert.equal(parse('Enfermera no administrar ceftriaxona'),null,'negated orders are not dispatched');
 assert.deepEqual(Array.from(parse('Solicito hemograma y lipasa'),x=>x.kind),['study','study']);
 assert.equal(sampleCtx.inferRecipient('Solicito hemograma'),'nurse','explicit nurse order must reach dispatcher even when nobody nearby');
 sampleCtx.nurseNatural('Enfermera, vías, Ringer y oxígeno');
 assert.deepEqual(events.filter(e=>e[0]==='iv'),[['iv',1]],'IV requested once');
 assert.equal(events.some(e=>e[0]==='old-nurse'&&/ringer/.test(e[1])),false,'Ringer must NOT be administered before IV');
 assert.equal(events.some(e=>e[0]==='old-nurse'&&/oxigen/.test(normalize487(e[1]))),true,'oxygen independently dispatched');
 assert.equal(sharedSim.csPhase4Pending487.length,1,'fluid must be pending for placed IV');
 sharedSim.venousAccessCount=1;
 sampleCtx.updateSimulation(1);
 assert.equal(sharedSim.csPhase4Pending487.length,0,'IV-complete pending order consumed');
 assert.equal(events.some(e=>e[0]==='old-nurse'&&/ringer/.test(e[1])),true,'fluid dispatched only once IV present');
 events.length=0;
 sampleCtx.nurseNatural('Solicito hemograma y lipasa');
 assert.deepEqual(events.filter(e=>e[0]==='study').map(e=>e[1]),['hemograma','lipasa']);
 events.length=0;sampleCtx.nurseNatural('Solicito hemograma y lipasa');
 assert.equal(events.some(e=>e[0]==='study'),false,'repeat study requests must not duplicate');
 events.length=0;sampleCtx.nurseNatural('Solicito estudios de laboratorio');
 assert.ok(events.some(e=>e[0]==='reply'&&/específico/.test(e[1])),'underspecified panel asks for clarification');
 events.length=0;permission=false;sampleCtx.nurseNatural('Enfermera Ringer y oxígeno');
 assert.deepEqual(events.map(e=>e[0]),['reply'],'competitive opponent cannot issue treatments');
 assert.equal(parse('No dar Ringer'),null,'negated order must not enter automatic dispatch');
 assert.equal(parse('¿Podemos dar ceftriaxona?'),null,'questions must not trigger medication');
 permission=true;events.length=0;sampleCtx.processCommand('/enfermera hemograma y lipasa');
 assert.equal(events.some(e=>e[0]==='old-slash'),false,'slash composite routed to nurse dispatcher');
 const five=parse('enfermera vias, ringer, oxigeno, ceftriaxona y hemograma');
 assert.equal(five?.length,5,'five independent intents supported');

 // Phase 5 regression: an auto-resolved case cannot repeatedly reopen destination
 // and must commit closure/XP once when the user chooses the disposition.
 const closureStart=out.indexOf('  function csCaseClosureEligibilityV487(');
 const closureEnd=out.indexOf('  // ============================================================\n  // 9)',closureStart);
 assert.ok(closureStart>0&&closureEnd>closureStart,'same closure contract must power disposition and finalization');
 const v487ClosureSource=out.slice(closureStart,closureEnd);
 const closeEvents=[],localCase={id:'PERITONITIS'},simClose={patientDied:false,disposition:null,_careerEndProcessed:false},recClose={caseId:localCase.id,state:'active'};
 let onDisposition=null;
 const closeContext={sim:simClose,C:localCase,window:{},shiftSession:{active:true,records:[recClose],index:0,clock:10},
  finishCase:()=>{closeEvents.push('core-finish');simClose._careerEndProcessed=true;},
  csOpenDisposition:cb=>{closeEvents.push('dialog');onDisposition=cb;},
  nurseSay:t=>closeEvents.push('nurse'),
  csBreakdown:()=>({score:87})};
 vm.runInNewContext(v487ClosureSource,closeContext);
 const eligible=closeContext.window.csCaseClosureEligibilityV487;
 assert.equal(eligible().eligible,false,'missing destination is an explicit closure blocker');
 assert.equal(eligible().phase,'OPEN');
 closeContext.finishCase('auto');closeContext.finishCase('auto');closeContext.finishCase('auto');
 assert.deepEqual(closeEvents,['dialog','nurse'],'auto ticks must open destination prompt only once');
 assert.equal(simClose._careerEndProcessed,false,'no score or XP without the selected destination');
 simClose.disposition={id:'uti',label:'UTI'};onDisposition();
 assert.deepEqual(closeEvents,['dialog','nurse','core-finish'],'the disposition callback must commit closure');
 assert.equal(recClose.state,'done','bed and reception record must move to done');
 assert.equal(eligible().phase,'CLOSED','one shared eligibility contract confirms closed status');
 closeContext.finishCase('completed');closeContext.finishCase('auto');
 assert.equal(closeEvents.filter(e=>e==='core-finish').length,1,'double taps cannot duplicate credits');
 const died={patientDied:true,disposition:null,_careerEndProcessed:false};
 const deathCtx={...closeContext,sim:died,shiftSession:{active:false,records:[],index:0}};
 deathCtx.finishCase=()=>{died._careerEndProcessed=true;closeEvents.push('death-finish')};
 vm.runInNewContext(v487ClosureSource,deathCtx);
 deathCtx.finishCase('death');
 assert.equal(died._careerEndProcessed,true,'death must not require assigning discharge destination');

 // A second manual attempt after dismissing a modal must re-open the destination chooser;
 // the first automated alert must not create a permanently stuck state.
 const retrySim={patientDied:false,disposition:null,_careerEndProcessed:false};
 const retryEvents=[];
 let retryChoice=null;
 const retryCtx={...closeContext,sim:retrySim,shiftSession:{active:false,records:[],index:0},csOpenDisposition:cb=>{retryEvents.push('dialog');retryChoice=cb;},
  nurseSay:()=>retryEvents.push('nurse')};
 retryCtx.finishCase=()=>{retryEvents.push('finish');retrySim._careerEndProcessed=true};
 vm.runInNewContext(v487ClosureSource,retryCtx);
 retryCtx.finishCase('auto');retryCtx.finishCase('completed');
 assert.deepEqual(retryEvents,['dialog','nurse','dialog'],'manual retry after auto modal must still work');
 retrySim.disposition={id:'alta'};retryChoice();
 assert.deepEqual(retryEvents,['dialog','nurse','dialog','finish'],'manual selection finishes after retry');
 const wrongPatient={patientDied:false,disposition:{id:'sala'},patientInstance:{uid:'patient-2'}};
 const wrongRecord={instance:{uid:'patient-1'},caseId:localCase.id,state:'active'};
 const wrongCtx={...closeContext,sim:wrongPatient,shiftSession:{active:true,records:[wrongRecord],index:0}};
 wrongCtx.finishCase=()=>closeEvents.push('wrong-target-finish');
 vm.runInNewContext(v487ClosureSource,wrongCtx);
 assert.equal(wrongCtx.window.csCaseClosureEligibilityV487().eligible,false,'unselected background patient cannot close as active');
 wrongCtx.finishCase('auto');
 assert.equal(closeEvents.includes('wrong-target-finish'),false,'background patient closure must not mutate another bed');
 assert.match(out,/if\(shared\(\)\)\{if\(!guard\(\)\|\|!ownsCurrent\(\)\)return;/,'shared-room closure keeps owner authorization');
 assert.match(out,/if\(!p\|\|p\.ownerId!==id\|\|p\.result\|\|p\.state==='done'\)return false/,'host remains idempotent on duplicate closure receipts');

 // Phase 6: learner tutoring must not turn inactivity or uncertainty into treatment.
 assert.match(out,/function csVegaTeachingIntentV487\(text\)/,'tutor must expose one auditable help/why/hint/delegate classifier');
 assert.match(out,/function csVegaObservedActionV487\(before,after,kind\)/,'verify proposed clinical actions before saying they executed');
 assert.match(out,/csVegaTeachingIntentV487\(text\)/,'learner must route explicit help, hints, why, and delegation');
 assert.match(out,/csCaseClosureEligibilityV487\?\.\(\)\.phase==='CLOSURE_ELIGIBLE'/,'sequential tutor consults phase 5 closure eligibility');
 assert.doesNotMatch(out,/if\(idle>=24000&&!turn\.helped\)\{turn\.helped=true;helpOne\(job,step\);\}/,'time alone cannot execute orders');
 assert.doesNotMatch(out,/if\(delegation\|\|sim\.nsVegaStruggles>=2\)return begin\(\);/,'repeated uncertainty cannot delegate patient automatically');
 assert.doesNotMatch(out,/const state=window\.nsPatientState\(\);actor\(\(\)=>\{window\.csQueueMonitor\(\);if\(\['ROJO','NARANJA'\]\.includes\(state\.color\)\)window\.csQueueIV\(1\)\}\);/,'mere uncertainty does not initiate IV');
 assert.match(out,/if\(immediateDanger\(state\)\)\{takeOver\(job,'Se descompensa\.'\);return;\}/,'emergency takeover remains active');
 assert.match(out,/if\(!trusted\(\)\|\|lifeThreat\|\|!hasRescue&&now-sim\.nsUrgentSince>=6000\)return begin\(true,lifeThreat\);/,'critical untrusted rescue preserved');
 const stagePos=out.indexOf(' function csVegaTeachingIntentV487(text){');
 const stageEnd=out.indexOf(' function csVegaObservedActionV487(',stagePos);
 assert.ok(stagePos>0&&stageEnd>stagePos,'tutor classifier is bounded within rescue scope');
 const stageCtx={norm:t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim()};
 vm.runInNewContext(out.slice(stagePos,stageEnd),stageCtx);
 const kind=vm.runInNewContext('csVegaTeachingIntentV487',stageCtx);
 for(const [phrase,expected] of [['No sé','uncertain'],['No sé qué hacer','uncertain'],['No entiendo','uncertain'],['Dame una pista','hint'],['Ayúdame con el siguiente paso','help'],['¿Por qué pedimos hemograma?','why'],['Hazlo tú','delegate'],['No lo hagas','none']])assert.equal(kind(phrase),expected,'Vega intent: '+phrase);
 const observedA=out.indexOf(' function csVegaObservedActionV487(');
 const observedB=out.indexOf(' function learnerMessage(text,intent){',observedA);
 assert.ok(observedB>observedA);
 vm.runInNewContext(out.slice(observedA,observedB).split(' function learnerTick(job){')[0],stageCtx);
 const observed=vm.runInNewContext('csVegaObservedActionV487',stageCtx);
 assert.equal(observed({orderCount:1,drugCount:0,interventionCount:0,pendingCount:0},{orderCount:1,drugCount:0,interventionCount:0,pendingCount:0},'study'),false,'no phantom study success');
 assert.equal(observed({orderCount:1},{orderCount:2},'study'),true,'only a real study addition is acknowledged');
 assert.equal(observed({drugCount:0,interventionCount:0,pendingCount:0},{drugCount:0,interventionCount:0,pendingCount:1},'treatment'),true,'pending therapy is a queued action');

 // Behavioral Phase 6: mere uncertainty, why and hints never issue orders.
 const learnerBegin=out.indexOf(' function learnerMessage(text,intent){');
 const learnerEnd=out.indexOf(' const oldBegin=mentorBegin;',learnerBegin);
 assert.ok(learnerBegin>0&&learnerEnd>learnerBegin);
 const convo=[],orders=[],task={_csVegaHelpStage:null};
 const tutorSim={nsVegaCare:task,chats:{expert:[]},orders:new Map(),administrationLog:[],interventions:new Set(),pendingTherapies:new Map(),disposition:null};
 let delegated=0,helped=0;
 const simTutor={
  sim:tutorSim,C:{interventions:[]},MONITOR_THERAPY_CATALOG:[],
  norm:stageCtx.norm,csVegaTeachingIntentV487:kind,
  csVegaActionSnapshot487:()=>({orderCount:tutorSim.orders.size,drugCount:tutorSim.administrationLog.length,interventionCount:tutorSim.interventions.size,pendingCount:tutorSim.pendingTherapies.size}),
  csVegaObservedActionV487:observed,csVegaWhy487:step=>'Why '+step,
  learnerTarget:()=> 'workup',learnerHint:step=>'Hint '+step,learnerPrompt:step=>'Next '+step,
  say:text=>convo.push(text),begin:()=>{delegated++;},helpOne:(job,step)=>{helped++;tutorSim.orders.set('assisted',{status:'pending'});return true;},
  window:{nsMayExamine:()=>true,nsWithClinicalActor:(actor,fn)=>fn()},
  orderStudy:st=>{if(!tutorSim.orders.has(st.id)){tutorSim.orders.set(st.id,{status:'pending'});orders.push(st.id);}return true;},
  finishCase:()=>{},csSetDiagnosticImpression:()=>{},csSetDisposition:()=>{},
  addMonitorTherapy:()=>false,orderIntervention:()=>false
 };
 vm.runInNewContext(out.slice(learnerBegin,learnerEnd),simTutor);
 const talk=(t,i={type:'uncertainty'})=>simTutor.learnerMessage(t,i);
 talk('No sé');talk('No entiendo');talk('Dame una pista');talk('¿Por qué pedimos hemograma?');
 assert.equal(delegated,0,'repeated uncertainty never delegates');
 assert.equal(helped,0,'questions and hints never execute actions');
 assert.equal(tutorSim.orders.size,0,'no actions without explicit player direction');
 talk('Ayúdame con el siguiente paso');
 talk('Ayúdame con el siguiente paso');
 assert.equal(helped,1,'explicit help performs at most one step until clinical progress');
 talk('Hemograma',{type:'study_proposal',study:{id:'assisted'}});
 assert.ok(convo.at(-1).includes('No aparece un nuevo pedido'),'preexisting study is not announced as newly requested');
 talk('Hazlo tú');
 assert.equal(delegated,1,'explicit delegation gives Vega the full takeover');
 assert.equal(convo.some(x=>x.startsWith('Why workup')),true,'why answered without ordering');
 // A stable learner cannot be automatically taken over for a missing chat reply.

 // Idle handoff is a safety path only for actual critical patients.
 const learnerTickA=out.indexOf(' function learnerTick(job){');
 const learnerTickB=out.indexOf(' function learnerMessage(text,intent){',learnerTickA);
 assert.ok(learnerTickA>0&&learnerTickB>learnerTickA);
 let normalTakeovers=0,implicitTreatments=0;const signs={color:'VERDE'};
 const tickTurn={started:0,absentSince:0,arrived:true,lastProgress:0,signature:'same',step:'workup',hinted:false,helped:false};
 const tickJob={turn:tickTurn,participatory:true,phase:'learner'};
 const tickCtx={performance:{now:()=>55000},window:{nsPatientState:()=>signs},immediateDanger:()=>false,
  sim:{patientInstance:{bed:{patient:[200,200]}}},patient:{ix:200,iy:200},
  player:{x:200,y:200},playerProgress:()=> 'same',learnerTarget:()=> 'workup',
  learnerPrompt:()=> 'Only next study',learnerHint:()=> 'Review one lab',
  status:()=>{},say:()=>{},takeOver:()=>normalTakeovers++,helpOne:()=>implicitTreatments++};
 vm.runInNewContext(out.slice(learnerTickA,learnerTickB),tickCtx);
 tickCtx.learnerTick(tickJob);
 assert.equal(normalTakeovers,0,'stable 55-second pause must not trigger doctor takeover');
 assert.equal(implicitTreatments,0,'stable 55-second pause must not start treatment');
 signs.color='ROJO';
 tickCtx.learnerTick(tickJob);
 assert.equal(normalTakeovers,1,'persistently critical patient may trigger emergency rescue');
 // Clinical closure eligibility from Phase 5 is the tutor's closure transition.
 const targetA=out.indexOf(' function learnerTarget(){',observedA);
 const targetB=out.indexOf(' function learnerPrompt(step){',targetA);
 const targetCtx={C:{keyStudies:[],dx:['peritonitis'],keyInterventions:[]},
  sim:{orders:new Map(),diagnosis:'Peritonitis',pendingTherapies:new Map(),disposition:{id:'uti'}},
  norm:stageCtx.norm,window:{nsPatientState:()=>({treatment:{checks:[{id:'handoff',done:true}]}}),
   csCaseClosureEligibilityV487:()=>({phase:'CLOSURE_ELIGIBLE'})},present:()=>true};
 vm.runInNewContext(out.slice(targetA,targetB),targetCtx);
 assert.equal(targetCtx.learnerTarget(),'closure','Vega recognizes case eligibility instead of claiming unfinished review');

// Acceptance A: a fixed reception header and an independently touch-scrollable patient region.
assert.match(out,/id="csReceptionPinned487"/,'reception modal has a dedicated fixed header');
assert.match(out,/class="csReceptionScroll487"/,'patient list scrolls without moving close control');
assert.match(out,/#csReceptionBoard\.csModal \.csPanel\{[^}]*display:flex;flex-direction:column/,'modal bounds a flex column viewport');
assert.match(out,/#csReceptionBoard \.csReceptionScroll487\{[^}]*overflow-y:auto/,'list has vertical scrolling');
assert.match(out,/#csReceptionBoard \.csReceptionPinned487\{[^}]*flex-shrink:0/,'close button remains fixed');

// Acceptance B/C: augment the existing Phase 4 parser with per-patient receipts and actual transitions.
assert.match(out,/id="atria-phase7-nursing-receipts"/,'nurse receipts integrate with phase4 instead of replacing clinical engine');
assert.match(out,/function csNurseClinicalStatus487\(patient,item\)/,'each requested action is resolved against real patient clinical state');
assert.match(out,/function csNurseReconcile487\(patient,active\)/,'execution notices require a real status transition');
assert.match(out,/function csNurseDispatch487\(text\)/,'mixed treatment and lab phrases share one bounded dispatcher');
assert.match(out,/csPlaySound\('ok'\)/,'completed tasks use existing user-configured audio');
assert.match(out,/csNurse487History/,'per-patient receipt history is preserved');

// Behavioral 4.8.7 nurse receipt QA: patient-specific completion, dependencies and audio.
const nurseStart=out.indexOf('<script id="atria-phase7-nursing-receipts">');
const nurseEnd=out.indexOf('</script>',nurseStart);
assert.ok(nurseStart>0&&nurseEnd>nurseStart);
const nurseScript=out.slice(nurseStart+'<script id="atria-phase7-nursing-receipts">'.length,nurseEnd);
new vm.Script(nurseScript);
const clinicalPatient={patientInstance:{uid:'p-1',bed:{label:'Box 1A'},name:'Test Uno'},orders:new Map(),
 venousAccessCount:0,monitorTherapies:new Map(),pendingTherapies:new Map(),interventions:new Set(),
 administrationLog:[],globalChat:[],events:[],gameMinute:3};
const otherPatient={patientInstance:{uid:'p-2',bed:{label:'Box 2B'},name:'Test Dos'},orders:new Map(),
 venousAccessCount:0,monitorTherapies:new Map(),pendingTherapies:new Map(),interventions:new Set(),
 administrationLog:[],globalChat:[],events:[],gameMinute:4};
let completions=0;const sounds=[],notices=[],spoken=[],oldOrders=[];
const parseStub=t=>{
 const n=String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(n.includes('canaliza dos vias'))return [{kind:'unknown',text:'canaliza dos vias'},{kind:'therapy',id:'oxygen',text:'oxigeno'},{kind:'study',id:'hemograma',text:'hemograma'}];
 if(n.includes('opioides'))return [{kind:'unknown',text:'opioides'}];
 if(n.includes('albumina'))return [{kind:'study',id:'hepatograma',text:'expandir con albumina'}];
 if(n.includes('ceftriaxona')&&n.includes('hemograma'))return [{kind:'iv',text:'vias',count:1},{kind:'therapy',id:'ceftriaxone',text:'ceftriaxona'},{kind:'therapy',id:'oxygen',text:'oxigeno'},{kind:'study',id:'hemograma',text:'hemograma'}];
 if(n.includes('ringer')&&n.includes('hemograma'))return [{kind:'iv',text:'vias',count:1},{kind:'therapy',id:'fluid',text:'ringer'},{kind:'therapy',id:'oxygen',text:'oxigeno'},{kind:'study',id:'hemograma',text:'hemograma'}];
 if(n.includes('ceftriaxona'))return [{kind:'therapy',id:'ceftriaxone',text:'ceftriaxona'}];
 return null;
};
const fakeNurse={
 sim:clinicalPatient,shiftSession:{records:[{sim:clinicalPatient},{sim:otherPatient}]},
 window:{csNursingParse487:parseStub,csQueueIV:()=>{oldOrders.push('iv');return true},csQueueMonitor:()=>true},
 norm:t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
 nurseNatural:t=>{
  const n=String(t).toLowerCase();
  if(n.includes('oxigeno'))clinicalPatient.monitorTherapies.set('oxygen',{});
  if(n.includes('hemograma'))clinicalPatient.orders.set('hemograma',{id:'hemograma',status:'pending'});
  if(n.includes('ringer')){if(clinicalPatient.venousAccessCount)clinicalPatient.administrationLog.push({id:'fluid'});}
  oldOrders.push(t);return true;
 },inferRecipient:()=> 'patient',updateSimulation:()=>{
  const q=clinicalPatient.csPhase4Pending487;
  if(clinicalPatient.venousAccessCount>0&&q?.length){const it=q.shift();clinicalPatient.administrationLog.push({id:it.id});}
  return true;
 },mayTreat:()=>true,queueNurse:()=>true,addMonitorTherapy:t=>{clinicalPatient.administrationLog.push({id:'albumin'});return true;},
 nurseSay:msg=>spoken.push(msg),toast:msg=>notices.push(msg),csPlaySound:id=>sounds.push(id)
};
vm.runInNewContext(nurseScript,fakeNurse);
assert.equal(fakeNurse.window.csNurse487Parse('Enfermera canalizá dos vías, oxígeno y hemograma')[0].count,2,'colloquial double IV resolves to 2 lines');
fakeNurse.nurseNatural('Enfermera vías, ceftriaxona, oxígeno y hemograma');
assert.equal(clinicalPatient.csNurse487History.length,1);
assert.equal(clinicalPatient.csNurse487History[0].items.length,4);
assert.equal(clinicalPatient.csPhase4Pending487[0].id,'ceftriaxone','ceftriaxone waits without IV');
assert.equal(clinicalPatient.administrationLog.length,0,'receiving antibiotic is not administration');
assert.equal(clinicalPatient.orders.get('hemograma').status,'pending','lab request not a result');
assert.equal(sounds.length,1,'newly started oxygen gets one completion sound');
const originalMessages=spoken.length;
fakeNurse.updateSimulation(1);fakeNurse.updateSimulation(1);
assert.equal(sounds.length,1,'re-render or simulation ticks do not replay sound');
clinicalPatient.venousAccessCount=1;
fakeNurse.updateSimulation(1);
assert.equal(clinicalPatient.administrationLog[0].id,'ceftriaxone');
assert.equal(sounds.length,2,'IV placement and antibiotic administration are batched in a single event');
assert.ok(spoken.some(t=>t.includes('ceftriaxone')||t.includes('ceftriaxona')),'administration gets an event message');
clinicalPatient.orders.get('hemograma').status='done';
fakeNurse.updateSimulation(1);fakeNurse.updateSimulation(1);
assert.equal(sounds.length,3,'available lab triggers separate once-only notification');
assert.ok(spoken.some(t=>t.includes('resultado disponible')),'result is distinguished from study order');
fakeNurse.nurseNatural('Enfermera opioides');
assert.equal(clinicalPatient.csNurse487History.at(-1).items[0].status,'NEEDS_CLARIFICATION','opioids require a specific medicine');
assert.equal(sounds.length,3,'clarification never triggers success');
fakeNurse.nurseNatural('Enfermera expandir con albúmina');
assert.equal(clinicalPatient.administrationLog.at(-1).id,'albumin','albumin is a therapy, not hepatograma');
assert.equal(sounds.length,4,'albumin actual administration emits completion');
const backgroundReceipt={uid:'p-2',bed:'Box 2B',items:[{kind:'study',id:'hemograma',label:'Hemograma',status:'IN_PROGRESS',reason:'',notified:false}]};
otherPatient.csNurse487History=[backgroundReceipt];otherPatient.orders.set('hemograma',{status:'done'});
const audioBefore=sounds.length;fakeNurse.updateSimulation(1);
assert.equal(sounds.length,audioBefore+1,'background completed study also notifies once');
assert.ok(otherPatient.globalChat.some(m=>m[1].includes('Box 2B')),'background study is logged to the right patient');
assert.ok(notices.at(-1).includes('Box 2B'),'background toast identifies the correct box');
fakeNurse.updateSimulation(1);
assert.equal(sounds.length,audioBefore+1,'background result is not re-announced');
