/**
 * QA-only Bot 2: compare the native (default) physiological engine against
 * explicitly ENABLED B1 Ringer owner on fresh local secondary peritonitis.
 * 40 L is an intentional in-game overdose stress test, NOT a medical dose.
 * Reports observed values and warnings instead of inventing harm to pass.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance}
 from './physiology-live/native-journey-487.mjs';
import {enableNativeRinger487} from './physiology-live/ringer-journey-487.mjs';
const scenarios=[],warnings=[],errors=[];
const times=[0,1,10,30,60];
const finite=['sys','dia','hr','rr','spo2'];
function read(r){
 const p=r.ctx.sim,v=p.liveVitals||{},ph=p.phys||{},owner=p.csRinger487;
 return {realSeconds:Number(r.clock.realSeconds.toFixed(2)),
  ...Object.fromEntries(finite.map(k=>[k,Number(v[k])])),
  effectiveVolume:ph.effectiveVolume==null?null:Number(ph.effectiveVolume),sourceControlled:!!ph.sourceControlled,
  nativeFluidMl:Number(p.therapyTotals?.fluidMl||0),
  overloadRisk:Number(ph.fluidOverloadRisk||ph.overloadRisk||0),
  confirmedFluidDoses:(p.administrationLog||[]).filter(x=>x.id==='fluid').length,
  owner:owner?.owner||null,ownerApplied:owner?.applications??null,
  ownerFluidMl:owner?.state?.administeredFluidMl??null,
  ownerInterstitialMl:owner?.state?.interstitialFluidMl??null,
  ownerOverloadRisk:owner?.state?.fluidOverloadRisk??null};
}
async function trial(engine,volume,amount,caseId='PERI-SEC-001'){
 const r=createLiveNativeJourney487(caseId,{confirmedIV:1}),p=r.ctx.sim;
 if(volume!==null)p.phys.effectiveVolume=volume;
 let api=null;if(engine==='b1-opt-in')api=await enableNativeRinger487(r);
 const trace=[read(r)],before=p.administrationLog.length;
 let accepted=null,error=null;
 const order=amount===0?'none':amount===40000?'Ringer 40000 ml':'Ringer '+amount+' ml';
 if(amount){
  try{accepted=r.ctx.addMonitorTherapy(order);}catch(e){error=e.message;}
 }
 for(const t of times.slice(1)){
  advance(r,t-r.clock.realSeconds,{dt:1/6});
  trace.push(read(r));
 }
 const ledger=p.administrationLog.slice(before).filter(x=>x.id==='fluid').map(x=>({
   id:x.id,dose:x.doseDisplay,amount:x.dose?.amount??null,
   defaultApplied:x.defaultApplied??null,pharmacologyVersion:x.pharmacology487?.schemaVersion??null}));
 const result={engine,caseId,initialVolume:volume,requestedMl:amount,
  order,accepted,error,ledger,trace,
  b1ExplicitlyEnabled:engine==='b1-opt-in',
  ownerFinal:api?.reportRinger?.()?.status??null,
  final:trace.at(-1)};
 if(amount&&ledger.length===0)warnings.push({engine,caseId,volume,amount,flag:'requested-but-not-administered',accepted,error});
 if(amount===40000&&ledger.length&&
    !ledger.some(x=>x.amount===40000||/40000|40[\s.,]*000/.test(x.dose||'')))
  warnings.push({engine,caseId,volume,flag:'40L-dose-not-confirmed-exactly',ledger});
 for(const snapshot of trace)for(const field of [...finite,'effectiveVolume'])
  if(snapshot[field]!==null&&!Number.isFinite(snapshot[field]))errors.push({engine,caseId,amount,field,value:snapshot[field]});
 if(p.phys?.sourceControlled)errors.push({engine,caseId,amount,flag:'Ringer-must-not-cure-infectious-focus'});
 scenarios.push(result);return result;
}
for(const engine of ['native-default','b1-opt-in'])for(const volume of [.45,1.05])
 for(const dose of [0,500,3000,40000])await trial(engine,volume,dose);
// New pilot deliberately restricted to PERI-SEC; compare another native case
// without pretending B1 runs there.
for(const amount of [0,500,3000,40000])await trial('native-default',null,amount,'CIRR-001');
const diffs=[];
for(const engine of ['native-default','b1-opt-in'])for(const volume of [.45,1.05]){
 const group=scenarios.filter(x=>x.engine===engine&&x.initialVolume===volume&&x.caseId==='PERI-SEC-001');
 const control=group.find(x=>x.requestedMl===0);
 for(const t of group.filter(x=>x.requestedMl)){
  const net={effectiveVolume:t.final.effectiveVolume-control.final.effectiveVolume,
   hr:t.final.hr-control.final.hr,sys:t.final.sys-control.final.sys,
   spo2:t.final.spo2-control.final.spo2,
   overloadRisk:t.final.overloadRisk-control.final.overloadRisk,
   b1OwnerRisk:(t.final.ownerOverloadRisk||0)-(control.final.ownerOverloadRisk||0)};
  diffs.push({engine,volume,dose:t.requestedMl,deltasVersusMatchedUntreated:net,
   actualDoses:t.ledger.length});
 }
 const low=group.find(x=>x.requestedMl===3000),huge=group.find(x=>x.requestedMl===40000);
 if(low.ledger.length&&huge.ledger.length&&huge.final.spo2>=low.final.spo2&&
  (huge.final.ownerOverloadRisk??huge.final.overloadRisk)<=(low.final.ownerOverloadRisk??low.final.overloadRisk))
  warnings.push({engine,volume,flag:'no-greater-oxygenation-or-risk-penalty-at-40L-versus-3L'});
}
// Exact order wording the user supplied: inspect actual native unit parsing.
// Do NOT falsely claim a 40 L dose if "40 litros" was treated as 40 ml.
{
 const r=createLiveNativeJourney487('PERI-SEC-001',{confirmedIV:1});
 const med=r.ctx.findMonitorTherapy('Ringer 40 litros');
 const parsed=med?r.ctx.parseTherapyOrder('Ringer 40 litros',med):null;
 const outcome={phrase:'Ringer 40 litros',recognized:med?.id||null,
  parsedAmount:parsed?.amount??null,parsedUnit:parsed?.unit??null,display:parsed?.display??null};
 if(med?.id==='fluid'&&parsed&&!(parsed.amount===40000&&parsed.unit==='ml'))
  warnings.push({flag:'40-litros-unit-parsing-mismatch',outcome});
 scenarios.push({type:'language-dose-parser',...outcome});
}
const result={schema:'atria-physiology-40l-audit/v1',
 scope:'generated native clinical VM, fresh local B1 separately enabled, no physical Android',
 engines:{nativeDefault:'Always active',b1:'disabled by default; explicit fresh PERI-SEC only'},
 tested:scenarios.length,errors,warnings,comparisons:diffs,scenarios};
fs.mkdirSync('qa/physiology-audit-results',{recursive:true});
fs.writeFileSync('qa/physiology-audit-results/ringer-40l.json',JSON.stringify(result,null,2)+'\n');
console.log('ATRIA 40L PHYSIOLOGY AUDIT',JSON.stringify({
 tested:result.tested,errors:errors.slice(0,6),warnings:warnings.slice(0,10),comparisons:diffs}));
assert.equal(errors.length,0,'all actual physiological metrics finite; no fictional source control');
