import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent} from '../../server/content.js';
import {createGuardSession} from '../../clinical/guard-session.js';
import {compileClinicalCasePack} from '../compile-clinical-case-pack.js';
import {CLINICAL_POLICY_REGISTRIES} from '../../clinical/clinical-policy-registry.js';
import {validateClinicalGraph,createClinicalGraphObserver} from '../../clinical/clinical-graph-observer.js';
import {additionalCaseTargets} from '../../clinical/native-additional-cases.js';
import {varixV2Candidate as candidate,varixV2ExperimentalPack as pack} from './varix-v2-candidate.js';

const legacy=clinicalContent.cases.find(c=>c.id===candidate.id);
const content={...clinicalContent,cases:clinicalContent.cases.map(c=>c.id===candidate.id?candidate:c)};
function fixture(name,mode='solo',caseContent=content){
 const roomId='varix-v2-'+name,uid=roomId+':patient';
 const s=createGuardSession({roomId,mode,actorId:'doctor',actorName:'Clinical QA',
  members:mode==='coop'?[{id:'doctor',name:'Clinical QA'},{id:'peer',name:'Second doctor'}]:
   [{id:'doctor',name:'Clinical QA'}],
  patient:{uid,caseId:candidate.id},content:caseContent,resolveContext:()=>({patientUid:uid})});
 let n=0;
 return {s,uid,send:text=>s.post({id:'qa-'+(++n),text})};
}
test('VARIX-001 V2 is isolated from its existing 55-case V1 and compiles with the actual native registry',()=>{
 assert(legacy,'original VARIX-001 case missing');
 assert.equal(legacy.clinicalPolicy,undefined,'legacy case must not be overwritten');
 assert.equal(candidate.id,legacy.id);
 assert.notDeepEqual(candidate.clinicalPolicy,legacy.clinicalPolicy);
 assert.deepEqual(candidate.vitals,legacy.vitals);
 assert.equal(content.cases.length,clinicalContent.cases.length);
 assert.equal(new Set(content.cases.map(c=>c.id)).size,55);
 assert.deepEqual(validateClinicalGraph(candidate.clinicalGraph),[]);
 const refs={...CLINICAL_POLICY_REGISTRIES,
  existingCaseIds:clinicalContent.cases.filter(c=>c.id!==candidate.id).map(c=>c.id)};
 const compiled=compileClinicalCasePack(pack,refs);
 assert.equal(compiled.ok,true,JSON.stringify(compiled.errors));
 assert.equal(compiled.cases[0].clinicalRevision,'v2-candidate');
 assert.equal(compiled.cases[0].clinicalGraph.id,'VARIX-001@v2:clinical-graph:1');
 assert.deepEqual(legacy,clinicalContent.cases.find(c=>c.id==='VARIX-001'));
});
test('shared native graph observes public vitals, typed history and studies; it cannot run care itself',async()=>{
 const {s,send}=fixture('graph-basic');
 try{
  const observer=createClinicalGraphObserver(candidate.clinicalGraph);
  assert.deepEqual(observer.observe(s.read()),[]);
  const initial=s.read().patient.liveVitals;
  const v=await send('/signos');
  assert.equal(v.clinical[0].status,'executed');
  await send('¿Tiene cirrosis?');
  const result=await send('/estudio g_varix_cbc');
  assert.equal(result.clinical[0].status,'pending');
  const hits=observer.observe(s.read()).map(x=>x.edgeId);
  assert(hits.includes('triage'),'native vital recording should appear in graph');
  assert(hits.includes('history'),'native interview should appear in graph');
  assert(hits.includes('study-request'),'actual pending study should appear in graph');
  assert.deepEqual(s.read().patient.administrationLog,[]);
  assert.deepEqual(s.read().patient.liveVitals,initial,'graph and orders cannot administer a drug');
 }finally{s.dispose();}
});
test('bad premature discharge is attempted, debited exactly once, and patient stays available',async()=>{
 const {s,send}=fixture('unsafe-alta');
 try{
  const first=await send('/disposicion alta');
  assert.equal(first.clinical[0].status,'executed');
  const state=s.read();
  assert.equal(state.patient.caseEnded,false);
  assert.equal(state.progress.penalties.length,1);
  assert.equal(state.progress.penalties[0].loss,15);
  assert.equal(state.progress.xp,0);
  assert.equal(state.progress.xpDebt,15);
  assert.equal(state.patient.closure?.closed,true?false:false);
  const replay=await s.post({id:'qa-1',text:'/disposicion alta'});
  assert.deepEqual(replay,first);
  assert.equal(s.read().progress.penalties.length,1);
  assert.equal(s.read().patient.administrationLog.length,0);
 }finally{s.dispose();}
});
test('the vasoactive drug is not a magic procedure: only actual native receipts may affect delayed targets',async()=>{
 const {s,send}=fixture('vasoactive');
 try{
  const at0=s.read().patient.liveVitals;
  await send('Enfermera una vía');
  const order=await send('Enfermera terlipresina 2 mg IV');
  assert(['pending','executed'].includes(order.clinical[0].status));
  assert.deepEqual(s.read().patient.liveVitals,at0);
  const before=s.read().patient;
  assert.equal(before.administrationLog.filter(x=>x.id==='terlipressin').length,0);
  s.advance(6);await s.flush();
  const after=s.read().patient,rows=after.administrationLog.filter(x=>x.id==='terlipressin');
  assert(rows.length<=1,'a request must never create multiple doses');
  if(rows.length){
   const minute=rows[0].administeredAtNativeMinute;
   const untreated={...after,treatments:[],administrationLog:[]};
   assert(additionalCaseTargets(after,candidate,minute+100).hr <
    additionalCaseTargets(untreated,candidate,minute+100).hr);
  }
  assert.equal(after.procedures?.endoscopy?.performed,true?false:false,
   'vasoactive medication never performs an endoscopic ligation');
 }finally{s.dispose();}
});
test('the three original game modes share a verified authority, without declaring endoscopic hemostasis',async()=>{
 for(const mode of ['solo','apprentice','coop']){
  const {s,send}=fixture('modes-'+mode,mode);
  try{
   assert.equal(s.read().patient.caseId,'VARIX-001');
   const q=await send('¿Desde cuándo empezó a vomitar sangre?');
   assert.equal(q.clinical[0].status,'executed');
   assert(s.read().patient.intentHistory.length);
   assert.equal(s.read().progress.receipts.length,0);
  }finally{s.dispose();}
 }
});
