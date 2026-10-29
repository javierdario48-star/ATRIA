import {csAnamnesisFact} from '../../clinical/anamnesis-intents.js';
import {PATIENT_PROFILES} from './patient-profiles.js';
import {readPatientObservations} from './patient-observations.js';
import {discloseAllergies,normalizePatientPersonality} from '../content/patient-variation.js';
import {patientRelationship,spontaneousHistory,composePatientConversation} from './patient-conversation.js';

const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
// Open-ended bedside questions are a distinct HISTORY intent, not a guessed
// organ finding. Matching only broad question shapes prevents stealing
// specific history, pain, orientation or treatment inquiries.
export function openHistoryIntent(raw){
 const n=normalize(raw).replace(/^(?:hola|buenas|buenos dias|buen dia|doctor|doctora)\s+/,'');
 if(/^(?:por que|porque|para que)\s+(?:(?:te|lo|la|le)\s+)?(?:trajeron|trajiste|viniste|vino|esta|estas|se encuentra)\s+(?:(?:aca|aqui|al hospital|en el hospital|a la guardia|en la guardia))?$/.test(n))return 'reason';
 if(/^(?:que|cuales|cual)\s+(?:(?:te|le|se)\s+)?(?:pasa|paso|sucede|ocurrio|trae|trajo|sientes|sentis|siente|molesta|molestias|sintomas|problema|tienes|tenes|tiene)(?:\s+(?:ahora|hoy|actualmente|por aqui|por aca|aca|para venir|en este momento))?$/.test(n))return 'reason';
 if(/^(?:sintomas|molestias|motivo de consulta|queja principal|enfermedad actual|que le ocurre|que te ocurre|que le pasa|que te pasa)$/.test(n))return 'reason';
 if(/^(?:que|cuales?) (?:son )?(?:(?:tus|sus|los|las) )?(?:sintomas|molestias|problemas)(?: (?:tenes|tienes|tiene|presentas|presenta|sentis|sientes|siente|ahora|hoy))?$/.test(n))return 'reason';
 if(/^(?:me podes|me puedes|puedes|podes) (?:decir|contar|explicar)(?:me)? (?:que te pasa|que te paso|que le pasa|que siente|que sentis|que sientes)$/.test(n))return 'reason';
 if(/^(?:contame|cuentame|digame|decime) (?:que te pasa|que te paso|que le pasa|que siente|que sentis|que sientes|por que viniste|por que vino)$/.test(n))return 'reason';
 if(/^(?:en que puedo ayudarte|en que puedo ayudarle|para que viniste|para que vino|que motivo te trajo)$/.test(n))return 'reason';
 if(/^(?:como|que tal)\s+(?:(?:te|se)\s+)?(?:encuentras|encuentra|estas|esta|sentis|sientes|siente|andas)(?:\s+(?:ahora|hoy|desde que llegaste|actualmente))?$/.test(n))return 'status';
 return null;
}
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
 result=result.replace(/\ben la fosa il[ií]aca derecha\b/gi,'abajo a la derecha de la panza')
  .replace(/\ben el hipocondrio derecho\b/gi,'debajo de las costillas a la derecha')
  .replace(/\ben el epigastrio\b/gi,'en la boca del estómago');
 for(const [re,to] of [[/\bhipocondrio derecho\b/gi,'debajo de las costillas a la derecha'],[/\bfosa il[ií]aca derecha\b/gi,'abajo a la derecha de la panza'],
  [/\bepigastrio\b/gi,'boca del estómago'],[/\bictericia\b/gi,'piel y ojos amarillos'],[/\bcoluria\b/gi,'pis muy oscuro'],
  [/\bhematemesis\b/gi,'vómitos con sangre'],[/\bmelena\b/gi,'caca negra'],[/\bdisnea\b/gi,'falta de aire'],
  [/\banorexia\b/gi,'falta de ganas de comer'],[/\bastenia\b/gi,'cansancio'],[/\bedema\b/gi,'hinchazón'],[/\bascitis\b/gi,'hinchazón por líquido en la panza']])result=result.replace(re,to);
 return result;
}
function exactFact(c,text){
 const inflect=x=>x.replace(/\banticoagulantes\b/g,'anticoagulante').replace(/\bregurgita\b/g,'regurgitacion');
 text=inflect(text);
 return c.intents.filter(i=>i.keys.some(k=>(' '+text+' ').includes(' '+inflect(normalize(k))+' ')))
  .sort((a,b)=>Math.max(...b.keys.map(k=>normalize(k).length))-Math.max(...a.keys.map(k=>normalize(k).length)))[0];
}
function authoredProfile(c){
 if(!c.clinicalPolicy||!c.history)return null;
 const h=c.history;
 return {symptoms:c.opening||h.symptoms||c.chief,
  onset:h.onset,place:h.location||h.pain||'No puedo precisar bien dónde lo siento.',
  radiation:h.radiation||'No puedo precisar si se corre a otro lugar.',
  character:h.character||h.pain||'No puedo describirlo con más precisión ahora.',
  worse:h.worse||'No tengo claro qué lo empeora.',relief:h.relief||'No tengo claro qué lo alivia.'};
}
/** Case-bound conversation context is not a second chat or clinical executor.
 * The authority records one global utterance/reply; this function only acquires
 * history and subjective observations. It never measures, treats or reassesses.
 */
