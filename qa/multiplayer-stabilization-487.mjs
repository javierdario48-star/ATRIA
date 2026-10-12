import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../src/integration/apply-487.js';
import {createQaSocialServer} from '../src/social/qa-social-server.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
for(const [label,fragment] of [
 ['guest chat input',"if(C||sim){dock.classList.add('show');dock.setAttribute('aria-hidden','false');refreshChatDock?.()"],
 ['team chat',"send('team_chat',{text,messageId:"],
 ['team chat receive',"if(m.kind==='team_chat')"],
 ['expired room',"if((e.status===404||e.status===410)&&!closed&&room?.id===r.id)"],
 ['ignore stale poll',"if(closed||!room||room.id!==r.id)return;lastOK="],
 ['old ACK reset',"state.groupPlan=null;state.guardDraft=null;state.partyHandshake=null;state.startPromise=null;"],
 ['guest exam', "if(a.kind==='exam')return ['general','abdomen','target'].includes(a.id)"],
 ['guest medication',"else if(a.kind==='therapy'){addMonitorTherapy(a.text)}"],
 ['guest anamnesis',"return requestAssist(p.index,{kind:'speech',text:msg.slice(0,180)})"],
 ['remove lobby badge',"body.nsLobbyMode #csDxBadge487"]
 ])assert(html.includes(fragment),'missing built multiplayer fix '+label);
const start=html.indexOf('function assistActionAllowed(p,a){'),end=html.indexOf('function assistTargetSim(p)',start);
assert(start>=0&&end>start,'real multiplayer permission function');
const ctx={challenge:{mode:'coop'},CASES:[{id:'CASE',studies:[{id:'blood'}],interventions:[{id:'iv'}]}],
 findMonitorTherapy:t=>t==='ceftriaxona 1 g'?{id:'ceftriaxone'}:null};
vm.createContext(ctx);new vm.Script(html.slice(start,end)).runInContext(ctx);
const patient={caseId:'CASE'};
for(const action of [{kind:'exam',id:'general'},{kind:'exam',id:'ns:inspection'},{kind:'exam',id:'ns:auscultation'},{kind:'exam',id:'ns:percussion'},{kind:'exam',id:'ns:palpation'},{kind:'speech',text:'Dónde le duele?'},{kind:'therapy',text:'ceftriaxona 1 g'},{kind:'monitor'},{kind:'study',id:'blood'}])
 assert.equal(ctx.assistActionAllowed(patient,action),true,'cooperative '+action.kind);
for(const action of [{kind:'exam',id:'inventado'},{kind:'speech',text:''},{kind:'therapy',text:'fármaco inexistente'},{kind:'study',id:'fake'}])
 assert.equal(ctx.assistActionAllowed(patient,action),false,'invalid '+action.kind);
ctx.challenge.mode='competitive';
for(const action of [{kind:'therapy',text:'ceftriaxona 1 g'},{kind:'study',id:'blood'},{kind:'intervention',id:'iv'}])
 assert.equal(ctx.assistActionAllowed(patient,action),false,'competitive owner-only '+action.kind);
for(const action of [{kind:'speech',text:'¿Qué le duele?'},{kind:'exam',id:'general'},{kind:'monitor'},{kind:'vitals'},{kind:'iv'}])
 assert.equal(ctx.assistActionAllowed(patient,action),true,'competitive rival can safely observe/assess '+action.kind);

// First valid bedside interaction wins, regardless of host/guest identity.
// The original host authority processes simultaneous claims in arrival order.
const claimStart=html.indexOf('function claim(index,id,x,y){');
const claimEnd=html.indexOf('function loadPatient(index',claimStart);
assert(claimStart>0&&claimEnd>claimStart,'native competitive claim function');
const p0={index:0,state:'waiting',ownerId:null},claimed={patients:[p0],revision:1};
const claimCtx={challenge:claimed,selfId:'A',host:()=>true,guard:()=>true,
 person:id=>['A','B'].includes(id)?{id}:null,near:()=>true,elapsedMs:()=>7,
 applyPatients:()=>{},publish:()=>{}};
vm.createContext(claimCtx);new vm.Script(html.slice(claimStart,claimEnd)).runInContext(claimCtx);
assert.equal(claimCtx.claim(0,'B',0,0),true,'guest first interaction claims patient');
assert.equal(claimCtx.claim(0,'A',0,0),false,'host cannot steal already claimed patient');
assert.equal(p0.ownerId,'B');
assert.equal(claimed.revision,2,'one authoritative ownership transition');

// Check the real shared UI loader and relay, not just text markers.
assert(html.includes("function loadSharedPatient487(index,monitor=false)"),'guest must use native V40 full patient UI');
assert(html.includes("sim.__csRemoteMirror487=true"),'visiting clinical copy must be marked non-authoritative');
assert(html.includes("sim?.__csRemoteMirror487?undefined:base.update.call(this,dt)"),
 'visiting peer must never integrate a second independent physiology');
