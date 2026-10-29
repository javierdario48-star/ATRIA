// Deterministic, clinically non-authoritative conversational traits.
export const TRAIT_KEYS=Object.freeze(['anxiety','sociability','trust','cooperation','expressiveness','verbosity','formality','uncertainty','urgency','sensitivity','explanation']);
const baseline={
 calm:[1,2,3,3,1,2,2,3,1,1,2],anxious:[4,2,2,3,4,3,2,1,3,3,4],
 reserved:[2,0,2,3,1,0,3,2,1,2,2],talkative:[2,4,3,3,3,4,1,2,2,2,3],
 irritable:[3,2,1,1,3,2,1,1,4,4,3],scared:[4,1,1,2,4,2,2,0,3,4,4],
 uncooperative:[2,0,0,0,1,0,1,1,3,3,1]
};
function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function buildBehaviorProfile(seed,archetype='calm'){
 const base=baseline[archetype]??baseline.calm;
 const values=Object.fromEntries(TRAIT_KEYS.map((key,i)=>{
  const variation=hash(seed+':trait:'+key)%3-1;
  return [key,Math.max(0,Math.min(4,base[i]+variation))];
 }));
 return Object.freeze({version:1,archetype,...values});
}
const openings=['Mire, ','Bueno, ','A ver, ','Le cuento: ','Doctor, ',''];
const closings=['¿Me explica qué puede ser?','Estoy un poco preocupado.','Gracias por escucharme.'];
const normalize=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function sentenceAfter(prefix,fact){
 if(!prefix)return fact;
 // Avoid duplicated greetings, awkward capitals and redundant leading discourse markers.
 if(/^(hola|buenas|doctor|doctora|mire|bueno|a ver|le cuento)\\b/i.test(normalize(fact)))return fact;
 return prefix+fact.charAt(0).toLowerCase()+fact.slice(1);
}
// The case-authored clinical answer is never deleted, rephrased or reordered.
export function styleClinicalAnswer(fact,{behavior,seed='',question='',eventId='',impaired=false,sensitive=false}={}){
 if(!fact||impaired||sensitive||!behavior)return fact;
 const h=hash(seed+':'+question+':'+eventId);
 const prefix=behavior.verbosity>=3?openings[h%openings.length]:
  behavior.trust<=1&&behavior.cooperation<=1?'Bueno, ':behavior.anxiety>=3?'Doctor, ':'';
 const withPrefix=sentenceAfter(prefix,fact);
 // Optional emotional remarks only on selected turns; do not append the same
 // question to every clinical fact, and never alter the fact itself.
 const wantsRemark=hash(seed+':remark:'+question+':'+eventId)%5===0;
 if(!wantsRemark||/[?]\\s*$/.test(fact))return withPrefix;
 const choices=[];
 if(behavior.explanation>=3&&behavior.anxiety>=3)choices.push(closings[0]);
 if(behavior.anxiety>=3&&behavior.expressiveness>=3)choices.push(closings[1]);
 if(behavior.trust>=3&&behavior.sociability>=3)choices.push(closings[2]);
 return choices.length?withPrefix+' '+choices[h%choices.length]:withPrefix;
}
