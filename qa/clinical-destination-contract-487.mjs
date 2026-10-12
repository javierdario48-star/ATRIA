/** Source-grounded destination contract independent of the manual care plans. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {apply487} from '../src/integration/apply-487.js';
import {CARE_JOURNEYS_487} from './clinical-care-journeys-487.js';
const s=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const start=s.indexOf('  const RECOMMENDED_DEST={');
assert(start>0,'native V19 recommended destinations');
const end=s.indexOf('\n  };',start);
assert(end>start,'native V19 destination block closes');
const segment=s.slice(start,end);
const recommended={};
for(const m of segment.matchAll(/'([A-Z]+-[A-Z]+-\d+)':\[([^\]]*)\]/g))
 recommended[m[1]]=[...m[2].matchAll(/'([a-z]+)'/g)].map(x=>x[1]);
assert.equal(Object.keys(recommended).length,13);
let i=0;
for(const [id,plan] of Object.entries(CARE_JOURNEYS_487)){
 assert(recommended[id],id+' actual V19 destination missing');
 assert(recommended[id].includes(plan.destination),
  id+' QA treatment plan must use valid native outcome '+plan.destination);
 assert.equal(plan.alternatives.length,1);
 const selected=plan.destination;
 if(['shock','bleed','peritonitis'].includes(id))assert.notEqual(selected,'alta');
 if(['PERI-SEC-001','APP-001','CHOLE-001','MESI-001'].includes(id))
  assert.equal(selected,'quirofano');
 if(id==='CHOLANG-001')assert.equal(selected,'procedimiento');
 if(id==='HDA-001')assert.equal(selected,'procedimiento');
 i++;
}
console.log('ATRIA 13 NATIVE DESTINATION CONTRACTS PASS',JSON.stringify({
 reviewed:i,independentFromFixture:true,completeClinicalClosure:false
}));
