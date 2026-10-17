import {csAnamnesisFact} from '../../clinical/anamnesis-intents.js';
import {PATIENT_PROFILES} from './patient-profiles.js';
import {readPatientObservations} from './patient-observations.js';

const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const dimensions=[
 ['place',/que (?:te |le )?duele|(?:donde|en que (?:parte|lugar)) (?:te |le )?(?:duele|molesta)|donde siente|donde es el dolor|^donde$|que dolor|que le molesta/],
 ['onset',/hace cuanto|desde cuando|cuanto (?:tiempo|hace)|cuando (?:empezo|comenzo|arranco)|hace mucho|desde hace/],
 ['radiation',/se (?:te |le )?(?:corre|va|movio)|(?:hacia|a) (?:donde|otro lado)|irradia|irradiacion|cambio de lugar|se extendio/],
 ['character',/como (?:es|siente|sentis).*dolor|tipo de dolor|caracter|punz|quem|ardor|colico|continuo|retortij/],
 ['intensity',/intensidad|cuanto (?:te |le )?duele|cero al diez|0 al 10|escala|cuan fuerte/],
 ['worse',/empeora|agrava|mas dolor|mas fuerte|cuando.*(?:duele|molesta)|(?:caminar|mover|toser).*(?:duele|molesta)/],
 ['relief',/alivi|atenua|calma|mejora el dolor|menos dolor|posicion.*mejor/]
];
const symptomQuestions=[
 ['fever',/\b(fiebre|febricula|febril|temperatura|escalofrios)\b/,'la fiebre'],
 ['vomit',/\b(vomit\w*|nause\w*|arcadas|devolviste)\b/,'los vómitos'],
 ['diarrhea',/\b(diarrea|deposiciones liquidas|heces liquidas)\b/,'la diarrea'],
 ['jaundice',/\b(amarill\w*|ictericia|orina oscura|pis oscuro)\b/,'el color amarillo']
];
function lay(text){
 let result=text.replace(/(?:Comorbilidad|Contexto etiológico|Dato acompañante):[^.]*\.\s*/gi,'');
 for(const [re,to] of [[/\bhipocondrio derecho\b/gi,'debajo de las costillas a la derecha'],[/\bfosa il[ií]aca derecha\b/gi,'abajo a la derecha de la panza'],
  [/\bepigastrio\b/gi,'boca del estómago'],[/\bictericia\b/gi,'piel y ojos amarillos'],[/\bcoluria\b/gi,'pis muy oscuro'],
  [/\bhematemesis\b/gi,'vómitos con sangre'],[/\bmelena\b/gi,'caca negra'],[/\bdisnea\b/gi,'falta de aire'],
  [/\banorexia\b/gi,'falta de ganas de comer'],[/\bastenia\b/gi,'cansancio'],[/\bedema\b/gi,'hinchazón'],[/\bascitis\b/gi,'hinchazón por líquido en la panza']])result=result.replace(re,to);
 return result;
}
function exactFact(c,text){
 return c.intents.filter(i=>i.keys.some(k=>(' '+text+' ').includes(' '+normalize(k)+' ')))
  .sort((a,b)=>Math.max(...b.keys.map(k=>normalize(k).length))-Math.max(...a.keys.map(k=>normalize(k).length)))[0];
}
/** Case-bound conversation context is not a second chat or clinical executor.
 * The authority records one global utterance/reply; this function only acquires
 * history and subjective observations. It never measures, treats or reassesses.
 */
