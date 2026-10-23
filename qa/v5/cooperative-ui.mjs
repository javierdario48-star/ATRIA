// Public-UI helpers shared by the independently launched 2/3/4-browser runs.
import assert from 'node:assert/strict';
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
export async function walk(p,lastX=144){
 for(const [x,y] of [[496,1200],[496,1080],[496,960],[496,840],[496,720],[400,580],[250,470],[lastX,420]]){
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
  const point=await p.evaluate(({x,y})=>{
   const r=atriaV5.diagnostics().renderer,b=document.getElementById('game').getBoundingClientRect();
   const px=b.x+(x-r.camera.x)*r.scale+r.anchorX,py=b.y+(y-r.camera.y)*r.scale+r.anchorY;
   return {x:px,y:py,unobstructed:document.elementFromPoint(px,py)?.id==='game'};
  },aim);
  assert(point.unobstructed,'the intended waypoint must be visible and unobstructed');
  await p.mouse.click(point.x,point.y);
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
export async function study(p,id){const before=await messageIds(p);await p.locator('#peopleButton').click();await p.locator('[data-action="studies"]').click();await p.locator('#studyChoice').selectOption(id);await p.locator('[data-action="request-study"]').click();await waitForMessage(p,'/estudio '+id,before);}
