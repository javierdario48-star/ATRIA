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

// Mobile guard rendering: simulation remains 60 Hz; canvas presentation capped near 33 FPS.
{
 const frameRe=/function\s+updateFrame\s*\(now\)\s*\{[\s\S]{0,4000}?requestAnimationFrame\s*\(\s*updateFrame\s*\)\s*\}/g;
 const fm=[...html.matchAll(frameRe)];
 if(fm.length!==1) throw new Error('updateFrame function match count '+fm.length);
 const original=fm[0][0];
 const drawRe=/draw\s*\(\s*\)\s*;\s*requestAnimationFrame\s*\(\s*updateFrame\s*\)/;
 if(!drawRe.test(original)) throw new Error('draw/rAF sequence not found inside updateFrame');
 const optimized=original.replace(drawRe,"const __rn=performance.now(),__mobile=matchMedia('(pointer:coarse)').matches||innerWidth<820;if(!__mobile||__rn-(window.__atriaLastRender||0)>=30){window.__atriaLastRender=__rn;draw()}requestAnimationFrame(updateFrame)");
 html=html.replace(original,optimized);
}

await fs.writeFile(out+'/index.html',html);
console.log('ATRIA diagnostic mirror: untouched public 4.8.6; tasks copied:',scripts.length);
