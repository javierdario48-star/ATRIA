(()=>{
'use strict';
function install(){
 if(globalThis.__atriaRemotePerformancePatch487)return;
 if(typeof csStartPeerSync!=='function'||typeof csSendPeerState!=='function'||typeof csDrawRemote!=='function')return;
 const originalDraw=csDrawRemote;
 const poses=new WeakMap();
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function sample(r,now){
  if(!r||!Number.isFinite(Number(r.x))||!Number.isFinite(Number(r.y)))return null;
  const rx=Number(r.x),ry=Number(r.y);let p=poses.get(r);
  if(!p){p={x:rx,y:ry,fromX:rx,fromY:ry,toX:rx,toY:ry,rawX:rx,rawY:ry,at:now,duration:120};poses.set(r,p)}
  const oldT=clamp((now-p.at)/p.duration,0,1),oldE=oldT*oldT*(3-2*oldT);
  const sx=p.fromX+(p.toX-p.fromX)*oldE,sy=p.fromY+(p.toY-p.fromY)*oldE;
  if(rx!==p.rawX||ry!==p.rawY){
   p.fromX=sx;p.fromY=sy;p.toX=rx;p.toY=ry;p.rawX=rx;p.rawY=ry;p.at=now;
   p.duration=clamp(r.moving?130:180,60,300);
  }
  const t=clamp((now-p.at)/p.duration,0,1),e=t*t*(3-2*t);
  p.x=p.fromX+(p.toX-p.fromX)*e;p.y=p.fromY+(p.toY-p.fromY)*e;
  return p;
 }
 csDrawRemote=function(){
  const now=performance.now(),changed=[];
  const candidates=[];
  if(csCoop?.remote)candidates.push(csCoop.remote);
  if(csCoop?.remotes)for(const r of Object.values(csCoop.remotes))if(r&&!candidates.includes(r))candidates.push(r);
  for(const r of candidates){
   const p=sample(r,now);if(!p)continue;
   changed.push([r,r.x,r.y]);r.x=p.x;r.y=p.y;
  }
  try{return originalDraw.apply(this,arguments)}
  finally{for(const [r,x,y] of changed){r.x=x;r.y=y}}
 };
 csStartPeerSync=function(){
  if(csCoop.syncTimer){clearInterval(csCoop.syncTimer);csCoop.syncTimer=null}
  let lastState=0,lastAudio=0;
  csCoop.syncTimer=setInterval(()=>{
   const now=performance.now(),dc=csCoop?.dc,cadence=player?.moving?110:220;
   if(dc?.readyState==='open'&&now-lastState>=cadence&&(dc.bufferedAmount||0)<65536){lastState=now;csSendPeerState()}
   if(now-lastAudio>=500){lastAudio=now;csUpdateRemoteAudio()}
  },55);
 };
 globalThis.__atriaRemotePerformancePatch487=true;
}
setTimeout(install,0);
})();
