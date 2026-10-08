import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';
const base=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'),html=apply487(base);
function range(a,b){const x=html.indexOf(a),y=html.indexOf(b,x+a.length);assert(x>=0&&y>x,'real game function missing '+a);return html.slice(x,y)}
function casesFrom(s){const a=s.indexOf('const CASES=')+12;let d=0,q=false,e=false;for(let i=a;i<s.length;i++){let x=s[i];if(q){if(e)e=false;else if(x==='\\')e=true;else if(x==='"')q=false;continue}if(x==='"'){q=true;continue}if(x==='[')d++;else if(x===']'&&--d===0)return JSON.parse(s.slice(a,i+1))}throw Error('missing clinical cases')}
const cases=casesFrom(base),messages=[],nurseMessages=[],timers=new Map(),recognizers=[];let timerId=0,time=1000000;
class Recognizer{
 constructor(){recognizers.push(this)}
 start(){this.onstart?.()}
 stop(){this.onend?.()}
 abort(){this.onerror?.({error:'aborted'});this.onend?.()}
 result(results,index=0){this.onresult?.({results,resultIndex:index})}
}
let cx;
cx={__cases:cases,performance:{now:()=>time},window:{isSecureContext:true,SpeechRecognition:Recognizer},location:{protocol:'https:'},
 navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}},document:{getElementById:()=>null},
 csVoice:{localActive:false,recognition:null},csCoop:{radioHeld:false},csUpdateMicTrack(){},csPlaySound(){},toast(){},
 sim:{orders:new Map(),events:[],gameMinute:0},player:{bubble:'',bubbleUntil:0},pendingAddress:null,chatRole:null,
 strip:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ/ ]/g,' ').trim(),
 inferRecipient:()=> 'nurse',addGlobalChat:(role,text)=>messages.push({role,text}),
 nurseSay:text=>nurseMessages.push(text),
 queueNurse(task){if(task.kind==='collect'){const o=cx.sim.orders.get(task.study.id);o.status='pending';o.readyAt=time+cx.__runtime.duration(task.study)}},
 complete(){},renderContent(){},refreshChatDock(){},findIntervention:()=>null,
 setTimeout(fn){const id=++timerId;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}
};
const bootstrap=[
 "function norm(s){return String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}",
 "const CASES=globalThis.__cases;let C=CASES[0];globalThis.selectCase=id=>{C=CASES.find(c=>c.id===id)}"
].join('\n');
vm.createContext(cx);
vm.runInContext(bootstrap+'\n'+[
 range('function csVoiceWord(word){','function csEnsureRecognition(){'),
 range('const csStudyTiming=','function findIntervention(text){'),
 range('function processCommand(q){','function nurseNatural(q){'),
 range('function nurseNatural(q){','function nurseSay(t){'),
 range('function orderStudy(s,quiet=false','const MONITOR_THERAPY_CATALOG='),
 range('function sendMessage(q){','const csStudyTiming='),
 range('  const VoiceV2={','  try {\n    // Replace old local-voice behavior')
].join('\n')+'\nglobalThis.__runtime={startVoiceV2,select:q=>findStudy(q),duration:s=>csStudyDurationMs(s)};',cx);
const expected=[['Solicitar tomografía de tórax','tc_torax'],['Solicitar tomografía cerebral','tc_cerebral'],['Solicitar resonancia cerebral','rm_cerebral'],['Solicitar radiografía de tórax','rx_torax'],['Solicitar amilasa','amilasa'],['Solicitar lipasa','lipasa']];
const result=t=>({0:{transcript:t},isFinal:true});
const interim=t=>({0:{transcript:t},isFinal:false});
let verified=0;
for(const c of cases){
 cx.selectCase(c.id);
 for(const [said,id] of expected){
  cx.sim={orders:new Map(),events:[],gameMinute:0};timers.clear();
  const before=messages.length;
  await cx.__runtime.startVoiceV2();
  const mic=recognizers.at(-1),split=Math.max(1,Math.floor(said.length/2));
  mic.result([interim(said.slice(0,split))]);
  mic.result([result(said.slice(0,split))]);
  mic.result([result(said)]);
  assert.equal(messages.length,before,'spoken provisional study order must not execute');
  mic.onend();mic.onend();
  for(const [timer,fn] of [...timers]){timers.delete(timer);fn()}
  assert.equal(messages.length,before+1,'voice may dispatch only one study command');
  assert.equal(messages.at(-1).text,said,'transcription must be unmodified when no ASR echo');
  const orders=[...cx.sim.orders.values()];assert.equal(orders.length,1,'one clinical order for one spoken command '+c.id+'/'+said);
  assert.equal(orders[0].id,id,'wrong spoken study organ/mode '+c.id+'/'+said);
  assert(Number.isFinite(orders[0].readyAt),'spoken order must have valid completion time');
  assert(orders[0].readyAt>time,'study cannot be marked ready prematurely');
  assert(!nurseMessages.at(-1)?.includes('no está registrado'),'nurse rejected known study');
  verified++;time+=200;
 }
}
console.log('ATRIA CROSS VOICE+CLINICAL BOT PASS',JSON.stringify({cases:cases.length,spokenOrders:verified,route:'Android final → real sendMessage → actual nurseNatural → findStudy → orderStudy',type:'synthetic browser WebSpeech events'}));
