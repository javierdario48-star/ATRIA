import test from 'node:test';
import assert from 'node:assert/strict';
import {createClinicalConnectionNotice} from './clinical-connection-notice.js';

const busy={status:409,code:'busy'},offline={status:503,code:'unavailable'};
test('an isolated clinical CAS contention is silent, preserving genuine reconciliation',()=>{
 const p=createClinicalConnectionNotice();
 assert.equal(p.failed(busy,100),null);
 p.succeeded();
 assert.equal(p.failed(offline,1300),null);
 p.succeeded();
 assert.equal(p.state().consecutive,0);
});
test('a persistent failure warns after four unsuccessful attempts, rate-limited thereafter',()=>{
 const p=createClinicalConnectionNotice();
 for(const now of [0,900,1800])assert.equal(p.failed(busy,now),null);
 assert.match(p.failed(busy,2700),/Las órdenes pendientes se conservan/);
 for(const now of [3600,6500,9500,12500])assert.equal(p.failed(offline,now),null);
 assert.match(p.failed(offline,15300),/Esperando la conexión clínica/);
});
test('a successful server snapshot clears failure history and a new failure must repeat',()=>{
 const p=createClinicalConnectionNotice();
 for(const now of [10,920,1830,2740])p.failed(offline,now);
 p.succeeded();
 for(const now of [2900,3800,4700])assert.equal(p.failed(busy,now),null);
 assert.equal(p.state().consecutive,3);
});
test('authorization failures are shown without waiting for repeated attempts',()=>{
 const p=createClinicalConnectionNotice();
 assert.match(p.failed({status:403},1100),/verificar el acceso/);
 assert.equal(p.failed({status:403},1500),null);
});
test('failures separated by a long idle period cannot accumulate into a false warning',()=>{
 const p=createClinicalConnectionNotice();
 assert.equal(p.failed(offline,0),null);
 assert.equal(p.failed(offline,12000),null);
 assert.equal(p.state().consecutive,1);
});
