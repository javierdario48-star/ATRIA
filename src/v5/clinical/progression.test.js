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
