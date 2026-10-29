// Reproducible comparisons. Greetings, punctuation and emotional wrappers
// cannot earn substantive diversity. Medical content is never scored by length.
export const normalizeText=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
export function stripSurface(text){
 return String(text).replace(/^(?:(?:Hola, doctor\.|Estoy preocupado\.|Bueno…|Le cuento, doctor\.|Esto me tiene molesto\.|Tengo miedo\.|No tengo muchas ganas de hablar\.|(?:Mire|Bueno|A ver|Le cuento|Doctor):)\s*)+/i,'')
  .replace(/\s*(?:¿Me explica qué puede ser\?|Estoy un poco preocupado\.|Gracias por escucharme\.)\s*$/i,'');
}
export function substantiveBody(row,{primaryOnly=false}={}){
 return normalizeText(row.rows.map(t=>t.evidence?.facts?.filter(f=>!primaryOnly||!f.spontaneous).map(f=>f.spoken).join(' ')||stripSurface(t.answer)).join(' '));
}
export const expressiveInterview=row=>row.rows.some(t=>t.evidence&&!t.evidence.limited);
const shingles=text=>{const words=normalizeText(text).split(' '),set=new Set();for(let i=0;i<words.length-2;i++)set.add(words.slice(i,i+3).join(' '));return set;};
export function jaccard(a,b){let n=0;for(const x of a)if(b.has(x))n++;return a.size+b.size-n?n/(a.size+b.size-n):1;}
export function compareConversations(rows,options={}){
 const bodies=rows.map(row=>substantiveBody(row,options)),sets=bodies.map(shingles);let pairs=0,sum=0,near=0,exact=0;
 for(let i=0;i<rows.length;i++)for(let j=0;j<i;j++){
  if(rows[i].caseId!==rows[j].caseId||rows[i].clinicalInvariant!==rows[j].clinicalInvariant)continue;
  const score=jaccard(sets[i],sets[j]);pairs++;sum+=score;if(score>=.94)near++;if(bodies[i]===bodies[j])exact++;
 }
 return {pairs,meanTrigramJaccard:pairs?sum/pairs:null,nearIdenticalPairs:near,exactBodyPairs:exact,
  uniqueSubstantiveBodies:new Set(bodies).size};
}
// Independent semantic guard for the deliberately finite language vocabulary.
// Clause order may change; clinical tokens, negations and values may not.
export function clinicalMeaning(text){
 let n=normalizeText(text);
 for(const [re,to] of [
  [/\b(?:panza|barriga)\b/g,'belly'],[/\b(?:abdomen|vientre)\b/g,'abdomen'],
  [/\b(?:empezo|comenzo|arranco)\b/g,'start'],[/\bde (?:golpe|repente)\b/g,'sudden'],
  [/\bme (?:siento|encuentro)\b/g,'feel'],[/\b(?:deposiciones|evacuaciones)\b/g,'stools'],
  [/\b(?:por|al) dia\b/g,'daily'],[/\b(?:tengo|siento) nauseas\b/g,'nausea'],
  [/\bse me (?:corre|extiende)\b/g,'radiates'],[/\bno se me (?:pasa|quita)\b/g,'persists'],
  [/\bno (?:recuerdo|me acuerdo de)\b/g,'no recall'],[/\bno (?:tengo claro|se bien)\b/g,'unclear'],
  [/\bno puedo (?:precisar|decir con precision)\b/g,'imprecise'],
  [/\b(?:cuando camino|al caminar)\b/g,'walking'],[/\brespirar (?:hondo|profundamente)\b/g,'deepbreath'],
  [/\b(?:varias veces|en varias ocasiones)\b/g,'occasions'],[/\b(?:todos los dias|a diario)\b/g,'everyday'],
  [/\b(?:estoy muy cansad[oa]|siento mucho cansancio)\b/g,'verytired'],
  [/\b(?:estoy cansad[oa]|siento cansancio)\b/g,'tired'],
  [/\b(?:me duele|siento el dolor|tengo dolor en)\b/g,'pain']
 ])n=n.replace(re,to);
 n=n.replace(/^hace (.+?) que start\b/,'start hace $1');
 return n.split(' ').sort().join(' ');
}
export function interviewQuality(row){
 const failures=[],remarks=new Map();let spontaneous=0,facts=0,realizations=0;
 for(const [i,t] of row.rows.entries()){
  const e=t.evidence;
  for(const f of e?.facts??[]){
   facts++;if(f.spontaneous)spontaneous++;
   if(!t.answer.includes(f.spoken))failures.push('lost-spoken-fact:'+i+':'+f.id);
   // Numeric, dose and named entities must survive the bounded language rules.
   const nums=x=>(x.match(/\d+(?:[.,]\d+)?/g)||[]).sort().join('|');
   if(nums(f.canonical)!==nums(f.spoken))failures.push('changed-number:'+i+':'+f.id);
   if(clinicalMeaning(f.canonical)!==clinicalMeaning(f.spoken))failures.push('changed-clinical-content:'+i+':'+f.id);
   if(normalizeText(f.canonical)!==normalizeText(f.spoken))realizations++;
  }
  if(e?.remark){const n=normalizeText(e.remark);remarks.set(n,(remarks.get(n)||0)+1);}
  if(/(?:doctor|mire|bueno)[:.]\s*(?:doctor|mire|bueno)[:.]/i.test(t.answer))failures.push('stacked-marker:'+i);
  if(/\b(?:en en|que que|de de|el el)\b/i.test(t.answer))failures.push('doubled-grammar:'+i);
  if(/en la abajo|en el debajo|(?:comenzó|arrancó) doliendo/i.test(t.answer))failures.push('artificial-grammar:'+i);
 }
 const repeatedRemarks=[...remarks.values()].filter(n=>n>1).reduce((a,n)=>a+n-1,0);
 if(repeatedRemarks)failures.push('repeated-emotional-phrase');
 return {failures,facts,spontaneous,realizations,emotionalRemarks:[...remarks.values()].reduce((a,n)=>a+n,0),repeatedRemarks};
}
