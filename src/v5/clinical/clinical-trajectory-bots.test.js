import test from 'node:test';
import assert from 'node:assert/strict';
import {runClinicalBotMatrix} from '../../../qa/v5/clinical-trajectory-bots.mjs';

// This suite characterizes present truth, not a false green mortality claim.
// The independent --require-parity gate stays RED until disease/fatality and
// exact day-scale time are actually implemented and compared with the legacy.
test('C12f six real bots: correct care closes APP/CIRR; incompetent care harms with real IV receipts',async()=>{
 const report=await runClinicalBotMatrix();
 assert.equal(report.rows.length,6);
 for(const id of ['APP-001','CIRR-001']){
  const good=report.rows.find(x=>x.caseId===id&&x.strategy==='competent');
  assert.equal(good.closedStatus,'executed',id+' good doctor must close');
  assert.equal(good.closed.closeDestination,good.expectedDestination);
  assert.equal(good.preRejected,true);
  assert.equal(good.pendingRejected,true);
  assert.equal(good.wrongDestinationRejected,true);
  assert.equal(good.uniqueXP,true);
  assert.equal(good.closed.died,false);
  const neglected=report.rows.find(x=>x.caseId===id&&x.strategy==='neglect');
  assert.equal(neglected.refusal,'rejected');
  const bad=report.rows.find(x=>x.caseId===id&&x.strategy==='iatrogenic-overload');
  assert.equal(bad.fluidEventCount,20);
  assert.equal(bad.uniqueDoseEvents,20);
  assert.equal(bad.totalConfirmedFluidMl,10000);
  assert(bad.terminal.vitals.spo2<bad.initial.vitals.spo2-10);
  assert.equal(bad.refusedUnqualifiedClosure,true);
 }
 console.log('ATRIA_BOT_TRAJECTORIES='+JSON.stringify(report.rows.map(r=>({
  caseId:r.caseId,strategy:r.strategy,
  initialVitals:r.initial.vitals,
  finalVitals:(r.closed||r.terminal).vitals,
  delta:r.delta??null,
  died:(r.closed||r.terminal).died,
  destination:r.closed?.closeDestination??null,
  xp:r.closed?.xp??0,
  verifiedFluidMl:r.totalConfirmedFluidMl??0
 }))));
 console.log('ATRIA_BOT_GAPS='+JSON.stringify(report.gaps));
 // Do not assert mortality passes: characterization records it as unresolved.
 assert.equal(typeof report.parityAchieved,'boolean');
 assert(report.gaps.every(x=>typeof x.key==='string'&&typeof x.reason==='string'));
});
