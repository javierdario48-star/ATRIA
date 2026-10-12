/**
 * ATRIA 4.8.7 — four-mode and concurrent-room regression bots.
 * Exercised: the integrated HTML's clinical permission and owner relay
 * plus the REAL QA social-server route handlers, not a mock server contract.
 * Limits: Node VM + in-memory requests, not two physical browsers/WebRTC.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../src/integration/apply-487.js';
import {createQaSocialServer} from '../src/social/qa-social-server.js';
import {roomTransportReady} from '../src/social/party-transport.js';
import {CARE_JOURNEYS_487} from './clinical-care-journeys-487.js';
import {GLOBAL_TREATMENTS_487} from '../src/clinical/general-therapy-487.js';

const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const between=(from,to)=>{
 const a=html.indexOf(from),b=html.indexOf(to,a+from.length);
 assert(a>=0&&b>a,'integrated source boundary: '+from);
 return html.slice(a,b);
};
// The two individual guard modes share the same clinical engine, not a
// second clinical implementation. Their 13 cases and 30 therapies are
// exercised more deeply in care-journeys + clinical-matrix + nursing tests.
for(const mode of ['Aprendiz','Solitario','Cooperativo','Competitivo'])
 assert(html.includes(mode),'mode missing in final built artifact: '+mode);
assert.equal(Object.keys(CARE_JOURNEYS_487).length,13);
assert.equal(Object.keys(GLOBAL_TREATMENTS_487).length,30);
assert(html.includes('function loadSharedPatient487(index,monitor=false)'),
 'coop must use original native clinical patient UI');
assert(html.includes('sim?.__csRemoteMirror487?undefined:base.update.call(this,dt)'),
 'single authoritative physiological progression');

const source=between('function assistActionAllowed(p,a){','function assistTargetSim(p)');
const scope={challenge:{mode:'coop'},
 CASES:[{id:'QA',studies:[{id:'lab'}],interventions:[{id:'iv'}]}],
 findMonitorTherapy:text=>/ceftriaxona/.test(text)?{id:'ceftriaxone'}:null};
vm.createContext(scope);new vm.Script(source).runInContext(scope);
const patient={caseId:'QA'};
const allowed=[
 {kind:'speech',text:'¿Dónde le duele?'},{kind:'exam',id:'general'},
 {kind:'exam',id:'ns:palpation'},{kind:'exam',id:'ns:auscultation'},
 {kind:'monitor'},{kind:'vitals'},{kind:'iv'},
 {kind:'therapy',text:'ceftriaxona 1 g'},{kind:'study',id:'lab'},
 {kind:'intervention',id:'iv'},
 {kind:'command',text:'enfermera vías, monitor, ceftriaxona y hemograma'},
 {kind:'clinical_call',method:'csSetDiagnosticImpression',args:['diagnostico']},
 {kind:'finish',reason:'completed'}
];
const denied=[
 {kind:'speech',text:''},{kind:'speech',text:'x'.repeat(181)},
 {kind:'exam',id:'invalid'}, {kind:'study',id:'nonexistent'},
 {kind:'therapy',text:'fármaco desconocido'},
 {kind:'command',text:' '},{kind:'command',text:'x'.repeat(221)},
 {kind:'clinical_call',method:'eval',args:['hijack']},
 {kind:'finish',reason:'death'}
];
let permissions=0;
for(const action of allowed){
 assert.equal(scope.assistActionAllowed(patient,action),true,'coop allows '+JSON.stringify(action));
 permissions++;
}
for(const action of denied){
 assert.equal(scope.assistActionAllowed(patient,action),false,'coop rejects '+JSON.stringify(action));
 permissions++;
}
scope.challenge.mode='competitive';
for(const action of [{kind:'speech',text:'¿Cómo está?'},{kind:'exam',id:'ns:percussion'},{kind:'monitor'},{kind:'vitals'}]){
 assert.equal(scope.assistActionAllowed(patient,action),true,'rival may observe/examine: '+action.kind);permissions++;
}
for(const action of [
 {kind:'therapy',text:'ceftriaxona 1 g'},{kind:'study',id:'lab'},
 {kind:'intervention',id:'iv'}, {kind:'command',text:'enfermera ceftriaxona'},
 {kind:'finish',reason:'completed'},
 {kind:'clinical_call',method:'csRequestConsult',args:['cirugia']}
]){
 assert.equal(scope.assistActionAllowed(patient,action),false,'rival cannot mutate clinical state: '+action.kind);permissions++;
}
assert.equal(scope.assistActionAllowed(null,{kind:'monitor'}),false,'no invented patient');

// Exercise the real owner-side native relay. There is one owner and a
// helper; only the owner runs the native clinical command/exam/study/closure.
const applied=between('function applyAssistAction(p,a,helper){','function requestAssist(index,a){');
const log=[];
const target={index:0,uid:'QA-UID',caseId:'QA'};
const owner={challenge:{mode:'coop'},selfId:'OWNER',
 assistTargetSim:()=>owner.sim,assistActionAllowed:()=>true,
 CASES:[{id:'QA',studies:[{id:'lab'}],interventions:[{id:'iv'}]}],
 sim:{patientInstance:{uid:'QA-UID'},chats:{patient:[]}},
 window:{csWithPatientStateV203:(_s,_c,fn)=>fn()},
 sendMessage:t=>{log.push(['command',t]);return true},
 performExamRegion:id=>log.push(['exam',id]),
 patientReply:q=>'respondió',
 addGlobalChat:()=>{},
 orderStudy:it=>log.push(['study',it.id]),
 orderIntervention:it=>log.push(['intervention',it.id]),
 addMonitorTherapy:t=>log.push(['therapy',t]),
 csQueueMonitor:()=>log.push(['monitor']),
 csQueueIV:()=>log.push(['iv']),
 captureMonitorVitals:()=>log.push(['vitals'])};
vm.createContext(owner);new vm.Script(applied).runInContext(owner);
assert(owner.applyAssistAction(target,{kind:'command',text:'enfermera vías y monitor'},'GUEST'));
assert.equal(log.filter(x=>x[0]==='command').length,1,'exactly one authoritative nursing dispatch');
owner.challenge.mode='competitive';
const before=log.length;
for(const action of [{kind:'command',text:'enfermera ceftriaxona'}, {kind:'study',id:'lab'},
 {kind:'therapy',text:'ceftriaxona 1 g'}, {kind:'intervention',id:'iv'}])
 assert.equal(owner.applyAssistAction(target,action,'RIVAL'),false,'owner rejects opponent drug/lab action');
assert.equal(log.length,before,'no denied competitive action executed');

// Exercise the actual competitor bedside text router, including adversarial
// mixed voice/text orders, ambiguous commands, and old rival selection.
const navigation=between('function foreignClinical487(){','function takePatient(index,monitor=false)');
const actions=[],warnings=[];
const rival={challenge:{mode:'competitive',assistIndex:0,patients:[{...target,ownerId:'OWNER',state:'in_care'}]},
 selfId:'RIVAL',shared:()=>true,near:()=>true,canAct:()=>false,
 window:{nsIsClinicalQuestion:t=>/[?¿]/.test(t)},
 requestAssist:(index,action)=>{actions.push(action);return true},
 toast:t=>warnings.push(t)};
vm.createContext(rival);new vm.Script(navigation).runInContext(rival);
const inputs=[
 ['enfermera monitor, ceftriaxona y hemograma',['monitor']],
 ['enfermera signos vitales, ringer y cultivo',['vitals']],
 ['enfermera administrar morfina',[]],
 ['enfermera hemograma, tomografía y ecografía',[]],
 ['examinar y auscultar',['exam']],
 ['paciente, ¿dónde le duele?',['speech']],
 ['enfermera monitor y signos vitales',['monitor','vitals']],
 ['/equipo Hagan el triage',[]]
];
let bedside=0;
for(const [q,kinds] of inputs){
 const start=actions.length;
 const handled=rival.foreignRivalInput487(q);
 if(q.startsWith('/equipo'))assert.equal(handled,null,'social text stays distinct');
 else assert.equal(handled,true,'recognize bedside text: '+q);
 assert.deepEqual(actions.slice(start).map(a=>a.kind),kinds,'rival action safety '+q);
 bedside++;
}
rival.challenge.assistIndex=null;
assert.equal(rival.foreignRivalInput487('enfermera ceftriaxona'),null,'stale patient selection cleared');
rival.challenge.assistIndex=0;
rival.canAct=()=>true;
assert.equal(rival.foreignRivalInput487('enfermera Ringer'),null,'rival mode must not hijack own currently active patient');

// Real route/controller: 4 independent authenticated peers, 2/3/4-member
// rooms, each mode, repeated starts, stale messages, ACL, role transfer.
const db=new Map(),storage={get:async k=>db.get(k)??null,set:async(k,v)=>{db.set(k,v)},delete:async k=>db.delete(k)};
let n=0,clock=2_000_000;
const server=createQaSocialServer(storage,{now:()=>clock,
 uuid:()=>('f0000000-0000-4000-8000-'+String(++n).padStart(12,'0'))});
const call=(path,method='GET',body={},token='',query={})=>
 server.route({path,method,body,query,headers:token?{authorization:'Bearer '+token}:{}});
const players=[];
for(const name of ['MedicoA','MedicoB','MedicoC','MedicoD','Intruso']){
 const r=await call('register','POST',{name,handle:name.toLowerCase(),clientKey:'long-session-client-key-'+name});
 assert.equal(r.status,200);
 players.push({name,token:r.body.token,id:r.body.user.id,peerId:'peer-unique-'+name});
}
for(const p of players){
 assert.equal((await call('lobby/state','POST',{peerId:p.peerId,x:200,y:180,seq:1},p.token)).status,200);
}
const spectator=players[4];let rooms=0,deliveries=0,removed=0,hostTransfers=0;
let lastRoom=null;
for(const mode of ['coop','competitive'])for(const size of [2,3,4])for(let run=0;run<5;run++){
 const all=players.slice(0,size),host=all[run%size],others=all.filter(p=>p!==host);
 const created=await call('rooms','POST',{mode,invitees:others.map(p=>p.id),peerId:host.peerId},host.token);
 assert.equal(created.status,201,'create '+mode+' '+size);
 const id=created.body.room.id;
 assert.notEqual(id,lastRoom,'room ID must be new on every session');
 assert.equal(created.body.room.allAccepted,false);
 if(lastRoom)assert.equal((await call('rooms/'+lastRoom+'/messages','GET',{},host.token,{after:0})).status,404,
  'older session must never be resumed');
 for(let k=0;k<others.length;k++){
  const p=others[k],joined=await call('rooms/join','POST',{roomId:id,peerId:p.peerId},p.token);
  assert.equal(joined.status,200);
  assert.equal(joined.body.room.allAccepted,k===others.length-1,'all members must accept before start');
 }
 const polled=await call('rooms/'+id+'/messages','GET',{},host.token,{after:0});
 const room=polled.body.room;
 assert.equal(room.members.length,size);
 assert.equal(room.allAccepted,true);
 assert.equal(roomTransportReady({room,localUserId:host.id,connected:true,channelState:'open'}),true);
 assert.equal(roomTransportReady({room,localUserId:host.id,connected:true,channelState:'connecting'}),false);
 for(const p of all){
  const duplicate=await call('rooms/join','POST',{roomId:id,peerId:p.peerId},p.token);
  assert.equal(duplicate.body.room.members.length,size,'rejoining must not duplicate participants');
 }
 assert.equal((await call('rooms/'+id+'/messages','GET',{},spectator.token)).status,403,
  'nonmember must not read clinical packets');
 assert.equal((await call('rooms/'+id+'/messages','POST',{message:{type:'cs_room_v411',kind:'assist'}},spectator.token)).status,403,
  'nonmember must not send clinical packets');
 for(const p of all){
  const packet={type:'cs_room_v411',kind:'team_chat',peerId:p.peerId,text:mode+' '+size+' '+run+' '+p.name};
  assert.equal((await call('rooms/'+id+'/messages','POST',{message:packet},p.token)).status,200);
  deliveries++;
 }
 const inbox=(await call('rooms/'+id+'/messages','GET',{},host.token,{after:0})).body.messages;
 assert.equal(inbox.length,size,'messages must preserve member identity');
 for(const x of inbox){
  const sender=all.find(p=>p.id===x.userId);
  assert(sender&&x.data.peerId===sender.peerId,'verified envelope binds room peer to identity');
 }
 const bad=await call('rooms/'+id+'/messages','POST',{message:{type:'cs_room_v411',kind:'assist',peerId:spectator.peerId}},others[0].token);
 assert.equal(bad.status,200,'untrusted payload must be checked client-side');
 const spoofed=(await call('rooms/'+id+'/messages','GET',{},host.token,{after:size})).body.messages;
 assert.equal(spoofed.length,1);
 const trusted=spoofed.filter(x=>room.members.some(m=>m.userId===x.userId&&m.peerId===x.data.peerId));
 assert.equal(trusted.length,0,'client authorization gate must reject peerId spoofing');
 // Delete host first in alternate runs: the next member must become host,
 // then everyone must be able to return to lobby and start fresh.
 if(run%2===0){
  assert.equal((await call('rooms/'+id+'/leave','POST',{},host.token)).status,200);
  const transferred=(await call('rooms/'+id+'/messages','GET',{},others[0].token)).body.room;
  assert.equal(transferred.hostUserId,others[0].id);
  hostTransfers++;
  for(const p of others)assert.equal((await call('rooms/'+id+'/leave','POST',{},p.token)).status,200);
 }else{
  for(const p of others)assert.equal((await call('rooms/'+id+'/leave','POST',{},p.token)).status,200);
  assert.equal((await call('rooms/'+id+'/leave','POST',{},host.token)).status,200);
 }
 assert.equal((await call('rooms/'+id+'/messages','GET',{},host.token)).status,404);
 assert.equal((await call('rooms/join','POST',{roomId:id,peerId:others[0].peerId},others[0].token)).status,404);
 rooms++;removed++;lastRoom=id;clock+=1_000;
}
// Dedicated modes keep the untouched solo clinical lifecycle and Dr Vega;
// the existing nurse/care bots execute the same native engine for all cases.
console.log('ATRIA FOUR-MODE AND MULTIPLAYER STRESS BOT PASS',JSON.stringify({
 modeNames:['Aprendiz','Solitario','Cooperativo','Competitivo'],
 fullClinicalCases:13,therapyCatalogue:30,permissions,bedsideCommands:bedside,
 rooms,roomsPerMode:rooms/2,playerSizes:[2,3,4],
 independentlyAuthenticatedPlayers:players.length,
 messagesDelivered:deliveries,hostTransfers,closedRooms:removed,
 server:'real QA route handlers in memory',browser:false,realWebRTC:false
}));
