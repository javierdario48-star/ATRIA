// Geometry only. Prefer nonwalkable tiles to avoid stealing movement taps.
// The world navigation owner supplies an optional read-only collision query.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function positionPatientOverlay({x,y,width,height,viewportWidth,top,bottom,
 scale=1,isWalkableScreen=null}){
 const margin=8,sideGap=Math.max(76,92*scale),verticalGap=Math.max(42,45*scale);
 const minX=margin,maxX=Math.max(minX,viewportWidth-width-margin);
 const minY=top+margin,maxY=Math.max(minY,bottom-height-margin);
 // Candidate order is a deterministic tie-breaker. Furniture and walls
 // are preferred over any walkable approach lane.
 const candidates=[
  {left:x+sideGap,top:y-height/2},
  {left:x-sideGap-width,top:y-height/2},
  {left:x+Math.max(35,36*scale),top:y-height-verticalGap},
  {left:x-width-Math.max(35,36*scale),top:y-height-verticalGap},
  {left:x-width/2,top:y-height-verticalGap},
  {left:x-width/2,top:y+verticalGap},
  {left:x+sideGap,top:y+verticalGap},
  {left:x-sideGap-width,top:y+verticalGap}
 ];
 const fits=p=>p.left>=minX&&p.left<=maxX&&p.top>=minY&&p.top<=maxY;
 // A candidate is safe only when its ENTIRE interactive rectangle avoids
 // walkable tiles. If all candidates overlap, choose the least obstruction.
 const overlap=p=>{
  if(typeof isWalkableScreen!=='function')return 0;
  let count=0;
  for(const fx of [.12,.5,.88])for(const fy of [.18,.82])
   if(isWalkableScreen(p.left+width*fx,p.top+height*fy))count++;
  return count;
 };
 const options=candidates.filter(fits);
 if(options.length){
  const ordered=options.map((p,index)=>({...p,collisions:overlap(p),index}))
   .sort((a,b)=>a.collisions-b.collisions||a.index-b.index);
  return {left:ordered[0].left,top:ordered[0].top};
 }
 // Extremely narrow viewports retain a visible editor rather than overflow.
 const fallback=candidates.reduce((best,p)=>{
  const left=clamp(p.left,minX,maxX),py=clamp(p.top,minY,maxY);
  const collision=overlap({left,top:py}),clampDistance=(left-p.left)**2+(py-p.top)**2;
  const score=collision*1e6+clampDistance;
  return !best||score<best.score?{left,top:py,score}:best;
 },null);
 return {left:fallback.left,top:fallback.top};
}
