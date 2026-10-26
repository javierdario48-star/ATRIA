/**
 * Minimal C09 clinical mentor response policy for the two characterized V5 cases.
 * No orders, timers, hidden clinical effects, new diagnoses or second chat state.
 * The room authority commits the exact response with the original utterance.
 */
import {diagnosticRequirements,physicianExaminationsPerformed} from './diagnostic-evidence.js';
const normal=s=>String(s||'').toLowerCase().normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/^(?:(?:doctor|dr)\.?\s*)?vega\b[,.:]?\s*/,'').trim();
export function vegaGuidance(patient,caseData,text,{mode='solo'}={}){
 const query=normal(text);
 if(!patient||!caseData||patient.caseId!==caseData.id)
  return 'Estoy aquí. Acercate al paciente y decime qué hallazgos tenés para razonar juntos.';
 if(patient.caseEnded)
  return 'La atención ya se cerró. Podemos revisar qué datos y decisiones quedaron documentados.';
 if(/\b(?:administra|administrar|pasa|pasar|indica|indicar|da|dar|ordena|ordenar|ejecuta|ejecutar)\b/.test(query)&&
    /\b(?:medicamento|farmaco|farmacos|droga|ringer|ceftriaxona|metronidazol|espironolactona|paracentesis|estudio|hemograma)\b/.test(query))
  return 'Puedo ayudarte a razonar la indicación, pero hablar conmigo no administra medicamentos ni solicita estudios. Usá Enfermería y verificá su comprobante.';
 if(/\b(?:dosis|miligramos|cuanto|cuanta|via|venosa)\b/.test(query))
  return 'No voy a adivinar una dosis. Consultá las opciones verificadas para este caso en el monitor; la vía, la preparación y la administración deben confirmarse.';
 if(!patient.lastVitalsKnown){
  return 'Primero obtené signos vitales reales. La estabilidad hemodinámica guía las prioridades, y abrir el monitor no reemplaza medir o conectarlo.';
 }
 if(!patient.examDone){
  return 'Ya tenemos signos. Ahora completá la exploración dirigida por regiones y técnicas; no confundas examinar con realizar una intervención.';
 }
 const required=caseData.requiredHistory||[];
 if(required.some(id=>!patient.intentHistory?.some(h=>h.id===id)))
  return 'Antes de cerrar una hipótesis, profundizá la anamnesis: inicio, evolución, antecedentes y síntomas asociados.';
 const evidence=diagnosticRequirements(caseData),performed=new Set(physicianExaminationsPerformed(patient));
 if(evidence.examinations.some(id=>!performed.has(id)))
  return 'Completá la exploración dirigida requerida. Sus hallazgos se registran en Examen físico, no como un estudio de enfermería.';
 if(evidence.studies.some(id=>!patient.orders?.some(o=>o.id===id&&o.status==='done')))
  return 'La evaluación clínica orienta los estudios. Elegí los pertinentes, esperá los resultados reales y contrastalos con la hipótesis.';
 if(patient.pendingTreatments?.length)
  return 'Hay intervenciones indicadas aún en preparación. No las cuentes como administradas; esperá el comprobante y reevaluá.';
 if(patient.treatments?.length&&!patient.lastReassessment)
  return 'Tras una intervención confirmada, reevaluá al paciente: signos actuales, evolución y respuesta clínica.';
 if(!patient.diagnosis)
  return 'Ya tenés información suficiente para formular y registrar una hipótesis razonada, y revisar si el destino es seguro.';
 return mode==='apprentice'?
  'Contrastá tu hipótesis con los hallazgos, verificá los tratamientos realmente ejecutados y comprobá los criterios de cierre antes de decidir el destino.':
  'Revisá si la evolución y los resultados sustentan tu diagnóstico y la conducta elegida. ¿Qué dato cambiaría tu decisión?';
}
