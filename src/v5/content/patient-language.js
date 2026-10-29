// Bounded equivalent realizations. Never synthesize clinical propositions.
// Every rule keeps polarity, quantities, timing, locations and drug names.
export function languageHash(value){
 let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);
 h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return (h^(h>>>16))>>>0;
}
const matchCase=(from,to)=>/^[A-ZÁÉÍÓÚÑ]/.test(from)?to[0].toUpperCase()+to.slice(1):to;
const lexicalRules=[
 ['belly',/\bpanza\b/gi,['panza','barriga']],
 ['abdomen',/\babdomen\b/gi,['abdomen','vientre']],
 ['onset',/\b(?:empezó|comenzó|arrancó)(?=$|[^\p{L}])(?! doliendo)/giu,['empezó','comenzó','arrancó']],
 ['sudden',/\bde golpe\b/gi,['de golpe','de repente']],
 ['feeling',/\bme siento\b/gi,['me siento','me encuentro']],
 ['stools',/\bdeposiciones\b/gi,['deposiciones','evacuaciones']],
 ['daily',/\bpor día\b/gi,['por día','al día']],
 ['nausea',/\btengo náuseas\b/gi,['tengo náuseas','siento náuseas']],
 ['radiation',/\bse me corre\b/gi,['se me corre','se me extiende']],
 ['persistence',/\bno se me pasa\b/gi,['no se me pasa','no se me quita']],
 ['recall',/\bno recuerdo\b/gi,['no recuerdo','no me acuerdo de']],
 ['unclear',/\bno tengo claro\b/gi,['no tengo claro','no sé bien']],
 ['precision',/\bno puedo precisar\b/gi,['no puedo precisar','no puedo decir con precisión']],
 ['walking',/\bcuando camino\b/gi,['cuando camino','al caminar']],
 ['deep-breath',/\brespirar hondo\b/gi,['respirar hondo','respirar profundamente']],
 ['occasions',/\bvarias veces\b/gi,['varias veces','en varias ocasiones']],
 ['every-day',/\btodos los días\b/gi,['todos los días','a diario']],
 ['much-tiredness',/\bestoy muy cansad[oa]\b/gi,['estoy muy cansado','siento mucho cansancio']],
 ['tiredness',/\bestoy cansad[oa]\b/gi,['estoy cansado','siento cansancio']]
];
export function realizeClinicalFact(canonical,{behavior,seed='',topic='',repeat=0,sensitive=false}={}){
 if(!behavior||sensitive)return {spoken:canonical,rules:[]};
 let spoken=canonical;const rules=[];
 for(const [id,pattern,variants] of lexicalRules){
  const register=behavior.formality>=3?1:behavior.formality<=1?2:0;
  const choice=(languageHash(seed+':lexicon:'+id)+register+repeat)%variants.length;
  if(!choice)continue;
  spoken=spoken.replace(pattern,from=>{const to=variants[choice];if(from.toLowerCase()!==to)rules.push(id);return matchCase(from,to);});
 }
 // Full clause permutations, never a generic shuffle of temporal sequences.
 const shape=(languageHash(seed+':syntax:'+topic)+behavior.verbosity+repeat)%3;
 if(shape===1){
  spoken=spoken.replace(/^(Empezó|Comenzó|Arrancó) hace ([^,;.]+)\.$/,
   (_,verb,time)=>{rules.push('time-first');return 'Hace '+time+' que '+verb.toLowerCase()+'.';});
  spoken=spoken.replace(/^No tengo nada de hambre desde que (empezó|comenzó|arrancó)\.$/,
   (_,verb)=>{rules.push('appetite-time-first');return 'Desde que '+verb+' no tengo nada de hambre.';});
  spoken=spoken.replace(/^(Tengo|Siento) náuseas y vomité una vez\.$/,
   (_,verb)=>{rules.push('vomit-first');return 'Vomité una vez y '+verb.toLowerCase()+' náuseas.';});
 }
 if(shape!==0){
  spoken=spoken.replace(/\bme duele (abajo|arriba|debajo|cerca|alrededor)\b/gi,
   (from,location)=>{rules.push('pain-location');return matchCase(from,'siento el dolor '+location);});
  spoken=spoken.replace(/\bme duele (toda la|todo el|la|el)\b/gi,
   (from,article)=>{rules.push('pain-object');return matchCase(from,'tengo dolor en '+article);});
 }
 // Reorder only self-contained statements. Temporal chains, references and
 // treatment/allergy histories are kept in their authored order.
 const sentences=spoken.split(/(?<=[.!?])\s+/);
 if(sentences.length>=2&&sentences.length<=4&&sentences.every(s=>
  /^(?:No |Nunca |Tengo |Estoy |Hace \d|Hipertensi[oó]n|Diabetes|Sin )/.test(s))&&
  !/despu[eé]s|antes|desde|hoy|ayer|por eso|esa |ese |esto|pero/i.test(spoken)){
  const offset=(languageHash(seed+':clause-order:'+topic)+repeat)%sentences.length;
  if(offset){spoken=[...sentences.slice(offset),...sentences.slice(0,offset)].join(' ');rules.push('independent-clause-order');}
 }
 return {spoken,rules:[...new Set(rules)]};
}
