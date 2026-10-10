import assert from 'node:assert/strict';
import './real-spoken-nurse-journey-487.test.js';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';

const source=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const integrated=apply487(source);
function sliceBetween(src,from,to){
 const a=src.indexOf(from),b=src.indexOf(to,a+from.length);
 assert(a>0&&b>a,from+' native function missing');
 return src.slice(a,b);
}
function script(id){
 const marker='<script id="'+id+'">';
 assert.equal(integrated.split(marker).length,2,id+' exactly once');
 return integrated.split(marker)[1].split('</script>')[0];
}
const nurseNative=sliceBetween(source,'function queueNurse(task,quiet=false){','function updateWardNurses(dt){');
const procedureNative=sliceBetween(source,'function csQueueMonitor(){','// Natural language to nurse.');
const drugNative=sliceBetween(source,'function findMonitorTherapy(text){','function therapyActive(id){')+
 sliceBetween(source,'function recordAdministration(t){','function medicationSafetyOffsets(){')+
 sliceBetween(source,'function addMonitorTherapy(text){','function missingAlgorithmInterventions(){');
let now=1000;
function fresh(uid){
 return {patientInstance:{uid,bed:{approach:[24,17]}},gameMinute:0,events:[],globalChat:[],
  chats:{nurse:[]},venousAccessCount:0,venousAccessTypes:[],monitorConnected:false,
  monitorTherapies:new Map(),administrationLog:[],therapyExposure:new Map(),therapyTotals:{},
  interventions:new Set(),interventionTimes:new Map(),adverseEvents:[],caseEnded:false,mentor:{enabled:false}};
}
const C={id:'PERI-SEC-001',interventions:[],studies:[],physiology:{avoid:[]}};
const patientA=fresh('patient-a'),patientB=fresh('patient-b');
const nurse={task:null,queue:[],path:[],pathIndex:0,state:'idle',returnTile:[8,14]};
const spoken=[],renders=[],routes=[],requests=[];
const ctx={
 window:{nsMayExamine:()=>true},sim:patientA,C,nurse,
 MONITOR_THERAPY_CATALOG:[{id:'oxygen',label:'Oxígeno suplementario',aliases:['oxigeno','oxígeno','o2']},
 {id:'fluid',label:'Ringer',aliases:['ringer','suero']},
 {id:'ceftriaxone',label:'Ceftriaxona',aliases:['ceftriaxona']},
 {id:'metronidazole',label:'Metronidazol',aliases:['metronidazol']}],
 norm:t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(),
 nurseNatural:t=>requests.push(t),
 sendMessage:t=>requests.push('legacy '+t),
 performance:{now:()=>now},document:{getElementById:()=>null},
 player:{bubble:'',bubbleUntil:0},pendingAddress:null,chatRole:'nurse',floatMode:'none',
 refreshChatDock:()=>{},complete:()=>{},updateHud:()=>{},
 csEnsureProcedureState:()=>{ctx.sim.venousAccessCount??=0;ctx.sim.venousAccessTypes??=[];},
 csAccessLabel:()=>ctx.sim.venousAccessCount+' vías periféricas',
 nurseSay:t=>{spoken.push(t);ctx.sim.globalChat.push(['nurse',t]);},
 addGlobalChat:(role,t)=>ctx.sim.globalChat.push([role,t]),
 pathTo:(actor,x,y)=>{routes.push([x,y]);return false},
 advanceActor:actor=>actor.path.length===0,
 findIntervention:()=>null,
 parseTherapyOrder:()=>({amount:4,unit:'L/min',display:'4 L/min'}),
 applyImmediatePhysiology:()=>{},
 activeTherapyLabel:t=>t.label,
 setMonitorFeedback:()=>{},
 renderMonitorTherapies:()=>renders.push('therapy'),
 renderAdministrationHistory:()=>renders.push('history'),
 updateMonitorDOM:()=>renders.push('monitor'),
 mentorReactToAdministration:()=>false,
 cumulativeRiskMessage:()=>null
};
vm.createContext(ctx);
for(const sourceCode of [drugNative,nurseNative,procedureNative,
 script('atria-nurse-voice-routing-487'),script('atria-nurse-execution-487')])
 vm.runInContext(sourceCode,ctx,{timeout:5000});
