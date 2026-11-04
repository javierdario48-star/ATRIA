// Conversational shorthand only. The case and patient still supply every fact.
export const normalizePatientQuestion=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();

const medicineWords=['medicacion','medicamento','medicamentos','farmaco','farmacos','remedio','remedios','pastilla','pastillas'];
const taking=/\b(?:toma[sn]?|tomaste|tomaba[sn]?|usa[sn]?|usaba[sn]?)\b/;
function nearWord(word,reference){
 if(word.length<5||Math.abs(word.length-reference.length)>1)return false;
 if(word.length!==reference.length){
  const [longer,shorter]=word.length>reference.length?[word,reference]:[reference,word];
  const index=[...longer].findIndex((letter,i)=>letter!==shorter[i]);
  return longer.slice(0,index)+longer.slice(index+1)===shorter;
 }
 const differing=[...word].flatMap((letter,i)=>letter===reference[i]?[]:[i]);
 const [a,b]=differing;
 return differing.length<=1||differing.length===2&&b===a+1&&word[a]===reference[b]&&word[b]===reference[a];
}

export function medicationQuestion(text){
 return taking.test(text)&&/\b(?:para|alg(?:o|un[oa]s?))\b/.test(text)||
  text.split(' ').some(word=>medicineWords.some(reference=>nearWord(word,reference)));
}

export function followUpQuestion(text){
 if(/^(?:cual(?:es)?|que|que mas)(?: (?:de (?:esos|esas)|fue|fueron|son|era|eran|te acordas|recuerda[sn]?|recordas|toma[sn]?|usa[sn]?|medicamentos?|remedios?|pastillas?))?$/.test(text))return 'which';
 if(/^(?:cuanto|cuanta|cuantos|cuantas|que dosis)(?: (?:toma[sn]?|usa[sn]?|de (?:eso|esa|ese)))?$/.test(text))return 'amount';
 if(/^(?:desde cuando|hace cuanto|cuando (?:fue|empezo|comenzo|arranco))(?: (?:empezo|comenzo|arranco|a (?:tomar|usarlo)))?$/.test(text))return 'when';
 if(/^(?:cuando (?:fue la ultima dosis|lo tomaste)|ultima dosis)$/.test(text))return 'lastDose';
 if(/^(?:antes|como (?:era|estaba) antes|que (?:tomaba[sn]?|paso) antes)$/.test(text))return 'previous';
 if(/^(?:despues|que paso despues|como (?:fue|siguio))$/.test(text))return 'course';
 if(/^(?:por que|para que)(?: (?:fue|paso|lo toma[sn]?|lo usa[sn]?))?$/.test(text))return 'why';
 return null;
}

const details={
 amount:/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|comprimidos?|pastillas?|unidades|veces)\b/i,
 when:/\b(?:desde\s+(?:hace|el|la|que)|hace\s+\w+\s+(?:anos?|meses?|dias?|semanas?|horas?|minutos?))\b/,
 lastDose:/\b(?:ultima (?:dosis|toma)|lo tome (?:ayer|hoy|anoche))\b/,
 previous:/\b(?:antes|previamente|deje|suspendi)\b/,
 course:/\b(?:despues|cambio|empeoro|mejoro|evolucion)\b/,
 why:/\b(?:porque|debido a|para (?:la|el|las|los|controlar)|por (?:una? |la |el )?(?:infeccion|reaccion|accidente|dolor))\b/
};
const unknownDetail={
 amount:'No puedo precisar esa cantidad.',
 when:'No recuerdo bien cuándo empezó.',
 lastDose:'No recuerdo cuándo tomé la última dosis.',
 previous:'No puedo precisar qué pasaba antes.',
 course:'No puedo precisar cómo siguió.',
 why:'No sé precisar el motivo.'
};
export function followUpDetail(entry,kind,topic){
 const text=entry?.answer;
 if(kind==='which'){
  if(topic==='meds'&&text&&/^(?:tomo|tengo) (?:algo|alguna\w* cosa\w*|medicacion) (?:habitual )?para\b/.test(normalizePatientQuestion(text)))
   return {answer:'No recuerdo el nombre del medicamento.'};
  return entry||{answer:topic==='meds'?'No recuerdo qué medicamentos tomo.':'No lo recuerdo con más detalle.'};
 }
 const unavailable=kind==='amount'&&topic==='meds'?'No puedo precisar la dosis que tomo.':unknownDetail[kind];
 if(!text)return {answer:unavailable};
 const sentences=text.split(/(?<=[.!?;])\s+/);
 const matcher=details[kind];
 const matching=sentences.filter(sentence=>matcher.test(kind==='amount'?sentence:normalizePatientQuestion(sentence)));
 return matching.length?{...entry,answer:matching.join(' ')}:{answer:unavailable};
}
