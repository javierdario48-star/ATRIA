// Bounded equivalent realizations. Never synthesize clinical propositions.
// Every rule keeps polarity, quantities, timing, locations and drug names.
export function languageHash(value){
 let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);
 h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return (h^(h>>>16))>>>0;
}
const matchCase=(from,to)=>/^[A-ZÁÉÍÓÚÑ]/.test(from)?to[0].toUpperCase()+to.slice(1):to;
const lowerInitial=text=>text[0].toLowerCase()+text.slice(1);
const medicine='losartán|metformina|aspirina|atorvastatina|furosemida|enalapril|carvedilol|amlodipin[ao]|paracetamol|piridostigmina|prednisona|warfarina';
const regimen=`(?:${medicine})(?: oral| crónica)?(?: \\d+(?:[.,]\\d+)? (?:mg|mcg|g)(?:/día| diarios?)?)?`;
const medicationList=new RegExp(`^${regimen}(?:(?:, | y )${regimen})*$`,'i');
const qualifiedMedication=new RegExp(`^(?:(.+) y )?(${medicine}) (irregular|ocasional|tomad[oa] irregularmente)$`,'i');
const lastDose=new RegExp(`^(${medicine}), última dosis (anoche|ayer|hoy|hace .+)$`,'i');
const drugCategory='medicación habitual|anticoagulantes(?: directos)?|antiagregantes|betabloqueantes|antiarrítmicos|digoxina|verapamilo|diltiazem|inhibidores PDE5|antibióticos previos|diuréticos';
const medicationAbsence=new RegExp(`^(?:No|Sin) ((?:${drugCategory})(?:(?:, | ni | o )(?:${drugCategory}))*)(?: (hoy))?$`,'i');
const medicationVerb={toma:'tomo',tomó:'tomé',usa:'uso',recibió:'recibí',suspendió:'suspendí'};
const chronicCondition='hipertensión(?: mal controlada)?|dislipidemia|diabetes(?: tipo ?2)?|miocardiopatía hipertensiva con FEVI \\d+%|fibrilación auricular|inmunosupresión crónica';
const conditionList=new RegExp(`^(?:${chronicCondition})(?:(?:, | y )(?:${chronicCondition}))*$`,'i');
const symptom='sudor frío|sudoración nocturna|náuseas|sensación de falta de aire|falta de aire(?: leve)?|fatiga|escalofríos|mareo(?: leve)?|ortopnea|fotofobia|dolor de cuello';
const symptomList=new RegExp(`^(?:${symptom})(?:(?:, | y )(?:${symptom}))*$`,'i');

