import {defineClinicalCase} from '../clinical-case-definition.js';
import {hypoperfusionKidneyComplication} from './common-complications.js';

// Declarative adult cases only. All offsets are bounded educational trajectories
// on the existing clinical clock, not survival estimates or measured drug PK.
// Examination findings belong to the examination panel; studies retain their
// own result channel. No order, checklist or consultation executes treatment.
export const respiratoryCaseDefinitions = [
 {
  id: 'RESP-01', specialty: 'Respiratorio', title: 'Neumonía adquirida en la comunidad de bajo riesgo',
  difficulty: 'inicial', ageRange: [25, 54],
  chief: 'Fiebre, tos con expectoración y dolor al respirar desde hace tres días.',
  opening: 'Tengo fiebre y me duele un costado cuando toso.',
  variation: {backgroundHistory: [
   {"id": "fractura-remota", "history": {"pmh": "No tengo enfermedad cardíaca, pulmonar, renal ni diabetes. Nunca me internaron por una infección. A los dieciséis años tuve una fractura de muñeca que consolidó; no quedaron secuelas ni uso medicación por eso."}},
   {"id": "esguince-resuelto", "history": {"pmh": "No tengo enfermedad cardíaca, pulmonar, renal ni diabetes. Nunca me internaron por una infección. Hace cuatro años tuve un esguince de tobillo; me recuperé por completo y no me limita para caminar."}}
  ]},
  history: {
   onset: 'Empecé hace tres días con fiebre y tos; desde ayer expectoro y me duele el costado derecho al respirar profundo.',
   pmh: 'No tengo enfermedad cardíaca, pulmonar, renal ni diabetes. Nunca me internaron por una infección.',
   meds: 'Solo tomé paracetamol; no usé antibióticos en los últimos tres meses.',
   allergies: 'No conozco alergias a medicamentos; antes toleré amoxicilina.',
   risk: 'No tuve internaciones recientes, aspiración, viajes ni contacto conocido con tuberculosis. No fumo.',
   symptoms: 'No me falta el aire en reposo, no tuve desmayo ni confusión y puedo comer y beber.',
   support: 'Vivo con mi familia, puedo comprar la medicación y volver a control en 48–72 horas.'
  },
  vitals: {temp: 38.1, hr: 94, rr: 20, bp: '122/76', spo2: 96},
  examFindings: {
   appearance: 'Alerta, conversa en frases completas y tolera decúbito.', skin: 'Piel tibia, perfusión conservada, sin cianosis.',
   inspection: 'Excursión torácica conservada, sin tiraje ni uso de músculos accesorios.',
   palpation: 'Vibraciones vocales algo aumentadas en base derecha; sin dolor reproducible de pared.',
   percussion: 'Submatidez focal en base derecha.', bowel: 'Abdomen blando, ruidos presentes, sin dolor.',
   heart: 'Ritmo regular, sin soplos ni signos de congestión.', lungs: 'Crepitantes y soplo tubario focal en base derecha; sin sibilancias difusas.',
   neuro: 'Orientación, lenguaje y fuerza conservados; sin confusión.'
  },
  studies: [
   {id: 'g_resp01_cxr', label: 'Radiografía de tórax', aliases: ['radiografia de torax', 'rx torax', 'radiografía de tórax'], type: 'imaging', delay: 7, result: 'Consolidación segmentaria basal derecha sin derrame pleural ni cavitación.'},
   {id: 'g_resp01_cbc', label: 'Hemograma', aliases: ['hemograma', 'recuento leucocitario'], type: 'lab', delay: 8, result: 'Leucocitos 12.800/µl con neutrofilia; hemoglobina13,1g/dl y plaquetas normales.'},
   {id: 'g_resp01_renal', label: 'Urea, creatinina e ionograma', aliases: ['funcion renal', 'urea creatinina', 'ionograma'], type: 'lab', delay: 8, result: 'Urea28mg/dl, creatinina0,8mg/dl, sodio138 y potasio4,0mmol/l.'}
  ],
  dx: ['neumonia adquirida en la comunidad', 'neumonía adquirida en la comunidad', 'nac', 'neumonia bacteriana', 'neumonía basal derecha'],
  differential: ['Bronquitis viral', 'Infección viral respiratoria', 'Tromboembolismo pulmonar si aparecen datos discordantes'],
  requiredHistory: ['onset', 'allergies', 'pmh', 'support'], keyStudies: ['g_resp01_cxr'],
  interventionIds: ['amoxicillin'], keyInterventions: ['amoxicillin'],
  pharmacology: {coverageSets: [['amoxicillin']]},
  clinicalPolicy: {
   schemaVersion: 1, traits: ['infection'],
   trajectory: {early: [0.1, 2, 1, -1, 0, -0.2], late: [0.4, 10, 4, -5, -3, -2], earlyEnd: 12, lateEnd: 60, fluidResponse: 0},
   responses: [{allOf: ['amoxicillin'], delay: 30, peak: 240, offsets: [-0.5, -10, -3, 3, 2, 1]}],
   regimens: {amoxicillin: {dose: {amount: 1000, unit: 'mg', display: '1 g oral cada 8 h'}, intervalMinutes: 480, route: 'oral'}},
   closure: {destinations: ['alta'], treatment: [['amoxicillin']], requiredStudies: ['g_resp01_cxr'], study: [], requiredExams: ['thorax:auscultation'], consult: {}, dischargeTreatments: ['amoxicillin'], summary: 'Alta tras estratificar riesgo, confirmar tolerancia oral y apoyo, primera dosis administrada, plan antibiótico, signos de alarma y control en48–72h. Ajustar duración a estabilidad clínica; no prometer resolución inmediata de fiebre o infiltrado.'},
   complications: []
  }
 },
 {
  id: 'RESP-02', specialty: 'Respiratorio', title: 'Neumonía adquirida en la comunidad grave con sepsis',
  difficulty: 'avanzada', ageRange: [56, 82],
  chief: 'Disnea, fiebre y deterioro del estado general con hipotensión.',
  opening: 'Me falta mucho el aire y hoy casi no pude levantarme.',
  variation: {backgroundHistory: [
   {"id": "catarata-operada", "history": {"pmh": "Tengo hipertensión y diabetes tipo2; no tengo insuficiencia cardíaca conocida. Me operaron una catarata hace seis años, sin complicaciones; actualmente veo bien con mis anteojos."}},
   {"id": "lumbalgia-resuelta", "history": {"pmh": "Tengo hipertensión y diabetes tipo2; no tengo insuficiencia cardíaca conocida. Hace años tuve un episodio de lumbalgia después de un esfuerzo; cedió y no uso analgésicos habituales por eso."}}
  ]},
  history: {
   onset: 'Hace cuatro días tengo tos y fiebre; hoy empeoré de golpe, respiro rápido y oriné muy poco.',
   pmh: 'Tengo hipertensión y diabetes tipo2; no tengo insuficiencia cardíaca conocida.',
   meds: 'Tomo metformina y losartán. No recibí antibióticos IV ni estuve internado en los últimos tres meses.',
   allergies: 'No conozco alergias a penicilinas, cefalosporinas ni macrólidos.',
   risk: 'No tengo colonización conocida por MRSA o Pseudomonas ni bronquiectasias. No hubo aspiración aparente.',
   symptoms: 'La tos trae flema amarilla; me cuesta pensar con claridad y siento mareo al sentarme.',
   bleeding: 'No tuve sangrado, operaciones recientes ni anticoagulantes.'
  },
  vitals: {temp: 39.1, hr: 126, rr: 34, bp: '88/52', spo2: 85},
  examFindings: {
   appearance: 'Aspecto tóxico, habla en frases cortas, somnolencia leve pero responde.', skin: 'Extremidades frías, relleno capilar4s, sin petequias.',
   inspection: 'Taquipnea, uso de músculos accesorios, excursión disminuida en base derecha.',
   palpation: 'Vibraciones vocales aumentadas en base derecha; pulsos periféricos débiles.',
   percussion: 'Matidez basal derecha.', bowel: 'Abdomen blando, sin defensa, ruidos presentes.',
   heart: 'Taquicardia regular, sin soplo nuevo ni ingurgitación yugular.', lungs: 'Crepitantes extensos a derecha y basales izquierdos, soplo tubario derecho.',
   neuro: 'Obedece órdenes simples, desorientación temporal leve, sin focalidad.'
  },
  studies: [
   {id: 'g_resp02_cxr', label: 'Radiografía de tórax', aliases: ['radiografia de torax', 'rx torax'], type: 'imaging', delay: 7, result: 'Consolidación multilobar derecha y opacidades basales izquierdas; sin neumotórax.'},
   {id: 'g_resp02_gas', label: 'Gasometría arterial', aliases: ['gasometria arterial', 'gases arteriales', 'gasometría'], type: 'lab', delay: 5, result: 'Aire ambiente: pH7,32, PaCO2 30mmHg, PaO2 49mmHg, HCO3 15mmol/l; hipoxemia y acidosis metabólica.', repeatable: true, dynamic: true},
   {id: 'g_resp02_lactate', label: 'Lactato y función renal', aliases: ['lactato', 'acido lactico', 'funcion renal'], type: 'lab', delay: 6, result: 'Lactato4,4mmol/l, creatinina1,5mg/dl, urea65mg/dl; sodio134 y potasio4,4mmol/l.', repeatable: true, dynamic: true},
   {id: 'g_resp02_cbc', label: 'Hemograma y coagulación', aliases: ['hemograma', 'coagulograma'], type: 'lab', delay: 8, result: 'Leucocitos21.800/µl, plaquetas145.000/µl, Hb12,8g/dl; INR1,2.'},
   {id: 'g_resp02_cultures', label: 'Hemocultivos y cultivo de esputo', aliases: ['hemocultivos', 'cultivo de esputo', 'cultivos'], type: 'lab', delay: 8, result: 'Dos pares de hemocultivos y muestra respiratoria enviados; identificación y sensibilidad pendientes. La toma no debe retrasar el antibiótico.'}
  ],
  dx: ['neumonia grave', 'neumonía grave', 'nac grave', 'sepsis de foco pulmonar', 'shock septico por neumonia', 'shock séptico por neumonía'],
  differential: ['Neumonía viral con coinfección bacteriana', 'Tromboembolismo pulmonar', 'Edema pulmonar cardiogénico'],
  requiredHistory: ['onset', 'allergies', 'pmh', 'meds', 'risk'], keyStudies: ['g_resp02_cxr', 'g_resp02_gas', 'g_resp02_lactate'],
  interventionIds: ['oxygen', 'fluid', 'ceftriaxone', 'azithromycin', 'vasopressor', 'intubation'], keyInterventions: ['oxygen', 'ceftriaxone', 'azithromycin'],
  pharmacology: {coverageSets: [['ceftriaxone', 'azithromycin']]},
  clinicalPolicy: {
   schemaVersion: 1, traits: ['infection', 'hypovolemia', 'respiratoryFailure'],
   trajectory: {early: [0.2, 8, 3, -8, -4, -3], late: [0.4, 25, 9, -22, -13, -10], earlyEnd: 12, lateEnd: 60, fluidResponse: 0.7},
   responses: [
    {allOf: ['ceftriaxone', 'azithromycin'], delay: 20, peak: 120, offsets: [-1.2, -25, -9, 22, 12, 5]},
    {allOf: ['intubation'], delay: 2, peak: 20, offsets: [0, -10, -12, -3, -2, 8]}
   ],
   regimens: {
    ceftriaxone: {dose: {amount: 2000, unit: 'mg', display: '2 g IV cada 24 h'}, intervalMinutes: 1440, route: 'iv'},
    azithromycin: {dose: {amount: 500, unit: 'mg', display: '500 mg IV cada 24 h, en al menos60min'}, intervalMinutes: 1440, administrationMinutes: 60, route: 'iv'}
   },
   closure: {destinations: ['sala', 'uti'], treatment: [['oxygen', 'ceftriaxone', 'azithromycin']], requiredStudies: ['g_resp02_cxr', 'g_resp02_gas', 'g_resp02_lactate'], study: [], requiredExams: ['thorax:auscultation'], consult: {sala: ['clinica'], uti: ['uti']}, dischargeTreatments: [], summary: 'NAC grave: antibióticos tempranos, O2, evaluación de perfusión y bolos prudentes con reevaluación; noradrenalina si hipotensión persiste. Tomar cultivos sin demorar antibióticos. UTI con shock, hipoxemia persistente o soporte; sala solo después de respuesta sostenida y aceptación. No alta.'},
   complications: [{id: 'resp02_refractory_hypoxemia', progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability: 0.15, minMinute: 18, requiredState: {spo2: {lt: 91}}, offsets: [0, 8, 5, -7, -4, -7], riseMinutes: 15, rescueAllOf: ['intubation'], recoveryMinutes: 25, manifestation: 'Insuficiencia respiratoria hipoxémica progresiva; requiere evaluar protección de vía aérea y soporte invasivo.'}, hypoperfusionKidneyComplication('resp02', ['fluid', 'vasopressor'])]
  }
 },
 {
  id: 'RESP-03', specialty: 'Respiratorio', title: 'Exacerbación de EPOC con insuficiencia respiratoria hipercápnica',
  difficulty: 'intermedia', ageRange: [58, 82],
  chief: 'Disnea creciente y esputo purulento en paciente con EPOC.',
  opening: 'Los inhaladores ya no me alcanzan y la flema cambió de color.',
  variation: {backgroundHistory: [
   {"id": "catarata-remota", "history": {"pmh": "Tengo EPOC confirmado por espirometría; tuve una internación con máscara de ventilación hace dos años. No uso O2 en casa. Me operaron una catarata hace ocho años, con buena recuperación y sin tratamiento sistémico posterior."}},
   {"id": "fractura-consolidada", "history": {"pmh": "Tengo EPOC confirmado por espirometría; tuve una internación con máscara de ventilación hace dos años. No uso O2 en casa. Tuve una fractura de muñeca hace más de diez años; consolidó sin secuelas y antes de esta crisis usaba el brazo normalmente."}}
  ]},
  history: {
   onset: 'Desde hace tres días tengo más falta de aire, mayor cantidad de flema y ahora es verde.',
   pmh: 'Tengo EPOC confirmado por espirometría; tuve una internación con máscara de ventilación hace dos años. No uso O2 en casa.',
   meds: 'Uso tiotropio diario y salbutamol de rescate. Hoy lo repetí varias veces con alivio breve.',
   allergies: 'No tengo alergias conocidas a medicamentos y antes toleré amoxicilina/clavulánico.',
   risk: 'Fumé45 paquetes-año; dejé hace dos años. No tuve internación ni antibióticos en los últimos tres meses.',
   symptoms: 'No tengo dolor torácico súbito, hemoptisis, hinchazón de una sola pierna ni ortopnea nueva.',
   baseline: 'Habitualmente camino una cuadra; hoy me falta el aire al hablar. No tengo somnolencia habitual.'
  },
  vitals: {temp: 37.8, hr: 112, rr: 30, bp: '142/82', spo2: 84},
  examFindings: {
   appearance: 'Alerta, habla en frases cortas y coopera con la máscara.', skin: 'Cianosis distal leve, perfusión periférica conservada.',
   inspection: 'Tórax hiperinsuflado, espiración prolongada, tiraje y uso de músculos accesorios.',
   palpation: 'Expansión disminuida bilateralmente y simétrica; sin enfisema subcutáneo.',
   percussion: 'Hipersonoridad difusa, sin matidez focal.', bowel: 'Abdomen blando, ruidos presentes.',
   heart: 'Taquicardia regular, sin tercer ruido ni ingurgitación yugular significativa.', lungs: 'Sibilancias y roncus bilaterales, murmullo vesicular disminuido difusamente; sin foco de soplo tubario.',
   neuro: 'Orientación conservada, sin focalidad ni asterixis inicial.'
  },
  studies: [
   {id: 'g_resp03_gas', label: 'Gasometría arterial', aliases: ['gasometria', 'gases arteriales', 'gasometría arterial'], type: 'lab', delay: 5, result: 'Aire ambiente: pH7,29, PaCO2 64mmHg, PaO2 48mmHg, HCO3 30mmol/l. Acidosis respiratoria aguda sobre retención crónica de CO2.', repeatable: true, dynamic: true},
   {id: 'g_resp03_cxr', label: 'Radiografía de tórax', aliases: ['radiografia torax', 'rx torax', 'radiografía de tórax'], type: 'imaging', delay: 7, result: 'Hiperinsuflación pulmonar sin consolidación, edema ni neumotórax.'},
   {id: 'g_resp03_ecg', label: 'Electrocardiograma', aliases: ['ecg', 'electrocardiograma'], type: 'procedure', delay: 5, result: 'Taquicardia sinusal112/min, sin isquemia aguda ni arritmia sostenida.'},
   {id: 'g_resp03_labs', label: 'Hemograma, creatinina e ionograma', aliases: ['hemograma', 'creatinina', 'ionograma'], type: 'lab', delay: 8, result: 'Leucocitos13.600/µl, creatinina0,9mg/dl, potasio3,8mmol/l; hemoglobina14,8g/dl.'}
  ],
  dx: ['exacerbacion de epoc', 'exacerbación de epoc', 'epoc reagudizado', 'insuficiencia respiratoria hipercapnica', 'insuficiencia respiratoria hipercápnica'],
  differential: ['Neumonía', 'Edema pulmonar cardiogénico', 'Tromboembolismo pulmonar', 'Neumotórax'],
  requiredHistory: ['onset', 'pmh', 'meds', 'allergies', 'baseline'], keyStudies: ['g_resp03_gas', 'g_resp03_cxr'],
  interventionIds: ['oxygen', 'salbutamol', 'ipratropium', 'methylprednisolone', 'amoxiclav', 'niv', 'intubation'], keyInterventions: ['oxygen', 'salbutamol', 'ipratropium', 'methylprednisolone', 'niv'],
  pharmacology: {coverageSets: [['amoxiclav']]},
  clinicalPolicy: {
   schemaVersion: 1, traits: ['bronchospasm', 'infection', 'hypercapnicFailure'], oxygenTarget: [88, 92],
   trajectory: {early: [0.1, 5, 3, -3, -1, -2], late: [0.4, 18, 8, -12, -6, -7], earlyEnd: 12, lateEnd: 60, fluidResponse: 0.1},
   responses: [
    {allOf: ['salbutamol'], delay: 1, peak: 10, offsets: [0, -4, -4, 0, 0, 1]},
    {allOf: ['ipratropium'], delay: 2, peak: 20, offsets: [0, -3, -2, 0, 0, 1]},
    {allOf: ['methylprednisolone'], delay: 20, peak: 120, offsets: [-0.1, -5, -3, 0, 0, 1]},
    {allOf: ['niv'], delay: 2, peak: 20, offsets: [0, -10, -7, -3, -2, 4]},
    {allOf: ['amoxiclav'], delay: 30, peak: 240, offsets: [-0.4, -8, -2, 0, 0, 1]},
    {allOf: ['intubation'], delay: 2, peak: 25, offsets: [0, -8, -10, -3, -2, 5]}
   ],
   regimens: {
    methylprednisolone: {dose: {amount: 32, unit: 'mg', display: '32 mg IV/día, equivalente a prednisona40mg'}, intervalMinutes: 1440, route: 'iv'},
    amoxiclav: {dose: {amount: 1200, unit: 'mg', display: '1,2 g IV cada 8 h'}, intervalMinutes: 480, route: 'iv'},
    salbutamol: {dose: {amount: 5, unit: 'mg', display: '5 mg nebulizados'}, intervalMinutes: 20, route: 'inhaled'}
   },
   closure: {destinations: ['observacion', 'sala', 'uti'], treatment: [['oxygen', 'salbutamol', 'ipratropium', 'methylprednisolone', 'amoxiclav', 'niv'], ['oxygen', 'salbutamol', 'ipratropium', 'methylprednisolone', 'amoxiclav', 'intubation']], requiredStudies: ['g_resp03_gas', 'g_resp03_cxr'], study: [], requiredExams: ['thorax:auscultation'], consult: {sala: ['clinica'], uti: ['uti']}, dischargeTreatments: [], summary: 'O2 controlado objetivo88–92%, SABA/SAMA y corticoide; ATB indicado por disnea y volumen/purulencia de esputo. Acidosis7,29 e hipercapnia requieren VNI supervisada y gasometría de control. Reevaluar15–30min; intubar ante fracaso, agotamiento o pérdida de protección de vía aérea. Observación solo con mejoría sostenida y capacidad de monitorización; no alta inicial.'},
   complications: [{id: 'resp03_niv_failure', progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability: 0.12, minMinute: 25, requiredState: {spo2: {lt: 90}}, offsets: [0, 9, 4, -8, -4, -5], riseMinutes: 15, rescueAllOf: ['intubation'], recoveryMinutes: 25, manifestation: 'Fracaso ventilatorio hipercápnico con agotamiento; reevaluar vía aérea y soporte invasivo.'}]
  }
 },
 {
  id: 'RESP-04', specialty: 'Respiratorio', title: 'Exacerbación asmática aguda grave',
  difficulty: 'avanzada', ageRange: [18, 48],
  chief: 'Disnea intensa, sibilancias y dificultad para hablar pese al rescate habitual.',
  opening: 'No puedo sacar el aire y el inhalador me ayuda cada vez menos.',
  variation: {backgroundHistory: [
   {"id": "eccema-infantil", "history": {"pmh": "Tengo asma desde la infancia; una vez estuve en UTI, aunque nunca me intubaron. De niño tuve eccema leve en los pliegues, que desapareció; no uso cremas ni tratamiento sistémico por ese antecedente."}},
   {"id": "esguince-deportivo", "history": {"pmh": "Tengo asma desde la infancia; una vez estuve en UTI, aunque nunca me intubaron. Hace tres años tuve un esguince haciendo deporte; se resolvió y entre las crisis podía hacer mi actividad habitual."}}
  ]},
  history: {
   onset: 'Empeoré desde anoche tras un resfrío y hoy el pecho se cerró mucho en pocas horas.',
   pmh: 'Tengo asma desde la infancia; una vez estuve en UTI, aunque nunca me intubaron.',
   meds: 'Uso salbutamol de rescate. Dejé el corticoide inhalado hace un mes porque se terminó.',
   allergies: 'No tengo alergias conocidas a medicamentos ni contacto con un alérgeno nuevo.',
   risk: 'Tuve dos consultas por crisis este año y necesité prednisona hace tres meses.',
   symptoms: 'No tuve fiebre alta, flema purulenta, dolor pleurítico súbito, ronchas ni hinchazón de lengua.',
   response: 'Hoy hice varias inhalaciones de salbutamol con alivio de pocos minutos; me estoy cansando.'
  },
  vitals: {temp: 37.1, hr: 128, rr: 34, bp: '132/78', spo2: 86},
  examFindings: {
   appearance: 'Ansiedad y dificultad para completar frases; alerta al ingreso.', skin: 'Diaforesis y cianosis peribucal leve, sin urticaria.',
   inspection: 'Uso intenso de músculos accesorios, tiraje y espiración prolongada.',
   palpation: 'Expansión bilateral disminuida, sin asimetría focal ni enfisema subcutáneo.',
   percussion: 'Hipersonoridad bilateral simétrica.', bowel: 'Abdomen blando, sin dolor ni distensión.',
   heart: 'Taquicardia regular, sin soplos ni ingurgitación yugular.', lungs: 'Sibilancias espiratorias difusas con entrada de aire reducida bilateralmente; sin crepitantes focales.',
   neuro: 'Consciente y orientado inicialmente; vigilar agotamiento, somnolencia y menor esfuerzo.'
  },
  studies: [
   {id: 'g_resp04_pef', label: 'Flujo espiratorio pico', aliases: ['pef', 'pico flujo', 'flujo espiratorio pico', 'peak flow'], type: 'procedure', delay: 5, result: 'PEF130l/min, aproximadamente28% de su mejor valor; medición breve si puede colaborar, sin demorar tratamiento.', repeatable: true, dynamic: true},
   {id: 'g_resp04_gas', label: 'Gasometría arterial', aliases: ['gasometria', 'gases arteriales', 'gasometría arterial'], type: 'lab', delay: 5, result: 'Aire ambiente: pH7,35, PaCO2 42mmHg y PaO2 51mmHg. CO2 normal-alto en crisis grave: dato de alarma por fatiga.', repeatable: true, dynamic: true},
   {id: 'g_resp04_labs', label: 'Ionograma y función renal', aliases: ['ionograma', 'potasio', 'funcion renal'], type: 'lab', delay: 8, result: 'Potasio3,5mmol/l, magnesio1,8mg/dl, creatinina0,8mg/dl; sin alteraciones metabólicas mayores.'},
   {id: 'g_resp04_cxr', label: 'Radiografía de tórax si mala respuesta o complicación', aliases: ['radiografia de torax', 'rx torax'], type: 'imaging', delay: 8, result: 'Hiperinsuflación sin consolidación ni neumotórax. No es estudio rutinario ni debe demorar el rescate.'}
  ],
  dx: ['asma aguda grave', 'exacerbacion asmatica grave', 'exacerbación asmática grave', 'crisis asmatica grave', 'crisis asmática grave', 'estado asmatico', 'estado asmático'],
  differential: ['Neumotórax', 'Anafilaxia', 'Obstrucción laríngea inducible', 'Tromboembolismo pulmonar'],
  requiredHistory: ['onset', 'pmh', 'meds', 'allergies', 'response'], keyStudies: ['g_resp04_pef', 'g_resp04_gas'],
  interventionIds: ['oxygen', 'salbutamol', 'ipratropium', 'methylprednisolone', 'magnesium', 'intubation'], keyInterventions: ['oxygen', 'salbutamol', 'ipratropium', 'methylprednisolone'],
  clinicalPolicy: {
   schemaVersion: 1, traits: ['bronchospasm', 'respiratoryFailure'], oxygenTarget: [92, 95],
   trajectory: {early: [0, 7, 4, -3, -1, -3], late: [0.2, 22, 10, -17, -9, -10], earlyEnd: 12, lateEnd: 60, fluidResponse: 0},
   responses: [
    {allOf: ['salbutamol'], delay: 1, peak: 10, offsets: [0, -8, -6, 0, 0, 2]},
    {allOf: ['ipratropium'], delay: 2, peak: 20, offsets: [0, -5, -3, 0, 0, 1]},
    {allOf: ['methylprednisolone'], delay: 20, peak: 120, offsets: [0, -7, -4, 0, 0, 1]},
    {allOf: ['salbutamol', 'ipratropium', 'magnesium'], delay: 5, peak: 25, offsets: [0, -6, -3, -2, -1, 2]},
    {allOf: ['intubation'], delay: 2, peak: 25, offsets: [0, -12, -10, -3, -2, 7]}
   ],
   regimens: {
    methylprednisolone: {dose: {amount: 40, unit: 'mg', display: '40 mg IV; luego pauta diaria equivalente según evolución'}, intervalMinutes: 1440, route: 'iv'},
    salbutamol: {dose: {amount: 5, unit: 'mg', display: '5 mg nebulizados; repetir cada20–30min según respuesta'}, intervalMinutes: 20, route: 'inhaled'},
    ipratropium: {dose: {amount: 0.5, unit: 'mg', display: '0,5 mg nebulizados añadido a SABA'}, intervalMinutes: 20, route: 'inhaled'},
    magnesium: {dose: {amount: 2000, unit: 'mg', display: '2 g IV en20min, dosis única si respuesta insuficiente'}, intervalMinutes: 1440, administrationMinutes: 20, route: 'iv'}
   },
   closure: {destinations: ['sala', 'uti'], treatment: [['oxygen', 'salbutamol', 'ipratropium', 'methylprednisolone']], requiredStudies: ['g_resp04_gas'], study: [['g_resp04_pef', 'g_resp04_gas']], requiredExams: ['thorax:auscultation'], consult: {sala: ['clinica'], uti: ['uti']}, urgentStudyBypass: true, dischargeTreatments: [], summary: 'Crisis grave: SABA repetido, ipratropio, corticoide temprano y O2 objetivo92–95% según GINA2026. MgIV selectivo si mala respuesta. No retrasar rescate por PEF, gasometría o imagen. La fatiga puede aparecer pese a atención inicial correcta: intubación con ventilación adaptada al asma, baja frecuencia y espiración prolongada, seguida de recuperación gradual. UTI si fatiga, alteración de conciencia o hipoxemia persistente; sala tras respuesta sostenida. Sin alta en esta variante grave.'},
   complications: [{id: 'resp04_respiratory_fatigue', type: 'respiratory-fatigue', progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability: 0.22, minMinute: 20, offsets: [0, 12, -8, -12, -7, -9], riseMinutes: 15, rescueAllOf: ['intubation'], recoveryMinutes: 30, manifestation: 'Fatiga ventilatoria: disminuye el esfuerzo útil, empeora la entrada de aire y aparece somnolencia. Puede ocurrir aun tras SABA, ipratropio y corticoide apropiados; requiere reevaluación inmediata y vía aérea invasiva si progresa.'}]
  }
 },
 {
  id: 'RESP-05', specialty: 'Respiratorio', title: 'Tromboembolismo pulmonar sin shock',
  difficulty: 'intermedia', ageRange: [30, 68],
  chief: 'Disnea súbita y dolor pleurítico tras inmovilización.',
  opening: 'Me empezó a faltar el aire y me duele al respirar profundo.',
  variation: {backgroundHistory: [
   {"id": "fractura-antigua", "history": {"pmh": "No tengo enfermedad cardiopulmonar ni antecedente de trombosis. No tuve cáncer ni cirugía reciente. Tuve una fractura de antebrazo hace más de diez años, ya consolidada; no hubo inmovilización reciente por ese antecedente."}},
   {"id": "colico-renal-remoto", "history": {"pmh": "No tengo enfermedad cardiopulmonar ni antecedente de trombosis. No tuve cáncer ni cirugía reciente. Tuve un cólico renal aislado hace ocho años; eliminé el cálculo y los controles posteriores de función renal fueron normales."}}
  ]},
  history: {
   onset: 'La falta de aire y el dolor del costado comenzaron de golpe hace seis horas.',
   pmh: 'No tengo enfermedad cardiopulmonar ni antecedente de trombosis. No tuve cáncer ni cirugía reciente.',
   meds: 'No tomo anticoagulantes ni antiagregantes.',
   allergies: 'No tengo alergia conocida a heparinas ni al contraste yodado.',
   risk: 'Hace una semana viajé doce horas y después estuve varios días casi sin moverme; una pantorrilla me molesta desde ayer.',
   bleeding: 'No tengo sangrado actual, úlcera activa, ACV ni antecedentes de trombocitopenia por heparina.',
   symptoms: 'No tuve síncope, fiebre alta ni dolor desgarrador de espalda; tos seca y dolor al inspirar.',
   support: 'Puedo acceder al tratamiento y seguimiento, pero todavía me falta el aire al caminar.'
  },
  vitals: {temp: 37.2, hr: 108, rr: 24, bp: '124/78', spo2: 92},
  examFindings: {
   appearance: 'Alerta, ansioso y hemodinámicamente estable.', skin: 'Sin palidez extrema ni signos de sangrado; perfusión conservada.',
   inspection: 'Taquipnea moderada sin asimetría torácica.', palpation: 'Dolor y aumento discreto de perímetro de pantorrilla izquierda; sin dolor de pared torácica.',
   percussion: 'Sonoridad pulmonar conservada bilateralmente.', bowel: 'Abdomen blando, sin dolor ni signos de hemorragia.',
   heart: 'Taquicardia regular, sin ingurgitación yugular ni soplos.', lungs: 'Auscultación sin consolidación ni sibilancias; roce pleural basal tenue.',
   neuro: 'Alerta y orientado, sin focalidad.'
  },
  studies: [
   {id: 'g_resp05_ctpa', label: 'Angio-TC pulmonar', aliases: ['angio tc pulmonar', 'angiotc pulmonar', 'angio tomografia pulmonar', 'angio-tc de torax'], type: 'imaging', delay: 12, result: 'Defectos de llenado segmentarios bilaterales compatibles con TEP agudo; relaciónVD/VI0,85, sin signos de sobrecarga derecha.'},
   {id: 'g_resp05_labs', label: 'Hemograma, coagulación y función renal', aliases: ['hemograma', 'coagulograma', 'funcion renal', 'creatinina'], type: 'lab', delay: 8, result: 'Hb13,5g/dl, plaquetas238.000/µl, INR1,0, TTPa normal, creatinina0,8mg/dl; aclaramiento de creatinina>60ml/min.'},
   {id: 'g_resp05_troponin', label: 'Troponina y BNP', aliases: ['troponina', 'bnp', 'biomarcadores cardiacos'], type: 'lab', delay: 8, result: 'Troponina de alta sensibilidad y BNP dentro de límites normales.'},
   {id: 'g_resp05_ecg', label: 'Electrocardiograma', aliases: ['ecg', 'electrocardiograma'], type: 'procedure', delay: 5, result: 'Taquicardia sinusal, sin isquemia aguda.'},
   {id: 'g_resp05_doppler', label: 'Eco-Doppler venoso de miembros inferiores', aliases: ['doppler venoso', 'ecodoppler de miembros inferiores', 'eco doppler venoso'], type: 'imaging', delay: 10, result: 'Trombosis venosa poplítea izquierda no compresible.'}
  ],
  dx: ['tromboembolismo pulmonar', 'tep', 'embolia pulmonar', 'tep sin shock'],
  differential: ['Neumonía', 'Neumotórax', 'Síndrome coronario agudo', 'Dolor musculoesquelético'],
  requiredHistory: ['onset', 'risk', 'bleeding', 'allergies', 'meds'], keyStudies: ['g_resp05_ctpa', 'g_resp05_labs', 'g_resp05_troponin'],
  interventionIds: ['oxygen', 'enoxaparin', 'heparin_therapeutic'], keyInterventions: ['enoxaparin'],
  clinicalPolicy: {
   schemaVersion: 1, traits: ['thromboembolism'],
   trajectory: {early: [0, 2, 1, -1, -1, -0.5], late: [0.2, 9, 4, -7, -4, -3], earlyEnd: 12, lateEnd: 60, fluidResponse: 0},
   responses: [{allOf: [], anyOf: ['enoxaparin', 'heparin_therapeutic'], delay: 15, peak: 180, offsets: [0, -8, -3, 3, 2, 1]}],
   regimens: {enoxaparin: {dose: {amount: 1, unit: 'mg/kg', display: '1 mg/kg SC cada12h'}, intervalMinutes: 720, route: 'sc'}},
   closure: {destinations: ['sala'], treatment: [['enoxaparin'], ['heparin_therapeutic']], requiredStudies: ['g_resp05_ctpa', 'g_resp05_labs', 'g_resp05_troponin'], study: [], requiredExams: ['thorax:auscultation'], consult: {sala: ['clinica']}, dischargeTreatments: [], summary: 'Anticoagulación terapéutica confirmada tras valorar sangrado, peso y función renal. HBPM preferida si se requiere inicio parenteral y es apropiada. No trombólisis rutinaria sin shock. Esta variante conserva disnea/hipoxemia y se interna en sala; alta solo pertenecería a una variante seleccionada de bajo riesgo con plan oral y seguimiento, no a este cierre. El anticoagulante evita progresión y no disuelve inmediatamente el trombo.'},
   complications: []
  }
 },
 {
  id: 'RESP-06', specialty: 'Respiratorio', title: 'Tromboembolismo pulmonar de alto riesgo con shock',
  difficulty: 'avanzada', ageRange: [38, 72],
  chief: 'Disnea súbita, síncope e hipotensión persistente.',
  opening: 'Me faltó el aire de golpe y me desmayé.',
  variation: {backgroundHistory: [
   {"id": "luxacion-remota", "history": {"pmh": "Tuve trombosis venosa hace cinco años después de un viaje. No tengo insuficiencia cardíaca ni hipertensión pulmonar conocida. Hace doce años tuve una luxación de hombro tratada sin cirugía; se resolvió y no dejó limitaciones."}},
   {"id": "apendicectomia-remota", "history": {"pmh": "Tuve trombosis venosa hace cinco años después de un viaje. No tengo insuficiencia cardíaca ni hipertensión pulmonar conocida. Me operaron del apéndice hace veinte años, sin complicaciones; no tuve ninguna otra cirugía reciente."}}
  ]},
  history: {
   onset: 'Hace una hora tuve disnea súbita y perdí el conocimiento; sigo con sensación de desmayo.',
   pmh: 'Tuve trombosis venosa hace cinco años después de un viaje. No tengo insuficiencia cardíaca ni hipertensión pulmonar conocida.',
   meds: 'Actualmente no tomo anticoagulantes; terminé el tratamiento de aquella trombosis.',
   allergies: 'No conozco alergias a heparina, contraste ni alteplasa.',
   risk: 'Estuve inmóvil varios días por una lesión de tobillo tratada sin operación; tengo una pierna hinchada.',
   bleeding: 'No tuve ACV, hemorragia intracraneal, cirugía reciente, traumatismo de cráneo, sangrado digestivo ni sangrado activo.',
   symptoms: 'El dolor aumenta al inspirar; no es desgarrador ni se irradia a la espalda. No tuve fiebre alta.'
  },
  vitals: {temp: 36.7, hr: 136, rr: 34, bp: '76/44', spo2: 82},
  examFindings: {
   appearance: 'Distrés respiratorio y shock; responde con frases cortas.', skin: 'Palidez, sudor frío, relleno capilar5s.',
   inspection: 'Taquipnea intensa sin asimetría torácica.', palpation: 'Pulsos débiles y edema unilateral de pierna izquierda; pared torácica indolora.',
   percussion: 'Sonoridad conservada, sin hipersonoridad unilateral.', bowel: 'Abdomen blando, sin defensa ni masa pulsátil.',
   heart: 'Taquicardia regular, ingurgitación yugular y segundo ruido pulmonar acentuado.', lungs: 'Campos relativamente limpios sin crepitantes difusos ni ausencia unilateral de murmullo.',
   neuro: 'Lentitud por hipoperfusión, sin déficit focal.'
  },
  studies: [
   {id: 'g_resp06_echo', label: 'Ecocardiograma a pie de cama', aliases: ['ecocardiograma', 'eco cardiaco', 'pocus cardiaco', 'ecocardiografia bedside'], type: 'imaging', delay: 5, result: 'VD marcadamente dilatado e hipocinético, tabique interventricular aplanado, VI pequeño; sin derrame pericárdico. Hallazgos compatibles con sobrecarga derecha aguda en contexto de TEP probable.'},
   {id: 'g_resp06_ctpa', label: 'Angio-TC pulmonar si traslado seguro', aliases: ['angio tc pulmonar', 'angiotc pulmonar', 'angio-tc de torax'], type: 'imaging', delay: 12, result: 'TEP central bilateral con sobrecarga de VD. Solo trasladar a TC si la condición lo permite; no retrasar reperfusión por imagen en shock con evidencia a pie de cama suficiente.'},
   {id: 'g_resp06_labs', label: 'Hemograma, coagulación y función renal', aliases: ['hemograma', 'coagulograma', 'funcion renal', 'creatinina'], type: 'lab', delay: 8, result: 'Hb13,2g/dl, plaquetas219.000/µl, INR1,0, TTPa basal normal, creatinina1,1mg/dl.'},
   {id: 'g_resp06_coag_followup', label: 'TTPa y tiempo de trombina de control tras completar alteplasa', aliases: ['coagulacion despues de trombolisis', 'ttpa post trombolisis', 'coagulograma post alteplasa'], type: 'lab', delay: 8, repeatable: true, dynamic: true, requiresCompletedTreatments: ['alteplase_pe'], result: 'Muestra de control obtenida tras completar alteplasa: TTPa34s (control30s; razón1,13) y tiempo de trombina19s (control18s; razón1,06). Ambos≤2veces el control. Permite iniciar la pauta de UFH seleccionada tras reevaluar sangrado; continuar controles y ajuste de la infusión.'},
   {id: 'g_resp06_gas', label: 'Gasometría arterial y lactato', aliases: ['gasometria', 'lactato', 'gases arteriales'], type: 'lab', delay: 5, result: 'pH7,28, PaCO2 28mmHg, PaO2 45mmHg, lactato5,8mmol/l; hipoxemia e hipoperfusión.', repeatable: true, dynamic: true},
   {id: 'g_resp06_ecg', label: 'Electrocardiograma', aliases: ['ecg', 'electrocardiograma'], type: 'procedure', delay: 5, result: 'Taquicardia sinusal, bloqueo incompleto de rama derecha y signos de sobrecarga ventricular derecha.'}
  ],
  dx: ['tep de alto riesgo', 'tep con shock', 'tromboembolismo pulmonar masivo', 'embolia pulmonar de alto riesgo', 'shock obstructivo por tep'],
  differential: ['Taponamiento cardíaco', 'Neumotórax a tensión', 'Infarto de ventrículo derecho', 'Disección aórtica'],
  requiredHistory: ['onset', 'risk', 'bleeding', 'meds', 'allergies'], keyStudies: ['g_resp06_echo', 'g_resp06_gas', 'g_resp06_labs'],
  interventionIds: ['oxygen', 'vasopressor', 'fluid', 'alteplase_pe', 'heparin_therapeutic', 'intubation'], keyInterventions: ['oxygen', 'alteplase_pe', 'heparin_therapeutic'],
  clinicalPolicy: {
   schemaVersion: 1, traits: ['thromboembolism', 'obstructiveShockPE'],
   trajectory: {early: [0, 9, 3, -10, -6, -3], late: [0.1, 24, 10, -25, -15, -11], earlyEnd: 12, lateEnd: 60, fluidResponse: 0.1},
   responses: [
    {allOf: ['alteplase_pe'], delay: 5, peak: 120, offsets: [0, -37, -13, 48, 26, 9]},
    {allOf: ['intubation'], delay: 2, peak: 15, offsets: [0, -4, -8, -5, -3, 12]},
    {allOf: ['heparin_therapeutic'], delay: 15, peak: 180, offsets: [0, -5, -2, 3, 2, 1]}
   ],
   regimens: {
    alteplase_pe: {dose: {amount: 100, unit: 'mg', display: '100 mg IV en2h'}, intervalMinutes: 1440, administrationMinutes: 120, route: 'iv'},
    heparin_therapeutic: {dose: {amount: 18, unit: 'U/kg/h', display: '18 U/kg/h IV sin bolo tras completar alteplasa y revisar coagulación; titular por TTPa/anti-Xa'}, continuous: true, infusion: {amount: 18, unit: 'U/kg/h'}, route: 'iv'}
   },
   eligibility: {intubation: {requiresCompletedTreatments: ['vasopressor']}, heparin_therapeutic: {requiresCompletedTreatments: ['alteplase_pe'], requiresStudiesAfterTreatments: [{treatmentId: 'alteplase_pe', studyId: 'g_resp06_coag_followup'}]}},
   closure: {destinations: ['uti'], treatment: [['oxygen', 'alteplase_pe', 'heparin_therapeutic']], requiredStudies: ['g_resp06_labs', 'g_resp06_coag_followup'], study: [['g_resp06_echo', 'g_resp06_ctpa']], requiredExams: ['thorax:auscultation'], consult: {uti: ['uti']}, urgentStudyBypass: true, dischargeTreatments: [], summary: 'Shock obstructivo: O2, noradrenalina según perfusión y reperfusión inmediata si elegible tras revisar contraindicaciones. Bolo pequeño de volumen solo si bajo llenado, con reevaluación; evitar carga indiscriminada. Evidencia ecográfica puede orientar reperfusión cuando la TC no es segura. En esta estrategia, iniciar UFH sin bolo después de completar alteplasa y revisar una nueva muestra de coagulación≤2veces control; titular y vigilar sangrado. El coagulograma basal no acredita el control posterior. Aceptación UTI no sustituye reperfusión ejecutada.'},
   complications: []
  }
 },
 {
  id: 'RESP-07', specialty: 'Respiratorio', title: 'Neumotórax a tensión con shock obstructivo',
  difficulty: 'avanzada', ageRange: [20, 60],
  chief: 'Dolor torácico súbito y dificultad respiratoria extrema con hipotensión.',
  opening: 'Me dolió de golpe el lado derecho y casi no puedo respirar.',
  variation: {backgroundHistory: [
   {"id": "fractura-resuelta", "history": {"pmh": "Tuve un neumotórax espontáneo pequeño hace años; no tengo insuficiencia cardíaca. Tuve una fractura de radio hace más de diez años, completamente consolidada; no hubo traumatismo torácico asociado."}},
   {"id": "dermatosis-resuelta", "history": {"pmh": "Tuve un neumotórax espontáneo pequeño hace años; no tengo insuficiencia cardíaca. Hace cinco años tuve una infección superficial de la piel tratada de forma local, ya resuelta y sin medicación actual."}}
  ]},
  history: {
   onset: 'El dolor del lado derecho empezó de golpe hace unos veinte minutos y la falta de aire aumenta rápidamente.',
   pmh: 'Tuve un neumotórax espontáneo pequeño hace años; no tengo insuficiencia cardíaca.',
   meds: 'No tomo medicación diaria ni anticoagulantes.',
   allergies: 'No tengo alergias conocidas a medicamentos ni anestésicos locales.',
   risk: 'Fumo y ya tuve neumotórax; no tuve fiebre ni tos purulenta previa. No hubo trauma mayor.',
   symptoms: 'Me siento muy mareado y el dolor aumenta al respirar; no tengo hinchazón de lengua ni ronchas.'
  },
  vitals: {temp: 36.8, hr: 138, rr: 38, bp: '78/46', spo2: 78},
  examFindings: {
   appearance: 'Distrés extremo, habla con palabras aisladas, signos de shock.', skin: 'Cianosis y sudor frío, relleno capilar prolongado.',
   inspection: 'Hemitórax derecho con menor excursión y distensión; uso intenso de músculos accesorios.',
   palpation: 'Expansión y vibraciones vocales muy reducidas a derecha; pulsos débiles.',
   percussion: 'Hipersonoridad marcada en hemitórax derecho.', bowel: 'Abdomen blando, sin defensa.',
   heart: 'Taquicardia con ingurgitación yugular; ruidos desplazados y difíciles de auscultar.', lungs: 'Murmullo vesicular ausente a derecha y conservado a izquierda.',
   neuro: 'Agitación e hipoperfusión, sin focalidad.'
  },
  studies: [
   {id: 'g_resp07_pocus', label: 'Ecografía pulmonar inmediata si no demora', aliases: ['ecografia pulmonar', 'pocus pulmonar', 'ecografía de torax'], type: 'imaging', delay: 5, result: 'Ausencia de deslizamiento pleural y de líneasB en hemitórax derecho. El diagnóstico de tensión es clínico; no esperar este resultado para descomprimir.'},
   {id: 'g_resp07_cxr', label: 'Radiografía de tórax tras estabilización', aliases: ['radiografia de torax', 'rx torax'], type: 'imaging', delay: 7, result: 'Imagen basal del episodio: neumotórax derecho extenso con desplazamiento mediastínico. Realizar imagen de control tras descompresión/drenaje para evaluar expansión y posición del tubo.', repeatable: true, dynamic: true},
   {id: 'g_resp07_gas', label: 'Gasometría y lactato', aliases: ['gasometria', 'lactato', 'gases arteriales'], type: 'lab', delay: 5, result: 'Hipoxemia grave y lactato4,6mmol/l en la evaluación inicial; no demorar descompresión por toma de muestra.', repeatable: true, dynamic: true}
  ],
  dx: ['neumotorax a tension', 'neumotórax a tensión', 'neumotorax hipertensivo', 'neumotórax hipertensivo', 'shock obstructivo por neumotorax'],
  differential: ['Tromboembolismo pulmonar de alto riesgo', 'Taponamiento cardíaco', 'Hemotórax masivo'],
  requiredHistory: ['onset', 'pmh', 'meds', 'allergies'], keyStudies: ['g_resp07_cxr'],
  interventionIds: ['oxygen', 'needle_decompression', 'chest_drainage'], keyInterventions: ['needle_decompression', 'chest_drainage'],
  clinicalPolicy: {
   schemaVersion: 1, traits: ['tensionPneumothorax', 'obstructiveShock'],
   trajectory: {early: [0, 10, 3, -12, -6, -4], late: [0, 25, 9, -28, -16, -14], earlyEnd: 12, lateEnd: 60, fluidResponse: 0},
   responses: [
    {allOf: ['needle_decompression'], delay: 0.2, peak: 2, offsets: [0, -18, -7, 27, 14, 7]},
    {allOf: ['chest_drainage'], delay: 1, peak: 15, offsets: [0, -24, -9, 30, 16, 10]}
   ],
   closure: {destinations: ['procedimiento', 'sala', 'uti'], treatment: [['needle_decompression', 'chest_drainage']], requiredStudies: [], study: [], requiredExams: ['thorax:auscultation', 'thorax:percussion'], consult: {procedimiento: ['cirugia'], sala: ['cirugia'], uti: ['uti']}, urgentStudyBypass: true, dischargeTreatments: [], summary: 'Tensión con shock: descompresión inmediata por operador capacitado, seguida de drenaje pleural definitivo; no esperar Rx ni TC. Descompresión por aguja es puente y puede fallar/reobstruirse. Verificar lado, expansión, función del tubo y respuesta. UTI si persiste soporte o inestabilidad; sala/procedimiento tras estabilización y receptor. La consulta aceptada no cuenta como tubo colocado.'},
   complications: [{id: 'resp07_recurrent_tension', progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability: 0.18, minMinute: 12, requiredState: {sys: {lt: 105}}, offsets: [0, 10, 4, -14, -8, -7], riseMinutes: 8, rescueAllOf: ['chest_drainage'], recoveryMinutes: 12, manifestation: 'Reaparición de presión pleural si la descompresión transitoria no se acompaña de drenaje definitivo; reevaluar tórax y sistema de drenaje.'}]
  }
 },
 {
  id: 'RESP-08', specialty: 'Respiratorio', title: 'Empiema pleural comunitario',
  difficulty: 'intermedia', ageRange: [36, 78],
  chief: 'Fiebre persistente y dolor pleurítico tras infección respiratoria.',
  opening: 'La fiebre no se me va y cada vez me duele más al respirar.',
  variation: {backgroundHistory: [
   {"id": "hernia-remota", "history": {"pmh": "Tengo mala dentadura y una infección pulmonar reciente. No tengo cáncer ni inmunosupresión conocida. Me operaron una hernia inguinal hace doce años, sin complicaciones ni internaciones por ese motivo desde entonces."}},
   {"id": "tendinitis-resuelta", "history": {"pmh": "Tengo mala dentadura y una infección pulmonar reciente. No tengo cáncer ni inmunosupresión conocida. Hace años tuve una tendinitis de hombro que cedió con rehabilitación; no uso antiinflamatorios de forma habitual."}}
  ]},
  history: {
   onset: 'Llevo nueve días con fiebre y tos; desde hace cuatro días tengo dolor fuerte en el lado izquierdo y más falta de aire.',
   pmh: 'Tengo mala dentadura y una infección pulmonar reciente. No tengo cáncer ni inmunosupresión conocida.',
   meds: 'Tomé dos días de antibiótico de un familiar, sin pauta ni mejoría. No tomo anticoagulantes.',
   allergies: 'No tengo alergias conocidas a penicilinas ni cefalosporinas.',
   risk: 'No estuve internado recientemente ni tengo colonización conocida por microorganismos resistentes.',
   symptoms: 'Tengo escalofríos y poco apetito; no expectoro sangre ni tuve síncope.',
   aspiration: 'A veces me atraganto y tengo problemas dentales; no hubo vómito importante ni procedimiento esofágico.'
  },
  vitals: {temp: 38.9, hr: 116, rr: 28, bp: '108/66', spo2: 89},
  examFindings: {
   appearance: 'Aspecto febril, taquipnea moderada y dolor pleurítico izquierdo.', skin: 'Piel tibia, sin petequias, relleno capilar2–3s.',
   inspection: 'Menor excursión del hemitórax izquierdo.', palpation: 'Vibraciones vocales disminuidas en base izquierda.',
   percussion: 'Matidez franca en mitad inferior izquierda.', bowel: 'Abdomen blando, ruidos presentes.',
   heart: 'Taquicardia regular, sin soplo nuevo.', lungs: 'Murmullo vesicular muy disminuido en base izquierda, crepitantes por encima del área de derrame.',
   neuro: 'Alerta y orientado, sin focalidad.'
  },
  studies: [
   {id: 'g_resp08_cxr', label: 'Radiografía de tórax', aliases: ['radiografia de torax', 'rx torax'], type: 'imaging', delay: 7, result: 'Derrame pleural izquierdo moderado-grande con opacidad basal; consolidación adyacente.'},
   {id: 'g_resp08_ultrasound', label: 'Ecografía pleural', aliases: ['ecografia pleural', 'ecografia pulmonar', 'ecografía pleural'], type: 'imaging', delay: 6, result: 'Colección pleural izquierda compleja con septos y ventana segura para punción/drenaje guiado.'},
   {id: 'g_resp08_pleural', label: 'Toracocentesis diagnóstica y líquido pleural', aliases: ['toracocentesis', 'liquido pleural', 'puncion pleural'], type: 'procedure', delay: 10, result: 'Líquido purulento; pH6,95, glucosa24mg/dl, LDH3100U/l, neutrófilos abundantes; Gram/cultivo enviados. Empiema: requiere drenaje.'},
   {id: 'g_resp08_labs', label: 'Hemograma, función renal y coagulación', aliases: ['hemograma', 'funcion renal', 'coagulograma'], type: 'lab', delay: 8, result: 'Leucocitos19.200/µl, Hb11,8g/dl, plaquetas410.000/µl, creatinina0,9mg/dl e INR1,1.'},
   {id: 'g_resp08_ct', label: 'TC de tórax con contraste', aliases: ['tc de torax', 'tomografia de torax', 'tomografía de tórax'], type: 'imaging', delay: 12, result: 'Derrame pleural loculado con realce de ambas hojas pleurales y consolidación adyacente; sin colección intrapulmonar dominante.'}
  ],
  dx: ['empiema', 'empiema pleural', 'infeccion pleural', 'infección pleural', 'derrame paraneumonico complicado', 'derrame paraneumónico complicado'],
  differential: ['Derrame paraneumónico no complicado', 'Absceso pulmonar', 'Derrame maligno', 'Tuberculosis pleural'],
  requiredHistory: ['onset', 'pmh', 'meds', 'allergies', 'risk'], keyStudies: ['g_resp08_ultrasound', 'g_resp08_pleural', 'g_resp08_labs'],
  interventionIds: ['oxygen', 'amoxiclav', 'ceftriaxone', 'metronidazole', 'chest_drainage'], keyInterventions: ['amoxiclav', 'chest_drainage'],
  pharmacology: {coverageSets: [['amoxiclav'], ['ceftriaxone', 'metronidazole']]},
  clinicalPolicy: {
   schemaVersion: 1, traits: ['infection', 'anaerobicInfection', 'pleuralInfection'],
   trajectory: {early: [0.1, 4, 2, -3, -1, -1], late: [0.5, 16, 6, -12, -7, -5], earlyEnd: 12, lateEnd: 60, fluidResponse: 0.3},
   responses: [
    {allOf: ['amoxiclav'], delay: 30, peak: 240, offsets: [-0.7, -10, -3, 5, 3, 1]},
    {allOf: ['ceftriaxone', 'metronidazole'], delay: 30, peak: 240, offsets: [-0.7, -10, -3, 5, 3, 1]},
    {allOf: ['chest_drainage'], delay: 2, peak: 30, offsets: [-0.1, -10, -6, 6, 3, 6]}
   ],
   regimens: {
    amoxiclav: {dose: {amount: 1200, unit: 'mg', display: '1,2 g IV cada8h'}, intervalMinutes: 480, route: 'iv'},
    ceftriaxone: {dose: {amount: 2000, unit: 'mg', display: '2 g IV cada24h'}, intervalMinutes: 1440, route: 'iv'},
    metronidazole: {dose: {amount: 500, unit: 'mg', display: '500 mg IV cada8h'}, intervalMinutes: 480, route: 'iv'}
   },
   closure: {destinations: ['sala', 'procedimiento', 'quirofano'], treatment: [['amoxiclav', 'chest_drainage'], ['ceftriaxone', 'metronidazole', 'chest_drainage']], requiredStudies: ['g_resp08_ultrasound', 'g_resp08_pleural', 'g_resp08_labs'], study: [], requiredExams: ['thorax:auscultation', 'thorax:percussion'], consult: {sala: ['clinica'], procedimiento: ['cirugia'], quirofano: ['cirugia']}, dischargeTreatments: [], summary: 'Antibióticos IV con cobertura anaerobia y drenaje de la colección confirmados. Empiema purulento/pH≤7,2 no se resuelve con ATB aislado. Drenaje inicial guiado, habitualmente tubo≤14F; control clínico y de colección. Cirugía para control de foco si drenaje insuficiente, no como sustituto de la atención inicial. Consulta o traslado aceptado no equivale a drenaje.'},
   complications: []
  }
 },
 {
  id: 'RESP-09', specialty: 'Respiratorio', title: 'Síndrome de distrés respiratorio agudo por neumonía',
  difficulty: 'avanzada', ageRange: [30, 74],
  chief: 'Insuficiencia respiratoria hipoxémica progresiva con infiltrados bilaterales.',
  opening: 'Cada vez me cuesta más respirar aunque me den oxígeno.',
  variation: {backgroundHistory: [
   {"id": "fractura-remota", "history": {"pmh": "No tengo insuficiencia cardíaca ni enfermedad pulmonar crónica; antes hacía actividad habitual. Tuve una fractura de tobillo hace nueve años, ya consolidada; no tengo inmovilización ni limitación funcional por eso."}},
   {"id": "apendicectomia-antigua", "history": {"pmh": "No tengo insuficiencia cardíaca ni enfermedad pulmonar crónica; antes hacía actividad habitual. Me operaron del apéndice hace quince años, sin complicaciones; desde entonces hacía mi actividad habitual."}}
  ]},
  history: {
   onset: 'Hace cuatro días tengo fiebre y tos; en las últimas veinticuatro horas empeoró mucho la falta de aire.',
   pmh: 'No tengo insuficiencia cardíaca ni enfermedad pulmonar crónica; antes hacía actividad habitual.',
   meds: 'Solo tomé paracetamol. No uso anticoagulantes, inmunosupresores ni diuréticos.',
   allergies: 'No tengo alergias conocidas a antibióticos.',
   risk: 'No hubo trauma, transfusión, aspiración evidente ni internación reciente; la infección empezó en casa.',
   symptoms: 'Tengo fiebre y flema; no tenía ortopnea crónica, edema de piernas ni aumento reciente de peso.',
   baseline: 'Mi capacidad funcional y oxigenación eran normales antes de esta infección.'
  },
  vitals: {temp: 38.6, hr: 124, rr: 36, bp: '102/62', spo2: 81},
  examFindings: {
   appearance: 'Distrés respiratorio intenso, habla con palabras aisladas, agotamiento incipiente.', skin: 'Cianosis, diaforesis y perfusión periférica limítrofe.',
   inspection: 'Trabajo respiratorio marcado con tiraje bilateral.', palpation: 'Expansión reducida de forma difusa, sin asimetría marcada.',
   percussion: 'Submatidez bilateral parcheada, sin hipersonoridad focal.', bowel: 'Abdomen blando, sin defensa.',
   heart: 'Taquicardia regular, sin tercer ruido ni ingurgitación yugular.', lungs: 'Crepitantes bilaterales extensos sin predominio de broncoespasmo.',
   neuro: 'Alerta al ingreso pero fatigable, sin focalidad.'
  },
  studies: [
   {id: 'g_resp09_cxr', label: 'Radiografía de tórax', aliases: ['radiografia de torax', 'rx torax'], type: 'imaging', delay: 7, result: 'Opacidades alveolares bilaterales difusas, sin cardiomegalia ni derrames grandes; no explicadas por atelectasia lobar.'},
   {id: 'g_resp09_gas', label: 'Gasometría arterial con soporte documentado', aliases: ['gasometria', 'gases arteriales', 'pafi'], type: 'lab', delay: 5, result: 'Al inicio PaO2 45mmHg. Durante prueba breve conFiO2 0,60 yCPAP5cmH2O: PaO2 62mmHg, PaCO2 36mmHg y pH7,32; PaO2/FiO2≈103. Hipoxemia grave persistente y trabajo respiratorio alto: no prolongar soporte no invasivo fallido.', repeatable: true, dynamic: true},
   {id: 'g_resp09_echo', label: 'Ecocardiograma a pie de cama', aliases: ['ecocardiograma', 'eco cardiaco', 'pocus cardiaco'], type: 'imaging', delay: 6, result: 'Función sistólica delVI conservada, sin valvulopatía aguda ni signos de edema primariamente hidrostático.'},
   {id: 'g_resp09_labs', label: 'Hemograma, lactato y función renal', aliases: ['hemograma', 'lactato', 'funcion renal'], type: 'lab', delay: 8, result: 'Leucocitos18.400/µl, plaquetas182.000/µl, creatinina1,0mg/dl, lactato2,8mmol/l.'},
   {id: 'g_resp09_cultures', label: 'Hemocultivos y muestra respiratoria', aliases: ['hemocultivos', 'cultivo respiratorio', 'cultivo de esputo'], type: 'lab', delay: 8, result: 'Muestras obtenidas para cultivo y pruebas virales; identificación pendiente. No retrasar antibióticos por toma difícil de muestra.'}
  ],
  dx: ['sdra', 'sindrome de distres respiratorio agudo', 'síndrome de distrés respiratorio agudo', 'ards', 'sdra por neumonia', 'distres respiratorio agudo'],
  differential: ['Edema pulmonar cardiogénico', 'Neumonía multilobar sin SDRA', 'Hemorragia alveolar', 'Tromboembolismo pulmonar'],
  requiredHistory: ['onset', 'pmh', 'meds', 'allergies', 'risk'], keyStudies: ['g_resp09_cxr', 'g_resp09_gas', 'g_resp09_echo'],
  interventionIds: ['oxygen', 'intubation', 'lung_protective_ventilation', 'ceftriaxone', 'azithromycin', 'vasopressor'], keyInterventions: ['intubation', 'lung_protective_ventilation', 'ceftriaxone', 'azithromycin'],
  pharmacology: {coverageSets: [['ceftriaxone', 'azithromycin']]},
  clinicalPolicy: {
   schemaVersion: 1, traits: ['infection', 'ards', 'respiratoryFailure'],
   trajectory: {early: [0.1, 8, 4, -7, -4, -4], late: [0.3, 22, 11, -21, -12, -12], earlyEnd: 12, lateEnd: 60, fluidResponse: 0},
   responses: [
    {allOf: ['intubation'], delay: 2, peak: 20, offsets: [0, -8, -8, -4, -2, 4]},
    {allOf: ['intubation', 'lung_protective_ventilation'], delay: 3, peak: 30, offsets: [0, -12, -7, 3, 2, 8]},
    {allOf: ['ceftriaxone', 'azithromycin'], delay: 30, peak: 240, offsets: [-0.7, -12, -3, 8, 4, 2]}
   ],
   regimens: {
    ceftriaxone: {dose: {amount: 2000, unit: 'mg', display: '2 g IV cada24h'}, intervalMinutes: 1440, route: 'iv'},
    azithromycin: {dose: {amount: 500, unit: 'mg', display: '500 mg IV cada24h, infusión≥60min'}, intervalMinutes: 1440, administrationMinutes: 60, route: 'iv'}
   },
   closure: {destinations: ['uti'], treatment: [['intubation', 'lung_protective_ventilation', 'ceftriaxone', 'azithromycin']], requiredStudies: ['g_resp09_cxr', 'g_resp09_gas', 'g_resp09_echo'], study: [], requiredExams: ['thorax:auscultation'], consult: {uti: ['uti']}, urgentStudyBypass: true, dischargeTreatments: [], summary: 'SDRA por neumonía con fracaso de oxigenación: intubación y ventilación protectora confirmadas, VT4–8ml/kg de peso predicho (inicial6), meseta<30cmH2O, PEEP/FiO2 individualizadas. Tratar causa con antibióticos; considerar prono prolongado si hipoxemia persiste y estrategia de fluidos tras restaurar perfusión. Intubación aislada no demuestra ventilación protectora. UTI; la mejoría de saturación no resuelve la lesión pulmonar.'},
   complications: []
  }
 },
 {
  id: 'RESP-10', specialty: 'Respiratorio', title: 'Absceso pulmonar por aspiración',
  difficulty: 'intermedia', ageRange: [35, 76],
  chief: 'Fiebre prolongada, tos con expectoración fétida y pérdida de peso.',
  opening: 'Hace semanas que tengo fiebre y ahora la flema tiene olor muy feo.',
  variation: {backgroundHistory: [
   {"id": "fractura-antigua", "history": {"pmh": "Tengo enfermedad periodontal y problemas dentales; no tengo inmunosupresión conocida. Tuve una fractura de antebrazo hace diez años; consolidó y no uso medicación por ese antecedente."}},
   {"id": "varicela-infantil", "history": {"pmh": "Tengo enfermedad periodontal y problemas dentales; no tengo inmunosupresión conocida. Tuve varicela en la infancia, sin complicaciones ni secuelas; no recibo tratamiento por ese antecedente."}}
  ]},
  history: {
   onset: 'Llevo tres semanas con tos, fiebre y cansancio; hace varios días expectoro mucha flema con olor desagradable.',
   pmh: 'Tengo enfermedad periodontal y problemas dentales; no tengo inmunosupresión conocida.',
   meds: 'No tomo medicación habitual ni anticoagulantes. No recibí un curso antibiótico completo.',
   allergies: 'No tengo alergias conocidas a penicilinas ni cefalosporinas.',
   risk: 'Consumo alcohol en exceso y hace un mes vomité estando muy somnoliento. A veces me atraganto.',
   symptoms: 'Perdí tres kilos, tengo sudores y mal apetito. No tuve hemoptisis importante ni disnea súbita.',
   exposure: 'No tengo contacto conocido con tuberculosis ni viajes recientes; fumo desde hace años.'
  },
  vitals: {temp: 38.3, hr: 104, rr: 24, bp: '116/70', spo2: 92},
  examFindings: {
   appearance: 'Aspecto enfermo subagudo, adelgazamiento leve y halitosis.', skin: 'Piel tibia, sin signos de hemorragia ni embolias cutáneas.',
   inspection: 'Taquipnea leve, sin tiraje intenso.', palpation: 'Vibraciones vocales aumentadas en región posterior derecha.',
   percussion: 'Submatidez focal posterior derecha, sin matidez extensa de derrame.', bowel: 'Abdomen blando, sin defensa.',
   heart: 'Ritmo regular, sin soplo nuevo ni signos de endocarditis.', lungs: 'Crepitantes y respiración bronquial focal en región posterior derecha; sin ausencia extensa de murmullo.',
   neuro: 'Orientado, sin déficit focal; deglución a evaluar por antecedente de aspiración.'
  },
  studies: [
   {id: 'g_resp10_cxr', label: 'Radiografía de tórax', aliases: ['radiografia de torax', 'rx torax'], type: 'imaging', delay: 7, result: 'Cavidad de pared gruesa con nivel hidroaéreo en región posterior del pulmón derecho y consolidación adyacente.'},
   {id: 'g_resp10_ct', label: 'TC de tórax con contraste', aliases: ['tc de torax', 'tomografia de torax', 'tomografía de tórax'], type: 'imaging', delay: 12, result: 'Cavidad intraparenquimatosa de4,8cm con nivel hidroaéreo en segmento dependiente; sin colección pleural significativa ni masa obstructiva evidente.'},
   {id: 'g_resp10_labs', label: 'Hemograma y función renal', aliases: ['hemograma', 'funcion renal', 'creatinina'], type: 'lab', delay: 8, result: 'Leucocitos16.500/µl, Hb11,9g/dl, plaquetas normales, creatinina0,9mg/dl.'},
   {id: 'g_resp10_sputum', label: 'Microbiología de esputo y evaluación de tuberculosis', aliases: ['cultivo de esputo', 'baciloscopia', 'microbiologia respiratoria', 'pcr tuberculosis'], type: 'lab', delay: 10, result: 'Muestra enviada para cultivo; pruebas iniciales para tuberculosis según riesgo y protocolo. No inferir exclusión de TB por una sola muestra; ajustar aislamiento y estudio a la sospecha.'},
   {id: 'g_resp10_swallow', label: 'Evaluación de deglución y foco odontológico', aliases: ['evaluacion de deglucion', 'evaluación de deglución', 'evaluacion odontologica', 'foco dental'], type: 'procedure', delay: 10, result: 'Enfermedad periodontal y riesgo de aspiración; requiere cuidado dental, medidas de prevención y evaluación especializada de deglución.'}
  ],
  dx: ['absceso pulmonar', 'absceso de pulmon', 'absceso de pulmón', 'absceso pulmonar por aspiracion', 'absceso pulmonar por aspiración'],
  differential: ['Tuberculosis cavitada', 'Neoplasia pulmonar cavitada u obstrucción endobronquial', 'Empiema', 'Neumonía necrosante'],
  requiredHistory: ['onset', 'risk', 'allergies', 'meds', 'exposure'], keyStudies: ['g_resp10_ct', 'g_resp10_labs'],
  interventionIds: ['oxygen', 'amoxiclav', 'ceftriaxone', 'metronidazole'], keyInterventions: ['amoxiclav'],
  pharmacology: {coverageSets: [['amoxiclav'], ['ceftriaxone', 'metronidazole']]},
  clinicalPolicy: {
   schemaVersion: 1, traits: ['infection', 'anaerobicInfection', 'cavitaryLungDisease'],
   trajectory: {early: [0.1, 2, 1, -1, 0, -0.3], late: [0.4, 12, 4, -7, -4, -3], earlyEnd: 12, lateEnd: 60, fluidResponse: 0.2},
   responses: [
    {allOf: ['amoxiclav'], delay: 30, peak: 240, offsets: [-0.7, -12, -4, 5, 3, 2]},
    {allOf: ['ceftriaxone', 'metronidazole'], delay: 30, peak: 240, offsets: [-0.7, -12, -4, 5, 3, 2]}
   ],
   regimens: {
    amoxiclav: {dose: {amount: 1200, unit: 'mg', display: '1,2 g IV cada8h'}, intervalMinutes: 480, route: 'iv'},
    ceftriaxone: {dose: {amount: 2000, unit: 'mg', display: '2 g IV cada24h'}, intervalMinutes: 1440, route: 'iv'},
    metronidazole: {dose: {amount: 500, unit: 'mg', display: '500 mg IV cada8h'}, intervalMinutes: 480, route: 'iv'}
   },
   closure: {destinations: ['sala'], treatment: [['amoxiclav'], ['ceftriaxone', 'metronidazole']], requiredStudies: ['g_resp10_ct', 'g_resp10_labs'], study: [], requiredExams: ['thorax:auscultation'], consult: {sala: ['clinica']}, dischargeTreatments: [], summary: 'Cobertura de flora oral/anaerobios, internación y reevaluación por neumología/infectología. Investigar aspiración, foco dental y etiología cavitada alternativa. Tratamiento prolongado y control de imagen según respuesta; drenaje percutáneo/broncoscopia es selectivo ante fracaso, gran cavidad u obstrucción, no un tubo pleural rutinario. Metronidazol solo carece de cobertura adecuada y no satisface tratamiento.'},
   complications: []
  }
 }
];

export const respiratoryPack = {
 schemaVersion: 1, packId: 'atria-respiratory', version: '1.0.0',
 cases: respiratoryCaseDefinitions.map(defineClinicalCase)
};
