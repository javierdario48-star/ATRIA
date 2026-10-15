import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialAppVitals,parseAppDose,advanceAppVitals,APP_NATIVE_PREPARATION_SECONDS} from './native-app.js';
const c=JSON.parse(fs.readFileSync(new URL('../content/cases.json',import.meta.url))).find(c=>c.id==='APP-001');
const ref=JSON.parse(fs.readFileSync(new URL('../../../qa/v5/fixtures/app-native-reference.json',import.meta.url)));
const doses=JSON.parse(fs.readFileSync(new URL('../content/default-doses.json',import.meta.url)));

test('APP default and explicit doses match original reference, reject wrong dose/route',()=>{
 for(const scenario of ref.scenarios)for(const entry of scenario.doses){
  const text=scenario.orders.find(x=>x[0]===entry.id)[1];
  assert.deepEqual(parseAppDose(text,doses[entry.id]),entry.dose,entry.id);
  const def=parseAppDose(entry.id,doses[entry.id]);assert.equal(def.amount,entry.dose.amount);assert.equal(def.defaultApplied,true);
 }
 for(const text of ['ceftriaxona 500 mg','ceftriaxona 1 g 2 ml','ceftriaxona 0 g','ceftriaxona 1 g oral',
  'ceftriaxona -1 g','ceftriaxona 1 g 250 ml','metronidazol 1 g']){
  assert.throws(()=>parseAppDose(text,doses[text.startsWith('metro')?'metronidazole':'ceftriaxone']),/dose|route/i,text);
 }
 assert.equal(APP_NATIVE_PREPARATION_SECONDS.ceftriaxone,1.5);
 assert.equal(APP_NATIVE_PREPARATION_SECONDS.metronidazole,1.5);
 assert.equal(APP_NATIVE_PREPARATION_SECONDS.fluid,.8);
});

test('APP physiology exactly matches all frozen original 60Hz treatment trajectories',()=>{
 for(const scenario of ref.scenarios){
  const p={liveVitals:initialAppVitals(c),treatments:[]};
  const administrations=scenario.log.map(x=>({id:x.id,at:x.m/.12}));
  let real=0,done=0;
  for(const point of scenario.points){
   while(real<point.realSeconds-1e-10){
    const next=administrations[done]?.at??Infinity;
    const dt=Math.min(1/60,point.realSeconds-real,next>real+1e-10?next-real:Infinity);
    assert(dt>0,'positive simulated step');
    advanceAppVitals(p,c,dt);real+=dt;
    while(done<administrations.length&&real>=administrations[done].at-1e-10)
     p.treatments.push({id:administrations[done++].id});
   }
   for(const key of Object.keys(point.vitals))
    assert(Math.abs(p.liveVitals[key]-point.vitals[key])<1e-7,scenario.id+' '+point.realSeconds+' '+key);
  }
 }
});
