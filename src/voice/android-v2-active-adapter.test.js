import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {apply487} from '../integration/apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const a=html.indexOf('function csVoiceWord(word){'),b=html.indexOf('function csEnsureRecognition(){',a);
const c=html.indexOf('  const VoiceV2={'),d=html.indexOf('  try {\n    // Replace old local-voice behavior',c);
assert.ok(a>=0&&b>a&&c>=0&&d>c,'actual Android adapter and normalizer embedded');
const sent=[],recognizers=[],timers=new Map();let tid=0;
class SpeechMock{
 constructor(){recognizers.push(this)}
 start(){this.onstart?.()}
 stop(){this.onend?.()}
 abort(){this.onerror?.({error:'aborted'});this.onend?.()}
 result(results,index=0){this.onresult?.({results,resultIndex:index})}
}
const cx={window:{isSecureContext:true,SpeechRecognition:SpeechMock},location:{protocol:'https:'},navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}},document:{getElementById:()=>null},csVoice:{localActive:false,recognition:null},csCoop:{radioHeld:false},csUpdateMicTrack(){},csPlaySound(){},toast(){},sendMessage:x=>sent.push(x),setTimeout(fn){const i=++tid;timers.set(i,fn);return i},clearTimeout(i){timers.delete(i)}};
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
console.log('Android VoiceV2 simulated session/revision/cancel and screenshot regression OK:',sent.length,'messages');
