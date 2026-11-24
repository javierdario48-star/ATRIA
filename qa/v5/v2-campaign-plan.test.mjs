import test from 'node:test';
import assert from 'node:assert/strict';
import {stagedV2Candidates as cases} from '../../src/v5/content/packs/v2-staging-candidates.js';
import {campaignScenario,campaignRange,CAMPAIGN_TOTAL,PILOT_TOTAL} from './v2-campaign-plan.mjs';
test('10,000 unique seeded scenarios, all cases/modes/profiles and bounded strategies',()=>{
 const plan=campaignRange(0,CAMPAIGN_TOTAL).map(i=>campaignScenario(cases,i));
 assert.equal(new Set(plan.map(s=>s.seed)).size,CAMPAIGN_TOTAL);
 assert.deepEqual(plan[548],campaignScenario(cases,548));
 const strata=new Map();for(const s of plan.slice(0,PILOT_TOTAL)){
  const key=[s.caseId,s.mode,s.profile].join('/');strata.set(key,(strata.get(key)||0)+1);
 }
 assert.equal(strata.size,120);assert([...strata.values()].every(n=>n===2));
 for(const s of plan){const c=cases.find(c=>c.id===s.caseId);
  assert(c.clinicalPolicy.closure.destinations.includes(s.destination));
  assert(s.qaPerturbation.actionDelayMax<=5);
 }
 assert.equal(new Set(plan.filter(s=>s.caseId==='CARD-08'&&s.profile==='competent')
  .map(s=>s.group+'/'+s.study)).size,4);
 assert.deepEqual([...campaignRange(0,240),...Array.from({length:40},(_,i)=>campaignRange(240+i*244,244)).flat()],campaignRange(0,10000));
 assert.throws(()=>campaignRange(9999,2));
});
