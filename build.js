import fs from 'node:fs/promises';
const BASE='https://night-shift-clinical.vercel.app',out='out';
await fs.mkdir(out,{recursive:true});
const r=await fetch(BASE+'/',{headers:{'cache-control':'no-cache'}});
if(!r.ok)throw new Error('baseline '+r.status);
const html=await r.text();
if(!html.includes('4.8.6'))throw new Error('expected stable 4.8.6 baseline');
const scripts=[...new Set([...html.matchAll(/<script[^>]+src=["'](\/task\d+\.js[^"']*)["']/g)].map(m=>m[1]))];
for(const src of scripts){const u=new URL(src,BASE),q=await fetch(u,{headers:{'cache-control':'no-cache'}});if(!q.ok)throw new Error('asset '+u.pathname);await fs.writeFile(out+'/'+u.pathname.split('/').pop(),await q.text())}
await fs.writeFile(out+'/index.html',html);
console.log('ATRIA CLEAN CONTROL: byte-faithful 4.8.6 mirror; no runtime overrides; tasks',scripts.length);
