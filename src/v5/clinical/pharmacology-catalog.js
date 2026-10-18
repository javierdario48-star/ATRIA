// Reusable game-scale pharmacology policy. ONE catalogue, ZERO vital writers.
// Reuses the effective pure V4 response and outcome functions; the clinical
// executor of each case remains the sole owner of administration and vitals.
import {PHARMA_RULES_487,BASE_CASE_PHARMACOLOGY_487,
 csValidateDrug487,csCasePharmProfile487,csPharmResponse487,REFERENCE_DOSES_487}
 from '../../clinical/pharmacology-registry-487.js';
import {csPharmOutcomes487} from '../../clinical/pharmacology-outcomes-487.js';
import {medicationSafety487,matchesMedicationAllergy487} from './medication-safety-487.js';
import {antimicrobialRegimens487} from './antimicrobial-regimens-487.js';
import {confirmedMorphineResponse487} from './morphine-487.js';
import {confirmedNativeSupportEffects487} from './native-support-487.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';

const clone=x=>structuredClone(x);
const VITALS=['temp','hr','rr','sys','dia','spo2'];
const zero=()=>Object.fromEntries(VITALS.map(x=>[x,0]));
const valid=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const validEvent=x=>typeof x==='string'&&x.length>0&&x.length<=512;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

