import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const files=[
 'src/v5/index.js',
 'src/v5/core/speech-router.js',
 'src/v5/clinical/exam-contract.js',
 'src/v5/clinical/nursing-access-plan.js',
 'src/v5/clinical/native-medications.js',
 'src/v5/clinical/iv-dose-contracts-487.js',
 'src/v5/clinical/morphine-487.js',
 'src/v5/core/room-authority.js',
 'src/v5/core/replica.js',
 'src/v5/adapters/native-clinical-port.js',
 'src/clinical/nurse-scanner-487.js',
 'src/clinical/urgent-care-487.js',
 'src/clinical/pharmacology-registry-487.js',
 'src/social/room-state.js',
 'src/app/frame-scheduler.js'
];
const output='out-v5-core';
await fs.rm(output,{recursive:true,force:true});
const manifest={version:'5.0-core-experimental',sourceMode:'esm-no-html-patches',files:{}};
for(const file of files){
 const content=await fs.readFile(file);
 const dest=path.join(output,file);
 await fs.mkdir(path.dirname(dest),{recursive:true});
 await fs.writeFile(dest,content);
 manifest.files[file]=crypto.createHash('sha256').update(content).digest('hex');
}
const api=await import(pathToFileURL(path.resolve(output,'src/v5/index.js')).href);
for(const name of ['createRoomAuthority','routeWardSpeech','createRoomReplica','createNativeClinicalPort','roomReducer','FrameScheduler']){
 if(typeof api[name]!=='function')throw Error('incomplete V5 public API: '+name);
}
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('ATRIA 5 standalone ESM core built; validated modules:',files.length);
