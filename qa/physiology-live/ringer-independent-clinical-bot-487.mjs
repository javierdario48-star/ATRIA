/**
 * Independent, evidence-based QA oracle for Ringer/PERI-SEC. Runs the real
 * generated HTML nursing/medical functions inside Node VM; NOT a browser,
 * medical prescription, reference clinical dataset or treatment activation.
 *
 * Two tiers:
 * (1) hard invariants independently anchored in sepsis/Ringer guidance;
 * (2) diagnostic clinical-validity flags: do NOT tweak physiology to pass.
 * With --require-clinical-ready, report identified model limitations as FAIL.
 *
 * Sources checked 2026-10-11:
 * SSC2026 https://sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026
 * Volume kinetics review PMID:31863457 https://pubmed.ncbi.nlm.nih.gov/31863457/
 * Ringer US label https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d3d29c8f-c326-4097-814a-7f4e08c67068
 *
 * SSC: balanced crystalloids reasonable first line; initial 30 ml/kg is a
 * conditional INITIAL resuscitation suggestion, NOT a fixed target for each
 * patient and NOT an expectation that 500 ml normalizes mean pressure.
 * Dynamic fluid responsiveness and repeated reassessment are required.
 */
import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487}
 from './native-journey-487.mjs';
import {enableNativeRinger487} from './ringer-journey-487.mjs';
import {pilotFluidOverloadRisk487} from '../../src/clinical/physiology-pilot-487.js';

const sources={
  ssc2026:'https://sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026',
  kinetics:'https://pubmed.ncbi.nlm.nih.gov/31863457/',
  ringerLabel:'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d3d29c8f-c326-4097-814a-7f4e08c67068'
};
const tpoints=[1,10,30,60],round=n=>Number(Number(n).toFixed(5));
const dataset=[],flags=[],accepted=[];
async function journey({id,volume=.45,dose=0,renal,highRisk=false}){
 const r=createLiveNativeJourney487('PERI-SEC-001');
 r.ctx.sim.phys.effectiveVolume=volume;
 if(renal!==undefined)r.ctx.sim.phys.renalReserve=renal;
 const api=await enableNativeRinger487(r);
 if(dose>0)r.ctx.nurseNatural('enfermera Ringer '+dose+' ml IV');
 let previous=0,points=[];
 for(const second of tpoints){
  advanceLiveNativeJourney487(r,second-previous);previous=second;
  const p=r.ctx.sim,v=p.liveVitals,ph=p.phys,report=api.reportRinger();
  const sample={second,sys:round(v.sys),dia:round(v.dia),map:round((v.sys+2*v.dia)/3),
   hr:round(v.hr),rr:round(v.rr),spo2:round(v.spo2),
   effectiveVolume:round(ph.effectiveVolume),sourceControlled:ph.sourceControlled,
   administeredFluidMl:p.therapyTotals.fluidMl,
   applications:report.applications,interstitialFluidMl:round(report.state.interstitialFluidMl),
   overloadRisk:round(report.state.fluidOverloadRisk),
   rescueSeconds:round(p._criticalSupport487?.elapsedSeconds||0)};
  for(const key of ['sys','dia','map','hr','rr','spo2','effectiveVolume','interstitialFluidMl','overloadRisk'])
   assert(Number.isFinite(sample[key]),id+' '+second+' not finite '+key);
  points.push(sample);
 }
 assert.equal(r.ctx.sim.administrationLog.filter(e=>e.id==='fluid').length,dose>0?1:0,
   id+': one confirmed treatment required; no ghost orders');
 assert.equal(api.reportRinger().applications,dose>0?1:0,id+': owner applied dose incorrect number of times');
 assert(points.every(x=>x.sourceControlled===false),id+': fluids must not control infection source');
 assert(points.every(x=>x.spo2>=40&&x.spo2<=100),id+': invalid oxygen observable');
 assert(points.every(x=>x.effectiveVolume>=0),id+': negative circulating volume');
 const row={id,initialNormalizedVolume:volume,renalReserve:renal??null,
  doseMl:dose,points,owner:api.reportRinger().owner};
 dataset.push(row);return row;
}
const at=(row,second)=>row.points.find(p=>p.second===second);
const issue=(severity,id,evidence,source,whatIsMissing)=>{
 flags.push({severity,id,evidence,source,whatIsMissing});};

// Real local PERI-SEC, different administered volumes.
const untreated=await journey({id:'septic-deficit-untreated',dose:0});
const tiny=await journey({id:'septic-deficit-50ml',dose:50});
const medium=await journey({id:'septic-deficit-500ml',dose:500});
const large=await journey({id:'septic-deficit-1500ml',dose:1500});
const veryLarge=await journey({id:'septic-deficit-3000ml',dose:3000});
const euvolemic500=await journey({id:'near-euvolemic-500ml',dose:500,volume:1.05});
const euvolemic3000=await journey({id:'near-euvolemic-3000ml',dose:3000,volume:1.05});
const damagedRenal=await journey({id:'hypovolemia-renal-reserve-low-500ml',dose:500,renal:.2});

assert(at(medium,10).effectiveVolume>at(untreated,10).effectiveVolume,
 'in deficit Ringer should transiently increase circulation, not disappear');
