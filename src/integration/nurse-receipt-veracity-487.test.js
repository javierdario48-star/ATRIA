import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const a=html.indexOf('function csNurseClinicalStatus487(patient,item){');
const b=html.indexOf('window.csNurse487Status=csNurseClinicalStatus487;',a);
assert(a>0&&b>a,'actual compiled nursing receipts present');
const context={};
vm.runInNewContext(html.slice(a,b)+';this.check=csNurseClinicalStatus487;',context,{timeout:4000});
const p={monitorTherapies:new Map([['oxygen',{id:'oxygen'}]]),
 administrationLog:[],interventions:new Set(['oxygen']),csPhase4Pending487:[],
 venousAccessCount:0,monitorConnected:false,orders:new Map()};
const item={kind:'therapy',id:'oxygen',uid:'patient-a',baselineAdmin:0,initiallyActive:false};
assert.notEqual(context.check(p,item).status,'COMPLETED',
 'active therapy label without actual administered oxygen is not completed');
item.initiallyActive=true;
assert.notEqual(context.check(p,item).status,'COMPLETED',
 'pre-existing oxygen marker without an administration record is not executed');
p.administrationLog.push({id:'oxygen',m:1});
item.initiallyActive=false;
assert.equal(context.check(p,item).status,'COMPLETED','actual logged oxygen completes the receipt');
item.initiallyActive=true;item.baselineAdmin=1;
assert.equal(context.check(p,item).status,'COMPLETED','verified prior administration is idempotently complete');
p.monitorConnected=true;
assert.equal(context.check(p,{kind:'monitor'}).status,'COMPLETED');
p.venousAccessCount=2;
assert.equal(context.check(p,{kind:'iv',count:2}).status,'COMPLETED');
assert.notEqual(context.check(p,{kind:'iv',count:3}).status,'COMPLETED');
const antibiotic={kind:'therapy',id:'ceftriaxone',uid:'patient-a',baselineAdmin:0,initiallyActive:false};
p.csPhase4Pending487=[{id:'ceftriaxone',uid:'patient-a'}];
assert.equal(context.check(p,antibiotic).status,'WAITING','pending antibiotic cannot masquerade as administered');
p.csPhase4Pending487=[];
p.monitorTherapies.set('ceftriaxone',{id:'ceftriaxone'});
assert.notEqual(context.check(p,antibiotic).status,'COMPLETED','active antibiotic marker alone is insufficient');
p.administrationLog.push({id:'ceftriaxone',m:2});
assert.equal(context.check(p,antibiotic).status,'COMPLETED','native antibiotic administration log completes receipt');
console.log('NURSE RECEIPT EXECUTION AUDIT PASS',JSON.stringify({
 oxygenRequiresLog:true,antibioticsRequireLog:true,priorAdminIdempotent:true,
 monitorRequiresConnection:true,accessRequiresClinicalCount:true}));
