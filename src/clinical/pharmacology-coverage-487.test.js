import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';
import {csPharmCoverageAudit487} from './pharmacology-coverage-487.js';
const golden=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const a=golden.indexOf('const CASES=')+'const CASES='.length;
const cases=JSON.parse(golden.slice(a).split('\n')[0].replace(/;\s*$/,''));
const start=golden.indexOf('const MONITOR_THERAPY_CATALOG=[');
const end=golden.indexOf('function findMonitorTherapy(',start);
assert(start>=0&&end>start);
const native=vm.runInNewContext(golden.slice(start,end)+';MONITOR_THERAPY_CATALOG');
const built=apply487(golden);
assert.match(built, /id\s*:\s*['"]anticoagulation['"]/,
 'the real late clinical bootstrap must still define the additional heparin medication');
assert.equal(native.length,29,'if base catalog changes, independently revisit readiness report');
const current=[...native,{id:'anticoagulation',label:'Heparina IV'}];
const report=csPharmCoverageAudit487(cases,current);
assert.equal(report.cases,13);
assert.equal(report.drugs,30);
assert.equal(report.pairs,390);
assert.equal(report.counts.pilotTested,15);
assert.equal(report.counts.pilotOnly,50);
assert.equal(report.counts.contractOnly,312);
assert.equal(report.counts.missingRules,13);
assert.deepEqual(report.missingRules,['anticoagulation']);
assert.equal(report.deployable,false,'missing heparin rule must block promotion');
assert.equal(report.errors.length,0);
assert(report.entries.every(x=>x.hasCaseProfile),'every current case has profile');
assert.throws(()=>csPharmCoverageAudit487([{id:'UNKNOWN-NO-PROFILE'}],native),
 /requires explicit/,'a future case cannot silently omit its physiological profile');
const duplicate=csPharmCoverageAudit487(cases,[...current,current[0]]);
assert.equal(duplicate.deployable,false);
assert(duplicate.errors.some(x=>x.startsWith('duplicate-or-missing-drug-id')));
console.log('ATRIA GLOBAL PHARMACOLOGY COVERAGE AUDIT PASS',JSON.stringify({
 cases:report.cases,bootEntries:report.drugs,pairs:report.pairs,
 statuses:report.counts,missingRules:report.missingRules,
 heparinPromotionBlocked:true,oldMotorUnchanged:true
}));