// The historical native evaluator has no certified rule for anticoagulation.
// It is a supported catalog item but intentionally has NO invented vital buff,
// therapeutic efficacy. Native execution and inherited bleeding are handled by
// native-medications/medication-harms; this general projection adds no second effect.
const REVIEW_ONLY=Object.freeze({
 anticoagulation:Object.freeze({classId:'anticoagulant',route:'iv',
  mechanism:'unmodeled',indications:['mesentericIschemia'],
  hazards:['bleeding','hit'],onsetMin:null,peakMin:null})
});
const OWNER=Object.freeze({
 'APP-001':Object.freeze({fluid:['sys','dia','hr','rr'],oxygen:['spo2'],
  furosemide:['sys','dia','hr','rr','spo2'],morphine:VITALS,albumin:VITALS,transfusion:VITALS,vasopressor:VITALS}),
 'CIRR-001':Object.freeze({fluid:['rr','spo2'],oxygen:['spo2'],
  paracentesis_ter:['rr'],furosemide:['sys','dia','hr','rr','spo2'],morphine:VITALS,albumin:VITALS,transfusion:VITALS,vasopressor:VITALS})
});
function checkRule(id,rule){
 if(REVIEW_ONLY[id])return;
 csValidateDrug487(id,rule);
}
function normalizeCase(c){
 if(!valid(c?.id))throw Error('case pharmacology requires case id');
 if(c.id==='APP-001')return {...c,pharmacology:{...c.pharmacology,coverageSets:antimicrobialRegimens487(c)}};
 if(BASE_CASE_PHARMACOLOGY_487[c.id]||c.pharmacology?.traits)return c;
 // New unknown case: react only to measured vital conditions and documented
 // exposures. A missing infection/etiology is NOT inferred from fever alone.
 return {...c,pharmacology:{...c.pharmacology,traits:['undifferentiated']}};
}
function caseModifiers(c,id){
 const input=c.pharmacology?.overrides?.[id]||{};
 const allowed=['responseScale','extraWarnings'];
 if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error('unsupported case pharmacology override '+c.id+'/'+id);
 const scale=input.responseScale??1;
 if(!Number.isFinite(scale)||scale<0||scale>2)throw Error('invalid case response scale '+c.id+'/'+id);
 const warnings=input.extraWarnings??[];
 if(!Array.isArray(warnings)||warnings.some(x=>!valid(x)))
  throw Error('invalid case pharmacology warnings '+c.id+'/'+id);
 return {scale,warnings};
}
// Single validation path shared by previews and the native effect owner.
export function caseDrugResponseScale(caseDef,drugId){
 return caseModifiers(normalizeCase(caseDef),drugId).scale;
}
function checkVitals(v){
 if(!v||typeof v!=='object')throw Error('current vital signs required');
 for(const axis of VITALS)if(!Number.isFinite(v[axis]))
  throw Error('invalid live vital '+axis);
 if(v.sys<=v.dia||v.spo2<0||v.spo2>100)throw Error('invalid physiological observation');
}
function normalizedPatient(p,c,atNativeMinute){
 if(!valid(p?.uid))throw Error('pharmacology requires patient identity');
 if(!Number.isFinite(atNativeMinute)||atNativeMinute<0)throw Error('invalid native time');
 checkVitals(p.liveVitals);
 const seen=new Set(),latest=new Map(),log=[];
 for(const row of p.administrationLog||[]){
  if(!validEvent(row?.sourceEventId)||row.patientUid!==p.uid||
   seen.has(row.sourceEventId))throw Error('invalid or duplicate confirmed administration');
  seen.add(row.sourceEventId);
  if(!Number.isFinite(row.administeredAtNativeMinute)||row.administeredAtNativeMinute<0||
   row.administeredAtNativeMinute>atNativeMinute+1e-6)
   throw Error('confirmed administration outside native time');
  log.push(row);
  const previous=latest.get(row.id);
  if(!previous||row.administeredAtNativeMinute>=previous.administeredAtNativeMinute)
   latest.set(row.id,row);
 }
 const active=new Map();
 for(const [id,row] of latest){
  if(row.action==='stop')continue;
  // Exposure stays real, but contraindicated drugs cannot fulfill coverage.
  if(matchesMedicationAllergy487(p,id))continue;
  if(row.action==='setRate'&&row.dose?.amount===0)continue;
  active.set(id,{id,startedAt:row.administeredAtNativeMinute});
 }
 // Avoid classifying an oxygen *start* as a continuously active drug after
 // its explicit stop. Non-vital indices receive only confirmed administrations.
 const legacyPatient={...p,gameMinute:atNativeMinute,monitorTherapies:active,
  administrationLog:log,therapyTotals:{
   ...(p.therapyTotals||{}),
   fluidMl:log.filter(r=>r.id==='fluid').reduce((n,r)=>n+(r.dose?.unit==='ml'&&
    Number.isFinite(r.dose?.amount)?r.dose.amount:0),0)
  }};
 return {legacyPatient,latest};
}
function evaluate(c,p,atNativeMinute,catalog){
 const {legacyPatient,latest}=normalizedPatient(p,c,atNativeMinute),rows=[];
 const opioid=confirmedMorphineResponse487(p,c,atNativeMinute);
 const support=confirmedNativeSupportEffects487(p,c,atNativeMinute);
 for(const item of catalog){
  const id=item.id,rule=item.rule,last=latest.get(id);
  const received=!!last&&last.action!=='stop';
  const minutes=received?Math.max(0,atNativeMinute-last.administeredAtNativeMinute):0;
  let changes=rule.mechanism==='unmodeled'?{known:false,offsets:zero(),
   warnings:['needs-reviewed-effect'],phase:0,beneficial:false}:
   csPharmResponse487(id,c,legacyPatient,minutes,p.liveVitals);
  if(id==='morphine')changes={...changes,offsets:opioid?.offsets??zero(),
   phase:clamp(opioid?.load??0,0,1),beneficial:(opioid?.analgesia??0)>0,
   warnings:[...changes.warnings,...(opioid?.respiratoryRisk?['opioid-respiratory-depression-risk']:[])]};
  if(['albumin','transfusion','vasopressor'].includes(id))changes={...changes,
   offsets:support.drugs[id]?.offsets??zero(),phase:support.drugs[id]?.active?1:0};
  if(!changes.known&&rule.mechanism!=='unmodeled')throw Error('missing inherited drug evaluation '+id);
  const {scale,warnings}=caseModifiers(c,id),ownedAxes=CLINICAL_EXECUTORS[c.id]==='peritonitis'?VITALS:OWNER[c.id]?.[id]||[];
  // A native case-specific writer keeps its already verified axes. This is a
  // projection, not an extra update on liveVitals; no double application.
  const offsets=Object.fromEntries(VITALS.map(axis=>[axis,
   ownedAxes.includes(axis)?0:clamp(changes.offsets[axis]*scale,-50,50)]));
  const rawOffsets=Object.fromEntries(VITALS.map(axis=>[axis,
   clamp(changes.offsets[axis]*scale,-50,50)]));
  const safety=medicationSafety487(c,p,id);
  rows.push({id,classId:rule.classId,route:rule.route,mechanism:rule.mechanism,
   model:id==='morphine'?'legacy-morphine-487':['albumin','transfusion','vasopressor'].includes(id)?'legacy-native-support-487':rule.mechanism==='unmodeled'?'review-only':'legacy-general',
   state:!last?'not-administered':last.action==='stop'?'stopped':'confirmed',
   sourceEventId:last?.sourceEventId??null,elapsedNativeMinutes:minutes,
   phase:received?changes.phase:0,beneficial:received&&changes.beneficial,
   warnings:[...new Set([...changes.warnings,...warnings,...safety.cautions])],
   safety:{blocked:safety.blocked,contraindicated:safety.contraindicated,reason:safety.reason,
    nephrotoxic:safety.classifiedAsNephrotoxic,cautions:[...safety.cautions]},
   ownedAxes:[...ownedAxes],rawOffsets:received?rawOffsets:zero(),
   candidateOffsets:received?offsets:zero(),...(id==='morphine'?{kinetics:clone(opioid)}:{})});
 }
 // Replace the old indefinite opioid strength in the virtual pain index with
 // the recovered, dose-dependent analgesia. The original .65 index coefficient
 // remains a game outcome; it is never a pain score measured from the patient.
 const outcomePatient={...legacyPatient,monitorTherapies:new Map(legacyPatient.monitorTherapies)};
 outcomePatient.monitorTherapies.delete('morphine');
 const outcomes=csPharmOutcomes487(c,outcomePatient,
  catalog.filter(x=>x.rule.mechanism!=='unmodeled').map(x=>({id:x.id,pharmacology:{...x.rule}})));
 if(opioid)outcomes.painIndex=clamp(outcomes.painIndex-.65*opioid.analgesia,0,1);
 outcomes.noActiveTherapy=!legacyPatient.monitorTherapies.size;
 return {caseId:c.id,patientUid:p.uid,atNativeMinute,
  profile:clone(csCasePharmProfile487(c)),
  outcomes:clone(outcomes),
  drugs:rows};
}
/** Compile once per game data set, not once per paint frame.
 * Future case IDs inherit conservative defaults, and a case may declare
 * pharmacology.traits, coverageSets and responseScale/extraWarnings overrides.
 * Every case/drug pair is inspected at construction (fail closed).
 */
