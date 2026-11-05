import test from 'node:test';
import assert from 'node:assert/strict';
import * as bots from '../v5/personality-anamnesis-bots.mjs';
import {compareConversations,interviewQuality} from '../v5/personality-conversation-metrics.mjs';

const authored=['calm','anxious','reserved','talkative','irritable','scared','uncooperative'];
const content=await bots.personalityContent();
test('all seven authored personality archetypes are reached by ordinary patient generation in every real case',()=>{
 const report=bots.auditArchetypeReachability?.(content,{seedsPerCase:128})??{cases:[]};
 assert.equal(report.cases.length,55);
 assert.deepEqual(report.authoredArchetypes,authored);
 assert.equal(report.generatedPatients,55*128);
 assert.deepEqual(report.unreachableArchetypes,[]);
 for(const c of report.cases){
  assert.deepEqual([...c.configured].sort(),[...authored].sort(),c.caseId);
  assert.deepEqual(Object.keys(c.counts).sort(),[...authored].sort(),c.caseId);
  assert.deepEqual(c.unreachable,[],c.caseId);
 }
 assert(report.distinctBehaviorProfiles>100,'traits remain multidimensional within the seven archetypes');
});

test('natural history retains substantive same-case diversity across the seven personalities',async()=>{
 const c=content.cases.find(c=>c.id==='APP-001'),rows=[];
 for(let profileIndex=0;profileIndex<authored.length;profileIndex++){
  const row=await bots.runAnamnesis(c,content,{index:profileIndex,profileIndex,doctor:'expert',recover:true});
  assert.deepEqual(row.failures,[],row.archetype);
  assert.deepEqual(interviewQuality(row).failures,[],row.archetype);rows.push(row);
 }
 const metric=compareConversations(rows);
 assert.equal(metric.pairs,21);assert(metric.uniqueSubstantiveBodies>=5);
 assert(metric.nearIdenticalPairs/metric.pairs<.45,'greetings and emotional remarks cannot earn this diversity');
});
