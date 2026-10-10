import assert from 'node:assert/strict';
import vm from 'node:vm';
import {applyClinicalConfirmations487} from './clinical-confirmations-487.js';
const html=applyClinicalConfirmations487('<html><head></head><body></body></html>');
assert(html.includes('.chatRecentLine.clinical-ok'),'green clinical entries actually styled');
const tag='<script id="atria-verified-clinical-chat-487">';
assert.equal(html.split(tag).length,2);
const source=html.split(tag)[1].split('</script>')[0];
new vm.Script(source);
const log=[],screens=[],nurse=[];
let p={caseEnded:false,patientDied:false,patientInstance:{uid:'elena-1'},
 monitorConnected:false,venousAccessCount:0,administrationLog:[],monitorFeedback:'',
 csPhase4Pending487:[]};
const c={id:'PERI-SEC-001'};
const box={innerHTML:''};
const ctx={window:{},sim:p,C:c,
 document:{querySelector:()=>box,activeElement:null},
 recentChatLines:()=>log.map(x=>x[0]+': '+x[1]).join(' | '),
 addGlobalChat:(role,msg)=>log.push([role,msg]),
 updateSimulation:()=>true,addMonitorTherapy:()=>true,
 setMonitorFeedback:(msg,kind)=>{screens.push([msg,kind]);p.monitorFeedback=msg},
 refreshChatDock:()=>{throw Error('chat input must not be replaced during a clinical success')},
};
vm.runInNewContext(source,ctx);
ctx.updateSimulation(1/60);
assert.equal(log.length,0,'no false confirmations before actual nursing actions');
p.monitorConnected=true;p.venousAccessCount=2;
ctx.updateSimulation(1/60);
assert.deepEqual(log.map(x=>x[1]),['✓ Monitor puesto y conectado','✓ Dos vías periféricas colocadas']);
ctx.updateSimulation(1/60);
assert.equal(log.length,2,'idempotent: no duplicate nurse completion');
const give=(id,label,dose)=>p.administrationLog.push({id,label,doseDisplay:dose,m:2});
give('oxygen','Oxígeno','4 L/min');give('fluid','Cristaloides','500 ml');
give('ceftriaxone','Ceftriaxona','1 g');
p.monitorFeedback='Metronidazol IV: indicado, todavía no administrado.';
ctx.updateSimulation(1/60);
assert.equal(log.filter(x=>/Metronidazol/.test(x[1])).length,0,
 'no green confirmation for merely indicated, unadministered antibiotic');
assert.equal(screens.length,0,'legitimate pending message remains pending');
give('metronidazole','Metronidazol IV','500 mg');
give('vasopressor','Noradrenalina','0.05 µg/kg/min');
ctx.updateSimulation(1/60);
assert(log.some(x=>x[0]==='clinical-ok'&&x[1].includes('Cobertura antibiótica completa: ceftriaxona + metronidazol')),
 'both true administrations create a visible combined green receipt');
assert(log.some(x=>/Noradrenalina aplicado/.test(x[1])),'pressor truthfully confirmed');
assert.deepEqual(screens.at(-1),['Metronidazol: administrado y registrado en el historial.','good'],
 'stale contradictory pending feedback corrected only after confirmed dose');
assert(box.innerHTML.includes('✓')&&box.innerHTML.includes('vías'),'receipts present in live chat box');
const count=log.length;ctx.updateSimulation(1/60);
assert.equal(log.length,count,'polling never floods the transcript with duplicate green messages');
const other={caseEnded:false,patientDied:false,patientInstance:{uid:'other'},monitorConnected:false,
 venousAccessCount:0,administrationLog:[],monitorFeedback:''};
ctx.sim=other;ctx.updateSimulation(1/60);
assert.equal(log.length,count,'another patient cannot inherit treatments or their receipts');
console.log('GREEN CLINICAL EXECUTION RECEIPTS PASS',JSON.stringify({
 actualMonitor:true,twoNativeAccesses:true,drugReceipts:5,dualAntibiotics:true,
 pendingNotCompleted:true,noDuplicates:true,patientIsolation:true,greenCSS:true}));
