import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';

const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
function between(start,end){const a=html.indexOf(start),b=html.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'embedded runtime boundary '+start);return html.slice(a,b)}
const voiceHelpers=between('function csVoiceWord(word){','function csEnsureRecognition(){');
const originalSend=between('function sendMessage(q){','function findStudy(text){');
const normSource=between('window.nsAtriaNormalizeSpeech=function(text){',';window.nsAtriaVoiceChoose=')+';';
const sent=[],patient=[];
const ctx={
 window:{},sim:{},player:{bubble:'',bubbleUntil:0},performance:{now:()=>1000},
 pendingAddress:null,chatRole:null,document:{getElementById:()=>null},
 addGlobalChat:(role,text)=>sent.push({role,text}),
 inferRecipient:()=> 'patient',refreshChatDock(){},
 deliverPatientSpeech:text=>patient.push(text),
 processCommand(){},mentorUserMessage(){},nurseNatural(){},setTimeout(){},
};
vm.createContext(ctx);
vm.runInContext(voiceHelpers+'\n'+normSource+'\n'+originalSend,ctx);
const cases=[
 ['Hola Hola Hola probando Hola probando micrófono','Hola probando micrófono'],
 ['Hola Hola cómo Hola cómo estás Hola cómo estás','Hola cómo estás'],
 ['Por Por qué Por qué estás acá','Por qué estás acá'],
 ['tienes tienes tienes tienes alguna tienes alguna otra enfermedad','tienes alguna otra enfermedad'],
 ['no no tengo alergias','no no tengo alergias'],
 ['muy muy intenso','muy muy intenso']
];
for(const [raw,expected] of cases){
 const normalized=ctx.window.nsAtriaNormalizeSpeech(raw);
 assert.equal(normalized,expected,'late speech normalizer should emit consolidated intent');
 ctx.sendMessage(raw);
 assert.equal(patient.at(-1),expected,'original game sendMessage must normalize before anamnesis');
 assert.equal(sent.at(-1).text,expected,'game history must record only cleaned text');
}
ctx.sendMessage('/estudio resonancia cerebral');
assert.equal(sent.at(-1).text,'/estudio resonancia cerebral','slash command syntax unchanged');
console.log('Actual embedded dialogue send + late normalizer regression OK:',cases.length,'utterances');
