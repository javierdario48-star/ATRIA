import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';
const out=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const part=(from,to)=>{
 const a=out.indexOf(from),b=out.indexOf(to,a+from.length);
 assert(a>0&&b>a,from+' native clinical function is present');
 return out.slice(a,b);
};
const medical=part('function findMonitorTherapy(text){','function therapyActive(id){')+
 part('function recordAdministration(t){','function medicationSafetyOffsets(){')+
 part('function addMonitorTherapy(text){','function missingAlgorithmInterventions(){');
const changes=[];
const sim={monitorTherapies:new Map(),therapyExposure:new Map(),therapyTotals:{},
 administrationLog:[],interventions:new Set(),interventionTimes:new Map(),events:[],
 adverseEvents:[],gameMinute:1,mentor:{enabled:false},phys:null};
const C={interventions:[],physiology:{avoid:[]}};
const context={sim,C,
 norm:t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
 MONITOR_THERAPY_CATALOG:[
  {id:'oxygen',label:'Oxígeno suplementario',aliases:['oxigeno','o2'],effects:{spo2:6}},
  {id:'fluid',label:'Cristaloides',aliases:['ringer','suero'],effects:{sys:14}},
  {id:'ceftriaxone',label:'Ceftriaxona IV',aliases:['ceftriaxona'],effects:{}},
  {id:'metronidazole',label:'Metronidazol IV',aliases:['metronidazol'],effects:{}}
 ],
 findIntervention:()=>null,
 parseTherapyOrder:(str,t)=>({amount:4,unit:'L/min',display:'4 L/min',defaultApplied:false}),
 applyImmediatePhysiology:()=>{},
 activeTherapyLabel:t=>t.label,
 nurseSay:t=>changes.push(['nurse',t]),
 setMonitorFeedback:(t)=>changes.push(['feedback',t]),
 renderMonitorTherapies:()=>changes.push(['render','therapies']),
 renderAdministrationHistory:()=>changes.push(['render','history']),
 updateMonitorDOM:()=>changes.push(['render','metrics']),
 mentorReactToAdministration:()=>false,cumulativeRiskMessage:()=>null,
 complete:()=>{},performance:{now:()=>1500}
};
vm.runInNewContext(medical,context,{timeout:5000});
assert.equal(context.addMonitorTherapy('oxigeno 4 litros'),true);
assert.equal(sim.monitorTherapies.get('oxygen').id,'oxygen','clinical monitor reflects oxygen therapy');
assert.equal(sim.administrationLog.at(-1).id,'oxygen','actual med administration stored');
assert(changes.some(x=>x[0]==='render'&&x[1]==='history'));
assert(changes.some(x=>x[0]==='render'&&x[1]==='metrics'));
assert.equal(context.addMonitorTherapy('ringer'),true);
assert.equal(sim.monitorTherapies.get('fluid').id,'fluid','actual clinical fluid therapy represented');
assert.equal(sim.administrationLog.at(-1).id,'fluid');
assert.equal(sim.therapyExposure.get('oxygen').count,1);
assert.equal(sim.therapyExposure.get('fluid').count,1);
assert.equal(context.addMonitorTherapy('ceftriaxona'),true);
assert.equal(context.addMonitorTherapy('metronidazol'),true);
assert.equal(sim.monitorTherapies.has('ceftriaxone'),true);
assert.equal(sim.monitorTherapies.has('metronidazole'),true);
assert.equal(sim.administrationLog.at(-2).id,'ceftriaxone');
assert.equal(sim.administrationLog.at(-1).id,'metronidazole');
assert.match(out,/MONITOR_THERAPY_CATALOG\.some\(x=>x\.id===entry\.id\)/,
 'nursing therapies now use actual monitor therapy catalogue rather than indicated-only legacy route');
assert.equal(context.addMonitorTherapy('unrecognized fantasy medicine'),false);
console.log('NATIVE MONITOR THERAPY BOT PASS',JSON.stringify({
 actualNativeFunctions:true,oxygenActive:true,fluidActive:true,historyRecords:true,uiRefresh:true
}));
