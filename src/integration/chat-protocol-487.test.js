// Native room receiver and nursing engine, connected by an in-process bus.
// This tests 2–4 players, replay and sender/recipient metadata, not WebRTC.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {generatedAndroidCandidate487 as html,createAndroidIntegratedRuntime487,
 installAndroidClinicalJourney487} from '../../qa/android-integrated-runtime-487.mjs';
import {advanceLiveNativeJourney487 as advance} from '../../qa/physiology-live/native-journey-487.mjs';
const section=(from,to)=>{const a=html.indexOf(from),b=html.indexOf(to,a+from.length);
 assert(a>=0&&b>a,from);return html.slice(a,b)};
const permission=section('function assistActionAllowed(p,a){','function assistTargetSim(p)');
const execute=section('function applyAssistAction(p,a,helper){','function requestAssist(index,a){');
const receive=section("function receive(m){if(m?.type!=='cs_room_v411')",' csWireDataChannel=function(dc)');
const request=section('function requestAssist(index,a){','function openAssistPanel(index)');
const broadcast=section('window.csBroadcastAddressedChat487=function(role,raw){','function roomCommand(q){');
const selector=html.split('<script id="atria-recipient-selector-487">')[1].split('</script>')[0];
// A delayed answer must stay on the interviewed patient, even when the
// physician switches beds before the native speech delay has elapsed.
{
 const r=createAndroidIntegratedRuntime487('APP-001',{confirmedIV:1});
 installAndroidClinicalJourney487(r);const c=r.ctx;
 vm.runInContext(section('function patientReply(q){','function mentorProfile(){'),c);
 const a=c.sim;a.chats.patient=[];
 c.deliverPatientSpeech('¿Desde cuándo tiene dolor?',true);
 c.sim=c.freshSim();c.sim.patientInstance={uid:'PATIENT-B'};c.sim.chats.patient=[];
 const b=c.sim;
 advance(r,.5,{dt:1/6});
 assert(a.chats.patient.some(x=>x[0]==='patient'),'delayed reply remains on patient A');
 assert.equal(b.chats.patient.length,0,'switching beds cannot record patient A answer on B');
}
let sessions=0;
for(const count of [2,3,4])for(const mode of ['coop','competitive']){
 const r=createAndroidIntegratedRuntime487('PERI-PBE-001',{confirmedIV:1});
 installAndroidClinicalJourney487(r);
 const ctx=r.ctx,owner=ctx.sim,players=Array.from({length:count},(_,i)=>({id:'P'+i,name:'Player '+i}));
 owner.patientInstance.uid='PATIENT-A';owner.chats.patient=[];owner.chats.expert=[];
 const p={index:0,uid:'PATIENT-A',ownerId:'P1',state:'in_care',caseId:ctx.C.id,instance:{name:'Paciente A'}};
 // NPC answers stay in the same public transcript for teammates who are
 // attending a different patient. Reading one must never execute an order.
 for(const reader of players.filter(x=>x.id!=='P1')){
  const messages=[],view={challenge:{active:true,ended:false,id:'ROOM',mode,hostId:'P0',players,patients:[p]},
   selfId:reader.id,person:id=>players.find(x=>x.id===id),host:()=>reader.id==='P0',
   addGlobalChat:(role,text)=>messages.push({role,text}),refreshChatDock:()=>{},
   nurseNatural:()=>{throw Error('public NPC response may not execute nursing')},
   applyAssistAction:()=>{throw Error('public NPC response may not execute clinical actions')}};
  vm.createContext(view);vm.runInContext(receive,view);
  const message={type:'cs_room_v411',kind:'team_chat',id:'ROOM',peerId:'P1',
   npcSpeaker:'expert',patientUid:p.uid,recipient:'doctor',messageId:'P1:REPLY',
   text:'Si la PA es <90, reevaluemos antes de noradrenalina. '+ 'Reevaluemos perfusión. '.repeat(10)};
  view.receive(message);view.receive(message);
  assert.equal(messages.length,1,'one full NPC response visible to every teammate');
  assert.equal(messages[0].role,'expert');assert.equal(messages[0].text,message.text);
  view.receive({...message,peerId:'P0',messageId:'P0:FORGED'});
  assert.equal(messages.length,1,'foreign peer cannot impersonate another patient NPC');
 }
 ctx.challenge={active:true,ended:false,id:'ROOM',mode,hostId:'P0',players,patients:[p]};
 ctx.selfId='P1';ctx.host=()=>false;ctx.person=id=>ctx.challenge.players.find(x=>x.id===id);
 ctx.assistTargetSim=()=>owner;ctx.refreshChatDock=()=>{};
 ctx.window.csWithPatientStateV203=(_s,_id,fn)=>fn();
 // Native patient delivery is installed by the clinical journey; use its
 // real responses, while Vega's listener changes the actual patient-bound job.
 ctx.mentorUserMessage=text=>{owner.nsVegaCare={active:true,phase:'decision487',lastReply:text};};
 vm.runInContext(section('function patientReply(q){','function mentorProfile(){'),ctx);
 vm.runInContext(selector,ctx);vm.runInContext(permission+'\n'+execute+'\n'+receive,ctx);
 const packet={type:'cs_room_v411',kind:'assist_apply',id:'ROOM',peerId:'P0',
  targetId:'P1',helperId:'P0',helperName:'Host',index:0,uid:p.uid,aid:'P0:MED-1',
  action:{kind:'command',recipient:'nurse',text:'Enfermera, ceftriaxona'}};
 if(mode==='coop'){
  ctx.receive(packet);advance(r,5,{dt:1/6});
  assert.equal(owner.administrationLog.filter(x=>x.id==='ceftriaxone').length,1);
  ctx.receive(packet);advance(r,10,{dt:1/6});
  assert.equal(owner.administrationLog.filter(x=>x.id==='ceftriaxone').length,1,
   'replayed assist after real administration must not administer another dose');
  assert.equal(r.messages.filter(x=>x.role==='doctor'&&x.text==='Host: Enfermera, ceftriaxona').length,1,
   'one authoritative interpretation and transcript entry per clinical message ID');
  const before=owner.chats.patient.length;
  ctx.receive({...packet,aid:'P0:VEGA',action:{kind:'command',recipient:'expert',text:'Dr. Vega, ¿debo dar noradrenalina?'}});
  assert.equal(owner.nsVegaCare.lastReply,'¿debo dar noradrenalina?');
  assert.equal(owner.chats.patient.length,before,'Vega reply cannot enter patient anamnesis');
  assert(!owner.pendingTherapies.has('vasopressor'));
  ctx.receive({...packet,aid:'P0:PATIENT',action:{kind:'command',recipient:'patient',text:'¿Desde cuándo está así?'}});
  advance(r,11,{dt:1/6});
  assert(owner.chats.patient.some(x=>x[0]==='patient'),'native patient answer');
  // Mismatched routing metadata is rejected at the owner's native permission boundary.
  ctx.receive({...packet,aid:'P0:FORGED',action:{kind:'command',recipient:'patient',text:'Enfermera, metronidazol'}});
  assert(!owner.pendingTherapies.has('metronidazole'));
 }else{
  ctx.receive(packet);advance(r,2,{dt:1/6});
  assert.equal(owner.administrationLog.length,0,'competitive rival cannot administer');
  assert.equal(ctx.assistActionAllowed(p,{kind:'study',id:'pbe_renal'}),false);
  assert.equal(ctx.assistActionAllowed(p,{kind:'speech',text:'¿Qué le pasó?'}),true);
 }
 // Peer departure and host handover preserve replay receipts on this patient.
 ctx.challenge.players=players.filter(x=>x.id!=='P0');ctx.challenge.hostId='P1';ctx.host=()=>true;
 const administered=owner.administrationLog.length;
 ctx.receive({...packet,peerId:'P0'});advance(r,12,{dt:1/6});
 assert.equal(owner.administrationLog.length,administered,'old host packet cannot revive a clinical action');
 ctx.challenge.id='NEXT-ROOM';
 ctx.receive(packet);assert.equal(owner.administrationLog.length,administered,'old room is isolated');
 sessions++;
}
// Request and public transcript retain the actual author and NPC recipient.
const outgoing=[],room={mode:'coop',active:true,ended:false,id:'ROOM',patients:[
 {index:0,uid:'A',ownerId:'P1',state:'in_care',instance:{name:'A'}}]};
