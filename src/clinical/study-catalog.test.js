import assert from'node:assert/strict';import fs from'node:fs';import{buildStudyCatalog,resolveStudy,resolveStudyById,materializeStudy,studyTurnaroundMinutes,STUDY_TAT_MINUTES}from'./study-registry.js';

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
  else{fallbacks++;assert.equal(r.universalFallback,true);assert.equal(r.result,st.normalResult);assert(r.result)}
  combos++;
 }
 for(const native of c.studies||[])for(const alias of [native.label,...(native.aliases||[])]){
  const r=resolveStudy(alias,c,catalog);assert(r,'native alias must resolve: '+alias);assert.equal(r.id,native.id,'native alias must preserve case override: '+c.id+' '+alias);aliases++;
 }
}
assert.equal(resolveStudy('banana cuántica',cases[0],catalog),null,'unknown names must not become invented studies');
assert.equal(combos,cases.length*catalog.length);
console.log('universal study matrix OK',{cases:cases.length,studies:catalog.length,combinations:combos,overrides,fallbacks,aliases});

assert.equal(catalog.length,51,'stable emergency catalog must contain all 51 studies');
assert.equal(Object.keys(STUDY_TAT_MINUTES).length,51,'each catalog study must have an explicit turnaround');
for(const st of catalog){assert.ok(Number.isFinite(STUDY_TAT_MINUTES[st.id]),'missing ED time '+st.id);assert.equal(st.gameHours*60,studyTurnaroundMinutes(st));}
assert.equal(studyTurnaroundMinutes(catalog.find(x=>x.id==='hemograma')),35);
assert.equal(studyTurnaroundMinutes(catalog.find(x=>x.id==='gasometria')),10);
assert.equal(studyTurnaroundMinutes(catalog.find(x=>x.id==='tc')),120);
console.log('emergency department 51-study turnaround matrix OK');
