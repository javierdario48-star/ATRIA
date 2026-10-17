import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const allowedReuse=new Set(['src/app/frame-scheduler.js','src/app/lifecycle.js','src/social/room-state.js',
 'src/social/remote-motion.js','src/clinical/nurse-scanner-487.js','src/clinical/study-registry.js',
 'src/clinical/contextual-study-results.js','src/clinical/anamnesis-intents.js','src/clinical/clinical-clock-487.js',
 'src/clinical/case-completion-487.js',
 // Read-only, verified V4 pharmacology evaluators. Never import V4 HTML patchers.
 'src/clinical/pharmacology-registry-487.js','src/clinical/pharmacology-outcomes-487.js',
 // Effective V4 pure allergy/bleeding rules. Never the integration wrappers.
 'src/clinical/general-therapy-487.js','src/clinical/urgent-care-487.js',
 // Pure V4.8.7 mortality gates, previously verified independently. Not wrappers.
 'src/clinical/grace-survival-487.js','src/clinical/critical-rescue-487.js']);
export async function buildV5(output='out-v5'){
 const files=new Map(),queue=['src/v5/app/main.js','src/v5/index.js'];
 while(queue.length){
  const file=queue.shift();if(files.has(file))continue;
  if(!file.startsWith('src/v5/')&&!allowedReuse.has(file))throw Error('undeclared V5 dependency: '+file);
  const bytes=await fs.readFile(file),code=bytes.toString();
  if(/apply487\(|replaceOnce\(|document\.write\(|eval\(|new Function\(/.test(code))throw Error('historical code generation in '+file);
  files.set(file,bytes);
  for(const match of code.matchAll(/(?:\bimport\s+(?:[^;]*?\s+from\s+)?|\bexport\s+[^;]*?\s+from\s+|\bimport\(\s*)["']([^"']+)["']/g)){
   if(!match[1].startsWith('.'))throw Error('external dependency not declared: '+match[1]);
   queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1])));
  }
 }
 async function addDirectory(dir){
  for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   const file=path.posix.join(dir,entry.name);
   if(entry.isDirectory())await addDirectory(file);
   else if(!entry.name.endsWith('.test.js')&&!entry.name.endsWith('.js'))files.set(file,await fs.readFile(file));
  }
 }
 await addDirectory('src/v5/content');
 files.set('index.html',await fs.readFile('src/v5/web/index.html'));
 files.set('src/v5/web/game.css',await fs.readFile('src/v5/web/game.css'));
 await fs.rm(output,{recursive:true,force:true});
 const manifest={version:'5.0-cirr-experimental',sourceMode:'canonical-esm-game',
  entry:'src/v5/app/main.js',reusedPureModules:[...allowedReuse].filter(x=>files.has(x)).sort(),files:{}};
 for(const [file,bytes] of [...files.entries()].sort(([a],[b])=>a.localeCompare(b))){
  const destination=path.join(output,file);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,bytes);
  manifest.files[file]=createHash('sha256').update(bytes).digest('hex');
 }
 await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('ATRIA 5 independent game built:',files.size,'files; no historical HTML or integration generators.');
 return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildV5();
