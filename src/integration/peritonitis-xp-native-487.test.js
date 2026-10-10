// Executes the *original* native career formula against ATRIA's injected
// disposition contract, with a partial anamnesis and real recorded treatment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';

const vendor=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const begin=vendor.indexOf('  csResultCareer=function(score,b){');
const end=vendor.indexOf('  function csDebriefMoments(){',begin);
assert(begin>0&&end>begin,'actual native V19 career implementation must exist');
const originalCareer=vendor.slice(begin,end);
const html=apply487(vendor);
const tag='<script id="atria-peritonitis-487-disposition">';
assert.equal(html.split(tag).length,2,'real disposition adapter installed');
const script=html.split(tag)[1].split('</script>')[0];
new vm.Script(originalCareer);new vm.Script(script);

const C={id:'PERI-SEC-001',risk:'shock',vitals:{bp:'82/48',spo2:91},physiology:{engine:'peritonitis',sourceControlRequired:true}};
const make=()=>({
 diagnosis:'peritonitis secundaria',intentHistory:[{id:'pain'}],
 lastVitalsKnown:true,examDone:true,examRegions:new Set(['abdomen']),
 orders:new Map(),administrationLog:['oxygen','fluid','ceftriaxone','metronidazole','vasopressor'].map(id=>({id,doseDisplay:'default'})),
 consults:new Map([['cirugia',{status:'done',accepted:true}]]),
 liveVitals:{sys:88,dia:55,spo2:95,hr:108},
 patientInstance:{uid:'safe-shock-1'},disposition:null,
 caseEnded:false,patientDied:false,deathAttributable:false,
 playMode:'solo',actionProvenance:[],gameMinute:6
});
let sim=make(),profile={xp:0,streak:0,bestStreak:0,reputation:55,recentScores:[],totalPatients:0,
 soloPatients:0,apprenticePatients:0,shiftPatients:0,safePatients:0,resolvedPatients:0,
 criticalSafePatients:0},careerReceipts=[],buttons=[];
const context={
 C,sim,selectedPlayMode:'solo',csProfile:profile,shiftSession:{active:true},
 CS_XP_PER_LEVEL:200,
 csLevel:()=>Math.floor(profile.xp/200)+1,
 csCheckCoatUnlock:()=>false,csSaveProfile:()=>{},csPlaySound:()=>{},
 csBumpCompetencies:()=>{},
 window:{nsMayExamine:()=>true,nsExperienceEligible:()=>false,
  nsCaseComplexity:()=>({factor:1,label:'critical'}),
  nsPracticeReward:()=>1,
  csSetDisposition:id=>{sim.disposition={id};return true}},
 performance:{now:()=>1000},
 document:{body:{classList:{contains:()=>false},appendChild:b=>buttons.push(b)},
  createElement:()=>({style:{},onclick:null,textContent:''})},
 nurseSay:()=>{},updateSimulation:()=>{},
 csBreakdown:()=>({score:29,safe:false,notes:[],safeReasons:['legacy'],diagnosis:0,
  history:2,safety:12,studies:0,treatment:5,efficiency:5,penalty:0,autonomy:100,critical:true}),
 csResultCareer:()=>{throw Error('native real career must replace this')},
 finishCase:()=>{
  if(sim.caseEnded)return;
  const before=context.csBreakdown();
  sim.caseEnded=true;
  // Re-render before payout, reproducing late continuous-shift UI callbacks.
  const after=context.csBreakdown();
  assert(after.safe,'post-closure scoring must retain authorized surgical handoff');
  const career=context.csResultCareer(before.score,before);
  careerReceipts.push(career);
 }
};
vm.createContext(context);
vm.runInContext(originalCareer,context,{timeout:3000});
vm.runInContext(script,context,{timeout:3000});
context.window.csPeritonitisRefresh487();
assert.equal(buttons.length,1,'bedside handoff appears');
assert.equal(buttons[0].textContent,'Derivar a quirófano','true surgical accept');
buttons[0].onclick();
assert.equal(sim.disposition.id,'quirofano');
assert.equal(careerReceipts.length,1,'one closure and one career calculation');
assert(careerReceipts[0].xp>0,'REAL career formula must give XP after complete safe transfer');
assert.equal(careerReceipts[0].resolved,true);
assert.equal(profile.safePatients,1);
assert.equal(profile.resolvedPatients,1);
assert.equal(profile.xp,careerReceipts[0].xp,'saved player XP agrees with displayed award');
const paid=profile.xp;
context.csBreakdown();context.csBreakdown();
assert.equal(context.window.nsExperienceEligible(),true,'post-close renderer cannot revoke XP');
buttons[0].onclick();
assert.equal(profile.xp,paid,'repeated click never duplicates earned XP');
assert.equal(careerReceipts.length,1);

const unsafe=make();unsafe.disposition={id:'alta'};unsafe.patientInstance.uid='wrong-discharge';
context.sim=unsafe;sim=unsafe;
profile.xp=paid;
const invalid=context.csBreakdown();
assert.equal(invalid.safe,false,'inappropriate discharge cannot get safe credit');
assert.equal(context.window.nsExperienceEligible(),false,'unsafe disposition cannot earn XP');
assert.equal(profile.xp,paid,'unsafe review makes no new XP');
console.log('REAL NATIVE SURGICAL XP CONTRACT PASS',JSON.stringify({
 mode:'solo',partialHistory:true,clinicalTreatments:5,score:careerReceipts[0].xp,
 earnedXP:paid,resolvedPatients:profile.resolvedPatients,lateReassessmentSafe:true,
 repeatedClickNoDuplicate:true,unsafeDischargeUnrewarded:true}));