// Convert only self-report constructions whose subject and time are known
// from the history domain. Other clauses (e.g. tests, instructions, attribution,
// or whether a named drug was ever taken) keep their authored wording.
function patientClause(text,domain,history){
 const say=to=>matchCase(text,to);
 if(/\b(?:su|mi|el|la) (?:padre|madre|hermano|hermana|hijo|hija|familiar|acompañante)\b/i.test(text))return text;
 if(['meds','medications','anticoagulants','anticoagulation','response','treatment'].includes(domain)){
  if(['anticoagulants','anticoagulation'].includes(domain)){
   if(/^Sin hemorragia previa, caída reciente ni cirugía$/i.test(text))
    return say('no he tenido sangrados, no me caí recientemente ni me operaron');
   const uncertainRhythm=/^duración de FA mayor de (\d+) h o incierta$/i.exec(text);
   if(uncertainRhythm)return say('no sé exactamente cuándo empezaron estos latidos desparejos; podrían llevar más de '+uncertainRhythm[1]+' horas');
  }
  if(medicationList.test(text))return say((/\bsuspendi[oó](?=\s|$)/i.test(history)?'mi medicación habitual es ':'tomo ')+lowerInitial(text));
  const qualified=qualifiedMedication.exec(text);
  if(qualified&&(!qualified[1]||medicationList.test(qualified[1]))){
   const [,other,name,frequency]=qualified;
   const earlier=other?lowerInitial(other).replace(/, ([^,]+)$/, ' y $1')+', y tomo ':'';
   return say('tomo '+earlier+lowerInitial(name)+(frequency.toLowerCase()==='ocasional'?' de vez en cuando':' de forma irregular'));
  }
  const recent=lastDose.exec(text);
  if(recent)return say('la última dosis de '+lowerInitial(recent[1])+' la tomé '+recent[2]);
  const absence=medicationAbsence.exec(text);
  if(absence){
   const [,items,today]=absence;
   const prior=items.split(/, | ni | o /i),current=prior.filter(item=>!/^antibióticos previos$/i.test(item));
   if(current.length!==prior.length){
    if(today)return text; // The timing of the two denials is ambiguous.
    const others=current.join(', ').replace(/, ([^,]+)$/,' ni $1');
    return say((others?'no tomo '+others+' y ':'')+'no tomé antibióticos antes');
   }
   return say((today?'hoy no tomé ':'no tomo ')+items);
  }
  return text
   .replace(/^Suspendió diurético(?=\s|$)/i,()=>say('suspendí el diurético'))
   .replace(/^((?:Aún |Nunca |No |Aún no )?)(toma|tomó|usa|recibió|suspendió)(?=\s)/i,(_,lead,verb)=>
    lead?lead+medicationVerb[verb.toLowerCase()]:say(medicationVerb[verb.toLowerCase()]))
   .replace(/^(Tomé [^.!?;]+) por su cuenta$/i,(_,taken)=>taken+' por mi cuenta')
   .replace(/^Niega ((?:sildenafil, vardenafil, tadalafil o avanafil)) recientes$/i,(_,drugs)=>say('no tomé '+drugs.replace(/ o /i,' ni ')+' recientemente'))
   .replace(/^Niega (inhibidores PDE5)$/i,(_,drugs)=>say('no usé '+drugs))
   .replace(/^Fue llamado por (hemocultivos externos positivos obtenidos hace .+)$/i,(_,context)=>say('me llamaron por '+context));
 }
 if(domain==='allergies'){
  return text.replace(/^(?:Niega|No (?:reconoce|conoce|refiere)|No se conocen) (alergias?\b.*)$/i,(_,details)=>say('no conozco '+details))
   .replace(/^Sin (alergias?\b.*)$/i,(_,details)=>say('no tengo '+details))
   .replace(/^(?:Sin|No) antecedentes? de (.+)$/i,(_,details)=>say('no tengo antecedentes de '+details))
   .replace(/^Niega (reacción alérgica\b.*)$/i,(_,details)=>say('no tuve '+details));
 }
 if(domain==='pmh'){
  if(conditionList.test(text))return say('tengo '+lowerInitial(text));
  // A complete, typed history construction keeps the valve, native status,
  // severity, procedure and interval together. No case ID or free-text
  // replacement can turn a different clinical statement into this fact.
  const valve=/^Valvulopatía (aórtica|mitral|tricuspídea|pulmonar) nativa (leve|moderada|grave)(?: y procedimiento urinario hace (\d+ (?:días?|semanas?|meses?)))?$/i.exec(text);
  if(valve)return say('tengo un problema '+valve[2].toLowerCase().replace(/a$/,'o')+' en mi propia válvula '+valve[1].toLowerCase()+
   (valve[3]?' y me hicieron un procedimiento en las vías urinarias hace '+valve[3]:''));
  if(/^(?:Sin|No) prótesis valvular ni dispositivo intracardíaco$/i.test(text))
   return say('no tengo una válvula artificial ni ningún dispositivo dentro del corazón');
  const absent=/^(?:Sin|No) ((?:ACV|insuficiencia cardíaca|insuficiencia renal|enfermedad neuromuscular|epilepsia|fibrilación auricular)\b.*)$/i.exec(text);
  if(absent)return say('no tengo antecedentes de '+absent[1]);
 }
 if(['symptoms','associated','otherSymptoms'].includes(domain)){
  if(symptomList.test(text))return say('tengo '+lowerInitial(text));
  const denied=/^Niega (dolor máximo instantáneo hacia espalda, síncope) o (déficit focal)$/i.exec(text);
  if(denied)return say('no tuve '+denied[1]+' ni '+denied[2]);
  const absent=/^Sin ((?:fiebre|síncope|cefalea|convulsión|dolor)\b.*)$/i.exec(text);
  if(absent)return say((/\bactual$/i.test(absent[1])?'no tengo ':/\binicial\b/i.test(absent[1])?'no tuve ':'no he tenido ')+absent[1]);
 }
 if(['pmh','surgeries','surgery_history','bleeding'].includes(domain)){
  if(/^(?:Sin|No) cirugía reciente$/i.test(text))return say('no me operaron recientemente');
  const operations=/^(?:(.+) y )?múltiples cirugías recientes( por [^,]+)?(?:, con exposición previa a (antibióticos [^,]+))?$/i.exec(text);
  if(operations&&(!operations[1]||conditionList.test(operations[1]))){
   const [,condition,reason,prior]=operations;
   return say((condition?'tengo '+lowerInitial(condition)+' y ':'')+'me hicieron varias cirugías recientes'+(reason||'')+
    (prior?', y ya había recibido '+prior:''));
  }
  const bleeding=/^(?:Sin|No) (sangrado activo|hemorragia activa), cirugía reciente (?:ni|o) (antecedentes de hemorragia intracraneal|hemorragia intracraneal previa)$/i.exec(text);
  if(bleeding)return say('no tengo '+bleeding[1]+', no me operaron recientemente ni '+(bleeding[2].endsWith(' previa')?'tuve ':'tengo ')+bleeding[2]);
 }
 return text;
}

