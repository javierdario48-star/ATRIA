// QA only: effective original excerpt runs in an isolated VM, never in V5.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {apply487} from '../../src/integration/apply-487.js';
import {physicalExamRows,EXAM_TECHNIQUES} from '../../src/v5/clinical/physical-exam.js';
const reference=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const script=reference.match(/<script id="ns421-clinical-exam">([\s\S]*?)<\/script>/)?.[1];
assert(script,'effective native exam excerpt missing');
const start=script.indexOf(' const unspecified='),end=script.indexOf(' function menu()');
assert(start>=0&&end>start,'native observation boundary changed; inspect reference');
const stateScript=reference.match(/<script id="ns421-clinical-state">([\s\S]*?)<\/script>/)?.[1],
 dialogue=reference.match(/<script id="ns421-patient-dialogue">([\s\S]*?)<\/script>/)?.[1];
assert(stateScript&&dialogue,'effective native state/dialogue excerpts missing');
function excerpt(source,first,next){const a=source.indexOf(first),b=source.indexOf(next,a);assert(a>=0&&b>a);return source.slice(a,b);}
const observations=excerpt(stateScript,' function neurological(',' function care(')+
 excerpt(stateScript,' function severity(',' function evaluate(')+
 excerpt(dialogue,' const profiles=',' window.nsPatientProfiles=')+
 excerpt(dialogue,' function symptoms(',' window.nsSymptoms=');
const cases=JSON.parse(fs.readFileSync('src/v5/content/cases.json','utf8'));
let comparisons=0;
for(const caseId of ['CIRR-001','APP-001','PERI-SEC-001']){
 const c=cases.find(c=>c.id===caseId),[sys,dia]=c.vitals.bp.split('/').map(Number),base={...c.vitals,sys,dia};
 for(const change of [{},{sys:85,rr:28},{spo2:88},{hr:75,sys:120,dia:78,temp:37,rr:18}]){
  const vitals={...base,...change},p={caseId,liveVitals:vitals,baselineVitals:base},
   ctx=vm.createContext({C:c,sim:{...p,gameMinute:0,monitorTherapies:new Map(),interventions:new Set()},window:{}});
  vm.runInContext(observations+`
   window.nsGlasgowState=()=>neurological(sim,C);
   window.nsPatientState=()=>{const delta=severity(sim.liveVitals,neurological(sim,C))-severity(sim.baselineVitals,neurological(null,C));
    return {vitals:sim.liveVitals,trend:delta>.8?'worse':delta<-.8?'better':'unchanged'};};
   window.nsSymptoms=symptoms;
  `+script.slice(start,end)+'\nglobalThis.observe=currentFindings;',ctx,{timeout:1000});
  for(const technique of Object.keys(EXAM_TECHNIQUES)){
   const expected=JSON.parse(JSON.stringify(ctx.observe(technique)));
   const actual=physicalExamRows(caseId,p,technique).map(({organ,text})=>({organ,text}));
   assert.deepEqual(actual,expected,caseId+' '+technique+' '+JSON.stringify(vitals));comparisons++;
  }
 }
}
console.log(JSON.stringify({test:'effective-original-examination',comparisons,passed:true,
 referenceSHA256:createHash('sha256').update(reference).digest('hex'),
 scope:'CIRR/APP/PERI-SEC techniques, native pain, real-sign trend, hypotension, hypoxemia and tachypnea; no unmodeled organ reported normal'}));
