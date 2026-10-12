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
 ['guest exam', "if(a.kind==='exam')return ['general','abdomen','target','inspection','auscultation','percussion','palpation','ns:inspection'"],
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
// Competitive bedside chat uses the existing authorized relay; text and voice
// cannot turn a mixed nursing command into an opponent's administration/order.
const rivalActions=[],rivalToasts=[];
const rivalCtx={challenge:{mode:'competitive',assistIndex:0,patients:[{...visitor,index:0}]},
 selfId:'GUEST',shared:()=>true,near:()=>true,window:{nsIsClinicalQuestion:t=>/[?¿]/.test(t)},
 requestAssist:(index,action)=>{rivalActions.push({index,action});return true},
 toast:t=>rivalToasts.push(t)};
vm.createContext(rivalCtx);
new vm.Script(html.slice(foreignAt,takeAt)).runInContext(rivalCtx);
assert.equal(rivalCtx.foreignRivalInput487('enfermera monitor, ceftriaxona y hemograma'),true);
assert.equal(JSON.stringify(rivalActions),JSON.stringify([{index:0,action:{kind:'monitor'}}]),
 'mixed monitor + antibiotic + study must execute ONLY the benign portion');
assert.equal(rivalToasts.length,1,'mixed order must explain the denied clinical actions');
rivalActions.length=0;
assert.equal(rivalCtx.foreignRivalInput487('enfermera hemograma'),true);
assert.equal(rivalActions.length,0,'rival cannot request new laboratory tests');
assert.equal(rivalCtx.foreignRivalInput487('enfermera ceftriaxona'),true);
assert.equal(rivalActions.length,0,'rival cannot request medication');
assert.equal(rivalCtx.foreignRivalInput487('paciente, ¿dónde le duele?'),true);
assert.equal(rivalActions.at(-1).action.kind,'speech','main clinical chat reaches rival patient history');
assert.equal(rivalCtx.foreignRivalInput487('examinar: auscultar'),true);
assert.equal(rivalActions.at(-1).action.id,'ns:auscultation','bedside physical exam allowed');
assert.equal(rivalCtx.foreignRivalInput487('enfermera signos vitales'),true);
assert.equal(rivalActions.at(-1).action.kind,'vitals','nursing vitals remain allowed');
assert.equal(rivalCtx.foreignRivalInput487('/equipo hola'),null,'explicit social chat is separate');
rivalCtx.challenge.assistIndex=null;
assert.equal(rivalCtx.foreignRivalInput487('enfermera ceftriaxona'),null,
 'no clinical patient guessed without an explicit bedside selection');
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

// Guest closure is requested once on the owner, never closed locally.
ownerCtx.shiftSession={index:2};
ownerCtx.finishCase=reason=>{calls.push(['finish',reason,ownerCtx.shiftSession.index]);return true;};
assert.equal(ownerCtx.applyAssistAction(visitor,{kind:'finish',reason:'completed'},'GUEST'),true);
assert.equal(ownerCtx.shiftSession.index,2,'owner resumes original current patient');
assert.deepEqual(calls.at(-1),['finish','completed',0],'native shared completion targets correct patient once');
// The competitive first-contact rule also works for unambiguous bedside
// speech/nursing commands — without inventing a patient for ambiguous orders.
const inputAt=html.indexOf("sendMessage=function(q){\n  if(shared()){const remote=foreignClinical487()");
const inputEnd=html.indexOf(" // Guard both direct APIs",inputAt);
assert(inputAt>0&&inputEnd>inputAt,'actual clinical send hook');
const autoCalls=[],singleFree={index:0,ownerId:null,state:'waiting'};
const inputCtx={challenge:{mode:'competitive',active:true,ended:false,assistIndex:null,patients:[singleFree]},
 shared:()=>true,foreignClinical487:()=>null,foreignRivalInput487:()=>null,roomCommand:()=>false,canAct:()=>inputCtx.claimed===true,
 claimed:false,near:()=>true,pendingAutoCommand487:null,window:{nsIsClinicalQuestion:()=>false},
 takePatient:index=>{autoCalls.push(['claim',index]);inputCtx.claimed=true;return true;},
 oldSend:text=>{autoCalls.push(['native',text]);return true;},send:()=>true,addGlobalChat:()=>{},
 refreshChatDock:()=>{},player:{},selfId:'GUEST',performance:{now:()=>0}};
