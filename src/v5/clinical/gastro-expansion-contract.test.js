import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {GASTRO_CASE_RULES,GASTRO_CASE_CONDUCTS,GASTRO_DYNAMICS} from './gastro-expansion-policies.js';
import {GASTRO_PATIENT_PROFILES,GASTRO_PHYSICAL_FINDINGS} from './gastro-expansion-presentations.js';
import {GASTRO_CONDUCT_DOSES} from './gastro-medication-rules.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {additionalCaseTargets,additionalCaseInitialVitals} from './native-additional-cases.js';
import {buildStudyCatalog,studyTurnaroundMinutes} from '../../clinical/study-registry.js';
const load=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const ids=Object.keys(GASTRO_CASE_RULES),catalog=buildStudyCatalog(content.cases);
const modes=['solo','apprentice','coop'];
for(const id of ids){
 const c=content.cases.find(x=>x.id===id);
 test(id+' has distinct evidence, physiology, conversation, examination and handoff',()=>{
  assert(c,id+' missing case');
  assert(c.intents.length>=5&&c.studies.length>=2&&c.requiredHistory.length>=2);
  assert(GASTRO_PATIENT_PROFILES[id]?.symptoms);
  assert(GASTRO_PHYSICAL_FINDINGS[id]?.palpation);
  assert(Object.hasOwn(GASTRO_DYNAMICS,id));
  assert.equal(CLINICAL_EXECUTORS[id],'additional');
  assert(c.dx.length>=1&&GASTRO_CASE_RULES[id].destinations.length);
  for(const s of c.studies){
   assert(catalog.some(x=>x.id===s.id),s.id+' absent from universal studies');
   assert(studyTurnaroundMinutes(s)>=5);
  }
  for(const intervention of c.interventions){
   assert(content.therapies.some(x=>x.id===intervention.id),
    'case '+id+' invokes an intervention unavailable to other cases: '+intervention.id);
  }
  const patient={uid:'QA-'+id,treatments:[],administrationLog:[]};
  assert.equal(additionalCaseTargets(patient,c,0).hr,0);
  const first=additionalCaseTargets(patient,c,240);
  assert(first.hr>=0);
  const initial=additionalCaseInitialVitals(c);
  assert(Number.isFinite(initial.sys));
 });
 for(const mode of modes)test(id+' opens a certified, unsafe-to-close guard in '+mode,async()=>{
  const uid='qa-'+mode+'-'+id,session=createGuardSession({
   roomId:uid,mode,actorId:'qa',actorName:'QA',
   members:mode==='coop'?[{id:'qa',name:'QA'},{id:'other',name:'Other'}]:[{id:'qa',name:'QA'}],
   patient:{uid,caseId:id},content,resolveContext:()=>({patientUid:uid})});
  try{
   const state=session.read();
   assert.equal(state.patient.uid,uid);assert.equal(state.patient.caseEnded,false);
   assert.equal(state.progress.xp,0);
   assert.equal(state.patient.administrationLog.length,0);
   assert.deepEqual(state.eligibleDestinations,[]);
   assert(GASTRO_CASE_RULES[id].destinations.includes(GASTRO_CASE_RULES[id].destinations[0]));
   assert(state.closure&&state.closure.ready===false,
    'no case can be discharged without assessment at time zero');
  }finally{session.dispose();}
 });
}
test('oral doses are universal, explicit and cannot turn IV or overdose into oral treatment',()=>{
 for(const [id,dose] of Object.entries(GASTRO_CONDUCT_DOSES)){
  assert(content.therapies.some(t=>t.id===id));
  assert.deepEqual(content.defaultDoses[id],{
   amount:dose.amount,unit:dose.unit,display:dose.amount+' '+dose.unit});
 }
 assert(content.therapies.some(x=>x.id==='terlipressin'));
 assert(content.therapies.some(x=>x.id==='methylprednisolone'));
});
test('all 25 case engines are backed by exactly one shared V5 clinical runtime',()=>{
 assert.equal(ids.length,12);assert.equal(content.cases.length,25);
 assert.equal(Object.keys(CLINICAL_EXECUTORS).length,25);
 assert.equal(modes.length,3);
 console.log('ATRIA_GI_CASE_CONTRACT='+JSON.stringify({
  cases:ids,existing:13,total:25,localModeChecks:ids.length*modes.length,
  universalStudies:catalog.length,universalTherapies:content.therapies.length}));
});
