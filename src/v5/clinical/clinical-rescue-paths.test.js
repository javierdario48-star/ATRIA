import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceNativeSurvival} from './survival-487-bridge.js';
const cases=JSON.parse(readFileSync(new URL('../content/cases.json',import.meta.url)));
const cirr=cases.find(x=>x.id==='CIRR-001');
const clock=(real)=>({clinicalMinute:real,nativeMinute:real*.12});
const baseline=()=>({uid:'P',caseEnded:false,liveVitals:{temp:37,hr:105,rr:34,sys:92,dia:55,spo2:75},
 procedures:{},treatments:[],administrationLog:[],venousAccessCount:0});
function support(p){
 p.venousAccessCount=1;p.procedures.monitor={connected:true};
 p.procedures.oxygen={active:true,flowLpm:4,sourceEventId:'oxygen-on'};
 p.administrationLog.push({id:'oxygen',action:'start',patientUid:'P',sourceEventId:'oxygen-on',
  dose:{amount:4,unit:'L/min'},administeredAtNativeMinute:15});
 const fluid={id:'fluid',patientUid:'P',sourceEventId:'fluid-1',
  dose:{amount:500,unit:'ml'},administeredAtNativeMinute:15};
 p.administrationLog.push(fluid);p.treatments.push({...fluid});
}
test('early confirmed rescue and normalized measurements lead to survival; pending prescriptions cannot substitute',()=>{
 const p=baseline();advanceNativeSurvival(p,cirr,'solo',clock(0),clock(120));
 assert.equal(p.survival.earnedCredit,0);
 support(p);advanceNativeSurvival(p,cirr,'solo',clock(120),clock(150));
 assert(p.survival.releaseAtRealSecond>180);
 assert.equal(p.survival.rescueStartedAtSec,150);
 p.liveVitals.spo2=95;p.liveVitals.rr=19;
 advanceNativeSurvival(p,cirr,'solo',clock(150),clock(160));
 advanceNativeSurvival(p,cirr,'solo',clock(160),clock(600));
 assert.equal(p.patientDied,undefined);
 assert.equal(p.caseEnded,false);
 assert.equal(p.survival.exposureNativeMinutes,0);
});
test('late care after real fatal exposure can neither resurrect patient nor earn an XP closure',()=>{
 const p=baseline();
 advanceNativeSurvival(p,cirr,'solo',clock(0),clock(120));
 advanceNativeSurvival(p,cirr,'solo',clock(120),clock(180));
 advanceNativeSurvival(p,cirr,'solo',clock(180),clock(192));
 assert.equal(p.patientDied,true);
 assert.equal(p.caseEnded,true);
 const prior=structuredClone(p.survival);
 support(p);p.liveVitals.spo2=97;
 advanceNativeSurvival(p,cirr,'solo',clock(192),clock(400));
 assert.equal(p.patientDied,true);
 assert.deepEqual(p.survival,prior);
});
