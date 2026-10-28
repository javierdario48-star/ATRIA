import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const hash=value=>createHash('sha256').update(value).digest('hex');
test('standalone V5 build boots from a canonical entry and is byte reproducible without vendor',()=>{
 assert(fs.existsSync('scripts/build-v5.mjs'),'standalone game builder is missing');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-v5-build-'));
 try{
  // Construct a clean checkout containing only declared new build inputs.
  for(const name of ['src','scripts','package.json'])fs.cpSync(name,path.join(dir,name),{recursive:true});
  const run=()=>execFileSync(process.execPath,['scripts/build-v5.mjs'],{cwd:dir,encoding:'utf8'});
  run();const root=path.join(dir,'out-v5');
  const first=fs.readFileSync(path.join(root,'manifest.json'),'utf8');
  const manifest=JSON.parse(first),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.equal(manifest.sourceMode,'canonical-esm-game');
  assert.match(html,/<script type="module" src="\.\/src\/v5\/app\/main\.js"[^>]*><\/script>/);
  assert.match(html,/<canvas id="game"/);assert.match(html,/id="dieInput"/);
  assert(!/task\d+\.js|apply-487|vendor\//.test(html));
  for(const [name,expected] of Object.entries(manifest.files)){
   const bytes=fs.readFileSync(path.join(root,name));assert.equal(hash(bytes),expected,name);
   assert(!/integration\/|vendor\/|\.test\.js$/.test(name),'historical executable leaked into '+name);
   if(name.endsWith('.js')){
    const code=bytes.toString();assert(!/apply487\(|replaceOnce\(|eval\(|new Function\(|document\.write\(/.test(code),name);
    const syntax=spawnSync(process.execPath,['--check',path.join(root,name)],{encoding:'utf8'});
    assert.equal(syntax.status,0,syntax.stderr);
   }
  }
  run();assert.equal(fs.readFileSync(path.join(root,'manifest.json'),'utf8'),first);
  execFileSync(process.execPath,['scripts/build-v5-core.mjs'],{cwd:dir,encoding:'utf8'});
  const core=JSON.parse(fs.readFileSync(path.join(dir,'out-v5-core/manifest.json'),'utf8'));
  assert(core.files['src/v5/clinical/exam-contract.js'],'core must include the lightweight command contract');
  assert(core.files['src/v5/content/clinical-treatment-definitions.js'],'core must include native medication definitions');
  assert(core.files['src/v5/clinical/native-medication-eligibility.js'],'core must include medication evidence preflight');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
