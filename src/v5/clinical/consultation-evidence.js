import {assessDiagnosticImpression} from './diagnostic-assessment.js';
import {physicianExaminationsPerformed} from './diagnostic-evidence.js';

const refusal=(status,reasonCode,reason,decision='REJECTED_STABILIZATION_INSUFFICIENT')=>
 ({accepted:false,status,reasonCode,reason,decision});

export function consultationEvidenceReview(p,c,rule){
 const dx=assessDiagnosticImpression(c,p.diagnosis);
 if(!dx.sufficient)return refusal(dx.level==='missing'?'missing-dx':dx.level==='incompatible'?'unsubstantiated':'insufficient-dx',
  dx.reasonCode,dx.message,'REJECTED_DIAGNOSIS_INSUFFICIENT');
 if(p.lastVitalsKnown?.patientUid!==p.uid||!p.lastVitalsKnown.eventId)
  return refusal('missing-vitals','vitals-missing','La impresión está registrada. Faltan signos vitales efectivamente medidos; solicitar un monitor todavía no acredita su conexión.');
 const performed=new Set(physicianExaminationsPerformed(p)),required=rule?.requiredExams||[];
 const remaining=required.filter(key=>!performed.has(key==='neurological:all'?'neurological:neurological':key.replace(/^(?:heart|lungs):/,'thorax:')));
 const sufficient=required.length?!remaining.length:performed.size>0&&(p.examDone||new Set([...performed].map(x=>x.split(':')[0])).size>=2);
 if(!sufficient)return refusal('missing-exam','examination-incomplete',
  'La impresión y los signos están registrados. Falta completar el examen físico dirigido'+
  (remaining.length?' ('+[...new Set(remaining.map(x=>x.split(':')[0]))].join(', ')+')':'')+'.');
 return null;
}

// Adapt the existing case closure evaluator; do not create a second clinical
// checklist. Acceptance itself and other consultation responses cannot be
// prerequisites for evaluating this consultation.
export function consultationPreparationReview(assessment,{transfer=false,pendingTreatments=0}={}){
 if(!assessment||!Array.isArray(assessment.missing))throw Error('clinical readiness unavailable');
 if(pendingTreatments)return refusal('insufficient-stabilization','stabilization-insufficient',
  'Faltan intervenciones esenciales por ejecutar o confirmar. Mantener la preparación y reintentar tras su administración.');
 const missing=(assessment?.missing||[]).filter(message=>
  !/aceptaci[oó]n.*(?:servicio|receptor)|respuesta.*(?:interconsulta|receptor|quir[uú]rgica)|respuestas.*(?:receptor|consultas)|intervenciones y consultas pendientes/i.test(message)&&
  !/Esperar las administraciones y las respuestas/i.test(message)&&
  (transfer||!/anamnesis|reevaluar|observaci[oó]n cl[ií]nica/i.test(message)));
 if(!missing.length)return null;
 const study=missing.find(message=>/estudio|imagen|paracentesis diagn[oó]stica|(?:TC|angio)/i.test(message));
 return refusal(study?'missing-study':'insufficient-stabilization',study?'indispensable-study-pending':'stabilization-insufficient',
  study||'La indicación es pertinente, pero falta preparación clínica: '+missing.join(' '));
}
