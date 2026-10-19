// QA regression only: the page double projects a real pointer through two
// consecutive camera poses; navigation and authoritative arrivals use the
// existing map/engine. No clinical engine, treatment or reward is fabricated.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createNavigation} from '../../src/v5/engine/navigation.js';
import {walk} from './cooperative-ui.mjs';

const map=JSON.parse(readFileSync(new URL('../../src/v5/content/hospital.json',import.meta.url),'utf8'));
function projectedPage({drift,scale}){
 const navigation=createNavigation(map),player={...navigation.center(...map.player_start_tile),
  r:10.5,speed:205,name:'Ana',path:[],pathIndex:0,target:null,moving:false};
 let waiting=null,arrivals=0;
 const renderer=()=>({scale,anchorX:300,anchorY:300,camera:{x:player.x,y:player.y+drift}});
 const globals={
  atriaV5:{snapshot:()=>({player:structuredClone(player)}),
   diagnostics:()=>({renderer:renderer(),cooperative:{durable:true}})},
  document:{getElementById:()=>({getBoundingClientRect:()=>({x:0,y:0})}),
   elementFromPoint:()=>({id:'game'})}
 };
 const evaluate=(callback,argument)=>runInNewContext('('+callback.toString()+')(argument)',{...globals,argument});
 return {
  evaluate:async(callback,argument)=>evaluate(callback,argument),
  waitForFunction:async(callback,argument)=>assert(evaluate(callback,argument),'local pose/camera must converge'),
  waitForResponse(predicate){
   assert.equal(waiting,null);
   return new Promise((resolve,reject)=>{waiting={predicate,resolve,reject};});
  },
  mouse:{async click(x,y){
   // Projection was calculated with camera.y=player.y+drift. The real
   // pointer arrives after that permitted (<1px) correction has settled.
   const world=[(x-300)/scale+player.x,(y-300)/scale+player.y];
   assert(navigation.target(player,...world));
   for(let step=0;player.target&&step<3600;step++)navigation.move(player,1/60);
   assert.equal(player.target,null,'actual server navigation must finish');
   const response={url:()=> 'https://qa.invalid/api/clinical',status:()=>200,
    json:async()=>({spatial:{doctors:[structuredClone(player)]}})};
   const observer=waiting;waiting=null;assert(observer,'subscribe before dispatching the pointer');
   if(await observer.predicate(response)){arrivals++;observer.resolve(response);}
   else observer.reject(Error('actual authoritative arrival '+JSON.stringify([player.x,player.y])+' differs from the awaited waypoint'));
  }},
  arrivals:()=>arrivals,
 };
}
for(const scale of [1.38,.7660169491525424])for(const drift of [0,-.8,.8])
 test('walk keeps its tile after a '+drift+'px camera correction at scale '+scale,async()=>{
  const page=projectedPage({drift,scale});await walk(page);
  assert.equal(page.arrivals(),8,'all eight real navigation arrivals must be observed');
 });
