const stats=values=>{const mean=values.reduce((a,b)=>a+b,0)/Math.max(1,values.length);return {n:values.length,mean,cv:mean?Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,values.length))/mean:0,min:values.length?Math.min(...values):0,max:values.length?Math.max(...values):0}};
export function metrics(local,remote,name){
 const frames=remote.frames.map(f=>({...f,actor:f.actors.find(a=>a.remote&&a.name===name)})).filter(f=>f.actor);
 let movingWithoutSteps=0,stepsWithoutMovement=0,movingFlagsWithoutDisplacement=0,orientation=0,total=0,maxJump=0,phaseDistanceErrorPx=0;
 const speeds=[],sourceSpeeds=[],fps=[],rebases=[];let prev=null,remoteTravelPx=0;
 for(const f of frames){if(prev){const a=f.actor,b=prev.actor,dt=(f.now-prev.now)/1000,d=Math.hypot(a.x-b.x,a.y-b.y);remoteTravelPx+=d;if(dt>0&&dt<.1){
  fps.push(1/dt);maxJump=Math.max(maxJump,d);if(d>.05&&!a.moving){if(['network-resume','render-resume','position-discontinuity'].includes(a.resetReason))rebases.push({t:f.t,distancePx:d,reason:a.resetReason});else movingWithoutSteps++}
  // A tiny position/phase advance is not a footstep without displacement.
  // Compare both in pixels at the same precision, retaining raw flag counts.
  if(d<.001&&a.moving){movingFlagsWithoutDisplacement++;if(Math.abs(a.phase-b.phase)*18>.001)stepsWithoutMovement++}
  if(a.moving&&a.phase>=b.phase)phaseDistanceErrorPx=Math.max(phaseDistanceErrorPx,Math.abs((a.phase-b.phase)*18-d));
  if(d>.2){total++;const dx=a.x-b.x,dy=a.y-b.y,oct=Math.round(Math.atan2(dy,dx)/(Math.PI/4));const dir=['E','SE','S','SW','W','NW','N','NE'][(oct+8)%8];if(a.dir!==dir)orientation++}
 }}prev=f}
 // Fit time shift against the actual local trajectory, including pathfinder turns.
 const lf=local.frames;
 const at=t=>{let lo=0,hi=lf.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(lf[m].t<=t)lo=m;else hi=m-1}return {f:lf[lo],i:lo}};
 let lag=0,error=Infinity;
 if(lf.length>15){
  for(let l=0;l<=1600;l+=10){let e=0,n=0;for(const f of frames){const t=f.t-l;if(t<lf[0].t||t>lf.at(-1).t)continue;const p=at(t).f.player;if(!p.moving)continue;e+=Math.hypot(f.actor.x-p.x,f.actor.y-p.y);n++}if(n&&e/n<error){error=e/n;lag=l}}
  let prior=null;for(const f of frames){const t=f.t-lag,{f:source,i}=at(t),before=lf[i-2],after=lf[i+2];
   if(prior&&before&&after&&source.player.moving&&before.player.dir===source.player.dir&&after.player.dir===source.player.dir){
    const dt=(f.now-prior.now)/1000,sourceSpeed=Math.hypot(after.player.x-before.player.x,after.player.y-before.player.y)/((after.now-before.now)/1000);
    if(dt>0&&dt<.1&&sourceSpeed>100&&sourceSpeed<230){speeds.push(Math.hypot(f.actor.x-prior.actor.x,f.actor.y-prior.actor.y)/dt);sourceSpeeds.push(sourceSpeed)}
   }prior=f;
  }
 }
 const intervals=[];let p=null;for(const e of remote.packets){const d=e.data?.p||e.data;if(e.kind==='receive'&&d.name===name&&d.x!=null){if(p?.transport===e.transport)intervals.push(e.t-p.t);p=e}}
 const stop=[];
 for(let i=1;i<lf.length-12;i++)if(lf[i-1].player.moving&&!lf[i].player.moving&&lf.slice(i,i+12).every(f=>!f.player.moving)){
  const t=lf[i].t,f=frames.find((v,k)=>v.t>=t&&!v.actor.moving&&frames[k+1]&&!frames[k+1].actor.moving&&Math.hypot(v.actor.x-lf[i].player.x,v.actor.y-lf[i].player.y)<3);
  if(f)stop.push(f.t-t);
 }
 const localTravelPx=lf.slice(1).reduce((s,f,i)=>s+Math.hypot(f.player.x-lf[i].player.x,f.player.y-lf[i].player.y),0);
 return {frames:frames.length,localFrames:lf.length,localTravelPx,remoteTravelPx,fps:stats(fps),speed:stats(speeds),sourceSpeed:stats(sourceSpeeds),orientationErrors:orientation,orientationFrames:total,movingWithoutSteps,stepsWithoutMovement,movingFlagsWithoutDisplacement,phaseDistanceErrorPx,maxJump,rebases,stopAnimationMs:stats(stop),followLagMs:lag,alignedErrorPx:Number.isFinite(error)?error:null,packetIntervals:stats(intervals.filter(v=>v>0))};
}
