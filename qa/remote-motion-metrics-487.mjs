const stats=values=>{const mean=values.reduce((a,b)=>a+b,0)/Math.max(1,values.length);return {n:values.length,mean,cv:mean?Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,values.length))/mean:0,min:values.length?Math.min(...values):0,max:values.length?Math.max(...values):0}};
export function metrics(local,remote,name){
 const frames=remote.frames.map(f=>({...f,actor:f.actors.find(a=>a.remote&&a.name===name)})).filter(f=>f.actor);
 let movingWithoutSteps=0,stepsWithoutMovement=0,movingFlagsWithoutDisplacement=0,orientation=0,total=0,maxJump=0,phaseDistanceErrorPx=0;
 const speeds=[],rawSpeeds=[],sourceSpeeds=[],fps=[],rebases=[],cadences=[],transports=new Set();let prev=null,remoteTravelPx=0;
 for(const f of frames){if(f.actor.cadence)cadences.push(f.actor.cadence);if(f.actor.transport)transports.add(f.actor.transport)}
 for(const f of frames){if(prev){const a=f.actor,b=prev.actor,dt=(f.now-prev.now)/1000,d=Math.hypot(a.x-b.x,a.y-b.y);remoteTravelPx+=d;if(dt>0){
  fps.push(1/dt);maxJump=Math.max(maxJump,d);if(d>.05&&!a.moving){if(['network-resume','render-resume','position-discontinuity'].includes(a.resetReason))rebases.push({t:f.t,distancePx:d,reason:a.resetReason});else movingWithoutSteps++}
  // A tiny position/phase advance is not a footstep without displacement.
  // Compare both in pixels at the same precision, retaining raw flag counts.
  if(d<.001&&a.moving){movingFlagsWithoutDisplacement++;if(Math.abs(a.phase-b.phase)*18>.001)stepsWithoutMovement++}
  if(a.moving&&a.phase>=b.phase)phaseDistanceErrorPx=Math.max(phaseDistanceErrorPx,Math.abs((a.phase-b.phase)*18-d));
  if(d>.2&&!(a.resetReason&&!a.moving)){total++;const dx=a.x-b.x,dy=a.y-b.y,oct=Math.round(Math.atan2(dy,dx)/(Math.PI/4));const dir=['E','SE','S','SW','W','NW','N','NE'][(oct+8)%8];if(a.dir!==dir)orientation++}
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
    if(dt>0&&sourceSpeed>100&&sourceSpeed<230){const v=Math.hypot(f.actor.x-prior.actor.x,f.actor.y-prior.actor.y)/dt;rawSpeeds.push(v);
     // A tagged outage relocation is reported as a jump, not a walking burst.
     if(!(f.actor.resetReason&&!f.actor.moving)){speeds.push(v);sourceSpeeds.push(sourceSpeed)}
    }
   }prior=f;
  }
 }
 const intervals=[];let p=null;for(const e of remote.packets){const d=e.data?.p||e.data;if(e.kind==='receive'&&d.name===name&&d.x!=null){if(p&&p.transport===e.transport)intervals.push(e.t-p.t);p=e}}
 const stop=[],transientStops=[];
 // A turn that resumes BEFORE another client can receive and display a
 // stopped pose is not a measurable terminal stop. This is based on observed
 // packet inter-arrival (P90) plus two actual render frames, not a relaxed
 // acceptance threshold. All sustained stops still use the ORIGINAL limit.
 const gaps=intervals.filter(v=>v>0).sort((a,b)=>a-b);
 const p90=gaps.length?gaps[Math.floor((gaps.length-1)*.9)]:0;
 const frameMs=1000/Math.max(1,stats(fps).mean);
 const observationWindowMs=Math.max(stats(cadences).max,p90)+2*frameMs;
 for(let i=1;i<lf.length-12;i++)if(lf[i-1].player.moving&&!lf[i].player.moving&&lf.slice(i,i+12).every(f=>!f.player.moving)){
  const t=lf[i].t,next=lf.find((v,k)=>k>i&&v.player.moving);
  const dwellMs=(next?.t??lf.at(-1).t)-t;
  if(dwellMs<observationWindowMs){transientStops.push({sourceDwellMs:dwellMs});continue;}
  // Only a sustained stop can be tested for two consecutive stopped remote
  // frames. In particular, don't count the NEXT turn's stop for this one.
  const f=frames.find((v,k)=>v.t>=t&&!v.actor.moving&&frames[k+1]&&!frames[k+1].actor.moving);
  if(f)stop.push(f.t-t);
 }
 const localTravelPx=lf.slice(1).reduce((s,f,i)=>s+Math.hypot(f.player.x-lf[i].player.x,f.player.y-lf[i].player.y),0);
 const endpointErrorPx=frames.length&&lf.length?Math.hypot(frames.at(-1).actor.x-lf.at(-1).player.x,frames.at(-1).actor.y-lf.at(-1).player.y):null;
 const pose=e=>e.data?.p||e.data?.presence||e.data?.message||e.data,session=local.packets.findLast(e=>e.kind==='send'&&pose(e)?.motionSession),generation=session&&pose(session).motionSession;
 const lastMoving=lf.findLast(f=>f.player.moving),end=frames.at(-1),endTime=end?end.t+((end.drawTime??end.now)-end.now):0,settling=(cadences.length?Math.max(...cadences):0)*1.5+2000/Math.max(1,stats(fps).mean);
 const received=remote.packets.find(e=>{const d=pose(e);return e.kind==='receive'&&d.name===name&&d.motionSession===generation&&d.moving===false&&Number.isFinite(d.motionAt)&&(!lastMoving||d.motionAt>=lastMoving.now-100)&&endTime-e.t>=settling&&lf.length&&Math.hypot(d.x-lf.at(-1).player.x,d.y-lf.at(-1).player.y)<=2});
 const settledStoppedPose=received&&end?{receivedAt:received.t,settlingMs:endTime-received.t,errorPx:Math.hypot(end.actor.x-pose(received).x,end.actor.y-pose(received).y)}:null;
 const duplicateFrames=remote.frames.filter(f=>f.actors.filter(a=>a.remote&&a.name===name).length>1).length;
 return {frames:frames.length,observerFrames:remote.frames.length,localFrames:lf.length,localTravelPx,remoteTravelPx,transports:[...transports],cadence:stats(cadences),fps:stats(fps),speed:stats(speeds),rawSpeed:stats(rawSpeeds),sourceSpeed:stats(sourceSpeeds),orientationErrors:orientation,orientationFrames:total,movingWithoutSteps,stepsWithoutMovement,movingFlagsWithoutDisplacement,phaseDistanceErrorPx,maxJump,rebases,duplicateFrames,stopAnimationMs:stats(stop),transientStopCount:transientStops.length,stopObservationWindowMs:observationWindowMs,followLagMs:lag,alignedErrorPx:Number.isFinite(error)?error:null,endpointErrorPx,settledStoppedPose,packetIntervals:stats(intervals.filter(v=>v>0))};
}
