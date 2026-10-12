/**
 * QA only: 10-case destination question, player spoken-command branch,
 * actual generated native finishCase() and V19 XP. No manual caseEnded/XP.
 * Source-backed setup of already completed workup (not an entire live guard).
 * Existing peritonitis owner is deliberately outside these 10 rules.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CASE_CLOSURE_RULES_487} from '../src/clinical/case-completion-487.js';
import {createRealOutcomeJourney487} from './native-xp-outcome-fixture-487.mjs';

const speak={alta:'enfermera, dar de alta',observacion:'enfermera, dejar en observacion',
 sala:'enfermera, internar en sala',uti:'enfermera, derivar a uti',
 quirofano:'enfermera, derivar a quirofano',procedimiento:'enfermera, derivar a endoscopia'};
const rows=[];
function caseReady(id,variant){
 const rt=createRealOutcomeJourney487(id),ctx=rt.ctx,p=ctx.sim,c=ctx.C,rule=CASE_CLOSURE_RULES_487[id];
 assert(rule&&c,'expected one of ten new closure-owner cases');
 const dest=rule.destinations[0],study=rule.study[0][0],group=rule.treatment[0]||[];
 p.diagnosis=c.dx[0];p.examDone=true;p.lastVitalsKnown=true;p.reassessments=1;
 p.intentHistory=[{id:c.requiredHistory?.[0]||'anamnesis:reason'}];
 p.orders.set(study,{id:study,status:'done'});
 for(const t of group){
  if(t==='iv'){p.venousAccessCount=1;continue;}
  if(t==='npo'||t==='ngt')p.interventions.add(t);
  else p.therapyExposure.set(t,{count:1,unit:'recorded QA preparation'});
 }
 const receiver=rule.consult?.[dest]?.[0];
 if(receiver)p.consults.set(receiver,{status:'done',accepted:true});
 if(variant==='noExam'){p.examDone=false;p.examRegions=new Set();}
 if(variant==='noVitals')p.lastVitalsKnown=false;
 if(variant==='noStudy')p.orders.delete(study);
 if(variant==='noHistory')p.intentHistory=[];
 if(variant==='unsafeDischarge'){p.liveVitals.sys=78;p.liveVitals.spo2=88;}
 const wrong=dest==='alta'?'uti':'alta';
 return {rt,ctx,p,c,rule,dest,chosen:variant==='wrongDestination'?wrong:dest};
}
for(const id of Object.keys(CASE_CLOSURE_RULES_487)){
 for(const variant of ['minimal','noExam','noVitals','noStudy','noHistory','wrongDestination',
  ...(CASE_CLOSURE_RULES_487[id].destinations.includes('alta')?['unsafeDischarge']:[])]){
  const {rt,ctx,p,c,rule,dest,chosen}=caseReady(id,variant);
  const snapshot=ctx.window.csCaseClosure487();
  const clinicalCritical=Number(c.vitals?.bp?.split('/')?.[0]||120)<90||
   Number(p.liveVitals.sys)<90;
  const bypass=variant==='noStudy'&&rule.urgentStudyBypass&&clinicalCritical;
  const missingHistory=variant==='noHistory'&&!clinicalCritical;
  const blocked=variant==='noExam'||variant==='noVitals'||variant==='wrongDestination'||
    variant==='unsafeDischarge'||(variant==='noStudy'&&!bypass)||missingHistory;
  const beforeXP=ctx.csProfile.xp;
  ctx.window.csCaseCompletionRefresh487();
  const question=rt.uiCalls.some(x=>x.includes('¿Qué destino indicamos ahora?'));
  assert.equal(question,!blocked,
   id+'/'+variant+' nurse question should only appear for eligible destination');
  const response=ctx.nurseNatural(speak[chosen]);
  assert.equal(!!p.caseEnded,!blocked,id+'/'+variant+' actual finishCase');
  assert.equal(ctx.csProfile.xp>beforeXP,!blocked,id+'/'+variant+' actual native XP');
  assert.equal(!!p._careerEndProcessed,!blocked,id+'/'+variant+' actual career completion');
  if(blocked){
   assert.equal(p._csCaseHandoff487,undefined,id+' blocked destination has no completion proof');
   assert.equal(p.nsOutcome,undefined,id+' blocked destination has no outcome object');
   assert.equal(ctx.csProfile.resolvedPatients,0,id+' blocked destination has no resolved career entry');
  }else{
   assert.equal(p.nsOutcome?.career?.resolved,true,id+' native XP outcome');
   assert.equal(ctx.csProfile.xp-beforeXP,p.nsOutcome?.career?.xpDelta,id+' native credited XP amount');
   const xp=ctx.csProfile.xp;
   ctx.nurseNatural(speak[chosen]);
   assert.equal(ctx.csProfile.xp,xp,id+' duplicated spoken closure must not award XP again');
   assert.equal(p.phys?.sourceControlled===true&&chosen==='quirofano',false,
     id+' surgery handoff must not masquerade as source control');
  }
  rows.push({id,variant,question,chosen,blocked,ended:!!p.caseEnded,
   xp:ctx.csProfile.xp-beforeXP,career:!!p._careerEndProcessed,
   bypass:!!bypass,nativeFinish:true,
   evidence:'QA prepared clinical state; actual destination nurse, original finishCase and original career scorer'});
 }
}
assert.equal(new Set(rows.map(x=>x.id)).size,10);
assert(rows.some(x=>x.blocked)&&rows.some(x=>x.ended));
for(const row of rows)if(row.ended)assert(row.xp>0);
const out={scenarios:rows.length,caseCount:10,
 completed:rows.filter(x=>x.ended).length,blocked:rows.filter(x=>x.blocked).length,
 nurseQuestionObserved:rows.filter(x=>x.question).length,
 nativeCareerPaid:rows.filter(x=>x.xp>0).length,
 peritonitisNotCoveredHere:['PERI-PBE-001','PERI-SEC-001','PERI-TER-001'],
 scope:'true native finishCase and XP with prepared test state; UI click/browser and real study/nursing lifecycle not proven',
 rows};
fs.mkdirSync('qa/outcome-combinatorial-results',{recursive:true});
fs.writeFileSync('qa/outcome-combinatorial-results/closure-conversation-negative-487.json',JSON.stringify(out,null,2)+'\n');
console.log('ATRIA DESTINATION NURSE XP BOT',JSON.stringify({
 scenarios:out.scenarios,caseCount:out.caseCount,completed:out.completed,
 blocked:out.blocked,nurseQuestionObserved:out.nurseQuestionObserved,nativeCareerPaid:out.nativeCareerPaid
}));
