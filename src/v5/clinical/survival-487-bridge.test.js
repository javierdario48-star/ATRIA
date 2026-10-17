import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceNativeSurvival} from './survival-487-bridge.js';
import {createGuardSession} from './guard-session.js';
import {runClinicalBotMatrix} from '../../../qa/v5/clinical-trajectory-bots.mjs';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const cirr=content.cases.find(c=>c.id==='CIRR-001');
function fixture(){
 return {uid:'P',liveVitals:{temp:37,hr:90,rr:35,sys:104,dia:66,spo2:75},
  procedures:{},administrationLog:[],treatments:[],caseEnded:false};
}
const time=(real,native)=>({clinicalMinute:real,nativeMinute:native});
test('V4 legacy initial grace is a hard minimum and severe vitals need time, not an immediate kill switch',()=>{
 const p=fixture();
 advanceNativeSurvival(p,cirr,'solo',time(0,0),time(100,12));
 assert.equal(p.patientDied,undefined);
 assert.equal(p.survival.exposureNativeMinutes,0);
 advanceNativeSurvival(p,cirr,'solo',time(100,12),time(179,21.48));
 assert.equal(p.patientDied,undefined);
 advanceNativeSurvival(p,cirr,'solo',time(179,21.48),time(180,21.6));
 assert.equal(p.patientDied,undefined);
 advanceNativeSurvival(p,cirr,'solo',time(180,21.6),time(190,22.8));
 assert.equal(p.patientDied,undefined);
 advanceNativeSurvival(p,cirr,'solo',time(190,22.8),time(192,23.04));
 assert.equal(p.patientDied,true);assert.equal(p.caseEnded,true);
 assert.equal(p.deathReason,'critical-hypoxemia');
 const frozen=structuredClone(p.survival);
 advanceNativeSurvival(p,cirr,'solo',time(192,23.04),time(240,28.8));
 assert.deepEqual(p.survival,frozen);
});
test('Pending, treatment flags and forged event IDs do not qualify for legacy rescue evidence',()=>{
 const p=fixture();p.treatments=[{id:'oxygen'}];
 p.pendingTreatments=[{id:'oxygen'}];
 const before=time(0,0),after=time(120,14.4);
 advanceNativeSurvival(p,cirr,'solo',before,after);
 assert.equal(p.survival.earnedCredit,0);
 assert.equal(p.survival.rescueStartedAtSec,null);
 p.administrationLog=[{id:'oxygen',sourceEventId:'x',patientUid:'elsewhere',action:'start'}];
 assert.throws(()=>advanceNativeSurvival(p,cirr,'solo',after,time(121,14.52)),/invalid native survival administration/);
});
test('V4 finite rescue evidence earns protected time without indefinite immunity or renewing after a second bolus',()=>{
 const p=fixture();p.venousAccessCount=1;p.procedures.monitor={connected:true};
 const dose=(id,event)=>({id,patientUid:'P',sourceEventId:event,
  dose:{amount:500,unit:'ml'},administeredAtNativeMinute:2,administeredAtRealSecond:20});
 // Genuine oxygen support includes active native receipt and a distinct bolus.
 p.procedures.oxygen={active:true,flowLpm:4,sourceEventId:'oxygen-on'};
 p.administrationLog=[
  {id:'oxygen',action:'start',sourceEventId:'oxygen-on',patientUid:'P',
   dose:{amount:4,unit:'L/min'},administeredAtNativeMinute:2},
  dose('fluid','bolus-1')];
 advanceNativeSurvival(p,cirr,'solo',time(0,0),time(30,3.6));
 assert(p.survival.earnedCredit>0);
 assert(p.survival.releaseAtRealSecond>180);
 const rescueStart=p.survival.rescueStartedAtSec;
 assert.equal(rescueStart,30);
 advanceNativeSurvival(p,cirr,'solo',time(30,3.6),time(70,8.4));
 assert.equal(p.survival.rescueStartedAtSec,rescueStart);
 p.administrationLog.push(dose('fluid','bolus-2'));
 advanceNativeSurvival(p,cirr,'solo',time(70,8.4),time(75,9));
 assert.equal(p.survival.rescueStartedAtSec,rescueStart,'another prescription cannot restart rescue');
 assert.equal(p.patientDied,undefined,'rescue and grace not immediate cure or death');
});
test('real session: stable untreated cirrhosis survives; fatal overload closes without XP or a false disposition',async()=>{
 const s=createGuardSession({roomId:'native-survival-qa',mode:'solo',actorId:'doctor',
  actorName:'Doctor',patient:{uid:'P',caseId:'CIRR-001'},content,
  resolveContext:()=>({patientUid:'P'})});
 try{
  s.advance(300);await s.flush();
  const p=s.read().patient;
  assert.equal(p.patientDied,undefined);
  assert.equal(p.caseEnded,false);
  assert.equal(p.survival.criticalCause,null);
 }finally{s.dispose();}
 const report=await runClinicalBotMatrix();
 for(const id of ['APP-001','CIRR-001']){
  const good=report.rows.find(r=>r.caseId===id&&r.strategy==='competent');
  const bad=report.rows.find(r=>r.caseId===id&&r.strategy==='iatrogenic-overload');
  assert.equal(good.closedStatus,'executed');
  assert.equal(good.closed.died,false);
  assert.equal(bad.terminal.died,true,'confirmed respiratory poisoning must become fatal after grace/exposure');
  assert.equal(bad.terminal.xp,0);
  assert.equal(bad.terminal.deathReason,'critical-hypoxemia');
 }
 assert(!report.gaps.some(x=>x.key.endsWith('/fatal-transition')));
 assert(report.gaps.some(x=>x.key==='APP-001/untreated-disease'));
 assert(report.gaps.some(x=>x.key==='clock/24h'));
});
