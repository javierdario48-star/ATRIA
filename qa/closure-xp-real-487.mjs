import assert from 'node:assert/strict';
import {createNativeXPJourney487,advanceLiveNativeJourney487 as advance}
 from './physiology-live/native-journey-487.mjs';
import {CASE_CLOSURE_RULES_487} from '../src/clinical/case-completion-487.js';
function initialize(rt,{complete=false}={}){
 const {ctx}=rt,c=ctx.C,p=ctx.sim,r=CASE_CLOSURE_RULES_487[c.id];
 assert(r,'test requires case-specific handoff');
 p.diagnosis=c.dx[0];p.lastVitalsKnown=true;p.examDone=true;p.reassessments=1;
 p.intentHistory=complete?c.requiredHistory.map(id=>({id})):
  [{id:c.requiredHistory[0]}];
 if(complete)for(const id of c.keyStudies)p.orders.set(id,{id,status:'done',result:'QA result'});
 else p.orders.set(r.study[0][0],{id:r.study[0][0],status:'done',result:'QA result'});
 const first=r.treatment[0]||[];
 for(const id of first)if(id==='iv'){p.venousAccessCount=1;}
 else if(['npo','ngt','source_control'].includes(id))p.interventions.add(id);
 else p.therapyExposure.set(id,{count:1});
 for(const service of r.consult?.[r.destinations[0]]||[])
  p.consults.set(service,{status:'done',accepted:true});
 return {ctx,c,p,r};
}
for(const variant of [false,true]){
 const rt=createNativeXPJourney487('COLON-001'),{ctx,p}=initialize(rt,{complete:variant});
 assert(ctx.window.csCaseHandoffOptions487().includes('alta'));
 const prior=ctx.csProfile.xp;
 assert.equal(ctx.window.csFinalizeCase487('alta'),true);
 assert(p.caseEnded&&p._careerEndProcessed);
 assert(p.nsOutcome?.career?.resolved);
 assert.equal(p.nsOutcome.career.xpDelta,ctx.csProfile.xp-prior);
 assert(p.nsOutcome.career.xpDelta>0);
 const grant=p.nsOutcome.career.xpDelta;
 ctx.finishCase('completed');
 assert.equal(ctx.csProfile.xp-prior,grant,'XP granted only once');
 console.log('NATIVE FINISH COLON',JSON.stringify({complete:variant,score:p.nsOutcome.score,
  xp:grant,closed:p.caseEnded,destination:p.disposition.id}));
}
for(const caseId of Object.keys(CASE_CLOSURE_RULES_487)){
 const rt=createNativeXPJourney487(caseId),{ctx,p,r}=initialize(rt);
 assert(ctx.window.csCaseHandoffOptions487().includes(r.destinations[0]),caseId);
 assert(ctx.window.csFinalizeCase487(r.destinations[0]),caseId+' real native case close');
 assert(p.caseEnded&&p._careerEndProcessed&&p.nsOutcome?.career?.resolved,caseId);
 assert(p.nsOutcome.career.xpDelta>0,caseId);
 assert.equal(p.phys?.sourceControlled===true,false,'referral cannot fake procedure '+caseId);
 console.log('NATIVE FINISH CASE',caseId,p.nsOutcome.score,p.nsOutcome.career.xpDelta);
}
console.log('ATRIA NATIVE CLOSURE SCORE XP PASS',JSON.stringify({
 completed:12,actualNativeFinish:true,actualNativeCareer:true,noFakeCaseEnded:true
}));
