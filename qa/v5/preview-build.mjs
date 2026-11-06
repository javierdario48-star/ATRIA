import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';

// The interface can match while the deployed clinical authority is still old.
export async function waitForPreviewBuild(origin,{timeout=120000}={}){
 const files={};
 for(const path of ['src/v5/app/application.js','src/v5/ui/music-transport.js','src/v5/ui/hospital-audio.js','src/v5/web/game.css',
  'src/v5/ui/clinical-hint-presenter.js','src/v5/clinical/clinical-hints.js','src/v5/clinical/clinical-hint-ledger.js',
  'src/v5/clinical/clinical-hint-requirements.js','src/v5/ui/clinical-workflow.js','src/v5/clinical/study-evidence.js',
  'src/v5/clinical/patient-dialogue.js','src/v5/clinical/patient-question-context.js','src/v5/content/patient-language.js',
  'src/v5/ui/case-debrief.js','src/v5/clinical/studies.js','src/v5/clinical/study-order-vocabulary.js',
  'src/v5/clinical/guard-session.js','src/v5/clinical/acute-care.js','src/v5/clinical/cirr-care.js',
  'src/v5/clinical/clinical-policy-closure.js','src/v5/clinical/surgical-consultation.js',
  'src/v5/clinical/transfer-continuation.js','src/v5/clinical/diagnostic-assessment.js',
  'src/v5/clinical/consultation-evidence.js','src/v5/engine/nurse-dispatcher.js','src/v5/ui/clinical-controller.js',
  'src/v5/clinical/observations.js','src/v5/core/speech-router.js','src/v5/ui/guard-chat-view.js',
  'src/v5/ui/chat-transcript.js','src/v5/social/durable-cooperative-replica.js',
  'src/v5/social/cooperative-link.js','src/v5/ui/guard-communication-view.js','src/v5/ui/guard-speech-memory.js',
  'src/v5/clinical/guard-runtime.js','src/v5/clinical/guard-turn-control.js','src/v5/clinical/guard-communication.js',
  'src/v5/clinical/native-medications.js','src/v5/clinical/survival-487-bridge.js','src/v5/clinical/study-collections.js',
  'src/v5/clinical/native-app.js','src/v5/clinical/native-peritonitis.js'])
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