export function executePatientDialogue(p,c,cmd,clock){
 if(cmd.intent.kind!=='history.ask')return null;
 const profile=PATIENT_PROFILES[c.id];if(!profile)return null;
 p.interview??={lastSymptom:null,dimensions:{},symptoms:{},subjective:null};
 const context=p.interview,observed=readPatientObservations(p,c.id,clock.nativeMinute),answers=[];
 function note(id,answer,source){
  const entry={id,answer:lay(answer),source,eventId:cmd.eventId,patientUid:p.uid,nativeMinute:clock.nativeMinute};
  if(id&&!p.intentHistory.some(x=>x.id===id))p.intentHistory.push(entry);
  return entry;
 }
 function symptom(id,duration){
  const def=symptomQuestions.find(s=>s[0]===id),fact=c.intents.find(i=>i.id===id||id==='diarrhea'&&i.id==='bowel');
  const timed=fact?.answers.find(a=>/\b(hace|ayer|anoche|hoy|desde|semana\w*|hora\w*|dia\w*)\b|no (?:tuve|tengo|note)/.test(normalize(a)));
  const text=duration?timed||'No recuerdo exactamente cuándo empezó '+(def?.[2]||'ese síntoma')+'.':
   fact?.answers[0]||'No puedo precisar bien '+(def?.[2]||'ese síntoma')+' ahora.';
  const entry=note(fact?.id||'symptom:'+id,text,fact?'case.intents.'+fact.id:'native.symptom-unknown');
  context.lastSymptom=id;context.symptoms[id]=entry;answers.push(entry.answer);
 }
 function subjective(){
  let text;
  if(p.liveVitals.spo2<90)text='Me cuesta respirar, siento que me falta el aire. No me siento bien.';
  else if(observed.trend==='worse')text='Me siento peor, estoy muy débil y más mareado que antes.';
  else if(observed.trend==='better')text='Me siento un poco mejor y menos mareado, aunque '+(profile.intensity>3?'la panza todavía me duele.':'todavía tengo molestias.');
  else if(p.treatments.length)text='Por ahora me siento parecido; todavía no noto una mejoría clara. '+profile.place;
  else text='Sigo como cuando llegué. '+profile.symptoms;
  context.subjective={answer:text,patientUid:p.uid,eventId:cmd.eventId,nativeMinute:clock.nativeMinute};return text;
 }
 const raw=cmd.intent.sourceText,n=normalize(raw),verbal=observed.neuro.verbal;
 const greeting=/^(hola|hpla|holq|ola|buenas|buen dia|buenos dias|buenas tardes|buenas noches)\b/.test(n);
 if(verbal==null||verbal<=3)answers.push(verbal==null?'(No puede dar una respuesta verbal evaluable en este momento.)':
  verbal===3?'Dolor… panza…':verbal===2?'Mmm…':'(No responde.)');
 else{
  // Preserve actual questions after greetings and independently process each
  // question/conjunction; a special answer must not swallow another domain.
  const clauses=String(raw||'').split(/[?¿;]+/).flatMap(x=>normalize(x).replace(/^y /,'').split(/\s+(?:y|ademas|tambien)\s+/)).filter(Boolean);
  for(const clause of clauses){
   if(/como (?:estas|esta|te (?:sientes|sentis)|se siente)|(?:te|se) (?:sientes|sentis|siente) (?:mejor|peor)|estas (?:mejor|peor)|como (?:sigues|sigue|vas)|mejoraste|mejoro/.test(clause)){
    answers.push(subjective());continue;
   }
   if(/(?:sabes|sabe|decime|digame|en que lugar|donde).*(?:estas|esta|estamos)|(?:estas|esta) (?:orientado|confuso|confundido)|que (?:dia|fecha) es|como (?:te llamas|se llama)/.test(clause)){
    answers.push(verbal===4?'No sé bien… ¿estoy en mi casa? ¿Dónde estamos?':/como.*llama/.test(clause)?'Me llamo '+(c.common?.name||'Paciente')+'.':
     /dia|fecha/.test(clause)?'Sé qué día es; me acuerdo de haber venido hoy a la guardia.':'Estoy en la guardia del hospital, para que me atiendan.');continue;
   }
   const exact=exactFact(c,clause),fact=csAnamnesisFact(c,clause),duration=dimensions[1][1].test(clause),explicitPain=/\b(dolor|duele|molesta|hinchazon|hinchando)\b/.test(clause);
   const named=symptomQuestions.filter(([,re])=>re.test(clause));
   // The effective 4.8.7 anamnesis adapter resolves these factual domains
   // before older case keyword scoring (for example, medication history).
   if(!named.length&&fact?.text&&!['onset','radiation','location','features','intensity','otherSymptoms','reason'].includes(fact.intent)){
    const id=exact?.id===fact.intent?exact.id:'anamnesis:'+fact.intent;
    const actual=fact.intent==='allergies'&&p.allergyHistoryAnswer?p.allergyHistoryAnswer:fact.text;
    answers.push(note(id,actual,fact.intent==='allergies'&&p.allergyHistoryAnswer?'patient.allergies':fact.source).answer);context.lastSymptom=fact.intent;continue;
   }
   if(named.length){for(const [id] of named)symptom(id,duration);if(!explicitPain)continue;}
   let matches=dimensions.filter(([,re])=>re.test(clause));
   if(!matches.length&&context.lastSymptom==='pain'&&/^(como es|que tan fuerte|cuanto)$/.test(clause))
    matches=[dimensions.find(d=>d[0]===(clause==='como es'?'character':'intensity'))];
   if(matches.length===1&&matches[0][0]==='onset'&&!explicitPain&&context.lastSymptom&&context.lastSymptom!=='pain'){
    symptom(context.lastSymptom,true);continue;
   }
   if(matches.length){
    for(const [key] of matches){
     const text=key==='intensity'?'Ahora lo siento como '+observed.pain+' de 10.':profile[key];
     // Original markHistory could credit onset on a greeting, or migration on
     // intensity alone. Only a dimension that actually discloses it earns that fact.
     const historyId=key==='onset'?'onset':['place','radiation'].includes(key)?(c.intents.some(i=>i.id==='pain')?'pain':'migration'):'interview:'+key;
     context.dimensions[key]=note(historyId,text,'native.patient-profile.'+key);answers.push(lay(text));
    }
    context.lastSymptom='pain';continue;
   }
   if(exact){answers.push(note(exact.id,exact.answers[0],'case.intents.'+exact.id).answer);context.lastSymptom=exact.id;continue;}
   if(fact?.text){answers.push(note('anamnesis:'+fact.intent,fact.text,fact.source).answer);context.lastSymptom=fact.intent;continue;}
   if(/que (?:te |le )?pasa|que mas (?:sentis|siente|sientes)|otros? sintomas?|que (?:te |lo |la )?trajo|por que vin|motivo de consulta/.test(clause)){
    answers.push(note('interview:symptoms',profile.symptoms,'native.patient-profile.symptoms').answer);
   }
  }
  if(greeting){
   if(!answers.length)answers.push(note('interview:symptoms',profile.symptoms,'native.patient-profile.symptoms').answer);
   answers[0]='Hola, doctor. '+answers[0];
  }
 }
 const answer=lay([...new Set(answers)].join(' '));
 const receipt={patientUid:p.uid,eventId:cmd.eventId,actorId:cmd.actorId,kind:cmd.intent.kind,id:cmd.intent.id,
  source:'native.patient-dialogue',...(answer?{answer}:{}),message:answer||'No entendí la pregunta. Podés preguntarme por el inicio, síntomas o antecedentes.'};
 return {status:answer?'executed':'rejected',patientUid:p.uid,eventId:cmd.eventId,
  ...(!answer?{reason:'unknown-question'}:{}),receipt};
}
