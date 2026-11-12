// Metadata only. Original diagnoses, examination findings, studies, treatment
// policies and physiology remain the authored source of truth.
import {DEFAULT_PATIENT_VARIATION} from './patient-variation.js';
const intolerance=Object.freeze({id:'prior-amoxicillin-intolerance',drugId:'amoxicillin',type:'intolerance',
 severity:'mild',reaction:'nausea',probability:.12,
 historyDisclosure:'Con amoxicilina tuve náuseas; no tuve ronchas, dificultad para respirar ni desmayo.'});
const reactions=Object.freeze([
 {id:'prior-amikacin-anaphylaxis',drugId:'amikacin',type:'hypersensitivity',severity:'severe',reaction:'anaphylaxis',probability:.04,
  historyDisclosure:'Con amikacina tuve ronchas, dificultad para respirar y caída de presión; fue una reacción grave.'},
 {id:'prior-gentamicin-urticaria',drugId:'gentamicin',type:'hypersensitivity',severity:'mild',reaction:'urticaria',probability:.08,
  historyDisclosure:'Con gentamicina tuve ronchas y picazón, sin dificultad para respirar ni desmayo.'},intolerance
]);
const unknownHistory='No recuerdo otros antecedentes relevantes.';
const resolvedInjuries=[
 {id:'fractura-antigua-resuelta',answer:'Hace muchos años tuve una fractura de muñeca que consolidó sin secuelas.'},
 {id:'esguince-antiguo-resuelto',answer:'Tuve un esguince de tobillo hace años; me recuperé por completo y no me limita.'}
];
const isText=value=>typeof value==='string'&&value.trim().length>0;
const normalizeHistory=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9ñ]+/g,' ').trim().replace(/^doctor(?:a)? /,'');
const currentComplaints=c=>[c.opening,c.chief,c.history?.symptoms,c.common?.reason,c.common?.current]
 .flat().filter(isText).map(normalizeHistory);
const previousPersonalHistory=c=>c.anamnesis?.historySummary||c.common?.pmh?.[0]||unknownHistory;
const withInjury=(pmh,injury)=>pmh+' '+injury.answer;

function personalHistory(c){
 const complaints=currentComplaints(c);
 const intentAnswers=id=>c.intents?.find(intent=>intent.id===id)?.answers;
 // Keep a distinct authored summary where it already contains the patient's
 // full history. A copied complaint must defer to dedicated past history.
 const candidates=[c.history?.pmh,c.anamnesis?.pmh,intentAnswers('pmh'),c.anamnesis?.historySummary,
  c.common?.pmh,intentAnswers('prior')].flat();
 const answer=candidates.find(text=>{
  if(!isText(text))return false;
  const normalized=normalizeHistory(text);
  return normalized&&!complaints.includes(normalized)&&
   !/^(?:puedo comentarle mis antecedentes si me pregunta|no se documentaron otros antecedentes)\b/.test(normalized);
 });
 return answer?.trim()??unknownHistory;
}

// A prior guard keeps its original variation and receipt. Only project the
// generated option whose saved text exactly matches the old complaint copy.
export function readLegacyPersonalHistory(c,background){
 const pmh=background?.history?.pmh;
 const injury=resolvedInjuries.find(option=>option.id===background?.id);
 if(!injury)return pmh;
 const previous=previousPersonalHistory(c);
 if(pmh!==withInjury(previous,injury)||!isText(previous)||!currentComplaints(c).includes(normalizeHistory(previous)))return pmh;
 return withInjury(personalHistory(c),injury);
}

export const withPatientVariation=c=>withVariation(c,personalHistory);
export const withPreviousPatientVariation=c=>withVariation(c,previousPersonalHistory);
function withVariation(c,historyForCase){
 if(c.variation){
  const profile=c.variation===true?DEFAULT_PATIENT_VARIATION:c.variation;
  return {...c,variation:{...profile,allergies:[...(profile.allergies||[]),
   ...((profile.allergies||[]).some(x=>(x.type??x.reactionType)==='intolerance')?[]:[intolerance])]}};
 }
 const age=Number.parseInt(c.common?.age??'',10),anchor=Number.isFinite(age)?age:45;
 const pmh=historyForCase(c);
 return {...c,variation:{...DEFAULT_PATIENT_VARIATION,
  ageRange:[Math.max(18,anchor-8),Math.min(98,anchor+8)],
  openings:[c.opening||'Hola, doctor.'],allergies:reactions,
  // Original native and iatrogenic complications retain their existing owner.
  // No unimplemented random progression is added to these cases.
  complications:[],backgroundHistory:resolvedInjuries.map(injury=>({id:injury.id,history:{pmh:withInjury(pmh,injury)}}))}};
}
