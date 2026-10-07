import fs from 'node:fs/promises';
const BASE='https://night-shift-clinical.vercel.app';
const out='out';
await fs.mkdir(out,{recursive:true});
const res=await fetch(BASE+'/',{headers:{'cache-control':'no-cache'}});
if(!res.ok) throw new Error('Baseline fetch '+res.status);
const html=await res.text();
if(!html.includes("version:'4.8.6'")&&!html.includes('4.8.6')) throw new Error('Expected public 4.8.6 baseline');
const scripts=[...html.matchAll(/<script[^>]+src=["'](\/task\d+\.js[^"']*)["']/g)].map(m=>m[1]);
for(const src of [...new Set(scripts)]){
 const u=new URL(src,BASE);
 const r=await fetch(u,{headers:{'cache-control':'no-cache'}});
 if(!r.ok) throw new Error('Task fetch '+u.pathname+' '+r.status);
 await fs.writeFile(out+'/'+u.pathname.split('/').pop(),await r.text());
}

// Performance fix limited to clinical non-physics maintenance.
const simFrom="updateOrders();updateHud()";
const simTo="const __uiNow=performance.now();if(__uiNow-(sim.lastOrderUiUpdate||0)>125){sim.lastOrderUiUpdate=__uiNow;updateOrders()}if(__uiNow-(sim.lastHudUpdate||0)>250){sim.lastHudUpdate=__uiNow;updateHud()}";
const simCount=html.split(simFrom).length-1;
if(simCount!==1) throw new Error('clinical maintenance target match count '+simCount);
html=html.replace(simFrom,simTo);

await fs.writeFile(out+'/index.html',html);
console.log('ATRIA diagnostic mirror: untouched public 4.8.6; tasks copied:',scripts.length);
