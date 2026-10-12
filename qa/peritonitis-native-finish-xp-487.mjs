/**
 * QA-only real native closure and XP for the THREE existing peritonitis owners.
 * Setup uses actual native monitor preparation/receipt; completed imaging and
 * accepted consultation are fixture prerequisites, not simulated diagnostic
 * workflows. The original native finishCase and V19 career scorer MUST run.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRealOutcomeJourney487} from './native-xp-outcome-fixture-487.mjs';
import {advanceNativeReference487} from './physiology-pilot/native-reference-487.mjs';

const situations=[
 {id:'PERI-PBE-001',diagnosis:'peritonitis bacteriana espontánea',
  study:'pbe_paracentesis',orders:['ceftriaxona 1 g','albúmina 1.5 g/kg'],receiver:null},
 {id:'PERI-SEC-001',diagnosis:'peritonitis secundaria',study:'peri_ct',
  orders:['ringer 500 ml','ceftriaxona 1 g','metronidazol 500 mg','oxigeno 4 L/min'],receiver:'cirugia'},
 {id:'PERI-TER-001',diagnosis:'peritonitis terciaria',study:'ter_ct',
  orders:['ringer 500 ml','imipenem 500 mg','oxigeno 4 L/min'],receiver:'uti'}
];
const rows=[];
for(const spec of situations){
 const rt=createRealOutcomeJourney487(spec.id),{ctx}=rt,p=ctx.sim,buttons=[];
 ctx.document.body.appendChild=element=>buttons.push(element);
 p.diagnosis=spec.diagnosis;p.lastVitalsKnown=true;p.examDone=true;
 p.intentHistory=[{id:'onset',reveal:'Clinical course documented'}];
 p.orders.set(spec.study,{id:spec.study,status:'done'});
 p.consults??=new Map();
 if(spec.receiver)p.consults.set(spec.receiver,{status:'done',accepted:true});
 const oldSourceControlled=p.phys?.sourceControlled;
 for(const order of spec.orders){
  const med=ctx.findMonitorTherapy(order);
  assert(med,spec.id+' native recognizer missing '+order);
  assert.equal(ctx.addMonitorTherapy(order),true,spec.id+' native order accepted '+order);
 }
 assert.equal(p.administrationLog.length,0,spec.id+' orders are not receipts');
 assert.equal(ctx.window.csPeritonitisAssessment487().ready,false,
  spec.id+' handoff must not be ready before medicine delivery');
 advanceNativeReference487(rt,.42);
 const verified=p.administrationLog.map(x=>x.id);
 for(const order of spec.orders){
  const id=ctx.findMonitorTherapy(order)?.id;
  assert(verified.includes(id),spec.id+' delivered native V19 receipt '+order);
 }
 const eligible=ctx.window.csPeritonitisAssessment487();
 assert(eligible?.ready,spec.id+' safe transfer after real receipts: '+JSON.stringify(eligible?.missing));
 ctx.window.csPeritonitisRefresh487();
 const button=buttons.find(x=>x.id==='csPeri487BedsideAction');
 assert(button?.onclick&&button.textContent===eligible.label,
  spec.id+' bedside destination option is exposed by real peritonitis owner');
 const before=ctx.csProfile.xp;
 button.onclick();
 assert.equal(p.caseEnded,true,spec.id+' actual native finishCase');
 assert.equal(p._careerEndProcessed,true,spec.id+' original career payout');
 assert.equal(p.nsOutcome?.career?.resolved,true,spec.id+' resolved native XP');
 if(!(p.nsOutcome?.career?.xpDelta>0))console.log('PERITONITIS XP NATIVE DIAGNOSTIC',JSON.stringify({id:spec.id,outcome:p.nsOutcome,breakdown:ctx.csBreakdown(),profile:ctx.csProfile,proof:p._csPeriSafeHandoff487,eligible:ctx.window.nsExperienceEligible(),exam:p.examDone,history:p.intentHistory,receipts:verified}));
 assert(p.nsOutcome?.career?.xpDelta>0,spec.id+' paid XP');
 assert.equal(ctx.csProfile.xp-before,p.nsOutcome.career.xpDelta,
  spec.id+' actual profile XP matches native career award');
 assert.equal(p.disposition.id,eligible.action,spec.id+' actual handoff destination');
 assert.equal(p.phys?.sourceControlled,oldSourceControlled,
  spec.id+' surgical referral cannot pretend source control');
 const awarded=ctx.csProfile.xp;
 button.onclick();
 assert.equal(ctx.csProfile.xp,awarded,spec.id+' duplicate handoff never awards XP');
 rows.push({id:spec.id,action:eligible.action,executed:verified,
  ended:!!p.caseEnded,nativeCareerProcessed:!!p._careerEndProcessed,
  xp:p.nsOutcome.career.xpDelta,duplicateSafe:true,sourceControlUnchanged:true});
}
const report={caseCount:3,actualNativeFinish:true,nativeCareerAwarded:true,
 realExecutedDrugs:true,fixtureStudyResults:true,fixtureAcceptedConsults:true,
 limitation:'Node generated native VM; UI/button source exact, no browser/touch/real study transport',rows};
fs.mkdirSync('qa/outcome-combinatorial-results',{recursive:true});
fs.writeFileSync('qa/outcome-combinatorial-results/peritonitis-native-finish-xp-487.json',
 JSON.stringify(report,null,2)+'\n');
console.log('ATRIA PERITONITIS ORIGINAL FINISH XP',JSON.stringify({
 cases:rows.map(x=>x.id),nativeFinished:rows.filter(x=>x.ended).length,
 paidXp:rows.map(x=>x.xp),sourceControlUnchanged:rows.every(x=>x.sourceControlUnchanged)
}));
