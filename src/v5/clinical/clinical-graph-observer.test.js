import test from 'node:test';
import assert from 'node:assert/strict';
import {createClinicalGraphObserver,validateClinicalGraph} from './clinical-graph-observer.js';
import {resp01V2Candidate as c} from '../content/packs/respiratory-v2-candidate.js';
import {clinicalContent} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
test('declarative graph rejects unknown predicates and node references rather than executing content',()=>{
 assert.deepEqual(validateClinicalGraph(c.clinicalGraph),[]);
 const invalid=structuredClone(c.clinicalGraph);invalid.edges[0].when='execute arbitrary code';
 assert.throws(()=>createClinicalGraphObserver(invalid),/predicate/);
 invalid.edges[0].from='absent';assert(validateClinicalGraph(invalid).some(x=>x.includes('node')));
});
test('graph observes native care in any order without altering the patient, clock, authority or XP',async()=>{
 const content={...clinicalContent,cases:clinicalContent.cases.map(x=>x.id===c.id?c:x)};
 const s=createGuardSession({roomId:'graph-real',mode:'solo',actorId:'D',patient:{uid:'P',caseId:c.id},content,
  resolveContext:()=>({patientUid:'P'})}),graph=createClinicalGraphObserver(c.clinicalGraph);
 let seq=0;
 try{
  // The player orders before a diagnostic impression. The graph cannot block it.
  await s.post({id:'step-'+(++seq),text:'/estudio g_resp01_cxr'});
  const before=s.read();graph.observe(before);assert.deepEqual(s.read(),before);
  assert(graph.read().covered.includes('study-request'));
  assert(!graph.read().covered.includes('hypothesis'));
  s.advance(30);await s.flush();graph.observe(s.read());
  assert(graph.read().covered.includes('study-result'));
  assert(!graph.read().covered.includes('xp-once'));
  const snapshot=structuredClone(graph.read());graph.observe(s.read());assert.deepEqual(graph.read(),snapshot);
  assert.throws(()=>graph.observe({patient:{uid:'other'}}),/patient changed/);
 }finally{s.dispose();}
});