export function createCasePharmacology({cases,therapies}={}){
 if(!Array.isArray(cases)||!cases.length||!Array.isArray(therapies)||!therapies.length)
  throw Error('case pharmacology needs cases and global treatment catalogue');
 const normalized=cases.map(normalizeCase),seenCases=new Set(),seenDrugs=new Set();
 for(const c of normalized){
  if(seenCases.has(c.id))throw Error('duplicate case pharmacology '+c.id);
  seenCases.add(c.id);csCasePharmProfile487(c);
 }
 const catalog=therapies.map(item=>{
  if(!valid(item?.id)||seenDrugs.has(item.id))throw Error('invalid/duplicate medicine '+item?.id);
  seenDrugs.add(item.id);
  const rule=PHARMA_RULES_487[item.id]||REVIEW_ONLY[item.id];
  if(!rule)throw Error('unreviewed global treatment '+item.id);
  checkRule(item.id,rule);
  return Object.freeze({id:item.id,label:item.label,rule});
 });
 for(const id of Object.keys(PHARMA_RULES_487))
  if(!seenDrugs.has(id))throw Error('missing inherited pharmacology '+id);
 for(const c of normalized){
  for(const id of Object.keys(c.pharmacology?.overrides||{})){
   if(!seenDrugs.has(id))throw Error('unknown case drug override '+c.id+'/'+id);
   caseModifiers(c,id);
  }
  for(const regimen of c.pharmacology?.coverageSets||c.physiology?.coverageSets||[]){
   if(!Array.isArray(regimen)||!regimen.length||regimen.some(id=>!seenDrugs.has(id)||
    !['antibiotic','aminoglycoside','antifungal'].includes(
     (PHARMA_RULES_487[id]||{}).classId)))
    throw Error('invalid antimicrobial coverage for '+c.id);
  }
 }
 const byId=new Map(normalized.map(c=>[c.id,c]));
 return Object.freeze({
  caseIds:()=>[...byId.keys()],
  drugs:()=>clone(catalog.map(({id,label,rule})=>({id,label,...rule}))),
  forCase:id=>{
   const c=byId.get(id);if(!c)throw Error('unknown case pharmacology '+id);
   return clone({caseId:id,profile:csCasePharmProfile487(c),
    drugs:catalog.map(x=>({id:x.id,classId:x.rule.classId,mechanism:x.rule.mechanism,
     route:x.rule.route,indications:[...x.rule.indications],
     hazards:[...x.rule.hazards],onsetMin:x.rule.onsetMin,peakMin:x.rule.peakMin,
     ...caseModifiers(c,x.id)}))});
  },
  evaluate:(caseId,p,atNativeMinute)=>{
   const c=byId.get(caseId);if(!c)throw Error('unknown case pharmacology '+caseId);
   return clone(evaluate(c,p,atNativeMinute,catalog));
  }
 });
}

