const stats=values=>{const mean=values.reduce((a,b)=>a+b,0)/Math.max(1,values.length);return {n:values.length,mean,cv:mean?Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,values.length))/mean:0,min:Math.min(...values),max:Math.max(...values)}};
export function metrics(local,remote,name){
 const frames=remote.frames.map(f=>({...f,actor:f.actors.find(a=>a.remote&&a.name===name)})).filter(f=>f.actor);
 let movingWithoutSteps=0,stepsWithoutMovement=0,orientation=0,total=0,maxJump=0;
 const speeds=[];let prev=null;
 for(const f of frames){if(prev){const a=f.actor,b=prev.actor,dt=(f.now-prev.now)/1000,d=Math.hypot(a.x-b.x,a.y-b.y);if(dt>0&&dt<.1){
  maxJump=Math.max(maxJump,d);if(d>.05&&!a.moving)movingWithoutSteps++;if(d<.001&&a.moving)stepsWithoutMovement++;
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
    if(dt>0&&dt<.1&&sourceSpeed>180&&sourceSpeed<230)speeds.push(Math.hypot(f.actor.x-prior.actor.x,f.actor.y-prior.actor.y)/dt);
   }prior=f;
  }
 }
 const intervals=[];let p=null;for(const e of remote.packets){const d=e.data?.p||e.data;if(e.kind==='receive'&&d.name===name&&d.x!=null){if(p?.transport===e.transport)intervals.push(e.t-p.t);p=e}}
 return {frames:frames.length,localFrames:lf.length,speed:stats(speeds),orientationErrors:orientation,orientationFrames:total,movingWithoutSteps,stepsWithoutMovement,maxJump,followLagMs:lag,alignedErrorPx:error,packetIntervals:stats(intervals.filter(v=>v>0))};
}
