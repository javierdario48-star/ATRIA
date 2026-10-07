import fs from 'node:fs/promises';
const BASE='https://night-shift-clinical.vercel.app';
const out='out';
await fs.mkdir(out,{recursive:true});
const r=await fetch(BASE+'/',{headers:{'cache-control':'no-cache'}});
if(!r.ok)throw new Error('baseline '+r.status);
let html=await r.text();
if(!html.includes('4.8.6'))throw new Error('expected stable 4.8.6 baseline');
const scripts=[...new Set([...html.matchAll(/<script[^>]+src=["'](\/task\d+\.js[^"']*)["']/g)].map(m=>m[1]))];
for(const src of scripts){const u=new URL(src,BASE),q=await fetch(u);if(!q.ok)throw new Error('asset '+u.pathname);await fs.writeFile(out+'/'+u.pathname.split('/').pop(),await q.text())}
const runtime=`<script id="atria-runtime-architecture-v1">
(()=>{'use strict';
let acc=0,lastFrame=null,lastMaintenance=0,lastRender=0;
const mobile=()=>matchMedia('(pointer:coarse)').matches||innerWidth<820;
const fatal=(e)=>{console.error('[ATRIA runtime]',e);let x=document.getElementById('atriaFatal');if(!x){x=document.createElement('div');x.id='atriaFatal';x.style.cssText='position:fixed;inset:0;z-index:999999;background:#07181a;color:white;padding:24px;font:16px system-ui';document.body.appendChild(x)}x.textContent='ATRIA encontró un error de ejecución. Recargá esta versión QA.'};
addEventListener('error',e=>fatal(e.error||e.message));addEventListener('unhandledrejection',e=>fatal(e.reason));
const optimizedFrame=function(now){
 try{
  if(lastFrame==null)lastFrame=now;
  const elapsed=Math.max(0,Math.min(.25,(now-lastFrame)/1000));lastFrame=now;acc+=elapsed;const step=1/60;
  if(C&&!editorOpen){
   let n=0;
   while(acc+1e-9>=step&&n<5){
    acc-=step;n++;
    if(steerHold?.moved&&now-(steerHold.last||0)>120){steerHold.last=now;setPlayerTarget(steerHold.x,steerHold.y)}
    advanceActor(player,step);if(player.pathIndex>=player.path.length){player.target=null;player.moving=false}
    updateNurse(step);updateWardNurses(step);updateExpert(step);
    updateLiveVitals(step);
    const typing=document.activeElement?.id==='dieInput'||document.activeElement?.id==='monitorMedInput'||document.body.classList.contains('keyboardOpen');
    sim.gameMinute+=step*0.12*(typing?.25:1);
   }
   if(n===5&&acc>=step)acc%=step;
   if(now-lastMaintenance>=125){lastMaintenance=now;updateSimulation(0);mentorTick();qaBotTick(now)}
  }else acc=0;
  const budget=mobile()?30:15;if(now-lastRender>=budget){lastRender=now;draw()}
 }catch(e){fatal(e)}
 requestAnimationFrame(optimizedFrame);
};
updateFrame=optimizedFrame;
window.__ATRIA_ARCH={version:1,mode:'bounded-fixed-step',maxCatchUp:5,mobileRenderMs:30};
console.info('[ATRIA] architecture runtime active',window.__ATRIA_ARCH);
})();
</script>`;
html=html.replace('</body>',runtime+'</body>');
await fs.writeFile(out+'/index.html',html);
console.log('ATRIA architecture candidate built on stable 4.8.6');
