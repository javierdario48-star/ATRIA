import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAndroidIntegratedRuntime487,installAndroidClinicalJourney487} from './android-integrated-runtime-487.mjs';
import {advanceLiveNativeJourney487 as advance} from './physiology-live/native-journey-487.mjs';
import {CARE_JOURNEYS_487} from './clinical-care-journeys-487.js';
import {CASE_CLOSURE_RULES_487} from '../src/clinical/case-completion-487.js';
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
 sourceControlled:p.phys.sourceControlled,actual:p.administrationLog,nativeOutcomeHTML:r.finalOutcomeHTML};
fs.mkdirSync('qa/android-fix-results',{recursive:true});
fs.writeFileSync('qa/android-fix-results/xp.json',JSON.stringify(result,null,2)+'\n');
console.log('ANDROID INTEGRATED XP',JSON.stringify({ended:result.ended,score:result.score,career:result.career,profileXP:result.profileXP}));
assert.equal(p.caseEnded,true,'genuine native finish');
assert.equal(p.nsOutcome.score,87,'capture quality reproduced by native scoring');
assert.equal(p.nsOutcome.career.safe,true,'attention safe');
assert(r.finalOutcomeHTML.includes('87/100')&&r.finalOutcomeHTML.includes('ATENCIÓN SEGURA'),'genuine native result HTML agrees with safe score');
assert(r.finalOutcomeHTML.includes('+195 XP')&&!r.finalOutcomeHTML.includes('0 XP · manejo incompleto'),'genuine native reward card agrees with career');
assert(p.nsOutcome.career.xpDelta>0,'genuine V19 XP credited despite unperformed source control');
assert.equal(ctx.csProfile.xp,p.nsOutcome.career.xpDelta);
assert.equal(r.persistedProfiles.at(-1).xp,ctx.csProfile.xp,'native save called with earned XP');
assert.equal(ctx.csLoadProfile().xp,ctx.csProfile.xp,'native load restores earned XP');
assert.equal(r.hud.nsXPText.textContent,'195 / 200 XP','native HUD matches earned saldo, including native complexity');
assert.equal(r.hud.nsXPFill.style.width,'97.5%');
action.onclick();ctx.finishCase('completed');
assert.equal(ctx.csProfile.xp,result.profileXP,'no duplicate award');
const earned=ctx.csProfile.xp,oldUID=p.patientInstance.uid;
p.patientInstance.uid='different-encounter';
assert.equal(ctx.window.nsExperienceEligible(),false,'handoff proof cannot migrate between patient identities');
p.patientInstance.uid=oldUID;
ctx.C=ctx.CASES.find(c=>c.id==='CIRR-001');ctx.sim=ctx.freshSim();
ctx.csRefreshProfileSurfaces();
assert.equal(ctx.csProfile.xp,earned,'next patient preserves profile XP');
assert.equal(ctx.csLoadProfile().xp,earned);
assert.equal(r.hud.nsXPText.textContent,'195 / 200 XP');
assert.equal(ctx.sim._csPeriSafeHandoff487,undefined,'new patient has no prior handoff proof');

const rows=[];
function prepare(id,{quality='minimum',mode='solo',requestedOnly=false,pendingConsult=false}={}){
 const rt=createAndroidIntegratedRuntime487(id,{confirmedIV:1,mode}),c=rt.ctx.C,s=rt.ctx.sim;
 const plan=CARE_JOURNEYS_487[id],rule=CASE_CLOSURE_RULES_487[id];
 s.diagnosis=c.dx[0];s.lastVitalsKnown=true;s.examDone=true;s.reassessments=1;
 s.intentHistory=[{id:c.requiredHistory[0]||'anamnesis:reason'}];
 const study=rule?.study[0][0]||{'PERI-PBE-001':'pbe_paracentesis','PERI-SEC-001':'peri_ct','PERI-TER-001':'ter_ct'}[id];
 s.orders.set(study,{id:study,status:'done'});
 for(const support of plan.support)if(support!=='iv')s.interventions.add(support);
 const receiver=rule?(rule.consult?.[plan.destination]?.[0]||null):plan.consult;
 if(receiver)s.consults.set(receiver,{status:pendingConsult?'pending':'done',accepted:!pendingConsult});
 if(quality==='complete'){
  s.intentHistory=c.requiredHistory.map(id=>({id})).concat(['anamnesis:pmh','anamnesis:allergies','anamnesis:meds','anamnesis:surgeries'].map(id=>({id})));
  for(const id of c.keyStudies)s.orders.set(id,{id,status:'done'});
 }
 if(plan.orders.length)rt.ctx.nurseNatural('Enfermera '+plan.orders.join(', '));
 if(!requestedOnly){
  advance(rt,3,{dt:1/6});
  if(s.liveVitals.spo2<90){rt.ctx.nurseNatural('Enfermera oxígeno');advance(rt,1,{dt:1/6});}
 }
 return {rt,s,c,receiver,plan};
}
function close(rt,destination){
 if(CASE_CLOSURE_RULES_487[rt.ctx.C.id])return rt.ctx.window.csFinalizeCase487(destination);
 rt.ctx.window.csPeritonitisRefresh487();
 const b=rt.elements.find(b=>b.id==='csPeri487BedsideAction');b?.onclick?.();
 return !!rt.ctx.sim.caseEnded;
}
for(const id of Object.keys(CARE_JOURNEYS_487))for(const mode of ['solo','apprentice']){
 console.log('XP MATRIX CHECKPOINT',id,mode);
 let minimum;
 for(const quality of ['minimum','complete']){
  const {rt,s,plan}=prepare(id,{quality,mode}),sourceControl=s.phys?.sourceControlled;
  assert(close(rt,plan.destination),id+'/'+mode+'/'+quality+' genuine finish');
  const career=s.nsOutcome.career;
  assert(career.xpDelta>0&&rt.ctx.csProfile.xp===career.xpDelta,id+' native profile credit');
  assert.equal(rt.ctx.csLoadProfile().xp,career.xpDelta,id+' native persistent load');
  assert.equal(s.phys?.sourceControlled,sourceControl,id+' no post-referral source-control requirement');
  const saved=rt.ctx.csProfile.xp;rt.ctx.finishCase('completed');assert.equal(rt.ctx.csProfile.xp,saved,id+' single payout');
  if(quality==='minimum')minimum=career.xpDelta;else assert(career.xpDelta>minimum,id+' quality improves original XP');
  rows.push({id,mode,quality,score:s.nsOutcome.score,xp:career.xpDelta,
   actual:s.administrationLog.map(x=>x.id),nativeFinished:!!s._careerEndProcessed,savedXP:rt.ctx.csLoadProfile().xp});
 }
 for(const requestedOnly of [true,false]){
  const {rt,s,plan,receiver}=prepare(id,{mode,requestedOnly,pendingConsult:!requestedOnly});
  if(!requestedOnly&&!receiver)continue;
  if(requestedOnly&&!plan.orders.length)continue;
  assert.equal(close(rt,plan.destination),false,id+' '+(requestedOnly?'requested-only':'pending consult')+' cannot close');
  assert.equal(rt.ctx.csProfile.xp,0,id+' incomplete care cannot earn XP');
 }
}
assert(rows.some(x=>x.score<70&&x.xp>0),'legitimate low score earns XP');

