/** Interpolated presentation of fixed-step world snapshots.
 * This is a visual read model only: it cannot authorize movement, chat or care.
 * A room transition discards the old timeline so no avatar slides from spawn.
 */
const mix=(a,b,t)=>a+(b-a)*t;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function actorPose(before,after,live,alpha){
 if(!after||!before||before.id!==after.id||after.id!==live.id)return live;
 const same=finite(before.x)&&finite(before.y)&&finite(after.x)&&finite(after.y);
 if(!same)return live;
 return {...live,x:mix(before.x,after.x,alpha),y:mix(before.y,after.y,alpha),
  walkPhase:finite(before.walkPhase)&&finite(after.walkPhase)?
   mix(before.walkPhase,after.walkPhase,alpha):live.walkPhase};
}
const compatible=(a,b)=>!!a&&a.generation===b.generation&&a.phase===b.phase;
export function createPresentationTimeline(initial){
 let before=initial??null,after=initial??null;
 function reset(snapshot){before=snapshot;after=snapshot;}
 function advance(snapshot){
  if(!compatible(after,snapshot)){reset(snapshot);return;}
  before=after;after=snapshot;
 }
 function sample(live,alpha=1){
  if(!compatible(after,live))reset(live);
  const t=finite(alpha)?Math.max(0,Math.min(1,alpha)):1;
  const past=new Map((before?.nurses||[]).map(x=>[x.id,x]));
  const future=new Map((after?.nurses||[]).map(x=>[x.id,x]));
  return {...live,player:actorPose(before?.player,after?.player,live.player,t),
   nurses:live.nurses.map(a=>actorPose(past.get(a.id),future.get(a.id),a,t)),
   expert:live.expert?actorPose(before?.expert,after?.expert,live.expert,t):null};
 }
 return Object.freeze({reset,advance,sample});
}
