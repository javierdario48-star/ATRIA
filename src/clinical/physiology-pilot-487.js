import {PILOT_DEFINITIONS_487,PHYSIOLOGY_MODEL_487} from './physiology-pilot-definitions-487.js';

const MINUTE_US=60000000,QUANTUM_US=15000000,LN2=Math.log(2),MAX_EVENTS=2048;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,label,a=0,b=1e9)=>{
 if(typeof x!=='number'||!Number.isFinite(x)||x<a||x>b)throw Error('invalid '+label);return x;
};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function timeUs(x){finite(x,'clinical time',0,1e6);return Math.round(x*MINUTE_US);}
function flow(s){return s.pumpFunction*clamp(s.circulatingVolumeMl/s.profile.euvolemicVolumeMl,.05,1.05)/
 (1+.45*Math.max(0,s.vascularTone-1.3));}
function refresh(s){
 const f=flow(s),map=s.anchor.map*f/s.anchor.flow*s.vascularTone/s.anchor.tone;
 s.perfusion=clamp(f*Math.min(1,map/65)*(1-.25*s.ischemiaRisk),0,1.2);
 s.fluidOverloadRisk=clamp(Math.max(0,s.circulatingVolumeMl-s.profile.euvolemicVolumeMl)/1500+
  Math.max(0,s.interstitialFluidMl-s.profile.interstitialFluidMl)/3500,0,1)*s.profile.pulmonarySusceptibility;
}
export function createPhysiologyState487(profile,patientId){
 if(profile?.schemaVersion!==1||profile.modelVersion!==PHYSIOLOGY_MODEL_487)throw Error('incompatible physiology version');
 if(typeof patientId!=='string'||!patientId||patientId.length>160)throw Error('patient identity required');
 const p=structuredClone(profile);
 for(const key of ['circulatingVolumeMl','euvolemicVolumeMl'])finite(p[key],key,500,20000);
 finite(p.interstitialFluidMl,'interstitial volume',0,50000);
 for(const key of ['vascularTone','pumpFunction'])finite(p[key],key,.1,3);
 for(const key of ['renalFunction','hepaticFunction','gasExchangeImpairment','oxygenResponsiveness',
  'painDrive','pulmonarySusceptibility'])finite(p[key],key,0,1);
 finite(p.inflammation,'inflammation',0,2);finite(p.infectionBurden,'infection burden',0,2);
 if(typeof p.sourceControlled!=='boolean'||typeof p.natural?.sourceRequired!=='boolean')throw Error('source status required');
 for(const key of ['bleedingMlPerMin','capillaryLeakMlPerMin','inflammationGrowthPerMin','infectionGrowthPerMin','refillMlPerMin'])
  finite(p.natural[key],'natural rate '+key,0,100);
 const ranges={sys:[10,350],dia:[1,250],hr:[25,230],rr:[3,60],spo2:[40,100],temp:[33,43]};
 for(const [key,[min,max]]of Object.entries(ranges))finite(p.baselineVitals?.[key],'baseline '+key,min,max);
 if(p.baselineVitals.sys<=p.baselineVitals.dia)throw Error('invalid baseline pressure');
 finite(p.oxygenTarget?.min,'oxygen target',80,98);finite(p.oxygenTarget?.max,'oxygen target',p.oxygenTarget.min,99);
 const s={schemaVersion:1,modelVersion:PHYSIOLOGY_MODEL_487,patientId,profile:freeze(p),
  requestedUs:0,requestedRemainderUs:0,integratedUs:0,requestedClinicalMinute:0,clinicalMinute:0,
  circulatingVolumeMl:p.circulatingVolumeMl,interstitialFluidMl:p.interstitialFluidMl,
  vascularTone:p.vascularTone,pumpFunction:p.pumpFunction,renalFunction:p.renalFunction,
  hepaticFunction:p.hepaticFunction,inflammation:p.inflammation,infectionBurden:p.infectionBurden,
  sourceControlled:p.sourceControlled,gasExchangeImpairment:p.gasExchangeImpairment,
  oxygenSupport:0,oxygenFlowLpm:0,oxygenResponseHalfLifeMin:.25,pain:p.painDrive,respiratoryDepression:0,sedation:0,
  perfusion:0,fluidOverloadRisk:0,ischemiaRisk:0,drugDiuresisMlPerMin:0,
  cumulativeUrineMl:0,cumulativeBloodLossMl:0,administeredFluidMl:0,
  exposures:Object.create(null),pendingEvents:[],seenEvents:{},adverseEvents:[]};
 s.anchor=freeze({map:(p.baselineVitals.sys+2*p.baselineVitals.dia)/3,
  pulse:p.baselineVitals.sys-p.baselineVitals.dia,flow:flow(s),tone:s.vascularTone});
 refresh(s);return s;
}

