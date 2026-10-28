// Deterministic patient variation; does not alter clinical outcomes or publish cases.
function random(seed){let s=2166136261;for(const c of String(seed))s=Math.imul(s^c.charCodeAt(0),16777619);return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
const choose=(arr,r)=>arr[Math.floor(r()*arr.length)];
export function validateVariation(v){
 const errors=[];
 if(!v||typeof v!=='object')return ['missing variation'];
 if(!Array.isArray(v.ageRange)||v.ageRange.length!==2||!v.ageRange.every(n=>Number.isInteger(n)&&n>=0&&n<=110)||v.ageRange[0]>v.ageRange[1])errors.push('invalid ageRange');
 for(const k of ['firstNames','lastNames','personalities','openings'])if(!Array.isArray(v[k])||!v[k].length||v[k].some(s=>typeof s!=='string'||!s.trim()))errors.push('invalid '+k);
 for(const k of ['allergies','complications']){
  if(v[k]!==undefined&&!Array.isArray(v[k])){errors.push('invalid '+k);continue;}
  for(const option of v[k]||[])if(!option||typeof option!=='object'||!option.id||!Number.isFinite(option.probability)||option.probability<0||option.probability>1)errors.push('invalid '+k);
 }
 for(const a of Array.isArray(v.allergies)?v.allergies:[])if(!a||!a.drugId||!a.historyDisclosure)errors.push('allergy requires drug and disclosure');
 for(const c of Array.isArray(v.complications)?v.complications:[])if(!c||!c.rationale||!c.progressionId||!c.rescueId)errors.push('complication requires clinical progression and rescue');
 return errors;
}
export function generatePatientVariation(v,seed){
 const errors=validateVariation(v);if(errors.length)throw Error(errors.join('; '));
 const r=random(seed);
 return {seed:String(seed),name:choose(v.firstNames,r)+' '+choose(v.lastNames,r),age:v.ageRange[0]+Math.floor(r()*(v.ageRange[1]-v.ageRange[0]+1)),personality:choose(v.personalities,r),opening:choose(v.openings,r),allergies:(v.allergies||[]).filter(a=>r()<a.probability).map(a=>({id:a.id,drugId:a.drugId,historyDisclosure:a.historyDisclosure})),complicationCandidates:(v.complications||[]).filter(c=>r()<c.probability).map(c=>({id:c.id,progressionId:c.progressionId,rescueId:c.rescueId}))};
}
export function discloseAllergies(patient,asked){return asked?patient.allergies.map(a=>({drugId:a.drugId,answer:a.historyDisclosure})):[];}
