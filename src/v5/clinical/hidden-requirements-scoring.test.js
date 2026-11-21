import test from 'node:test';
import assert from 'node:assert/strict';
import {csClosureQuality487} from '../../clinical/case-completion-487.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
import {resp01V2Candidate} from '../content/packs/respiratory-v2-candidate.js';

// Independent score authority: the case specifies hidden requirements; a
// player's action volume is not the reward. These tests do not change rules
// or invent clinical receipts.
const cases=[resp01V2Candidate,...respiratoryPack.cases.slice(1),
 ...cardiologyPack.cases,...neurologyPack.cases];
function fixture(c){
 const rule=c.clinicalPolicy.closure;
 const a={caseId:c.id,acceptedDiagnoses:c.dx,diagnosis:c.dx[0],historyAnswered:[...(c.requiredHistory||[])],
  historyRelevant:c.requiredHistory||[],vitalsKnown:true,examDone:true,reassessments:1,
  disposition:rule.destinations[0],keyStudies:c.keyStudies||[],
  keyInterventions:c.keyInterventions||[],extraStudies:[],adverseCount:0,consultsDone:[]};
 const done=new Set(c.keyInterventions||[]),studies=new Set(c.keyStudies||[]);
 return {rule,a,done,studies};
}
test('all 30 declarative cases score only authored hidden requirements, not arbitrary extra medical actions',()=>{
 assert.equal(cases.length,30);
 for(const c of cases){
  const {rule,a,done,studies}=fixture(c);
  const baseline=csClosureQuality487(a,rule,done,studies);
  const optional=csClosureQuality487({...a,historyAnswered:[...a.historyAnswered,'unrelated-question']},
   rule,new Set([...done,'unnecessary-infusion','arbitrary-treatment']),new Set([...studies,'unrelated-study-without-order']));
  assert.equal(optional.score,baseline.score,c.id+': arbitrary actions cannot grant hidden-requirement credit');
  assert.equal(optional.treatment,baseline.treatment,c.id+': extra medication cannot grant treatment credit');
  assert.equal(optional.history,baseline.history,c.id+': extra unrelated question cannot grant history credit');
  const unexpectedStudy=csClosureQuality487({...a,extraStudies:['unrelated-study-without-order']},rule,done,studies);
  assert.equal(unexpectedStudy.score,Math.max(0,baseline.score-2),c.id+': an unnecessary study lowers efficiency, never adds XP');
  const harm=csClosureQuality487({...a,adverseCount:1},rule,done,studies);
  assert.equal(harm.score,Math.max(0,baseline.score-5),c.id+': documented harm lowers clinical quality at closure');
  assert.equal(harm.treatment,baseline.treatment,c.id+': adverse penalty must not masquerade as missing treatment');
 }
});
test('RESP-01 V2: an unindicated administered diuretic does not replace amoxicillin hidden treatment credit',()=>{
 const {rule,a,done,studies}=fixture(resp01V2Candidate);
 const complete=csClosureQuality487(a,rule,done,studies);
 const omitted=csClosureQuality487(a,rule,new Set(['furosemide']),studies);
 assert(omitted.treatment<complete.treatment);
 const wrong=csClosureQuality487({...a,adverseCount:1},rule,new Set(['amoxicillin','furosemide']),studies);
 assert.equal(wrong.treatment,complete.treatment);
 assert.equal(wrong.score,Math.max(0,complete.score-5));
});
