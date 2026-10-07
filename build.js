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

// Guard-only visual smoothing: preserve original transport/startup and interpolate remote actors locally.
const guardFrom="const actor={x:r.x||0,y:r.y||0,dir:r.dir||'S',moving:!!r.moving,walkPhase:r.walkPhase||0};drawSprite(im,actor,60);csDrawNameplate(actor,r.name||'Compañero',r.level||1,true)";
const guardTo="const tx=Number(r.x)||0,ty=Number(r.y)||0;if(!Number.isFinite(r.__vx))r.__vx=tx;if(!Number.isFinite(r.__vy))r.__vy=ty;const d=Math.hypot(tx-r.__vx,ty-r.__vy);if(d>260){r.__vx=tx;r.__vy=ty}else{const a=0.24;r.__vx+=(tx-r.__vx)*a;r.__vy+=(ty-r.__vy)*a}const actor={x:r.__vx,y:r.__vy,dir:r.dir||'S',moving:!!r.moving,walkPhase:r.walkPhase||0};drawSprite(im,actor,60);csDrawNameplate(actor,r.name||'Compañero',r.level||1,true)";
const guardCount=html.split(guardFrom).length-1;
if(guardCount!==1) throw new Error('guard draw target match count '+guardCount);
html=html.replace(guardFrom,guardTo);

await fs.writeFile(out+'/index.html',html);
console.log('ATRIA diagnostic mirror: untouched public 4.8.6; tasks copied:',scripts.length);
