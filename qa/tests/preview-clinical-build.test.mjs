import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildV5} from '../../scripts/build-v5.mjs';
import {waitForPreviewBuild} from '../v5/preview-build.mjs';

test('live acceptance refuses an old clinical authority even when its interface matches',async t=>{
 const output=await fs.mkdtemp(join(tmpdir(),'atria-preview-clinical-'));
 try{
  const current=await buildV5(output),stale=structuredClone(current);
  assert(current.files['src/v5/clinical/guard-session.js']);
  stale.files['src/v5/clinical/guard-session.js']='old-clinical-authority';
  let served=stale;
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>served}));
  await assert.rejects(waitForPreviewBuild('https://preview.invalid',{timeout:0}),/preview must serve/);
  served=current;
  const verified=await waitForPreviewBuild('https://preview.invalid',{timeout:0});
  assert.equal(verified['src/v5/clinical/guard-session.js'],current.files['src/v5/clinical/guard-session.js']);
 }finally{await fs.rm(output,{recursive:true,force:true});}
});
