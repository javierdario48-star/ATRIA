// Deterministic identity/history metadata. Clinical owners decide all physiology,
// medication effects and complication progression.
import {PATIENT_NAME_BANK_ID,PATIENT_NAME_BANKS} from './patient-name-bank.js';

export const PATIENT_PERSONALITIES=Object.freeze([
 'calm','anxious','reserved','talkative','irritable','scared','uncooperative'
]);
export const DEFAULT_PATIENT_VARIATION=Object.freeze({
 nameBankId:PATIENT_NAME_BANK_ID,ageRange:Object.freeze([18,85]),
 personalities:PATIENT_PERSONALITIES,openings:Object.freeze(['Hola, doctor.']),
 allergies:Object.freeze([]),complications:Object.freeze([])
});
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const personalityAliases=Object.freeze({
 calm:['calm','calma','calmo','calmada','tranquilo','tranquila','sereno','serena'],
 anxious:['anxious','ansioso','ansiosa','nervioso','nerviosa','preocupado','preocupada'],
 reserved:['reserved','reservado','reservada','timido','timida','callado','callada'],
 talkative:['talkative','hablador','habladora','conversador','conversadora','locuaz'],
 irritable:['irritable','irritado','irritada'],
 scared:['scared','asustado','asustada','temeroso','temerosa'],
 uncooperative:['uncooperative','poco colaborador','poco colaboradora','no colaborador','no colaboradora','no cooperativo','no cooperativa']
});
export function normalizePatientPersonality(value){
 const n=normalize(value);
 return PATIENT_PERSONALITIES.find(type=>personalityAliases[type].includes(n))??null;
}
function hash(seed){
 let s=2166136261;
 for(const c of String(seed))s=Math.imul(s^c.charCodeAt(0),16777619);
 return s>>>0;
}
function random(seed){
 let s=hash(seed);
 return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
}
const choose=(arr,r)=>arr[Math.floor(r()*arr.length)];
const strings=arr=>Array.isArray(arr)&&arr.length>0&&arr.every(s=>typeof s==='string'&&s.trim());
const resolveProfile=v=>v===true?DEFAULT_PATIENT_VARIATION:v;
const bankFor=v=>Object.hasOwn(PATIENT_NAME_BANKS,v?.nameBankId)?PATIENT_NAME_BANKS[v.nameBankId]:null;

export function validateVariation(input){
 const v=resolveProfile(input),errors=[];
 if(!v||typeof v!=='object'||Array.isArray(v))return ['missing variation'];
 if(!Array.isArray(v.ageRange)||v.ageRange.length!==2||!v.ageRange.every(n=>Number.isInteger(n)&&n>=0&&n<=110)||v.ageRange[0]>v.ageRange[1])errors.push('invalid ageRange');
 const bank=bankFor(v);
 if(v.nameBankId!==undefined&&!bank)errors.push('unknown nameBankId');
 for(const k of ['firstNames','lastNames']){
  if(v[k]===undefined&&v.nameBankId!==undefined)continue;
  if(!strings(v[k]??bank?.[k]))errors.push('invalid '+k);
 }
 for(const k of ['personalities','openings'])if(!strings(v[k]))errors.push('invalid '+k);
 if(strings(v.personalities)&&v.personalities.some(p=>!normalizePatientPersonality(p)))errors.push('invalid personalities');
 for(const k of ['allergies','complications']){
  if(v[k]!==undefined&&!Array.isArray(v[k])){errors.push('invalid '+k);continue;}
  for(const option of v[k]||[])if(!option||typeof option!=='object'||!option.id||!Number.isFinite(option.probability)||option.probability<0||option.probability>1)errors.push('invalid '+k);
 }
 for(const a of Array.isArray(v.allergies)?v.allergies:[])
  if(!a||typeof a.drugId!=='string'||!a.drugId.trim()||typeof a.historyDisclosure!=='string'||!a.historyDisclosure.trim())errors.push('allergy requires drug and disclosure');
 for(const c of Array.isArray(v.complications)?v.complications:[])
  if(!c||!c.rationale||!c.progressionId||!c.rescueId)errors.push('complication requires clinical progression and rescue');
 if(v.backgroundHistory!==undefined&&(!Array.isArray(v.backgroundHistory)||v.backgroundHistory.some(option=>
  !option||typeof option.id!=='string'||!option.id.trim()||
  !option.history||typeof option.history.pmh!=='string'||!option.history.pmh.trim())||
  new Set(v.backgroundHistory.map(option=>option.id)).size!==v.backgroundHistory.length))errors.push('invalid backgroundHistory');
 return errors;
}

