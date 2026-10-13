import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const src=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const start=src.indexOf('const CASES=')+'const CASES='.length;
assert(start>12);
let depth=0,quoted=false,escaped=false,end=-1;
for(let i=start;i<src.length;i++){
 const c=src[i];
 if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
 if(c==='"'){quoted=true;continue}
 if(c==='[')depth++;else if(c===']'&&--depth===0){end=i+1;break}
}
const cases=JSON.parse(src.slice(start,end));
assert.equal(cases.length,13);
const a=html.indexOf(' function csVegaPriorityStudies487(){');
const b=html.indexOf(' const csVegaInterventionComplete487=',a);
assert(a>=0&&b>a);
for(const c of cases){
 const sim={examDone:true};
 const ctx={C:c,sim};
 vm.createContext(ctx);
 new vm.Script(html.slice(a,b)).runInContext(ctx);
 const ids=Array.from(ctx.csVegaPriorityStudies487());
 assert(ids.length>=1&&ids.length<=2,'no flooding initial workup '+c.id);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ids){
  assert(c.keyStudies.includes(id),c.id+': native case study');
  assert(c.studies.some(s=>s.id===id),c.id+': actual study');
  assert(!/cultiv|culture|hemocult/i.test(id+' '+c.studies.find(s=>s.id===id).label),
   c.id+': long-latency culture is not the first diagnostic step');
 }
 const copy={...sim,examDone:true};
 assert.equal(JSON.stringify(Array.from(ctx.csVegaPriorityStudies487())),JSON.stringify(ids),
  'stable deterministic workup choice');
}
const rescue=html.split('<script id="ns422-vega-rescue">')[1].split('</script>')[0];
for(const token of ["job.phase='decision487'","diagnóstico presuntivo es","¿Qué proponés hacer?",
 "if(job.phase==='decision487')","urgent?targets:targets.slice(0,1)",
 "no se que hacer","if(critical){","csVegaConsultRequested487"]){
 assert(rescue.includes(token),'missing concise Vega safety/flow '+token);
}
// Do not silently authorize medication when a stable player is thinking.
const decisionStart=rescue.indexOf("  if(job.phase==='decision487'){");
const decisionEnd=rescue.indexOf("  if(job.phase==='reassessment'){",decisionStart);
assert(decisionStart>=0&&decisionEnd>decisionStart,'real native Vega wait state');
const decisionCode=rescue.slice(decisionStart,decisionEnd);
let notices=[];
const job={phase:'decision487',csDecisionAt487:1000};
const consultCtx={job,now:10000,window:{nsPatientState:()=>({color:'VERDE'})},
 immediateDanger:()=>false,say:t=>notices.push(t)};
const tick=()=>vm.runInNewContext('(function(){'+decisionCode+'})()',consultCtx,{timeout:1500});
tick();assert.equal(job.phase,'decision487');assert.equal(notices.length,0);
consultCtx.now=18000;tick();
assert.equal(job.phase,'decision487','silence is not authorization to treat stable patients');
assert.equal(notices.length,1,'single optional guidance prompt');
consultCtx.now=90000;tick();
assert.equal(job.phase,'decision487');assert.equal(notices.length,1,'no repeated timer spam');
consultCtx.window.nsPatientState=()=>({color:'ROJO'});
tick();assert.equal(job.phase,'reassessment','true critical deterioration interrupts wait');

console.log('VEGA CONCISE 13-CASE CLINICAL PRIORITY PASS',JSON.stringify({
 cases:13,studiesMax:2,criticalSupportRetained:true,decisionWindow:true,
 sequentialStableCare:true,source:'native 4.8.7 generated browser script'}));
