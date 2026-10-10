import {PHARMA_RULES_487,REFERENCE_DOSES_487,BASE_CASE_PHARMACOLOGY_487,csValidateDrug487,csCasePharmProfile487,
 csBuildPharmRegistry487,csPharmContext487,csPharmResponse487} from '../clinical/pharmacology-registry-487.js';
import {EXISTING_ABDOMINAL_COVERAGE_487,csPharmOutcomes487} from '../clinical/pharmacology-outcomes-487.js';

// Late, isolated bridge. Native septic physiology, source control, grace clock,
// case closure, and patient administration logs remain authoritative.
export function applyPharmacology487(html){
 if(html.includes('id="atria-case-aware-pharmacology-487"'))throw Error('duplicate pharmacology adapter');
 const script=`<script id="atria-case-aware-pharmacology-487">
(function(){
 'use strict';
 if(window.__csPharmacology487)return;
 const PHARMA_RULES_487=${JSON.stringify(PHARMA_RULES_487)};
 const REFERENCE_DOSES_487=${JSON.stringify(REFERENCE_DOSES_487)};
 const BASE_CASE_PHARMACOLOGY_487=${JSON.stringify(BASE_CASE_PHARMACOLOGY_487)};
 const EXISTING_ABDOMINAL_COVERAGE_487=${JSON.stringify(EXISTING_ABDOMINAL_COVERAGE_487)};
 const allowedModes=new Set(${JSON.stringify(['oxygenation','volume','albumin','pressor','opioid','analgesic','antiemetic','acid','blood','paracentesis','spironolactone','steroid','aza','antimicrobial','sourceControl','deprescribe','diuretic','betaBlocker','none','custom'])});
 const allowedRoutes=new Set(['iv','oral','inhaled','conditional','procedure','none']);
 const nonBlank=x=>typeof x==='string'&&!!x.trim();
 ${csValidateDrug487.toString()}
 ${csCasePharmProfile487.toString()}
 ${csBuildPharmRegistry487.toString()}
 ${csPharmContext487.toString()}
 ${csPharmResponse487.toString()}
 ${csPharmOutcomes487.toString()}
 const nativeIds=new Set(MONITOR_THERAPY_CATALOG.map(x=>x.id));
 let registry;
 function prepare(nextCases=CASES){
  const candidate=csBuildPharmRegistry487(MONITOR_THERAPY_CATALOG,nextCases);
  const additions=[];
  for(const item of candidate.drugs)if(!MONITOR_THERAPY_CATALOG.some(x=>x.id===item.id)){
   if(!item.aliases?.length||!item.pharmacology?.defaultDose)
    throw Error('unreviewed future drug '+item.id);
   additions.push({...item,effects:{}});
  }
  return {candidate,additions};
 }
 function publish(prepared){
  MONITOR_THERAPY_CATALOG.push(...prepared.additions);
  registry=prepared.candidate;
  return {cases:registry.profiles.length,drugs:registry.drugs.length};
 }
 function rebuild(){return publish(prepare());}
 let initial;
 try{initial=prepare();}
 catch(error){
  // QA fallback is not a compatible pharmacology candidate. Do not publish
  // wrappers, catalogue additions, public API or installed flag on rejection.
  window.csPharm487Boot=Object.freeze({status:'rejected',catalogCompatible:false,
   cases:CASES.length,drugs:MONITOR_THERAPY_CATALOG.length,
   error:String(error?.message||error)});
  return;
 }
 const originalDefaultDose=defaultDoseForTherapy;
 const nextDefaultDose=function(t,text){
  if(nativeIds.has(t?.id))return originalDefaultDose.apply(this,arguments);
  const declared=registry.drugs.find(d=>d.id===t?.id)?.pharmacology?.defaultDose;
  if(!declared)throw Error('No reviewed default drug dose '+t?.id);
  return {...declared,defaultApplied:true};
 };
 const originalEffects=therapyEffectTotals;
 const nextEffects=function(){
  const offsets=originalEffects.apply(this,arguments);
  if(!sim||!C||!sim.monitorTherapies)return offsets;
  const septic=['peritonitis','sepsis_source'].includes(C?.physiology?.engine);
  for(const x of sim.monitorTherapies.values()){
   const meta=registry.drugs.find(d=>d.id===x.id);
   if(!meta)continue;
   const elapsed=Math.max(0,Number(sim.gameMinute||0)-Number(x.startedAt??sim.gameMinute??0));
   const effect=csPharmResponse487(x.id,C,sim,elapsed,{},registry.drugs);
   if(!effect.known)continue;
   // Remove legacy permanent +X point effects only from nonseptic cases.
   if(!septic){
    for(const axis of Object.keys(offsets))offsets[axis]-=Number(x.effects?.[axis]||0);
   }else if(nativeIds.has(x.id)){
    // Never double-count established septic fluid/O2/pressor response.
    // Add only first-dose contextual opioid hypotension omitted by the legacy path.
    if(x.id==='morphine'){
     offsets.sys+=Math.min(0,Number(effect.offsets.sys||0));
     offsets.dia+=Math.min(0,Number(effect.offsets.dia||0));
    }
    continue;
   }
   const amount=Number(x.dose?.amount),std=Number(meta.pharmacology?.defaultDose?.amount??REFERENCE_DOSES_487[x.id]);
   const doseScale=Number.isFinite(amount)&&Number.isFinite(std)&&std>0?
    Math.max(.25,Math.min(1.6,amount/std)):1;
   for(const axis of Object.keys(offsets))offsets[axis]+=Number(effect.offsets[axis]||0)*doseScale;
  }
  if(!septic&&sim.csPharmOutcomes487?.coverageComplete){
   // In appendicitis/cholecystitis, infection improvement has a lag and
   // stays modest until the actual focus is controlled, never instant cure.
   offsets.temp-=Math.min(.55,Math.max(0,1-sim.csPharmOutcomes487.infectionBurdenIndex));
  }
  return offsets;
 };
 const previousUpdate=updateSimulation;
 const nextUpdate=function(dt){
  const target=sim,caseDef=C,result=previousUpdate.apply(this,arguments);
  if(target&&target===sim&&caseDef===C&&!target.caseEnded&&!target.patientDied)
   target.csPharmOutcomes487=csPharmOutcomes487(caseDef,target,registry.drugs);
  return result;
 };
 const previousGive=addMonitorTherapy;
 const nextGive=function(text){
  const patient=sim,caseDef=C,prior=Number(patient?.administrationLog?.length||0);
  // New IV molecules must not bypass completed vascular access when ordered
  // through the manual monitor. Legacy native dosing is not rewritten here.
  const normalized=String(text||'').toLowerCase().normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'');
  const newIV=registry.drugs.find(drug=>!nativeIds.has(drug.id)&&
   drug.pharmacology.route==='iv'&&drug.aliases.some(alias=>{
    const word=String(alias).toLowerCase().normalize('NFD')
     .replace(/[\u0300-\u036f]/g,'');
    return word.length>=3&&normalized.includes(word);
   }));
  if(newIV&&Number(patient?.venousAccessCount||0)<=0){
   if(patient)nurseSay('Falta vía venosa para '+newIV.label+'. No se administró.');
   return false;
  }
  const result=previousGive.apply(this,arguments);
  if(result===false||!patient||sim!==patient||!caseDef||!Array.isArray(patient.administrationLog)||
     patient.administrationLog.length<=prior)return result;
  const row=patient.administrationLog.at(-1),entry=patient.monitorTherapies?.get(row?.id);
  if(!entry)return result;
  const effect=csPharmResponse487(row.id,caseDef,patient,240,{},registry.drugs);
  for(const warning of effect.warnings||[]){
   const msg='Riesgo farmacológico: '+entry.label+' — '+warning;
   patient.adverseEvents??=[];
   if(patient.adverseEvents.includes(msg))continue;
   patient.adverseEvents.push(msg);
   patient.events?.push?.({m:patient.gameMinute,t:msg});
   if(patient===sim)nurseSay('Atención: '+entry.label+' ('+warning+'). Reevaluá los signos.');
  }
  return result;
 };
 const api={
  summary:()=>({cases:registry.profiles.length,drugs:registry.drugs.length}),
  drugs:()=>registry.drugs.map(x=>({id:x.id,label:x.label,route:x.pharmacology.route})),
  profile:id=>registry.profiles.find(x=>x.id===id),
  outcomes:(caseId,patient)=>csPharmOutcomes487(CASES.find(x=>x.id===caseId),patient,registry.drugs),
  rule:id=>registry.drugs.find(x=>x.id===id)?.pharmacology||null,
  requiresIV:id=>registry.drugs.find(x=>x.id===id)?.pharmacology?.route==='iv',
  preview:(id,caseId,patient,elapsed=120)=>csPharmResponse487(
   id,CASES.find(x=>x.id===caseId),patient,elapsed,{},registry.drugs),
  rebuild:()=>rebuild(),
  registerCase(caseDef){
   if(sim&&!sim.caseEnded)throw Error('Cannot register case during active shift');
   if(CASES.some(x=>x.id===caseDef?.id))throw Error('duplicate case '+caseDef?.id);
   const prepared=prepare([...CASES,caseDef]);
   CASES.push(caseDef);
   return publish(prepared);
  }
 };
 publish(initial);
 defaultDoseForTherapy=nextDefaultDose;
 therapyEffectTotals=nextEffects;
 updateSimulation=nextUpdate;
 addMonitorTherapy=nextGive;
 window.csPharm487=api;
 window.__csPharmacology487=true;
 window.csPharm487Boot=Object.freeze({status:'installed',catalogCompatible:true,
  cases:registry.profiles.length,drugs:registry.drugs.length});
})();
</script>`;
 return html.replace('</body>',script+'</body>');
}
