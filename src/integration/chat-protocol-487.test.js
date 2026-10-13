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
let sessions=0;
for(const count of [2,3,4])for(const mode of ['coop','competitive']){
 const r=createAndroidIntegratedRuntime487('PERI-PBE-001',{confirmedIV:1});
 installAndroidClinicalJourney487(r);
 const ctx=r.ctx,owner=ctx.sim,players=Array.from({length:count},(_,i)=>({id:'P'+i,name:'Player '+i}));
 owner.patientInstance.uid='PATIENT-A';owner.chats.patient=[];owner.chats.expert=[];
 const p={index:0,uid:'PATIENT-A',ownerId:'P1',state:'in_care',caseId:ctx.C.id,instance:{name:'Paciente A'}};
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
const c={window:{},document:{},sim:null,refreshChatDock:()=>{},sendMessage:()=>{},
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
console.log('NPC ROOM PROTOCOL PASS',JSON.stringify({sessions,players:[2,3,4],realNativeAdministration:true,
 replaySafe:true,metadata:true,physicalDevices:false,realNetwork:false}));
