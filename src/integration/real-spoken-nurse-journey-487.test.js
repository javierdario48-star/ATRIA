import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';
const original=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'),html=apply487(original);
const native=(a,b)=>{
 const i=original.indexOf(a),j=original.indexOf(b,i+a.length);
 assert(i>0&&j>i,a+' missing');return original.slice(i,j);
};
const injected=id=>{
 const m='<script id="'+id+'">';assert.equal(html.split(m).length,2,id+' one copy');
 return html.split(m)[1].split('</script>')[0];
};
let wall=1000;
const patient={patientInstance:{uid:'elena',bed:{approach:[24,17]}},venousAccessCount:0,
 venousAccessTypes:[],monitorConnected:false,lastVitalsKnown:false,events:[],globalChat:[],
 chats:{nurse:[]},gameMinute:2,orders:new Map(),consults:new Map(),administrationLog:[],
 monitorTherapies:new Map(),therapyExposure:new Map(),therapyTotals:{fluidMl:0},
 interventions:new Set(),interventionTimes:new Map(),adverseEvents:[],
 caseEnded:false,csNurse487History:[],mentor:{enabled:false}};
const C={id:'PERI-SEC-001',interventions:[],studies:[],
 physiology:{engine:'peritonitis',avoid:[],sourceControlRequired:true}};
const catalog=[
 {id:'oxygen',label:'Oxígeno suplementario',aliases:['oxigeno','o2']},
 {id:'fluid',label:'Ringer',aliases:['ringer']},
 {id:'ceftriaxone',label:'Ceftriaxona IV',aliases:['ceftriaxona']},
 {id:'metronidazole',label:'Metronidazol IV',aliases:['metronidazol']}];
const nurse={task:null,queue:[],path:[],state:'idle',returnTile:[8,14]};
const spoken=[],ui=[],routes=[];
const ctx={
 C,sim:patient,nurse,wardNurses:[],shiftSession:null,selectedPlayMode:'solo',
 window:{nsMayExamine:()=>true},performance:{now:()=>wall},document:{getElementById:()=>null},
 player:{bubble:'',bubbleUntil:0},chatRole:'nurse',pendingAddress:null,floatMode:'none',
 MONITOR_THERAPY_CATALOG:catalog,
 norm:x=>String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(),
 nurseSay:m=>{spoken.push(m);patient.globalChat.push(['nurse',m]);},
 nurseNatural:()=>false,sendMessage:()=>false,inferRecipient:()=>null,processCommand:()=>false,
 updateSimulation:()=>{},mayTreat:()=>true,
 findIntervention:()=>null,findStudy:()=>null,orderStudy:()=>false,
 csEnsureProcedureState:()=>{},csAccessLabel:()=>patient.venousAccessCount+' vías',
 pathTo:(a,x,y)=>{routes.push([x,y]);a.path=[[x,y]];return false},
 advanceActor:a=>!a.path?.length,
 addGlobalChat:(role,t)=>patient.globalChat.push([role,t]),
 refreshChatDock:()=>{},complete:()=>{},updateHud:()=>{},
 renderMonitorTherapies:()=>ui.push('therapies'),
 renderAdministrationHistory:()=>ui.push('history'),
 updateMonitorDOM:()=>ui.push('vitals'),
 activeTherapyLabel:x=>x.label,setMonitorFeedback:()=>{},
 parseTherapyOrder:(text,t)=>{
  const n={oxygen:[4,'L/min','4 L/min'],fluid:[500,'ml','500 ml'],
    ceftriaxone:[1000,'mg','1 g'],metronidazole:[500,'mg','500 mg']}[t.id];
  return {amount:n[0],unit:n[1],display:n[2],defaultApplied:true};
 },
 applyImmediatePhysiology:()=>{},cumulativeRiskMessage:()=>null,
 mentorReactToAdministration:()=>false,
 toast:()=>{},csPlaySound:()=>{}
};
vm.createContext(ctx);
const sources=[
 native('function findMonitorTherapy(text){','function therapyActive(id){'),
 native('function recordAdministration(t){','function medicationSafetyOffsets(){'),
 native('function addMonitorTherapy(text){','function missingAlgorithmInterventions(){'),
 native('function queueNurse(task,quiet=false){','function updateWardNurses(dt){'),
 native('function csQueueMonitor(){','// Natural language to nurse.'),
 injected('atria-phase4-composite-orders'),
 injected('atria-phase7-nursing-receipts'),
 injected('atria-nurse-voice-routing-487'),
 injected('atria-nurse-execution-487')
];
for(const s of sources)vm.runInContext(s,ctx,{timeout:5000});
ctx.sendMessage('enfermera monitor y vías oxígeno Ringer ceftriaxona metronidazol');
assert.equal(nurse.task?.kind,'monitor');
assert.equal(patient.monitorConnected,false);
assert.equal(patient.venousAccessCount,0);
assert.deepEqual(patient.administrationLog.map(x=>x.id),['oxygen'],
 'only IV-independent oxygen can be given before access');
assert.equal(patient.administrationLog[0].defaultApplied,true);
assert.deepEqual(Array.from(patient.csPhase4Pending487,x=>x.id),['fluid','ceftriaxone','metronidazole'],
 'actual spoken order keeps all three IV medications pending');
wall+=11200;ctx.updateNurse(1/60);
wall+=1800;ctx.updateNurse(1/60);
assert.equal(patient.monitorConnected,true,'nurse physically completed monitor connection');
wall+=4700;ctx.updateNurse(1/60);
assert.equal(nurse.task?.kind,'iv_access');
assert.equal(nurse.task.count,2);
wall+=11200;ctx.updateNurse(1/60);
wall+=1800;ctx.updateNurse(1/60);
assert.equal(patient.venousAccessCount,2);
assert.equal(patient.csPhase4Pending487.length,0);
assert.deepEqual(patient.administrationLog.map(x=>x.id),
 ['oxygen','fluid','ceftriaxone','metronidazole'],
 'native completion administered the complete combined order');
assert(patient.administrationLog.every(x=>x.defaultApplied),'all four medications use original default-dose semantics');
assert(patient.therapyTotals.fluidMl>=500,'fluid restores the native physiological volume ledger');
assert(patient.monitorTherapies.has('fluid'));
assert(patient.monitorTherapies.has('ceftriaxone')&&patient.monitorTherapies.has('metronidazole'));
assert(ui.includes('history')&&ui.includes('therapies'),'monitor history and active therapies updated');
console.log('FULL SPOKEN NURSE TO ACTUAL ADMINISTRATION BOT PASS',
 JSON.stringify({spokenOrders:6,realIVCount:2,nativeAdmin:4,defaults:true,monitorVisible:true,
  physicalAndroid:false}));
