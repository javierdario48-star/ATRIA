import test from 'node:test';
import assert from 'node:assert/strict';
import {runTransferBot} from '../v5/transfer-certification.mjs';
import {clinicalContent} from '../../src/v5/server/content.js';

test('a receiver-backed formal observation requests acceptance instead of waiting forever for a prior acceptance',async()=>{
 const c=clinicalContent.cases.find(c=>c.id==='NEUR-03');
 const row=await runTransferBot(c,{profile:'competent',mode:'solo'});
 assert.equal(row.passed,true,JSON.stringify(row.failures));
 assert.equal(row.closed,true);
 assert(row.consultations.some(c=>c.id==='neurology'&&c.accepted));
 assert.equal(row.checks.noDuplicateXP,true);
 assert.equal(row.checks.xp,true);
 assert(row.commands.some(c=>c.text==='/disposicion observacion'));
 assert(!row.commands.flatMap(c=>c.clinical).some(x=>x.receipt?.disposition?.kind==='clinical.unsafe-observation'),
  'a competent bot does not acquire debt from routine early closure attempts');
});