const foreignAt=html.indexOf("function foreignClinical487(){"),takeAt=html.indexOf("function takePatient(index,monitor=false)",foreignAt);
assert(foreignAt>0&&takeAt>foreignAt,'real shared patient navigator');
const visitor={index:0,ownerId:'OWNER',uid:'same-patient-uid',caseId:'CASE',state:'in_care',
 instance:{bed:{label:'B1'}}};
const mirrorCtx={challenge:{mode:'coop',patients:[visitor],assistIndex:null},selfId:'GUEST',
 shiftSession:{index:-1,records:[{sim:null}]},sim:null,loading:false,guard:()=>true,
 near:()=>true,modeLabel:()=>{},refreshChatDock:()=>{}};
let nativeLoads=0;
mirrorCtx.base={load:(_i,opts)=>{nativeLoads++;mirrorCtx.sim={
 patientInstance:{uid:'temporary'},mentor:{enabled:true},playMode:'solo',
 __csRoomSpectator:true};return true;}};
vm.createContext(mirrorCtx);
new vm.Script(html.slice(foreignAt,takeAt)).runInContext(mirrorCtx);
assert.equal(mirrorCtx.loadSharedPatient487(0,true),true);
assert.equal(nativeLoads,1,'guest uses the original solo record loader');
assert.equal(mirrorCtx.sim.patientInstance.uid,visitor.uid);
assert.equal(mirrorCtx.sim.__csRemoteMirror487,true);
assert.equal(mirrorCtx.sim.playMode,'coop');
assert.equal(mirrorCtx.challenge.assistIndex,0);
const actionStart=html.indexOf('function applyAssistAction(p,a,helper){'),actionEnd=html.indexOf('function requestAssist(index,a){',actionStart);
assert(actionStart>0&&actionEnd>actionStart,'actual native patient-owner relay');
const calls=[],ownerSim={patientInstance:{uid:visitor.uid}};
const ownerCtx={challenge:{mode:'coop'},selfId:'OWNER',
 assistTargetSim:()=>ownerSim,assistActionAllowed:()=>true,
 CASES:[{id:'CASE'}],window:{csWithPatientStateV203:(_s,_c,fn)=>fn()},
 sendMessage:(text)=>{calls.push(['native-command',text]);return true;},
 addGlobalChat:()=>{},refreshChatDock:()=>{}};
vm.createContext(ownerCtx);
new vm.Script(html.slice(actionStart,actionEnd)).runInContext(ownerCtx);
assert.equal(ownerCtx.applyAssistAction(visitor,{kind:'command',text:'enfermera ceftriaxona y metronidazol'},'GUEST'),true);
assert.deepEqual(calls,[['native-command','enfermera ceftriaxona y metronidazol']],'owner alone routes to native medication parser');
const db=new Map(),storage={get:async k=>db.get(k)??null,set:async(k,v)=>{db.set(k,v)},delete:async k=>db.delete(k)};
let nonce=0;
const server=createQaSocialServer(storage,{now:()=>2000000,
 uuid:()=>('f0000000-0000-4000-8000-'+String(++nonce).padStart(12,'0'))});
const call=(path,method='GET',body={},token='',query={})=>server.route({path,method,body,query,headers:{authorization:'Bearer '+token}});
const reg=async n=>(await call('register','POST',{name:n,handle:n.toLowerCase(),clientKey:'client-very-long-unique-'+n})).body;
const a=await reg('MedicoA'),b=await reg('MedicoB');assert(a.token&&b.token&&a.user.id!==b.user.id);
let previous=null;
for(let i=0;i<5;i++){
 const mode=i%2?'competitive':'coop';
 const result=await call('rooms','POST',{mode,invitees:[b.user.id],peerId:'peer-A'},a.token);
 assert.equal(result.status,201);const id=result.body.room.id;
 assert.notEqual(id,previous);assert.equal((await call('rooms/join','POST',{roomId:id,peerId:'peer-B'},b.token)).status,200);
 assert.equal((await call('rooms/'+id+'/messages','POST',{message:{type:'cs_room_v411',kind:'team_chat',text:'hola '+i}},b.token)).status,200);
 const received=await call('rooms/'+id+'/messages','GET',{},a.token,{after:0});
 assert(received.body.messages.some(x=>x.userId===b.user.id&&x.data.text==='hola '+i));
 const first=i%2?a:b,last=i%2?b:a;
 assert.equal((await call('rooms/'+id+'/leave','POST',{},first.token)).status,200);
 assert.equal((await call('rooms/'+id+'/leave','POST',{},last.token)).status,200);
 assert.equal((await call('rooms/join','POST',{roomId:id,peerId:'peer-B'},b.token)).status,404);
 previous=id;
}
console.log('ATRIA MULTIPLAYER STABILIZATION BOT PASS',JSON.stringify({
 cycles:5,independentAuthenticatedClients:2,
 cooperative:['exam','speech','therapy','monitor','study'],
 competitiveNoForeignMedicationOrStudy:true,competitiveRivalSpeechAndExam:true,firstInteractionClaim:true,source:'integrated built source and live server contracts',
 browser:false,realNetwork:false}));
