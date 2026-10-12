/**
 * Independent ten-case boundary: real native medication orders -> native
 * administration receipts -> minimum ED handoff -> original V18 finishCase
 * -> original V19 XP. Existing three peritonitis owners have a separate bot.
 * The fixture prepares study results, procedural NPO/NGT and consult outcomes;
 * it does NOT pretend to validate study transport, cannulation or UI touch.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CARE_JOURNEYS_487} from './clinical-care-journeys-487.js';
import {CASE_CLOSURE_RULES_487} from '../src/clinical/case-completion-487.js';
import {createRealOutcomeJourney487} from './native-xp-outcome-fixture-487.mjs';
import {advanceNativeReference487} from './physiology-pilot/native-reference-487.mjs';
const rows=[],cases=Object.keys(CASE_CLOSURE_RULES_487);
assert.equal(cases.length,10,'three peritonitis pathways remain separately owned');
for(const caseId of cases)for(const variant of ['standard','alternative']){
 const plan=CARE_JOURNEYS_487[caseId],rule=CASE_CLOSURE_RULES_487[caseId];
 assert(plan&&rule,'declared care plan and closure owner');
 const orders=variant==='standard'?plan.orders:plan.alternatives[0];
 const rt=createRealOutcomeJourney487(caseId),{ctx}=rt,p=ctx.sim,c=ctx.C;
 p.diagnosis=c.dx[0];p.examDone=true;p.lastVitalsKnown=true;p.reassessments=1;
 p.intentHistory=[{id:c.requiredHistory?.[0]||'anamnesis:reason'}];
 p.orders.set(rule.study[0][0],{id:rule.study[0][0],status:'done',result:'fixture prerequisite'});
 p.consults??=new Map();
 const receiver=rule.consult?.[plan.destination]?.[0];
 if(receiver)p.consults.set(receiver,{status:'done',accepted:true});
 for(const id of plan.support){
  if(id==='iv')assert(p.venousAccessCount>0,'fixture has a genuinely confirmed IV');
  else p.interventions.add(id); // Prior procedure documented; no surgery simulated.
 }
 const priorSourceControl=p.phys?.sourceControlled,preXP=ctx.csProfile.xp;
 const medicines=orders.map(order=>{
  const id=ctx.findMonitorTherapy(order)?.id;
  assert(id,caseId+' recognizer missing '+order);
  const before=p.administrationLog.filter(x=>x.id===id).length;
  assert.equal(ctx.addMonitorTherapy(order),true,caseId+' native order accepted '+order);
  return {id,order,before};
 });
 advanceNativeReference487(rt,.42);
 const administered=medicines.map(x=>({
  id:x.id,order:x.order,receipts:p.administrationLog.filter(r=>r.id===x.id).length-x.before,
  dose:p.administrationLog.find(r=>r.id===x.id)?.doseDisplay||null
 }));
 for(const x of administered)assert(x.receipts>0,caseId+' '+variant+' actual dose missing '+x.id);
 // Hypoxemia can be treated through the same monitor, never by a fake flag.
 if(p.liveVitals.spo2<90&&!p.administrationLog.some(x=>x.id==='oxygen')){
  assert.equal(ctx.addMonitorTherapy('oxigeno 4 L/min'),true);
  advanceNativeReference487(rt,.64);
  assert(p.administrationLog.some(x=>x.id==='oxygen'),caseId+' hypoxemia oxygen receipt');
 }
 ctx.window.csCaseCompletionRefresh487();
 const nurseQuestion=rt.uiCalls.some(s=>s.includes('¿Qué destino indicamos ahora?'));
 const assessment=ctx.window.csCaseClosure487();
 const options=ctx.window.csCaseHandoffOptions487();
 const ready=options.includes(plan.destination);
 let finished=false;
 if(ready)finished=ctx.window.csFinalizeCase487(plan.destination)===true;
 const xp=p.nsOutcome?.career?.xpDelta||0;
 const outcome={caseId,variant,destination:plan.destination,ready,
  missing:assessment?.missing||[],nurseQuestion,finished,caseEnded:!!p.caseEnded,
  careerProcessed:!!p._careerEndProcessed,resolved:p.nsOutcome?.career?.resolved===true,
  score:p.nsOutcome?.score??null,xp,actualAdministrations:administered,
  consultationFixture:receiver||null,sourceControlUnchanged:p.phys?.sourceControlled===priorSourceControl,
  finalVitals:Object.fromEntries(['sys','dia','hr','rr','spo2'].map(k=>[k,Number(p.liveVitals[k])])),
  elapsedRealSeconds:rt.clock.realSeconds};
 rows.push(outcome);
 assert(ready,caseId+'/'+variant+' blocked after actual administrations '+JSON.stringify(outcome.missing));
 assert(nurseQuestion,caseId+'/'+variant+' nurse destination question missing');
 assert(finished&&p.caseEnded&&p._careerEndProcessed&&outcome.resolved,caseId+'/'+variant+' original native closing failed');
 assert(xp>0&&ctx.csProfile.xp-preXP===xp,caseId+'/'+variant+' genuine native XP not credited');
 assert(outcome.sourceControlUnchanged,caseId+'/'+variant+' invented source control');
 ctx.window.csFinalizeCase487(plan.destination);
 assert.equal(ctx.csProfile.xp,preXP+xp,caseId+'/'+variant+' duplicate XP on repeated closure');
}
const result={cases:cases.length,scenarios:rows.length,
 ended:rows.filter(x=>x.caseEnded).length,paid:rows.filter(x=>x.xp>0).length,
 realNativeDrugReceipts:true,originalNativeFinishAndCareer:true,
 limitation:'Study results, consult acceptance and NPO/NGT were supplied as prerequisites; no real browser or touch navigation',rows};
fs.mkdirSync('qa/outcome-combinatorial-results',{recursive:true});
fs.writeFileSync('qa/outcome-combinatorial-results/native-administered-closure-487.json',JSON.stringify(result,null,2)+'\n');
console.log('ATRIA REAL DELIVERED DRUGS + NATIVE CASE CLOSURES',JSON.stringify({
 cases:result.cases,scenarios:result.scenarios,ended:result.ended,paid:result.paid,
 byCase:rows.map(x=>({id:x.caseId,variant:x.variant,score:x.score,xp:x.xp,meds:x.actualAdministrations.map(y=>y.id)}))
}));
