import assert from 'node:assert/strict';

/**
 * Follow authored hospital waypoints using only visible, hit-testable map taps.
 * Presentation camera position is a visual read model; this helper does not
 * mutate game state, bypass movement, or issue internal movement commands.
 *
 * A distant waypoint may be occluded by the HUD or chat/ATRIA keyboard:
 * first walk towards it by tapping the nearest visible point on the same ray.
 */
export async function walkVisibleRoute(page,waypoints,{margin=17,maxSegments=14}={}){
 for(const [goalX,goalY] of waypoints){
  let arrived=false;
  for(let segment=0;segment<maxSegments;segment++){
   await page.waitForFunction(()=>{
    const p=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;
    return Math.abs(p.x-c.x)<1&&Math.abs(p.y-c.y)<1;
   });
   const state=await page.evaluate(()=>({p:atriaV5.snapshot().player,r:atriaV5.diagnostics().renderer}));
   if(Math.hypot(state.p.x-goalX,state.p.y-goalY)<23){arrived=true;break;}
   const {r}=state;
   const anchorX=r.anchorX,anchorY=r.anchorY;
   const targetX=(goalX-r.camera.x)*r.scale+anchorX;
   const targetY=(goalY-r.camera.y)*r.scale+anchorY;
   const left=24,right=r.width-24;
   const top=Math.max(89,(r.playableBounds?.top??65)+margin);
   const bottom=Math.min(r.height-65,(r.playableBounds?.bottom??r.height-65)-margin);
   assert(top<anchorY&&anchorY<bottom,'player anchor must stay inside playable map');
   let fraction=1,dx=targetX-anchorX,dy=targetY-anchorY;
   if(dx<0)fraction=Math.min(fraction,(left-anchorX)/dx);
   if(dx>0)fraction=Math.min(fraction,(right-anchorX)/dx);
   if(dy<0)fraction=Math.min(fraction,(top-anchorY)/dy);
   if(dy>0)fraction=Math.min(fraction,(bottom-anchorY)/dy);
   fraction=Math.min(1,Math.max(0,fraction));
   assert(fraction>0.02,'waypoint cannot be reached from visible map');
   const x=anchorX+dx*fraction,y=anchorY+dy*fraction;
   assert(x>=left-1&&x<=right+1&&y>=top-1&&y<=bottom+1);
   await page.locator('#game').click({position:{x,y}});
   await page.waitForFunction(()=>atriaV5.snapshot().player.moving);
   await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
   const current=await page.evaluate(()=>atriaV5.snapshot().player);
   assert(Math.hypot(current.x-state.p.x,current.y-state.p.y)>5,
    'visible map click must cause real navigation progress');
  }
  if(!arrived){
   const player=await page.evaluate(()=>atriaV5.snapshot().player);
   assert(Math.hypot(player.x-goalX,player.y-goalY)<23,
    'authored destination should be reached through visible taps');
  }
 }
}
