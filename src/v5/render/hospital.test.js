import test from 'node:test';
import assert from 'node:assert/strict';
import {createHospitalRenderer} from './hospital.js';

// Canvas is the browser boundary. These tests exercise the real renderer's
// backing-store policy; the browser regression checks its actual pixels.
async function fixture({wardrobe=false}={}){
 let rect={left:0,top:0,width:393,height:851},width=300,height=150;
 const writes={width:0,height:0},events=new EventTarget(),drawCalls=[];
 const context=new Proxy({drawImage:(image,...args)=>{assert(image,'decoded image required');drawCalls.push([image,...args]);},
  measureText:text=>({width:String(text).length*5}),
  createRadialGradient:()=>({addColorStop(){}})},
  {get:(target,key)=>key in target?target[key]:()=>{}});
 const sources=[];
 const document={createElement(){
  const source=new EventTarget();source.painted=false;
  source.getContext=()=>({drawImage:()=>{source.painted=true;},reset:()=>{source.painted=false;}});
  sources.push(source);return source;
 }};
 const canvas={getContext:()=>context,getBoundingClientRect:()=>rect,ownerDocument:document,
  addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),
  dispatchEvent:events.dispatchEvent.bind(events),
  get width(){return width;},set width(value){width=value;writes.width++;},
  get height(){return height;},set height(value){height=value;writes.height++;}};
 class Image{width=1024;height=1536;naturalWidth=1024;naturalHeight=1536;async decode(){}}
 const window={Image,devicePixelRatio:2,performance:{now:()=>0}};
 const assetUrls=Object.fromEntries(['hospital','pavement','garden','patient','player-navy','nurse','vega'].map(key=>[key,key+'.webp']));
 if(wardrobe)assetUrls.wardrobe='wardrobe.avif';
 const renderer=await createHospitalRenderer(canvas,{assetUrls,map:{source_size_px:[1024,1536]}},{window});
 return {canvas,renderer,writes,drawCalls,sources,setRect:value=>{rect={...rect,...value};}};
}
const world=()=>({phase:'guard',mode:'solo',generation:1,player:{id:'self',name:'Médica',x:496,y:1348,
 sex:'male',color:'navy',moving:false,dir:'S'},patients:[],nurses:[],others:[],entities:[],expert:null});

test('a transient zero-size mobile layout cannot erase a healthy hospital backing store',async()=>{
 const {renderer,canvas,setRect}=await fixture();
 setRect({width:0,height:0});renderer.resize();
 assert.equal(canvas.width,786,'keep the last usable bitmap while the viewport has no layout');
 assert.equal(canvas.height,1702);
 assert.equal(renderer.metrics().width,393);
 setRect({width:851,height:393});renderer.resize();
 assert.equal(canvas.width,1702);assert.equal(canvas.height,786);
});

test('unchanged viewport notifications do not clear the hospital bitmap',async()=>{
 const {renderer,writes}=await fixture();
 renderer.resize();renderer.resize();
 assert.deepEqual(writes,{width:1,height:1},'assigning even the same canvas size destroys its pixels and drawing state');
});

test('the next frame repairs a discarded backing store without moving the camera or clinical actors',async()=>{
 const {renderer,canvas}=await fixture(),snapshot=world();
 renderer.draw(snapshot,100);const before=structuredClone(snapshot),camera=renderer.metrics().camera;
 canvas.width=0;canvas.height=0;renderer.draw(snapshot,200);
 assert.equal(canvas.width,786);assert.equal(canvas.height,1702);
 assert.deepEqual(renderer.metrics().camera,camera);assert.deepEqual(snapshot,before);
});

test('a lost Canvas2D surface waits for restoration and redraws the original assets in place',async()=>{
 const {renderer,canvas,drawCalls}=await fixture(),snapshot=world();
 renderer.draw(snapshot,100);const before=drawCalls.length;
 const lost=new Event('contextlost',{cancelable:true});canvas.dispatchEvent(lost);
 renderer.draw(snapshot,200);
 assert.equal(drawCalls.length,before,'do not send drawing commands to a known lost context');
 assert.equal(lost.defaultPrevented,false,'Canvas2D default restoration must remain enabled');
 canvas.dispatchEvent(new Event('contextrestored'));renderer.draw(snapshot,300);
 assert(drawCalls.length>before,'restore the hospital and actors from decoded canonical assets');
 assert.equal(drawCalls.at(-1)[0],drawCalls[before-1][0]);
 assert.deepEqual(snapshot,world(),'context recovery cannot mutate world or clinical state');
});

test('an independently restored avatar bitmap cannot leave only the remote doctor name and shadow',async()=>{
 const {renderer,sources}=await fixture({wardrobe:true}),snapshot=world();
 snapshot.phase='lobby';snapshot.others=[{id:'remote',kind:'doctor',name:'Juliana',sex:'female',color:'navy',x:560,y:1320}];
 renderer.draw(snapshot,100);const before=structuredClone(snapshot);
 const source=sources[1];assert.equal(source.painted,true);
 source.getContext('2d').reset();source.dispatchEvent(new Event('contextrestored'));
 renderer.draw(snapshot,200);
 assert.equal(source.painted,true,'restore the cached sprite pixels even when the main hospital context was never lost');
 assert.deepEqual(snapshot,before,'bitmap restoration cannot change presence or movement');
 renderer.destroy();source.getContext('2d').reset();source.dispatchEvent(new Event('contextrestored'));
 assert.equal(source.painted,false,'disposed renderers must release the cached source listeners');
});
