// Public-UI helpers shared by the independently launched 2/3/4-browser runs.
import assert from 'node:assert/strict';
import {clickHudAction} from './hud-actions.mjs';
import {readFileSync} from 'node:fs';
import {createNavigation} from '../../src/v5/engine/navigation.js';
const navigation=createNavigation(JSON.parse(readFileSync(new URL('../../src/v5/content/hospital.json',import.meta.url),'utf8')));
export const state=p=>p.evaluate(()=>atriaV5.snapshot());
export const clinical=async p=>(await state(p)).clinical;
async function waitForMessage(p,text,before){
 await p.waitForFunction(({text,before})=>atriaV5.snapshot().clinical.room.transcript.some(x=>
  x.text===text&&!before.includes(x.actorId+':'+x.id)),{text,before});
}
const messageIds=async p=>(await clinical(p)).room.transcript.map(x=>x.actorId+':'+x.id);
export async function send(p,text){const before=await messageIds(p);
 await p.locator('#dieInput').fill(text);await p.locator('#chatForm [type="submit"]').click();await p.locator('#dieInput').blur();
 await waitForMessage(p,text,before);
}
export async function walk(p,lastX=144,lastY=420){
 for(const [x,y] of [[496,1200],[496,1080],[496,960],[496,840],[496,720],[400,580],[250,470],[lastX,lastY]]){
  await p.waitForFunction(()=>{const s=atriaV5.snapshot(),c=atriaV5.diagnostics().renderer.camera;
   return !s.player.moving&&!s.player.target&&s.player.pathIndex>=s.player.path.length&&Math.abs(c.x-s.player.x)<1&&Math.abs(c.y-s.player.y)<1;});
  const before=await state(p),expected=structuredClone(before.player);assert(navigation.target(expected,x,y));
  const goal=expected.target,name=before.player.name;
  // Keep the original requested tile, including nearest-open-tile routing.
  // A subpixel camera correction must not move an edge click into its neighbour.
  const aim=navigation.center(...navigation.tileAt(x,y));
  let observed=null;
  const arrival=(await p.evaluate(()=>atriaV5.diagnostics().cooperative.durable))?p.waitForResponse(async response=>{
   if(new URL(response.url()).pathname!=='/api/clinical'||response.status()!==200)return false;
   try{const value=await response.json(),self=value.spatial?.doctors.find(d=>d.name===name);
    observed={epoch:value.epoch,doctor:self?{x:self.x,y:self.y,moving:self.moving,target:self.target}:null};
    return self&&!self.moving&&!self.target&&Math.hypot(self.x-goal[0],self.y-goal[1])<3;
   }catch{return false;}
  }):null;
  arrival?.catch(()=>{}); // A failed click still closes the browser in finally.
  // Check the hit target and dispatch a real pointer immediately. Locator
  // actionability can wait while a reconciled camera invalidates old pixels.
  // An animation-frame camera correction can move the projected target
  // between evaluation and the real pointerdown. Confirm that this physical
  // click produced the intended navigation target, not a neighbouring tile.
  // One reprojected user tap is allowed; the server must still acknowledge
  // arrival at the original goal. No engine APIs or synthetic movement.
  let targetAccepted=false,lastPoint=null,lastPlayer=null;
  for(let attempt=0;attempt<2&&!targetAccepted;attempt++){
   const point=await p.evaluate(({x,y})=>{
    const r=atriaV5.diagnostics().renderer,b=document.getElementById('game').getBoundingClientRect();
    const px=b.x+(x-r.camera.x)*r.scale+r.anchorX,py=b.y+(y-r.camera.y)*r.scale+r.anchorY;
    const hit=document.elementFromPoint(px,py);
    return {x:px,y:py,unobstructed:hit?.id==='game',
     blockingElement:hit?.tagName+'#'+(hit?.id||'')+'.'+(typeof hit?.className==='string'?hit.className:''),
     viewport:{width:b.width,height:b.height}};
   },aim);
   assert(point.unobstructed,'the intended waypoint must be visible and unobstructed: '+JSON.stringify({point,aim}));
   await p.mouse.click(point.x,point.y);
   // A physician already standing on this tile now opens their real profile.
   // Dismiss only that known social surface; clinical dialogs remain failures.
   // Keep the same destination, physical input and authoritative arrival gate.
   if(await p.evaluate(()=>{const el=document.getElementById('modal');return !!el?.open&&el.dataset.panel==='lobby-person';})){
    await p.locator('#modalClose').click();
    const local=(await state(p)).player;
    if(Math.hypot(local.x-goal[0],local.y-goal[1])>=3)
     await p.waitForFunction(aim=>!atriaV5.snapshot().others.some(d=>Math.hypot(d.x-aim.x,d.y-aim.y)<=22),aim);
   }
   lastPoint=point;lastPlayer=(await state(p)).player;
   targetAccepted=!!lastPlayer.target&&Math.hypot(lastPlayer.target[0]-goal[0],lastPlayer.target[1]-goal[1])<3||
    !lastPlayer.moving&&Math.hypot(lastPlayer.x-goal[0],lastPlayer.y-goal[1])<3;
  }
  assert(targetAccepted,'real canvas pointer did not select its projected waypoint: '+
   JSON.stringify({waypoint:[x,y],goal,lastPoint,player:lastPlayer}));
  if(arrival)try{await arrival;}catch(error){
   error.message+='; '+JSON.stringify({doctor:name,waypoint:[x,y],goal,observed});throw error;
  }
  try{
   await p.waitForFunction(goal=>{const s=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;
    return !s.moving&&!s.target&&s.pathIndex>=s.path.length&&Math.hypot(s.x-goal[0],s.y-goal[1])<3&&Math.hypot(c.x-s.x,c.y-s.y)<1;
   },goal);
  }catch(error){
   const debug=await p.evaluate(()=>({player:atriaV5.snapshot().player,
    renderer:atriaV5.diagnostics().renderer,phase:atriaV5.snapshot().phase,
    dialog:document.querySelector('#modal')?.open,keyboard:atriaV5.diagnostics().keyboard}));
   error.message+='; '+JSON.stringify({waypoint:[x,y],goal,debug});throw error;
  }
 }
}
export async function study(p,id){const before=await messageIds(p);await clickHudAction(p,'peopleButton');await p.locator('[data-action="studies"]').click();await p.locator('#studyChoice').selectOption(id);await p.locator('[data-action="request-study"]').click();await waitForMessage(p,'/estudio '+id,before);}

// Complete patient handoff through public map, patient wheel, and the single
// canonical closure panel; never invoke clinical engine APIs in browser QA.
export async function chooseDestination(page,destination){
 const target=await page.evaluate(()=>{
  const p=atriaV5.snapshot().patients[0],r=atriaV5.diagnostics().renderer,
   b=document.getElementById('game').getBoundingClientRect();
  return {x:b.left+(p.x-r.camera.x)*r.scale+r.anchorX,
   y:b.top+(p.y-r.camera.y)*r.scale+r.anchorY};
 });
 await page.mouse.click(target.x,target.y);
 await page.locator('#patientWheel [data-patient-action="patient"]').click();
 await page.locator('#caseClosureOptions [data-destination="'+destination+'"]').click();
}
