import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgressionLedger,nativeCaseXP} from './progression.js';
test('native selected-case XP and saved receipt restore preserve exactly one reward',()=>{
 assert.equal(nativeCaseXP({score:100,mode:'solo'}),133);assert.equal(nativeCaseXP({score:100,mode:'apprentice'}),111);
 const r={kind:'clinical.closure',eventId:'event1',patientUid:'p1',actorId:'a',closed:true,xp:133};
 const a=createProgressionLedger();a.award(r);a.award(r);const b=createProgressionLedger(a.read());b.award(r);
 assert.equal(b.read().xp,133);assert.equal(b.read().receipts.length,1);
 assert.throws(()=>b.award({...r,xp:999}),/conflicting/);
 assert.throws(()=>b.award({...r,patientUid:'p2',closed:false}),/invalid/);
 assert.throws(()=>createProgressionLedger({receipts:[r,r]}),/duplicate/);
});

test('death penalty is unique, capped at existing XP and persists after restore',()=>{
 const reward={kind:'clinical.closure',eventId:'win',patientUid:'prior',actorId:'a',closed:true,xp:133};
 const p=createProgressionLedger();p.award(reward);
 const first=p.penalizeDeath({patientUid:'dead',eventId:'death',actorId:'a'});
 assert.equal(first.loss,15);
 assert.equal(p.penalizeDeath({patientUid:'dead',eventId:'death',actorId:'a'}).loss,15);
 assert.equal(p.read().xp,118);
 const restored=createProgressionLedger(p.read());
 assert.equal(restored.read().xp,118);
 assert.equal(restored.read().penalties.length,1);
 const empty=createProgressionLedger();
 assert.equal(empty.penalizeDeath({patientUid:'first',eventId:'death',actorId:'a'}).loss,0);
 assert.equal(empty.read().level,1);
});
