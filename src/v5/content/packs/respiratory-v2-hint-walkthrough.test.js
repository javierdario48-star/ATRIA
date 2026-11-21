import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent} from '../../server/content.js';
import {createGuardSession} from '../../clinical/guard-session.js';
import {resp01V2Candidate as caseData} from './respiratory-v2-candidate.js';

const content={...clinicalContent,cases:clinicalContent.cases.map(c=>c.id===caseData.id?caseData:c)};
function make(i){
 const roomId='v2-vega-journey-'+i,uid=roomId+':patient';
 const session=createGuardSession({roomId,actorId:'doctor',actorName:'Auditor',mode:'solo',
  patient:{uid,caseId:caseData.id},content,resolveContext:()=>({patientUid:uid})});
 return session;
}
async function walkthrough(s,steps=70){
 const trace=[],counts=new Map;
 try{
  for(let i=0;i<steps;i++){
   let state=s.read();
   if(state.patient.caseEnded) return {state,trace};
   assert(!state.patient.patientDied,'patient died before completing Vega-guided care: '+JSON.stringify(trace));
   const audit=s.auditClosureRequirements(),hint=s.clinicalHint();
   assert(hint?.action,'no executable Vega hint: '+JSON.stringify({audit,trace}));
   const action=hint.action.command;
   if(hint.action.kind==='wait'){
    s.advance(20);await s.flush();
    trace.push({kind:'wait',hint:hint.key,minute:s.read().clock.nativeMinute});
    continue;
   }
   assert(typeof action==='string'&&action.length>1,'Vega returned non-executable command '+JSON.stringify(hint));
   const key=action+':'+JSON.stringify(audit.missing);
   const repetitions=(counts.get(key)||0)+1;counts.set(key,repetitions);
   assert(repetitions<=2,'Vega repeating same action without changing readiness: '+JSON.stringify({action,audit,trace}));
   const out=await s.post({id:'vega-walkthrough-'+i,text:action});
   trace.push({kind:hint.action.kind,action,status:out.clinical?.[0]?.status,reason:out.clinical?.[0]?.reason});
   assert(out.clinical?.length,'hint command did not reach clinical authority '+action);
   if(out.clinical[0].status==='rejected'){
    // A non-executable control is a contract defect, not a patient's clinical failure.
    throw Error('Dr Vega proposed rejected action '+JSON.stringify({action,reason:out.clinical[0].reason,trace}));
   }
   s.advance(2);await s.flush();
  }
  throw Error('Dr Vega did not reach closure by action '+steps+': '+JSON.stringify(trace));
 }finally{s.dispose();}
}
test('Dr Vega guides a competent physician from untouched encounter to authorized closure on a stable V2 seed',async()=>{
 let sample=null;
 for(let i=0;i<40;i++){
  const s=make(i);
  if(!(s.read().patient.variation?.complicationCandidates||[]).length){sample=s;break;}
  s.dispose();
 }
 assert(sample,'no stable deterministic scenario seed');
 const finished=await walkthrough(sample);
 assert.equal(finished.state.patient.caseEnded,true);
 assert.equal(finished.state.patient.closure?.destination,'alta');
 assert.equal(finished.state.patient.closure?.quality?.diagnosticFactor,1);
 assert.equal(finished.state.progress?.receipts?.length,1);
});
test('Vega-guided care checks one authority and can process a seeded complication instead of blindly discharging',async()=>{
 let sample=null;
 for(let i=0;i<50;i++){
  const s=make(200+i);
  if((s.read().patient.variation?.complicationCandidates||[]).length){sample=s;break;}
  s.dispose();
 }
 assert(sample,'no seeded complication candidate among sampled personalities');
 const finished=await walkthrough(sample,90);
 assert.equal(finished.state.patient.caseEnded,true);
 const episodes=finished.state.patient.policyState?.complications||[];
 for(const episode of episodes) assert.equal(episode.status,'recovered','Vega cannot discharge an unresolved manifested episode');
 assert.equal(finished.state.progress.receipts.length,1);
});
