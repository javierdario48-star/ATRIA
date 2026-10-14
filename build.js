import fs from 'node:fs/promises';import{apply487}from'./src/integration/apply-487.js';
import {PHYSIOLOGY_QA_FILES_487} from './src/integration/physiology-qa-bootstrap-487.js';
const base='vendor/atria-4.8.6',out='out';
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const manifest=JSON.parse(await fs.readFile(base+'/MANIFEST.json','utf8'));if(manifest.version!=='4.8.6')throw new Error('expected local stable 4.8.6 golden master');
const files=Object.keys(manifest.files||{});if(!files.includes('index.html'))throw new Error('golden master index missing');
for(const name of files){if(name==='index.html'||!/^task\d+\.js$/.test(name))continue;await fs.copyFile(base+'/'+name,out+'/'+name)}
const source=await fs.readFile(base+'/index.html','utf8');if(!source.includes('4.8.6'))throw new Error('golden master marker missing');
// Opt-in UX comparison uses independent static assets; the clinical patch stays byte-identical.
const html=apply487(source);
const closing='</body>',point=html.lastIndexOf(closing);
if(point<0||html.indexOf(closing)!==point)throw new Error('UX lab: unique body closing tag not found');
const assets='<link rel="stylesheet" href="/atria-ux-lab.css"><script src="/atria-ux-lab.js"></script>';
const enhanced=html.slice(0,point)+assets+html.slice(point);
await fs.writeFile(out+'/index.html',enhanced);
for(const asset of ['atria-ux-lab.css','atria-ux-lab.js']) {
  await fs.copyFile('src/ui/'+asset,out+'/'+asset);
}
for(const name of PHYSIOLOGY_QA_FILES_487){
 const target=out+'/qa-physiology/'+name;
 await fs.mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});
 await fs.copyFile('src/'+name,target);
}
console.log('ATRIA 4.8.7 source-integrated build on local 4.8.6 golden master; files',files.length);
