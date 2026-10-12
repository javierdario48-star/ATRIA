/* QA fixture: load genuine V18 native finishCase and V19 XP scorer directly
 * from the GENERATED candidate. Never write caseEnded or XP manually.
 * UI/DOM calls are stubbed. A native-browser verification is still needed. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../src/integration/apply-487.js';
import {loadNativeReferenceSources487,createNativeReferenceRuntime487}
 from './physiology-pilot/native-reference-487.mjs';
const generated=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
function between(a,b){
 const i=generated.indexOf(a),j=generated.indexOf(b,i+a.length);
 assert(i>=0&&j>i,'verified outcome boundary '+a);
 return generated.slice(i,j);
}
const finalizer=between("finishCase=function(reason='completed'){","\nfunction csHasTherapy(id){");
const scorer=between('  function csEnsureCompetencies(p){','  function csDebriefMoments(){');
const marker='<script id="atria-case-completion-487">';
const adapter=between(marker,'</script>');
assert(finalizer.includes('sim.caseEnded=true')&&finalizer.includes('csResultCareer(score,b)'));
assert(scorer.includes('resolved=!!b.safe&&!!window.nsExperienceEligible?.()'));
const base=loadNativeReferenceSources487();
export function createRealOutcomeJourney487(caseId){
 const native=[
  'function csLevel(){return Math.floor((Number(csProfile?.xp)||0)/1000)+1;}',
  'function csCheckCoatUnlock(){return false;}',
  'function csSaveProfile(){}',
  'function csPlaySound(){}',
  'function csRefreshProfileSurfaces(){}',
  'function csFinishHTML(){return "QA real closure";}',
  'function csShowOutcome(){}',
  'function csCloseOutcome(){}',
  'function csReturnToCases(){}',
  scorer,finalizer
 ].join('\n');
 const code=[...base.compiled.map(x=>[x.id,x.code]),
  ['qa-native-outcome',native],
  ['atria-case-completion-487',adapter.slice(marker.length)]];
 const tailored={...base,compiled:code.map(([id,s])=>({
  id,code:s,compiled:new vm.Script(s,{filename:'outcome-qa/'+id+'.js'})}))};
 const runtime=createNativeReferenceRuntime487({caseId,sources:tailored});
 const {ctx}=runtime,noop=()=>{};
 ctx.csProfile={xp:0,totalPatients:0,soloPatients:0,apprenticePatients:0,
  shiftPatients:0,resolvedPatients:0,safePatients:0,criticalSafePatients:0,
  recentScores:[],reputation:50,streak:0,bestStreak:0,bestScore:0};
 Object.assign(ctx,{toast:noop,csReturnToCases:noop,csShowOutcome:noop,
  csCloseOutcome:noop,csPlaySound:noop,csRefreshProfileSurfaces:noop});
 ctx.document.createElement=()=>({style:{},appendChild:noop,classList:{add:noop}});
 ctx.document.body.appendChild=noop;ctx.window.nsMayExamine=()=>true;
 ctx.window.nsPracticeReward=()=>1;
 ctx.window.nsCaseComplexity=()=>({factor:1,label:'QA fixed'});
 return runtime;
}