// V412 must retain the existing ten-case spoken disposition wrapper too.
for(const [id,q] of [['CIRR-001','internar en sala'],['HDA-001','derivar a endoscopia']]){
 const {rt,s}=prepare(id);rt.ctx.sendMessage('Enfermera '+q);advance(rt,1,{dt:1/6});
 assert.equal(s.caseEnded,true,id+' native late voice still reaches genuine finalizer');
 assert(rt.ctx.csProfile.xp>0,id+' spoken closure pays original career XP');
}

// One journey starts with EMPTY evidence and performs native interview,
// all five examination techniques, nurse access/monitor/medications, actual
// laboratory collection and native Surgery response before clicking handoff.
const full=createAndroidIntegratedRuntime487();installAndroidClinicalJourney487(full);
assert.equal(full.ctx.sim.orders.size,0);assert.equal(full.ctx.sim.administrationLog.length,0);
full.ctx.patientReply('desde cuando');
for(const technique of ['general','inspection','palpation','percussion','auscultation'])full.ctx.window.nsRecordPhysicalExam(technique);
full.ctx.nurseNatural('Enfermera vías y monitor, Ringer, oxígeno, ceftriaxona y metronidazol');
full.ctx.orderStudy(full.ctx.C.studies.find(s=>s.id==='peri_cbc'));
full.ctx.sim.diagnosis='peritonitis secundaria'; // learner diagnostic input
advance(full,60,{dt:1/6});
full.ctx.recordVitals('Reevaluación tras soporte');
full.ctx.window.csSurgery487Request();advance(full,4,{dt:1/6});
assert.equal(full.ctx.sim.examDone,true);assert.equal(full.ctx.sim.venousAccessCount,2);
assert.equal(full.ctx.sim.orders.get('peri_cbc').status,'done','native study collection/timer');
assert.equal(full.ctx.sim.consults.get('cirugia').status,'done','native accepted surgical consultation');
assert(close(full,'quirofano'),'full empty-evidence clinical journey closes');
assert(full.ctx.sim.nsOutcome.career.xpDelta>0,'full journey pays genuine XP');
const report={capture:{score:result.score,xp:result.profileXP,hud:'195 / 200 XP',duplicateSafe:true,nextPatientPersists:true},
 cases:13,paidScenarios:rows.length,rows,
 fullJourney:{score:full.ctx.sim.nsOutcome.score,xp:full.ctx.csProfile.xp,
  studyFixture:false,consultFixture:false,examFixture:false,medicationFixture:false,
  nativeStudy:full.ctx.sim.orders.get('peri_cbc'),nativeConsult:full.ctx.sim.consults.get('cirugia')},
 scope:'generated native VM, late scripts, native save/load/HUD; DOM/storage/path surfaces emulated. Other matrix study/consult prerequisites are fixtures.',physicalAndroid:false};
fs.writeFileSync('qa/android-fix-results/xp-matrix.json',JSON.stringify(report,null,2)+'\n');
console.log('ANDROID INTEGRATED XP MATRIX',JSON.stringify({cases:13,paid:rows.length,lowScores:rows.filter(x=>x.score<70).map(x=>({id:x.id,score:x.score,xp:x.xp})),
 fullJourney:{score:full.ctx.sim.nsOutcome.score,xp:full.ctx.csProfile.xp}}));