function canonicalUnit(unit){return String(unit||'').replace(/[µμ]/g,'mc').replace(/^ug/,'mcg');}
const receiptSignature=(state,e,d)=>JSON.stringify([state.patientId,e.drugId,e.action,e.amount,e.atUs,e.sequence,d.unit,d.route]);
function normalizeEvent(raw,state,definitions){
 if(raw?.status!=='administered')return null; // plans cannot become exposures
 if(raw.patientId!==state.patientId)throw Error('administration patient mismatch');
 if(typeof raw.eventId!=='string'||!raw.eventId||raw.eventId.length>200)throw Error('administration identity required');
 const d=definitions.drugs.get(raw.drugId);if(!d)throw Error('unsupported physiology medication '+raw.drugId);
 if(raw.route!==d.route)throw Error('wrong administration route '+raw.drugId);
 if(!d.actions.includes(raw.action))throw Error('unsupported administration action '+raw.drugId);
 const atUs=timeUs(raw.atClinicalMinute),sequence=raw.sequence??0;
 finite(sequence,'event sequence',0,1e9);if(!Number.isInteger(sequence))throw Error('invalid event sequence');
 let amount=0;
 if(raw.action!=='stop'){
  if(canonicalUnit(raw.dose?.unit)!==canonicalUnit(d.unit))throw Error('dose unit mismatch '+raw.drugId);
  amount=finite(raw.dose?.amount,'dose',0,1000000);
 }
 const e={eventId:raw.eventId,drugId:raw.drugId,action:raw.action,amount,atUs,sequence};
 e.signature=receiptSignature(state,e,d);return Object.freeze(e);
}
function receipt(s,e,definitions){
 const d=definitions.drugs.get(e.drugId),k=d.kinetics;
 if(k.kind==='support'){
  s.oxygenFlowLpm=e.action==='stop'?0:e.amount;s.oxygenResponseHalfLifeMin=k.responseHalfLifeMin;return;
 }
 if(k.kind==='physical-volume'){
  if(e.amount===0)return;
  s.circulatingVolumeMl+=e.amount*k.intravascularFraction;
  s.interstitialFluidMl+=e.amount*(1-k.intravascularFraction);s.administeredFluidMl+=e.amount;
  refresh(s);return;
 }
 let x=s.exposures[e.drugId];
 if(e.action==='stop'){if(x)x.infusionRate=0;return;} // never erase a given bolus
 if(e.amount===0){if(x&&k.kind==='infusion')x.infusionRate=0;return;}
 x??=(s.exposures[e.drugId]={central:0,responseCentral:0,effect:0,infusionRate:0,delayed:[]});
 if(k.kind==='infusion')x.infusionRate=e.amount/d.referenceDose;
 else if(k.onsetMin>0)x.delayed.push(Object.freeze({atUs:e.atUs+timeUs(k.onsetMin),amount:e.amount/d.referenceDose}));
 else{x.central+=e.amount/d.referenceDose;x.responseCentral+=e.amount/d.referenceDose;}
}
// Exact solution of a linear central/effect-site pair under constant input.
// Nonlinear physiology uses the fixed grid, not frame-dependent Euler calls.
function kinetics(s,id,x,dt,definitions){
 const k=definitions.drugs.get(id).kinetics;
 const clearance=Math.max(.1,1-k.renalWeight-k.hepaticWeight+
  k.renalWeight*s.renalFunction+k.hepaticWeight*s.hepaticFunction);
 const a=LN2/k.halfLifeMin*clearance,b=LN2/k.responseHalfLifeMin*clearance;
 const equilibrium=x.infusionRate/clearance,ea=Math.exp(-a*dt),eb=Math.exp(-b*dt),before=x.responseCentral;
 x.central=equilibrium+(x.central-equilibrium)*ea;
 x.responseCentral=equilibrium+(before-equilibrium)*eb;
 if(k.effectSiteHalfLifeMin===0)x.effect=x.responseCentral;
 else{
  const c=LN2/k.effectSiteHalfLifeMin,ec=Math.exp(-c*dt);
  const interaction=Math.abs(c-b)<1e-10?c*dt*ec:c*(eb-ec)/(c-b);
  x.effect=Math.max(0,x.effect*ec+equilibrium*(1-ec)+(before-equilibrium)*interaction);
 }
}
function note(s,code,atUs){if(!s.adverseEvents.some(x=>x.code===code))
 s.adverseEvents.push(Object.freeze({code,clinicalMinute:atUs/MINUTE_US}));}
