// Isolated second V2 pilot. VARIX-001 V1 remains in the official catalog.
// One shared native physiology, drug delivery, consultation, closure and XP engine.
// Baveno VIII (2026), acute variceal hemorrhage: early vasoactive/antibiotic
// therapy, restrictive transfusion with resuscitation individualized for shock,
// endoscopy AFTER stabilization. Handoff does NOT perform endoscopic ligation.
// https://www.journal-of-hepatology.eu/article/S0168-8278%2826%2902778-9/fulltext
import rawCases from '../cases.json' with {type:'json'};
import {defineClinicalCase} from '../clinical-case-definition.js';
import {withPatientVariation} from '../legacy-patient-variation.js';
import {varixV2Graph} from './varix-v2-graph.js';

const old=rawCases.find(x=>x.id==='VARIX-001');
if(!old)throw Error('VARIX-001 V1 source missing');
const source=structuredClone(old);
source.specialty='Gastroenterología · hemorragia digestiva';
source.title='Hemorragia digestiva variceal con shock';
source.difficulty='avanzada';
// A paired V1/V2 seed keeps its original age and medicine-reaction draws.
// V2 adds only authored histories and a new independently seeded relapse.
source.ageRange=[47,63];
// V1 mis-modeled an upper endoscopy as an ordinary lab result available
// inside the emergency box after waiting. V2 requires the actual Gastro
// receiving consultation; neither ordering nor waiting executes ligation.
source.studies=source.studies.filter(study=>study.id!=='g_varix_egd');
source.history={
 onset:'Empecé a vomitar mucha sangre hace pocas horas; desde entonces estoy muy mareado.',
 pmh:'Tengo cirrosis con ascitis desde hace años y me habían hablado de várices esofágicas.',
 meds:'No tomo anticoagulantes. No puedo precisar toda mi medicación habitual.',
 allergies:'No recuerdo una alergia medicamentosa confirmada.',
 risk:'Tengo cirrosis y ascitis. Me habían advertido que podía sangrar por várices.',
 bleeding:'Vomité sangre roja dos veces y desde ayer hago deposiciones negras.'
};
source.variation={...withPatientVariation(old).variation,backgroundHistory:[
 {id:'varices-sin-ligadura',history:{pmh:'Tengo cirrosis y ascitis desde hace años. Me habían hablado de várices esofágicas, pero no recuerdo una ligadura previa.'}},
 {id:'paracentesis-remote',history:{pmh:'Tengo cirrosis y ascitis desde hace años. Me realizaron una paracentesis meses atrás. Me habían hablado de várices esofágicas.'}},
 {id:'fractura-remote',history:{pmh:'Tengo cirrosis y ascitis desde hace años. Hace años tuve una fractura de muñeca ya curada. Me habían hablado de várices esofágicas.'}}
]};
// This is only a simulated independent GAME branch, not an epidemiologic
// incidence. Resuscitation receipts and the native clock govern manifestation.
source.clinicalPolicy={
 schemaVersion:1,traits:['hepatic','bleed','portalHypertension'],
 trajectory:{early:[0,19,3,-17,-8,-1],late:[0,15,4,-17,-9,-2],
  earlyEnd:100,lateEnd:360,fluidResponse:.7},
 responses:[{allOf:['terlipressin'],delay:10,peak:100,
  offsets:[0,-5,-1,3,2,0]}],
 complications:[{
  id:'varix_v2_rebleeding',
  progressionId:'offset-ramp-v1',rescueId:'confirmed-rescue-v1',
  probability:.24,minMinute:5,requiredState:{sys:{lt:105}},
  offsets:[0,17,5,-18,-10,-2],riseMinutes:16,recoveryMinutes:18,
  rescueAllOf:['terlipressin','transfusion'],
  rationale:'Posible resangrado con hipotensión; el paciente sigue siendo inestable pese a los esfuerzos iniciales.',
  manifestation:'Nueva hematemesis con empeoramiento hemodinámico. Reevaluar y mantener soporte hasta recepción endoscópica.'
 }],
 closure:{
  destinations:['procedimiento','uti'],
  study:[['g_varix_cbc'],['g_varix_group']],
  // Do not block urgent transfer on endoscopy results; hemostasis belongs to
  // the receiving team. Medication still must be CONFIRMED, not merely ordered.
  treatment:[['iv','fluid','ceftriaxone','terlipressin'],
   ['iv','transfusion','ceftriaxone','terlipressin']],
  requiredExams:[],consult:{procedimiento:['gastro'],uti:['uti']},
  summary:'Traslado aceptado para endoscopía urgente/UTI. Sin ligadura endoscópica ni control definitivo del sangrado declarados. Continuar vigilancia y tratamiento hasta recepción.'
 }
};
const candidate=defineClinicalCase(source);
candidate.clinicalRevision='v2-candidate';
candidate.revisionSource='ATRIA-V5:VARIX-001';
candidate.clinicalGraph=varixV2Graph;
candidate.variation.independentComplicationDraws=true;
export const varixV2Candidate=Object.freeze(candidate);
export const varixV2ExperimentalPack=Object.freeze({
 schemaVersion:1,packId:'atria-gastro-varix-v2-staging',
 version:'2.0.0-candidate.1',cases:[varixV2Candidate]
});
