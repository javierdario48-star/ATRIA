// One continuous remote timeline. No controls, networking or render loop here.
// Self-contained factory is embedded in the source-integrated offline build.
export function createRemoteMotionRuntime(){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const direction=(dx,dy)=>['E','SE','S','SW','W','NW','N','NE'][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
 const create=({x=0,y=0,now=0,cadence=120,speed=205}={})=>({x,y,speed,dir:'S',moving:false,walkPhase:0,samples:[],seq:0,session:null,epoch:0,retired:[],offset:null,cursor:null,transport:null,visualSpeed:0,fps:0,renderAge:0,resetReason:null,rebase:null,recovery:false,cadence,delay:cadence,lastRender:now,lastReceive:now,jitter:[],rejected:0});
 function receive(p,m){
  const x=Number(m.x),y=Number(m.y),now=Number(m.now)||0;
  if(!Number.isFinite(x)||!Number.isFinite(y))return p;
  const session=String(m.motionSession||m.peerId||p.session||''),seq=Number(m.stateSeq??m.seq)||0;
  const epoch=Number(m.motionEpoch)||0;
  if(p.retired.includes(session)||(session!==p.session&&p.epoch&&epoch<=p.epoch)){p.rejected++;return p}
  if(p.session!==null&&p.session!==session){const retired=[...p.retired,p.session].slice(-8);Object.assign(p,create({x,y,now,cadence:p.cadence,speed:p.speed}),{retired})}
  if(seq&&p.seq&&seq<=p.seq){p.rejected++;return p}
  const stamped=Number.isFinite(m.motionAt),source=stamped?Number(m.motionAt):now;
  const prev=p.samples.at(-1),gap=now-p.lastReceive;
  if(prev&&source<=prev.t){p.rejected++;return p}
  const cadence=Number(m.motionCadence)||Number(m.duration)||p.cadence;
  if(!prev)p.cadence=clamp(cadence,40,1000);
  else if(m.transport&&p.transport&&m.transport!==p.transport){p.cadence=clamp(cadence,40,1000);p.delay=p.cadence;p.jitter=[]}
  else{
   const dt=source-prev.t;
   // Missing packets and idle heartbeats are not a lower movement cadence.
   if(dt>=p.cadence*.45&&dt<=p.cadence*1.6)p.cadence+=.1*(dt-p.cadence);
   const jitter=Math.max(0,(now-p.lastReceive)-dt);
   p.jitter.push(jitter);if(p.jitter.length>16)p.jitter.shift();
  }
  // Clock origins differ per browser; minimum observed transit maps source time.
  const offset=now-source;p.offset=p.offset===null?offset:Math.min(p.offset,offset);
  const jitter=p.jitter.slice().sort((a,b)=>a-b),extra=jitter[Math.floor(jitter.length*.8)]||0;
  const target=p.cadence+Math.min(extra,p.cadence*.5);
  // Increasing protection under jitter is gradual, not a backwards time jump.
  p.delay=prev?p.delay+.1*(target-p.delay):target;
  p.lastReceive=now;p.seq=seq||p.seq;p.session=session;p.epoch=epoch||p.epoch;p.transport=m.transport||p.transport;
  const interruption=Math.max(650,p.cadence*3),interrupted=prev&&(gap>interruption||source-prev.t-gap>interruption);
  // An old in-flight HTTP pose can precede the current coalesced pose across
  // multiple render frames. Do not finish recovery on a source-stale pose.
  const recovering=interrupted||p.recovery,current=!stamped||now-(p.offset||0)-source<=interruption;
  const snap=!!m.teleport||interrupted||recovering&&current||(prev&&Math.hypot(x-prev.x,y-prev.y)>Math.max(160,((source-prev.t)/1000)*p.speed*2));
  p.recovery=!!recovering&&!current;
  p.resetReason=snap?(recovering?'network-resume':'position-discontinuity'):null;
  if(snap){p.rebase=p.resetReason;p.samples=[];p.x=x;p.y=y;p.moving=false;p.walkPhase=0;p.cursor=source;p.lastRender=now}
  p.samples.push({x,y,t:source,dir:m.dir||p.dir,moving:!!m.moving,route:m.route||null});
  if(p.samples.length>32)p.samples.shift();
  if(!prev){p.x=x;p.y=y;p.dir=m.dir||p.dir;p.lastRender=now}
  return p;
 }
 function sample(p,now,{canMove=null}={}){
  if(!p.samples.length||now<=p.lastRender)return p;
  const elapsed=Math.max(0,(now-p.lastRender)/1000),first=p.samples[0],last=p.samples.at(-1);
  // A background tab can lose route history while its transport keeps receiving.
  // Resume at a retained real pose, without inventing travel across lost corners.
  if(p.rebase||elapsed*1000>Math.max(650,p.cadence*3)||(p.cursor!==null&&p.cursor<first.t)){
   const target=now-(p.offset||0)-p.delay,pose=p.rebase?last:p.samples.findLast(v=>v.t<=target)||first;
   p.x=pose.x;p.y=pose.y;p.dir=pose.dir;p.cursor=pose.t;p.lastRender=now;
   p.moving=false;p.walkPhase=0;p.visualSpeed=0;p.fps=0;p.renderAge=now-(p.offset||0)-pose.t;p.resetReason=p.rebase||'render-resume';p.rebase=null;return p;
  }
  const from=Math.max(p.cursor??first.t,first.t);
  const target=Math.max(from,Math.min(last.t,now-(p.offset||0)-p.delay));
  const knots=[];
  // Traverse the snapshot polyline, including original navigation waypoints.
  // Bounding distance along this path cannot cut across a buffered corner.
  for(let i=1;i<p.samples.length;i++){
   const a=p.samples[i-1],b=p.samples[i];if(b.t<=from||a.t>=target)continue;
   const route=b.route||[{x:a.x,y:a.y},{x:b.x,y:b.y}];
   const lengths=route.slice(1).map((v,k)=>Math.hypot(v.x-route[k].x,v.y-route[k].y));
   const total=lengths.reduce((x,y)=>x+y,0);let walked=0;
   for(let k=0;k<lengths.length;k++){
    const start=a.t+(b.t-a.t)*(total?walked/total:0);walked+=lengths[k];
    const end=a.t+(b.t-a.t)*(total?walked/total:1);
    if(end<=from||start>=target)continue;
    const t=Math.min(end,target),u=end>start?clamp((t-start)/(end-start),0,1):1,c=route[k],d=route[k+1];
    knots.push({x:c.x+(d.x-c.x)*u,y:c.y+(d.y-c.y)*u,t});
   }
  }
  const beforeX=p.x,beforeY=p.y;let budget=p.speed*1.1*Math.min(elapsed,.1),clock=from;
  for(const k of knots){const dx=k.x-p.x,dy=k.y-p.y,d=Math.hypot(dx,dy),fraction=d?Math.min(1,budget/d):1;
   const x=p.x+dx*fraction,y=p.y+dy*fraction;
   if(canMove&&d>0&&!canMove(p.x,p.y,x,y))break;
   p.x=x;p.y=y;clock+=fraction*(k.t-clock);budget-=d*fraction;
   if(fraction<1)break;
  }
  p.cursor=knots.length?clock:target;p.lastRender=now;
  const dx=p.x-beforeX,dy=p.y-beforeY,step=Math.hypot(dx,dy);
  p.moving=step>1e-7;
  if(p.moving){p.dir=direction(dx,dy);p.walkPhase+=step/18}
  else if(p.cursor>=last.t)p.dir=last.dir||p.dir;
  p.visualSpeed=elapsed>0?step/elapsed:0;
  p.fps=elapsed>0?1/elapsed:0;p.renderAge=now-(p.offset||0)-p.cursor;
  return p;
 }
 return {create,receive,sample,direction};
}
const runtime=createRemoteMotionRuntime();
export const createRemotePose=runtime.create;
export const receiveRemotePose=runtime.receive;
export const sampleRemotePose=runtime.sample;