export function executePatientDialogue(p,c,cmd,clock){
 if(cmd.intent.kind!=='history.ask')return null;
 const profile=PATIENT_PROFILES[c.id]??authoredProfile(c);if(!profile)return null;
 p.interview??={lastSymptom:null,dimensions:{},symptoms:{},subjective:null};
 const context=p.interview,observed=readPatientObservations(p,c.id,clock.nativeMinute),answers=[],disclosures=[];
 let sensitiveHistory=false;
 function note(id,answer,source){
  const entry={id,answer:lay(answer),source,eventId:cmd.eventId,patientUid:p.uid,nativeMinute:clock.nativeMinute};
  disclosures.push(entry);
  if(id&&!p.intentHistory.some(x=>x.id===id))p.intentHistory.push(entry);
  return entry;
 }
 function symptom(id,duration){
  const def=symptomQuestions.find(s=>s[0]===id),fact=c.intents.find(i=>i.id===id||id==='diarrhea'&&i.id==='bowel');
  const timed=fact?.answers.find(a=>/\b(hace|ayer|anoche|hoy|desde|semana\w*|hora\w*|dia\w*)\b|no (?:tuve|tengo|note)/.test(normalize(a)));
  const text=duration?timed||'No recuerdo exactamente cuándo empezó '+(def?.[2]||'ese síntoma')+'.':
   fact?.answers[0]||'No puedo precisar bien '+(def?.[2]||'ese síntoma')+' ahora.';
  const entry=note(fact?.id||'symptom:'+id,text,fact&&(!duration||timed)?'case.intents.'+fact.id:'native.symptom-unknown');
  context.lastSymptom=id;context.symptoms[id]=entry;answers.push(entry.answer);
 }
 function subjective(){
  let text;
  if(p.liveVitals.spo2<90)text='Me cuesta respirar, siento que me falta el aire. No me siento bien.';
  else if(observed.bowelImpactionResolved)text='Pude evacuar después de la desimpactación. Tengo menos presión y menos dolor en la panza.';
  else if(observed.bowelDecompressed)text='Con la sonda tengo menos náuseas y menos distensión, aunque todavía me duele y necesito que me sigan controlando.';
  else if(observed.trend==='worse')text='Me siento peor, estoy muy débil y más mareado que antes.';
  else if(observed.trend==='better')text='Me siento un poco mejor y menos mareado, aunque '+(profile.intensity>3?'la panza todavía me duele.':'todavía tengo molestias.');
  else if(p.treatments.length)text='Por ahora me siento parecido; todavía no noto una mejoría clara. '+profile.place;
  else text='Sigo como cuando llegué. '+profile.symptoms;
  context.subjective={answer:text,patientUid:p.uid,eventId:cmd.eventId,nativeMinute:clock.nativeMinute};return text;
 }
 const raw=cmd.intent.sourceText,n=normalize(raw),verbal=observed.neuro.verbal;
 const informant=c.clinicalPolicy?.historySource,
  proxyHistory=(verbal==null||verbal<=3)&&['companion','clinical-record'].includes(informant?.kind)&&informant.label;
 const greeting=/^(hola|hpla|holq|ola|buenas|buen dia|buenos dias|buenas tardes|buenas noches)\b/.test(n);
 if((verbal==null||verbal<=3)&&!proxyHistory)answers.push(verbal==null?'(No puede dar una respuesta verbal evaluable en este momento.)':
  verbal===3?'(Pronuncia palabras sueltas, sin poder precisar lo que siente.)':verbal===2?'Mmm…':'(No responde.)');
 else{
  // Preserve actual questions after greetings and independently process each
  // question/conjunction; a special answer must not swallow another domain.
  const clauses=String(raw||'').split(/[?¿;]+/).flatMap(x=>normalize(x).replace(/^y /,'').split(/\s+(?:y|ademas|tambien)\s+/)).filter(Boolean);
  for(const clause of clauses){
   // Bedside empathy/explanations are relationship input, not evidence that
   // the patient answered a symptom question ("con calma" is not analgesia).
   if(/^(?:le escucho|te escucho|le explico|te explico|estas preguntas ayudan|tomese su tiempo|tomate tu tiempo|necesito precisar|conteste rapido|no tengo tiempo|por favor sea breve)\b/.test(clause))continue;
   const openQuestion=openHistoryIntent(clause);
   if(openQuestion==='reason'){
    answers.push(note('interview:symptoms',profile.symptoms,'native.patient-profile.symptoms').answer);
    context.lastSymptom='chiefComplaint';continue;
   }
   if(openQuestion==='status'){answers.push(subjective());continue;}
   if(/como (?:estas|esta|te (?:sientes|sentis)|se siente)\b|(?:te|se) (?:sientes|sentis|siente) (?:mejor|peor)\b|estas (?:mejor|peor)\b|como (?:sigues|sigue|vas)\b|\b(?:mejoraste|mejoro)\b/.test(clause)){
    answers.push(subjective());continue;
   }
   if(/(?:sabes|sabe|decime|digame|en que lugar|donde).*(?:estas|esta|estamos)|(?:estas|esta) (?:orientad[oa]|confus[oa]|confundid[oa])|que (?:dia|fecha) es|como (?:te llamas|se llama)/.test(clause)){
    answers.push(verbal===4?'No sé bien… ¿estoy en mi casa? ¿Dónde estamos?':/como.*llama/.test(clause)?'Me llamo '+(p.name||c.common?.name||'Paciente')+'.':
     /dia|fecha/.test(clause)?'Sé qué día es; me acuerdo de haber venido hoy a la guardia.':'Estoy en la guardia del hospital, para que me atiendan.');continue;
   }
   const reactionQuestion=/\breaccion(?:es)?\b/.test(clause)&&/\b(?:medicamentos?|farmacos?|antibioticos?)\b/.test(clause);
   const personalHistory=/\bantecedentes?\b/.test(clause)&&!/alerg|reacci|quirurg|cirugi|operaci|familiar|medic|farmac/.test(clause);
   const historyQuestion=reactionQuestion?'alergias':personalHistory?'antecedentes personales':clause;
   const exact=exactFact(c,clause),fact=csAnamnesisFact(c,historyQuestion),duration=dimensions[1][1].test(clause),explicitPain=/\b(dolor|duele|molesta|hinchazon|hinchando)\b/.test(clause);
   const named=symptomQuestions.filter(([,re])=>re.test(clause));
   // A composite authored symptom (for example vomiting blood) carries
   // more information than the generic symptom word it contains.
   if(exact&&named.length&&!duration&&exact.keys.some(key=>normalize(key).includes(' ')&&
    (' '+clause+' ').includes(' '+normalize(key)+' '))){
    answers.push(note(exact.id,exact.answers[0],'case.intents.'+exact.id).answer);
    context.lastSymptom=exact.id;continue;
   }
   // Explicit postoperative history must not be swallowed by the generic
   // "surgeries" domain. A bare pain/fever duration follow-up still follows
   // its current symptom and cannot earn a postoperative-course fact.
   if(exact&&!explicitPain&&(exact.id==='surgery_history'||exact.id==='course'&&!duration)){
    answers.push(note(exact.id,exact.answers[0],'case.intents.'+exact.id).answer);context.lastSymptom=exact.id;continue;
   }
   // The effective 4.8.7 anamnesis adapter resolves these factual domains
   // before older case keyword scoring (for example, medication history).
   const identityAge=fact?.intent==='age'&&Number.isInteger(p.age)?'Tengo '+p.age+' años.':null;
   const historyIntent=fact?.intent??exact?.id;
   if(['allergies','meds','drugs','anticoagulants','anticoagulation','medications'].includes(historyIntent))sensitiveHistory=true;
   const backgroundAnswer=historyIntent==='pmh'?p.backgroundHistory?.history?.pmh:null;
   if(!named.length&&(fact?.text||identityAge||backgroundAnswer)&&!['onset','radiation','location','features','intensity','otherSymptoms','reason'].includes(historyIntent)){
    const id=exact?.id===historyIntent?exact.id:'anamnesis:'+historyIntent;
    const disclosures=historyIntent==='allergies'?discloseAllergies(p,true):[];
    const reactionType=a=>a?.type??a?.reactionType;
    const isSevere=a=>a?.severity==='severe'||reactionType(a)==='severe';
    const allergyDisclosures=disclosures.filter(a=>reactionType(a)!=='intolerance');
    const covered=new Set(allergyDisclosures.map(a=>a.drugId)),coveredSevere=new Set(allergyDisclosures.filter(isSevere).map(a=>a.drugId));
    const documented=[...(p.allergies||[]),...(p.clinicalFlags?.drugAllergies||[])];
    const severe=[...(p.severeAllergies||[]),...(p.clinicalFlags?.severeAllergies||[]),...documented.filter(isSevere)];
    const idOf=a=>typeof a==='string'?a:a?.drugId??a?.groupId;
    const needsFallback=!disclosures.length||documented.some(a=>reactionType(a)!=='intolerance'&&!covered.has(idOf(a)))||
     severe.some(a=>!coveredSevere.has(idOf(a)));
    const knownAllergy=documented.some(a=>reactionType(a)!=='intolerance'&&idOf(a))||severe.some(a=>idOf(a));
    const fallback=p.allergyHistoryAnswer||(knownAllergy?'Tuve reacciones a medicamentos, pero no puedo precisar el detalle ahora.':null);
    const allergyAnswer=[...new Set([...disclosures.map(a=>a.answer),
     ...(needsFallback&&fallback?[fallback]:[])])].join(' ');
    const actual=identityAge||backgroundAnswer||(historyIntent==='allergies'&&allergyAnswer?allergyAnswer:fact.text);
    if(historyIntent==='allergies')sensitiveHistory=true;
    answers.push(note(id,actual,identityAge?'patient.identity':backgroundAnswer?'patient.backgroundHistory':
     historyIntent==='allergies'&&allergyAnswer?'patient.allergies':fact.source).answer);context.lastSymptom=historyIntent;continue;
   }
   if(named.length){for(const [id] of named)symptom(id,duration);if(!explicitPain)continue;}
   let matches=dimensions.filter(([,re])=>re.test(clause));
   if(!matches.length&&context.lastSymptom==='pain'&&/^(como es|que tan fuerte|cuanto)$/.test(clause))
    matches=[dimensions.find(d=>d[0]===(clause==='como es'?'character':'intensity'))];
   if(matches.length===1&&matches[0][0]==='onset'&&!explicitPain&&context.lastSymptom&&context.lastSymptom!=='pain'){
    if(context.lastSymptom==='chiefComplaint'){
     answers.push(note('onset',profile.onset,'case.history.onset').answer);continue;
    }
    symptom(context.lastSymptom,true);continue;
   }
   if(matches.length){
    for(const [key] of matches){
     const text=key==='intensity'?(Number.isFinite(observed.pain)?'Ahora lo siento como '+observed.pain+' de 10.':
      c.history?.intensity||'No puedo ponerle un número exacto ahora.'):profile[key];
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
  if(greeting&&!proxyHistory){
   if(!answers.length)answers.push(note('interview:symptoms',profile.symptoms,'native.patient-profile.symptoms').answer);
   answers[0]='Hola, doctor. '+answers[0];
  }
 }
 // Only style the outward utterance; recorded clinical facts stay literal.
 // Never change impaired speech, allergies, drug names or other case facts.
 const rawAnswer=lay([...new Set(answers)].join(' '));
 const personality=normalizePatientPersonality(p.personality);
 const fluent=verbal>=5&&rawAnswer;
 const protectedAnswer=sensitiveHistory||/alergia|urticaria|anafilaxia/i.test(rawAnswer);
 const canStyle=fluent&&!protectedAnswer;
 const prefix={anxious:'Estoy preocupado. ',reserved:'Bueno… ',talkative:'Le cuento, doctor. ',
  irritable:'Esto me tiene molesto. ',scared:'Tengo miedo. ',uncooperative:'No tengo muchas ganas de hablar. '}[personality];
 if(proxyHistory)for(const entry of p.intentHistory)if(entry.eventId===cmd.eventId){
  entry.historySource={kind:informant.kind,label:informant.label};entry.source='indirect-history:'+entry.source;
 }
 let dialogue=null;
 let answer=proxyHistory&&rawAnswer?informant.label+' (anamnesis indirecta): '+rawAnswer:
  canStyle&&!p.behavior&&prefix?prefix+rawAnswer:rawAnswer;
 if(fluent&&p.behavior){
  const interaction=patientRelationship(context,cmd.actorId,p.behavior,raw),r=interaction.relationship;
  const facts=[...new Set(answers)].map((text,i)=>{
   const canonical=lay(text.replace(/^Hola, doctor\. /,'')),entry=disclosures.find(e=>e.answer===canonical);
   return {id:entry?.id??'interview:response:'+i,canonical,source:entry?.source??'native.patient-observation'};
  });
  const topic=disclosures.some(e=>e.id==='interview:symptoms')?'reason':
   disclosures.some(e=>e.id==='onset')?'onset':disclosures[0]?.id??'observation';
  const limited=p.liveVitals.spo2<90||p.liveVitals.sys<80||p.liveVitals.rr>=32;
  if(!protectedAnswer&&!limited&&!p.treatments.length&&observed.trend==='unchanged')for(const extra of spontaneousHistory(c,p.behavior,r,topic,facts)){
   const entry=note(extra.id,extra.canonical,extra.source);facts.push({...extra,canonical:entry.answer});
  }
  const composed=composePatientConversation(facts,{behavior:p.behavior,seed:p.variation?.seed??p.uid,
   relationship:r,topic,question:raw,interaction,sensitive:protectedAnswer,greeting,limited});
  answer=composed.answer;dialogue=composed.evidence;
 }
 if(answer&&!dialogue){
  const facts=[...new Set(answers)].map((text,i)=>{
   const canonical=lay(text.replace(/^Hola, doctor\. /,'')),entry=disclosures.find(e=>e.answer===canonical);
   return {id:entry?.id??'interview:response:'+i,canonical,spoken:canonical,
    source:entry?.source??(verbal<4||verbal==null?'native.impaired-speech':'native.patient-observation'),rules:[]};
  });
  dialogue={facts,remark:null,limited:true,styleApplied:false,
   prefix:proxyHistory?informant.label+' (anamnesis indirecta): ':greeting?'Hola, doctor. ':''};
 }
 const receipt={patientUid:p.uid,eventId:cmd.eventId,actorId:cmd.actorId,kind:cmd.intent.kind,id:cmd.intent.id,
  source:'native.patient-dialogue',...(answer?{answer}:{}),...(dialogue?{dialogue}:{}),message:answer||'No entendí la pregunta. Podés preguntarme por el inicio, síntomas o antecedentes.'};
 return {status:answer?'executed':'rejected',patientUid:p.uid,eventId:cmd.eventId,
  ...(!answer?{reason:'unknown-question'}:{}),receipt};
}
