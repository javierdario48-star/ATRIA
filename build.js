import fs from 'node:fs/promises';
const BASE='https://night-shift-clinical.vercel.app';
const out='out';
await fs.mkdir(out,{recursive:true});
const res=await fetch(BASE+'/',{headers:{'cache-control':'no-cache'}});
if(!res.ok) throw new Error('Baseline fetch '+res.status);
let html=await res.text();
if(!html.includes("version:'4.8.6'")&&!html.includes('4.8.6')) throw new Error('Expected public 4.8.6 baseline');
const scripts=[...new Set([...html.matchAll(/<script[^>]+src=["'](\/task\d+\.js[^"']*)["']/g)].map(m=>m[1]))];
for(const src of scripts){
 const u=new URL(src,BASE),r=await fetch(u,{headers:{'cache-control':'no-cache'}});
 if(!r.ok) throw new Error('Task fetch '+u.pathname+' '+r.status);
 let body=await r.text();
 if(/^\/task13\.js(?:\?|$)/.test(src)){
   body="console.info('ATRIA QA: task13 social voice disabled to isolate guard performance');";
 }
 await fs.writeFile(out+'/'+u.pathname.split('/').pop(),body);
}
await fs.writeFile(out+'/index.html',html);
console.log('ATRIA 4.8.6 guard performance isolation: task13 disabled; tasks:',scripts.length);
