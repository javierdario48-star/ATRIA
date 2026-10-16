import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNasalOxygenFlow,executeOxygenSupport} from './observations.js';
test('oxygen accepts only reference flows, not arbitrary flows or devices',()=>{
 assert.equal(parseNasalOxygenFlow('oxigeno').amount,4);
 assert.equal(parseNasalOxygenFlow('oxigeno 2 L/min').amount,2);
 assert.equal(parseNasalOxygenFlow('oxigeno 4 l min').amount,4);
 for(const s of ['oxigeno 20 L/min','oxigeno 4 ml/min','oxigeno mascara 4 L/min','oxigeno 2 L/min 4 L/min'])
  assert.throws(()=>parseNasalOxygenFlow(s),undefined,s);
});
test('bedside oxygen produces native action receipts and never writes vital signs',()=>{
 const p={uid:'P',procedures:{},liveVitals:{spo2:96,rr:20},treatments:[],administrationLog:[]};
 const clock={clinicalMinute:5,nativeMinute:1};
 const cmd=(eventId,kind,clause)=>({eventId,actorId:'doc',patientUid:'P',intent:{kind,id:'oxygen',clause}});
 const baseline=structuredClone(p.liveVitals);
 const first=executeOxygenSupport(p,cmd('one','therapy.request','oxigeno 4 L/min'),clock);
 assert.equal(first.receipt.therapyId,'oxygen');assert.equal(first.receipt.patientUid,'P');
 const reused=executeOxygenSupport(p,cmd('two','therapy.request','oxigeno 4 L/min'),clock);
 assert.equal(reused.receipt.reused,true);assert.equal(p.administrationLog.length,1);
 const stop=executeOxygenSupport(p,cmd('three','therapy.stop','suspender oxigeno'),clock);
 assert.equal(stop.receipt.kind,'therapy.stop');assert.equal(stop.receipt.id,'oxygen');
 assert.equal(p.procedures.oxygen.active,false);
 assert.deepEqual(p.administrationLog.map(x=>x.action),['start','stop']);
 assert.deepEqual(p.liveVitals,baseline);
});
