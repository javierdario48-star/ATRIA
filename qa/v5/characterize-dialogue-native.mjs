// QA-only effective native observation; never imported by the executable.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {apply487} from '../../src/integration/apply-487.js';
import {csAnamnesisFact} from '../../src/clinical/anamnesis-intents.js';
import {PATIENT_PROFILES} from '../../src/v5/clinical/patient-profiles.js';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
const source=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8')),
 script=source.match(/<script id="ns421-patient-dialogue">([\s\S]*?)<\/script>/)?.[1];
assert(script,'effective patient dialogue missing');
const excerpt=(a,b)=>{const start=script.indexOf(a),end=script.indexOf(b,start);assert(start>=0&&end>start);return script.slice(start,end);};
const read=n=>JSON.parse(fs.readFileSync('src/v5/content/'+n+'.json','utf8')),
 content={cases:read('cases'),defaultDoses:read('default-doses'),therapies:read('therapies')};
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let comparisons=0;
for(const caseId of ['CIRR-001','APP-001','PERI-SEC-001','PERI-PBE-001']){
 const c=content.cases.find(c=>c.id===caseId),sim={gameMinute:0,patientInstance:{uid:'reference-context'},monitorTherapies:new Map(),interventions:new Set(),administrationLog:[]};
 const ctx=vm.createContext({C:c,sim,norm,complete:()=>{},oldReply:q=>{
  const fact=csAnamnesisFact(c,q);return fact?.text||c.intents.find(i=>i.keys.some(k=>norm(q)===norm(k)))?.answers[0]||null;
 },window:{nsGlasgowState:()=>({eye:4,verbal:5,motor:6}),nsPatientState:()=>({trend:'unchanged',vitals:c.vitals,treatment:{started:false}})}});
 vm.runInContext(excerpt(' const profiles=',' window.nsPatientProfiles=')+
  excerpt(' const normalized=',' function symptoms(')+
  excerpt(' function symptoms(',' window.nsSymptoms=')+
  excerpt(' const dimensions=',' window.nsPainInterview=')+
  '\nglobalThis.nativeProfiles=profiles;globalThis.interview=painInterview;',ctx,{timeout:1000});
 assert.deepEqual(PATIENT_PROFILES[caseId],JSON.parse(JSON.stringify(ctx.nativeProfiles[caseId])));
 const session=createGuardSession({roomId:'reference-'+caseId,mode:'solo',actorId:'doctor',actorName:'QA',patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'})});
 let id=0;
 for(const text of ['¿Dónde te duele y desde cuándo empezó?','¿Y cómo es?','¿Y qué tan fuerte?',
  '¿Dónde le duele al comer?','¿Cuánto le duele al comer?','¿Comer le empeora el dolor?',
  '¿Se te corre a otro lado?','¿Qué lo alivia?','¿Tuvo fiebre?','¿Y desde cuándo?']){
  const expected=ctx.interview(text),ack=await session.post({id:'q'+(++id),text});
  assert(expected,caseId+' native question was not recognized: '+text);
  assert.equal(ack.clinical[0].receipt.answer,expected,caseId+' '+text);comparisons++;
 }
 session.dispose();
}
console.log(JSON.stringify({test:'effective-original-dialogue',comparisons,profiles:4,passed:true,
 scope:'native pain dimensions, short follow-ups and fever duration; corrections to falsely credited history covered separately'}));
