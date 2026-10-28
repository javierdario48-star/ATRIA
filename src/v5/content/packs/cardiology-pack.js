// Authored case content, not an executor or a claim of runtime certification.
// All actions, results, clocks, physiology, disposition and XP remain V5-owned.
import {defineClinicalCase} from '../clinical-case-definition.js';
import {hypoperfusionKidneyComplication} from './common-complications.js';

const trajectory = (early, late, fluidResponse = 0) => ({early, late, earlyEnd: 12, lateEnd: 60, fluidResponse});
const response = (allOf, delay, peak, offsets, anyOf) => ({allOf, delay, peak, offsets, ...(anyOf ? {anyOf} : {})});
const study = (id, label, aliases, type, delay, result, extra = {}) => ({id, label, aliases, type, delay, result, ...extra});
const complication = (id, probability, minMinute, offsets, rescueAllOf, manifestation, extra = {}) => ({
 id, progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability, minMinute,
 offsets, riseMinutes: 10, rescueAllOf, recoveryMinutes: 20, manifestation, rationale: manifestation, ...extra
});
const acsTreatment = (support = []) => ['ticagrelor', 'clopidogrel'].flatMap(p2y12 =>
 ['heparin_therapeutic', 'enoxaparin'].map(anticoagulant => ['aspirin', p2y12, anticoagulant, ...support]));
const noBleeding = {excludeTraits: ['activeBleeding', 'intracranialBleeding', 'aorticDissection']};
const nitrateEligibility = {requiresHistory: ['meds'], excludeTraits: ['preloadDependence', 'rightVentricularInfarction', 'pde5Inhibitor', 'severeAorticStenosis'], bpLimit: {min: 90}};

