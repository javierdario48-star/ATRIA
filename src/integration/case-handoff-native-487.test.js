import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance}
 from '../../qa/physiology-live/native-journey-487.mjs';
function prepare(runtime){
 const {ctx}=runtime,p=ctx.sim,c=ctx.C;
 p.diagnosis=c.dx[0];p.lastVitalsKnown=true;p.examDone=true;
 p.intentHistory=[{id:c.requiredHistory[0]}];
 p.reassessments=1;
 return {ctx,p,c};
}
{
 const rt=createLiveNativeJourney487('COLON-001'),{ctx,p}=prepare(rt);
 assert.deepEqual([...ctx.window.csCaseHandoffOptions487()],[]);
 assert.equal(ctx.window.csFinalizeCase487('alta'),false);
 assert.equal(p._csCaseHandoff487,undefined);
 p.orders.set('colonoscopia',{status:'done'});
 assert.deepEqual([...ctx.window.csCaseHandoffOptions487()],['alta','sala']);
 assert.throws(()=>ctx.window.csFinalizeCase487('alta'),/fixture must not close a case/);
 assert.equal(p.disposition.id,'alta');
 assert.equal(p._csCaseHandoff487.action,'alta');
 assert.equal(ctx.window.nsExperienceEligible(),true,
  'verified partial safe handoff is XP eligible without requiring 70 points');
 assert(ctx.csBreakdown().safe);
}
{
 const rt=createLiveNativeJourney487('APP-001'),{ctx,p}=prepare(rt);
 p.orders.set('app_us',{status:'done'});
 ctx.addMonitorTherapy('ceftriaxona 1 g');
 ctx.addMonitorTherapy('metronidazol 500 mg');
 advance(rt,2.7);
 assert.equal(p.administrationLog.some(x=>x.id==='ceftriaxone'),true);
 assert.equal(p.administrationLog.some(x=>x.id==='metronidazole'),true);
 assert.equal(ctx.window.csCaseHandoffOptions487().length,0,
  'surgery not eligible until specialist actually replies');
 p.consults.set('cirugia',{status:'done',accepted:true});
 assert(ctx.window.csCaseHandoffOptions487().includes('quirofano'));
 assert.throws(()=>ctx.window.csFinalizeCase487('quirofano'),/fixture must not close a case/);
 assert.equal(p._csCaseHandoff487.action,'quirofano');
 assert.equal(p.phys?.sourceControlled===true,false,
  'referral is NOT performed surgery');
 assert.equal(ctx.window.nsExperienceEligible(),true);
}
for(const id of ['PERI-PBE-001','PERI-SEC-001','PERI-TER-001']){
 const rt=createLiveNativeJourney487(id);
 assert.equal(rt.ctx.window.csCaseClosure487(),null,'existing peritonitis owner unchanged');
}
console.log('ATRIA CLINICAL HANDOFF INTEGRATION PASS',JSON.stringify({
 outpatientAndSurgery:true,verifiedAntibioticReceipts:true,consultGate:true,
 partialQualityEarnsXP:true,peritonitisPreserved:true,
 fullBrowserCaseEndedNotValidated:true
}));
