import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';

// Simulate the real compiled Android VoiceV2 callback chain, not an isolated text helper.
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
function between(a,b){const x=html.indexOf(a),y=html.indexOf(b,x+a.length);assert(x>=0&&y>x,a+' boundary missing');return html.slice(x,y)}
const helpers=between('function csVoiceWord(word){','function csEnsureRecognition(){');
const adapter=between('  const VoiceV2={','  try {\n    // Replace old local-voice behavior');
const sender=between('function sendMessage(q){','function findStudy(text){');
let now=0, counter=0;
const timers=new Map(),recognizers=[],history=[],inbox=[],orders=[],trace=[],micListeners=[],diagnosticCopies=[];
const micButton={id:'voiceLocalBtn',textContent:'🎤',classList:{toggle(){},add(){},remove(){}},contains(node){return node===this}};
class MockRecognition{
 constructor(){recognizers.push(this);this.started=false}
 start(){this.started=true;this.onstart?.()}
 stop(){this.onend?.()}
 abort(){this.onerror?.({error:'aborted'});this.onend?.()}
 result(results,index=0){this.onresult?.({resultIndex:index,results})}
}
const context={
 window:{isSecureContext:true,SpeechRecognition:MockRecognition,prompt:(_title,report)=>diagnosticCopies.push(report)},location:{protocol:'https:'},
 navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}},
 document:{getElementById:id=>id==='voiceLocalBtn'?micButton:null,addEventListener(type,fn,capture){if(type==='click'&&capture)micListeners.push(fn)}},performance:{now:()=>now},
 csVoice:{localActive:false,recognition:null},csCoop:{radioHeld:false},
 csUpdateMicTrack(){},csPlaySound(){},toast(){},strip:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ/ ]/g,' ').trim(),
 sim:{},player:{bubble:'',bubbleUntil:0},pendingAddress:null,chatRole:null,role:'patient',
 inferRecipient(){return context.role},
 addGlobalChat:(role,text)=>history.push({role,text}),
 deliverPatientSpeech:(text)=>inbox.push({role:'patient',text}),
 nurseNatural:(text)=>inbox.push({role:'nurse',text}),
 mentorUserMessage:(text)=>inbox.push({role:'expert',text}),
 processCommand:(text)=>orders.push(text),
 refreshChatDock(){},
 setTimeout(fn){const id=++counter;timers.set(id,fn);return id},
 clearTimeout(id){timers.delete(id)}
};
vm.createContext(context);
vm.runInContext(helpers+'\n'+sender+'\n'+adapter+'\nglobalThis.bot={startVoiceV2,stopVoiceV2};',context);
const final=t=>({0:{transcript:t},isFinal:true});
const interim=t=>({0:{transcript:t},isFinal:false});
let passed=0;
async function scenario(label,steps,expected,{role='patient',cancel=false,error=false}={}){
 context.role=role;context.csCoop.radioHeld=false;
 const oldHistory=history.length,oldInbox=inbox.length,oldOrders=orders.length;
 const oldRecognizers=recognizers.length;
 assert.equal(micListeners.length,1,label+': one delegated real button owner');
 let prevented=0,stopped=0;
 micListeners[0]({target:micButton,preventDefault(){prevented++},stopImmediatePropagation(){stopped++}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(prevented,1,label+': button default intercepted');
 assert.equal(stopped,1,label+': conflicting legacy button handler suppressed');
 assert.equal(recognizers.length,oldRecognizers+1,label+': exactly one recognition instance per button tap');
 const mic=recognizers.at(-1);
 assert(mic.started,label+': actual recognizer must start');
 for(const step of steps){
  mic.result(step.results,step.index||0);
  assert.equal(history.length,oldHistory,label+': provisional/final revisions must never send before onend');
 }
 if(cancel)context.bot.stopVoiceV2(true);
 else if(error)mic.onerror({error:'network'});
 else mic.onend();
 mic.onend();
 const beforeDiagnosticHistory=history.length;
 context.sendMessage('/vozdiag');
 assert.equal(history.length,beforeDiagnosticHistory,label+': /vozdiag must stay out of clinical history');
 const diagnostics=JSON.parse(diagnosticCopies.at(-1));
 assert.equal(diagnostics.micClicks,passed+1,label+': /vozdiag sees this actual button click');
 assert(diagnostics.sessions.length>0,label+': real click creates a voice session');
 assert.equal(diagnostics.sessions.at(-1).events.length,steps.length,label+': onresult event provenance retained');
 if(expected!==null)assert.equal(diagnostics.sessions.at(-1).committed,expected,label+': diagnostic matches clinical history');
 // The real nurse delivery is intentionally queued by sendMessage; advance that fake clock.
 if(role==='nurse')for(const [id,fn] of [...timers]){timers.delete(id);fn()}
 if(expected===null){
  assert.equal(history.length,oldHistory,label+': canceled, error or interim-only dictation must not send');
 }else{
  assert.equal(history.length,oldHistory+1,label+': exactly one committed chat message');
  assert.equal(history.at(-1).text,expected,label+': exact final transcript reaches chat history');
  if(role==='nurse'){assert.equal(inbox.at(-1)?.text,expected,label+': nurse received same speech')}
  if(role==='patient'){assert.equal(inbox.at(-1)?.text,expected,label+': patient received same speech')}
  if(role==='expert'){assert.equal(inbox.at(-1)?.text,expected,label+': Dr. Vega received same speech')}
  assert.equal(inbox.length,oldInbox+1,label+': one actual interlocutor delivery');
  assert.equal(orders.length,oldOrders,label+': natural language is not reclassified as slash command');
 }
 trace.push({case:label,events:steps.length,expected:expected??'[no send]',route:role});
 passed++;
 return mic;
}
const examples=[
 ['Hola Hola','Hola'],
 ['Qué Qué tal todo bien','Qué tal todo bien'],
 ['Hola Hola cómo Hola cómo estás Hola cómo estás','Hola cómo estás'],
 ['Hola Hola Hola probando Hola probando micrófono','Hola probando micrófono'],
 ['Por Por qué Por qué estás acá','Por qué estás acá'],
 ['almuerzo almuerzo','almuerzo almuerzo'],
 ['no no tengo alergias','no no tengo alergias'],
 ['muy muy intenso','muy muy intenso']
];
for(let i=0;i<examples.length;i++)await scenario('reported-'+i,[{results:[final(examples[i][0])]}],examples[i][1]);
const subjects=['Hola cómo estás','Necesito una tomografía de tórax','No tengo fiebre','Tengo mucho dolor','¿Dónde te duele?','Solicitar resonancia cerebral','Tomo medicación habitual','¿Cuándo comenzó?','No no tengo alergias','muy muy intenso'];
for(let i=0;i<56;i++){
 const phrase=subjects[i%subjects.length];
 const parts=phrase.split(' '),n=Math.max(1,Math.floor(parts.length/2));
 await scenario('revision-'+i,[
  {results:[interim(parts.slice(0,n).join(' '))]},
  {results:[interim(phrase)]},
  {results:[final(parts.slice(0,n).join(' '))]},
  {results:[final(phrase)]}
 ],phrase,{role:i%3===0?'nurse':i%3===1?'expert':'patient'});
}
for(let i=0;i<24;i++){
 const text='Consulta prolongada sobre el dolor abdominal y sus síntomas asociados número '+(i+1);
 await scenario('long-'+i,[{results:[interim('Consulta prolongada')]},{results:[final(text)]}],text);
}
for(let i=0;i<20;i++){
 const base='Solicitar estudio '+(i+1);
 await scenario('two-index-'+i,[
  {results:[interim('Solicitar'),interim('estudio '+(i+1))]},
  {results:[final('Solicitar'),final('estudio '+(i+1))],index:1}
 ],base);
}
for(let i=0;i<20;i++){
 const type=i%3;
 await scenario('invalid-'+i,[{results:[interim('Hola incompleto '+i)]}],null,{cancel:type===0,error:type===1});
}
for(let i=0;i<12;i++){
 const old=await scenario('late-'+i,[{results:[final('mensaje válido '+i)]}],'mensaje válido '+i);
 const before=history.length;
 old.result([final('mensaje erróneo de sesión anterior')]);old.onend();
 assert.equal(history.length,before,'late Android callbacks cannot re-send a committed turn');
 const text='siguiente mensaje '+i;
 await scenario('new-after-late-'+i,[{results:[final(text)]}],text);
}
const expectedTotal=examples.length+56+24+20+20+24;
assert(expectedTotal>=150,'at least 150 full-path click -> game history cases');
assert.equal(passed,expectedTotal);
assert.equal(timers.size,0,'no pending timers can commit a stale speech fragment');
const before=history.length;
context.sendMessage('Hola Hola');
assert.equal(history.at(-1)?.text,'Hola Hola','typed words are not microphone-cleaned');
assert.equal(history.length,before+1);
console.log('ATRIA VOICE QA BOT PASS',JSON.stringify({scenarios:passed,typedControl:1,sampleTraces:trace.slice(0,8),engines:'delegated real microphone button + active VoiceV2 + compiled game sendMessage + clinical history and /vozdiag',audio:'WebSpeech events simulated, no physical microphone'}));
