import fs from 'node:fs/promises';
const BASE='https://night-shift-clinical.vercel.app';
const out='out';
await fs.mkdir(out,{recursive:true});
const res=await fetch(BASE+'/',{headers:{'cache-control':'no-cache'}});
if(!res.ok) throw new Error('Baseline fetch '+res.status);
let html=await res.text();
if(!html.includes("version:'4.8.6'")&&!html.includes('4.8.6')) throw new Error('Expected public 4.8.6 baseline');
const scripts=[...new Set([...html.matchAll(/<script[^>]+src=["'](\\/[^"']+\\.js(?:\\?[^"']*)?)["']/g)].map(m=>m[1]))];
const assets=new Map();
for(const src of scripts){
 const u=new URL(src,BASE),r=await fetch(u,{headers:{'cache-control':'no-cache'});
 if(!r.ok) throw new Error('Task fetch '+u.pathname+' '+r.status);
 assets.set(u.pathname.split('/').pop(),await r.text());
}
const dprRe=/\bdpr\s*=\s*Math\.min\s*\(\s*devicePixelRatio\s*\|\|\s*1\s*,\s*2\s*\)/g;
const candidates=[['index.html',html],...assets.entries()];
let dprHits=0;
for(const [name,body] of candidates){
 const n=[...body.matchAll(dprRe)].length;
 if(!n)continue;
 dprHits+=n;
 const patched=body.replace(dprRe,"dpr=Math.min(devicePixelRatio||1,(matchMedia('(pointer:coarse)').matches?1.25:2))");
 if(name==='index.html')html=patched;else assets.set(name,patched);
}
if(dprHits!==1) throw new Error('main canvas DPR match count '+dprHits);
for(const [name,body] of assets)await fs.writeFile(out+'/'+name,body);
await fs.writeFile(out+'/index.html',html);
console.log('ATRIA mobile canvas DPR optimized; matches:',dprHits,'scripts:',scripts.length);
