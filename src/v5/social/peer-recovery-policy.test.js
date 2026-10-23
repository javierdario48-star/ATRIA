import test from 'node:test';
import assert from 'node:assert/strict';
import {createPeerRecoveryPolicy} from './peer-recovery-policy.js';
test('stalled WebRTC restarts after a full state duration, never on an arbitrary age',()=>{
 const policy=createPeerRecoveryPolicy();
 assert.equal(policy.shouldRestart('b','new',0),false);
 assert.equal(policy.shouldRestart('b','connecting',14000),false);
 assert.equal(policy.shouldRestart('b','connecting',27000),false,'a transition resets the state age');
 assert.equal(policy.shouldRestart('b','connecting',29000),true);
 assert.equal(policy.shouldRestart('b','connecting',30000),false,'one restart is enough');
 assert.equal(policy.shouldRestart('b','open',30001),false);
 assert.equal(policy.snapshot('b').attempts,0);
});
test('failed channel uses bounded increasing retry delays without a second timer',()=>{
 const p=createPeerRecoveryPolicy();
 p.shouldRestart('a','failed',0);
 assert.equal(p.shouldRestart('a','failed',6000),true);
 assert.equal(p.snapshot('a').retryAt,8000);
 assert.equal(p.shouldRestart('a','failed',6100),false);
 assert.equal(p.shouldRestart('a','failed',12000),true);
 assert.equal(p.snapshot('a').retryAt,16000);
 assert.equal(p.shouldRestart('a','connected',13000),false);
 assert.equal(p.shouldRestart('a','disconnected',14000),false);
 assert.equal(p.shouldRestart('a','disconnected',21000),true);
 p.forget('a');assert.equal(p.snapshot('a'),null);
 p.shouldRestart('b','connecting',30000);p.reset();assert.equal(p.snapshot('b'),null);
});
test('unhandled states and unrelated peers cannot force a reconnection',()=>{
 const p=createPeerRecoveryPolicy();
 p.shouldRestart('a','open',0);
 assert.equal(p.shouldRestart('a','checking',100000),false);
 assert.equal(p.shouldRestart('b','new',100000),false);
 assert.equal(p.shouldRestart('a','checking',200000),false);
});
