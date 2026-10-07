import fs from 'node:fs/promises';
const base='vendor/atria-4.8.6',out='out';
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});
const manifest=JSON.parse(await fs.readFile(base+'/MANIFEST.json','utf8'));
if(manifest.version!=='4.8.6')throw new Error('expected local stable 4.8.6 golden master');
const files=Object.keys(manifest.files||{});
if(!files.includes('index.html'))throw new Error('golden master index missing');
for(const name of files){if(name!=='index.html'&&!/^task\d+\.js$/.test(name))continue;await fs.copyFile(base+'/'+name,out+'/'+name)}
const html=await fs.readFile(out+'/index.html','utf8');
if(!html.includes('4.8.6'))throw new Error('golden master marker missing');

const studyPatch=await fs.readFile('src/integration/pre-sleep-study-patch.js','utf8');
const task13=out+'/task13.js';
const task13Base=await fs.readFile(task13,'utf8');
if(task13Base.includes('__atriaUniversalStudyPatch487'))throw new Error('study patch already present in baseline');
await fs.writeFile(task13,task13Base+'\n'+studyPatch);

console.log('ATRIA pre-sleep recovery build: 4.8.6 baseline + isolated study patch; files',files.length);
