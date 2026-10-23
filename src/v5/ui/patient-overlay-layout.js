// Geometry only. The bedside edit badge must not sit over either player
// approach lane beside a bed or over the patient's own interaction target.
// Shared by desktop/mobile; no case-specific coordinates or magic case IDs.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function positionPatientOverlay({x,y,width,height,viewportWidth,top,bottom,scale=1}){
 const margin=8,sideGap=Math.max(76,92*scale),verticalGap=Math.max(42,45*scale);
 const minX=margin,maxX=Math.max(minX,viewportWidth-width-margin);
 const minY=top+margin,maxY=Math.max(minY,bottom-height-margin);
 // Prefer the exterior side lanes, then nonblocking space above the bed.
 // The center and the immediate +/- 1–2 walking tiles are deliberately
 // not candidate positions.
 const candidates=[
  {left:x+sideGap,top:y-height/2},
  {left:x-sideGap-width,top:y-height/2},
  {left:x+Math.max(35,36*scale),top:y-height-verticalGap},
  {left:x-width-Math.max(35,36*scale),top:y-height-verticalGap},
  {left:x+sideGap,top:y+verticalGap},
  {left:x-sideGap-width,top:y+verticalGap}
 ];
 const fits=p=>p.left>=minX&&p.left<=maxX&&p.top>=minY&&p.top<=maxY;
 const valid=candidates.find(fits);
 if(valid)return {left:valid.left,top:valid.top};
 // Clamped fallback for an extremely narrow landscape viewport.
 // Avoid drifting off-screen even when no full side lane is available.
 const candidate=candidates.reduce((best,p)=>{
  const left=clamp(p.left,minX,maxX),y=clamp(p.top,minY,maxY);
  const dist=(left-p.left)**2+(y-p.top)**2;
  return !best||dist<best.dist?{left,top:y,dist}:best;
 },null);
 return {left:candidate.left,top:candidate.top};
}
