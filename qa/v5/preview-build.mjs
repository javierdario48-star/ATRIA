import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';

// Application.js alone can be identical while CSS or the audio graph is old.
export async function waitForPreviewBuild(origin,{timeout=120000}={}){
 const files={};
 for(const path of ['src/v5/app/application.js','src/v5/ui/music-transport.js','src/v5/ui/hospital-audio.js','src/v5/web/game.css'])
  files[path]=createHash('sha256').update(await fs.readFile(new URL('../../'+path,import.meta.url))).digest('hex');
 const deadline=Date.now()+timeout;
 while(true){
  try{
   const response=await fetch(origin+'/manifest.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(response.ok){const manifest=await response.json();if(Object.entries(files).every(([path,hash])=>manifest.files?.[path]===hash))return files;}
  }catch{/* Wait only for the checked-out build, never certify an older alias. */}
  assert(Date.now()<deadline,'the preview must serve the checked-out application, audio graph and CSS');
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
}