assert(at(medium,10).map>at(untreated,10).map,
 'in deficit, fluid should at least improve early MAP in this simulated responder');
assert(at(veryLarge,10).effectiveVolume>=at(medium,10).effectiveVolume,
 'larger crystalloid amount must not deliver less cumulative volume in this simple identical case');
assert(at(euvolemic3000,30).overloadRisk>at(euvolemic500,30).overloadRisk,
 'larger volume with preserved compartments should increase pulmonary risk');
assert(at(euvolemic3000,30).spo2<at(euvolemic500,30).spo2,
 'overload complication should be visible in oxygenation');
assert(at(medium,30).sourceControlled===false,'bolus is not source control');
assert(at(damagedRenal,30).applications===1,'kidney function must not fabricate administration');
accepted.push('confirmed delivery only','early circulatory benefit in simulated responder',
 'worse congestion after excessive fluid in initially replete patient','no fictional infection source control',
 'finite and single-owner physiology, preserving native nursing');

// The following checks are independent clinical REVIEW FLAGS, not automatic
// exact-value oracles; no published source supports a mmHg target per 500 ml.
const immediateShare=(at(medium,1).interstitialFluidMl-at(untreated,1).interstitialFluidMl)/500;
if(immediateShare>.65)
 issue('high','instant-fixed-interstitial-share',
 {observedInterstitialShare:round(immediateShare),accepted500ml:true,modelKind:'instant B1 bolus, no infusion duration'},
 sources.kinetics,
 'Published crystalloid distribution is time/rate dependent; an immediate fixed fraction is not a validated kinetics model.');

for(const row of [medium,large,veryLarge]){
 const p10=at(row,10),p60=at(row,60),u10=at(untreated,10);
 if(p10.effectiveVolume<.85&&p10.overloadRisk>.05&&p10.spo2<u10.spo2-.4)
  issue('high','hypovolemic-pulmonary-penalty-'+row.doseMl,
   {doseMl:row.doseMl,volume10:p10.effectiveVolume,risk10:p10.overloadRisk,
    spo2WithFluid:p10.spo2,spo2WithoutFluid:u10.spo2},
   sources.ssc2026+' + '+sources.kinetics,
   'Ringer produces pulmonary penalty while effective volume remains low. Capillary-leak lung injury is possible, but static dose-attributed interstitium is not evidence of pulmonary edema.');
 if(p60.interstitialFluidMl===p10.interstitialFluidMl&&p60.interstitialFluidMl>0)
  issue('high','no-interstitial-turnover-'+row.doseMl,
   {doseMl:row.doseMl,interstitial10:p10.interstitialFluidMl,interstitial60:p60.interstitialFluidMl,
    normalizedVolume60:p60.effectiveVolume},
   sources.kinetics,
   'Fluid kinetics should track redistribution/elimination/lymphatic return instead of a permanent dose-counter used for lung penalty.');
}
if(Math.abs(at(medium,60).effectiveVolume-at(untreated,60).effectiveVolume)<1e-5 &&
   at(medium,60).effectiveVolume<.3)
 issue('moderate','volume-floor-collapses-treatment-differences',
  {without60:at(untreated,60).effectiveVolume,with500at60:at(medium,60).effectiveVolume,
   with1500at60:at(large,60).effectiveVolume},
  sources.ssc2026,
  'Review ceiling/floor disease model and fluid responsiveness; convergence can reflect refractory shock, not proof Ringer is ineffective.');
if(at(medium,30).map<65)
 issue('context','bolus-alone-does-not-achieve-septic-map-target',
 {doseMl:500,map30:at(medium,30).map,untreatedMap30:at(untreated,30).map},
 sources.ssc2026,
 'This is not an automatic failure: 500 ml cannot be expected to normalize septic shock. Requires vasopressor and reassessment scenarios.');
if(at(damagedRenal,30).overloadRisk===at(medium,30).overloadRisk)
 issue('moderate','renal-risk-does-not-distinguish-after-one-bolus',
 {normalRenal:at(medium,30).overloadRisk,renalImpairment:at(damagedRenal,30).overloadRisk},
 sources.ringerLabel,'Individualized fluid risk with renal dysfunction has not been demonstrated.');

const summary={schema:'atria-independent-ringer-oracle/v1',headReference:'29e816c9e773ada5d481b0c7cdd0418dda700dd4',
 testedThrough:'generated native nursing & clinical Node VM, real experimental QA ownership, not graphical browser',
 references:sources,scenarioCount:dataset.length,hardChecksPassed:accepted,clinicalFlags:flags,
 clinicalReadiness:flags.some(f=>f.severity==='high')?'blocked-pending-medical-calibration':'requires-review',
 physicalAndroid:false,fullBrowser:false,dataset};

console.log('RINGER INDEPENDENT CLINICAL BOT',JSON.stringify(summary));
if(process.argv.includes('--require-clinical-ready')&&flags.some(x=>x.severity==='high')){
 console.error('RINGER CLINICAL READINESS GATE FAILED: '+flags.filter(x=>x.severity==='high').map(x=>x.id).join(', '));
 process.exitCode=1;
}