export function speakPatientHistory(canonical,{domain,source,history=canonical,firstClauses}={}){
 // Typed reaction disclosures, indirect reports, and native observations
 // already carry their own voice and do not belong to this chart adapter.
 if(!/^(?:case\.(?:history|intents|anamnesis|common)\.|common\.|anamnesis\.|patient\.backgroundHistory$|native\.patient-profile\.)/.test(source??'')||
  /(?:^|[.;]\s+)(?:familiar|acompañante|padre|madre|médic[oa]|registro clínico)\s*:/i.test(history))
  return {spoken:canonical,rules:[]};
 let spoken=canonical.split(/((?<=[.!?;])\s+)/).map(part=>{
  const match=/^(.+?)([.!?;])?$/.exec(part);
  if(!match||!match[1].trim())return part;
  return patientClause(match[1],domain,history)+(match[2]??'');
 }).join('');
 // The question supplies priority, never new words or propositions. Only
 // complete authored medication clauses may move; linked temporal accounts
 // retain their sequence. The canonical chart fact stays in its original order.
 if(domain==='meds'&&firstClauses?.length&&!/despu[eé]s|por eso|esa |ese |esto|pero/i.test(canonical)){
  const original=canonical.split(/(?<=[.!?;])\s+/),realized=spoken.split(/(?<=[.!?;])\s+/);
  if(original.length===realized.length&&firstClauses.every(clause=>original.includes(clause))){
   const first=original.findIndex(clause=>firstClauses.includes(clause));
   const order=[first,...original.flatMap((_,i)=>i===first?[]:[i])];
   if(order.some((position,i)=>position!==i))spoken=order.map(i=>{
    const clause=realized[i].replace(/;$/,'.');return clause[0].toUpperCase()+clause.slice(1);
   }).join(' ');
  }
 }
 if(spoken!==canonical&&history!==canonical)spoken=spoken.replace(/;$/,'.');
 return {spoken,rules:spoken===canonical?[]:['patient-voice']};
}

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
export function realizeClinicalFact(canonical,{behavior,seed='',topic='',repeat=0,sensitive=false,domain,source,history,firstClauses}={}){
 let {spoken,rules}=speakPatientHistory(canonical,{domain,source,history,firstClauses});
 if(!behavior||sensitive)return {spoken,rules};
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
