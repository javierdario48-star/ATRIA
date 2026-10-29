import test from 'node:test';
import assert from 'node:assert/strict';
import {personalityContent,interviewFixture,runAnamnesis,anamnesisQuestions} from '../v5/personality-anamnesis-bots.mjs';
import {generatePatientVariation,DEFAULT_PATIENT_VARIATION} from '../../src/v5/content/patient-variation.js';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
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
test('case-authored clinical bot questions recognize inflected confusion, anticoagulants and regurgitation',async()=>{
 for(const id of ['ENCEF-001','LGIB-001','ACAL-001','VARIX-001','CARD-04']){
  const row=await runAnamnesis(content.cases.find(x=>x.id===id),content);
  assert.deepEqual(row.failures,[],id);
 }
});
test('an empathetic introduction cannot accidentally acquire pain-relief history',async()=>{
 const {session}=interviewFixture(c,content);
 try{
  await session.post({id:'intro',text:'Le escucho con calma; tómese su tiempo. ¿Qué le pasa?'});
  assert.equal(session.read().patient.interview.dimensions.relief,undefined);
 }finally{session.dispose();}
});
test('spontaneous case language does not produce invalid anatomical prepositions or onset verbs',async()=>{
 const r=await runAnamnesis(c,content,{profileIndex:3});
 for(const t of r.rows)assert.doesNotMatch(t.answer,/en la abajo|en el debajo|(?:comenzó|arrancó) doliendo/i);
});
test('talkative and reserved patients differ in substantive clinical disclosure through the public executor',async()=>{
 const reserved=await runAnamnesis(c,content,{index:2,profileIndex:2});
 const talkative=await runAnamnesis(c,content,{index:3,profileIndex:3});
 const facts=r=>r.rows.flatMap(t=>t.evidence?.facts??[]);
 assert(facts(talkative).some(f=>f.spontaneous),'talkative patients must volunteer case-authored information');
 assert.equal(facts(reserved).filter(f=>f.spontaneous).length,0);
 assert(talkative.rows.reduce((a,r)=>a+r.answer.length,0)>reserved.rows.reduce((a,r)=>a+r.answer.length,0)*1.15);
 for(const r of [reserved,talkative])assert.deepEqual(r.failures,[]);
});
test('empathetic explanations change a per-doctor relationship while stable personality stays identical',async()=>{
 const {options,session}=interviewFixture(c,content,{archetype:'scared',seed:'worried-patient'});
 try{
  const stable=structuredClone(session.read().patient.behavior);
  await session.post({id:'start',text:'¿Qué le pasa?'});
  const first=session.read().patient.interview.relationships?.doctor;
  assert(first,'native interview must own the relationship');
  await session.post({id:'explain',text:'Le escucho con calma. Le explico: estas preguntas ayudan a entender lo que siente. ¿Desde cuándo?'});
  const later=session.read().patient.interview.relationships.doctor;
  assert(later.trust>first.trust);assert(later.anxiety<first.anxiety);
  assert.deepEqual(session.read().patient.behavior,stable);
  const checkpoint=JSON.parse(JSON.stringify(await session.checkpoint()));
  const restored=createGuardSession({...options,checkpoint});
  try{assert.deepEqual(restored.read().patient.interview,session.read().patient.interview);}
  finally{restored.dispose();}
 }finally{session.dispose();}
});
test('old checkpoints acquire deterministic behavior without rerolling clinical identity',async()=>{
 const {options,session}=interviewFixture(c,content,{seed:'old-profile',archetype:'talkative'});
 const cp=JSON.parse(JSON.stringify(await session.checkpoint()));session.dispose();delete cp.patient.behavior;
 const a=createGuardSession({...options,checkpoint:cp}),b=createGuardSession({...options,checkpoint:cp});
 try{
  assert(a.read().patient.behavior);assert.deepEqual(a.read().patient.behavior,b.read().patient.behavior);
  for(const k of ['name','age','variation','allergies','allergyHistory','liveVitals'])assert.deepEqual(a.read().patient[k],cp.patient[k],k);
 }finally{a.dispose();b.dispose();}
});
