import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {apply487} from '../integration/apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const a=html.indexOf('function csVoiceWord(word){'),b=html.indexOf('function csEnsureRecognition(){',a);
const c=html.indexOf('  const VoiceV2={'),d=html.indexOf('  try {\n    // Replace old local-voice behavior',c);
assert.ok(a>=0&&b>a&&c>=0&&d>c,'actual Android adapter and normalizer embedded');
const sent=[],recognizers=[],timers=new Map(),captureClicks=[];let tid=0;const realMicButton={id:'voiceLocalBtn',textContent:'🎤',classList:{toggle(){},add(){},remove(){}},contains(node){return node===this}};
class SpeechMock{
 constructor(){recognizers.push(this)}
 start(){this.onstart?.()}
 stop(){this.onend?.()}
 abort(){this.onerror?.({error:'aborted'});this.onend?.()}
 result(results,index=0){this.onresult?.({results,resultIndex:index})}
}
const cx={window:{isSecureContext:true,SpeechRecognition:SpeechMock},location:{protocol:'https:'},navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}},document:{getElementById:id=>id==='voiceLocalBtn'?realMicButton:null,addEventListener:(type,fn,capture)=>{if(type==='click'&&capture)captureClicks.push(fn)}},csVoice:{localActive:false,recognition:null},csCoop:{radioHeld:false},csUpdateMicTrack(){},csPlaySound(){},toast(){},sendMessage:x=>sent.push(x),setTimeout(fn){const i=++tid;timers.set(i,fn);return i},clearTimeout(i){timers.delete(i)}};
vm.createContext(cx);
vm.runInContext(html.slice(a,b)+'\n'+html.slice(c,d)+'\nglobalThis.adapter={startVoiceV2,stopVoiceV2};',cx);
const fin=t=>({0:{transcript:t},isFinal:true}),tmp=t=>({0:{transcript:t},isFinal:false});
await cx.adapter.startVoiceV2();let mic=recognizers.at(-1);
mic.result([tmp('Hola')]);mic.result([fin('Hola')]);mic.result([fin('Hola estás')]);mic.result([fin('Hola estás bien')]);mic.onend();mic.onend();
assert.deepEqual(sent,['Hola estás bien'],'cumulative same-index revisions must send once');
await cx.adapter.startVoiceV2();mic=recognizers.at(-1);mic.result([fin('Hola Hola estás Hola estás bien Hola estás bien')]);mic.onend();
assert.equal(sent.at(-1),'Hola estás bien','reported Android echo normalized');
await cx.adapter.startVoiceV2();mic=recognizers.at(-1);mic.result([tmp('No no')]);mic.result([fin('No no tengo alergias')]);mic.onend();
assert.equal(sent.at(-1),'No no tengo alergias','intentional repetitions must persist');
await cx.adapter.startVoiceV2();mic=recognizers.at(-1);mic.result([tmp('hace'),tmp('cuanto')]);mic.result([fin('desde cuándo'),fin('empezó el dolor')],1);mic.onend();
assert.equal(sent.at(-1),'desde cuándo empezó el dolor','multi-index final parts join once');
const count=sent.length;await cx.adapter.startVoiceV2();mic=recognizers.at(-1);mic.result([fin('no enviar')]);cx.adapter.stopVoiceV2(true);
assert.equal(sent.length,count,'abort cancels final');
await cx.adapter.startVoiceV2();const current=recognizers.at(-1);mic.result([fin('evento tardío')]);mic.onend();current.result([fin('mensaje válido')]);current.onend();
assert.equal(sent.at(-1),'mensaje válido','old session ignored');
const len=sent.length;current.result([fin('duplicado')]);assert.equal(sent.length,len);
await cx.adapter.startVoiceV2();mic=recognizers.at(-1);mic.result([fin('Hola Hola cómo Hola cómo estás Hola cómo estás')]);mic.onend();
assert.equal(sent.at(-1),'Hola cómo estás','screenshot reproduction through actual active VoiceV2 handler');
await cx.adapter.startVoiceV2();mic=recognizers.at(-1);mic.result([fin('Hola Hola Hola probando Hola probando micrófono')]);mic.onend();
assert.equal(sent.at(-1),'Hola probando micrófono','new physical Android screenshot echo');

