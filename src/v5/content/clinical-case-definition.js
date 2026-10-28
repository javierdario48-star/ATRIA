// Content normalization only. No clinical effects, random state, execution or XP.
import {DEFAULT_PATIENT_VARIATION} from './patient-variation.js';
const aliases={
 onset:['desde cuando','cuando empezo','cuanto tiempo','inicio'],
 pmh:['antecedentes','enfermedades previas'],meds:['medicamentos','que toma','medicacion'],
 allergies:['alergias','reacciones a medicamentos'],risk:['factores de riesgo','riesgos','fuma','tabaco'],
 symptoms:['otros sintomas','que mas siente'],bleeding:['sangrado','sangre','hemorragia'],
 anticoagulation:['anticoagulantes','warfarina'],infection:['infecciones','fiebre'],
 weakness:['debilidad','fuerza'],onsetWindow:['ultima vez bien','hora de inicio'],
 support:['con quien vive','tiene ayuda en casa','puede volver a control','support'],
 baseline:['como era su estado habitual','como estaba antes','estado habitual','capacidad habitual','baseline'],
 response:['como respondio al tratamiento','le sirvio el inhalador','le hizo efecto','response'],
 exposure:['exposiciones recientes','contacto con tuberculosis','viajes recientes','exposure'],
 aspiration:['se atraganta al comer','dificultad para tragar','aspiracion','aspiration'],
 associated:['sintomas asociados','otras molestias','associated'],
 function:['puede hacer sus actividades','puede caminar','autonomia','function'],
 pain:['tiene dolor','donde le duele','como es el dolor','pain'],
 surgeries:['cirugias','operaciones previas','surgeries']
};
const text=x=>typeof x==='string'&&x.trim();
// Optional, authored prior reactions to available medicines outside the
// reference specialty regimens. Probabilities select game variants, not risk.
const optionalAllergies=Object.freeze([
 Object.freeze({id:'prior-morphine-anaphylaxis',drugId:'morphine',type:'hypersensitivity',severity:'severe',
  reaction:'anaphylaxis',probability:.06,historyDisclosure:'Con morfina tuve una reacción grave con ronchas, dificultad para respirar y caída de presión; me indicaron evitarla.'}),
 Object.freeze({id:'prior-amikacin-urticaria',drugId:'amikacin',type:'hypersensitivity',severity:'mild',
  reaction:'urticaria',probability:.08,historyDisclosure:'Con amikacina tuve ronchas y picazón, sin dificultad para respirar ni desmayo.'})
]);
export function defineClinicalCase(input){
 if(!input||!text(input.id)||!text(input.specialty)||!text(input.chief)||!text(input.opening)||!Array.isArray(input.dx)||!input.dx.length)throw Error('clinical case identity required');
 for(const key of ['onset','pmh','meds','allergies','risk'])if(!text(input.history?.[key]))throw Error('authored history required: '+key);
 const c=structuredClone(input),history=c.history,policy=c.clinicalPolicy;
 if(!policy||typeof policy!=='object')throw Error('clinical policy required');
 const ageRange=c.ageRange??[18,85],fields=c.examFindings??{};
 const interventions=c.interventions??(c.interventionIds||[]).map(id=>({id,label:id.replaceAll('_',' '),aliases:[id,id.replaceAll('_',' ')]}));
 const variation={...DEFAULT_PATIENT_VARIATION,ageRange,openings:[c.opening],...c.variation,
  allergies:c.allergyOptions??c.variation?.allergies??optionalAllergies,
  complications:(policy.complications||[]).map(x=>({...x,rationale:x.rationale||x.manifestation||x.id}))};
 return {...c,selector:c.selector||c.chief,area:c.area||c.specialty,demo:c.demo||'Paciente adulto',
  exam:c.exam||Object.values(fields).filter(text).join(' '),physicalExam:fields,variation,
  intents:c.intents||Object.entries(history).map(([id,answer])=>({id,keys:aliases[id]||[id],answers:[answer],reveal:answer})),
  common:{name:'Paciente',age:String(ageRange[0]),arrival:c.arrival||'Vine acompañado a la guardia.',reason:[c.chief],current:[c.opening],concern:[c.concern||'Quiero saber qué me pasa.'],allergies:[history.allergies],pmh:[history.pmh],surgeries:[history.surgeries||'No se documentaron otros antecedentes quirúrgicos en esta presentación.'],meds:[history.meds],pain:[history.pain||'El síntoma principal es '+c.chief.toLowerCase()],...c.common},
  anamnesis:{otherSymptoms:history.symptoms||c.opening,historySummary:history.pmh,meds:history.meds,...history,...c.anamnesis},
  interventions,requiredHistory:c.requiredHistory||['onset','risk'],keyStudies:c.keyStudies||[],keyInterventions:c.keyInterventions||[],
  pharmacology:{traits:policy.traits||[],...c.pharmacology},
  clinicalPolicy:{schemaVersion:1,...policy},
  clinicalExecutorId:'acute-policy-v1',closurePolicyId:'policy-closure-v1',studyPolicyId:'case-studies-v1',examPolicyId:'case-exam-v1'};
}
