import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CASE_CLOSURE_RULES_487} from '../src/clinical/case-completion-487.js';
import {createRealOutcomeJourney487} from './native-xp-outcome-fixture-487.mjs';
const rows=[];
function prep(id,variant){
 const rt=createRealOutcomeJourney487(id),{ctx}=rt,p=ctx.sim,c=ctx.C;
 const rule=CASE_CLOSURE_RULES_487[id],group=rule.treatment[0]||[];
 p.diagnosis=c.dx[0];p.examDone=true;p.lastVitalsKnown=true;p.reassessments=1;
 p.intentHistory=[{id:c.requiredHistory[0]||'anamnesis:reason'}];
 p.orders.set(rule.study[0][0],{id:rule.study[0][0],status:'done'});
 for(const t of group){
  if(t==='iv'){p.venousAccessCount=1;continue}
  if(['npo','ngt'].includes(t))p.interventions.add(t);
  else p.therapyExposure.set(t,{count:1,unit:'QA confirmed'});
 }
 const receiver=rule.consult?.[rule.destinations[0]]?.[0];
 if(receiver)p.consults.set(receiver,{status:'done',accepted:true});
 if(variant==='complete'){
  p.intentHistory=c.requiredHistory.map(id=>({id})).concat(
   ['anamnesis:pmh','anamnesis:allergies','anamnesis:meds','anamnesis:surgeries'].map(id=>({id})));
  for(const id of c.keyStudies)p.orders.set(id,{id,status:'done'});
  for(const id of c.keyInterventions||[])if(id!=='source_control'&&id!=='surgery'){
   if(['npo','ngt'].includes(id))p.interventions.add(id);
   else p.therapyExposure.set(id,{count:1});
  }
 }else if(variant==='overtesting'){
  p.intentHistory=c.requiredHistory.map(id=>({id}));
  for(const id of c.keyStudies)p.orders.set(id,{id,status:'done'});
  for(let n=0;n<3;n++)p.orders.set('unneeded'+n,{id:'unneeded'+n,status:'done'});
 }
 if(variant==='missingDx')p.diagnosis='wrong clinical diagnosis';
 if(variant==='noConsult'&&receiver)p.consults.delete(receiver);
 if(variant==='noTreatment'&&group.length){
  for(const t of group){p.therapyExposure.delete(t);p.interventions.delete(t);}
  if(group.includes('iv'))p.venousAccessCount=0;
 }
 if(variant==='unsafeRelease'){
  p.liveVitals.sys=78;p.liveVitals.spo2=88;
 }
 return {rt,ctx,p,c,rule};
}
for(const id of Object.keys(CASE_CLOSURE_RULES_487)){
 for(const v of ['minimum','complete','overtesting','missingDx','noConsult','noTreatment']){
  const {ctx,p,rule}=prep(id,v),destination=rule.destinations[0];
  const before=ctx.csProfile.xp;
  let err=null,result=false;
  try{result=ctx.window.csFinalizeCase487(destination)}catch(e){err=String(e.stack||e)}
  const ended=!!p.caseEnded,career=p.nsOutcome?.career,score=p.nsOutcome?.score??null;
  const blocked=v==='missingDx'||v==='noTreatment'&&rule.treatment.length>0||
   v==='noConsult'&&!!rule.consult?.[destination]?.length;
  if(err)throw Error(id+' '+v+' native exception '+err);
  assert.equal(ended,!blocked,id+' '+v+' genuine caseEnded');
  assert.equal(result,!blocked,id+' '+v+' actual successful finish signal');
  if(!blocked){
   assert.equal(p._careerEndProcessed,true,id+' native career end receipt');
   assert.equal(career?.resolved,true,id+' XP reward genuinely approved');
   assert(career?.xpDelta>0,id+' XP actually credited');
   assert.equal(ctx.csProfile.xp-before,career.xpDelta,id+' real XP ledger balance');
   assert(score>=0&&score<=100,id+' real bounded score');
   const prev=p.nsOutcome?.career?.xpDelta;
   ctx.window.csFinalizeCase487(destination);
   assert.equal(ctx.csProfile.xp-before,prev,id+' XP never double awarded');
  }else{
   assert.equal(p.nsOutcome,undefined,id+' no result created for unsafe/incomplete workup');
   assert.equal(ctx.csProfile.xp,before,id+' no XP for incomplete unsafe case');
  }
  rows.push({id,variant,destination,blocked,ended,score,xp:career?.xpDelta||0});
 }
 const pick=v=>rows.find(x=>x.id===id&&x.variant===v);
 assert(pick('complete').xp>=pick('minimum').xp,id+' thoroughness XP cannot decrease');
 assert(pick('overtesting').xp<pick('complete').xp,id+' extra studies lower real XP');
}
const out={total:rows.length,closed:rows.filter(x=>x.ended).length,
 blocked:rows.filter(x=>!x.ended).length,recordedXP:rows.filter(x=>x.xp>0).length,
 verifiedNativeFinish:true,source:'generated V18/V19 functions with QA-only UI stubs',
 rows};
fs.mkdirSync('qa/outcome-combinatorial-results',{recursive:true});
fs.writeFileSync('qa/outcome-combinatorial-results/xp-matrix-487.json',JSON.stringify(out,null,2)+'\n');
console.log('ATRIA REAL NATIVE END + XP MATRIX',JSON.stringify({
 total:out.total,closed:out.closed,blocked:out.blocked,recordedXP:out.recordedXP
}));
