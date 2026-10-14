// Release-gate audit: report architectural coupling and reject dangerous order routes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {apply487} from '../src/integration/apply-487.js';
import {csNurseScan487} from '../src/clinical/nurse-scanner-487.js';
const walk=(root)=>fs.existsSync(root)?fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>{
 const p=path.join(root,e.name);return e.isDirectory()?walk(p):[p];}):[];
const original=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const html=apply487(original);
const scripts=[...html.matchAll(/<script\b[^>]*\bid=["']([^"']+)["'][^>]*>/g)].map(m=>m[1]);
const dup=scripts.filter((x,i)=>scripts.indexOf(x)!==i);
assert.deepEqual(dup,[],'no duplicate active script IDs');
const found=original.match(/^const CASES=(\[[^\n]+\]);?$/m);
assert(found,'native clinical catalogue is present');
const cases=JSON.parse(found[1]);
const therapeutics=[
 {id:'albumin',label:'Albúmina IV',aliases:['albumina','albumina iv','albúmina']},
 {id:'fluid',label:'Ringer',aliases:['ringer','suero']},
 {id:'ceftriaxone',label:'Ceftriaxona',aliases:['ceftriaxona']}
];
const scans=[];
for(const c of cases){
 const hem=c.studies.find(s=>/hemograma/i.test(s.label+' '+(s.aliases||[]).join(' ')));
 assert(hem,'missing hemogram in '+c.id);
 for(const utterance of ['Enfermera hemograma','Enfermera, solicito hemograma',
  'Enfermera hemograma y monitor','Enfermera hemograma y vías']){
  const parsed=csNurseScan487(utterance,c.studies,therapeutics,c.interventions);
  assert(parsed.active,'study request must be active');
  assert(parsed.items.some(x=>x.kind==='study'&&x.id===hem.id&&!x.negated),
    c.id+' hemogram missed in '+utterance);
  assert(!parsed.items.some(x=>x.kind==='therapy'&&!x.negated),
    c.id+' phantom therapy from '+utterance);
  scans.push({caseId:c.id,text:utterance,matched:parsed.items.map(x=>({id:x.id,kind:x.kind}))});
 }
}
const baselineFiles=walk('src'),tests=walk('qa');
const nurseSources=baselineFiles.filter(f=>/\.(?:m?js)$/.test(f)).map(f=>({
 file:f,source:fs.readFileSync(f,'utf8')})).filter(x=>/nurseNatural|orderStudy|addMonitorTherapy|sendMessage/.test(x.source));
const functions=['nurseNatural','orderStudy','addMonitorTherapy','sendMessage'];
const owners=Object.fromEntries(functions.map(name=>[name,nurseSources.map(x=>{
 const matches=[...x.source.matchAll(new RegExp('\\b'+name+'\\s*(?:=|\\()','g'))];
 return {file:x.file,mentions:matches.length};
}).filter(x=>x.mentions).sort((a,b)=>b.mentions-a.mentions)]));
const safety=fs.readFileSync('src/integration/nurse-voice-487.js','utf8');
assert(safety.includes("if(item.kind==='study')"),'typed native study dispatch guard required');
assert(safety.includes("orderStudy(study,false,'Enfermería')"),'study must reach its native owner');
const report={schema:'atria-code-review/v1',scope:'all src, QA and generated runtime',
 files:{source:baselineFiles.length,qa:tests.length,goldenBytes:Buffer.byteLength(original),
 generatedBytes:Buffer.byteLength(html)},scripts:scripts.length,duplicateScriptIds:dup,
 clinicalSeeds:cases.length,studyVsDrugScenarios:scans.length,routes:owners,
 observations:[
 'Layered nurseNatural and sendMessage wrappers are existing technical debt; do not replace all simultaneously.',
 'Laboratory orders dispatch to the native orderStudy owner; therapies must remain explicit.',
 'Browser QA verifies asynchronous medication effects separately from source-only scanning.',
 'Review every mutation through the existing immutable source gate and 2/3/4-client browser matrix.'
 ]};
fs.mkdirSync('qa/audit-results',{recursive:true});
fs.writeFileSync('qa/audit-results/critical-path.json',JSON.stringify(report,null,2)+'\n');
console.log('ATRIA_ARCHITECTURE_AUDIT_PASS',JSON.stringify({files:report.files,
 scripts:report.scripts,seeds:report.clinicalSeeds,studyVsDrug:scans.length,wrappers:owners.nurseNatural.length}));
