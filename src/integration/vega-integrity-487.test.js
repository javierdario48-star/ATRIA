import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {apply487} from './apply-487.js';
import {readFrozenNativeReference487} from '../../qa/physiology-pilot/native-reference-487.mjs';

const vendor=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const html=apply487(vendor);
const rescue=html.split('<script id="ns422-vega-rescue">')[1].split('</script>')[0];
const a=rescue.indexOf('(function(){'),b=rescue.indexOf(' function say(',a);
assert(a>=0&&b>a);
const protectedSource=rescue.slice(a,b)+'\n})();';
const hash=s=>createHash('sha256').update(s).digest('hex');
const frozen=readFrozenNativeReference487().scope.extractedSourceHashes['ns422-treatment-context'];
assert.equal(hash(protectedSource),frozen,'original treatment-context contract remains frozen');
assert.equal(frozen,'31ed6e0d9bfd1da23a88653b916a3c5e387409d2c80ee3fb7de785ce02805901');
assert(rescue.indexOf(' const oldExplicitCall487=')>b,'call integration must remain outside protected context');
assert.equal(rescue.split(' const oldExplicitCall487=').length,2,'one explicit call adapter');
// Reproduce the exact drift introduced by 303e4313. Assertion argument order
// in the old compatibility gate displayed the frozen hash as "actual".
const adapter=" const oldExplicitCall487=window.csCallVega;window.csCallVega=function(){const ok=oldExplicitCall487?.apply(this,arguments);if(ok!==false&&sim){sim.csVegaConsultRequested487=true;window.nsSelectChatTarget487?.('expert');}return ok;};\n";
const faulty=protectedSource.replace(' window.nsTreatmentContext=',adapter+' window.nsTreatmentContext=');
assert.equal(hash(faulty),'2b5189d2d4269a6c5bf4360fc8d75ddf52646029375ea05fe6909ac593ae9d61');
assert.throws(()=>assert.equal(hash(faulty),frozen),/AssertionError/,'gate still rejects the original regression');
console.log('VEGA FROZEN CONTEXT PASS: exact original hash; 303e4313 drift reproduced and rejected');