const c={window:{},document:{},sim:null,addGlobalChat:()=>{},refreshChatDock:()=>{},sendMessage:()=>{},
 challenge:room,selfId:'P0',near:()=>true,host:()=>false,
 shared:()=>true,player:{x:1,y:2},csSendPeerState:()=>{},assistActionAllowed:()=>true,
 send:(kind,payload)=>outgoing.push({kind,peerId:'P0',...payload}),
 person:()=>({name:'Owner'}),toast:()=>{}};
vm.createContext(c);
// Install the same parser, without a clinical composer or browser fixture.
vm.runInContext(selector,c);vm.runInContext(request+'\n'+broadcast,c);
c.requestAssist(0,{kind:'command',text:'Dr. Vega, no sé'});
assert.equal(outgoing.at(-1).action.recipient,'expert');
assert.equal(outgoing.at(-1).peerId,'P0');assert.equal(outgoing.at(-1).uid,'A');
c.window.csBroadcastAddressedChat487('nurse','Enfermera, Ringer');
assert.equal(outgoing.at(-1).recipient,'nurse');assert.equal(outgoing.at(-1).peerId,'P0');
// The actual compiled send/receive functions: disconnected-room messages wait,
// distinct peers acknowledge independently, and wrong-room ACKs are ignored.
const reliable=section('const nsReliableChat487=new Map();','function roomPayload(full)');
for(const count of [2,3,4]){
 const members=Array.from({length:count},(_,i)=>({id:'P'+i,name:'Medic '+i,online:true}));
 const sent=[],scheduled=[],notice=[],messageId='P0:RELIABLE-'+count;
 const host={challenge:{active:true,ended:false,id:'ROOM',hostId:'P1',players:members},selfId:'P0',
  csCoop:{dc:{readyState:'connecting',send:packet=>sent.push(JSON.parse(packet))}},
  pendingCareers:new Map(),name:()=> 'Medic 0',person:id=>members.find(p=>p.id===id),
  addGlobalChat:(role,text)=>notice.push([role,text]),refreshChatDock:()=>{},
  setTimeout:fn=>{scheduled.push(fn);return scheduled.length;},host:()=>false};
 vm.createContext(host);vm.runInContext(reliable+'\n'+receive,host);
 assert.equal(host.send('team_chat',{text:'Hola al equipo',messageId}),true);
 assert.equal(sent.length,0,'not-ready data channel cannot silently drop, nor pretend to transmit');
 assert.equal(vm.runInContext('nsReliableChat487.size',host),1);
 host.csCoop.dc.readyState='open';scheduled.shift()();
 assert.equal(sent.filter(x=>x.kind==='team_chat').length,1);
 const ack={type:'cs_room_v411',kind:'team_chat_ack',id:'ROOM',
  messageId,targetId:'P0'};
 host.receive({...ack,id:'OTHER',peerId:'P1'});
 assert.equal(vm.runInContext('nsReliableChat487.size',host),1,'foreign-room ACK must not complete receipt');
 for(let i=1;i<count;i++){
  host.receive({...ack,peerId:'P'+i});
  assert.equal(vm.runInContext('nsReliableChat487.size',host),0,
   'guest outbox is acknowledged by the verified host on a host-spoked room');
 }
 host.receive({...ack,peerId:'P1'});
 assert.equal(notice.filter(x=>/mensaje recibido/i.test(x[1])).length,1,'exactly one receipt');
 // A cooperative clinical command must wait and retry under the SAME aid.
 // An unrelated peer's acknowledgement cannot finalize a medical action.
 host.challenge.hostId='P1';
 const aid='P0:CLINICAL-'+count;
 assert.equal(host.send('assist',{aid,index:0,uid:'PAT',action:{kind:'command',text:'Enfermera Ringer'}}),true);
 assert.equal(sent.filter(x=>x.kind==='assist'&&x.aid===aid).length,1);
 assert.equal(vm.runInContext('nsReliableChat487.size',host),1);
 host.receive({type:'cs_room_v411',kind:'assist_ack',id:'ROOM',aid,peerId:'P0',targetId:'P0'});
 assert.equal(vm.runInContext('nsReliableChat487.size',host),1,'self or foreign ACK is insufficient');
 host.receive({type:'cs_room_v411',kind:'assist_ack',id:'ROOM',aid,peerId:'P1',targetId:'P0'});
 assert.equal(vm.runInContext('nsReliableChat487.size',host),0,'host accepted order; still not called administered');
 const appliedAid='P1:OWNER-AID-'+count;
 host.send('assist_apply',{aid:appliedAid,targetId:'P1',uid:'PAT',action:{kind:'command',text:'Enfermera oxígeno'}});
 assert.equal(vm.runInContext('nsReliableChat487.size',host),1);
 host.receive({type:'cs_room_v411',kind:'assist_apply_ack',id:'ROOM',aid:appliedAid,peerId:'P1',targetId:'P0'});
 assert.equal(vm.runInContext('nsReliableChat487.size',host),0);
 assert(!notice.some(([role,text])=>/administrado|completado/i.test(text)&&role==='system'),
  'ACK means reception by clinical owner, NEVER medication administration');
}
console.log('NPC ROOM PROTOCOL PASS',JSON.stringify({sessions,players:[2,3,4],realNativeAdministration:true,
 replaySafe:true,metadata:true,physicalDevices:false,realNetwork:false}));
