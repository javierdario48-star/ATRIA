import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationTimeline} from './presentation-timeline.js';
const actor=(id,x,y)=>({id,x,y,walkPhase:x/10,moving:true,dir:'E',color:'navy',name:'Doctor'});
const snap=(generation,x,extras={})=>({
 phase:'lobby',generation,player:actor('self',x,100),
 nurses:[actor('nurse-1',x+20,110)],expert:null,patients:[],...extras
});
test('presentation interpolates simulation poses without mutating authoritative input',()=>{
 const a=snap(1,100),b=snap(1,104);
 const p=createPresentationTimeline(a);p.advance(b);
 const midway=p.sample(b,.5);
 assert.equal(midway.player.x,102);
 assert.equal(midway.player.walkPhase,10.2);
 assert.equal(midway.nurses[0].x,122);
 assert.equal(b.player.x,104);
 assert.notEqual(midway.player,b.player);
 assert.equal(p.sample(b,0).player.x,100);
 assert.equal(p.sample(b,1).player.x,104);
});
test('irregular render times do not repeat 60Hz movement steps or produce retrograde camera movement',()=>{
 const p=createPresentationTimeline(snap(1,100));
 let former=null,previous=100,current=100,visual=[];
 // 60Hz simulation, 90Hz viewport: 2 of 3 renders occur between physics steps.
 for(let k=0;k<120;k++){
  const t=k/90;const index=Math.floor(t*60+1e-9);
  if(former!==index){previous=current;current=100+index*3;p.advance(snap(1,current));former=index;}
  visual.push(p.sample(snap(1,current),t*60-index).player.x);
 }
 assert(visual.every((x,i)=>i===0||x>=visual[i-1]-1e-7),'camera must advance monotonically');
 assert(new Set(visual.map(v=>v.toFixed(2))).size>85,'interpolation must not visibly stutter between physics ticks');
});
test('lobby or guard transitions and re-instantiation do not interpolate from the old spawn',()=>{
 const p=createPresentationTimeline(snap(1,120));
 p.advance(snap(1,130));
 const guard=snap(2,800,{phase:'guard',nurses:[]});
 const frame=p.sample(guard,0);
 assert.equal(frame.player.x,800);
 assert.equal(frame.nurses.length,0);
});
test('changing character clothes and name uses live presentation immediately',()=>{
 const a=snap(1,100),p=createPresentationTimeline(a);
 const changed=snap(1,100);changed.player.color='teal';changed.player.name='Nuevo';
 const visual=p.sample(changed,.1);
 assert.equal(visual.player.color,'teal');
 assert.equal(visual.player.name,'Nuevo');
});
