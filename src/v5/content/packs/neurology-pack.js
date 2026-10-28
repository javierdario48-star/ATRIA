import {defineClinicalCase} from '../clinical-case-definition.js';
import {hypoperfusionKidneyComplication} from './common-complications.js';

// Clinical content only. All trajectories, eligibility checks, administrations,
// study timing, examinations and handoffs run through the shared V5 owners.
const examBase = {
 appearance: 'Evaluación inicial en camilla con monitorización continua.', skin: 'Piel sin lesiones purpúricas ni sangrado externo.',
 inspection: 'Abdomen no distendido.', palpation: 'Abdomen blando, sin dolor ni defensa.',
 percussion: 'Timpanismo conservado.', bowel: 'Ruidos intestinales presentes.',
 heart: 'Ruidos cardíacos regulares, sin soplos.', lungs: 'Murmullo vesicular bilateral sin crepitantes.'
};
const study = (id, label, aliases, type, delay, result, extra = {}) => ({id, label, aliases, type, delay, result, ...extra});
const airwayComplication = (prefix, probability = 0.2, minMinute = 30) => ({
 id: `${prefix}_aspiration`, progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1',
 probability, minMinute, rationale: 'Déficit neurológico o bulbar con pérdida de protección de la vía aérea.',
 offsets: [0.1, 15, 8, -10, -5, -12], riseMinutes: 15, rescueAllOf: ['intubation'], recoveryMinutes: 15,
 manifestation: 'Empeora la protección de vía aérea y desciende la saturación; requiere evaluación y soporte ventilatorio.'
});

