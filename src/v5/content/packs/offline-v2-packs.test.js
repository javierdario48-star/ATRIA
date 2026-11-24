import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent} from '../../server/content.js';
import {stageOfflineV2Packs,offlineV2Packs} from './offline-v2-packs.js';
test('explicit offline lab compiles all three revisions and preserves all other cases',()=>{
 const old=clinicalContent.cases,base=old.slice(0,25),additional=old.slice(25);
 const staged=stageOfflineV2Packs(base,additional),cases=[...staged.baseCases,...staged.additionalCases];
 assert.equal(cases.length,55);assert.equal(new Set(cases.map(x=>x.id)).size,55);
 const ids=offlineV2Packs.flatMap(p=>p.cases.map(c=>c.id));
 assert.deepEqual(ids.sort(),['CARD-08','RESP-01','VARIX-001']);
 for(let i=0;i<old.length;i++){
  assert.equal(cases[i].id,old[i].id);
  if(ids.includes(old[i].id)){assert.equal(cases[i].clinicalRevision,'v2-candidate');assert(cases[i].clinicalGraph);assert.notEqual(cases[i],old[i]);}
  else assert.equal(cases[i],old[i]);
  assert.notEqual(old[i].clinicalRevision,'v2-candidate');
 }
 assert.throws(()=>stageOfflineV2Packs(base,additional,[offlineV2Packs[0],offlineV2Packs[0]]));
});
