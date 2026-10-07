import fs from'node:fs/promises';import crypto from'node:crypto';
const src=process.argv[2]||'golden-master-4.8.6',dst='vendor/atria-4.8.6';
await fs.rm(dst,{recursive:true,force:true});await fs.mkdir(dst,{recursive:true});
const names=(await fs.readdir(src)).filter(x=>x==='index.html'||/^task\d+\.js$/.test(x)).sort();
if(!names.includes('index.html'))throw new Error('missing 4.8.6 index.html');
const manifest={version:'4.8.6',files:{}};
for(const n of names){const b=await fs.readFile(src+'/'+n);if(n==='index.html'&&!b.toString().includes('4.8.6'))throw new Error('wrong baseline');await fs.writeFile(dst+'/'+n,b);manifest.files[n]={bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}}
await fs.writeFile(dst+'/MANIFEST.json',JSON.stringify(manifest,null,2)+'\n');console.log('imported',names.length,'golden-master files');
