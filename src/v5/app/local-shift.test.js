import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalShift} from './local-shift.js';
const patient=(minutes,closed=true)=>({patient:{closure:{closed}},clock:{gameMinute:minutes}});
test('one shift retains clock, schedules only certified cases and deduplicates receipts',()=>{
 const shift=createLocalShift({caseIds:['APP-001','CIRR-001'],limitMinutes:1440});
 assert(shift.begin({caseId:'APP-001'}));assert.equal(shift.nextCase('APP-001'),'CIRR-001');
 assert.equal(shift.record({closed:true,patientUid:'a',xp:71,quality:{score:45}}),true);
 assert.equal(shift.record({closed:true,patientUid:'a',xp:71,quality:{score:45}}),false);
 assert.equal(shift.canContinue({previous:patient(10),mode:'solo'}),true);
 assert(shift.begin({caseId:'CIRR-001',continuation:true,previous:patient(10),mode:'solo'}));
 assert.equal(shift.totalMinutes(20),30);
 shift.record({closed:true,patientUid:'b',xp:100,quality:{score:90}});
 assert.equal(shift.outcomes().length,2);
 assert.equal(shift.outcomes().reduce((sum,x)=>sum+x.xp,0),171);
 assert.equal(shift.snapshot().elapsedBefore,10);
 shift.reset();assert.equal(shift.active(),false);
});
test('multiplayer, unclosed patients and exhausted 24-minute shifts cannot advance locally',()=>{
 const shift=createLocalShift({caseIds:['APP-001','CIRR-001']});
 assert.equal(shift.begin({caseId:'UNKNOWN'}),false);
 assert(shift.begin({caseId:'APP-001'}));
 assert.equal(shift.canContinue({previous:patient(20),mode:'coop'}),false);
 assert.equal(shift.canContinue({previous:patient(20),mode:'competitive'}),false);
 assert.equal(shift.canContinue({previous:patient(20,false),mode:'solo'}),false);
 assert.equal(shift.begin({caseId:'CIRR-001',continuation:true,previous:patient(1440),mode:'solo'}),false);
 assert.equal(shift.totalMinutes(3000),1440);
 assert.deepEqual(shift.snapshot().seenCases,['APP-001']);
});
