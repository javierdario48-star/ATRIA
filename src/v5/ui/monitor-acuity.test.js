import test from 'node:test';
import assert from 'node:assert/strict';
import {monitorAcuity} from './monitor-acuity.js';
import {monitorHTML} from './clinical-panels.js';
const p=(v,connected=true)=>({uid:'P1',caseEnded:false,patientDied:false,
 procedures:{monitor:{connected}},lastVitalsKnown:{vitals:{sys:120,dia:75,hr:82,spo2:98,rr:16,temp:37,...v}}});
test('monitor acuity uses only true vital measurement and ECG state',()=>{
 assert.equal(monitorAcuity(p({})).state,'stable');
 assert.equal(monitorAcuity(p({hr:130})).state,'warning');
 assert.equal(monitorAcuity(p({spo2:89})).state,'critical');
 assert.equal(monitorAcuity(p({sys:77})).state,'critical');
 assert.equal(monitorAcuity(p({hr:0})).state,'critical');
 assert.equal(monitorAcuity(p({}),{rhythm:'asystole'}).state,'critical');
 assert.equal(monitorAcuity(p({},false)).state,'unknown');
 assert.equal(monitorAcuity({...p({}),lastVitalsKnown:null}).state,'unknown');
 assert.equal(monitorAcuity({...p({}),caseEnded:true}).state,'unknown');
});
test('monitor display shows readable changes without pretending disconnected readings are current',()=>{
 assert.match(monitorHTML(p({})),/data-acuity="stable"/);
 assert.match(monitorHTML(p({spo2:92})),/data-acuity="warning"/);
 assert.match(monitorHTML(p({sys:78})),/data-acuity="critical"/);
 assert.match(monitorHTML(p({},false)),/SIN VIGILANCIA/);
 assert.match(monitorHTML(p({},false)),/Monitor desconectado/);
});
