// Dialogue canonical/source metadata is evidence to check, not ground truth.
// Compare it with the real case bank and the pre-interview owned patient.
import {PATIENT_PROFILES} from '../../src/v5/clinical/patient-profiles.js';
import {readPatientObservations} from '../../src/v5/clinical/patient-observations.js';
import {clinicalMeaning} from './personality-conversation-metrics.mjs';
function layAuthored(text){
 let result=String(text).replace(/(?:Comorbilidad|Contexto etiológico|Dato acompañante):[^.]*\.\s*/gi,'');
 for(const [a,b] of [
  [/\ben la fosa il[ií]aca derecha\b/gi,'abajo a la derecha de la panza'],
  [/\ben el hipocondrio derecho\b/gi,'debajo de las costillas a la derecha'],
  [/\ben el epigastrio\b/gi,'en la boca del estómago'],
  [/\bhipocondrio derecho\b/gi,'debajo de las costillas a la derecha'],
  [/\bfosa il[ií]aca derecha\b/gi,'abajo a la derecha de la panza'],
  [/\bepigastrio\b/gi,'boca del estómago'],[/\bictericia\b/gi,'piel y ojos amarillos'],
  [/\bcoluria\b/gi,'pis muy oscuro'],[/\bhematemesis\b/gi,'vómitos con sangre'],
  [/\bmelena\b/gi,'caca negra'],[/\bdisnea\b/gi,'falta de aire'],
  [/\banorexia\b/gi,'falta de ganas de comer'],[/\bastenia\b/gi,'cansancio'],
  [/\bedema\b/gi,'hinchazón'],[/\bascitis\b/gi,'hinchazón por líquido en la panza']])result=result.replace(a,b);
 return result;
}
const values=x=>(Array.isArray(x)?x:[x]).filter(x=>typeof x==='string');
const lookup=(object,path)=>path.split('.').reduce((o,k)=>o?.[k],object);
export function validateDialogueSources(evidence,c,patient){
 const h=c.history??{},profile=PATIENT_PROFILES[c.id]??{
  symptoms:c.opening||h.symptoms||c.chief,onset:h.onset,
  place:h.location||h.pain||'No puedo precisar bien dónde lo siento.',
  radiation:h.radiation||'No puedo precisar si se corre a otro lugar.',
  character:h.character||h.pain||'No puedo describirlo con más precisión ahora.',
  worse:h.worse||'No tengo claro qué lo empeora.',relief:h.relief||'No tengo claro qué lo alivia.'};
 const observed=readPatientObservations(patient,c.id,0),failures=[];
 let verified=0,dynamic=0;
 const allowedPrefixes=['Hola, doctor. ',...(c.clinicalPolicy?.historySource?.label?
  [c.clinicalPolicy.historySource.label+' (anamnesis indirecta): ']:[])];
 if(evidence?.prefix&&!allowedPrefixes.includes(evidence.prefix))failures.push('non-authored-speaker-prefix');
 for(const fact of evidence?.facts??[]){
  const source=String(fact.source??'').replace(/^indirect-history:/,'');
  let expected=[];
  if(/^(?:case\.)?intents\./.test(source))expected=values(c.intents.find(i=>i.id===source.split('.').at(-1))?.answers);
  else if(source==='case.history.onset')expected=values(profile.onset);
  else if(source.startsWith('native.patient-profile.')){
   const key=source.slice(23);
   expected=key==='intensity'?values(Number.isFinite(observed.pain)?'Ahora lo siento como '+observed.pain+' de 10.':h.intensity||'No puedo ponerle un número exacto ahora.'):values(profile[key]);
  }
  else if(source==='patient.identity')expected=['Tengo '+patient.age+' años.'];
  else if(source==='patient.backgroundHistory')expected=values(patient.backgroundHistory?.history?.pmh);
  else if(source==='patient.allergies'){
   const disclosed=[...new Set((patient.allergyHistory??[]).map(a=>a.historyDisclosure).filter(Boolean))];
   expected=[disclosed.join(' '),patient.allergyHistoryAnswer,
    [...disclosed,...values(patient.allergyHistoryAnswer)].join(' ')].filter(Boolean);
  }
  else if(source==='native.patient-observation'){
   const subjective=patient.liveVitals.spo2<90?'Me cuesta respirar, siento que me falta el aire. No me siento bien.':
    observed.bowelImpactionResolved?'Pude evacuar después de la desimpactación. Tengo menos presión y menos dolor en la panza.':
    observed.bowelDecompressed?'Con la sonda tengo menos náuseas y menos distensión, aunque todavía me duele y necesito que me sigan controlando.':
    observed.trend==='worse'?'Me siento peor, estoy muy débil y más mareado que antes.':
    observed.trend==='better'?'Me siento un poco mejor y menos mareado, aunque '+(profile.intensity>3?'la panza todavía me duele.':'todavía tengo molestias.'):
    patient.treatments.length?'Por ahora me siento parecido; todavía no noto una mejoría clara. '+profile.place:
    'Sigo como cuando llegué. '+profile.symptoms;
   const allowed=[subjective,'Me llamo '+(patient.name||c.common?.name||'Paciente')+'.',
    observed.neuro.verbal===4?'No sé bien… ¿estoy en mi casa? ¿Dónde estamos?':'Estoy en la guardia del hospital, para que me atiendan.',
    ...(observed.neuro.verbal===5?['Sé qué día es; me acuerdo de haber venido hoy a la guardia.']:[])];
   if(!allowed.some(x=>clinicalMeaning(layAuthored(x))===clinicalMeaning(fact.canonical)))failures.push('false-native-observation:'+fact.id);
   dynamic++;continue;
  }
  else if(source==='native.impaired-speech'){
   expected=[observed.neuro.verbal==null?'(No puede dar una respuesta verbal evaluable en este momento.)':
    observed.neuro.verbal===3?'(Pronuncia palabras sueltas, sin poder precisar lo que siente.)':observed.neuro.verbal===2?'Mmm…':'(No responde.)'];
  }
  else if(source==='native.symptom-unknown'){
   if(!/^No (?:puedo precisar bien|recuerdo exactamente cuándo empezó) [^.\d]+\.$/.test(fact.canonical))failures.push('invented-unknown-symptom:'+fact.id);
   else verified++;
   continue;
  }
  else expected=values(lookup(c,source.replace(/^case\./,'')));
  if(!expected.length||!expected.some(text=>clinicalMeaning(layAuthored(text))===clinicalMeaning(fact.canonical)))
   failures.push('non-authored-clinical-fact:'+fact.id+':'+fact.source);
  else verified++;
 }
 return {failures,verified,dynamic};
}
