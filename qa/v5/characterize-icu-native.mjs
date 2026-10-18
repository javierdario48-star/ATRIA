// Original effective V19 critical-care advice, evaluated without UI wrappers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {apply487} from '../../src/integration/apply-487.js';
import {criticalCareReview487} from '../../src/v5/clinical/surgical-consultation.js';
const source=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const part=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i);assert(i>=0&&j>i);return source.slice(i,j);};
const original=part('function mentorAcuity(){','function mentorAcuityInline(')+part('  function csConsultAdvice(service){','  function csRequestConsult(service){');
const results=[];
for(const delta of [{},{sys:94},{sys:79},{sys:96,dia:45},{spo2:92},{spo2:89},{hr:130},{hr:155},{rr:30},{rr:36}]){
 const v={sys:120,dia:75,spo2:98,hr:80,rr:18,...delta},ctx=vm.createContext({vitalsNow:()=>v,C:{id:'PERI-TER-001'}});
 vm.runInContext(original,ctx);const advice=ctx.csConsultAdvice('uti'),level=ctx.mentorAcuity().level,actual=criticalCareReview487(v);
 assert.equal(actual.reason,advice);assert.equal(actual.accepted,level!=='stable');results.push({v,level,accepted:actual.accepted});
}
console.log('UTI ORIGINAL RESPONSE PASS',JSON.stringify({comparisons:results.length,sourceSHA256:createHash('sha256').update(original).digest('hex'),allMatched:true,
 scope:'Current-acuity V19 advice; explicit recent-shock acceptance is the separate correction required by the original peritonitis disposition contract.'}));
