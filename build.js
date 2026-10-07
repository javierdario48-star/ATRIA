import fs from 'node:fs/promises';import{apply487}from'./src/integration/apply-487.js';
const base='vendor/atria-4.8.6',out='out';
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const manifest=JSON.parse(await fs.readFile(base+'/MANIFEST.json','utf8'));if(manifest.version!=='4.8.6')throw new Error('expected local stable 4.8.6 golden master');
const files=Object.keys(manifest.files||{});if(!files.includes('index.html'))throw new Error('golden master index missing');
// task8/task12 were legacy DOM-repair fallbacks for rejected studies. 4.8.7 resolves
// universal studies at source level, so keeping their body-wide MutationObservers and
// 180/700 ms scans would only add guard-mode jank.
const retiredHotLoops=new Set(['task8.js','task12.js']);
for(const name of files){
 if(name==='index.html'||!/^task\\d+\\.js$/.test(name))continue;
 if(retiredHotLoops.has(name)){
   const marker='__ATRIA_RETIRED_'+name.replace(/\\W/g,'_').toUpperCase()+'__';
   await fs.writeFile(out+'/'+name,"(()=>{'use strict';window."+marker+"=true;})();\\n");
   continue;
 }
 await fs.copyFile(base+'/'+name,out+'/'+name)
}
const source=await fs.readFile(base+'/index.html','utf8');if(!source.includes('4.8.6'))throw new Error('golden master marker missing');
const html=apply487(source);await fs.writeFile(out+'/index.html',html);
console.log('ATRIA 4.8.7 source-integrated build on local 4.8.6 golden master; files',files.length,'retired hot loops',Array.from(retiredHotLoops).join(','));