function greatestCommonDivisor(a,b){while(b){const n=a%b;a=b;b=n;}return a;}
function allocatedNameIndex(total,{guardSeed,patientIndex}){
 if(!Number.isSafeInteger(patientIndex)||patientIndex<0)throw Error('invalid patientIndex');
 // A coprime step permutes every pair once before the finite bank wraps.
 // Allocation is independent of patient order, case ID and mutable RNG state.
 const offset=hash(String(guardSeed)+':name-offset')%total;
 let step=hash(String(guardSeed)+':name-step')%total||1;
 while(greatestCommonDivisor(step,total)!==1)step++;
 return (offset+(patientIndex%total)*step)%total;
}

export function generatePatientVariation(input,seed,context={}){
 const v=resolveProfile(input),errors=validateVariation(v);
 if(errors.length)throw Error(errors.join('; '));
 const bank=bankFor(v),firstNames=v.firstNames??bank.firstNames,lastNames=v.lastNames??bank.lastNames;
 const r=random(seed);
 let firstName=choose(firstNames,r),lastName=choose(lastNames,r),nameIndex;
 if(context.patientIndex!==undefined){
  nameIndex=allocatedNameIndex(firstNames.length*lastNames.length,{guardSeed:context.guardSeed??seed,patientIndex:context.patientIndex});
  firstName=firstNames[Math.floor(nameIndex/lastNames.length)];lastName=lastNames[nameIndex%lastNames.length];
 }
 const age=v.ageRange[0]+Math.floor(r()*(v.ageRange[1]-v.ageRange[0]+1));
 const personality=choose(v.personalities,r),opening=choose(v.openings,r);
 return {
  seed:String(seed),name:firstName+' '+lastName,age,personality,opening,
  ...(v.nameBankId?{nameBankId:v.nameBankId}:{}),
  ...(nameIndex!==undefined?{nameIndex,guardSeed:String(context.guardSeed??seed),patientIndex:context.patientIndex}:{}),
  // Retain authored reaction type, severity and disclosure. Intolerance never
  // silently becomes hypersensitivity or severe allergy.
  allergies:(v.allergies||[]).filter(a=>r()<a.probability).map(({probability,...a})=>({...a})),
  complicationCandidates:(v.complications||[]).filter(c=>r()<c.probability).map(c=>({id:c.id,progressionId:c.progressionId,rescueId:c.rescueId})),
  // Draw after existing clinical candidates so adding authored background
  // alternatives never rerolls a patient's existing reaction facts.
  ...(v.backgroundHistory?.length?{backgroundHistory:structuredClone(choose(v.backgroundHistory,r))}:{})
 };
}

export function discloseAllergies(patient,asked){
 if(!asked)return [];
 const history=patient?.allergyHistory??patient?.variation?.allergies??patient?.allergies??[];
 return history.filter(a=>a&&typeof a.drugId==='string'&&typeof a.historyDisclosure==='string'&&a.historyDisclosure.trim())
  .map(a=>({drugId:a.drugId,answer:a.historyDisclosure,
   ...Object.fromEntries(['type','reactionType','severity','reaction'].filter(k=>a[k]!==undefined).map(k=>[k,a[k]]))}));
}
