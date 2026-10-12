import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAndroidIntegratedRuntime487} from './android-integrated-runtime-487.mjs';
import {advanceLiveNativeJourney487 as advance} from './physiology-live/native-journey-487.mjs';
const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:1}),{ctx}=r,p=ctx.sim,buttons=[];
ctx.document.body.appendChild=b=>buttons.push(b);
p.diagnosis='peritonitis secundaria';p.lastVitalsKnown=true;p.examDone=true;p.reassessments=1;
p.intentHistory=[{id:ctx.C.requiredHistory[0]}];
for(const id of ['peri_cbc','peri_ct'])p.orders.set(id,{id,status:'done'});
p.consults.set('cirugia',{status:'done',accepted:true});
ctx.window.csQueueMonitor();
for(const q of ['Ringer','ceftriaxona','metronidazol','oxígeno'])assert.equal(ctx.addMonitorTherapy(q),true);
advance(r,5,{dt:1/6});
ctx.window.csPeritonitisRefresh487();
const action=buttons.find(b=>b.id==='csPeri487BedsideAction');
assert(action?.onclick,'real handoff button visible');
action.onclick();
const result={ended:p.caseEnded,score:p.nsOutcome?.score,safe:p.nsOutcome?.breakdown?.safe,
 career:p.nsOutcome?.career,profileXP:ctx.csProfile.xp,persisted:r.persistedProfiles,
 proof:p._csPeriSafeHandoff487,eligibility:ctx.window.nsExperienceEligible(),
 sourceControlled:p.phys.sourceControlled,actual:p.administrationLog};
fs.mkdirSync('qa/android-fix-results',{recursive:true});
fs.writeFileSync('qa/android-fix-results/xp.json',JSON.stringify(result,null,2)+'\n');
console.log('ANDROID INTEGRATED XP',JSON.stringify({ended:result.ended,score:result.score,career:result.career,profileXP:result.profileXP}));
assert.equal(p.caseEnded,true,'genuine native finish');
assert.equal(p.nsOutcome.score,87,'capture quality reproduced by native scoring');
assert.equal(p.nsOutcome.career.safe,true,'attention safe');
assert(p.nsOutcome.career.xpDelta>0,'genuine V19 XP credited despite unperformed source control');
assert.equal(ctx.csProfile.xp,p.nsOutcome.career.xpDelta);
assert.equal(r.persistedProfiles.at(-1).xp,ctx.csProfile.xp,'native save called with earned XP');
action.onclick();ctx.finishCase('completed');
assert.equal(ctx.csProfile.xp,result.profileXP,'no duplicate award');
