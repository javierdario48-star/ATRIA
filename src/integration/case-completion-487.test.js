import assert from 'node:assert/strict';
import {CASE_CLOSURE_RULES_487,csEvaluateClosure487} from '../clinical/case-completion-487.js';
const ids=Object.keys(CASE_CLOSURE_RULES_487);assert.equal(ids.length,10);
let passed=0;
for(const id of ids){
 const c=CASE_CLOSURE_RULES_487[id],done=c.treatment[0]||[];
 const snapshot={caseId:id,diagnosis:'diagnóstico',acceptedDiagnoses:['diagnóstico'],
  historyRelevant:['motivo','antecedentes','alergias','cirugías'],historyAnswered:['motivo'],
  examDone:true,examRegionsCount:2,vitalsKnown:true,reassessments:1,
  studiesDone:[c.study[0][0]],keyStudies:c.study.flat(),extraStudies:[],
  keyInterventions:done.concat('source_control'),delivered:done,
  consultsDone:c.consult?.[c.destinations[0]]?.slice(0,1)||[],
  disposition:c.destinations[0],sys:112,initialSys:112,hr:84,spo2:98,rr:18,
  dead:false,ended:false,phys:{sourceControlled:false},clinicalFlags:{}};
 const evalCase=x=>csEvaluateClosure487(x);
 const ready=evalCase(snapshot);
 assert(ready.ready,id+' minimum safe');
 assert(!ready.procedurePerformed,id+' no surgery');
 assert(ready.quality.score>0&&ready.quality.score<100,id+' partial XP');
 const extraContext={...snapshot,historyAnswered:[...snapshot.historyAnswered,
  'anamnesis:pmh','anamnesis:allergies']};
 assert.equal(evalCase(extraContext).ready,true,id+' extra history not mandatory');
 assert(evalCase(extraContext).quality.history>ready.quality.history,
  id+' allergies and comorbidity history should improve XP');
 assert.equal(evalCase({...snapshot,historyAnswered:['anamnesis:reason']}).ready,true,
  id+' general reason for consultation meets minimum anamnesis');
 const perfect={...snapshot,historyAnswered:snapshot.historyRelevant,studiesDone:snapshot.keyStudies,
  keyInterventions:done};
 assert(evalCase(perfect).quality.score>ready.quality.score,id+' complete care more XP');
 assert(evalCase({...perfect,extraStudies:['extra','extra2']}).quality.score<
  evalCase(perfect).quality.score,id+' overtesting penalty');
 for(const change of [{examDone:false,examRegionsCount:0},{diagnosis:'wrong'},
  {studiesDone:[]},{reassessments:0},{dead:true}]){
  assert.equal(evalCase({...snapshot,...change}).ready,false,id+' safety gate');
 }
 assert.equal(evalCase({...snapshot,delivered:[]}).ready,id==='COLON-001',
  id+' essential treatment');
 if(c.consult?.[c.destinations[0]]?.length)
  assert.equal(evalCase({...snapshot,consultsDone:[]}).ready,false,id+' accepted consult');
 passed++;
}
for(const id of ['PERI-PBE-001','PERI-SEC-001','PERI-TER-001'])
 assert.equal(csEvaluateClosure487({caseId:id}),null);
const c=CASE_CLOSURE_RULES_487['MESI-001'];
const urgent={caseId:'MESI-001',diagnosis:'isquemia',acceptedDiagnoses:['isquemia'],
 historyAnswered:[],historyRelevant:['motivo'],examDone:true,vitalsKnown:true,
 initialSys:75,sys:79,spo2:98,hr:108,rr:23,reassessments:1,studiesDone:[],
 delivered:['fluid'],disposition:'quirofano',consultsDone:['cirugia'],
 clinicalFlags:{activeBleeding:true},keyInterventions:['fluid','source_control'],keyStudies:['mesi_cta']};
assert(csEvaluateClosure487(urgent).ready,'urgent surgery is not blocked by CT or risky heparin');
console.log('13 CASE MINIMUM HANDOFF & XP TEST PASS',JSON.stringify({cases:passed,peritonitisPreserved:3}));
