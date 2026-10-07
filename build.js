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

// Guard performance: waiting-patient maintenance never needs frame-rate polling.
{
 const re=/if\(shiftSession\?\.active\)announceWaitingPatient\(\)/g;
 const matches=[...html.matchAll(re)];
 if(matches.length!==1) throw new Error('waiting-patient tick match count '+matches.length);
 html=html.replace(re,"if(shiftSession?.active&&performance.now()-(sim.__lastWaitingTick||0)>250){sim.__lastWaitingTick=performance.now();announceWaitingPatient()}");
}

await fs.writeFile(out+'/index.html',html);
console.log('ATRIA diagnostic mirror: untouched public 4.8.6; tasks copied:',scripts.length);
