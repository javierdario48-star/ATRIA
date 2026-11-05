// Conversation can explain the controls. A patient-specific next action is
// delivered only through the contextual hint flow and its reveal receipt.
const normal=s=>String(s||'').toLowerCase().normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/^(?:(?:doctor|dr)\.?\s*)?vega\b[,.:]?\s*/,'').trim();
export function vegaGuidance(patient,caseData,text){
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
 return 'Seleccioná al paciente y abrí «¿Qué hago ahora? · −5% XP» para ver la próxima acción clínica.';
}
