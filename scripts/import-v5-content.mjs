// One-time migration utility. NOT imported by either V5 build or game runtime.
// Input is the effective, read-only browser capture of the verified 4.8.7 build.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const capturePath=process.argv[2];
if(!capturePath)throw Error('Usage: node scripts/import-v5-content.mjs <reference-snapshot.json>');
const captured=JSON.parse(await fs.readFile(capturePath,'utf8'));
if(captured.cases?.length!==13||captured.map?.grid?.rows!==53||captured.gridDifferences>0)
 throw Error('incomplete original content capture');
const root='src/v5/content';
await fs.mkdir(path.join(root,'assets'),{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const provenance={schema:1,referenceCommit:'64fedba8c8a0fb49fca58e210985740b09e26bed',
 source:'effective read-only 4.8.7 browser data; no historical runtime included',
 sources:{'vendor/atria-4.8.6/index.html':sha(await fs.readFile('vendor/atria-4.8.6/index.html')),
  'reference-generated-index.html':sha(await fs.readFile('out/index.html'))},
 dataSymbols:{'hospital.json':'MAP','cases.json':'CASES (effective corrected data)',
  'algorithms.json':'CASE_ALGORITHMS (effective corrected data)','exam-segments.json':'EXAM_SEGMENTS',
  'therapies.json':'MONITOR_THERAPY_CATALOG','default-doses.json':'DEFAULT_THERAPY_DOSES',
  'beds.json':'csBedRegistryV39','colors.json':'CS_COLOR_META'},files:{}};
async function write(name,value){
 const bytes=typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value,null,2)+'\n';
 await fs.writeFile(path.join(root,name),bytes);provenance.files[name]=sha(bytes);
}
for(const [name,key] of Object.entries({'hospital.json':'map','cases.json':'cases','algorithms.json':'algorithms',
 'exam-segments.json':'examSegments','therapies.json':'therapies','default-doses.json':'defaultDoses',
 'beds.json':'bedRegistry','colors.json':'colorMeta'})){
 if(!captured[key])throw Error('missing canonical data '+key);await write(name,captured[key]);
}
const assets={};
for(const [name,src] of Object.entries({...captured.assets,
 ...Object.fromEntries(Object.entries(captured.variants).map(([key,value])=>['player-'+key,value]))})){
 const format=/^data:image\/(webp|png);base64,/.exec(src)?.[1];
 if(!format)throw Error('unsupported original artwork '+name);
 const file='assets/'+name+'.'+format,bytes=Buffer.from(src.split(',')[1],'base64');
 await write(file,bytes);assets[name]={path:file,sha256:sha(bytes)};
}
await write('assets.json',assets);
await fs.writeFile(path.join(root,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
console.log('Canonical effective ATRIA content captured:',captured.cases.length,'cases,',Object.keys(assets).length,'original images. Build has no migration dependency.');
