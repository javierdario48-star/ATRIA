import test from 'node:test';
import assert from 'node:assert/strict';
import {HARMFUL_MORTALITY_SCENARIOS,runLocalMortalityScenario,runLocalMortalityMatrix,
 runDurableMortalityScenario} from '../../../qa/v5/mortality-regression.mjs';

test('solo, apprentice and cooperative neglect reaches a real sustained-shock death while matched indicated care survives',async()=>{
 const rows=await runLocalMortalityMatrix({cases:['PERI-SEC-001'],harmful:[]});
 assert.equal(rows.length,6);
 for(const mode of ['solo','apprentice','coop']){
  const bad=rows.find(r=>r.mode===mode&&r.bot==='abandonment');
  const good=rows.find(r=>r.mode===mode&&r.bot==='competent');
  assert.equal(bad.administrations.length,0);
  assert.equal(bad.final.deathReason,'circulatory-collapse');
  assert(bad.firstCriticalAt<bad.final.deathAtRealSecond);
  assert(bad.final.deathAtRealSecond>=180,'original unconditional grace must remain intact');
  assert(bad.final.exposureNativeMinutes>=1.35,'original fatal exposure must remain intact');
  assert.equal(bad.final.xp,0);
  assert.equal(bad.terminalIntegrity.postmortemRejected,4);
  assert(bad.terminalIntegrity.noResurrection);
  assert(good.final.closed&&good.final.destination==='quirofano');
  assert(!good.final.died&&good.final.xp>0);
  assert(good.administrations.some(x=>x.id==='fluid'));
  assert(good.administrations.some(x=>x.id==='ceftriaxone'));
  assert(good.administrations.some(x=>x.id==='metronidazole'));
 }
});

for(const id of ['diuretic-hypovolemia','opioid-overdose','anticoagulant-hda','anticoagulant-varix',
 'anticoagulant-lgib','fluid-overload-cirr','fluid-overload-panc','severe-allergy']){
 test(id+' valid independent administrations cause observed deterioration then an irreversible native death',async()=>{
  const spec=HARMFUL_MORTALITY_SCENARIOS.find(x=>x.id===id);
  const row=await runLocalMortalityScenario({...spec,bot:'harmful'},{horizon:360});
  const doses=row.administrations.filter(x=>x.id===spec.drug);
  assert(doses.length>=3,'repeat dosing must actually complete');
  assert.equal(new Set(doses.map(x=>x.sourceEventId)).size,doses.length);
  assert(row.trace.some(x=>x.type==='command'&&x.clinical.some(c=>c.status==='pending')));
  assert(row.trace.some(x=>x.type==='command'&&x.clinical.some(c=>c.status==='rejected')));
  assert(row.firstCriticalAt<row.final.deathAtRealSecond,'a severe reading alone cannot set death');
  assert.equal(row.final.xp,0);
  assert.equal(row.progress.receipts.length,0);
  assert.equal(row.progress.penalties.length,1);
  assert(row.terminalIntegrity.unchangedAdministrations&&row.terminalIntegrity.unchangedVitals);
  if(id.startsWith('fluid-')){
   assert.equal(doses.length,20);assert.equal(doses.reduce((sum,x)=>sum+x.dose.amount,0),10000);
   assert(row.final.vitals.spo2<80);
  }
  if(id==='opioid-overdose'){
   assert(doses.every(x=>x.dose.amount===30&&x.dose.unit==='mg'));
   assert(row.final.vitals.spo2<80);
  }
 });
}

test('severe allergy is an explicit documented fact; ordinary allergy never becomes fabricated anaphylaxis',async()=>{
 const ordinary=HARMFUL_MORTALITY_SCENARIOS.find(x=>x.id==='ordinary-allergy');
 const row=await runLocalMortalityScenario({...ordinary,bot:'harmful'},{horizon:300});
 assert.equal(row.administrations.filter(x=>x.id==='ceftriaxone').length,4);
 assert.equal(row.final.died,false);
 assert(!row.adverseEvents.some(x=>x.kind==='severe-drug-allergy'));
});

test('delayed oxygen and volume rescue after real opioid toxicity can avert death without erasing the exposure or giving XP',async()=>{
 const spec=HARMFUL_MORTALITY_SCENARIOS.find(x=>x.id==='opioid-delayed-rescue');
 const row=await runLocalMortalityScenario({...spec,bot:'harmful'});
 assert(!row.final.died);
 assert(row.adverseEvents.some(x=>x.kind==='opioid-respiratory-depression'));
 assert(row.administrations.some(x=>x.id==='oxygen'&&x.administeredAtRealSecond>=205));
 assert(row.administrations.some(x=>x.id==='fluid'&&x.administeredAtRealSecond>=205));
 assert.equal(row.final.xp,0);
 assert.equal(row.final.atRealSecond,1440);
});

for(const mode of ['coop','competitive'])test(mode+' SQLite worker restart preserves shared mortality and rejects postmortem therapy',async()=>{
 const row=await runDurableMortalityScenario({id:'death-shared',caseId:'PERI-SEC-001',bot:'abandonment',expectedDeath:true},{mode,horizon:240});
 assert(row.final.died);
 assert(row.terminalIntegrity.sharedDeath&&row.terminalIntegrity.databaseReopened);
 assert.equal(row.deathEvents,1);
 assert.equal(row.claims.filter(([,r])=>r.patientUid===row.patientUid).length,0);
 assert.equal(row.administrations.length,0);
});
