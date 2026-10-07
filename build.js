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

// Diagnostic only: report exact common clinical-loop signatures from current public 4.8.6.
const diagNeedles=["updateOrders();updateHud()","updateHud();if(floatMode","updateSimulation(step);mentorTick();qaBotTick(now)","updateSimulation(step);mentorTick()"];
const diag={};
for(const needle of diagNeedles){const i=html.indexOf(needle);diag[needle]={count:html.split(needle).length-1,context:i>=0?html.slice(Math.max(0,i-500),i+needle.length+700):null};}
await fs.writeFile(out+'/diag.json',JSON.stringify(diag,null,2));

await fs.writeFile(out+'/index.html',html);
console.log('ATRIA diagnostic mirror: untouched public 4.8.6; tasks copied:',scripts.length);
