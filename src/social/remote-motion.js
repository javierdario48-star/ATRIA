const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));export function createRemotePose({x=0,y=0,now=0}={}){return{x,y,fromX:x,fromY:y,toX:x,toY:y,receivedAt:now,duration:120}}
export function receiveRemotePose(p,{x,y,now,duration=120}){return{...p,fromX:p.x,fromY:p.y,toX:x,toY:y,receivedAt:now,duration:clamp(duration,60,300)}}
export function sampleRemotePose(p,now){const t=clamp((now-p.receivedAt)/p.duration,0,1),ease=t*t*(3-2*t);return{...p,x:p.fromX+(p.toX-p.fromX)*ease,y:p.fromY+(p.toY-p.fromY)*ease}}
