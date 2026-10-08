import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';
import {buildStudyCatalog,resolveStudyById,materializeStudy,studyTurnaroundMinutes,REAL_MS_PER_GAME_HOUR} from './study-registry.js';
const base=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'),html=apply487(base);
function casesFrom(source){
 const marker='const CASES=',a=source.indexOf(marker)+marker.length;assert(a>=marker.length);
 let depth=0,str=false,escaped=false;
 for(let i=a;i<source.length;i++){const x=source[i];if(str){if(escaped)escaped=false;else if(x==='\\')escaped=true;else if(x==='"')str=false;continue}if(x==='"'){str=true;continue}if(x==='[')depth++;else if(x===']'&&--depth===0)return JSON.parse(source.slice(a,i+1))}
 throw Error('missing case fixture terminator');
}
const cases=casesFrom(base),catalog=buildStudyCatalog(cases);assert.equal(cases.length,13);assert(catalog.length>=72);assert.equal(REAL_MS_PER_GAME_HOUR,60000);
function range(a,b){const x=html.indexOf(a),y=html.indexOf(b,x+a.length);assert(x>=0&&y>x,'missing real game function '+a);return html.slice(x,y)}
const snippets=[range('const csStudyTiming=','function findIntervention(text){'),range('function processCommand(q){','function nurseNatural(q){'),range('function orderStudy(s,quiet=false','const MONITOR_THERAPY_CATALOG=')];
let clock=1000000,said=[],context;
context={
 performance:{now:()=>clock},sim:{orders:new Map(),events:[],gameMinute:0},__cases:cases,
 nurseSay:text=>said.push(String(text)),
 queueNurse(task){if(task.kind==='collect'){const o=context.sim.orders.get(task.study.id);o.status='pending';o.readyAt=clock+context.__functions.duration(task.study)}},
 complete(){},renderContent(){},findIntervention:()=>null
};
const bootstrap=[
 "function norm(s){return String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}",
 "const CASES=globalThis.__cases;let C=CASES[0];",
 "globalThis.setCase=id=>{C=CASES.find(x=>x.id===id);if(!C)throw Error('unknown '+id)};",
].join('\n');
vm.createContext(context);
vm.runInContext(bootstrap+'\n'+snippets.join('\n')+'\n'+[
 "globalThis.__functions={select:q=>findStudy(q),order:q=>processCommand(q),catalog:()=>csStudyCatalog(),duration:s=>csStudyDurationMs(s)}"
].join('\n'),context);
const rt=context.__functions;assert.equal(rt.catalog().length,catalog.length,'catalog must match shipped game');
let combinations=0,native=0,fallback=0,timeChecks=0,commands=0;
for(const patient of cases){
 context.setCase(patient.id);
 for(const study of catalog){
  const item=resolveStudyById(study.id,patient,catalog),expected=materializeStudy(item,patient);
  assert(expected?.result,'missing sourced result '+patient.id+'/'+study.id);
  expected.universalFallback?fallback++:native++;
  context.sim={orders:new Map(),events:[],gameMinute:0};const before=said.length;
  rt.order('/estudio '+study.id);commands++;
  const orders=[...context.sim.orders.values()];
  assert.equal(orders.length,1,'one order per exact study '+patient.id+'/'+study.id);
  const recorded=orders[0];
  assert.equal(recorded.id,study.id,'wrong study selected '+patient.id+'/'+study.id+' -> '+recorded.id);
  assert.equal(recorded.label,expected.label,'wrong nurse order label '+patient.id+'/'+study.id);
  assert.equal(recorded.result,expected.result,'case-specific result mismatch '+patient.id+'/'+study.id);
  assert.equal(recorded.status,'pending','order must be pending after collection');
  assert(Number.isFinite(recorded.readyAt),'study stuck without a valid due time: '+study.id);
  assert.equal(recorded.readyAt-clock,studyTurnaroundMinutes(item)*1000,'incorrect clock conversion');
  assert.equal(context.sim.events.length,1,'order missing from clinical event history');
  assert(context.sim.events[0].t.includes(expected.label),'wrong history label');
  assert(!said.slice(before).some(x=>/no reconozco|no está registrado/i.test(x)),'known study rejected by nurse');
  assert(clock<recorded.readyAt,'order completed before due time');
  clock=recorded.readyAt;recorded.status='done';
  assert.equal(recorded.status,'done','virtual finish failed');
  clock+=10;combinations++;timeChecks++;
 }
}
assert.equal(combinations,cases.length*catalog.length);
const anatomical=[
 ['tomografía de tórax','tc_torax'],['tomografía torácica','tc_torax'],['TC torax','tc_torax'],
 ['tomografía cerebral','tc_cerebral'],['resonancia cerebral','rm_cerebral'],
 ['radiografía de tórax','rx_torax'],['amilasa','amilasa'],['lipasa','lipasa']
];
let anatomy=0;for(const c of cases){context.setCase(c.id);for(const [q,id] of anatomical){
 const result=rt.select(q);assert.equal(result?.id,id,'anatomical modality mismatch '+c.id+'/'+q+' -> '+result?.id);anatomy++;
}}
context.setCase(cases[0].id);assert.equal(rt.select('banana cuántica'),null,'unknown study must not be invented');
console.log('ATRIA CLINICAL QA BOT PASS',JSON.stringify({cases:cases.length,studies:catalog.length,combinations,commands,native,fallback,timeChecks,anatomy,scope:'compiled orderStudy + processCommand + virtual nurse and clock'}));
