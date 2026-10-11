/** Confirms B1 cannot alter the active HTML artifact or golden-master scripts. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const html=fs.readFileSync('out/index.html','utf8');
const hash=createHash('sha256').update(html).digest('hex');
assert.equal(hash,'dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7','B1 active HTML must remain identical');
assert(!html.includes('physiology-pilot-487')&&!html.includes('physiology-shadow-487'),'no B1 runtime hook');
assert(/4\.8\.6/.test(html)&&/Estudios solicitados/i.test(html),'existing QA output contract');
for(const name of ['task7.js','task8.js','task12.js','task13.js'])assert(!new RegExp('<script[^>]+src=["\'][^"\']*'+name.replace('.','\\.'),'i').test(html));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-b1-inline-'));
let inline=0,external=0;
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
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('B1 UNCHANGED ARTIFACT PASS',JSON.stringify({sha256:hash,inline,external,runtimeHooks:0}));
