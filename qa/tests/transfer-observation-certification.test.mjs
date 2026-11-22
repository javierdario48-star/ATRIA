import test from 'node:test';
import assert from 'node:assert/strict';
import {runTransferBot} from '../v5/transfer-certification.mjs';
import {clinicalContent} from '../../src/v5/server/content.js';

for(const profile of ['wrong-dx','insufficient-preparation'])test(
 'DIARR formal observation '+profile+' validates the real reprimand, debt and later unique closure',async()=>{
 const c=clinicalContent.cases.find(c=>c.id==='DIARR-001');
 const row=await runTransferBot(c,{profile,mode:'apprentice'});
 assert.equal(row.passed,true,JSON.stringify(row.failures));
 assert.equal(row.checks.initialUnsafeActionHandled,true);
 assert.equal(row.checks.noDuplicateXP,true);assert.equal(row.checks.xp,true);
 const errors=row.commands.flatMap(command=>command.clinical)
  .map(action=>action.receipt?.disposition).filter(Boolean);
 assert(errors.length>0);
 assert(errors.every(r=>r.kind==='clinical.unsafe-observation'&&r.closed===false));
 assert.equal(new Set(errors.map(r=>r.penaltyEventId)).size,1);
 assert.equal(row.closed,true);
});
