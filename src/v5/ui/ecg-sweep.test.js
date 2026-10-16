import test from 'node:test';
import assert from 'node:assert/strict';
import {createEcgSweep,ECG_WINDOW_SECONDS,ECG_SAMPLES_PER_SECOND} from './ecg-sweep.js';

const on=(hr=80,rhythm='sinus')=>({connected:true,measured:true,hr,rhythm,rhythmSource:'baseline-illustration'});
const plot=(s,hr,duration=5,interval=40)=>{
 let path='';
 for(let t=0;t<=duration*1000;t+=interval)path=s.update(t,on(hr));
 return path;
};
const peaks=path=>{
 const points=[...path.matchAll(/[ML](\d+\.\d+) (\d+\.\d+)/g)].map(x=>({x:+x[1],y:+x[2]}));
 let count=0,last=-1e5;
 for(let i=1;i<points.length-1;i++){
  const p=points[i];
  if(p.y<30&&p.y<points[i-1].y&&p.y<=points[i+1].y&&p.x-last>14){count++;last=p.x;}
 }
 return count;
};

test('C05.e ECG display always spans fixed 4.5 wall-clock seconds, regardless of FC',()=>{
 for(const hr of [60,94,120,160]){
  const sweep=createEcgSweep();let path=plot(sweep,hr,6,40);
  const m=sweep.info();
  assert.equal(m.windowSeconds,ECG_WINDOW_SECONDS);
  assert(m.samples>ECG_WINDOW_SECONDS*ECG_SAMPLES_PER_SECOND*.96);
  assert(m.samples<ECG_WINDOW_SECONDS*ECG_SAMPLES_PER_SECOND+5);
  assert(Math.abs(m.cycles-hr/60*6)<.05,'cumulative cycles follow observed FC');
  const ps=[...path.matchAll(/[ML](\d+\.\d+) (\d+\.\d+)/g)];
  assert(ps.length>540);
  assert(+ps[0][1]<3 && +ps.at(-1)[1]>555,'trace spans full width at steady state');
 }
});
test('C05.e beat density doubles when monitored FC doubles, without changing scroll speed',()=>{
 const slow=peaks(plot(createEcgSweep(),60,7));
 const fast=peaks(plot(createEcgSweep(),120,7));
 assert(slow>=3&&slow<=6,'60 bpm should produce about 4–5 complexes, found '+slow);
 assert(fast>=7&&fast<=11,'120 bpm should produce about 9 complexes, found '+fast);
});
test('C05.e previously recorded QRS samples keep their amplitude when native FC changes',()=>{
 const sweep=createEcgSweep();
 for(let ms=0;ms<=3200;ms+=40)sweep.update(ms,on(100));
 const before=sweep.update(3240,on(100));
 const first=[...before.matchAll(/[ML](\d+\.\d+) (\d+\.\d+)/g)].map(x=>({x:+x[1],y:+x[2]}));
 const after=sweep.update(3280,on(60));
 const second=[...after.matchAll(/[ML](\d+\.\d+) (\d+\.\d+)/g)].map(x=>({x:+x[1],y:+x[2]}));
 const shift=40/1000*560/ECG_WINDOW_SECONDS;
 // Each prior sample moves left by elapsed real seconds, never gets recomputed.
 for(let i=0;i<Math.min(80,first.length);i++){
  assert.equal(second[i].y,first[i].y,'historic sample amplitude must not be rewritten');
  assert(Math.abs(second[i].x-(first[i].x-shift))<.12);
 }
});
test('C05.e disconnect and long frame reset presentation, not physiological time',()=>{
 const s=createEcgSweep();
 plot(s,95,1.2);
 assert(s.info().samples>100);
 assert.equal(s.update(1240,{...on(95),connected:false}),'');
 assert.equal(s.info().samples,0);
 assert(s.update(1300,on(95)).startsWith('M'));
 assert(s.info().samples<4);
 s.update(5300,on(95));
 assert(s.info().samples<4,'a suspended tab never fills absent measurements');
});
test('C05.e pathological rhythms are explicit, and asystole stays flat even with zero pulse',()=>{
 const s=createEcgSweep();let path='';
 const state={connected:true,measured:true,hr:0,rhythm:'asystole',rhythmSource:'case-rule'};
 for(let t=0;t<=500;t+=40)path=s.update(t,state);
 const ys=[...path.matchAll(/[ML]\d+\.\d+ (\d+\.\d+)/g)].map(x=>x[1]);
 assert.equal(new Set(ys).size,1);
 assert.equal(s.update(540,{connected:true,measured:false,hr:null,rhythm:'sinus'}),'');
 assert.equal(s.info().samples,0);
});