function segment(s,dt,definitions,atUs){
 if(dt<=0)return;
 let opioid=0,pressor=0,diuretic=0;
 for(const [id,x]of Object.entries(s.exposures)){
  kinetics(s,id,x,dt,definitions);
  const mechanism=definitions.drugs.get(id).mechanism;
  if(mechanism==='opioid')opioid+=x.effect;
  else if(mechanism==='pressor')pressor+=x.effect;
  else if(mechanism==='diuretic')diuretic+=x.effect;
 }
 const opioidStrength=opioid/(.4+opioid),pressorStrength=pressor**2/(1+pressor**2);
 s.respiratoryDepression=clamp(.12*opioid+.08*opioid**2/(1+opioid),0,.98);
 s.sedation=.6*opioid/(1+opioid);s.pain=s.profile.painDrive*(1-.8*opioidStrength);
 // Disease progression modifies internal tone/pump; the same mechanisms act on
 // that CURRENT state. No static hypovolemia label or disease-ID switches.
 const inflammationChange=s.inflammation-s.profile.inflammation;
 const toneBase=Math.max(.25,s.profile.vascularTone-.12*inflammationChange);
 const pumpBase=Math.max(.2,s.profile.pumpFunction-.04*Math.max(0,inflammationChange));
 s.vascularTone=toneBase*(1+pressorStrength)*(1-.16*opioidStrength);
 s.pumpFunction=pumpBase*(1-.05*opioidStrength);
 s.ischemiaRisk=clamp(Math.max(0,pressor-3)/5,0,1);
 refresh(s);
 if(s.ischemiaRisk>.05)note(s,'pressor-excess',atUs);
 if(s.respiratoryDepression>.3)note(s,'opioid-respiratory-depression',atUs);
 const support=s.oxygenFlowLpm/(s.oxygenFlowLpm+2);
 const half=s.oxygenResponseHalfLifeMin;
 if(s.oxygenSupport||s.oxygenFlowLpm)s.oxygenSupport=support+(s.oxygenSupport-support)*Math.exp(-LN2*dt/half);
 const renal=Math.max(.01,s.renalFunction),pressureFactor=clamp(s.perfusion/.8,0,1);
 s.drugDiuresisMlPerMin=8*diuretic**2/(.35**2+diuretic**2)*renal**1.5*pressureFactor;
 const urine=Math.min(Math.max(0,s.circulatingVolumeMl-500),s.drugDiuresisMlPerMin*dt);
 s.circulatingVolumeMl-=urine;s.cumulativeUrineMl+=urine;
 const refill=Math.min(s.interstitialFluidMl,Math.max(0,s.profile.circulatingVolumeMl-s.circulatingVolumeMl),
  s.profile.natural.refillMlPerMin*dt);
 s.circulatingVolumeMl+=refill;s.interstitialFluidMl-=refill;
 const n=s.profile.natural;
 const blood=Math.min(Math.max(0,s.circulatingVolumeMl-500),n.bleedingMlPerMin*dt);
 s.circulatingVolumeMl-=blood;s.cumulativeBloodLossMl+=blood;
 const leak=Math.min(Math.max(0,s.circulatingVolumeMl-500),n.capillaryLeakMlPerMin*dt*(.55+s.inflammation));
 s.circulatingVolumeMl-=leak;s.interstitialFluidMl+=leak;
 // Support is not infection treatment or source control. B2 will supply only
 // confirmed coverage/procedure transitions, without reusing an order flag.
 if(s.infectionBurden>0){
  const uncontrolled=n.sourceRequired&&!s.sourceControlled;
  s.infectionBurden=clamp(s.infectionBurden+dt*n.infectionGrowthPerMin*(uncontrolled?1:.3),0,2);
  s.inflammation=clamp(s.inflammation+dt*n.inflammationGrowthPerMin*(uncontrolled?1:.4),0,2);
 }
 refresh(s);
 if(s.perfusion<.4)s.renalFunction=Math.max(.01,s.renalFunction-dt*.0003*(.4-s.perfusion));
 if(s.fluidOverloadRisk>.4)note(s,'fluid-overload',atUs);
 if(diuretic>.05&&s.perfusion<.6)note(s,'diuretic-hypoperfusion',atUs);
 for(const [id,x]of Object.entries(s.exposures))
  if(x.infusionRate===0&&x.delayed.length===0&&Math.max(x.central,x.responseCentral,x.effect)<1e-9)delete s.exposures[id];
}
function processAt(s,atUs,definitions){
 while(s.pendingEvents[0]?.atUs<=atUs)receipt(s,s.pendingEvents.shift(),definitions);
 for(const x of Object.values(s.exposures))while(x.delayed[0]?.atUs<=atUs){
  const release=x.delayed.shift();x.central+=release.amount;x.responseCentral+=release.amount;
 }
}
function nextBoundary(s,end){
 let next=Math.min(end,s.pendingEvents[0]?.atUs??end);
 for(const x of Object.values(s.exposures))next=Math.min(next,x.delayed[0]?.atUs??end);
 return next;
}
export function stepPhysiology487(state,administeredEvents=[],deltaClinicalMinutes=0,definitions=PILOT_DEFINITIONS_487){
 if(state?.schemaVersion!==1||state.modelVersion!==PHYSIOLOGY_MODEL_487||definitions?.modelVersion!==state.modelVersion)
  throw Error('incompatible physiology state/definitions');
 for(const key of ['circulatingVolumeMl','interstitialFluidMl','vascularTone','pumpFunction','renalFunction',
  'hepaticFunction','gasExchangeImpairment','inflammation','infectionBurden','perfusion','oxygenSupport',
  'oxygenFlowLpm','pain','respiratoryDepression','sedation','ischemiaRisk','fluidOverloadRisk',
  'cumulativeUrineMl','cumulativeBloodLossMl','administeredFluidMl','drugDiuresisMlPerMin'])finite(state[key],'state '+key);
 for(const key of ['renalFunction','hepaticFunction','gasExchangeImpairment','oxygenSupport',
  'respiratoryDepression','sedation','ischemiaRisk','fluidOverloadRisk'])finite(state[key],'state '+key,0,1);
 finite(state.oxygenResponseHalfLifeMin,'state oxygen response',1e-9,1e9);
 for(const key of ['map','pulse','flow','tone'])finite(state.anchor?.[key],'state pressure anchor '+key,1e-9);
 if(typeof state.sourceControlled!=='boolean')throw Error('invalid state source status');
 if(!Number.isSafeInteger(state.requestedUs)||!Number.isSafeInteger(state.integratedUs)||
  state.integratedUs<0||state.requestedUs<state.integratedUs||state.integratedUs%QUANTUM_US!==0||
  state.requestedUs-state.integratedUs>=QUANTUM_US)throw Error('invalid physiology clock');
 finite(state.requestedRemainderUs,'clock remainder',-.5,.5);
 if(!Array.isArray(state.pendingEvents)||!Array.isArray(state.adverseEvents)||state.pendingEvents.length>MAX_EVENTS)
  throw Error('invalid state event queue');
 const validTime=(x,name)=>{if(!Number.isSafeInteger(x)||x<state.integratedUs)throw Error('invalid '+name+' clock');};
 for(const e of state.pendingEvents){
  validTime(e.atUs,'queued event');finite(e.amount,'queued event dose');
  finite(e.sequence,'queued event sequence');
  const d=definitions.drugs.get(e.drugId);
  if(!d?.actions.includes(e.action)||!Object.hasOwn(state.seenEvents,e.eventId)||state.seenEvents[e.eventId]!==e.signature||
   receiptSignature(state,e,d)!==e.signature)
   throw Error('invalid state queued administration');
 }
 finite(deltaClinicalMinutes,'delta clinical time',0,1440);
 if(!Array.isArray(administeredEvents))throw Error('administration events must be an array');
 // Copy only active mutable state; immutable profile/anchor/receipt index share
 // safely across pure snapshots. No catalogue-wide traversal in the hot path.
 const s={...state,exposures:Object.create(null),pendingEvents:state.pendingEvents.slice(),adverseEvents:state.adverseEvents.slice()};
 for(const [id,x]of Object.entries(state.exposures)){
  if(!definitions.drugs.has(id))throw Error('missing active medication definition '+id);
  for(const key of ['central','responseCentral','effect','infusionRate'])finite(x[key],'state exposure '+key);
  if(!Array.isArray(x.delayed)||x.delayed.length>MAX_EVENTS)throw Error('invalid state delayed release queue');
  let previous=state.integratedUs;
  for(const release of x.delayed){
   validTime(release.atUs,'delayed release');finite(release.amount,'state delayed release amount');
   if(release.atUs<previous)throw Error('invalid delayed release order');previous=release.atUs;
  }
  s.exposures[id]={...x,delayed:x.delayed.slice()};
 }
 let indexCopied=false,receiptCount=0;
 for(const raw of administeredEvents){
  const e=normalizeEvent(raw,state,definitions);if(!e)continue;
  if(Object.hasOwn(s.seenEvents,e.eventId)){
   if(s.seenEvents[e.eventId]!==e.signature)throw Error('conflicting administration receipt '+e.eventId);continue;
  }
  if(e.atUs<state.integratedUs)throw Error('late administration requires replay '+e.eventId);
  if(!indexCopied){s.seenEvents={...state.seenEvents};receiptCount=Object.keys(s.seenEvents).length;indexCopied=true;}
  if(receiptCount>=MAX_EVENTS)throw Error('session administration limit requires checkpoint');receiptCount++;
  Object.defineProperty(s.seenEvents,e.eventId,{value:e.signature,enumerable:true,writable:false});
  s.pendingEvents.push(e);
 }
 s.pendingEvents.sort((a,b)=>a.atUs-b.atUs||a.sequence-b.sequence||
  (a.eventId<b.eventId?-1:a.eventId>b.eventId?1:0));
 // Carry fractional microseconds: rounding EVERY delta separately can lose a
 // whole fixed-grid quantum at a boundary (e.g. seven calls of .25/7min).
 const preciseDelta=deltaClinicalMinutes*MINUTE_US+s.requestedRemainderUs;
 const integerDelta=Math.round(preciseDelta);
 const remainder=preciseDelta-integerDelta;
 s.requestedRemainderUs=Math.abs(remainder)<1e-6?0:remainder; // sub-picosecond arithmetic noise
 s.requestedUs+=integerDelta;s.requestedClinicalMinute=s.requestedUs/MINUTE_US;
 processAt(s,s.integratedUs,definitions);
 while(s.integratedUs+QUANTUM_US<=s.requestedUs){
  const end=s.integratedUs+QUANTUM_US;let cursor=s.integratedUs;
  while(cursor<end){
   const boundary=nextBoundary(s,end);segment(s,(boundary-cursor)/MINUTE_US,definitions,boundary);
   cursor=boundary;processAt(s,cursor,definitions);
  }
  s.integratedUs=end;
 }
 s.clinicalMinute=s.integratedUs/MINUTE_US;refresh(s);return s;
}
export function observePhysiology487(s){
 const f=flow(s),map=s.anchor.map*f/s.anchor.flow*s.vascularTone/s.anchor.tone;
 const pulse=s.anchor.pulse*f/s.anchor.flow;
 const roomAir=clamp(98-35*s.gasExchangeImpairment-12*s.fluidOverloadRisk-18*s.respiratoryDepression,40,99);
 const target=(s.profile.oxygenTarget.min+s.profile.oxygenTarget.max)/2;
 const spo2=roomAir+Math.max(0,target-roomAir)*s.oxygenSupport*s.profile.oxygenResponsiveness;
 const baseline=s.profile.baselineVitals;
 return {clinicalMinute:s.clinicalMinute,sys:map+2*pulse/3,dia:Math.max(1,map-pulse/3),map,
  hr:clamp(baseline.hr+Math.max(-20,Math.min(60,(s.anchor.map-map)*.6))+
   (s.pain-s.profile.painDrive)*10+(s.inflammation-s.profile.inflammation)*15,25,230),
  rr:clamp(baseline.rr+(s.inflammation-s.profile.inflammation)*4+s.fluidOverloadRisk*6-s.respiratoryDepression*18,3,60),
  spo2:clamp(spo2,40,99),temp:clamp(baseline.temp+(s.inflammation-s.profile.inflammation)*1.45,33,43),
  circulatingVolumeMl:s.circulatingVolumeMl,interstitialFluidMl:s.interstitialFluidMl,perfusion:s.perfusion,
  fluidOverloadRisk:s.fluidOverloadRisk,pain:s.pain,respiratoryDepression:s.respiratoryDepression,
  renalFunction:s.renalFunction,ischemiaRisk:s.ischemiaRisk,drugDiuresisMlPerMin:s.drugDiuresisMlPerMin};
}
