import assert from'node:assert/strict';import fs from'node:fs';
import {CASE_STUDY_CORRELATIONS,CASE_INCIDENTAL_FINDINGS,csCaseStudyFallback} from './contextual-study-results.js';import{buildStudyCatalog,resolveStudy,resolveStudyById,materializeStudy,studyTurnaroundMinutes,STUDY_TAT_MINUTES}from'./study-registry.js';

function extractCases(html){
 const mark='const CASES=',start=html.indexOf(mark);assert(start>=0);
 const a=html.indexOf('[',start);let depth=0,str=false,esc=false;
 for(let i=a;i<html.length;i++){const ch=html[i];if(str){if(esc)esc=false;else if(ch==='\\')esc=true;else if(ch==='"')str=false;continue}if(ch==='"'){str=true;continue}if(ch==='[')depth++;else if(ch===']'&&--depth===0)return JSON.parse(html.slice(a,i+1))}
 throw new Error('CASES array not closed');
}
const html=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'),cases=extractCases(html),catalog=buildStudyCatalog(cases);
assert(cases.length>0&&catalog.length>0);
assert(catalog.every(x=>x.normalResult&&x.gameHours>0),'every catalog study requires a normal result and turnaround');
let overrides=0,fallbacks=0,combos=0,aliases=0;
for(const c of cases){
 for(const st of catalog){
  const raw=resolveStudyById(st.id,c,catalog),r=materializeStudy(raw,c);assert(r,'valid catalog study must always resolve');
  const native=(c.studies||[]).find(x=>x.id===st.id);
  if(native){overrides++;assert.equal(r.universalFallback,false);assert.equal(r.result,native.result,'case override must beat normal fallback')}
  else{fallbacks++;assert.equal(r.universalFallback,true);assert.equal(r.result,csCaseStudyFallback(st,c)||st.normalResult);assert(r.result)}
  combos++;
 }
 for(const native of c.studies||[])for(const alias of [native.label,...(native.aliases||[])]){
  const r=resolveStudy(alias,c,catalog);assert(r,'native alias must resolve: '+alias);if(r.id!==native.id){assert(/^(rx torax|rx tórax|radiografia|radiografía)$/i.test(alias),'native alias mismatch: '+c.id+' '+alias+' => '+r.id)}aliases++;
 }
}
assert.equal(resolveStudy('banana cuántica',cases[0],catalog),null,'unknown names must not become invented studies');
assert.equal(combos,cases.length*catalog.length);
console.log('universal study matrix OK',{cases:cases.length,studies:catalog.length,combinations:combos,overrides,fallbacks,aliases});

assert.equal(catalog.length,73,'original 51 + independently named requested studies');
assert.equal(Object.keys(STUDY_TAT_MINUTES).length,73,'each catalog study must have an explicit turnaround');
for(const st of catalog){assert.ok(Number.isFinite(STUDY_TAT_MINUTES[st.id]),'missing ED time '+st.id);assert.equal(st.gameHours*60,studyTurnaroundMinutes(st));}
assert.equal(studyTurnaroundMinutes(catalog.find(x=>x.id==='hemograma')),35);
assert.equal(studyTurnaroundMinutes(catalog.find(x=>x.id==='gasometria')),10);
assert.equal(studyTurnaroundMinutes(catalog.find(x=>x.id==='tc')),120);
console.log('emergency department 52-study turnaround matrix OK');

