import test from 'node:test';
import assert from 'node:assert/strict';
import {personalityContent,interviewFixture,runAnamnesis,anamnesisQuestions} from '../v5/personality-anamnesis-bots.mjs';
import {generatePatientVariation,DEFAULT_PATIENT_VARIATION} from '../../src/v5/content/patient-variation.js';
const content=await personalityContent(),c=content.cases.find(x=>x.id==='APP-001');

test('native guard keeps the actual multidimensional behavior on its owned patient',()=>{
 const {options,session}=interviewFixture(c,content,{seed:'stable-npc',archetype:'talkative'});
 try{assert.deepEqual(session.read().patient.behavior,options.patient.behavior);}
 finally{session.dispose();}
});
test('Spanish personality aliases seed the same traits as their canonical archetype',()=>{
 const profile={...DEFAULT_PATIENT_VARIATION,personalities:['ansiosa']};
 const actual=generatePatientVariation(profile,'same-person');
 const canonical=generatePatientVariation({...profile,personalities:['anxious']},'same-person');
 assert.deepEqual(actual.behavior,canonical.behavior);
});
test('clinical bots derive fifteen relevant turns from each of the 55 actual case banks',()=>{
 assert.equal(content.cases.length,55);
 for(const row of content.cases){
  const qs=anamnesisQuestions(row,content);assert.equal(qs.length,15,row.id);
  assert(qs.some(q=>row.intents.some(i=>i.keys.some(k=>q.toLowerCase().includes(k)))),row.id);
 }
});
test('public-session anamnesis has fifteen clinical receipts and preserves all clinical owners',async()=>{
 const row=await runAnamnesis(c,content,{recover:true});
 assert.equal(row.rows.length,15);assert.deepEqual(row.failures,[]);
});
