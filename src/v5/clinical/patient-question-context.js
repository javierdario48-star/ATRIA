// Conversational shorthand only. The case and patient still supply every fact.
export const normalizePatientQuestion=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();

const medicineWords=['medicacion','medicamento','medicamentos','farmaco','farmacos','remedio','remedios','pastilla','pastillas'];
const taking=/\b(?:toma[sn]?|tomaste|tomaba[sn]?|usa[sn]?|usaba[sn]?)\b/;
const namedMedicines=/\b(?:paracetamol|acetaminofen|aspirina|losartan|metformina|atorvastatina|enalapril|carvedilol|furosemida|amlodipin[ao]|warfarina|heparina|prednisona|piridostigmina|anticoagulantes?|antibioticos?)\b/;
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

export function medicationIntent(text,topic){
 text=normalizePatientQuestion(text);
 // Reactions and recreational substances have their own history domains.
 if(/\balerg|\breaccion(?:es)?\b|\b(?:drogas?|cocaina|cannabis|marihuana|sustancias recreativas)\b/.test(text))return null;
 const medication=medicationQuestion(text)||namedMedicines.test(text)||
  /^(?:que|cuales) (?:toma[sn]?|usa[sn]?)$/.test(text)||topic==='meds'&&/\b(?:tomarla|tomarlo|tomarlas|tomarlos|dejarla|dejarlo)\b/.test(text);
 if(!medication)return null;
 if(/\b(?:exceso|sobredosis|mucho|demasiad[oa]|mas de lo|mas (?:pastillas|comprimidos))\b/.test(text))return 'overdose';
 if(/\b(?:suspend|dejaste|dejo|dejado|dej[ao]s? de tomar|interrump|abandon)/.test(text))return 'stopped';
 if(/\b(?:por (?:tu|su|mi) cuenta|automedic|sin receta|sin indicacion|para (?:el |la )?(?:dolor|fiebre|nauseas|diarrea|molestia))\b/.test(text))return 'selfMedication';
 if(/\b(?:irregular|olvid|omit|cumpl|como (?:te|le) (?:indicaron|recetaron)|todas las dosis|sin faltar|adherencia)/.test(text))return 'adherence';
 if(/\b(?:tomaste|tomo|usaste|recibiste|recibio|reciente\w*|nuev[oa]s?|ayer|hoy|anoche|ultima dosis|antes de venir)\b/.test(text))return 'recent';
 return 'routine';
}

export function medicationQuestion(text){
 return taking.test(text)&&/\b(?:para|alg(?:o|un[oa]s?))\b/.test(text)||
  text.split(' ').some(word=>medicineWords.some(reference=>nearWord(word,reference)));
}

export const unknownMedicationHistory=Object.freeze({
 routine:'No recuerdo qué medicamentos tomo habitualmente.',
 recent:'No recuerdo qué medicamentos tomé recientemente.',
 stopped:'No recuerdo si suspendí algún medicamento.',
 selfMedication:'No recuerdo si tomé algo por mi cuenta.',
 adherence:'No puedo precisar si tomé todas las dosis como me indicaron.',
 overdose:'No puedo precisar si tomé medicamentos en exceso.'
});

// These tags describe only the statements actually authored in medication
// history. A hepatotoxic-exposure denial says nothing about habitual drugs.
function medicationStatementKinds(statement){
 const n=normalizePatientQuestion(statement),kinds=new Set();
 if(/\b(?:exceso|sobredosis|demasiad|supraterapeut)/.test(n))kinds.add('overdose');
 if(/\b(?:suspend|deje|dejado|interrump|abandon)/.test(n))kinds.add('stopped');
 if(/\b(?:irregular|olvid|omit|no (?:tomo|tome) .*hoy|suspend|interrump|abandon)/.test(n))kinds.add('adherence');
 if(/\b(?:por (?:su|mi) cuenta|automedic|sin receta|sin indicacion)/.test(n))kinds.add('selfMedication');
 if(/\b(?:tomó|tomé|usó|usé|recibió|recibí)(?=\s|$)/i.test(statement)||
  /\b(?:reciente\w*|nuev[oa]s?|ayer|hoy|anoche|ultima dosis|antes|recibio|recibi|tomo .*(?:en exceso|por su cuenta))\b/.test(n)||kinds.has('stopped')||kinds.has('overdose'))kinds.add('recent');
 if(/\b(?:habitual\w*|domiciliari\w*|cronica|diarios?|por dia|al dia|ocasional|irregular\w*)\b/.test(n)||!kinds.size)kinds.add('routine');
 return kinds;
}

export function selectMedicationHistory(canonical,kind='routine',question=''){
 const parts=String(canonical).split(/(?<=[.!?;])\s+/).map(text=>({text,kinds:medicationStatementKinds(text)}));
 if(kind==='routine'){
  const primary=parts.filter(p=>p.kinds.has('routine'));
  return primary.length?{answer:canonical,complete:true,firstClauses:primary.map(p=>p.text)}:null;
 }
 const drug=normalizePatientQuestion(question).match(namedMedicines)?.[0];
 const chosen=parts.filter(p=>p.kinds.has(kind)&&(!drug||normalizePatientQuestion(p.text).includes(drug)));
 if(!chosen.length)return null;
 const answer=chosen.map(p=>p.text).join(' ');
 return {answer,complete:answer===canonical};
}

export function followUpQuestion(text,topic){
 // A demonstrative links the trailing drug reference to the current topic.
 if(topic==='meds')text=text.replace(/ (?:de )?(?:esa|ese|esas|esos) (?:medicamentos?|remedios?|pastillas?|farmacos?)$/,'');

 if(/^(?:cual(?:es)?|que|que mas)(?: (?:de (?:esos|esas)|fue|fueron|son|era|eran|te acordas|recuerda[sn]?|recordas|toma[sn]?|usa[sn]?|medicamentos?|remedios?|pastillas?))?$/.test(text))return 'which';
 if(/^(?:cuanto|cuanta|cuantos|cuantas|que dosis)(?: (?:toma[sn]?|usa[sn]?|de (?:eso|esa|ese)))?$/.test(text))return 'amount';
 if(/^(?:desde cuando|hace cuanto|cuando (?:fue|empezo|comenzo|arranco))(?: (?:empezo|comenzo|arranco|toma[sn]?|usa[sn]?|a (?:tomar|usarlo)))?$/.test(text))return 'when';
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