export const cardiologyCaseDefinitions = [
 {
  id: 'CARD-01', specialty: 'Cardiología', title: 'IAM con elevación del ST anterior', difficulty: 'alta',
  chief: 'Dolor opresivo retroesternal con sudoración', opening: 'Me aprieta el pecho desde hace una hora y no se me pasa.', ageRange: [45, 80],
  variation: {backgroundHistory: [
   {"id": "catarata-remota", "history": {"pmh": "Hipertensión, dislipidemia y diabetes tipo 2; sin ACV, hemorragia digestiva ni enfermedad renal conocida. Me operaron una catarata hace siete años, sin complicaciones; no uso tratamientos sistémicos por ese antecedente."}},
   {"id": "tendinitis-resuelta", "history": {"pmh": "Hipertensión, dislipidemia y diabetes tipo 2; sin ACV, hemorragia digestiva ni enfermedad renal conocida. Hace cuatro años tuve tendinitis de hombro que mejoró con rehabilitación; no tomo antiinflamatorios habituales."}}
  ]},
  history: {
   onset: 'Dolor opresivo retroesternal intenso iniciado hace 70 minutos, en reposo, irradiado a brazo izquierdo y mandíbula; no cede con reposo.',
   symptoms: 'Sudor frío, náuseas y sensación de falta de aire. Niega dolor máximo instantáneo hacia espalda, síncope o déficit focal.',
   pmh: 'Hipertensión, dislipidemia y diabetes tipo 2; sin ACV, hemorragia digestiva ni enfermedad renal conocida.',
   meds: 'Losartán y metformina. No toma anticoagulantes ni antiagregantes. Niega sildenafil, vardenafil, tadalafil o avanafil recientes.',
   allergies: 'No reconoce alergias a medicamentos, aspirina ni contraste.',
   risk: 'Fuma 25 paquetes-año; padre con infarto antes de los 60 años.',
   bleeding: 'Sin sangrado activo, cirugía reciente ni antecedentes de hemorragia intracraneal.'
  },
  vitals: {temp: 36.7, hr: 104, rr: 22, bp: '128/78', spo2: 94},
  examFindings: {
   appearance: 'Alerta, angustia por dolor, habla en frases completas.', skin: 'Piel pálida y diaforética; llenado capilar de 2 segundos.',
   inspection: 'Sin ingurgitación yugular; tórax con expansión simétrica.', palpation: 'Pulsos radiales simétricos; dolor no reproducible a la palpación del tórax.',
   percussion: 'Sonoridad pulmonar bilateral conservada.', bowel: 'Ruidos intestinales presentes, abdomen blando sin dolor.',
   heart: 'Taquicardia regular, sin soplo de insuficiencia aórtica ni roce.', lungs: 'Murmullo vesicular conservado, sin crepitantes.', neuro: 'Glasgow 15, fuerza y lenguaje conservados.'
  },
  studies: [
   study('g_card01_ecg', 'ECG de 12 derivaciones urgente', ['ecg', 'electrocardiograma', 'electrocardiograma de 12 derivaciones'], 'procedure', 5, 'Ritmo sinusal a 104/min. Elevación del ST de 3 mm en V2–V5 y de 1.5 mm en I/aVL con descenso recíproco en III/aVF: oclusión coronaria anterior aguda.', {repeatable: true, dynamic: 'cardiac-rhythm'}),
   study('g_card01_troponin', 'Troponina ultrasensible', ['troponina', 'troponina ultrasensible', 'marcadores cardiacos'], 'lab', 10, 'Troponina I ultrasensible 420 ng/L (límite superior 26 ng/L). Un valor inicial no cuantifica por sí solo la extensión y no debe demorar reperfusión.', {repeatable: true}),
   study('g_card01_labs', 'Hemograma, creatinina y electrolitos', ['hemograma y funcion renal', 'laboratorio cardiaco', 'creatinina y electrolitos'], 'lab', 10, 'Hb 14.1 g/dL, plaquetas 238000/mm³, creatinina 0.9 mg/dL, K 4.1 mmol/L, Mg 2.0 mg/dL; sin contraindicación hematológica o renal inicial para estrategia invasiva.'),
   study('g_card01_echo', 'Ecocardiograma a pie de cama', ['ecocardiograma', 'ecografia cardiaca', 'eco cardiaco'], 'imaging', 10, 'Hipocinesia anteroapical, FEVI estimada 40%, sin derrame pericárdico ni insuficiencia mitral aguda; no retrasa hemodinamia.')
  ],
  dx: ['iam con elevacion del st', 'iamcest anterior', 'stemi anterior', 'infarto agudo de miocardio anterior', 'sindrome coronario agudo con elevacion del st'],
  differential: ['Disección aórtica', 'Pericarditis', 'TEP', 'Espasmo coronario'], requiredHistory: ['onset', 'meds', 'allergies', 'bleeding'],
  keyStudies: ['g_card01_ecg'], interventionIds: ['iv', 'monitor', 'aspirin', 'ticagrelor', 'clopidogrel', 'heparin_therapeutic', 'enoxaparin', 'atorvastatin', 'nitroglycerin', 'oxygen', 'coronary_reperfusion'],
  keyInterventions: ['aspirin', 'ticagrelor', 'heparin_therapeutic'],
  clinicalPolicy: {
   trajectory: trajectory([0, 8, 2, -10, -5, -1], [0, 14, 4, -15, -8, -3]),
   responses: [response(['coronary_reperfusion'], 5, 25, [0, -18, -4, 15, 7, 3]), response(['nitroglycerin'], 2, 10, [0, -3, -1, -10, -5, 0])],
   closure: {destinations: ['procedimiento', 'uti'], treatment: acsTreatment(), requiredStudies: ['g_card01_ecg'], study: [['g_card01_ecg']], requiredExams: ['heart:auscultation', 'lungs:auscultation'], consult: {procedimiento: ['cardiologia'], uti: ['uti']}, summary: 'SCA con elevación del ST: activación/traslado monitorizado a hemodinamia aceptado o ingreso coronario para reperfusión inmediata. La aceptación no acredita angioplastia realizada ni resolución del infarto.'},
   eligibility: {aspirin: noBleeding, ticagrelor: noBleeding, clopidogrel: noBleeding, heparin_therapeutic: noBleeding, enoxaparin: noBleeding, nitroglycerin: nitrateEligibility, coronary_reperfusion: {requiredStudies: ['g_card01_ecg']}},
   traits: ['coronaryIschemia', 'coronaryOcclusion'], definitiveInterventions: ['coronary_reperfusion'], doNotDelay: {coronary_reperfusion: ['g_card01_troponin', 'g_card01_labs', 'g_card01_echo']},
   reperfusionStrategy: 'Centro con PCI primaria disponible; activación inmediata. Si el sistema no puede ofrecer reperfusión en plazo, reevaluar una estrategia farmacoinvasiva con sus contraindicaciones; no sustituirla por espera indefinida.',
   complications: [complication('card01-low-output', .25, 18, [0, 12, 4, -22, -12, -4], ['coronary_reperfusion'], 'Progresión isquémica a bajo gasto con piel fría e hipotensión.', {requiredState: {sys: {lt: 115}}})]
  }
 },
 {
  id: 'CARD-02', specialty: 'Cardiología', title: 'SCASEST de alto riesgo', difficulty: 'alta',
  chief: 'Dolor torácico en reposo recurrente', opening: 'Hoy me volvió el dolor en el pecho estando sentado.', ageRange: [50, 85],
  variation: {backgroundHistory: [
   {"id": "lumbalgia-antigua", "history": {"pmh": "Diabetes tipo 2, hipertensión y angioplastia coronaria hace 5 años. Sin insuficiencia renal ni ACV hemorrágico. Hace varios años tuve lumbalgia por un esfuerzo; se resolvió y no tomo analgésicos ni antiinflamatorios de forma habitual."}},
   {"id": "colico-renal-remoto", "history": {"pmh": "Diabetes tipo 2, hipertensión y angioplastia coronaria hace 5 años. Sin insuficiencia renal ni ACV hemorrágico. Tuve un cólico renal aislado hace diez años, con eliminación del cálculo y función renal normal en los controles posteriores."}}
  ]},
  history: {
   onset: 'Tres episodios opresivos de 20–30 minutos en las últimas 8 horas; el último en reposo, con dolor residual leve al ingreso.',
   symptoms: 'Náuseas y disnea durante el dolor; sin dolor desgarrador a espalda, fiebre ni dolor pleurítico.',
   pmh: 'Diabetes tipo 2, hipertensión y angioplastia coronaria hace 5 años. Sin insuficiencia renal ni ACV hemorrágico.',
   meds: 'Aspirina 100 mg diarios, atorvastatina y losartán; no tomó la aspirina hoy. No usa anticoagulantes ni inhibidores PDE5.',
   allergies: 'Niega alergias a medicamentos y contraste.', risk: 'Exfumador; enfermedad coronaria conocida y diabetes.',
   bleeding: 'No sangrado activo, melena, trombocitopenia ni cirugía reciente.'
  },
  vitals: {temp: 36.6, hr: 96, rr: 20, bp: '142/84', spo2: 95},
  examFindings: {
   appearance: 'Alerta con molestia torácica residual; perfusión conservada.', skin: 'Piel ligeramente sudorosa, sin petequias ni hematomas.',
   inspection: 'Sin ingurgitación yugular ni trabajo respiratorio intenso.', palpation: 'Pulsos simétricos, llenado capilar 2 segundos, pared torácica no dolorosa.',
   percussion: 'Sonoridad bilateral conservada.', bowel: 'Abdomen blando, ruidos presentes.', heart: 'Ritmo regular, sin soplos nuevos.',
   lungs: 'Sin crepitantes ni sibilancias.', neuro: 'Glasgow 15, sin focalidad.'
  },
  studies: [
   study('g_card02_ecg', 'ECG de 12 derivaciones y control seriado', ['ecg', 'electrocardiograma', 'ecg seriado'], 'procedure', 5, 'Ritmo sinusal. Descenso horizontal del ST de 1.5 mm en V4–V6 e inversión de T en I/aVL; sin elevación persistente del ST.', {repeatable: true, dynamic: 'cardiac-rhythm'}),
   study('g_card02_troponin', 'Troponina ultrasensible seriada', ['troponina', 'troponina seriada', 'troponina ultrasensible'], 'lab', 10, 'Troponina I ultrasensible inicial 180 ng/L (límite 26 ng/L); elevación compatible con lesión miocárdica en contexto isquémico. Repetir según algoritmo validado local para evaluar cambio.', {repeatable: true}),
   study('g_card02_labs', 'Hemograma, función renal y electrolitos', ['hemograma y funcion renal', 'laboratorio coronario', 'creatinina y electrolitos'], 'lab', 10, 'Hb 13.2 g/dL, plaquetas 211000/mm³, creatinina 1.0 mg/dL, K 4.2 mmol/L, Mg 1.9 mg/dL.'),
   study('g_card02_echo', 'Ecocardiograma transtorácico', ['ecocardiograma', 'eco cardiaco', 'ecografia cardiaca'], 'imaging', 15, 'Hipocinesia inferolateral; FEVI 48%, sin complicación mecánica ni derrame.')
  ],
  dx: ['scasest', 'sindrome coronario agudo sin elevacion del st', 'iam sin elevacion del st', 'iamse st', 'nstemi'],
  differential: ['Disección aórtica', 'Lesión miocárdica no isquémica', 'TEP', 'Angina inestable'], requiredHistory: ['onset', 'meds', 'allergies', 'bleeding'],
  keyStudies: ['g_card02_ecg', 'g_card02_troponin'], interventionIds: ['iv', 'monitor', 'aspirin', 'enoxaparin', 'heparin_therapeutic', 'ticagrelor', 'clopidogrel', 'atorvastatin', 'nitroglycerin', 'coronary_reperfusion'],
  keyInterventions: ['aspirin', 'enoxaparin'],
  clinicalPolicy: {
   trajectory: trajectory([0, 6, 1, -6, -3, -1], [0, 10, 3, -12, -6, -2]),
   responses: [response(['coronary_reperfusion'], 5, 25, [0, -12, -3, 8, 4, 2]), response(['nitroglycerin'], 2, 10, [0, -3, -1, -12, -6, 0])],
   closure: {requiredExams: ['heart:auscultation', 'lungs:auscultation'], destinations: ['uti', 'procedimiento'], treatment: [['aspirin', 'enoxaparin'], ['aspirin', 'heparin_therapeutic']], requiredStudies: ['g_card02_ecg', 'g_card02_troponin', 'g_card02_labs'], study: [['g_card02_ecg']], consult: {uti: ['cardiologia'], procedimiento: ['cardiologia']}, summary: 'Ingreso a unidad coronaria/estrategia invasiva temprana aceptada por SCASEST de alto riesgo. Definir P2Y12 tras conocer anatomía si se realizará angiografía temprana; el ingreso no demuestra revascularización.'},
   eligibility: {aspirin: noBleeding, enoxaparin: {...noBleeding, requiredStudies: ['g_card02_labs']}, heparin_therapeutic: noBleeding, nitroglycerin: nitrateEligibility, ticagrelor: {...noBleeding, requiresCoronaryAnatomy: true}, clopidogrel: {...noBleeding, requiresCoronaryAnatomy: true}},
   regimens: {heparin_therapeutic: {dose: {amount: 60, unit: 'U/kg', display: '60 U/kg IV (máximo 4000 U); luego 12 U/kg/h (máximo inicial 1000 U/h), ajustar a TTPa/anti-Xa'}, route: 'iv', maximumInitialUnits: 4000, infusion: {amount: 12, unit: 'U/kg/h', maximumInitialUnitsPerHour: 1000}}},
   traits: ['coronaryIschemia'], definitiveInterventions: ['coronary_reperfusion'],
   p2y12Strategy: 'Sin pretratamiento P2Y12 rutinario: angiografía temprana prevista antes de 24 h. Ticagrelor/prasugrel al decidir PCI, clopidogrel si aquellos no son adecuados; evitar duplicación.',
   complications: [complication('card02-recurrent-ischemia', .2, 22, [0, 10, 3, -16, -8, -3], ['coronary_reperfusion'], 'Recurrencia de isquemia con deterioro hemodinámico: escalar a estrategia invasiva inmediata.')]
  }
 },
 {
  id: 'CARD-03', specialty: 'Cardiología', title: 'Insuficiencia cardíaca aguda congestiva hipertensiva', difficulty: 'alta',
  chief: 'Disnea intensa, ortopnea y edema', opening: 'No puedo acostarme porque me ahogo.', ageRange: [50, 85],
  variation: {backgroundHistory: [
   {"id": "fractura-consolidada", "history": {"pmh": "Miocardiopatía hipertensiva con FEVI 35%, internación previa por congestión; sin estenosis aórtica conocida. Tuve una fractura de muñeca hace doce años; consolidó sin secuelas y no tomo medicación por eso."}},
   {"id": "presbicia", "history": {"pmh": "Miocardiopatía hipertensiva con FEVI 35%, internación previa por congestión; sin estenosis aórtica conocida. Uso anteojos para leer por presbicia desde hace años; no tengo otra enfermedad ocular conocida ni tratamiento sistémico por eso."}}
  ]},
  history: {
   onset: 'Disnea progresiva en 48 horas y empeoramiento brusco hace 2 horas; duerme sentado y aumentó 3 kg esta semana.',
   symptoms: 'Ortopnea, disnea paroxística nocturna y edema de tobillos. Sin fiebre, esputo purulento ni dolor torácico actual.',
   pmh: 'Miocardiopatía hipertensiva con FEVI 35%, internación previa por congestión; sin estenosis aórtica conocida.',
   meds: 'Furosemida oral 20 mg/día, enalapril y carvedilol; suspendió diurético hace 3 días. Niega inhibidores PDE5.',
   allergies: 'No reconoce alergias a fármacos.', risk: 'Ingesta elevada de sal y omisión del diurético; no inmovilización ni trombosis previa.'
  },
  vitals: {temp: 36.7, hr: 118, rr: 34, bp: '188/108', spo2: 86},
  examFindings: {
   appearance: 'Sentado, disnea intensa y uso de músculos accesorios; consciente y protege vía aérea.', skin: 'Sudoración, extremidades aún tibias y llenado capilar 2 segundos.',
   inspection: 'Ingurgitación yugular a 45 grados, edema pretibial bilateral y respiración rápida.', palpation: 'Edema con fóvea bilateral hasta tercio medio de piernas, pulsos simétricos.',
   percussion: 'Matidez leve en ambas bases.', bowel: 'Abdomen blando, ruidos presentes; hepatomegalia congestiva leve.', heart: 'Taquicardia regular, tercer ruido; sin soplo aórtico severo.',
   lungs: 'Crepitantes bilaterales hasta campos medios; murmullo disminuido en bases.', neuro: 'Alerta, sin focalidad, no agotamiento neuromuscular inicial.'
  },
  studies: [
   study('g_card03_ecg', 'ECG de 12 derivaciones', ['ecg', 'electrocardiograma'], 'procedure', 5, 'Taquicardia sinusal y signos de hipertrofia ventricular izquierda; sin elevación del ST.', {repeatable: true, dynamic: 'cardiac-rhythm'}),
   study('g_card03_lungus', 'Ecografía pulmonar y cardíaca a pie de cama', ['ecografia pulmonar', 'ecografia cardiopulmonar', 'pocus', 'eco cardiaco'], 'imaging', 5, 'Líneas B difusas bilaterales, pequeños derrames pleurales y disfunción sistólica izquierda conocida; sin dilatación aguda de VD ni derrame pericárdico.'),
   study('g_card03_xray', 'Radiografía de tórax', ['radiografia de torax', 'rx de torax', 'placa de torax'], 'imaging', 10, 'Redistribución vascular, edema intersticioalveolar bilateral y pequeños derrames; cardiomegalia, sin consolidación focal.'),
   study('g_card03_labs', 'Función renal, electrolitos y gasometría', ['laboratorio', 'creatinina y electrolitos', 'gasometria'], 'lab', 10, 'Creatinina 1.1 mg/dL, K 4.2 mmol/L, Na 138 mmol/L; pH 7.33, PaCO2 44 mmHg, PaO2 54 mmHg en aire ambiente. NT-proBNP 4800 pg/mL.', {repeatable: true})
  ],
  dx: ['insuficiencia cardiaca aguda', 'edema agudo de pulmon cardiogenico', 'ic descompensada', 'edema pulmonar hipertensivo'],
  differential: ['NAC', 'TEP', 'Exacerbación EPOC', 'SDRA'], requiredHistory: ['onset', 'pmh', 'meds', 'allergies'], keyStudies: ['g_card03_lungus', 'g_card03_labs'],
  interventionIds: ['iv', 'monitor', 'oxygen', 'niv', 'furosemide', 'nitroglycerin', 'intubation'], keyInterventions: ['furosemide', 'oxygen'],
  clinicalPolicy: {
   trajectory: trajectory([0, 8, 4, -10, -5, -3], [0, 12, 5, -18, -9, -4]),
   responses: [response(['furosemide'], 8, 30, [0, -10, -6, -15, -8, 5]), response(['nitroglycerin'], 2, 12, [0, -8, -4, -28, -14, 3]), response(['niv'], 2, 10, [0, -8, -7, -8, -4, 8]), response(['intubation'], 3, 15, [0, -8, -10, -8, -4, 10])],
   closure: {requiredExams: ['heart:auscultation', 'lungs:auscultation'], destinations: ['sala', 'uti'], treatment: [['furosemide', 'oxygen'], ['furosemide', 'niv'], ['furosemide', 'intubation']], requiredStudies: ['g_card03_labs'], study: [['g_card03_lungus', 'g_card03_xray']], consult: {sala: ['cardiologia'], uti: ['uti']}, summary: 'Internación por congestión aguda tras soporte respiratorio y diurético IV confirmados. Titular vasodilatador si la TA lo permite; reevaluar diuresis, perfusión, electrolitos y función renal. No se presume resolución de la cardiopatía.'},
   eligibility: {nitroglycerin: {...nitrateEligibility, bpLimit: {min: 110}}, niv: {excludeTraits: ['unprotectedAirway', 'cardiogenicShock', 'undrainedPneumothorax'], bpLimit: {min: 90}}, metoprolol: {excludeTraits: ['acuteDecompensatedHeartFailure']}},
   regimens: {furosemide: {dose: {amount: 40, unit: 'mg', display: '40 mg IV inicial; reevaluar diuresis y función renal antes de repetir'}, route: 'iv', administrationMinutes: 2}},
   traits: ['congestion', 'hypertensiveCongestion', 'acuteDecompensatedHeartFailure'], doNotDelay: {furosemide: ['g_card03_labs', 'g_card03_xray'], niv: ['g_card03_xray', 'g_card03_labs']},
   complications: [complication('card03-respiratory-fatigue', .25, 18, [0, 8, -4, -12, -6, -6], [], 'Fatiga respiratoria e hipoxemia persistente por edema pulmonar.', {type: 'respiratory-fatigue', requiredState: {spo2: {lt: 90}}, rescueAnyOf: ['niv', 'intubation'], recoveryMinutes: 15})]
  }
 },
 {
  id: 'CARD-04', specialty: 'Cardiología', title: 'Fibrilación auricular de respuesta ventricular rápida', difficulty: 'media',
  chief: 'Palpitaciones irregulares y disnea', opening: 'El corazón me late muy rápido y desparejo desde ayer.', ageRange: [50, 80],
  variation: {backgroundHistory: [
   {"id": "miopia-corregida", "history": {"pmh": "Hipertensión y diabetes; no insuficiencia cardíaca, valvulopatía mitral significativa ni válvula mecánica conocidas. Uso anteojos por miopía desde joven, sin pérdida visual reciente ni tratamiento sistémico por ese antecedente."}},
   {"id": "esguince-remoto", "history": {"pmh": "Hipertensión y diabetes; no insuficiencia cardíaca, valvulopatía mitral significativa ni válvula mecánica conocidas. Tuve un esguince de tobillo hace cinco años; me recuperé y antes de estas palpitaciones caminaba normalmente."}}
  ]},
  history: {
   onset: 'Palpitaciones intermitentes desde hace 36 horas, ahora continuas. No puede precisar el inicio real de la arritmia; último ECG hace 6 meses.',
   symptoms: 'Fatiga y disnea leve; sin síncope, dolor torácico persistente, edema pulmonar ni focalidad neurológica.',
   pmh: 'Hipertensión y diabetes; no insuficiencia cardíaca, valvulopatía mitral significativa ni válvula mecánica conocidas.',
   meds: 'Losartán y metformina; no betabloqueantes, antiarrítmicos ni anticoagulantes.', allergies: 'No conoce alergias medicamentosas.',
   risk: 'Riesgo embólico al menos por HTA y diabetes. Sin consumo de cocaína ni episodio febril.',
   anticoagulation: 'Nunca recibió anticoagulación. Sin hemorragia previa, caída reciente ni cirugía; duración de FA mayor de 24 h o incierta.'
  },
  vitals: {temp: 36.7, hr: 154, rr: 23, bp: '132/80', spo2: 95},
  examFindings: {
   appearance: 'Alerta, disnea leve y palpitaciones; perfusión conservada.', skin: 'Tibia, sin moteado ni sangrado.', inspection: 'Sin ingurgitación yugular ni edema periférico.',
   palpation: 'Pulso radial irregular con déficit de pulso, llenado capilar 2 segundos.', percussion: 'Sonoridad pulmonar normal.', bowel: 'Abdomen blando, ruidos presentes.',
   heart: 'Ritmo irregularmente irregular, frecuencia elevada, sin soplo mitral significativo.', lungs: 'Sin crepitantes ni sibilancias.', neuro: 'Glasgow 15, lenguaje, fuerza y sensibilidad conservados.'
  },
  studies: [
   study('g_card04_ecg', 'ECG de 12 derivaciones', ['ecg', 'electrocardiograma'], 'procedure', 5, 'FA a 154/min, QRS estrecho, sin onda delta ni signos de preexcitación; sin elevación del ST.', {repeatable: true, dynamic: 'cardiac-rhythm'}),
   study('g_card04_labs', 'Hemograma, función renal y electrolitos', ['laboratorio', 'funcion renal y electrolitos', 'potasio y magnesio'], 'lab', 10, 'Hb 13.8 g/dL, plaquetas 220000/mm³, creatinina 0.9 mg/dL, K 4.1 mmol/L, Mg 2.0 mg/dL; no anemia ni desequilibrio desencadenante.'),
   study('g_card04_echo', 'Ecocardiograma transtorácico', ['ecocardiograma', 'eco cardiaco', 'ecografia cardiaca'], 'imaging', 15, 'FEVI 55%, sin valvulopatía mitral significativa, sin congestión. Este estudio no excluye trombo en orejuela izquierda.'),
   study('g_card04_tee', 'Ecocardiograma transesofágico antes de cardioversión electiva', ['ecocardiograma transesofagico', 'ete', 'excluir trombo auricular'], 'imaging', 20, 'Sin trombo en aurícula/orejuela izquierda. Si se elige cardioversión, requiere anticoagulación perioperatoria y plan posterior; no equivale a cardioversión realizada.')
  ],
  dx: ['fibrilacion auricular rapida', 'fa rapida', 'fibrilacion auricular con respuesta ventricular rapida', 'fa de alta respuesta ventricular'],
  differential: ['Flutter auricular', 'TSV regular', 'Taquicardia sinusal por sepsis', 'Hipertiroidismo'], requiredHistory: ['onset', 'pmh', 'meds', 'allergies', 'anticoagulation'],
  keyStudies: ['g_card04_ecg', 'g_card04_labs'], interventionIds: ['iv', 'monitor', 'metoprolol', 'amiodarone', 'cardioversion', 'enoxaparin', 'heparin_therapeutic'], keyInterventions: ['metoprolol', 'enoxaparin'],
  clinicalPolicy: {
   trajectory: trajectory([0, 6, 1, -8, -4, -1], [0, 10, 2, -14, -7, -2]),
   responses: [response(['metoprolol'], 3, 15, [0, -55, -3, -5, -3, 1]), response(['amiodarone'], 20, 60, [0, -45, -3, -6, -3, 1]), response(['cardioversion'], 1, 5, [0, -70, -4, 8, 4, 2])],
   closure: {requiredExams: ['heart:auscultation', 'lungs:auscultation'], destinations: ['observacion', 'sala'], treatment: [['metoprolol', 'enoxaparin'], ['metoprolol', 'heparin_therapeutic'], ['amiodarone', 'enoxaparin'], ['amiodarone', 'heparin_therapeutic'], ['cardioversion', 'enoxaparin'], ['cardioversion', 'heparin_therapeutic']], requiredStudies: ['g_card04_ecg', 'g_card04_labs'], study: [['g_card04_ecg']], consult: {sala: ['cardiologia']}, summary: 'Control de frecuencia/ritmo reevaluado y plan de anticoagulación por riesgo embólico. FA de duración incierta: evitar cardioversión electiva sin anticoagulación adecuada o ETE; mantener vigilancia y plan de anticoagulación oral posterior. No se presume ritmo sinusal por descenso aislado de FC.'},
   eligibility: {metoprolol: {requiredStudies: ['g_card04_ecg'], excludeTraits: ['cardiogenicShock', 'acuteDecompensatedHeartFailure', 'preexcitedAtrialFibrillation', 'highGradeAvBlock'], bpLimit: {min: 90}}, amiodarone: {requiredStudies: ['g_card04_ecg', 'g_card04_tee'], excludeTraits: ['preexcitedAtrialFibrillation']}, cardioversion: {requiredStudies: ['g_card04_tee'], unlessUnstable: true}, enoxaparin: {...noBleeding, requiredStudies: ['g_card04_labs']}, heparin_therapeutic: noBleeding},
   traits: ['atrialFibrillationRateControl', 'afUncertainDuration', 'conversionEmbolismRisk'],
   complications: [complication('card04-arrhythmic-instability', .12, 20, [0, 10, 4, -28, -14, -3], ['cardioversion'], 'FA persistente con hipotensión y signos de bajo gasto; cardioversión urgente sin esperar ETE si la arritmia causa la inestabilidad.', {requiredState: {hr: {gt: 145}}, recoveryMinutes: 10})]
  }
 },
 {
  id: 'CARD-05', specialty: 'Cardiología', title: 'Taquicardia supraventricular regular de QRS estrecho', difficulty: 'media',
  chief: 'Palpitaciones de inicio súbito', opening: 'De golpe el corazón empezó a correr rapidísimo.', ageRange: [18, 60],
  variation: {backgroundHistory: [
   {"id": "varicela-infantil", "history": {"pmh": "Sin cardiopatía estructural ni asma. Episodio similar autolimitado hace 1 año. Tuve varicela de niño, sin complicaciones; no quedó ninguna secuela ni recibo tratamiento por eso."}},
   {"id": "fractura-remota", "history": {"pmh": "Sin cardiopatía estructural ni asma. Episodio similar autolimitado hace 1 año. Años atrás tuve una fractura de muñeca que consolidó sin secuelas; no tomo medicación por ese antecedente."}}
  ]},
  history: {
   onset: 'Inicio y final abruptos en episodios previos; episodio actual comenzó hace 35 minutos mientras estaba sentado.',
   symptoms: 'Palpitaciones regulares y mareo leve, sin síncope, angina persistente o disnea intensa.', pmh: 'Sin cardiopatía estructural ni asma. Episodio similar autolimitado hace 1 año.',
   meds: 'No toma medicamentos ni dipiridamol; niega estimulantes, drogas recreativas o trasplante cardíaco.', allergies: 'No conoce alergias medicamentosas.',
   risk: 'No antecedente de preexcitación, broncoespasmo ni enfermedad del nodo sinusal.'
  },
  vitals: {temp: 36.6, hr: 184, rr: 23, bp: '116/72', spo2: 97},
  examFindings: {
   appearance: 'Alerta, ansioso, habla sin dificultad; mareo leve.', skin: 'Tibia, llenado capilar 2 segundos, sin diaforesis intensa.', inspection: 'Sin trabajo respiratorio ni ingurgitación yugular.',
   palpation: 'Pulso rápido y rigurosamente regular, sin asimetría.', percussion: 'Sonoridad normal.', bowel: 'Abdomen blando, ruidos presentes.',
   heart: 'Taquicardia regular, sin soplos audibles.', lungs: 'Murmullo vesicular conservado, sin crepitantes ni sibilancias.', neuro: 'Alerta, orientado, sin focalidad.'
  },
  studies: [
   study('g_card05_ecg', 'ECG de 12 derivaciones y tira de ritmo', ['ecg', 'electrocardiograma', 'tira de ritmo'], 'procedure', 5, 'Taquicardia regular a 184/min, QRS de 80 ms y ondas P no claramente visibles: TSV dependiente del nodo AV probable. Sin irregularidad ni QRS ancho.', {repeatable: true, dynamic: 'cardiac-rhythm'}),
   study('g_card05_labs', 'Electrolitos y función renal', ['electrolitos', 'potasio y magnesio', 'laboratorio'], 'lab', 10, 'K 4.1 mmol/L, Mg 2.0 mg/dL, creatinina 0.8 mg/dL; sin alteración metabólica precipitante.')
  ],
  dx: ['taquicardia supraventricular', 'tsv regular', 'tsv de qrs estrecho', 'taquicardia por reentrada nodal', 'avnrt'],
  differential: ['Flutter 2:1', 'Taquicardia auricular', 'Taquicardia sinusal', 'FA preexcitada si ritmo irregular/ancho'], requiredHistory: ['onset', 'pmh', 'meds', 'allergies'], keyStudies: ['g_card05_ecg'],
  interventionIds: ['iv', 'monitor', 'vagal_maneuver', 'adenosine', 'cardioversion'], keyInterventions: ['adenosine'],
  clinicalPolicy: {
   trajectory: trajectory([0, 3, 1, -8, -4, -1], [0, 6, 3, -18, -9, -2]),
   responses: [response(['vagal_maneuver'], .5, 2, [0, -100, -3, 8, 4, 1]), response(['adenosine'], .1, 1, [0, -100, -3, 8, 4, 1]), response(['cardioversion'], 1, 5, [0, -100, -4, 10, 5, 2])],
   closure: {requiredExams: ['heart:auscultation', 'lungs:auscultation'], destinations: ['observacion'], minimumObservationMinutes: 30, treatment: [['vagal_maneuver'], ['adenosine'], ['cardioversion']], requiredStudies: ['g_card05_ecg'], study: [['g_card05_ecg']], summary: 'TSV regular tratada con maniobra vagal/adenosina o cardioversión si corresponde, con reevaluación de ritmo y perfusión. Continuar observación al menos 30 min por recurrencia; el alta requiere criterios posteriores que esta variante no certifica.'},
   eligibility: {vagal_maneuver: {requiredStudies: ['g_card05_ecg'], excludeTraits: ['unstableTachyarrhythmia']}, adenosine: {requiredStudies: ['g_card05_ecg'], excludeTraits: ['asthma', 'severeBronchospasm', 'preexcitedAtrialFibrillation', 'irregularWideComplexTachycardia', 'highGradeAvBlock']}, cardioversion: {requiredStudies: ['g_card05_ecg']}},
   regimens: {cardioversion: {dose: {amount: 100, unit: 'J', display: '100 J bifásicos sincronizados para TSV regular'}, route: 'procedure'}},
   traits: ['regularNarrowComplexTachycardia'], rhythmConversionAlternatives: ['vagal_maneuver', 'adenosine', 'cardioversion'],
   complications: [complication('card05-unstable-svt', .12, 20, [0, 5, 4, -24, -12, -3], ['cardioversion'], 'TSV persistente con hipotensión y alteración de perfusión: cardioversión sincronizada urgente.', {requiredState: {hr: {gt: 160}}, recoveryMinutes: 10})]
  }
 },
 {
  id: 'CARD-06', specialty: 'Cardiología', title: 'Bloqueo auriculoventricular completo sintomático', difficulty: 'alta',
  chief: 'Síncope y pulso muy lento', opening: 'Me desmayé y sigo muy mareado.', ageRange: [55, 85],
  variation: {backgroundHistory: [
   {"id": "catarata-operada", "history": {"pmh": "Hipertensión y bloqueo de rama previo. Sin marcapasos. Me operaron una catarata hace más de cinco años, sin complicaciones ni medicación sistémica posterior."}},
   {"id": "lumbalgia-resuelta", "history": {"pmh": "Hipertensión y bloqueo de rama previo. Sin marcapasos. Tuve un episodio de lumbalgia hace años, que cedió; no tomo analgésicos ni relajantes musculares actualmente."}}
  ]},
  history: {
   onset: 'Síncope breve hace 20 minutos, sin pródromos convulsivos, con mareo e intensa debilidad persistentes.',
   symptoms: 'Disnea y presíncope al sentarse; sin dolor torácico intenso ni déficit focal.', pmh: 'Hipertensión y bloqueo de rama previo. Sin marcapasos.',
   meds: 'Amlodipina; no digoxina, betabloqueantes, verapamilo o diltiazem. No posible sobredosis.', allergies: 'No conoce alergias medicamentosas.',
   risk: 'Sin fiebre, exposición a tóxicos ni enfermedad renal conocida; requiere búsqueda de isquemia y causas reversibles.'
  },
  vitals: {temp: 36.5, hr: 32, rr: 24, bp: '82/46', spo2: 92},
  examFindings: {
   appearance: 'Somnolencia leve, responde correctamente pero presenta presíncope al incorporarse.', skin: 'Fría, pálida; llenado capilar 4 segundos.',
   inspection: 'Ondas a cañón intermitentes en yugulares, sin edema.', palpation: 'Pulso lento, regular y débil, con variación de amplitud.', percussion: 'Sonoridad normal.', bowel: 'Abdomen blando, ruidos presentes.',
   heart: 'Bradicardia marcada con intensidad variable del primer ruido; sin soplo nuevo.', lungs: 'Sin crepitantes extensos.', neuro: 'Sin focalidad; lentitud por hipoperfusión.'
  },
  studies: [
   study('g_card06_ecg', 'ECG de 12 derivaciones urgente', ['ecg', 'electrocardiograma', 'ecg urgente'], 'procedure', 5, 'Disociación AV completa: P a 88/min y escape ventricular a 32/min, QRS de 150 ms; BAV de tercer grado con escape infranodal.', {repeatable: true, dynamic: 'cardiac-rhythm'}),
   study('g_card06_labs', 'Electrolitos, función renal y troponina', ['electrolitos', 'potasio', 'laboratorio', 'troponina'], 'lab', 10, 'K 4.3 mmol/L, Mg 2.0 mg/dL, creatinina 1.0 mg/dL, troponina inicial no elevada; no causa metabólica inmediata identificada.'),
   study('g_card06_echo', 'Ecocardiograma a pie de cama', ['ecocardiograma', 'eco cardiaco'], 'imaging', 10, 'FEVI 50%, sin derrame ni alteración segmentaria extensa; bajo volumen minuto relacionado con bradicardia.')
  ],
  dx: ['bloqueo auriculoventricular completo', 'bav completo', 'bav de tercer grado', 'bloqueo av de tercer grado'],
  differential: ['Hiperkalemia', 'Toxicidad por bloqueantes AV', 'Infarto inferior', 'Enfermedad degenerativa de conducción'], requiredHistory: ['onset', 'meds', 'allergies'], keyStudies: ['g_card06_ecg'],
  interventionIds: ['iv', 'monitor', 'oxygen', 'atropine', 'temporary_pacing', 'vasopressor'], keyInterventions: ['temporary_pacing'],
  clinicalPolicy: {
   trajectory: trajectory([0, -2, 3, -10, -5, -2], [0, -4, 4, -12, -6, -3]),
   responses: [response(['temporary_pacing'], 1, 6, [0, 38, -5, 30, 16, 4])],
   closure: {requiredExams: ['heart:auscultation', 'lungs:auscultation'], destinations: ['uti'], treatment: [['temporary_pacing']], requiredStudies: ['g_card06_ecg'], study: [['g_card06_ecg']], consult: {uti: ['cardiologia']}, summary: 'Estimulación temporal con captura eléctrica y mecánica confirmada e ingreso monitorizado a unidad coronaria aceptado. Valorar marcapasos definitivo y causas reversibles. Atropina aislada no asegura respuesta en escape infranodal ni habilita cierre.'},
   eligibility: {temporary_pacing: {requiredStudies: ['g_card06_ecg']}, metoprolol: {excludeTraits: ['highGradeAvBlock']}, esmolol: {excludeTraits: ['highGradeAvBlock']}, adenosine: {excludeTraits: ['highGradeAvBlock']}},
   traits: ['symptomaticBradycardia', 'symptomaticHighGradeAvBlock', 'highGradeAvBlock', 'hypoperfusion'], doNotDelay: {temporary_pacing: ['g_card06_labs', 'g_card06_echo']},
   complications: [complication('card06-low-output-collapse', .3, 15, [0, -5, 4, -18, -10, -4], ['temporary_pacing'], 'Escape ventricular ineficaz con agravamiento de hipoperfusión.', {requiredState: {hr: {lt: 40}}, recoveryMinutes: 10})]
  }
 },
 {
  id: 'CARD-07', specialty: 'Cardiología', title: 'Taponamiento cardíaco con compromiso hemodinámico', difficulty: 'alta',
  chief: 'Disnea, debilidad y presión baja', opening: 'Cada vez me falta más el aire y estoy muy débil.', ageRange: [35, 80],
  variation: {backgroundHistory: [
   {"id": "fractura-antigua", "history": {"pmh": "Neoplasia pulmonar en estudio y derrame pericárdico conocido; no cirugía cardíaca reciente. Tuve una fractura de tobillo hace quince años; consolidó y no tenía inmovilización ni limitación por eso."}},
   {"id": "hernia-remota", "history": {"pmh": "Neoplasia pulmonar en estudio y derrame pericárdico conocido; no cirugía cardíaca reciente. Me operaron una hernia inguinal hace catorce años, sin complicaciones; no tuve cirugías recientes por ese motivo."}}
  ]},
  history: {
   onset: 'Disnea progresiva durante 5 días con empeoramiento brusco y presíncope en la última hora.',
   symptoms: 'Molestia torácica sorda y sensación de plenitud, sin dolor desgarrador ni traumatismo.', pmh: 'Neoplasia pulmonar en estudio y derrame pericárdico conocido; no cirugía cardíaca reciente.',
   meds: 'Paracetamol; sin anticoagulantes ni diuréticos.', allergies: 'No refiere alergias medicamentosas.',
   risk: 'Derrame pericárdico posiblemente neoplásico; requiere estudio etiológico del líquido tras estabilización.'
  },
  vitals: {temp: 36.7, hr: 122, rr: 28, bp: '84/58', spo2: 92},
  examFindings: {
   appearance: 'Ansioso, disneico y presincopal; conserva vía aérea.', skin: 'Fría y húmeda, llenado capilar 4 segundos.', inspection: 'Ingurgitación yugular marcada, sin edema masivo.',
   palpation: 'Pulso débil con pulso paradójico de 16 mmHg; extremidades frías.', percussion: 'Sonoridad pulmonar conservada.', bowel: 'Ruidos presentes, abdomen blando.',
   heart: 'Ruidos hipofonéticos y taquicardia regular.', lungs: 'Sin crepitantes difusos ni asimetría de murmullo.', neuro: 'Glasgow 15, mareo por hipoperfusión, sin focalidad.'
  },
  studies: [
   study('g_card07_echo', 'Ecocardiograma urgente a pie de cama', ['ecocardiograma', 'eco cardiaco', 'pocus', 'ecografia cardiaca urgente'], 'imaging', 5, 'Derrame pericárdico circunferencial grande con colapso sistólico de AD y diastólico de VD, VCI dilatada sin colapso y variación respiratoria marcada: fisiología de taponamiento.'),
   study('g_card07_ecg', 'ECG de 12 derivaciones', ['ecg', 'electrocardiograma'], 'procedure', 5, 'Taquicardia sinusal, bajo voltaje y alternancia eléctrica, sin elevación territorial del ST.', {repeatable: true, dynamic: 'cardiac-rhythm'}),
   study('g_card07_labs', 'Hemograma, coagulación y función renal', ['hemograma y coagulograma', 'laboratorio', 'coagulacion'], 'lab', 10, 'Hb 11.4 g/dL, plaquetas 248000/mm³, INR 1.0, creatinina 1.2 mg/dL. Solicitar tipificación si se anticipa drenaje quirúrgico; no demorar drenaje por estos resultados.')
  ],
  dx: ['taponamiento cardiaco', 'taponamiento pericardico', 'derrame pericardico con taponamiento', 'shock obstructivo por taponamiento'],
  differential: ['TEP masivo', 'Neumotórax a tensión', 'Shock cardiogénico', 'Disección con hemopericardio'], requiredHistory: ['onset', 'pmh', 'meds', 'allergies'], keyStudies: ['g_card07_echo'],
  interventionIds: ['iv', 'monitor', 'oxygen', 'fluid', 'pericardial_drainage'], keyInterventions: ['pericardial_drainage'],
  clinicalPolicy: {
   trajectory: trajectory([0, 8, 3, -10, -5, -2], [0, 10, 4, -15, -8, -3], .2),
   responses: [response(['pericardial_drainage'], 2, 12, [0, -22, -6, 35, 18, 5])],
   closure: {requiredExams: ['heart:auscultation', 'lungs:auscultation'], destinations: ['procedimiento', 'uti'], treatment: [['pericardial_drainage'], ['iv']], requiredStudies: [], study: [['g_card07_echo']], urgentStudyBypass: true, consult: {procedimiento: ['cardiologia'], uti: ['uti']}, summary: 'Derivación/recepción urgente para drenaje pericárdico aceptada o drenaje ya realizado con recibo específico. Acceso IV y volumen prudente solo como puente; no confundir traslado con pericardiocentesis ni demorar el control definitivo del shock.'},
   eligibility: {pericardial_drainage: {requiredStudies: ['g_card07_echo'], unlessUnstable: true}, furosemide: {excludeTraits: ['tamponade']}, niv: {excludeTraits: ['tamponade']}, nitroglycerin: {excludeTraits: ['preloadDependence', 'tamponade']}},
   traits: ['tamponade', 'preloadDependence', 'hypoperfusion'], definitiveInterventions: ['pericardial_drainage'], doNotDelay: {pericardial_drainage: ['g_card07_labs', 'g_card07_ecg']},
   cautions: ['Evitar diuréticos, vasodilatadores y presión positiva antes del drenaje salvo necesidad vital de vía aérea. La expansión prudente puede sostener perfusión, no corregir el taponamiento.'],
   complications: [complication('card07-obstructive-collapse', .35, 15, [0, 10, 4, -18, -10, -3], ['pericardial_drainage'], 'Progresión del taponamiento a shock obstructivo profundo.', {requiredState: {sys: {lt: 90}}, recoveryMinutes: 12})]
  }
 },
 {
  id: 'CARD-08', specialty: 'Cardiología', title: 'Disección aórtica Stanford A', difficulty: 'alta',
  chief: 'Dolor torácico desgarrador hacia espalda', opening: 'Fue un dolor brutal, de golpe, que se me fue a la espalda.', ageRange: [40, 80],
  variation: {backgroundHistory: [
   {"id": "fractura-codo-remota", "history": {"pmh": "Hipertensión mal controlada y dilatación de aorta ascendente conocida; no insuficiencia aórtica severa previa. Tuve una fractura de codo hace más de diez años; consolidó y no dejó secuelas ni requiere medicación."}},
   {"id": "presbicia", "history": {"pmh": "Hipertensión mal controlada y dilatación de aorta ascendente conocida; no insuficiencia aórtica severa previa. Uso anteojos para leer por presbicia desde hace años; no tengo síntomas visuales recientes ni tratamiento sistémico por eso."}}
  ]},
  history: {
   onset: 'Dolor máximo desde el primer segundo, hace 45 minutos, retroesternal e interescapular, diferente a cualquier episodio previo.',
   symptoms: 'Mareo y sudoración; sin dolor de esfuerzo progresivo. Niega traumatismo, consumo de cocaína o pérdida de conciencia.',
   pmh: 'Hipertensión mal controlada y dilatación de aorta ascendente conocida; no insuficiencia aórtica severa previa.',
   meds: 'Losartán irregular; sin anticoagulantes ni antiagregantes.', allergies: 'No conoce alergias a medicamentos o contraste.',
   risk: 'Hipertensión y aneurisma de aorta ascendente. La sospecha de disección obliga a evitar tratamiento antitrombótico empírico de SCA.'
  },
  vitals: {temp: 36.6, hr: 112, rr: 25, bp: '188/100', spo2: 95},
  examFindings: {
   appearance: 'Dolor intenso y ansiedad, consciente.', skin: 'Pálida, húmeda, sin sangrado externo.', inspection: 'Sin ingurgitación yugular ni trabajo respiratorio extremo.',
   palpation: 'Pulso radial izquierdo disminuido; TA derecha 188/100 e izquierda 156/88 mmHg. Abdomen no peritoneal.', percussion: 'Sonoridad conservada.', bowel: 'Ruidos presentes.',
   heart: 'Taquicardia regular y soplo diastólico aórtico leve, sin signos de regurgitación aórtica aguda grave.', lungs: 'Sin edema pulmonar ni asimetría marcada.', neuro: 'Glasgow 15, sin focalidad inicial; vigilar malperfusión.'
  },
  studies: [
   study('g_card08_cta', 'Angio-TC de aorta toracoabdominal urgente', ['angio tc de aorta', 'angiotomografia de aorta', 'angio tc aortica', 'tc de aorta'], 'imaging', 15, 'Flap de disección desde raíz/aorta ascendente hasta aorta descendente proximal: Stanford A. Sin rotura libre visible; ramas supraaórticas permeables, sin hemopericardio importante.'),
   study('g_card08_tee', 'Ecocardiograma transesofágico urgente', ['ecocardiograma transesofagico', 'ete', 'eco transesofagico'], 'imaging', 10, 'Flap en aorta ascendente, insuficiencia aórtica leve, sin derrame con taponamiento. Alternativa junto a la cama si traslado a TC resulta inseguro.'),
   study('g_card08_ecg', 'ECG de 12 derivaciones', ['ecg', 'electrocardiograma'], 'procedure', 5, 'Taquicardia sinusal y cambios inespecíficos; no descarta disección ni justifica anticoagulación.', {repeatable: true, dynamic: 'cardiac-rhythm'}),
   study('g_card08_labs', 'Hemograma, función renal, coagulación y reserva', ['laboratorio', 'hemograma y coagulacion', 'reserva de sangre'], 'lab', 10, 'Hb 13.0 g/dL, plaquetas 240000/mm³, INR 1.0, creatinina 1.0 mg/dL; grupo y reserva solicitados. No esperar dímero D para confirmar una sospecha de alto riesgo.')
  ],
  dx: ['diseccion aortica tipo a', 'diseccion de aorta ascendente', 'diseccion stanford a', 'sindrome aortico agudo tipo a'],
  differential: ['SCA', 'TEP', 'Rotura de aneurisma', 'Pericarditis'], requiredHistory: ['onset', 'pmh', 'meds', 'allergies'], keyStudies: ['g_card08_cta'],
  interventionIds: ['iv', 'monitor', 'esmolol', 'metoprolol', 'morphine', 'aortic_surgery'], keyInterventions: ['esmolol'],
  clinicalPolicy: {
   trajectory: trajectory([0, 6, 2, 5, 3, -1], [0, 10, 3, -20, -10, -3]),
   responses: [response(['esmolol'], 2, 12, [0, -40, -3, -60, -25, 0]), response(['metoprolol'], 3, 15, [0, -35, -2, -45, -20, 0]), response(['aortic_surgery'], 30, 120, [0, -10, -4, 0, 0, 2])],
   closure: {requiredExams: ['heart:auscultation', 'lungs:auscultation'], destinations: ['quirofano'], treatment: [['esmolol'], ['metoprolol']], requiredStudies: [], study: [['g_card08_cta', 'g_card08_tee']], consult: {quirofano: ['cardiovascular']}, summary: 'Recepción inmediata por cirugía cardiovascular aceptada por disección tipo A, con control antiimpulso y analgesia monitorizados. Meta FC 60–80/min y TA sistólica <120 mmHg o mínima que conserve perfusión. Traslado a cirugía no equivale a reparación realizada.'},
   eligibility: {esmolol: {excludeTraits: ['cardiogenicShock', 'acuteSevereAorticRegurgitation', 'highGradeAvBlock'], bpLimit: {min: 100}}, metoprolol: {excludeTraits: ['cardiogenicShock', 'acuteSevereAorticRegurgitation', 'highGradeAvBlock'], bpLimit: {min: 100}}, aspirin: noBleeding, ticagrelor: noBleeding, clopidogrel: noBleeding, enoxaparin: noBleeding, heparin_therapeutic: noBleeding},
   traits: ['aorticDissection', 'typeAAorticDissection', 'bleedingRisk'], definitiveInterventions: ['aortic_surgery'],
   cautions: ['No anticoagular ni trombolizar por error de SCA/TEP. Si requiere vasodilatador por hipertensión persistente, controlar antes la frecuencia; evitar vasodilatación aislada con taquicardia refleja.'],
   complications: [complication('card08-aortic-leak', .18, 35, [0, 16, 5, -65, -35, -5], ['aortic_surgery'], 'Fuga/rotura contenida con caída de presión: cirugía cardiovascular inmediata, sin beneficio definitivo por betabloqueo aislado.', {riseMinutes: 15, recoveryMinutes: 120})]
  }
 },
 {
  id: 'CARD-09', specialty: 'Cardiología', title: 'Endocarditis aórtica por Enterococcus faecalis complicada', difficulty: 'alta',
  chief: 'Fiebre persistente y disnea reciente', opening: 'Hace días que tengo fiebre y ahora me cuesta respirar.', ageRange: [45, 85],
  variation: {backgroundHistory: [
   {"id": "colico-renal-antiguo", "history": {"pmh": "Valvulopatía aórtica nativa leve y procedimiento urinario hace 3 semanas; sin prótesis valvular ni dispositivo intracardíaco. Hace más de diez años tuve un cálculo renal que eliminé, sin recurrencias ni deterioro de la función renal conocido."}},
   {"id": "lumbalgia-remota", "history": {"pmh": "Valvulopatía aórtica nativa leve y procedimiento urinario hace 3 semanas; sin prótesis valvular ni dispositivo intracardíaco. Hace años tuve una lumbalgia por esfuerzo que se resolvió; no tomo antiinflamatorios ni corticoides habitualmente."}}
  ]},
  history: {
   onset: 'Fiebre diaria de 10 días, astenia y pérdida de apetito; disnea y ortopnea nuevas en las últimas 24 horas.',
   symptoms: 'Escalofríos, sudoración nocturna; sin cefalea brusca, déficit focal ni hemoptisis.',
   pmh: 'Valvulopatía aórtica nativa leve y procedimiento urinario hace 3 semanas; sin prótesis valvular ni dispositivo intracardíaco.',
   meds: 'Losartán y paracetamol. Aún no recibió antibióticos; fue llamado por hemocultivos externos positivos obtenidos hace 48 horas.',
   allergies: 'Niega alergias a penicilinas y cefalosporinas.',
   infection: 'Dos pares de hemocultivos ambulatorios positivos para E. faecalis sensible a ampicilina; trae informe, confirmar identidad y antibiograma.',
   risk: 'Riesgo de embolia e insuficiencia valvular; valorar equipo de endocarditis y cirugía, no iniciar anticoagulación para prevenir embolias sépticas.'
  },
  vitals: {temp: 38.5, hr: 112, rr: 26, bp: '118/58', spo2: 91},
  examFindings: {
   appearance: 'Aspecto febril, astenia y disnea moderada; alerta.', skin: 'Petequias conjuntivales y lesión indolora en palma; sin sangrado activo.',
   inspection: 'Taquipnea e ingurgitación yugular leve.', palpation: 'Pulsos amplios, llenado capilar 2–3 segundos, edema maleolar leve.', percussion: 'Matidez leve en bases.',
   bowel: 'Abdomen blando, ruidos presentes, sin signos de embolia mesentérica.', heart: 'Nuevo soplo diastólico aórtico y tercer ruido.', lungs: 'Crepitantes bibasales.',
   neuro: 'Alerta, sin focalidad inicial; vigilar embolia o complicación intracraneal.'
  },
  studies: [
   study('g_card09_external_cultures', 'Verificar hemocultivos externos y antibiograma', ['hemocultivos previos', 'cultivos externos', 'antibiograma', 'informe de hemocultivos'], 'lab', 5, 'Informe externo de muestras obtenidas hace 48 h: 2 pares positivos para E. faecalis sensible a ampicilina. No es un cultivo nuevo completado en minutos.'),
   study('g_card09_cultures', 'Tres pares de hemocultivos antes de antibióticos', ['hemocultivos', 'tres pares de hemocultivos', 'cultivos de sangre'], 'lab', 5, 'Tres pares de sitios periféricos distintos obtenidos y enviados a incubación antes del antibiótico; identificación y susceptibilidad de estas muestras siguen pendientes (24–72 h), sin postergar tratamiento.', {repeatable: true}),
   study('g_card09_echo', 'Ecocardiograma urgente y evaluación transesofágica', ['ecocardiograma', 'eco cardiaco', 'ecocardiograma transesofagico', 'ete'], 'imaging', 15, 'Vegetación móvil aórtica de 13 mm con perforación valvular e insuficiencia aórtica severa, dilatación ventricular izquierda y aumento de presiones de llenado; sin absceso perianular visible.'),
   study('g_card09_labs', 'Hemograma, función renal, inflamación y lactato', ['laboratorio', 'hemograma', 'creatinina', 'lactato'], 'lab', 10, 'Leucocitos 16400/mm³, Hb 10.8 g/dL, plaquetas 190000/mm³, PCR elevada, creatinina 1.1 mg/dL, lactato 2.1 mmol/L.'),
   study('g_card09_ecg', 'ECG y vigilancia de conducción', ['ecg', 'electrocardiograma'], 'procedure', 5, 'Taquicardia sinusal a 112/min, PR de 180 ms; sin nuevo BAV. Repetir ante cambios de conducción que sugieran extensión perianular.', {repeatable: true, dynamic: 'cardiac-rhythm'})
  ],
  dx: ['endocarditis infecciosa complicada', 'endocarditis aortica', 'endocarditis por enterococcus faecalis', 'endocarditis con insuficiencia aortica severa'],
  differential: ['Endocarditis de otro germen', 'Bacteriemia urinaria sin endocarditis', 'Valvulopatía no infecciosa', 'Absceso perianular'], requiredHistory: ['onset', 'pmh', 'meds', 'allergies', 'infection'],
  keyStudies: ['g_card09_cultures', 'g_card09_echo'], interventionIds: ['iv', 'monitor', 'ampicillin', 'ceftriaxone', 'oxygen', 'furosemide', 'niv', 'valve_surgery'], keyInterventions: ['ampicillin', 'ceftriaxone'],
  pharmacology: {coverageSets: [['ampicillin', 'ceftriaxone']]},
  clinicalPolicy: {
   trajectory: trajectory([.1, 6, 2, -7, -3, -2], [.2, 10, 4, -12, -6, -3]),
   responses: [response(['ampicillin', 'ceftriaxone'], 30, 120, [-.3, -4, 0, 0, 0, 0]), response(['furosemide'], 8, 30, [0, -5, -4, -5, -2, 3]), response(['niv'], 2, 12, [0, -5, -5, -5, -2, 6]), response(['valve_surgery'], 30, 120, [0, -12, -5, 12, 6, 4])],
   closure: {requiredExams: ['heart:auscultation', 'lungs:auscultation'], destinations: ['sala', 'quirofano', 'uti'], treatment: [['ampicillin', 'ceftriaxone']], requiredStudies: ['g_card09_cultures', 'g_card09_echo', 'g_card09_external_cultures'], study: [['g_card09_echo']], consult: {sala: ['cardiologia'], quirofano: ['cardiovascular'], uti: ['uti']}, summary: 'Endocarditis por E. faecalis con disfunción valvular e insuficiencia cardíaca: antibióticos IV dirigidos iniciados y receptor/equipo de endocarditis con cirugía cardiovascular avisado. Plan de tratamiento prolongado y cirugía urgente según compromiso. Una dosis no esteriliza vegetaciones ni corrige la válvula.'},
   eligibility: {ampicillin: {requiredStudies: ['g_card09_cultures', 'g_card09_external_cultures'], requiresHistory: ['allergies']}, ceftriaxone: {requiredStudies: ['g_card09_cultures', 'g_card09_external_cultures'], requiresHistory: ['allergies']}, niv: {bpLimit: {min: 90}, excludeTraits: ['unprotectedAirway', 'cardiogenicShock']}},
   regimens: {ampicillin: {dose: {amount: 2000, unit: 'mg', display: '2 g IV cada 4 h; ajustar a función renal'}, route: 'iv', intervalMinutes: 240, administrationMinutes: 30}, ceftriaxone: {dose: {amount: 2000, unit: 'mg', display: '2 g IV cada 12 h para sinergia enterocócica'}, route: 'iv', intervalMinutes: 720, administrationMinutes: 30}},
   traits: ['infection', 'complicatedEndocarditis', 'congestion', 'acuteSevereAorticRegurgitation'], definitiveInterventions: ['valve_surgery'], antibioticPlan: 'Ampicilina 12 g/día en 6 dosis + ceftriaxona 4 g/día en 2 dosis; ajustar a cultivos, función renal y equipo tratante, habitualmente 6 semanas en esta endocarditis complicada. No extrapolar esta combinación a E. faecium.',
   complications: [complication('card09-valvular-edema', .25, 22, [0, 10, 5, -15, -7, -6], ['valve_surgery'], 'Destrucción valvular con edema pulmonar y deterioro; soporte transitorio y valoración de cirugía urgente, sin curación instantánea por antibióticos.', {requiredState: {rr: {gt: 24}}, recoveryMinutes: 120})]
  }
 },
 {
  id: 'CARD-10', specialty: 'Cardiología', title: 'Shock cardiogénico por infarto agudo de miocardio', difficulty: 'alta',
  chief: 'Dolor torácico, disnea e hipotensión', opening: 'Me duele mucho el pecho, me ahogo y siento que me voy.', ageRange: [45, 85],
  variation: {backgroundHistory: [
   {"id": "catarata-operada", "history": {"pmh": "Diabetes e hipertensión; infarto previo sin insuficiencia renal conocida. Me operaron una catarata hace siete años, sin complicaciones y sin medicación sistémica por ese antecedente."}},
   {"id": "tunel-carpiano-remoto", "history": {"pmh": "Diabetes e hipertensión; infarto previo sin insuficiencia renal conocida. Me operaron un túnel carpiano hace nueve años; mejoró y no quedaron síntomas ni limitaciones de la mano."}}
  ]},
  history: {
   onset: 'Dolor opresivo retroesternal iniciado hace 3 horas, seguido de disnea y sudoración; debilidad extrema en los últimos 30 minutos.',
   symptoms: 'Ortopnea, mareo y disminución de diuresis; sin vómitos con sangre, diarrea, fiebre o dolor desgarrador a espalda.',
   pmh: 'Diabetes e hipertensión; infarto previo sin insuficiencia renal conocida.', meds: 'Metformina, losartán y aspirina irregular; sin anticoagulantes, inhibidores PDE5 o betabloqueantes hoy.',
   allergies: 'No conoce alergias a medicamentos o contraste.', risk: 'Coronariopatía y diabetes. No pérdidas de volumen; patrón de shock con congestión, no indicación de carga rutinaria de cristaloides.',
   bleeding: 'Sin hemorragia activa, cirugía reciente o hemorragia intracraneal previa.'
  },
  vitals: {temp: 36.3, hr: 124, rr: 32, bp: '78/48', spo2: 86},
  examFindings: {
   appearance: 'Disnea intensa, respuesta lenta pero obedece órdenes; habla en pocas palabras.', skin: 'Fría, moteada, sudorosa y llenado capilar 5 segundos.',
   inspection: 'Ingurgitación yugular, uso de músculos accesorios.', palpation: 'Pulsos filiformes simétricos y extremidades frías; sin signos de pérdida de volumen.', percussion: 'Matidez leve basal bilateral.',
   bowel: 'Ruidos hipoactivos, abdomen blando sin peritonismo.', heart: 'Taquicardia regular y tercer ruido; sin soplo nuevo intenso, sin defecto mecánico evidente.',
   lungs: 'Crepitantes bilaterales hasta campos medios.', neuro: 'Hiporreactividad por bajo gasto, sin focalidad inicial.'
  },
  studies: [
   study('g_card10_ecg', 'ECG de 12 derivaciones inmediato', ['ecg', 'electrocardiograma', 'ecg urgente'], 'procedure', 5, 'Elevación extensa del ST en V1–V6 e I/aVL con descenso recíproco inferior: IAM anterior extenso con shock.', {repeatable: true, dynamic: 'cardiac-rhythm'}),
   study('g_card10_echo', 'Ecocardiograma urgente a pie de cama', ['ecocardiograma', 'eco cardiaco', 'pocus'], 'imaging', 5, 'Disfunción sistólica izquierda severa, FEVI aproximada 20%, acinesia anterior/apical; sin taponamiento, rotura septal o insuficiencia mitral aguda evidente. Pulmón con líneas B difusas.'),
   study('g_card10_labs', 'Lactato, gasometría, hemograma y función renal', ['lactato', 'gasometria', 'laboratorio', 'funcion renal'], 'lab', 10, 'Lactato 5.6 mmol/L, pH 7.27, Hb 13.5 g/dL, plaquetas 223000/mm³, creatinina 1.5 mg/dL, K 4.3 mmol/L; troponina I ultrasensible 9600 ng/L. No esperar laboratorio para activar revascularización.', {repeatable: true})
  ],
  dx: ['shock cardiogenico por infarto', 'shock cardiogenico', 'iam con shock cardiogenico', 'infarto anterior complicado con shock'],
  differential: ['Complicación mecánica del IAM', 'Taponamiento', 'TEP masivo', 'Disección aórtica'], requiredHistory: ['onset', 'pmh', 'meds', 'allergies', 'bleeding'], keyStudies: ['g_card10_ecg', 'g_card10_echo'],
  interventionIds: ['iv', 'monitor', 'oxygen', 'intubation', 'aspirin', 'ticagrelor', 'clopidogrel', 'heparin_therapeutic', 'enoxaparin', 'vasopressor', 'coronary_reperfusion'], keyInterventions: ['oxygen', 'vasopressor', 'aspirin', 'heparin_therapeutic'],
  clinicalPolicy: {
   trajectory: trajectory([-.1, 8, 3, -10, -5, -3], [-.1, 10, 4, -14, -7, -4]),
   responses: [response(['vasopressor'], 2, 12, [0, 2, -1, 18, 9, 0]), response(['coronary_reperfusion'], 5, 30, [0, -18, -6, 18, 9, 5]), response(['intubation'], 3, 15, [0, -6, -8, -5, -3, 9])],
   closure: {requiredExams: ['heart:auscultation', 'lungs:auscultation'], destinations: ['procedimiento', 'uti'], treatment: acsTreatment(['vasopressor', 'oxygen']).concat(acsTreatment(['vasopressor', 'intubation'])), requiredStudies: ['g_card10_ecg'], study: [['g_card10_ecg']], consult: {procedimiento: ['cardiologia'], uti: ['uti']}, summary: 'Shock cardiogénico por IAM: soporte de perfusión y oxigenación confirmados, receptor en hemodinamia/UTI aceptado para revascularización urgente del vaso culpable. El vasopresor es un puente; ni traslado ni mejoría transitoria de TA demuestran reperfusión o resolución del shock.'},
   eligibility: {aspirin: noBleeding, ticagrelor: noBleeding, clopidogrel: noBleeding, heparin_therapeutic: noBleeding, enoxaparin: noBleeding, coronary_reperfusion: {requiredStudies: ['g_card10_ecg']}, nitroglycerin: {excludeTraits: ['cardiogenicShock'], bpLimit: {min: 90}}, metoprolol: {excludeTraits: ['cardiogenicShock']}, esmolol: {excludeTraits: ['cardiogenicShock']}, niv: {excludeTraits: ['cardiogenicShock']}},
   traits: ['coronaryIschemia', 'coronaryOcclusion', 'cardiogenicShock', 'hypoperfusion', 'congestion'], definitiveInterventions: ['coronary_reperfusion'], doNotDelay: {coronary_reperfusion: ['g_card10_labs', 'g_card10_echo']},
   cautions: ['No atribuir beneficio genérico a cristaloides: congestión y fallo de VI. Evitar nitratos y betabloqueo con shock. Intubación si falla oxigenación/protección de vía aérea, anticipando deterioro de TA; norepinefrina titulada y vigilancia continua.'],
   complications: [complication('card10-refractory-shock', .3, 15, [0, 10, 4, -18, -10, -4], ['coronary_reperfusion', 'vasopressor'], 'Hipoperfusión refractaria con lactato elevado: requiere revascularización y soporte de perfusión, no volumen rutinario.', {requiredState: {sys: {lt: 90}}, recoveryMinutes: 25}), hypoperfusionKidneyComplication('card10', ['vasopressor', 'coronary_reperfusion'])]
  }
 }
];

export const cardiologyPack = {
 schemaVersion: 1, packId: 'atria-cardiology', version: '1.0.0',
 cases: cardiologyCaseDefinitions.map(defineClinicalCase)
};