patientA.csPhase4Pending487=[{uid:'patient-a',id:'fluid',text:'ringer'},
 {uid:'patient-a',id:'ceftriaxone',text:'ceftriaxona'},
 {uid:'patient-a',id:'metronidazole',text:'metronidazol'}];
ctx.sendMessage('Enfermera monitor dos vías oxígeno');
assert.equal(patientA.monitorConnected,false,'monitor cannot be connected by merely interpreting a phrase');
assert.equal(patientA.venousAccessCount,0,'two lines cannot exist before actual nurse finish task');
assert.equal(patientA.administrationLog.at(-1)?.id,'oxygen','actual native oxygen administration');
assert(patientA.monitorTherapies.has('oxygen'),'oxygen active in native monitor model');
assert(renders.includes('therapy')&&renders.includes('history')&&renders.includes('monitor'),
 'native monitor display, history and vitals update');
assert.equal(nurse.task?.kind,'monitor','monitor queued as bedside nursing task');
assert.deepEqual(routes.at(-1),[24,17],'task routes to actual patient box');
now+=11200;ctx.updateNurse(1/60);
assert.equal(patientA.monitorConnected,false,'watchdog does not complete task prematurely');
now+=1800;ctx.updateNurse(1/60);
assert.equal(patientA.monitorConnected,true,'native finishNurseTask connects monitor');
now+=4700;ctx.updateNurse(1/60);
assert.equal(nurse.task?.kind,'iv_access','next native nursing task starts');
assert.equal(nurse.task.count,2,'two requested accesses preserved');
now+=11200;ctx.updateNurse(1/60);
assert.equal(patientA.venousAccessCount,0,'IV still absent during work');
now+=1800;ctx.updateNurse(1/60);
assert.equal(patientA.venousAccessCount,2,'native finishNurseTask places both lines');
assert.equal(patientA.venousAccessTypes.length,2,'venous access history stores both peripheral lines');
assert.deepEqual(patientA.administrationLog.filter(x=>['fluid','ceftriaxone','metronidazole'].includes(x.id)).map(x=>x.id),
 ['fluid','ceftriaxone','metronidazole'],'pending IV therapeutics run via native administration after cannulation');
assert.equal(patientA.csPhase4Pending487.length,0,'all dependent orders consumed once');
assert(patientA.globalChat.some(row=>/monitor conectado/i.test(row[1])),'nurse posts true monitor completion');
assert(patientA.globalChat.some(row=>/2 vías periféricas/i.test(row[1])),'nurse posts actual IV completion');
const beforeNurseTask=nurse.queue.length;
ctx.sendMessage('enfermera monitor dos vías');
assert.equal(nurse.queue.length,beforeNurseTask,'repeat completed procedures cannot queue duplicates');
ctx.sim=patientB;
nurse.task=null;nurse.queue=[];nurse.state='idle';
ctx.sendMessage('enfermera dos vías');
assert.equal(patientB.venousAccessCount,0,'patient B cannot inherit patient A access');
assert.equal(patientA.venousAccessCount,2,'patient A keeps original access');
assert.equal(nurse.task?.kind,'iv_access','patient B separately queues IV');
assert.equal(nurse.task.count,2);
console.log('NATIVE NURSE JOURNEY BOT PASS',JSON.stringify({
 actualNativeProcedures:true,actualNativeOxygenAdministration:true,
 clinicalMonitor:true,clinicalIVCount:2,monitorHistory:true,blockedPathRecovery:true,
 repeatIdempotent:true,twoPatientIsolation:true,syntheticVoiceText:true,physicalAndroid:false}));
