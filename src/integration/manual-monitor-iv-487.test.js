import assert from 'node:assert/strict';
import vm from 'node:vm';
import {applyManualMonitorIV487} from './manual-monitor-iv-487.js';
const html=applyManualMonitorIV487('<body></body>');
const code=html.split('<script id="atria-manual-monitor-iv-487">')[1].split('</script>')[0];
new vm.Script(code);
const patient={venousAccessCount:0,patientInstance:{uid:'x'},events:[],gameMinute:1,administrationLog:[]};
const orders=[];
const c={window:{nsMayExamine:()=>true,csQueueIV:()=>true},sim:patient,
 findMonitorTherapy:x=>({id:x,label:x}),addMonitorTherapy:x=>{patient.administrationLog.push(x);return true},
 setMonitorFeedback:()=>{},nurseSay:()=>{}};
vm.runInNewContext(code,c);
c.addMonitorTherapy('fluid');c.addMonitorTherapy('ceftriaxone');c.addMonitorTherapy('metronidazole');
assert.equal(patient.administrationLog.length,0);
assert.equal(patient.csPhase4Pending487.length,3);
c.addMonitorTherapy('fluid');
assert.equal(patient.csPhase4Pending487.length,3);
patient.venousAccessCount=1;
for(const order of patient.csPhase4Pending487.splice(0))c.addMonitorTherapy(order.text);
assert.deepEqual(patient.administrationLog,['fluid','ceftriaxone','metronidazole']);
console.log('MANUAL MONITOR IV QA BOT PASS');
