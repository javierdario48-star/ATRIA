// Reusable game-scale pharmacology policy. ONE catalogue, ZERO vital writers.
// Reuses the effective pure V4 response and outcome functions; the clinical
// executor of each case remains the sole owner of administration and vitals.
import {PHARMA_RULES_487,BASE_CASE_PHARMACOLOGY_487,
 csValidateDrug487,csCasePharmProfile487,csPharmResponse487}
 from '../../clinical/pharmacology-registry-487.js';
import {csPharmOutcomes487} from '../../clinical/pharmacology-outcomes-487.js';

const clone=x=>structuredClone(x);
const VITALS=['temp','hr','rr','sys','dia','spo2'];
const zero=()=>Object.fromEntries(VITALS.map(x=>[x,0]));
const valid=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

// The historical native evaluator has no certified rule for anticoagulation.
// It is a supported catalog item but intentionally has NO invented vital buff,
// dose, onset or anticoagulant efficacy. Its executor is not yet migrated.
const REVIEW_ONLY=Object.freeze({
 anticoagulation:Object.freeze({classId:'anticoagulant',route:'iv',
  mechanism:'unmodeled',indications:['mesentericIschemia'],
  hazards:['bleeding','hit'],onsetMin:null,peakMin:null})
});
const OWNER=Object.freeze({
 'APP-001':Object.freeze({fluid:['sys','dia','hr','rr'],oxygen:['spo2']}),
 'CIRR-001':Object.freeze({fluid:['rr','spo2'],oxygen:['spo2'],
  paracentesis_ter:['rr']})
});
function checkRule(id,rule){
 if(REVIEW_ONLY[id])return;
 csValidateDrug487(id,rule);
}
function normalizeCase(c){
 if(!valid(c?.id))throw Error('case pharmacology requires case id');
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
  if(!valid(row?.sourceEventId)||row.patientUid!==p.uid||
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
 for(const item of catalog){
  const id=item.id,rule=item.rule,last=latest.get(id);
  const received=!!last&&last.action!=='stop';
  const minutes=received?Math.max(0,atNativeMinute-last.administeredAtNativeMinute):0;
  const changes=rule.mechanism==='unmodeled'?{known:false,offsets:zero(),
   warnings:['needs-reviewed-effect'],phase:0,beneficial:false}:
   csPharmResponse487(id,c,legacyPatient,minutes,p.liveVitals);
  if(!changes.known&&rule.mechanism!=='unmodeled')throw Error('missing inherited drug evaluation '+id);
  const {scale,warnings}=caseModifiers(c,id),ownedAxes=OWNER[c.id]?.[id]||[];
  // A native case-specific writer keeps its already verified axes. This is a
  // projection, not an extra update on liveVitals; no double application.
  const offsets=Object.fromEntries(VITALS.map(axis=>[axis,
   ownedAxes.includes(axis)?0:clamp(changes.offsets[axis]*scale,-50,50)]));
  const rawOffsets=Object.fromEntries(VITALS.map(axis=>[axis,
   clamp(changes.offsets[axis]*scale,-50,50)]));
  rows.push({id,classId:rule.classId,route:rule.route,mechanism:rule.mechanism,
   model:rule.mechanism==='unmodeled'?'review-only':'legacy-general',
   state:!last?'not-administered':last.action==='stop'?'stopped':'confirmed',
   sourceEventId:last?.sourceEventId??null,elapsedNativeMinutes:minutes,
   phase:received?changes.phase:0,beneficial:received&&changes.beneficial,
   warnings:[...new Set([...changes.warnings,...warnings])],
   ownedAxes:[...ownedAxes],rawOffsets:received?rawOffsets:zero(),
   candidateOffsets:received?offsets:zero()});
 }
 return {caseId:c.id,patientUid:p.uid,atNativeMinute,
  profile:clone(csCasePharmProfile487(c)),
  outcomes:clone(csPharmOutcomes487(c,legacyPatient,
   catalog.filter(x=>x.rule.mechanism!=='unmodeled').map(x=>({
    id:x.id,pharmacology:{...x.rule}
   })))),
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
