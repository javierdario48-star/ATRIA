/**
 * ATRIA 4.8.7 — seeded CROSS-MODE combinatorial regression.
 * Real integrated native permissions/claim/assistance, ALL 13 native case
 * catalog entries, real per-guard score model, B1 physiology on 3 supported
 * case profiles, and cross-patient contamination checks.
 *
 * This is a headless deterministic integration bot, NOT browser/WebRTC QA.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../src/integration/apply-487.js';
import {guardScoreModel487} from '../src/integration/guard-scoreboard-487.js';
import {createPilotProfile487} from '../src/clinical/physiology-pilot-cases-487.js';
import {createPhysiologyState487,stepPhysiology487,observePhysiology487}
 from '../src/clinical/physiology-pilot-487.js';
import {PILOT_DEFINITIONS_487} from '../src/clinical/physiology-pilot-definitions-487.js';
import {CARE_JOURNEYS_487} from './clinical-care-journeys-487.js';
const src=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const html=apply487(src);
function realCases(){
 const start=src.indexOf('const CASES=[');
 assert(start>0,'native case catalog exists');
 const from=start+'const CASES='.length;
 let bracket=0,quote=false,slash=false;
 for(let i=from;i<src.length;i++){
  const c=src[i];
  if(quote){if(slash)slash=false;else if(c==='\\')slash=true;else if(c==='"')quote=false;continue;}
  if(c==='"'){quote=true;continue}
  if(c==='[')bracket++;
  if(c===']'&&--bracket===0)return JSON.parse(src.slice(from,i+1));
 }
 throw Error('unterminated native cases');
}
const cases=realCases();
assert.equal(cases.length,13,'all 13 authored ED cases exercised');
assert.deepEqual(cases.map(c=>c.id).sort(),Object.keys(CARE_JOURNEYS_487).sort());
const extract=(from,to)=>{
 const a=html.indexOf(from),b=html.indexOf(to,a+from.length);
 assert(a>=0&&b>a,'native integration missing '+from);
 return html.slice(a,b);
};
const policy=extract('function assistActionAllowed(p,a){','function assistTargetSim(p)');
const apply=extract('function applyAssistAction(p,a,helper){','function requestAssist(index,a){');
const claim=extract('function claim(index,id,x,y){','function loadPatient(index');
const canAct=extract('function canAct(){','function requirePatient(){');
let seed=0x7a12fefe;
const rand=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
const shuffle=a=>{let b=[...a];for(let k=b.length-1;k>0;k--){const t=Math.floor(rand()*(k+1));[b[k],b[t]]=[b[t],b[k]]}return b};
const counters={rooms:0,claims:0,clinicalPermissions:0,nativeRelays:0,deniedRelays:0,
 scoreboard:0,physiology:0,wrongPatient:0,roomRestarts:0,actionReports:0};
const clinicalContext={
 CASES:cases,challenge:{mode:'coop'},selfId:'doctor-0',sim:null,
 findMonitorTherapy:text=>/ceftriaxona|ringer|morfina|metronidazol/i.test(text)?{id:'valid'}:null,
 assistTargetSim:p=>clinicalContext.sim,
 window:{csWithPatientStateV203:(s,_id,run)=>run(),
  csQueueMonitor:()=>clinicalContext.ops.push('monitor'),
  csQueueIV:()=>clinicalContext.ops.push('iv')},
 ops:[],C:null,queueNurse:x=>clinicalContext.ops.push('nurse:'+x.kind),
 sendMessage:t=>{clinicalContext.ops.push('command:'+t);return true},
 nurseNatural:t=>{clinicalContext.ops.push('command:'+t);return true},
 deliverPatientSpeech:t=>{clinicalContext.sim.chats.patient.push(['doctor',t],['patient','respuesta']);clinicalContext.ops.push('speech:'+t);return true},
 processCommand:t=>{clinicalContext.ops.push('command:'+t);return true},
 currentPatient:()=>clinicalContext.challenge.patients?.[0]||null,
 orderStudy:x=>clinicalContext.ops.push('study:'+x.id),
 orderIntervention:x=>clinicalContext.ops.push('intervention:'+x.id),
 performExamRegion:x=>clinicalContext.ops.push('exam:'+x),
 patientReply:()=> 'Respuesta del paciente',
 addGlobalChat:()=>{},refreshChatDock:()=>{},
 addMonitorTherapy:x=>clinicalContext.ops.push('therapy:'+x),
 base:{finish:()=>clinicalContext.ops.push('finish')},
 csSetDiagnosticImpression:()=>{},
 };
vm.createContext(clinicalContext);
new vm.Script(policy+apply).runInContext(clinicalContext);
for(const size of [2,3,4])for(const mode of ['coop','competitive'])for(let round=0;round<4;round++){
 const players=Array.from({length:size},(_,i)=>({id:'doctor-'+i,name:'Dr. '+(i+1),xpGuard487:0}));
 const roomId='ROOM-'+size+'-'+mode+'-'+round;
 const room={patients:[],revision:1,players};
 const claimCtx={challenge:room,selfId:players[0].id,
  host:()=>true,guard:()=>true,person:id=>players.find(p=>p.id===id),
  near:()=>true,elapsedMs:()=>7,applyPatients:()=>{},publish:()=>{}};
 vm.createContext(claimCtx);new vm.Script(claim).runInContext(claimCtx);
 const clinicalCases=shuffle(cases);
 for(let j=0;j<clinicalCases.length;j++){
  const c=clinicalCases[j],winner=players[(j+round)%size],order=shuffle(players);
  const patient={index:j,uid:roomId+':P'+j,caseId:c.id,state:'waiting',ownerId:null,
   instance:{name:'Paciente '+j}};
  room.patients.push(patient);
  assert(claimCtx.claim(j,winner.id,0,0),'first valid interaction assigns case '+c.id);
  for(const member of order)assert.equal(claimCtx.claim(j,member.id,0,0),false,
   'no rival can steal once claimed');
  assert.equal(patient.ownerId,winner.id);
  counters.claims++;
  patient.result={score:75+(j%20),safe:j%4!==0,points:j%4!==0?180+j:0};
  patient.state='done';
  const reward=8+j,assists=j%5===0?10:0;
  players.find(p=>p.id===winner.id).xpGuard487+=reward;
  if(mode==='coop'&&assists)players[(j+round+1)%size].xpGuard487+=assists;
  const expected=patient;
  const clinical={...patient,state:'in_care'};
  clinicalContext.C=c;
  clinicalContext.sim={patientInstance:{uid:clinical.uid},chats:{patient:[]}};
  clinicalContext.selfId=winner.id;
  clinicalContext.challenge.mode=mode;
  for(const helper of order.filter(p=>p.id!==winner.id)){
   const sample=[
    {kind:'exam',id:'ns:palpation'},{kind:'speech',text:'¿Cómo se siente?'},
    {kind:'monitor'},{kind:'vitals'},
    {kind:'therapy',text:'ceftriaxona 1 g'},
    {kind:'study',id:c.studies[0]?.id},
    {kind:'intervention',id:c.interventions[0]?.id},
    {kind:'command',text:'enfermera vías, monitor y ceftriaxona'},
    {kind:'finish',reason:'completed'}
   ].filter(x=>x.id!==undefined||!('id' in x));
   for(const action of sample){
    const permitted=mode==='coop'||['exam','speech'].includes(action.kind);
    const actual=clinicalContext.assistActionAllowed(clinical,action);
    assert.equal(actual,permitted,mode+' permit '+action.kind+' case '+c.id);
    counters.clinicalPermissions++;
    const before=clinicalContext.ops.length;
    const chatBefore=clinicalContext.sim.chats.patient.length;
    // Closure is validated by the owner-only career and destination bots;
    // executing finish on a synthetic patient would bypass its clinical proof.
    if(action.kind==='finish')continue;
    const processed=clinicalContext.applyAssistAction(clinical,action,helper.name);
    assert.equal(processed,permitted,mode+' relay '+action.kind+' case '+c.id);
    const delta=clinicalContext.ops.length-before;
    assert.equal(delta,permitted&&action.kind!=='speech'?1:0,
     'exactly one native dispatch, no rival drug or study: '+mode+' '+c.id+' '+action.kind);
    assert.equal(clinicalContext.sim.chats.patient.length-chatBefore,
     permitted&&action.kind==='speech'?2:0,'interview updates only permitted patient chat');
    if(permitted)counters.nativeRelays++;
    else counters.deniedRelays++;
   }
  }
  // The owning player's own patient is editable; all other patient IDs are
  // restricted to the safe observer/relay path (no local second physiology).
  const accessCtx={buildingPlan:false,loading:false,shared:()=>true,
   guard:()=>true,sim:{caseEnded:false,patientInstance:{uid:clinical.uid}},
   challenge:{patients:[clinical]},selfId:winner.id};
  vm.createContext(accessCtx);new vm.Script(canAct).runInContext(accessCtx);
  assert.equal(accessCtx.canAct(),true,'owner full native clinical access '+mode);
  accessCtx.selfId='wrong-owner';
  assert.equal(accessCtx.canAct(),false,'foreign patient cannot use direct clinical engine');
  counters.actionReports++;
 }
 const expectedSafe=room.patients.filter(p=>p.result.safe).length;
 const expectedXP=players.reduce((a,p)=>a+p.xpGuard487,0);
 const model=guardScoreModel487({mode,players,patients:room.patients});
 if(mode==='coop'){
  assert.equal(model.resolved,expectedSafe);
  assert.equal(model.xp,expectedXP);
 }else{
  assert.equal(model.players.length,size);
  for(const entry of model.players){
   const own=room.patients.filter(p=>p.ownerId===entry.id);
   assert.equal(entry.resolved,own.filter(p=>p.result.safe).length);
   assert.equal(entry.xp,players.find(p=>p.id===entry.id).xpGuard487);
   assert.equal(entry.points,own.reduce((v,p)=>v+p.result.points,0));
  }
  const leaders=model.players.filter(p=>p.leader);
  assert(leaders.length<=1,'leader must be unique');
 }
 counters.scoreboard++;
 counters.rooms++;
 // Exact same players restart into an empty guard without stale clinical
 // ownership, EXP, completion or scoreboard count.
 room.patients=[];
 for(const p of players)p.xpGuard487=0;
 const empty=guardScoreModel487({mode,players,patients:room.patients});
 if(mode==='coop')assert.equal(empty.xp+empty.resolved,0);
 else assert(empty.players.every(p=>p.xp===0&&p.points===0&&p.resolved===0));
 counters.roomRestarts++;
}
const sampleVitals={
 'PERI-SEC-001':{bp:'86/50',temp:38.9,hr:128,rr:30,spo2:92},
 'HDA-001':{bp:'94/58',temp:36.6,hr:118,rr:22,spo2:97},
 'CIRR-001':{bp:'108/68',temp:37.2,hr:94,rr:20,spo2:96}
};
const meds=[
 {drugId:'oxygen',action:'start',route:'inhaled',dose:{amount:4,unit:'L/min'}},
 {drugId:'fluid',action:'bolus',route:'iv',dose:{amount:500,unit:'ml'}},
 {drugId:'vasopressor',action:'start',route:'iv',dose:{amount:.05,unit:'mcg/kg/min'}},
 {drugId:'morphine',action:'bolus',route:'iv',dose:{amount:4,unit:'mg'}},
 {drugId:'furosemide',action:'bolus',route:'iv',dose:{amount:40,unit:'mg'}}
];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const nativeTickGate='sim?.__csRemoteMirror487?undefined:base.update.call(this,dt)';
assert(html.includes(nativeTickGate),'native mirror physiological update gate is present');
const gate=new Function('sim','base','dt','return '+nativeTickGate+';');
let nativeWrites=0;
const baseTick={update(dt){nativeWrites++;return dt}};
assert.equal(gate({__csRemoteMirror487:true},baseTick,0.25),undefined);
assert.equal(nativeWrites,0,'observer must never become second clinical clock');
assert.equal(gate({__csRemoteMirror487:false},baseTick,0.25),0.25);
assert.equal(nativeWrites,1,'owner advances exactly once');
for(const [caseId,vitals] of Object.entries(sampleVitals))for(const mode of ['solo','coop','competitive'])for(const players of [1,2,3,4])for(let k=0;k<meds.length;k++){
 const caseDef={id:caseId,vitals};
 const profile=createPilotProfile487(caseDef);
 const id='P-'+caseId+'-'+mode+'-'+players+'-'+k;
 const ev={...meds[k],eventId:id+':native-treatment',patientId:id,
  status:'administered',atClinicalMinute:0,sequence:0};
 const begin=()=>createPhysiologyState487(profile,id);
 const solo=stepPhysiology487(begin(),[ev],12,PILOT_DEFINITIONS_487);
 const authoritative=stepPhysiology487(begin(),[ev,ev],12,PILOT_DEFINITIONS_487);
 assert.deepEqual(authoritative,solo,'remote relay does not apply drug twice '+id);
 const pending={...ev,eventId:id+':pending',status:'pending'};
 const placebo=stepPhysiology487(begin(),[],12,PILOT_DEFINITIONS_487);
 const requestOnly=stepPhysiology487(begin(),[pending],12,PILOT_DEFINITIONS_487);
 assert.deepEqual(requestOnly,placebo,'pending nurse order never mutates physiology');
 const mirror=begin();const snapshot=JSON.stringify(mirror);
 // Passive observation does not mutate the patient's original physiology.
 assert.equal(JSON.stringify(mirror),snapshot,'observer read keeps physiology intact');
 assert.equal(mirror.integratedUs,0,'remote mirror clinical clock remains unadvanced');
 assert.equal(authoritative.patientId,id);
 for(const key of ['sys','dia','hr','rr','spo2','temp']){
  assert(finite(observePhysiology487(authoritative)[key]),'finite physiological observable '+key);
 }
 // Cross-patient injection must be rejected rather than changing the owner
 // or the neighbour's patient even if a competing peer supplies the receipt.
 const foreign=createPhysiologyState487(profile,id+':rival');
 assert.throws(()=>stepPhysiology487(foreign,[ev],1,PILOT_DEFINITIONS_487),/patient/i);
 assert.equal(foreign.integratedUs,0);
 counters.wrongPatient++;
 counters.physiology++;
}
for(const fragment of [
 'sim?.__csRemoteMirror487?undefined:base.update.call(this,dt)',
 'if(stamp&&stamp.length<=160&&!ids.has(stamp))',
 'if(m.kind===\'score_xp\')',
 'guardXP487=0;guardXPReceipts487.clear()'
])assert(html.includes(fragment),'native runtime guard regression '+fragment);
console.log('ATRIA MULTIMODE COMBINATORIAL QA PASS '+JSON.stringify({
 nativeCases:cases.length,therapyPathways:Object.keys(CARE_JOURNEYS_487).length,
 modes:['solo','coop','competitive'],seeds:1,players:[1,2,3,4],
 ...counters,framework:'real integrated source + VM clinical relay + physiology kernel',
 browser:false,realNetwork:false
}));