// Existing old local recognizer may still be listening after an in-game radio transition.
let legacyAborts=0;
cx.csVoice.localActive=true;
cx.csVoice.restarting=true;
cx.csVoice.pendingText='Hola duplicado';
cx.csVoice.pendingByIndex=new Map([[0,{text:'Hola',isFinal:true}]]);
cx.csVoice.sentFinals=new Set([0]);
cx.csVoice.recognition={abort(){legacyAborts++}};
const prior=sent.length;
await cx.adapter.startVoiceV2();
assert.equal(legacyAborts,1,'starting VoiceV2 must disable the superseded SpeechRecognition instance');
assert.equal(cx.csVoice.localActive,true,'V2 UI deliberately mirrors the active mic in shared csVoice state');
assert.equal(cx.csVoice.recognition,recognizers.at(-1),'shared recognition points to V2, not legacy');
assert.equal(cx.csVoice.restarting,false,'legacy onend cannot restart microphone');
assert.equal(cx.csVoice.pendingText,'','no stale pending old mic text');
assert.equal(cx.csVoice.pendingByIndex.size,0);
const mic2=recognizers.at(-1);
mic2.result([fin('Hola prueba de una sola voz')]);mic2.onend();
assert.deepEqual(sent.slice(prior),['Hola prueba de una sola voz'],'exclusive active recognizer emits only one message');
await cx.adapter.startVoiceV2();const short=recognizers.at(-1);short.result([fin('Qué Qué tal todo bien')]);short.onend();
assert.equal(sent.at(-1),'Qué tal todo bien','short Android ASR repeated opening');
await cx.adapter.startVoiceV2();const hello=recognizers.at(-1);hello.result([fin('Hola Hola')]);hello.onend();
assert.equal(sent.at(-1),'Hola','short Android ASR duplicated greeting');
console.log('Android VoiceV2 simulated session/revision/cancel/legacy ownership regression OK:',sent.length,'messages');

const until=sent.length;
await cx.adapter.startVoiceV2();const provisional=recognizers.at(-1);provisional.result([tmp('Hola Hola')]);provisional.onend();assert.equal(sent.length,until,'interim-only Android end must not send an incomplete utterance');

await cx.adapter.startVoiceV2();
const alt=recognizers.at(-1);
alt.result([{0:{transcript:'supermercado supermercado pollo',confidence:0.85},1:{transcript:'supermercado pollo',confidence:0.82},length:2,isFinal:true}]);
alt.onend();
assert.equal(sent.at(-1),'supermercado pollo','active speech path chooses supported alternative without duplicate word');
await cx.adapter.startVoiceV2();
const noAlt=recognizers.at(-1);
noAlt.result([{0:{transcript:'perro perro',confidence:0.9},isFinal:true}]);
noAlt.onend();
assert.equal(sent.at(-1),'perro perro','an ambiguous genuine repetition is never erased without ASR corroboration');

await cx.adapter.startVoiceV2();
const diagnosed=recognizers.at(-1);
diagnosed.result([{0:{transcript:'probando probando audio',confidence:0.87},1:{transcript:'probando audio',confidence:0.84},length:2,isFinal:true}]);
diagnosed.onend();
const report=JSON.parse(cx.window.nsAtriaVoiceReport());
const session=report.sessions.at(-1);
assert.equal(session.events.at(-1).segments[0].alternatives[0].text,'probando probando audio','report contains actual Android primary result');
assert.equal(session.events.at(-1).segments[0].alternatives[1].text,'probando audio','report contains corroborating alternative');
assert.equal(session.events.at(-1).segments[0].selected,'probando audio','report identifies chosen ASR segment');
assert.equal(session.rawFinal,'probando audio','report records stage output');
assert.equal(session.committed,'probando audio','report records committed text');
assert(report.sessions.length<=10,'diagnostics stay bounded in local memory');
console.log('Privacy-local Android speech provenance diagnostic and alt confidence regression OK');

const beforeTap=sent.length,beforeMic=recognizers.length;
assert.equal(captureClicks.length,1,'one delegated capture handler on the real button');
let prevented=0,stopped=0;
captureClicks[0]({target:realMicButton,preventDefault(){prevented++},stopImmediatePropagation(){stopped++}});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(prevented,1);
assert.equal(stopped,1,'old target onclick prevented');
assert.equal(recognizers.length,beforeMic+1,'real button click must start VoiceV2');
const clicked=recognizers.at(-1);
clicked.result([fin('probando probando audio')]);clicked.onend();
assert.equal(sent.length,beforeTap+1,'button sends exactly one committed message');
const clickDiag=JSON.parse(cx.window.nsAtriaVoiceReport());
assert.equal(clickDiag.micClicks,1);
assert(clickDiag.startAttempts>=1);
assert(clickDiag.sessions.length>0,'click produces an observable diagnostic session');
console.log('Real microphone button click -> VoiceV2 session -> speech dispatch OK');
