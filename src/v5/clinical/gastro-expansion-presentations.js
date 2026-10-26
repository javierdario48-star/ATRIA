// Observation-only case presentations. These supply bedside findings and
// conversational flavor, never a physical/exposure/closure state mutation.
export const GASTRO_PHYSICAL_FINDINGS=Object.freeze({
 'VARIX-001':{appearance:'Palidez, diaforesis y signos clínicos de hipoperfusión.',skin:'Palidez, arañas vasculares y signos de hepatopatía crónica.',inspection:'Abdomen globoso con ascitis; no se evidencia perforación.',palpation:'Ascitis y leve molestia difusa sin contractura.',percussion:'Matidez desplazable por líquido libre.',liver:'Borde hepático de difícil delimitación por ascitis.',liverPercussion:'Matidez hepática de límites imprecisos.',bowel:'Ruidos presentes.'},
 'ENCEF-001':{appearance:'Somnolienta, enlentecida y con dificultad para mantener la atención.',skin:'Ictericia leve y eritema palmar.',inspection:'Ascitis moderada, sin contractura.',palpation:'Ascitis, sin defensa; no presenta signos de peritonitis manifiesta.',neuro:'Asterixis bilateral, desorientación temporal y enlentecimiento psicomotor.',liver:'Hígado difícil de palpar por ascitis.',bowel:'Ruidos presentes.'},
 'UC-AS-001':{appearance:'Febril y taquicárdica, con aspecto de enfermedad activa.',skin:'Palidez por pérdida hemática.',inspection:'Abdomen discretamente distendido, sin megacolon manifiesto inicial.',palpation:'Molestia en hemiabdomen inferior, sin signos de peritonitis.',bowel:'Ruidos aumentados, diarrea sanguinolenta referida.'},
 'CDI-001':{appearance:'Febril y con signos de deshidratación.',skin:'Mucosas secas.',inspection:'Abdomen levemente distendido.',palpation:'Dolor difuso leve, sin contractura.',bowel:'Ruidos hidroaéreos frecuentes.'},
 'DIVERT-001':{appearance:'Consciente, hemodinámicamente estable.',inspection:'Abdomen sin distensión importante.',palpation:'Dolor focal en fosa ilíaca izquierda sin defensa generalizada.',bowel:'Ruidos presentes.'},
 'LGIB-001':{appearance:'Pálido, sudoroso y mareado al incorporarse.',skin:'Mucosas pálidas.',inspection:'Abdomen no distendido.',palpation:'Abdomen blando, sin irritación peritoneal.',bowel:'Ruidos presentes.'},
 'HEPAT-001':{appearance:'Ictérica pero orientada, sin encefalopatía manifiesta.',skin:'Ictericia escleral y cutánea.',inspection:'Abdomen sin ascitis clínica.',palpation:'Leve dolor en hipocondrio derecho, sin defensa.',liver:'Hígado discretamente sensible; no se certifica hepatomegalia sin imagen.'},
 'DIARR-001':{appearance:'Sediento, mucosas secas y taquicardia.',skin:'Disminución leve de turgencia y mucosas secas.',inspection:'Abdomen no distendido.',palpation:'Dolor cólico leve difuso, sin signos peritoneales.',bowel:'Ruidos intestinales aumentados.'},
 'FECAL-001':{appearance:'Adulto mayor consciente con distensión y molestias.',inspection:'Abdomen distendido moderadamente.',palpation:'Abdomen blando, con contenido fecal palpable, sin defensa.',percussion:'Timpanismo variable por gas intestinal.',bowel:'Ruidos presentes sin datos de peritonitis.'},
 'PUD-001':{appearance:'Estable, sin palidez ni compromiso hemodinámico.',inspection:'Abdomen sin distensión.',palpation:'Sensibilidad epigástrica leve, sin defensa ni Blumberg.',bowel:'Ruidos presentes.'},
 'CELIAC-001':{appearance:'Delgada y pálida, sin compromiso agudo.',skin:'Palidez conjuntival compatible con ferropenia.',inspection:'Abdomen sin distensión importante.',palpation:'Dolor leve difuso, sin irritación peritoneal.',bowel:'Ruidos conservados.'},
 'ACAL-001':{appearance:'Estable, con discreto adelgazamiento.',inspection:'Sin signos abdominales de alarma.',palpation:'Abdomen blando, indoloro.',bowel:'Ruidos conservados.'}
});
const details={
 'VARIX-001':['Tengo mucho mareo y vomité bastante sangre.',9],
 'ENCEF-001':['No estoy segura de dónde estoy. Estoy confundida.',3],
 'UC-AS-001':['Tengo muchas deposiciones con sangre y fiebre.',7],
 'CDI-001':['La diarrea empezó después de los antibióticos.',6],
 'DIVERT-001':['Me duele abajo a la izquierda de la panza.',5],
 'LGIB-001':['Evacué sangre roja y me siento mareado.',7],
 'HEPAT-001':['Tengo los ojos amarillos, orina oscura y cansancio.',3],
 'DIARR-001':['Tengo diarrea acuosa y mucha sed.',5],
 'FECAL-001':['No puedo evacuar hace días, tengo presión en la panza.',4],
 'PUD-001':['Siento ardor en el epigastrio.',4],
 'CELIAC-001':['Llevo meses con diarrea y estoy perdiendo peso.',3],
 'ACAL-001':['Me cuesta tragar alimentos y líquidos.',4]
};
export const GASTRO_PATIENT_PROFILES=Object.freeze(Object.fromEntries(
 Object.entries(details).map(([id,[symptoms,intensity]])=>[id,{
  place:symptoms,onset:'Lo vengo notando desde que empezaron los síntomas.',
  radiation:'No tengo irradiación característica que pueda describir.',
  character:symptoms,intensity,worse:'No encontré un desencadenante claro.',
  relief:'No noté un alivio claro.',symptoms}])));
