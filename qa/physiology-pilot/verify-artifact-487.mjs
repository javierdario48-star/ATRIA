/** Verify the sole authorised lazy QA entry; all pre-existing HTML and golden
 * scripts retain the exact approved B1 bytes. Verify offline module closure. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {applyPhysiologyQABootstrap487,PHYSIOLOGY_QA_FILES_487} from '../../src/integration/physiology-qa-bootstrap-487.js';
import {applyCriticalRescue487,CRITICAL_FINAL_OLD_487,CRITICAL_FINAL_NEW_487,CRITICAL_CLOCK_OLD_487,CRITICAL_CLOCK_NEW_487} from '../../src/integration/critical-rescue-487.js';
const html=fs.readFileSync('out/index.html','utf8');
const hash=createHash('sha256').update(html).digest('hex');
const entries=[...html.matchAll(/<script id="atria-physiology-qa-487">[\s\S]*?<\/script>/g)];
assert.equal(entries.length,1,'exactly one explicit OFF-by-default observer entry');
const expectedEntry=applyPhysiologyQABootstrap487('<body></body>').replace('<body>','').replace('</body>','');
assert.equal(entries[0][0],expectedEntry,'QA bootstrap bytes match tested source');
// Reverse exactly the authorised critical-predicate repair and replacement
// script before checking the old protected hash. All unrelated bytes stay fixed.
const criticalMarker='<script id="atria-critical-rescue-487">';
const criticalScripts=[...html.matchAll(/<script id="atria-critical-rescue-487">[\s\S]*?<\/script>/g)];
assert.equal(criticalScripts.length,1);
assert.equal(criticalScripts[0][0],applyCriticalRescue487('<body></body>').replace('<body>','').replace('</body>',''));
const oldCritical=fs.readFileSync(new URL('./critical-rescue-pre-repair-487.txt',import.meta.url),'utf8');
assert(oldCritical.startsWith(criticalMarker)&&oldCritical.endsWith('</script>'),'frozen prior critical adapter');
assert.equal(createHash('sha256').update(oldCritical).digest('hex'),'b622fb06c590a0f2d1813dcc2914a7a0e03fa1975ba418a7b0e3a37e1e4a478e');
assert.equal(html.split(CRITICAL_FINAL_NEW_487).length,2,'one final repair');
assert.equal(html.split(CRITICAL_CLOCK_NEW_487).length,2,'one native per-patient clock hook');
const restored=html.replace(entries[0][0],'').replace(criticalScripts[0][0],oldCritical)
 .replace(CRITICAL_FINAL_NEW_487,CRITICAL_FINAL_OLD_487).replace(CRITICAL_CLOCK_NEW_487,CRITICAL_CLOCK_OLD_487);
const originalHash=createHash('sha256').update(restored).digest('hex');
assert.equal(originalHash,'dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7','all prior HTML bytes remain identical after removing sole QA entry');
assert(!html.includes('physiology-pilot-487')&&!html.includes('physiology-shadow-487'),'no eager B1 import or effect writer');
assert(/4\.8\.6/.test(html)&&/Estudios solicitados/i.test(html),'existing QA output contract');
for(const name of ['task7.js','task8.js','task12.js','task13.js'])assert(!new RegExp('<script[^>]+src=["\'][^"\']*'+name.replace('.','\\.'),'i').test(html));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-b1-inline-'));
let inline=0,external=0,moduleBytes=0;
try{
 for(const [i,match]of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()){
  if(!match[1].trim())continue;
  const file=path.join(dir,'inline-'+i+'.js');fs.writeFileSync(file,match[1]);
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);inline++;
 }
 const expected=fs.readdirSync('vendor/atria-4.8.6').filter(n=>/^task\d+\.js$/.test(n)).sort();
 assert.deepEqual(fs.readdirSync('out').filter(n=>/^task\d+\.js$/.test(n)).sort(),expected,'complete golden-master task inventory');
 for(const name of expected){
  assert.equal(Buffer.compare(fs.readFileSync('out/'+name),fs.readFileSync('vendor/atria-4.8.6/'+name)),0,'golden master copy '+name);
  const r=spawnSync(process.execPath,['--check','out/'+name],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);external++;
 }
 const root=path.resolve('out/qa-physiology'),moduleFiles=fs.readdirSync(root,{recursive:true}).filter(n=>n.endsWith('.js')).sort();
 assert.deepEqual(moduleFiles,PHYSIOLOGY_QA_FILES_487.slice().sort(),'explicit complete module inventory');
 for(const name of moduleFiles){
  const target=path.join(root,name),code=fs.readFileSync(target,'utf8');
  assert.equal(Buffer.compare(fs.readFileSync(target),fs.readFileSync('src/'+name)),0,'QA module source copy '+name);
  moduleBytes+=Buffer.byteLength(code);
  for(const match of code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)){
   const dependency=path.resolve(path.dirname(target),match[1]);
   assert(match[1].startsWith('.')&&dependency.startsWith(root+'/')&&fs.existsSync(dependency),'offline local import '+name+': '+match[1]);
  }
  const r=spawnSync(process.execPath,['--check',target],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('B1 PROTECTED / LAZY QA ARTIFACT PASS',JSON.stringify({sha256:hash,protectedHtmlSha256:originalHash,
 inline,external,modules:PHYSIOLOGY_QA_FILES_487.length,moduleBytes,defaultEnabled:false,liveWriters:0}));