let correlated=0,incidental=0,normal=0;
for(const c of cases){
 for(const [requested,sourceId] of Object.entries(CASE_STUDY_CORRELATIONS[c.id]||{})){
  assert(!c.studies.some(s=>s.id===requested),'cannot supersede native test '+c.id+'/'+requested);
  const source=c.studies.find(s=>s.id===sourceId);assert(source,'native source required '+c.id+'/'+sourceId);
  const out=materializeStudy(catalog.find(s=>s.id===requested),c);
  assert.equal(out.universalFallback,true);assert(out.result.includes(source.result),'mapped result must preserve native case evidence');correlated++;
 }
 for(const [requested,wording] of Object.entries(CASE_INCIDENTAL_FINDINGS[c.id]||{})){
  assert(!c.studies.some(s=>s.id===requested));
  assert.equal(materializeStudy(catalog.find(s=>s.id===requested),c).result,wording);incidental++;
 }
 for(const st of catalog){
  if(c.studies.some(s=>s.id===st.id)||CASE_STUDY_CORRELATIONS[c.id]?.[st.id]||CASE_INCIDENTAL_FINDINGS[c.id]?.[st.id])continue;
  assert.equal(materializeStudy(st,c).result,st.normalResult);normal++;
 }
}
assert.equal(correlated,Object.values(CASE_STUDY_CORRELATIONS).reduce((n,map)=>n+Object.keys(map).length,0));
assert.equal(incidental,2);
assert.match(materializeStudy(catalog.find(s=>s.id==='hemograma'),cases.find(c=>c.id==='COLON-001')).result,/Anemia microcítica/);
assert.match(materializeStudy(catalog.find(s=>s.id==='hemograma'),cases.find(c=>c.id==='CROHN-001')).result,/Anemia/);
assert.match(materializeStudy(catalog.find(s=>s.id==='lipasa'),cases.find(c=>c.id==='CHOLE-001')).result,/menor de 3 veces/);
console.log('13 x 52 clinically consistent fallback matrix OK',{correlated,incidental,normal});

assert.equal(resolveStudy('amilasa',cases.find(c=>c.id==='APP-001'),catalog)?.id,'amilasa');
assert.equal(resolveStudy('amilasemia',cases.find(c=>c.id==='PANC-001'),catalog)?.id,'amilasa');
assert.match(materializeStudy(catalog.find(s=>s.id==='amilasa'),cases.find(c=>c.id==='PANC-001')).result,/elevada/);
assert.match(materializeStudy(catalog.find(s=>s.id==='amilasa'),cases.find(c=>c.id==='APP-001')).result,/límites de referencia/);
assert.equal(studyTurnaroundMinutes(catalog.find(s=>s.id==='amilasa')),60);
console.log('amilasa: case-aware result, alias and game-time contract OK');

const neuroCase=cases.find(c=>c.id==='APP-001');
for(const [request,id] of [['tomografía cerebral','tc_cerebral'],['tomografia de craneo','tc_cerebral'],['tac cerebral','tc_cerebral'],['resonancia cerebral','rm_cerebral'],['resonancia magnetica cerebral','rm_cerebral']]){
 const st=resolveStudy(request,neuroCase,catalog);
 assert.equal(st?.id,id,'must not silently substitute abdominal imaging: '+request);
 assert.equal(materializeStudy(st,neuroCase)?.universalFallback,true);
}
assert.equal(resolveStudy('tomografia abdominal',neuroCase,catalog)?.id,'app_ct','abdominal native alias retains priority');
for(const st of catalog)assert.ok(st.normalResult,'every named study must have an authored fallback '+st.id);
console.log('brain anatomy disambiguation and extended lab study catalog OK');

for(const [phrase,id] of [['tomografía de tórax','tc_torax'],['tomografia toracica','tc_torax'],['TC torax','tc_torax'],['tomografia cerebral','tc_cerebral'],['resonancia cerebral','rm_cerebral']])for(const c of cases){const found=resolveStudy(phrase,c,catalog);if(id==='tc_torax')assert.notEqual(found?.id,'tc','thoracic order cannot become abdominal CT')} 

for(const q of ['tomografia toracica','tomografía de tórax','TC torax','escaner de pecho'])for(const c of cases)assert.equal(resolveStudy(q,c,catalog)?.id,'tc_torax','Thoracic CT cannot be inferred abdominal: '+c.id+'/'+q);
