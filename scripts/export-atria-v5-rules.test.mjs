import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadAtriaRules,exportAtriaRules} from './export-atria-v5-rules.mjs';
import {SHIFT_DURATION_SECONDS,SHIFT_ARRIVAL_SECONDS} from '../src/v5/clinical/shift-flow.js';
import {nativeCaseXP,createProgressionLedger} from '../src/v5/clinical/progression.js';
import {hintPenaltyPercent,hintAdjustedXP} from '../src/v5/clinical/clinical-hint-ledger.js';
import {dispositionProof} from '../src/v5/core/disposition-receipt.js';
import {PATIENT_PERSONALITIES} from '../src/v5/content/patient-variation.js';
import {resp01V2Candidate} from '../src/v5/content/packs/respiratory-v2-candidate.js';
import {respiratoryPack} from '../src/v5/content/packs/respiratory-pack.js';

test('an immutable rules snapshot is versioned, recoverable and safe to export without changing contents',()=>{
 const c=loadAtriaRules('1.0.1');
 const historical=loadAtriaRules('1.0.0');
 assert.equal(historical.version,'1.0.0');
 assert.notEqual(historical.clinical.legacyPartialClosure,c.clinical.legacyPartialClosure,
  'old published contract must be preserved when rules change');
 assert.equal(c.releaseGates.v2PartialClosureSafe,true);
 assert.equal(c.status,'experimental-no-go');
 assert.equal(c.clinical.physiologyOwner,'existing native clinical physiology and nursing-time engine');
 assert.deepEqual(Object.keys(c.modes).sort(),['apprentice','competitive','coop','solo']);
 assert.equal(c.clinical.unsafeElectiveDestination.includes('15'),true);
 assert.throws(()=>loadAtriaRules('../latest'));
 const tmp=mkdtempSync(join(tmpdir(),'atria-rules-'));
 try{
  const out=exportAtriaRules('1.0.1',tmp);
  assert(existsSync(out));assert.deepEqual(JSON.parse(readFileSync(out,'utf8')),c);
 }finally{rmSync(tmp,{recursive:true,force:true});}
});
test('four-mode immutable rules agree with native time, permitted participants and XP ownership contracts',()=>{
 const c=loadAtriaRules('1.0.1');
 assert.equal(SHIFT_DURATION_SECONDS,c.sharedShift.seconds);
 assert.deepEqual(SHIFT_ARRIVAL_SECONDS,c.sharedShift.arrivalSeconds);
 assert.equal(PATIENT_PERSONALITIES.length,7);
 for(const mode of ['solo','apprentice','coop','competitive']){
  assert.equal(c.modes[mode].shiftSeconds,SHIFT_DURATION_SECONDS);
  assert(c.modes[mode].participants.min>=1);
  assert(c.modes[mode].participants.max<=4);
 }
 assert.equal(nativeCaseXP({score:100,mode:'solo'}),133);
 assert.equal(nativeCaseXP({score:100,mode:'apprentice'}),111);
 assert.equal(nativeCaseXP({score:100,mode:'coop'}),111);
 assert.equal(c.modes.solo.xpMultiplier,1.2);
 assert.equal(c.modes.apprentice.xpMultiplier,1);
 // Competitive is exclusively awarded via runtime claims, not by a second
 // clinical scoring formula. No fabricated multiplier is declared for it.
 assert.equal(c.modes.competitive.xpMultiplier,undefined);
});
test('Vega hints, unsafe decisions and distinct actors use one common XP rule',()=>{
 assert.equal(hintPenaltyPercent(1),5);
 assert.equal(hintPenaltyPercent(20),100);
 assert.equal(hintAdjustedXP(100,1),95);
 assert.equal(hintAdjustedXP(100,1,true),47);
 const ledger=createProgressionLedger();
 for(const [actorId,destination,kind] of [
  ['A','alta','clinical.unsafe-discharge'],
  ['B','observacion','clinical.unsafe-observation']
 ]){
  const result=destination==='alta'?ledger.penalizeUnsafeDischarge({eventId:actorId,actorId,patientUid:'P'}):
   ledger.penalizeUnsafeObservation({eventId:actorId,actorId,patientUid:'P'});
  assert.equal(result.loss,15);
  const proof={kind,eventId:actorId,actorId,patientUid:'P',
   destination,closed:false,penaltyEventId:actorId};
  assert(dispositionProof({eventId:actorId,patientUid:'P',receipt:{disposition:proof}},destination,actorId),
   'all unsafe dispositions must be confirmed by native proof validation');
 }
 assert.equal(ledger.read().xpDebt,30);
 assert.equal(ledger.read().xp,0);
});
test('RESP-01 V2 exists as isolated content with exactly the original physiological executor',()=>{
 assert.equal(resp01V2Candidate.clinicalExecutorId,respiratoryPack.cases[0].clinicalExecutorId);
 assert.equal(resp01V2Candidate.id,respiratoryPack.cases[0].id);
 assert.equal(resp01V2Candidate.clinicalRevision,'v2-candidate');
 assert(resp01V2Candidate.clinicalPolicy.complications.some(c=>c.probability===.2));
});
