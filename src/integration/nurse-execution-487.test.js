import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const marker='<script id="atria-nurse-execution-487">';
assert.equal(html.split(marker).length,2,'one nurse bedside adapter');
const source=html.split(marker)[1].split('</script>')[0];
new vm.Script(source,{filename:'nurse-bedside-runtime.js'});
let now=1000;
const sim={monitorConnected:false,venousAccessCount:0,
 patientInstance:{bed:{approach:[24,17]}}};
const nurse={task:null,queue:[],path:[],pathIndex:0,state:'idle'};
const wardPatient={monitorConnected:false,venousAccessCount:0,patientInstance:{bed:{approach:[19,27]}}};
const ward={task:null,queue:[],path:[],pathIndex:0,state:'idle'};
const routes=[],spoken=[],completed=[];
const context={
 window:{},sim,nurse,wardNurses:[ward],performance:{now:()=>now},
 nurseSay:msg=>spoken.push(msg),
 pathTo:(actor,c,r)=>{routes.push([c,r]);return false},
 startNextTask:()=>{
   if(nurse.task||!nurse.queue.length)return;
   nurse.task=nurse.queue.shift();nurse.state='to_patient';
   nurse.path=[[5,14]];nurse.pathIndex=1;
 },
 updateNurse:()=>{
   for(const actor of [nurse,ward]){
     if(actor.state==='working'&&now>=actor.taskEnds){
       const task=actor.task,target=task._targetSim;
       if(task.kind==='monitor'){target.monitorConnected=true;completed.push('monitor')}
       if(task.kind==='iv_access'){target.venousAccessCount+=task.count;completed.push('iv:'+task.count)}
       actor.task=null;actor.state='returning';actor.path=[[8,14]];actor.pathIndex=1;
     }else if(actor.state==='returning'&&actor.path.length===0){
       actor.state='idle';
       if(actor===nurse)context.startNextTask();
     }
   }
 }
};
vm.runInNewContext(source,context,{timeout:4000});
nurse.queue.push({kind:'monitor',bedside:true,_targetSim:sim});
nurse.queue.push({kind:'iv_access',count:2,bedside:true,_targetSim:sim});
context.startNextTask();
assert.deepEqual(routes,[[24,17]],'nurse targets actual patient box, not hardcoded tile 5,14');
assert.equal(sim.monitorConnected,false,'receipt does not fake monitor before task completion');
now+=11200;context.updateNurse();
assert.equal(sim.monitorConnected,false,'stuck route changes to working, does not fake completion');
now+=1700;context.updateNurse();
assert.equal(sim.monitorConnected,true,'native task completion event changes clinical monitor flag');
now+=4700;context.updateNurse();
assert.deepEqual(routes,[[24,17],[24,17]],'next pending IV task also targets patient');
now+=11200;context.updateNurse();
assert.equal(sim.venousAccessCount,0,'pending cannulation never confirmed prematurely');
now+=1700;context.updateNurse();
assert.equal(sim.venousAccessCount,2,'stuck IV task eventually completes and changes clinical access count');
assert.deepEqual(completed,['monitor','iv:2']);
assert(spoken.some(x=>x.includes('ruta al box')),'routing blockage communicated');
ward.task={kind:'iv_access',count:2,bedside:true,_targetSim:wardPatient,csTaskBegan487:now-15000};
ward.state='to_patient';ward.path=[[8,14]];ward.pathIndex=1;
context.updateNurse();
assert.equal(wardPatient.venousAccessCount,0,'ward nurse never marks access completed when still working');
assert.equal(ward.state,'working','watchdog recovers SECONDARY ward nurse, not only master');
now+=1700;context.updateNurse();
assert.equal(wardPatient.venousAccessCount,2,'native ward-nurse task actually completes after watchdog');
assert.equal(sim.venousAccessCount,2,'ward nurse cannot modify another patient');
console.log('NURSE BEDSIDE TASK BOT PASS',JSON.stringify({
 realBoxTarget:true,blockedRouteRecovery:true,monitorState:true,twoVenousLines:true,earlySuccessPrevented:true
}));
