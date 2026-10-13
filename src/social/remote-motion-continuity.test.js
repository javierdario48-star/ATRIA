import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const adapter=html.match(/<script id="atria-guard-remote-adapter-487">([\s\S]*?)<\/script>/)?.[1]||html;
const start=adapter.indexOf('csDrawRemote=function(){if(!shared())');
const end=adapter.indexOf('// remote renderer end',start)>=0?adapter.indexOf('// remote renderer end',start):adapter.indexOf('csUpdateRemoteAudio=function(){',start);
assert(start>0&&end>start);
let now=0,last=null;const speeds=[],actors=[];
const r={peerId:'OTHER',userId:'remote',roomId:'ROOM',name:'Other',x:500,y:500,dir:'E',moving:true,motionAt:0,stateSeq:1};
const ctx={csSharedRemotePose:new Map(),csCoop:{remotes:{OTHER:r}},challenge:{id:'ROOM'},selfId:'SELF',shared:()=>true,oldRemoteDraw(){},
 performance:{now:()=>now},window:{nsSocial:{state:()=>({user:{id:'local'}})}},
 csVariantImgs:{navy:{complete:true}},drawSprite:(_im,a)=>actors.push({...a}),csDrawNameplate(){},Map,Set,Object,Number,String,Math};
vm.createContext(ctx);
const runtime=html.match(/<script id="atria-remote-motion-487">([\s\S]*?)<\/script>/)?.[1];
if(runtime)vm.runInContext(runtime,ctx);
vm.runInContext(adapter.slice(start,end),ctx);
for(let f=0;f<600;f++){
 now=f*1000/60;
 if(f%13===0){r.x=500+now*.205;r.motionAt=now;r.stateSeq++;r.sentAt=now;r.motionCadence=13*1000/60;}
 ctx.csDrawRemote();const a=actors.at(-1);
 if(last&&f>100)speeds.push((a.x-last.x)*60);
 last=a;
}
const mean=speeds.reduce((a,b)=>a+b)/speeds.length;
const cv=Math.sqrt(speeds.reduce((a,b)=>a+(b-mean)**2,0)/speeds.length)/mean;
console.log('INTEGRATED REMOTE CONSTANT-SPEED MEASUREMENT',JSON.stringify({mean,cv,frames:speeds.length}));
// One render quantum / packet duration is 1/13 = 7.7%. A 10% CV budget
// permits that quantization, while detecting acceleration restarted per packet.
assert(cv<.1,'a constant-speed source must not repeatedly accelerate/decelerate when another snapshot arrives');
assert(Math.abs(mean-205)<205/13,'visual speed preserves the source within one render quantum per snapshot');
