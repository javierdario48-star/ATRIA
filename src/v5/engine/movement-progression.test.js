import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorld} from '../app/world.js';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url),'utf8'));
const content={map:read('hospital'),beds:read('beds'),cases:read('cases')};
test('verified level makes walking faster with diminishing gains; transitions retain the same reward',()=>{
 let previous=0,priorGain=Infinity;
 for(const level of [1,5,10,20,50,100,10000]){
  const w=createWorld(content,{id:'a',name:'Médico',level});w.enterLobby();const p=w.snapshot().player;
  assert(p.speed>=184.5&&p.speed<254.21);if(level===1)assert.equal(p.speed,184.5);else assert(p.speed>previous);
  if(previous)assert((p.speed-previous)/(level-(level===5?1:level===10?5:level===20?10:level===50?20:level===100?50:100))<priorGain);
  if(previous)priorGain=(p.speed-previous)/(level-(level===5?1:level===10?5:level===20?10:level===50?20:level===100?50:100));
  previous=p.speed;
  w.enterGuard({mode:'solo',caseId:'CIRR-001'});assert.equal(w.snapshot().player.speed,p.speed);
  w.setLevel(20);const changed=w.snapshot().player.speed;assert(changed>205);w.enterLobby();assert.equal(w.snapshot().player.speed,changed);
 }
});
test('level reward follows swept collision navigation and distance-based animation at 30/60/120 Hz',()=>{
 const run=(level,hz)=>{const w=createWorld(content,{id:'a',name:'Médico',level});w.enterLobby();
  const s=w.snapshot().player;let target=null;
  for(const [dx,dy] of [[0,-200],[0,200],[-200,0],[200,0]])if(w.target(s.x+dx,s.y+dy)){target=[s.x+dx,s.y+dy];break;}
  assert(target);for(let i=0;i<hz/5;i++)w.step(1/hz,i*1000/hz);
  const p=w.snapshot().player;assert(!w.navigation.circleBlocked(p.x,p.y));assert(p.walkPhase>0);
  return Math.hypot(p.x-s.x,p.y-s.y);
 };
 const base=run(1,60),fast=run(50,60);assert(fast>base);
 assert(Math.abs(fast-run(50,120))<3);assert(Math.abs(fast-run(50,30))<3);
});
