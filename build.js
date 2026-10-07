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
const frameRe=/function\s+updateFrame\s*\(now\)\s*\{[\s\S]{0,5000}?requestAnimationFrame\s*\(\s*updateFrame\s*\)\s*\}/g;
const candidates=[['index.html',html],...assets.entries()];
const hits=[];
for(const [name,body] of candidates){const ms=[...body.matchAll(frameRe)];for(const m of ms)hits.push({name,original:m[0]});}
if(hits.length!==1) throw new Error('updateFrame total match count '+hits.length+' across '+candidates.map(x=>x[0]).join(','));
const hit=hits[0];
const drawRe=/draw\s*\(\s*\)\s*;\s*requestAnimationFrame\s*\(\s*updateFrame\s*\)/;
if(!drawRe.test(hit.original)) throw new Error('draw/rAF sequence not found in '+hit.name);
const optimized=hit.original.replace(drawRe,"const __rn=performance.now(),__mobile=matchMedia('(pointer:coarse)').matches||innerWidth<820;if(!__mobile||__rn-(window.__atriaLastRender||0)>=30){window.__atriaLastRender=__rn;draw()}requestAnimationFrame(updateFrame)");
if(hit.name==='index.html')html=html.replace(hit.original,optimized);else assets.set(hit.name,assets.get(hit.name).replace(hit.original,optimized));
for(const [name,body] of assets)await fs.writeFile(out+'/'+name,body);
await fs.writeFile(out+'/index.html',html);
console.log('ATRIA guard performance preview patched:',hit.name,'tasks:',scripts.length);