// C12.e2: project confirmed IV effects into the native case target.
// Only native-app/native-cirr may write liveVitals; no independent loop.
const NATIVE_IV_EFFECT_IDS=Object.freeze(['furosemide']);
export function applyConfirmedIVTargetOffsets(target,patient,caseDef,atNativeMinute){
 for(const id of NATIVE_IV_EFFECT_IDS){
  const doses=(patient?.administrationLog||[]).filter(row=>row.id===id);
  if(!doses.length)continue;
  if(!Number.isFinite(atNativeMinute)||atNativeMinute<0)throw Error('invalid IV physiological clock');
  const seen=new Set();let first=Infinity;
  for(const row of doses){
   const treatment=(patient.treatments||[]).filter(t=>t.id===id&&t.sourceEventId===row.sourceEventId);
   if(row.patientUid!==patient.uid||typeof row.sourceEventId!=='string'||!row.sourceEventId||
      seen.has(row.sourceEventId)||row.dose?.unit!=='mg'||
      row.dose?.amount!==REFERENCE_DOSES_487[id]||
      !Number.isFinite(row.administeredAtNativeMinute)||
      row.administeredAtNativeMinute<0||row.administeredAtNativeMinute>atNativeMinute+1e-9||
      treatment.length!==1||treatment[0].patientUid!==patient.uid||
      treatment[0].dose?.amount!==row.dose.amount||
      treatment[0].administeredAtNativeMinute!==row.administeredAtNativeMinute)
    throw Error('invalid or unconfirmed native IV administration');
   seen.add(row.sourceEventId);
   first=Math.min(first,row.administeredAtNativeMinute);
  }
  // First confirmed dose determines onset. Later legitimate doses are
  // documented separately, but no unsupported accumulation is invented.
  const response=csPharmResponse487(id,caseDef,patient,
   Math.max(0,atNativeMinute-first),patient.liveVitals);
  if(!response.known)throw Error('missing native IV pharmacology '+id);
  const scale=caseDrugResponseScale(caseDef,id);
  const offsets=Object.fromEntries(VITALS.map(axis=>[axis,response.offsets[axis]*scale]));
  // No free improvement in an already normal SpO2/respiratory rate.
  if(patient.liveVitals.spo2>=97&&offsets.spo2>0)offsets.spo2=0;
  if(patient.liveVitals.rr<=14&&offsets.rr<0)offsets.rr=0;
  for(const axis of VITALS)target[axis]+=offsets[axis];
  // Harm from a diuretic in hypotension must lower the CURRENT target,
  // not spuriously restore disease baseline pressure.
  if(patient.liveVitals.sys<90&&offsets.sys<0){
   target.sys=Math.min(target.sys,patient.liveVitals.sys+offsets.sys);
   target.dia=Math.min(target.dia,patient.liveVitals.dia+offsets.dia);
  }
 }
 return target;
}
