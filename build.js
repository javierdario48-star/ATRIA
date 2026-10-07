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

// Guard performance patch: preserve 60Hz simulation; reduce mobile render/layout pressure.
{
 const domRe=/const act=document\.getElementById\('act'\),ctxEl=document\.getElementById\('context'\);act\.classList\.toggle\('ready',near!=='none'\);act\.textContent=near==='patient'\?'PACIENTE':near==='nurse'\?'ENFERMERA':'ACT';if\(near!=='none'\)\{ctxEl\.style\.display='block';ctxEl\.textContent=near==='patient'\?'Hablar \/ examinar \/ revisar historia':'Hablar \/ indicar tareas'\}else ctxEl\.style\.display='none'/g;
 const dm=[...html.matchAll(domRe)];
 if(dm.length===1) html=html.replace(domRe,"if(window.__atriaNearUI!==near){window.__atriaNearUI=near;const act=document.getElementById('act'),ctxEl=document.getElementById('context');act.classList.toggle('ready',near!=='none');act.textContent=near==='patient'?'PACIENTE':near==='nurse'?'ENFERMERA':'ACT';if(near!=='none'){ctxEl.style.display='block';ctxEl.textContent=near==='patient'?'Hablar / examinar / revisar historia':'Hablar / indicar tareas'}else ctxEl.style.display='none'}");
 else console.warn('near UI optimization skipped',dm.length);
 const renderRe=/draw\(\);requestAnimationFrame\(updateFrame\)/g;
 const rm=[...html.matchAll(renderRe)];
 if(rm.length!==1) throw new Error('render loop match count '+rm.length);
 html=html.replace(renderRe,"const __rn=performance.now();const __mobile=matchMedia('(pointer:coarse)').matches||innerWidth<820;if(!__mobile||__rn-(window.__atriaLastRender||0)>=30){window.__atriaLastRender=__rn;draw()}requestAnimationFrame(updateFrame)");
}

await fs.writeFile(out+'/index.html',html);
console.log('ATRIA diagnostic mirror: untouched public 4.8.6; tasks copied:',scripts.length);
