import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
test('guard preserves both native typing rates and study time beyond 128 focus changes',async()=>{
 const s=createGuardSession({roomId:'clock',mode:'solo',actorId:'a',actorName:'a',patient:{uid:'p',caseId:'CIRR-001'},
  content:{cases:read('cases'),therapies:read('therapies')},resolveContext:()=>({patientUid:'p'})});
 await s.post({id:'cbc',text:'Enfermera hemograma'});
 for(let i=0;i<1000;i++)s.advance(.1,{typing:i%2===0});await s.flush();
 const state=s.read();assert(Math.abs(state.clock.clinicalMinute-100)<1e-8);assert(Math.abs(state.clock.nativeMinute-7.5)<1e-8);
 assert.equal(state.patient.orders[0].status,'done');assert.equal(state.clock.segmentCount<=128,true);s.dispose();
});