export const neurologyCaseDefinitions = [
 {
  id: 'NEUR-01', specialty: 'Neurología', title: 'ACV isquémico con déficit discapacitante en ventana de trombólisis', difficulty: 4,
  chief: 'Debilidad súbita del hemicuerpo derecho y dificultad para expresarse.',
  opening: 'Familiar: Hace poco hablaba normalmente; de golpe no pudo decir las palabras ni mover bien el brazo derecho.', ageRange: [58, 68],
  variation: {backgroundHistory: [
   {"id": "esguince-remoto", "history": {"pmh": "Hipertensión y dislipidemia. Sin ACV previo, hemorragia intracraneal, cirugía intracraneal reciente ni traumatismo craneal grave. Hace cinco años tuve un esguince de tobillo; me recuperé por completo y no tenía limitaciones para caminar."}},
   {"id": "catarata-operada", "history": {"pmh": "Hipertensión y dislipidemia. Sin ACV previo, hemorragia intracraneal, cirugía intracraneal reciente ni traumatismo craneal grave. Me operaron una catarata hace seis años, con buena recuperación visual; no hubo ninguna cirugía reciente."}}
  ]},
  history: {
   onset: 'Última vez sin déficit hace 80 minutos, presenciada por familiar; inicio brusco. No es un ACV al despertar.',
   pmh: 'Hipertensión y dislipidemia. Sin ACV previo, hemorragia intracraneal, cirugía intracraneal reciente ni traumatismo craneal grave.',
   meds: 'Losartán y atorvastatina. No toma warfarina, heparina, anticoagulantes directos ni antiagregantes.',
   allergies: 'No se conocen alergias medicamentosas.',
   risk: 'Independiente previamente, mRS basal 0. Niega sangrado activo, cirugía mayor reciente o punción arterial no compresible.',
   associated: 'Sin cefalea en trueno, convulsión, dolor torácico ni hipoglucemia conocida.',
   function: 'El déficit de lenguaje y la paresia impiden la actividad habitual y persisten desde el inicio.'
  },
  vitals: {temp: 36.7, hr: 92, rr: 20, bp: '174/96', spo2: 96},
  examFindings: {...examBase, neuro: 'Alerta, comprende órdenes simples. Afasia expresiva, paresia facial central derecha y hemiparesia derecha de predominio braquial. NIHSS 8. Sin meningismo.',
   neurology: {eye: 4, verbal: 4, motor: 6, nihss: 8, pupils: 'Isocóricas y reactivas', language: 'Afasia expresiva', strength: 'Brazo derecho 2/5, pierna derecha 3/5; lado izquierdo 5/5', sensation: 'Hipoestesia derecha', gait: 'No evaluar de pie en fase aguda'}} ,
  studies: [
   study('g_neur01_glucose', 'Glucemia capilar urgente', ['glucemia', 'glucosa capilar', 'hgt'], 'lab', 5, 'Glucemia capilar 114 mg/dL; no explica el déficit focal.'),
   study('g_neur01_ct', 'TC de cerebro sin contraste urgente', ['tc cerebro', 'tac cerebro', 'tc craneo sin contraste', 'tomografia cerebral'], 'imaging', 6, 'Sin hemorragia intracraneal ni lesión expansiva; cambios isquémicos precoces mínimos, ASPECTS 9.'),
   study('g_neur01_cta', 'Angio-TC de cabeza y cuello', ['angio tc cerebral', 'angiotc cabeza cuello', 'angio tac'], 'imaging', 10, 'Sin oclusión proximal de gran vaso tratable. No hay disección cervical.'),
   study('g_neur01_labs', 'Hemograma, coagulación, electrolitos y creatinina', ['hemograma coagulograma', 'laboratorio acv', 'plaquetas inr'], 'lab', 12, 'Plaquetas 224.000/µL, INR 1,0, aPTT 29 s, Na 139 mmol/L, creatinina 0,9 mg/dL. Sin contraindicación hematológica identificada.'),
   study('g_neur01_ecg', 'ECG de 12 derivaciones', ['ecg', 'electrocardiograma'], 'procedure', 5, 'Ritmo sinusal, sin isquemia aguda. Se indica monitorización para fibrilación auricular paroxística.')
  ],
  dx: ['acv isquemico agudo', 'accidente cerebrovascular isquemico', 'ictus isquemico', 'acv isquémico'],
  differential: ['Hemorragia intracraneal', 'Hipoglucemia con déficit focal', 'Parálisis de Todd', 'Migraña con aura'],
  requiredHistory: ['onset', 'meds', 'risk', 'allergies'], keyStudies: ['g_neur01_glucose', 'g_neur01_ct'],
  interventionIds: ['iv', 'alteplase_stroke', 'stroke_prevention', 'nicardipine', 'intubation'], keyInterventions: ['alteplase_stroke', 'stroke_prevention'],
  clinicalPolicy: {
   trajectory: {early: [0, 3, 1, 3, 2, 0], late: [0.2, 7, 3, 8, 4, -2], earlyEnd: 12, lateEnd: 60, fluidResponse: 0},
   responses: [{allOf: ['alteplase_stroke'], delay: 15, peak: 60, offsets: [0, -4, -1, 0, 0, 0]}],
   eligibility: {alteplase_stroke: {requiredStudies: ['g_neur01_glucose', 'g_neur01_ct'], requiresHistory: ['onset', 'meds', 'risk'],
    excludeTraits: ['intracranialBleed', 'activeBleeding', 'recentIntracranialSurgery', 'therapeuticAnticoagulation'], requiresNoIntracranialBleed: true,
    onsetMinutes: 80, onsetLimitMinutes: 270, bpLimit: {sys: 185, dia: 110}, minimumPlatelets: 100000, maximumINR: 1.7, disablingDeficit: true}},
   closure: {destinations: ['sala', 'uti'], treatment: [['alteplase_stroke', 'stroke_prevention']], requiredStudies: ['g_neur01_glucose', 'g_neur01_ct'],
    study: [], requiredExams: ['neurological:all'], consult: {sala: ['neurology'], uti: ['uti']},
    summary: 'Reperfusión IV confirmada y traslado a unidad ACV aceptado, con vigilancia tensional y neurológica. No se presume desaparición inmediata de la afasia o hemiparesia.'},
   traits: ['stroke', 'ischemicStroke'], onsetMinutes: 80, lastKnownWellMinutes: 80,
   neurologyBaseline: {eye: 4, verbal: 4, motor: 6, nihss: 8, focalDeficit: 'Afasia expresiva y hemiparesia derecha', preserveFocalDeficit: true},
   doNotDelayTreatmentFor: ['g_neur01_cta', 'g_neur01_ecg', 'g_neur01_labs'],
   treatmentNotes: 'Excluir hemorragia y glucemia anormal; verificar inicio, anticoagulantes y contraindicaciones. La coagulación no debe retrasar IVT si no hay sospecha de coagulopatía. Mantener TA <180/105 después de IVT; no antiagregantes/anticoagulantes las primeras 24 h y hasta imagen de control.',
   complications: [airwayComplication('neur01', 0.12, 35)]
  }
 },
 {
  id: 'NEUR-02', specialty: 'Neurología', title: 'ACV de gran vaso en ventana extendida seleccionado por imagen', difficulty: 5,
  chief: 'Hemiplejía izquierda y desviación de la mirada de ocho horas de evolución.',
  opening: 'Familiar: Lo vi normal hace ocho horas; ahora ignora todo lo que pasa a su izquierda.', ageRange: [64, 74],
  variation: {backgroundHistory: [
   {"id": "presbicia", "history": {"pmh": "Hipertensión, diabetes tipo 2. Previamente independiente, mRS 1. Sin demencia avanzada ni hemorragia intracraneal. Uso anteojos para leer por presbicia, sin pérdida visual reciente ni otra limitación funcional por ese antecedente."}},
   {"id": "fractura-consolidada", "history": {"pmh": "Hipertensión, diabetes tipo 2. Previamente independiente, mRS 1. Sin demencia avanzada ni hemorragia intracraneal. Tuve una fractura de húmero hace doce años; consolidó sin limitación residual de fuerza o movilidad."}}
  ]},
  history: {
   onset: 'Última vez sin síntomas hace 480 minutos, presenciada. El déficit comenzó entonces; no hubo mejoría posterior.',
   pmh: 'Hipertensión, diabetes tipo 2. Previamente independiente, mRS 1. Sin demencia avanzada ni hemorragia intracraneal.',
   meds: 'Amlodipino y metformina. No anticoagulantes ni antiagregantes.', allergies: 'Sin alergias conocidas.',
   risk: 'Déficit discapacitante persistente. No sangrado activo ni cirugía reciente; función basal compatible con tratamiento de reperfusión.',
   associated: 'Sin convulsión inicial ni cefalea en trueno.', function: 'No puede sostener el brazo o la pierna izquierdos, caminar ni atender al hemiespacio izquierdo.'
  },
  vitals: {temp: 36.8, hr: 96, rr: 21, bp: '168/92', spo2: 95},
  examFindings: {...examBase, neuro: 'Desviación conjugada a derecha, hemiplejía izquierda, hemianopsia e inatención izquierda; NIHSS 16. Alerta, sigue órdenes con el lado derecho.',
   neurology: {eye: 4, verbal: 5, motor: 6, nihss: 16, pupils: 'Isocóricas y reactivas', gaze: 'Preferencia a derecha', strength: 'Miembros izquierdos 0/5; derechos 5/5', neglect: 'Heminegligencia izquierda'}} ,
  studies: [
   study('g_neur02_glucose', 'Glucemia capilar', ['glucemia', 'hgt'], 'lab', 5, 'Glucemia 158 mg/dL.'),
   study('g_neur02_ct', 'TC de cerebro sin contraste', ['tc cerebro', 'tac craneo', 'tomografia cerebral'], 'imaging', 6, 'Sin hemorragia. Isquemia precoz derecha con ASPECTS 8, sin edema significativo ni efecto de masa.'),
   study('g_neur02_cta', 'Angio-TC de cabeza y cuello', ['angio tc cerebral', 'angio tac', 'angiotc'], 'imaging', 10, 'Oclusión del segmento M1 de arteria cerebral media derecha.'),
   study('g_neur02_perfusion', 'Perfusión cerebral por TC o RM', ['perfusion cerebral', 'tc perfusion', 'rm perfusion'], 'imaging', 15, 'Núcleo isquémico estimado 18 mL; tejido hipoperfundido 96 mL, mismatch 78 mL y razón 5,3. Perfil favorable para selección de trombectomía en ventana extendida.'),
   study('g_neur02_labs', 'Hemograma, coagulación y función renal', ['laboratorio acv', 'hemograma coagulograma'], 'lab', 12, 'Hb 13,8 g/dL, plaquetas 216.000/µL, INR 1,0, creatinina 1,0 mg/dL.')
  ],
  dx: ['acv isquemico de gran vaso', 'acv isquemico ventana extendida', 'oclusion m1 derecha', 'ictus isquemico'],
  differential: ['Hemorragia intracraneal', 'Crisis focal con parálisis de Todd', 'Hipoglucemia', 'Lesión expansiva cerebral'],
  requiredHistory: ['onset', 'meds', 'risk', 'allergies'], keyStudies: ['g_neur02_ct', 'g_neur02_cta', 'g_neur02_perfusion'],
  interventionIds: ['iv', 'thrombectomy', 'stroke_prevention', 'nicardipine', 'intubation'], keyInterventions: ['stroke_prevention'],
  clinicalPolicy: {
   trajectory: {early: [0, 4, 1, 4, 2, -1], late: [0.2, 10, 4, 10, 6, -3], earlyEnd: 12, lateEnd: 60, fluidResponse: 0},
   responses: [{allOf: ['thrombectomy'], delay: 20, peak: 90, offsets: [0, -5, -2, 0, 0, 0]}],
   eligibility: {thrombectomy: {requiredStudies: ['g_neur02_ct', 'g_neur02_cta', 'g_neur02_perfusion'], requiresHistory: ['onset', 'risk'],
    excludeTraits: ['intracranialBleed'], requiresNoIntracranialBleed: true, requiresLargeVesselOcclusion: true,
    requiresFavorablePerfusion: true, onsetMinutes: 480, onsetLimitMinutes: 1440, baselineMRS: 1, nihss: 16}},
   closure: {destinations: ['procedimiento', 'uti'], treatment: [['stroke_prevention']], requiredStudies: ['g_neur02_ct', 'g_neur02_cta', 'g_neur02_perfusion'], study: [],
    requiredExams: ['neurological:all'], consult: {procedimiento: ['neurology'], uti: ['uti', 'neurology']}, definitiveTreatmentIds: ['thrombectomy'],
    summary: 'Traslado urgente aceptado por unidad ACV/neurointervencionismo para reperfusión endovascular. No se presume trombectomía realizada ni recuperación del déficit por aceptar el traslado.'},
   traits: ['stroke', 'ischemicStroke', 'largeVesselOcclusion'], onsetMinutes: 480, lastKnownWellMinutes: 480,
   neurologyBaseline: {eye: 4, verbal: 5, motor: 6, nihss: 16, focalDeficit: 'Hemiplejía, hemianopsia e inatención izquierdas', preserveFocalDeficit: true},
   treatmentNotes: 'Fuera de ventana estándar de IVT no significa ausencia de opción de reperfusión. Este caso selecciona EVT por gran vaso y perfusión; la IVT tardía requiere sus propios criterios avanzados y equipo ACV, no una orden inespecífica de alteplasa.',
   complications: [airwayComplication('neur02', 0.18, 30)]
  }
 },
 {
  id: 'NEUR-03', specialty: 'Neurología', title: 'AIT de alto riesgo con déficit resuelto', difficulty: 3,
  chief: 'Episodio transitorio de debilidad derecha y dificultad para hablar.',
  opening: 'Durante media hora no pude hablar bien y se me cayó el brazo derecho; ahora volvió a la normalidad.', ageRange: [62, 72],
  variation: {backgroundHistory: [
   {"id": "hernia-remota", "history": {"pmh": "Hipertensión y diabetes tipo 2; sin fibrilación auricular conocida, hemorragia digestiva reciente o ACV previo. Me operaron una hernia inguinal hace quince años, sin complicaciones; no hubo operaciones ni sangrado recientes."}},
   {"id": "fractura-muneca-remota", "history": {"pmh": "Hipertensión y diabetes tipo 2; sin fibrilación auricular conocida, hemorragia digestiva reciente o ACV previo. Tuve una fractura de muñeca hace diez años, ya consolidada y sin limitaciones de fuerza ni medicación por eso."}}
  ]},
  history: {
   onset: 'Episodio brusco hace 2 horas, duró 35 minutos y se resolvió por completo antes de llegar.',
   pmh: 'Hipertensión y diabetes tipo 2; sin fibrilación auricular conocida, hemorragia digestiva reciente o ACV previo.',
   meds: 'Losartán y metformina. No antiagregantes ni anticoagulantes.', allergies: 'Sin alergia conocida a aspirina o clopidogrel.',
   risk: 'ABCD2 6: edad ≥60, TA elevada, debilidad unilateral, duración 10–59 min y diabetes. No sangrado activo.',
   associated: 'No pérdida de conciencia, sacudidas, cefalea ni síntomas positivos visuales previos.',
   function: 'Actualmente habla y mueve ambas mitades del cuerpo como antes del episodio.'
  },
  vitals: {temp: 36.6, hr: 82, rr: 17, bp: '158/88', spo2: 97},
  examFindings: {...examBase, neuro: 'Alerta y orientado. Lenguaje, campos visuales, fuerza, sensibilidad y coordinación conservados. NIHSS 0. No atribuir déficit persistente por el solo antecedente de AIT.',
   neurology: {eye: 4, verbal: 5, motor: 6, nihss: 0, strength: '5/5 en cuatro miembros', language: 'Sin afasia', gait: 'Sin ataxia'}} ,
  studies: [
   study('g_neur03_glucose', 'Glucemia capilar', ['glucemia', 'hgt'], 'lab', 5, 'Glucemia 142 mg/dL.'),
   study('g_neur03_ct', 'TC de cerebro sin contraste', ['tc cerebro', 'tac cerebro', 'tomografia cerebral'], 'imaging', 6, 'Sin hemorragia ni lesión expansiva.'),
   study('g_neur03_mri', 'RM de cerebro con difusión', ['rm cerebro difusion', 'resonancia cerebral', 'dwi'], 'imaging', 25, 'Sin restricción aguda en difusión; no se demuestra infarto establecido.'),
   study('g_neur03_vascular', 'Estudio vascular de cabeza y cuello', ['angio tc cabeza cuello', 'doppler carotideo', 'angiotc'], 'imaging', 15, 'Placas carotídeas leves, sin estenosis de alto grado ni oclusión intracraneal.'),
   study('g_neur03_ecg', 'ECG y monitorización cardíaca inicial', ['ecg', 'electrocardiograma', 'telemetria'], 'procedure', 5, 'Ritmo sinusal. Sin fibrilación auricular en el registro inicial; requiere monitorización posterior.'),
   study('g_neur03_labs', 'Hemograma, coagulación y función renal', ['laboratorio ait', 'hemograma coagulograma'], 'lab', 12, 'Hb 13,5 g/dL, plaquetas 238.000/µL, INR 1,0, creatinina 0,8 mg/dL.')
  ],
  dx: ['ataque isquemico transitorio', 'ait de alto riesgo', 'ait', 'tia'],
  differential: ['Crisis focal', 'Hipoglucemia', 'Migraña con aura', 'Infarto cerebral menor'],
  requiredHistory: ['onset', 'meds', 'risk', 'allergies'], keyStudies: ['g_neur03_ct', 'g_neur03_vascular', 'g_neur03_ecg'],
  interventionIds: ['swallow_screen', 'aspirin', 'clopidogrel', 'stroke_prevention'], keyInterventions: ['aspirin', 'clopidogrel', 'stroke_prevention'],
  clinicalPolicy: {
   trajectory: {early: [0, 0, 0, 0, 0, 0], late: [0, 2, 0, 2, 1, 0], earlyEnd: 12, lateEnd: 60, fluidResponse: 0}, responses: [],
   eligibility: {aspirin: {requiredStudies: ['g_neur03_ct'], requiresNoIntracranialBleed: true, requiresSafeSwallowOrEnteralTube: true, excludeTraits: ['activeBleeding', 'intracranialBleed'], afterThrombolysisMinutes: 1440},
    clopidogrel: {requiredStudies: ['g_neur03_ct'], requiresNoIntracranialBleed: true, requiresSafeSwallowOrEnteralTube: true, excludeTraits: ['activeBleeding', 'intracranialBleed'], afterThrombolysisMinutes: 1440}},
   regimens: {swallow_screen: {safe: true}, aspirin: {dose: {amount: 160, unit: 'mg', display: 'Aspirina 160 mg oral inicial, luego 81–100 mg/día'}, route: 'oral', intervalMinutes: 1440},
    clopidogrel: {dose: {amount: 300, unit: 'mg', display: 'Clopidogrel 300 mg oral de carga, luego 75 mg/día'}, route: 'oral', intervalMinutes: 1440}},
   closure: {destinations: ['observacion', 'sala'], treatment: [['aspirin', 'clopidogrel', 'stroke_prevention']], requiredStudies: ['g_neur03_ct', 'g_neur03_vascular', 'g_neur03_ecg'], study: [],
    requiredExams: ['neurological:all'], consult: {observacion: ['neurology'], sala: ['neurology']},
    summary: 'AIT de alto riesgo con déficit resuelto: observación/internación para estudio urgente y prevención secundaria. Doble antiagregación breve por 21 días, luego monoterapia según etiología; no alta sin circuito rápido garantizado.'},
   traits: ['stroke', 'highRiskTIA'], neurologyBaseline: {eye: 4, verbal: 5, motor: 6, nihss: 0, focalDeficit: 'Ninguno en la evaluación actual'},
   treatmentNotes: 'DAPT temprana corresponde a este AIT de alto riesgo no cardioembólico y sin sangrado; no extrapolar a hemorragia ni a ACV extenso. Evaluar etiología y estatina de alta intensidad; si se identifica FA, reconsiderar anticoagulación y evitar combinación innecesaria.',
   complications: []
  }
 },
 {
  id: 'NEUR-04', specialty: 'Neurología', title: 'Hemorragia intracerebral hipertensiva asociada a warfarina', difficulty: 5,
  chief: 'Cefalea, vómitos y debilidad izquierda súbita.', opening: 'Familiar: Se quejó de un dolor de cabeza fuerte y después no pudo mover el lado izquierdo.', ageRange: [66, 76],
  variation: {backgroundHistory: [
   {"id": "catarata-remota", "history": {"pmh": "Hipertensión mal controlada y fibrilación auricular. Sin traumatismo reciente. Me operaron una catarata hace siete años, sin complicaciones; no hubo cirugía ni traumatismo recientes."}},
   {"id": "esguince-antiguo", "history": {"pmh": "Hipertensión mal controlada y fibrilación auricular. Sin traumatismo reciente. Tuve un esguince de tobillo hace seis años, completamente resuelto; no hubo una caída ni un golpe reciente."}}
  ]},
  history: {
   onset: 'Inicio súbito hace 45 minutos con cefalea, vómitos y hemiparesia; somnolencia progresiva.',
   pmh: 'Hipertensión mal controlada y fibrilación auricular. Sin traumatismo reciente.',
   meds: 'Warfarina, última dosis anoche; losartán tomado irregularmente. No antiagregantes.', allergies: 'Sin alergias conocidas; sin antecedente de trombocitopenia inducida por heparina.',
   risk: 'Control de INR irregular. No toma anticoagulantes directos. Hemorragia intracraneal y riesgo de expansión del hematoma.',
   associated: 'Dos vómitos, sin convulsión presenciada.', function: 'Antes del episodio era independiente.'
  },
  vitals: {temp: 36.8, hr: 86, rr: 22, bp: '212/112', spo2: 94},
  examFindings: {...examBase, appearance: 'Somnoliento, despierta al llamado.', heart: 'Ritmo irregular compatible con fibrilación auricular.',
   neuro: 'Glasgow 13 (E3 V4 M6). Hemiparesia izquierda 2/5 y disartria. Pupilas simétricas reactivas, sin rigidez de nuca.',
   neurology: {eye: 3, verbal: 4, motor: 6, pupils: '3 mm, reactivas', strength: 'Hemicuerpo izquierdo 2/5, derecho 5/5', language: 'Disartria sin afasia'}} ,
  studies: [
   study('g_neur04_ct', 'TC de cerebro sin contraste urgente', ['tc cerebro', 'tac cerebro', 'tomografia cerebral'], 'imaging', 6, 'Hematoma putaminal derecho de aproximadamente 24 mL, sin hidrocefalia ni herniación. Mínima extensión intraventricular.'),
   study('g_neur04_inr', 'Coagulograma urgente e INR', ['inr', 'coagulograma', 'coagulacion'], 'lab', 5, 'INR 3,2 por warfarina; aPTT 38 s.'),
   study('g_neur04_labs', 'Hemograma, glucemia y función renal', ['hemograma', 'laboratorio hemorragia', 'glucemia creatinina'], 'lab', 10, 'Hb 13,0 g/dL, plaquetas 205.000/µL, glucemia 132 mg/dL, creatinina 0,9 mg/dL.'),
   study('g_neur04_repeat_ct', 'TC de control por hematoma intracerebral', ['tc control hematoma', 'repetir tomografia'], 'imaging', 25, 'Reevaluación de volumen del hematoma y extensión ventricular. El informe seriado debe interpretarse con la evolución clínica y el tratamiento confirmado.', {repeatable: true, dynamic: 'intracranial-bleed-followup'})
  ],
  dx: ['hemorragia intracerebral', 'acv hemorragico', 'hematoma intraparenquimatoso', 'hemorragia hipertensiva asociada a warfarina'],
  differential: ['ACV isquémico', 'Hemorragia subaracnoidea', 'Lesión tumoral hemorrágica', 'Hematoma traumático'],
  requiredHistory: ['onset', 'meds', 'risk', 'allergies'], keyStudies: ['g_neur04_ct', 'g_neur04_inr'],
  interventionIds: ['iv', 'nicardipine', 'anticoagulation_reversal', 'intubation'], keyInterventions: ['nicardipine', 'anticoagulation_reversal'],
  clinicalPolicy: {
   trajectory: {early: [0, 4, 2, 6, 3, -1], late: [0.2, -6, 5, 14, 6, -5], earlyEnd: 12, lateEnd: 60, fluidResponse: 0},
   responses: [{allOf: ['nicardipine'], delay: 5, peak: 25, offsets: [0, 2, 0, -70, -25, 0]},
    {allOf: ['anticoagulation_reversal'], delay: 10, peak: 30, offsets: [0, 0, 0, 0, 0, 0]}],
   eligibility: {anticoagulation_reversal: {requiredStudies: ['g_neur04_ct', 'g_neur04_inr'], requiresHistory: ['meds'], anticoagulant: 'warfarin'}},
   closure: {destinations: ['uti'], treatment: [['nicardipine', 'anticoagulation_reversal']], requiredStudies: ['g_neur04_ct', 'g_neur04_inr'], study: [],
    requiredExams: ['neurological:all'], consult: {uti: ['uti', 'neurosurgery']},
    summary: 'UTI/neurocirugía acepta el traslado tras control tensional continuo y reversión de warfarina. Hemiparesia y hematoma requieren vigilancia e imagen seriada; reversión no equivale a reabsorción del hematoma.'},
   traits: ['stroke', 'intracranialBleed', 'bleedingRisk', 'warfarinExposure'],
   bloodPressureTarget: {sys: [130, 150], avoidSysBelow: 130, approach: 'Descenso suave, sostenido y titulado; objetivo cercano a 140 en HIC de gravedad leve/moderada.'},
   neurologyBaseline: {eye: 3, verbal: 4, motor: 6, focalDeficit: 'Hemiparesia izquierda y disartria', preserveFocalDeficit: true},
   treatmentNotes: 'Suspender warfarina. 4F-PCC según INR/peso más vitamina K IV inmediata, repetir INR. No trombólisis, antiagregación ni anticoagulación terapéutica. La necesidad de intervención neuroquirúrgica depende de anatomía y evolución.',
   complications: [{id: 'neur04_expansion', progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability: 0.25, minMinute: 20,
    rationale: 'Anticoagulación y presión arterial elevada aumentan el riesgo de expansión del hematoma.', offsets: [0, -8, 5, 18, 8, -4], riseMinutes: 20,
    rescueAllOf: ['nicardipine', 'anticoagulation_reversal'], recoveryMinutes: 30, neurology: {eye: 2, verbal: 3, motor: 5},
    manifestation: 'Mayor somnolencia y focalidad; reevaluar vía aérea, TA, INR e imagen urgente. El control causal limita la progresión y no garantiza reversión del daño.'}]
  }
 },
 {
  id: 'NEUR-05', specialty: 'Neurología', title: 'Hemorragia subaracnoidea por aneurisma roto', difficulty: 5,
  chief: 'Cefalea en trueno, vómitos y rigidez de nuca.', opening: 'Fue el peor dolor de cabeza de mi vida; llegó al máximo en segundos.', ageRange: [44, 56],
  variation: {backgroundHistory: [
   {"id": "fractura-antigua", "history": {"pmh": "Hipertensión y tabaquismo. No cefalea de esta intensidad ni traumatismo previo. Tuve una fractura de radio hace más de diez años, completamente consolidada; no hubo golpe ni traumatismo reciente."}},
   {"id": "miopia-corregida", "history": {"pmh": "Hipertensión y tabaquismo. No cefalea de esta intensidad ni traumatismo previo. Uso anteojos por miopía desde joven, con visión habitual corregida y sin tratamiento sistémico por ese antecedente."}}
  ]},
  history: {
   onset: 'Cefalea explosiva durante esfuerzo hace 50 minutos, con pico inmediato y vómitos.',
   pmh: 'Hipertensión y tabaquismo. No cefalea de esta intensidad ni traumatismo previo.', meds: 'Amlodipino. No antiagregantes ni anticoagulantes.', allergies: 'Sin alergias conocidas.',
   risk: 'Cefalea centinela no reconocida días antes. Antecedente familiar de aneurisma cerebral.',
   associated: 'Fotofobia y cervicalgia; no convulsión presenciada.', function: 'Estaba independiente antes del inicio.'
  },
  vitals: {temp: 37.1, hr: 102, rr: 22, bp: '172/94', spo2: 96},
  examFindings: {...examBase, appearance: 'Dolor intenso y fotofobia; despierto, responde adecuadamente.',
   neuro: 'Glasgow 15, rigidez de nuca, sin paresia focal. Pupilas reactivas. No hay compromiso actual de la vía aérea.',
   neurology: {eye: 4, verbal: 5, motor: 6, pupils: 'Isocóricas reactivas', meningism: 'Rigidez de nuca', strength: '5/5 en cuatro miembros'}} ,
  studies: [
   study('g_neur05_ct', 'TC de cerebro sin contraste urgente', ['tc cerebro', 'tac cerebro', 'tomografia cerebral'], 'imaging', 6, 'Sangre en cisternas basales y cisura interhemisférica, compatible con HSA. Sin hidrocefalia aguda.'),
   study('g_neur05_cta', 'Angio-TC cerebral', ['angio tc cerebral', 'angio tac', 'angiotc aneurisma'], 'imaging', 10, 'Aneurisma sacular de comunicante anterior de 6 mm, probable fuente del sangrado.'),
   study('g_neur05_labs', 'Hemograma, coagulación, electrolitos y función renal', ['laboratorio hsa', 'hemograma coagulograma', 'sodio'], 'lab', 12, 'Hb 13,4 g/dL, plaquetas 250.000/µL, INR 1,0, Na 138 mmol/L, creatinina 0,8 mg/dL.'),
   study('g_neur05_ecg', 'ECG de 12 derivaciones', ['ecg', 'electrocardiograma'], 'procedure', 5, 'Taquicardia sinusal; sin elevación regional del ST.')
  ],
  dx: ['hemorragia subaracnoidea aneurismatica', 'hsa aneurismatica', 'hsa', 'aneurisma cerebral roto'],
  differential: ['Disección arterial cervical', 'Síndrome de vasoconstricción cerebral reversible', 'Meningitis', 'Migraña de inicio atípico'],
  requiredHistory: ['onset', 'meds', 'risk', 'allergies'], keyStudies: ['g_neur05_ct', 'g_neur05_cta'],
  interventionIds: ['iv', 'swallow_screen', 'nimodipine', 'nicardipine', 'aneurysm_control', 'intubation'], keyInterventions: ['nimodipine'],
  clinicalPolicy: {
   trajectory: {early: [0.1, 4, 1, 4, 2, 0], late: [0.3, 12, 5, 10, 5, -4], earlyEnd: 12, lateEnd: 60, fluidResponse: 0},
   responses: [{allOf: ['nicardipine'], delay: 5, peak: 20, offsets: [0, 0, 0, -22, -10, 0]}],
   regimens: {swallow_screen: {safe: true}},
   eligibility: {aneurysm_control: {requiredStudies: ['g_neur05_ct', 'g_neur05_cta'], requiresConfirmedAneurysm: true},
    nimodipine: {requiredStudies: ['g_neur05_ct'], enteralOnly: true, requiresSafeSwallowOrEnteralTube: true}},
   closure: {destinations: ['uti', 'procedimiento', 'quirofano'], treatment: [['nimodipine']], requiredStudies: ['g_neur05_ct', 'g_neur05_cta'], study: [],
    requiredExams: ['neurological:all'], consult: {uti: ['uti', 'neurosurgery'], procedimiento: ['neurosurgery'], quirofano: ['neurosurgery']}, definitiveTreatmentIds: ['aneurysm_control'],
    summary: 'Neurocirugía/neurointervencionismo acepta traslado urgente para asegurar el aneurisma; nimodipino enteral y estabilización iniciados. No se presume embolización o clipado por aceptar la derivación.'},
   traits: ['stroke', 'intracranialBleed', 'bleedingRisk', 'subarachnoidHemorrhage'],
   neurologyBaseline: {eye: 4, verbal: 5, motor: 6, focalDeficit: 'Sin déficit motor focal inicial', preserveFocalDeficit: true},
   treatmentNotes: 'Evitar hipotensión e hipertensión marcada con titulación; no hay un objetivo universal único previo al control aneurismático. Mantener euvolemia, evitar hipervolemia profiláctica. Nimodipino previene isquemia tardía, no resangrado. TC positiva: no exigir punción lumbar ni retrasar control de aneurisma.',
   complications: [{id: 'neur05_rebleed', progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability: 0.18, minMinute: 40,
    rationale: 'Aneurisma roto no asegurado con riesgo de resangrado precoz.', offsets: [0, 20, 8, -30, -15, -8], riseMinutes: 10,
    rescueAllOf: ['aneurysm_control'], recoveryMinutes: 30, neurology: {eye: 2, verbal: 3, motor: 5},
    manifestation: 'Nueva cefalea explosiva y deterioro de conciencia; activar neurocirugía, proteger vía aérea y reevaluar imagen. No atribuir control de resangrado al nimodipino.'}]
  }
 },
 {
  id: 'NEUR-06', specialty: 'Neurología', title: 'Estado epiléptico convulsivo con necesidad de segunda línea', difficulty: 4,
  chief: 'Convulsiones generalizadas persistentes sin recuperar conciencia.', opening: 'Familiar: Lleva más de diez minutos convulsionando y no volvió a despertarse entre los episodios.', ageRange: [24, 42],
  variation: {backgroundHistory: [
   {"id": "esguince-remoto", "history": {"pmh": "Epilepsia conocida; sin traumatismo ni infección reciente. No antecedente de alcoholismo. De adolescente tuve un esguince de tobillo, ya resuelto; antes de esta crisis no tenía limitaciones por eso."}},
   {"id": "dermatitis-infantil", "history": {"pmh": "Epilepsia conocida; sin traumatismo ni infección reciente. No antecedente de alcoholismo. De niño tuve dermatitis leve que desapareció; no uso corticoides ni medicación habitual por ese antecedente."}}
  ]},
  history: {
   onset: 'Crisis tónico-clónica de 12 minutos con episodios consecutivos y sin recuperación de conciencia.',
   pmh: 'Epilepsia conocida; sin traumatismo ni infección reciente. No antecedente de alcoholismo.',
   meds: 'Levetiracetam domiciliario suspendido por tres días por falta de medicación. No benzodiacepinas administradas antes de llegar.', allergies: 'Sin alergias conocidas.',
   risk: 'Crisis de más de 5 minutos: no esperar a 30 minutos para tratar. Riesgo de hipoxemia y lesión secundaria.',
   associated: 'Sin fiebre previa, embarazo conocido ni intoxicación referida.', function: 'Función neurológica habitual conservada entre crisis.'
  },
  vitals: {temp: 37.8, hr: 132, rr: 30, bp: '156/88', spo2: 88},
  examFindings: {...examBase, appearance: 'Actividad tónico-clónica generalizada, sin respuesta verbal durante la crisis.', lungs: 'Ventilación irregular durante la convulsión; secreciones orofaríngeas.',
   neuro: 'Convulsión activa, mirada fija y movimientos tónico-clónicos bilaterales; no evaluar fuerza voluntaria durante la crisis. Glasgow durante ictus no estima el estado basal.',
   neurology: {eye: 1, verbal: 1, motor: 4, seizureActive: true, pupils: 'Simétricas, evaluación limitada por actividad ictal', strength: 'No valorable durante convulsión'}} ,
  studies: [
   study('g_neur06_glucose', 'Glucemia capilar urgente', ['glucemia', 'hgt', 'glucosa capilar'], 'lab', 5, 'Glucemia 108 mg/dL; no requiere glucosa empírica por hipoglucemia.'),
   study('g_neur06_labs', 'Electrolitos, calcio, magnesio y función renal', ['ionograma', 'electrolitos calcio magnesio', 'laboratorio convulsiones'], 'lab', 12, 'Na 139 mmol/L, K 4,1 mmol/L, calcio 9,1 mg/dL, Mg 1,9 mg/dL, creatinina 0,8 mg/dL. Lactato 5,0 mmol/L posictal.'),
   study('g_neur06_eeg', 'EEG urgente/continuo', ['eeg', 'electroencefalograma', 'eeg continuo'], 'procedure', 15, 'Registro para detectar persistencia electrográfica, especialmente si no recupera conciencia tras cesar los movimientos.', {repeatable: true, dynamic: 'seizure-eeg'}),
   study('g_neur06_ct', 'TC cerebral después de estabilizar', ['tc cerebro', 'tac cerebro', 'tomografia cerebral'], 'imaging', 15, 'Sin hemorragia ni lesión expansiva aguda. No debe retrasar benzodiacepina ni segunda línea.')
  ],
  dx: ['estado epileptico convulsivo', 'estatus epileptico', 'status epilepticus', 'estado convulsivo'],
  differential: ['Hipoglucemia', 'Trastorno hidroelectrolítico', 'Hemorragia intracraneal', 'Intoxicación o abstinencia'],
  requiredHistory: ['onset', 'meds', 'pmh', 'allergies'], keyStudies: ['g_neur06_glucose', 'g_neur06_labs'],
  interventionIds: ['iv', 'oxygen', 'lorazepam', 'levetiracetam', 'intubation'], keyInterventions: ['lorazepam', 'levetiracetam'],
  clinicalPolicy: {
   trajectory: {early: [0.3, 10, 5, -5, -2, -5], late: [0.7, 18, -8, -24, -12, -12], earlyEnd: 12, lateEnd: 60, fluidResponse: 0.1},
   responses: [{allOf: ['lorazepam'], delay: 1, peak: 5, offsets: [0, -12, -4, -5, -3, 0]},
    {allOf: ['lorazepam', 'levetiracetam'], delay: 10, peak: 25, offsets: [-0.2, -18, -3, 0, 0, 2]}],
   closure: {destinations: ['uti'], treatment: [['lorazepam', 'levetiracetam']], requiredStudies: ['g_neur06_glucose', 'g_neur06_labs'], study: [],
    requiredExams: ['neurological:all'], consult: {uti: ['uti', 'neurology']}, urgentStudyBypass: true,
    summary: 'Tratamiento secuencial confirmado y UTI/neurología acepta traslado con monitorización respiratoria y EEG si no recupera conciencia. Cese motor no prueba ausencia de estado no convulsivo ni recuperación inmediata.'},
   traits: ['seizure', 'statusEpilepticus'],
   neurologyBaseline: {eye: 1, verbal: 1, motor: 4, seizureActive: true, focalDeficit: 'No valorable durante crisis', recoveryDelayMinutes: 30, mayRemainPostictal: true},
   observationResponses: [
    {allOf: ['lorazepam', 'levetiracetam'], delay: 2, peak: 10, neurology: {seizureActive: false, postictal: true}},
    {allOf: ['lorazepam', 'levetiracetam'], delay: 10, peak: 30, neurology: {eye: 3, verbal: 3, motor: 5}}
   ],
   doNotDelayTreatmentFor: ['g_neur06_glucose', 'g_neur06_labs', 'g_neur06_eeg', 'g_neur06_ct'],
   treatmentNotes: 'Soporte ABC y glucemia simultáneos a lorazepam; continuar con levetiracetam si persiste la crisis. Segunda línea no sustituye benzodiacepina inicial. Si refractario: intubación, anestesia y EEG continuo en UTI. Evitar dosis repetidas sin vigilancia respiratoria.',
   complications: [airwayComplication('neur06', 0.3, 12)]
  }
 },
 {
  id: 'NEUR-07', specialty: 'Neurología', title: 'Meningitis bacteriana grave en adulto mayor', difficulty: 5,
  chief: 'Fiebre, cefalea, rigidez de nuca y confusión.', opening: 'Familiar: Desde ayer tiene fiebre y dolor de cabeza; esta mañana empezó a confundirse.', ageRange: [62, 72],
  variation: {backgroundHistory: [
   {"id": "catarata-operada", "history": {"pmh": "Diabetes tipo 2. No esplenectomía ni derivación ventricular. Contexto comunitario no epidémico y resistencia neumocócica relevante en la región. Me operaron una catarata hace ocho años, sin complicaciones ni tratamiento sistémico por ese antecedente."}},
   {"id": "tendinitis-resuelta", "history": {"pmh": "Diabetes tipo 2. No esplenectomía ni derivación ventricular. Contexto comunitario no epidémico y resistencia neumocócica relevante en la región. Hace cinco años tuve tendinitis de hombro que mejoró con rehabilitación; no uso corticoides ni antiinflamatorios habituales."}}
  ]},
  history: {
   onset: 'Fiebre y cefalea progresiva de 18 horas, vómitos y confusión en las últimas 3 horas.',
   pmh: 'Diabetes tipo 2. No esplenectomía ni derivación ventricular. Contexto comunitario no epidémico y resistencia neumocócica relevante en la región.',
   meds: 'Metformina. No antibióticos previos, anticoagulantes ni inmunoterapia.', allergies: 'Niega reacción alérgica a penicilinas, cefalosporinas o vancomicina.',
   risk: 'Edad superior a 60 años, requiere cobertura empírica de Listeria además de neumococo resistente.',
   associated: 'Fotofobia y vómitos; sin rash purpúrico ni déficit focal previo.', function: 'Habitualmente lúcido e independiente; la confusión es un cambio clínico agudo.'
  },
  vitals: {temp: 39.2, hr: 120, rr: 26, bp: '108/66', spo2: 94},
  examFindings: {...examBase, appearance: 'Febril, confuso, con fotofobia.', skin: 'Sin púrpura ni lesiones vesiculares.',
   neuro: 'Glasgow 13 (E3 V4 M6), rigidez de nuca y fotofobia. Sin hemiparesia ni anisocoria. Confusión de causa infecciosa, independiente de la personalidad.',
   neurology: {eye: 3, verbal: 4, motor: 6, pupils: 'Isocóricas reactivas', meningism: 'Rigidez de nuca', strength: 'Mueve cuatro miembros a la orden'}} ,
  studies: [
   study('g_neur07_cultures', 'Hemocultivos antes de antibióticos si no demoran', ['hemocultivos', 'cultivos sangre'], 'lab', 10, 'Se obtienen dos pares de hemocultivos; identificación y susceptibilidad requieren incubación, no hay resultado microbiológico definitivo inmediato.'),
   study('g_neur07_labs', 'Hemograma, electrolitos, función renal y lactato', ['hemograma lactato', 'laboratorio meningitis', 'sepsis laboratorio'], 'lab', 10, 'Leucocitos 21.500/µL con neutrofilia, plaquetas 176.000/µL, Na 133 mmol/L, creatinina 1,0 mg/dL, lactato 2,8 mmol/L, glucemia 164 mg/dL.'),
   study('g_neur07_ct', 'TC cerebral si indicada antes de punción lumbar', ['tc cerebro', 'tac cerebro', 'tomografia cerebral'], 'imaging', 10, 'Sin masa, hidrocefalia o hemorragia. Imagen obtenida por compromiso de conciencia; no debe demorar tratamiento empírico.'),
   study('g_neur07_csf', 'Punción lumbar y análisis de LCR', ['puncion lumbar', 'lcr', 'citoquimico lcr'], 'procedure', 18, 'LCR turbio, 2400 células/µL con 92% neutrófilos, proteínas 220 mg/dL, glucosa 24 mg/dL con glucemia 164 mg/dL. Gram con diplococos grampositivos; PCR/cultivo y susceptibilidad pendientes.')
  ],
  dx: ['meningitis bacteriana', 'meningitis neumococica probable', 'meningitis aguda bacteriana'],
  differential: ['Encefalitis herpética', 'Hemorragia subaracnoidea', 'Absceso cerebral', 'Meningitis viral'],
  requiredHistory: ['onset', 'meds', 'risk', 'allergies'], keyStudies: ['g_neur07_labs', 'g_neur07_cultures'],
  interventionIds: ['iv', 'ceftriaxone', 'vancomycin_iv', 'ampicillin', 'dexamethasone', 'fluid', 'oxygen', 'intubation', 'vasopressor'],
  keyInterventions: ['ceftriaxone', 'vancomycin_iv', 'ampicillin', 'dexamethasone'],
  pharmacology: {coverageSets: [['ceftriaxone', 'vancomycin_iv', 'ampicillin']]},
  clinicalPolicy: {
   trajectory: {early: [0.3, 9, 4, -10, -6, -2], late: [0.5, 17, 6, -20, -10, -5], earlyEnd: 12, lateEnd: 60, fluidResponse: 0.6},
   responses: [{allOf: ['ceftriaxone', 'vancomycin_iv', 'ampicillin'], delay: 90, peak: 720, offsets: [-0.5, -10, -2, 0, 0, 0]}],
   regimens: {ceftriaxone: {dose: {amount: 2000, unit: 'mg', display: 'Ceftriaxona 2 g IV cada 12 h (dosis meníngea)'}, route: 'iv', intervalMinutes: 720, administrationMinutes: 30},
    ampicillin: {dose: {amount: 2000, unit: 'mg', display: 'Ampicilina 2 g IV cada 4 h, ajustar a función renal'}, route: 'iv', intervalMinutes: 240, administrationMinutes: 30}},
   closure: {destinations: ['uti', 'sala'], treatment: [['ceftriaxone', 'vancomycin_iv', 'ampicillin', 'dexamethasone']], requiredStudies: ['g_neur07_labs'], study: [['g_neur07_cultures', 'g_neur07_csf']],
    requiredExams: ['neurological:all'], consult: {uti: ['uti'], sala: ['neurology']}, urgentStudyBypass: true,
    summary: 'Antimicrobianos empíricos a dosis meníngeas y dexametasona precoz confirmados; ingreso aceptado para vigilancia y ajuste por microbiología. No se espera LCR o cultivo para iniciar tratamiento ni se presume resolución de la confusión.'},
   traits: ['infection', 'cnsInfection', 'bacterialMeningitis'],
   neurologyBaseline: {eye: 3, verbal: 4, motor: 6, infectiousConfusion: true, focalDeficit: 'Sin déficit focal inicial', recoveryDelayMinutes: 1440},
   doNotDelayTreatmentFor: ['g_neur07_cultures', 'g_neur07_ct', 'g_neur07_csf'],
   treatmentNotes: 'Obtener cultivos sin demorar ceftriaxona + vancomicina por epidemiología y ampicilina por edad. Dexametasona antes/con primer antibiótico; su preparación nunca retrasa antibióticos. LP solo si segura; reevaluar esteroide, aislamiento y cobertura con resultados.',
   complications: [{id: 'neur07_septic_shock', progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability: 0.25, minMinute: 20,
    rationale: 'Meningitis bacteriana con disfunción sistémica y riesgo de shock.', offsets: [0.2, 16, 5, -24, -12, -3], riseMinutes: 20,
    rescueAllOf: ['ceftriaxone', 'vancomycin_iv', 'ampicillin', 'fluid'], rescueAnyOf: ['vasopressor'], recoveryMinutes: 45,
    manifestation: 'Hipotensión, taquicardia y peor perfusión; reevaluar volumen con bolos guiados por respuesta y vasopresor si persiste hipotensión.'}, hypoperfusionKidneyComplication('neur07', ['fluid', 'vasopressor'])]
  }
 },
 {
  id: 'NEUR-08', specialty: 'Neurología', title: 'Encefalitis herpética probable con alteración conductual aguda', difficulty: 4,
  chief: 'Fiebre, confusión, trastorno de memoria y episodio convulsivo focal.', opening: 'Familiar: Desde ayer dice palabras que no encajan, olvida lo que pasó y hoy tuvo una sacudida del brazo derecho.', ageRange: [36, 54],
  variation: {backgroundHistory: [
   {"id": "esguince-remoto", "history": {"pmh": "Sin epilepsia, inmunodeficiencia conocida ni trastorno cognitivo previo. Hace cuatro años tuve un esguince de tobillo; me recuperé por completo y no tenía limitaciones previas."}},
   {"id": "miopia-corregida", "history": {"pmh": "Sin epilepsia, inmunodeficiencia conocida ni trastorno cognitivo previo. Uso anteojos por miopía desde joven, con visión corregida habitual y sin tratamiento sistémico por ese antecedente."}}
  ]},
  history: {
   onset: 'Fiebre y cefalea de 36 horas; cambio de memoria y lenguaje en las últimas 18 horas, una crisis focal breve esta mañana.',
   pmh: 'Sin epilepsia, inmunodeficiencia conocida ni trastorno cognitivo previo.', meds: 'Paracetamol ocasional. No anticoagulantes ni antibióticos previos.', allergies: 'Sin alergias conocidas.',
   risk: 'Alteración del estado mental durante más de 24 horas con fiebre y focalidad temporal. Función renal basal normal.',
   associated: 'Olfacciones extrañas y dificultad para recordar; no rash vesicular ni meningismo marcado.', function: 'La conducta y memoria cambiaron respecto de su estado habitual; no corresponden a un rasgo de personalidad.'
  },
  vitals: {temp: 38.7, hr: 108, rr: 22, bp: '124/76', spo2: 96},
  examFindings: {...examBase, appearance: 'Desorientado en tiempo, con dificultad para fijar recuerdos.',
   neuro: 'Glasgow 14 (E4 V4 M6), anomia y amnesia reciente, sin paresia persistente. Sin convulsión activa al examen.',
   neurology: {eye: 4, verbal: 4, motor: 6, language: 'Anomia', memory: 'Alteración marcada de memoria reciente', strength: '5/5 en cuatro miembros', seizureActive: false}} ,
  studies: [
   study('g_neur08_labs', 'Hemograma, electrolitos y función renal', ['laboratorio encefalitis', 'creatinina ionograma', 'hemograma'], 'lab', 10, 'Leucocitos 12.800/µL, Na 134 mmol/L, creatinina 0,8 mg/dL, glucemia 112 mg/dL.'),
   study('g_neur08_ct', 'TC cerebral antes de LP por focalidad/convulsión reciente', ['tc cerebro', 'tac cerebro', 'tomografia cerebral'], 'imaging', 10, 'Sin masa ni efecto de masa significativo; no hemorragia aguda.'),
   study('g_neur08_mri', 'RM de cerebro con difusión y FLAIR', ['rm cerebro', 'resonancia cerebral', 'flair temporal'], 'imaging', 25, 'Hiperintensidad mesiotemporal izquierda e insular en FLAIR/difusión, sugestiva de encefalitis herpética.'),
   study('g_neur08_csf', 'Punción lumbar y LCR inicial', ['puncion lumbar', 'lcr', 'citoquimico lcr'], 'procedure', 18, 'LCR con 86 células/µL, predominio linfocitario, proteínas 85 mg/dL, glucosa 62 mg/dL con glucemia 112; Gram negativo.'),
   study('g_neur08_hsv', 'PCR de HSV-1/2 en LCR', ['pcr hsv', 'pcr herpes lcr', 'pcr encefalitis'], 'lab', 45, 'PCR de HSV-1 positiva. Confirmación disponible después del inicio del tratamiento empírico.'),
   study('g_neur08_eeg', 'EEG por crisis focal y confusión persistente', ['eeg', 'electroencefalograma'], 'procedure', 15, 'Enlentecimiento temporal izquierdo y descargas periódicas lateralizadas; vigilar crisis subclínicas.', {repeatable: true, dynamic: 'encephalitis-eeg'})
  ],
  dx: ['encefalitis herpetica', 'encefalitis por herpes simple', 'encefalitis hsv', 'encefalitis'],
  differential: ['Meningoencefalitis bacteriana', 'Encefalitis autoinmune', 'Estado epiléptico no convulsivo', 'ACV temporal'],
  requiredHistory: ['onset', 'meds', 'risk', 'allergies'], keyStudies: ['g_neur08_labs', 'g_neur08_csf'],
  interventionIds: ['iv', 'acyclovir', 'levetiracetam', 'lorazepam', 'intubation'], keyInterventions: ['acyclovir'],
  pharmacology: {coverageSets: [['acyclovir']]},
  clinicalPolicy: {
   trajectory: {early: [0.2, 5, 2, -3, -1, -1], late: [0.5, 12, 4, -10, -5, -3], earlyEnd: 12, lateEnd: 60, fluidResponse: 0.2},
   responses: [{allOf: ['acyclovir'], delay: 120, peak: 1440, offsets: [-0.5, -8, -1, 0, 0, 0]}],
   closure: {destinations: ['sala', 'uti'], treatment: [['acyclovir']], requiredStudies: ['g_neur08_labs'], study: [['g_neur08_csf', 'g_neur08_mri']],
    requiredExams: ['neurological:all'], consult: {sala: ['neurology'], uti: ['uti']}, urgentStudyBypass: true,
    summary: 'Aciclovir IV empírico confirmado y hospitalización aceptada para diagnóstico, vigilancia de crisis y función renal. No se exige PCR positiva antes de tratar ni se atribuye recuperación cognitiva inmediata.'},
   traits: ['infection', 'cnsInfection', 'encephalitis'],
   neurologyBaseline: {eye: 4, verbal: 4, motor: 6, seizureActive: false, infectiousConfusion: true, focalDeficit: 'Anomia y amnesia reciente', preserveFocalDeficit: true, recoveryDelayMinutes: 2880},
   doNotDelayTreatmentFor: ['g_neur08_ct', 'g_neur08_mri', 'g_neur08_csf', 'g_neur08_hsv', 'g_neur08_eeg'],
   treatmentNotes: 'Aciclovir 10 mg/kg IV cada 8 h por 14–21 días si HSV confirmado, infusión ≥1 h e hidratación individualizada. Ajustar a función renal. PCR muy precoz negativa no excluye HSV: repetir a 3–7 días si sospecha alta. Tratar nuevas crisis, no sedar por confusión aislada.',
   complications: [{id: 'neur08_seizure', progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability: 0.22, minMinute: 25,
    rationale: 'Inflamación temporal con riesgo de crisis focal recurrente o estado epiléptico.', offsets: [0.2, 20, 7, 12, 5, -7], riseMinutes: 10,
    rescueAllOf: ['lorazepam', 'levetiracetam'], recoveryMinutes: 20, neurology: {eye: 2, verbal: 2, motor: 4, seizureActive: true},
    manifestation: 'Crisis focal prolongada con deterioro de conciencia; tratar estado epiléptico y evaluar vía aérea/EEG. La resolución ictal no implica curación de la encefalitis.'}]
  }
 },
 {
  id: 'NEUR-09', specialty: 'Neurología', title: 'Guillain-Barré grave con insuficiencia ventilatoria inminente', difficulty: 5,
  chief: 'Debilidad ascendente progresiva, tos débil y dificultad para respirar.', opening: 'Empezó en las piernas; ahora no puedo levantarme y siento que no tengo fuerza para respirar.', ageRange: [32, 52],
  variation: {backgroundHistory: [
   {"id": "acne-resuelto", "history": {"pmh": "Sin enfermedad neuromuscular previa. Diarrea autolimitada dos semanas antes. Tuve acné leve en la adolescencia, ya resuelto; no uso retinoides ni tratamiento habitual por ese antecedente."}},
   {"id": "fractura-pulgar-remota", "history": {"pmh": "Sin enfermedad neuromuscular previa. Diarrea autolimitada dos semanas antes. Hace diez años tuve una fractura de pulgar, completamente consolidada; antes de esta enfermedad usaba ambas manos con normalidad."}}
  ]},
  history: {
   onset: 'Parestesias y debilidad simétrica de cuatro días, ascendentes y con progresión rápida en las últimas 12 horas.',
   pmh: 'Sin enfermedad neuromuscular previa. Diarrea autolimitada dos semanas antes.', meds: 'No medicación habitual; no anticoagulantes.', allergies: 'Sin alergia a inmunoglobulina, ni antecedente de déficit de IgA con reacción grave.',
   risk: 'Ya no camina sin ayuda; debilidad cervical, tos débil y disfagia. Riesgo ventilatorio y disautonomía aun con SpO2 inicial conservada.',
   associated: 'Parestesias distales, sin nivel sensitivo, alteración esfinteriana ni compromiso de conciencia.', function: 'Consciente y orientado; limitación motora periférica, no encefalopatía.'
  },
  vitals: {temp: 36.8, hr: 108, rr: 28, bp: '146/88', spo2: 95},
  examFindings: {...examBase, lungs: 'Ventilación superficial, tos débil y mala movilización de secreciones; sin sibilancias.',
   neuro: 'Glasgow 15. Tetraparesia flácida simétrica, piernas 2/5 y brazos 3/5, arreflexia generalizada, debilidad facial bilateral y flexión cervical 2/5. Sensibilidad distal levemente disminuida; sin nivel.',
   neurology: {eye: 4, verbal: 5, motor: 6, strength: 'Piernas 2/5, brazos 3/5, cuello 2/5', reflexes: 'Arreflexia generalizada', pupils: 'Normales', bulbar: 'Disfagia y tos débil'}} ,
  studies: [
   study('g_neur09_fvc', 'Capacidad vital forzada y presión inspiratoria máxima seriadas', ['capacidad vital', 'cvf', 'fvc', 'pim', 'nif'], 'procedure', 5, 'CVF 14 mL/kg y PIM -18 cmH2O, con caída respecto del registro previo. Reserva ventilatoria crítica; considerar intubación electiva sin esperar hipoxemia.', {repeatable: true, dynamic: 'neuromuscular-ventilation'}),
   study('g_neur09_gas', 'Gasometría arterial', ['gasometria', 'gases arteriales'], 'lab', 8, 'pH 7,33, PaCO2 48 mmHg, PaO2 78 mmHg en aire ambiente; hipoventilación neuromuscular.'),
   study('g_neur09_labs', 'Hemograma, electrolitos y función renal', ['laboratorio guillain barre', 'ionograma creatinina', 'hemograma'], 'lab', 10, 'Electrolitos sin alteraciones explicativas; creatinina 0,8 mg/dL, plaquetas 226.000/µL.'),
   study('g_neur09_csf', 'Punción lumbar y LCR', ['puncion lumbar', 'lcr'], 'procedure', 20, 'Proteínas 112 mg/dL, 3 células/µL y glucosa normal: disociación albuminocitológica. Un LCR normal temprano no excluiría el diagnóstico.'),
   study('g_neur09_emg', 'Electroneuromiografía/conducción nerviosa', ['emg', 'electroneuromiografia', 'conduccion nerviosa'], 'procedure', 35, 'Polirradiculoneuropatía desmielinizante aguda con enlentecimiento y bloqueo de conducción; estudio de apoyo, no requisito para soporte urgente.')
  ],
  dx: ['sindrome de guillain barre', 'guillain barre grave', 'polirradiculoneuropatia aguda', 'guillain-barré'],
  differential: ['Mielopatía aguda', 'Crisis miasténica', 'Botulismo', 'Parálisis hipopotasémica'],
  requiredHistory: ['onset', 'meds', 'risk', 'allergies'], keyStudies: ['g_neur09_fvc', 'g_neur09_gas'],
  interventionIds: ['iv', 'intubation', 'ivig', 'plasma_exchange', 'oxygen'], keyInterventions: ['intubation'],
  clinicalPolicy: {
   trajectory: {early: [0, 8, 4, 8, 4, -2], late: [0.1, 15, -10, -15, -8, -10], earlyEnd: 12, lateEnd: 60, fluidResponse: 0.1}, responses: [],
   closure: {destinations: ['uti'], treatment: [['intubation', 'ivig'], ['intubation', 'plasma_exchange']], requiredStudies: ['g_neur09_fvc'], study: [],
    requiredExams: ['neurological:all'], consult: {uti: ['uti', 'neurology']}, urgentStudyBypass: true,
    summary: 'UTI acepta paciente con soporte ventilatorio confirmado e inmunoterapia iniciada. Persiste tetraparesia; IVIG/plasmaféresis no recuperan la fuerza durante la guardia. Vigilar disautonomía, aspiración y trombosis.'},
   traits: ['neuromuscularWeakness', 'guillainBarre', 'respiratoryFailure'],
   neurologyBaseline: {eye: 4, verbal: 5, motor: 6, limbStrength: 2, focalDeficit: 'Tetraparesia flácida y arreflexia', preserveFocalDeficit: true, recoveryDelayMinutes: 10080},
   doNotDelayTreatmentFor: ['g_neur09_csf', 'g_neur09_emg'],
   treatmentNotes: 'Intubación electiva por CVF 14 mL/kg, PIM débil y afectación bulbar; O2 aislado no corrige hipoventilación. IVIG 0,4 g/kg/día 5 días O plasmaféresis, no ambas rutinariamente. Corticoides no ofrecen beneficio para GBS. Medir ventilación y ritmo de forma seriada.',
   complications: [{id: 'neur09_ventilatory_failure', type: 'respiratory-fatigue', progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability: 0.4, minMinute: 15,
    rationale: 'Debilidad respiratoria y bulbar grave con CVF reducida e hipercapnia incipiente.', offsets: [0, 15, -10, -10, -5, -14], riseMinutes: 15,
    rescueAllOf: ['intubation'], recoveryMinutes: 15,
    manifestation: 'Fatiga, menor volumen corriente, hipercapnia y descenso tardío de SpO2; requiere ventilación, no esperar respuesta a inmunoterapia.'}]
  }
 },
 {
  id: 'NEUR-10', specialty: 'Neurología', title: 'Crisis miasténica con debilidad bulbar y falla ventilatoria', difficulty: 5,
  chief: 'Disfagia, voz nasal, caída de párpados y debilidad respiratoria progresiva.', opening: 'Me cuesta tragar y hablar; aunque intento respirar, me falta fuerza.', ageRange: [28, 48],
  variation: {backgroundHistory: [
   {"id": "varicela-infantil", "history": {"pmh": "Miastenia gravis generalizada con anticuerpos AChR positivos, sin crisis previa. Cuadro respiratorio viral reciente, sin fiebre ni esputo purulento. Tuve varicela en la infancia, sin complicaciones ni secuelas; no recibo tratamiento por ese antecedente."}},
   {"id": "esguince-antiguo", "history": {"pmh": "Miastenia gravis generalizada con anticuerpos AChR positivos, sin crisis previa. Cuadro respiratorio viral reciente, sin fiebre ni esputo purulento. Hace cinco años tuve un esguince de tobillo, ya resuelto; no me quedó limitación motora por esa lesión."}}
  ]},
  history: {
   onset: 'Miastenia conocida con empeoramiento de 48 horas y disnea/disfagia intensa en las últimas 6 horas.',
   pmh: 'Miastenia gravis generalizada con anticuerpos AChR positivos, sin crisis previa. Cuadro respiratorio viral reciente, sin fiebre ni esputo purulento.',
   meds: 'Piridostigmina y prednisona crónica; suspendió piridostigmina dos días por vómitos. No recibió magnesio, aminoglucósidos ni fluoroquinolonas.',
   allergies: 'Sin alergia conocida a inmunoglobulina; sin insuficiencia renal ni estado protrombótico conocido.',
   risk: 'Disfunción bulbar importante, mala tos y fatiga ventilatoria; la saturación conservada inicialmente no descarta falla respiratoria.',
   associated: 'Sin diarrea, miosis, bradicardia o hipersecreciones que sugieran exceso colinérgico.', function: 'Conserva conciencia y sensibilidad; la debilidad fluctúa y empeora con el esfuerzo.'
  },
  vitals: {temp: 37.2, hr: 112, rr: 30, bp: '138/82', spo2: 94},
  examFindings: {...examBase, appearance: 'Lúcido, habla pocas palabras por esfuerzo, voz nasal y ptosis bilateral.', lungs: 'Respiración superficial, uso de músculos accesorios y tos ineficaz; sin broncoespasmo.',
   neuro: 'Glasgow 15. Ptosis fatigable, diplopía, paresia facial, disfagia y flexión cervical 2/5; fuerza proximal 3/5. Reflejos conservados y sensibilidad normal. Pupilas normales.',
   neurology: {eye: 4, verbal: 5, motor: 6, strength: 'Proximal 3/5, flexión cervical 2/5', reflexes: 'Conservados', pupils: 'Isocóricas reactivas', bulbar: 'Disfagia, voz nasal y tos ineficaz', ocular: 'Ptosis fatigable y diplopía'}} ,
  studies: [
   study('g_neur10_fvc', 'CVF y presión inspiratoria máxima seriadas', ['cvf', 'capacidad vital', 'fvc', 'pim', 'nif'], 'procedure', 5, 'CVF 12 mL/kg, PIM -16 cmH2O y tos ineficaz; signos de falla ventilatoria que favorecen intubación electiva.', {repeatable: true, dynamic: 'neuromuscular-ventilation'}),
   study('g_neur10_gas', 'Gasometría arterial', ['gasometria', 'gases arteriales'], 'lab', 8, 'pH 7,30, PaCO2 54 mmHg, PaO2 74 mmHg en aire ambiente; acidosis respiratoria hipercápnica.'),
   study('g_neur10_labs', 'Electrolitos, función renal y hemograma', ['laboratorio miastenia', 'ionograma creatinina', 'hemograma'], 'lab', 10, 'Na 139 mmol/L, K 4,0 mmol/L, Mg 1,8 mg/dL, creatinina 0,7 mg/dL, leucocitos 9.800/µL.'),
   study('g_neur10_chest', 'Radiografía de tórax y búsqueda de desencadenante', ['rx torax', 'radiografia torax', 'placa torax'], 'imaging', 12, 'Sin consolidación ni edema pulmonar; atelectasias laminares por hipoventilación. No confirma infección bacteriana que justifique antibiótico empírico por sí sola.')
  ],
  dx: ['crisis miastenica', 'crisis miastenica con falla ventilatoria', 'miastenia gravis descompensada', 'myasthenic crisis'],
  differential: ['Guillain-Barré', 'Crisis colinérgica', 'Botulismo', 'Trastorno metabólico con debilidad'],
  requiredHistory: ['onset', 'meds', 'risk', 'allergies'], keyStudies: ['g_neur10_fvc', 'g_neur10_gas'],
  interventionIds: ['iv', 'intubation', 'ivig', 'plasma_exchange', 'oxygen'], keyInterventions: ['intubation'],
  clinicalPolicy: {
   trajectory: {early: [0, 9, 3, 2, 1, -3], late: [0.1, 18, -12, -18, -9, -12], earlyEnd: 12, lateEnd: 60, fluidResponse: 0}, responses: [],
   closure: {destinations: ['uti'], treatment: [['intubation', 'ivig'], ['intubation', 'plasma_exchange']], requiredStudies: ['g_neur10_fvc'], study: [],
    requiredExams: ['neurological:all'], consult: {uti: ['uti', 'neurology']}, urgentStudyBypass: true,
    summary: 'Crisis miasténica con ventilación confirmada, inmunoterapia iniciada y UTI/neurología acepta traslado. Persiste debilidad bulbar y proximal; mejoría por inmunoterapia se espera en días, con revisión del desencadenante y medicación.'},
   traits: ['neuromuscularWeakness', 'myasthenicCrisis', 'respiratoryFailure'],
   neurologyBaseline: {eye: 4, verbal: 5, motor: 6, limbStrength: 3, focalDeficit: 'Debilidad fatigable ocular, bulbar, cervical y proximal', preserveFocalDeficit: true, recoveryDelayMinutes: 4320},
   doNotDelayTreatmentFor: ['g_neur10_labs', 'g_neur10_chest'],
   treatmentNotes: 'Vía aérea precoz por hipercapnia y afectación bulbar; VNI no apropiada en esta presentación con disfagia y mala tos. IVIG O plasmaféresis según contexto. Revisar piridostigmina en paciente intubado por secreciones, sin aumento automático. Evitar fármacos agravantes; cambios de corticoide requieren plan especialista por posible empeoramiento inicial.',
   complications: [{id: 'neur10_ventilatory_failure', type: 'respiratory-fatigue', progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1', probability: 0.45, minMinute: 12,
    rationale: 'Crisis miasténica con hipercapnia, tos ineficaz y reserva ventilatoria muy reducida.', offsets: [0, 14, -12, -12, -6, -15], riseMinutes: 12,
    rescueAllOf: ['intubation'], recoveryMinutes: 15,
    manifestation: 'Menor esfuerzo efectivo y progresión de hipercapnia; proteger vía aérea y ventilar. La oxigenación puede mejorar con soporte sin recuperar fuerza muscular.'}]
  }
 }
];

export const neurologyPack = {
 schemaVersion: 1, packId: 'atria-neurology', version: '1.0.0', cases: neurologyCaseDefinitions.map(defineClinicalCase)
};
