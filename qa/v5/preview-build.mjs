import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';

// The interface can match while the deployed clinical authority is still old.
export async function waitForPreviewBuild(origin,{timeout=120000}={}){
 const files={};
 for(const path of ['src/v5/app/application.js','src/v5/ui/music-transport.js','src/v5/ui/hospital-audio.js','src/v5/web/game.css',
  'src/v5/clinical/guard-session.js','src/v5/clinical/acute-care.js','src/v5/clinical/cirr-care.js',
  'src/v5/clinical/clinical-policy-closure.js','src/v5/clinical/surgical-consultation.js',
  'src/v5/clinical/transfer-continuation.js','src/v5/clinical/diagnostic-assessment.js',
  'src/v5/clinical/consultation-evidence.js','src/v5/engine/nurse-dispatcher.js','src/v5/ui/clinical-controller.js'])
  files[path]=createHash('sha256').update(await fs.readFile(new URL('../../'+path,import.meta.url))).digest('hex');
 const deadline=Date.now()+timeout;
 while(true){
  try{
   const response=await fetch(origin+'/manifest.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(response.ok){const manifest=await response.json();if(Object.entries(files).every(([path,hash])=>manifest.files?.[path]===hash))return files;}
  }catch{/* Wait only for the checked-out build, never certify an older alias. */}
  assert(Date.now()<deadline,'the preview must serve the checked-out clinical authority, application, audio graph and CSS');
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
}