vm.createContext(inputCtx);
new vm.Script(html.slice(inputAt,inputEnd)).runInContext(inputCtx);
inputCtx.sendMessage('enfermera Ringer');
assert.deepEqual(autoCalls,[['claim',0],['native','enfermera Ringer']],
 'first unambiguous clinical request acquires patient then invokes native nursing once');
autoCalls.length=0;inputCtx.claimed=false;inputCtx.pendingAutoCommand487=null;
inputCtx.challenge.patients=[singleFree,{index:1,ownerId:null,state:'waiting'}];
inputCtx.sendMessage('enfermera Ringer');
assert.equal(autoCalls.some(x=>x[0]==='claim'),false,'ambiguous proximity never steals patient');
const db=new Map(),storage={get:async k=>db.get(k)??null,set:async(k,v)=>{db.set(k,v)},delete:async k=>db.delete(k)};
let nonce=0;
const server=createQaSocialServer(storage,{now:()=>2000000,
 uuid:()=>('f0000000-0000-4000-8000-'+String(++nonce).padStart(12,'0'))});
const call=(path,method='GET',body={},token='',query={})=>server.route({path,method,body,query,headers:{authorization:'Bearer '+token}});
const reg=async n=>(await call('register','POST',{name:n,handle:n.toLowerCase(),clientKey:'client-very-long-unique-'+n})).body;
const a=await reg('MedicoA'),b=await reg('MedicoB');assert(a.token&&b.token&&a.user.id!==b.user.id);
let previous=null;
for(const mode of ['coop','competitive'])for(let i=0;i<5;i++){
 const creator=i%2?b:a,invited=i%2?a:b;
 const result=await call('rooms','POST',{mode,invitees:[invited.user.id],peerId:creator===a?'peer-A':'peer-B'},creator.token);
 assert.equal(result.status,201);const id=result.body.room.id;
 assert.notEqual(id,previous);
 const joined=await call('rooms/join','POST',{roomId:id,peerId:invited===a?'peer-A':'peer-B'},invited.token);
 assert.equal(joined.status,200);
 assert.equal(joined.body.room.members.length,2,'two independent authenticated players');
 assert.equal(joined.body.room.role,'guest');
 assert.equal((await call('rooms/join','POST',{roomId:id,peerId:'repeat-'+i},invited.token)).body.room.members.length,2,
  'repeated join must not duplicate a player');
 assert.equal((await call('rooms/'+id+'/messages','POST',{message:{type:'cs_room_v411',kind:'team_chat',text:'hola '+mode+i}},invited.token)).status,200);
 const received=await call('rooms/'+id+'/messages','GET',{},creator.token,{after:0});
 assert(received.body.messages.some(x=>x.userId===invited.user.id&&x.data.text==='hola '+mode+i));
 const first=i%2?creator:invited,last=i%2?invited:creator;
 assert.equal((await call('rooms/'+id+'/leave','POST',{},first.token)).status,200);
 assert.equal((await call('rooms/'+id+'/leave','POST',{},last.token)).status,200);
 assert.equal((await call('rooms/join','POST',{roomId:id,peerId:'stale'},invited.token)).status,404);
 assert.equal((await call('rooms/'+id+'/messages','GET',{},creator.token,{after:0})).status,404,
  'late poll must not reopen a closed session');
 previous=id;
}
console.log('ATRIA MULTIPLAYER STABILIZATION BOT PASS',JSON.stringify({
 cycles:10,cyclesPerMode:5,hostRoleRotated:true,independentAuthenticatedClients:2,
 cooperative:['exam','speech','therapy','monitor','study'],
 competitiveNoForeignMedicationOrStudy:true,competitiveRivalSpeechAndExam:true,firstInteractionClaim:true,source:'integrated built source and live server contracts',
 browser:false,realNetwork:false}));
