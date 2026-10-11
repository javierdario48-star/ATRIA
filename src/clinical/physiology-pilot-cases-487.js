import {PHYSIOLOGY_MODEL_487} from './physiology-pilot-definitions-487.js';
// Initial-state selection only. Drug mechanisms NEVER inspect these case IDs.
// Latent quantities for HDA/CIRR are explicit simulator estimates: these cases
// have no native internal physiology to copy. Do not present them as measured labs.
const profiles={
 'PERI-SEC-001':{volume:.60,tone:.68,pump:.88,renal:.70,hepatic:1,interstitial:0,
  inflammation:.78,infection:1,pain:.85,oxygenResponsiveness:.72,sourceControlled:false,
  pulmonarySusceptibility:.8,target:{min:90,max:96},
  natural:{bleedingMlPerMin:0,capillaryLeakMlPerMin:7.2,inflammationGrowthPerMin:.0042,
   infectionGrowthPerMin:.0005,sourceRequired:true,refillMlPerMin:2}},
 'HDA-001':{volume:.67,tone:1.05,pump:1,renal:.85,hepatic:1,interstitial:0,
  inflammation:0,infection:0,pain:.15,oxygenResponsiveness:.9,sourceControlled:true,
  pulmonarySusceptibility:.7,target:{min:94,max:98},
  natural:{bleedingMlPerMin:4,capillaryLeakMlPerMin:0,inflammationGrowthPerMin:0,
   infectionGrowthPerMin:0,sourceRequired:false,refillMlPerMin:2}},
 'CIRR-001':{volume:.78,tone:.82,pump:1,renal:.85,hepatic:.55,interstitial:4000,
  inflammation:0,infection:0,pain:.12,oxygenResponsiveness:.8,sourceControlled:true,
  pulmonarySusceptibility:.35,target:{min:94,max:98},
  natural:{bleedingMlPerMin:0,capillaryLeakMlPerMin:0,inflammationGrowthPerMin:0,
   infectionGrowthPerMin:0,sourceRequired:false,refillMlPerMin:8}}
};
export function createPilotProfile487(caseDef,initialPatient=null){
 const p=profiles[caseDef?.id];if(!p)throw Error('B1 profile unsupported '+caseDef?.id);
 const v=initialPatient?.liveVitals||caseDef.vitals||{},bp=String(caseDef.vitals?.bp||'120/80').split('/');
 const ph=initialPatient?.phys||caseDef.physiology||{};
 return {schemaVersion:1,modelVersion:PHYSIOLOGY_MODEL_487,caseId:caseDef.id,
  baselineVitals:{sys:Number(v.sys??bp[0]),dia:Number(v.dia??bp[1]),hr:Number(v.hr??90),
   rr:Number(v.rr??20),spo2:Number(v.spo2??96),temp:Number(v.temp??37)},
  circulatingVolumeMl:5000*Number(ph.effectiveVolume??p.volume),interstitialFluidMl:p.interstitial,
  vascularTone:Number(ph.svr??p.tone),pumpFunction:Number(ph.contractility??p.pump),
  renalFunction:Number(ph.renalReserve??p.renal),hepaticFunction:p.hepatic,
  inflammation:Number(ph.inflammation??p.inflammation),infectionBurden:p.infection,
  sourceControlled:initialPatient?.phys?.sourceControlled??p.sourceControlled,painDrive:p.pain,
  gasExchangeImpairment:Math.max(0,(98-Number(v.spo2??96))/35),oxygenResponsiveness:p.oxygenResponsiveness,
  oxygenTarget:{...p.target},euvolemicVolumeMl:5000,pulmonarySusceptibility:p.pulmonarySusceptibility,
  natural:{...p.natural},evidenceClass:'initial-vitals-from-repo; latent-profile-estimates'};
}
