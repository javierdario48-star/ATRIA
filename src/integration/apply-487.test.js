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
assert.match(out,/lastRtcSend>=220/,'RTC state sends must be throttled');
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
assert.match(out,/r\.onend=\(\)=>\{if\(VoiceV2\.rec!==r\)return;voiceV2Commit\(\);VoiceV2\.active=false/);
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
assert.match(out,/function sendMessage\(q\)\{const text=String\(q\|\|''\)\.trim\(\)\.startsWith\('\/'\)/,'raw chat transcript is normalized before NPC and history');
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
