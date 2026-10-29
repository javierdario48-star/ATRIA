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
export function withPatientVariation(c){
 if(c.variation){
  const profile=c.variation===true?DEFAULT_PATIENT_VARIATION:c.variation;
  return {...c,variation:{...profile,allergies:[...(profile.allergies||[]),
   ...((profile.allergies||[]).some(x=>(x.type??x.reactionType)==='intolerance')?[]:[intolerance])]}};
 }
 const age=Number.parseInt(c.common?.age??'',10),anchor=Number.isFinite(age)?age:45;
 const pmh=c.anamnesis?.historySummary||c.common?.pmh?.[0]||'No recuerdo otros antecedentes relevantes.';
 return {...c,variation:{...DEFAULT_PATIENT_VARIATION,
  ageRange:[Math.max(18,anchor-8),Math.min(98,anchor+8)],
  openings:[c.opening||'Hola, doctor.'],allergies:reactions,
  // Original native and iatrogenic complications retain their existing owner.
  // No unimplemented random progression is added to these cases.
  complications:[],backgroundHistory:[
   {id:'fractura-antigua-resuelta',history:{pmh:pmh+' Hace muchos años tuve una fractura de muñeca que consolidó sin secuelas.'}},
   {id:'esguince-antiguo-resuelto',history:{pmh:pmh+' Tuve un esguince de tobillo hace años; me recuperé por completo y no me limita.'}}
  ]}};
}
