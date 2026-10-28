// Adult teaching formulary. These are administration contracts, not physiological
// executors; only confirmed administrations enter the shared clinical runtime.
// Source selection and dated dose checks: docs/clinical/respiratory-references.md.
const freeze = value => {
 if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  for (const item of Object.values(value)) freeze(item);
  Object.freeze(value);
 }
 return value;
};

export const RESPIRATORY_TREATMENTS = freeze({
 amoxicillin: {
  id: 'amoxicillin', classId: 'antibiotic', label: 'Amoxicilina oral', aliases: ['amoxicilina', 'amoxicillin'],
  kind: 'medication', route: 'oral', dose: {amount: 1000, unit: 'mg', display: '1 g oral cada 8 h'},
  min: 1000, max: 1000, preparationSeconds: 1.2, latencyMinutes: 30, peakMinutes: 240, durationMinutes: 480,
  hazards: ['allergy'], indications: ['infection'], requiresAccess: false,
  contraindications: ['Anafilaxia a penicilinas; ajustar a función renal.'],
  regimen: {intervalMinutes: 480, duration: 'Curso orientado por estabilidad y reevaluación; inicialmente 5 días en NAC ambulatoria.'}
 },
 azithromycin: {
  id: 'azithromycin', classId: 'antibiotic', label: 'Azitromicina IV', aliases: ['azitromicina', 'azithromycin', 'macrolido', 'macrólido'],
  kind: 'medication', route: 'iv', dose: {amount: 500, unit: 'mg', display: '500 mg IV cada 24 h, infusión de al menos 60 min'},
  min: 500, max: 500, preparationSeconds: 1.5, latencyMinutes: 30, peakMinutes: 240, durationMinutes: 1440,
  hazards: ['allergy', 'qtProlongation'], indications: ['infection'], requiresAccess: true,
  contraindications: ['QT prolongado, torsades previas o interacciones relevantes; revisar electrolitos y función hepática.'],
  regimen: {intervalMinutes: 1440, administrationMinutes: 60, duration: 'Reevaluar cobertura de atípicos con microbiología y evolución.'}
 },
 salbutamol: {
  id: 'salbutamol', classId: 'bronchodilator', label: 'Salbutamol nebulizado', aliases: ['salbutamol', 'albuterol', 'saba', 'ventolin'],
  kind: 'medication', route: 'inhaled', dose: {amount: 5, unit: 'mg', display: '5 mg nebulizados; repetir cada 20–30 min según respuesta'},
  min: 2.5, max: 5, preparationSeconds: 1, latencyMinutes: 1, peakMinutes: 10, durationMinutes: 240,
  hazards: ['tachyarrhythmia', 'hypokalemia'], indications: ['bronchospasm'], requiresAccess: false,
  contraindications: ['Vigilar frecuencia cardíaca, potasio y lactato; broncodilatador no sustituye corticoide ni rescate ventilatorio.'],
  regimen: {intervalMinutes: 20, initialDoses: 3, reassessMinutes: 60, protocol: 'Nebulización supervisada; dosis posteriores ajustadas al trabajo respiratorio y respuesta.'}
 },
 ipratropium: {
  id: 'ipratropium', classId: 'bronchodilator', label: 'Ipratropio nebulizado', aliases: ['ipratropio', 'ipratropium', 'sama', 'atrovent'],
  kind: 'medication', route: 'inhaled', dose: {amount: 0.5, unit: 'mg', display: '0,5 mg nebulizados, añadido a SABA'},
  min: 0.5, max: 0.5, preparationSeconds: 1, latencyMinutes: 2, peakMinutes: 20, durationMinutes: 360,
  hazards: ['allergy'], indications: ['bronchospasm'], requiresAccess: false,
  contraindications: ['Evitar contacto de la solución con los ojos; precaución en glaucoma de ángulo cerrado y retención urinaria.'],
  regimen: {intervalMinutes: 20, initialDoses: 3, protocol: 'En asma grave durante el tratamiento inicial; luego espaciar según reevaluación. En EPOC puede continuarse cada 4–6 h.'}
 },
 magnesium: {
  id: 'magnesium', classId: 'electrolyte', label: 'Sulfato de magnesio IV', aliases: ['magnesio', 'sulfato de magnesio', 'magnesium', 'mgso4'],
  kind: 'medication', route: 'iv', dose: {amount: 2000, unit: 'mg', display: '2 g IV en 20 min, dosis única selectiva'},
  min: 2000, max: 2000, preparationSeconds: 1.5, latencyMinutes: 5, peakMinutes: 25, durationMinutes: 120,
  hazards: ['hypotension'], indications: ['refractoryBronchospasm'], requiresAccess: true,
  contraindications: ['No usar de rutina; vigilar hipotensión, función renal y signos de toxicidad por magnesio.'],
  regimen: {administrationMinutes: 20, maximumDoses: 1, protocol: 'Asma grave con respuesta insuficiente a broncodilatadores y corticoide; no retrasar intubación indicada.'}
 },
 enoxaparin: {
  id: 'enoxaparin', classId: 'anticoagulant', label: 'Enoxaparina terapéutica SC', aliases: ['enoxaparina', 'enoxaparin', 'hbpm', 'heparina de bajo peso molecular'],
  kind: 'medication', route: 'sc', dose: {amount: 1, unit: 'mg/kg', display: '1 mg/kg SC cada 12 h'},
  min: 1, max: 1, preparationSeconds: 1.5, latencyMinutes: 15, peakMinutes: 180, durationMinutes: 720,
  hazards: ['bleeding'], indications: ['thromboembolism'], requiresAccess: false,
  contraindications: ['Hemorragia activa, trombocitopenia inducida por heparina o lesión hemorrágica intracraneal; valorar procedimientos neuraxiales.'],
  regimen: {intervalMinutes: 720, renalAdjustment: 'Si aclaramiento de creatinina <30 ml/min: 1 mg/kg SC cada 24 h; revisar alternativa y acumulación.', protocol: 'Dosis por peso real y función renal; no equivale a profilaxis. Planificar anticoagulación de continuación.'}
 },
 heparin_therapeutic: {
  id: 'heparin_therapeutic', classId: 'anticoagulant', label: 'Heparina no fraccionada terapéutica IV', aliases: ['heparina terapeutica', 'heparina terapéutica', 'heparina no fraccionada', 'unfractionated heparin', 'ufh'],
  kind: 'medication', route: 'iv', dose: {amount: 80, unit: 'U/kg', display: '80 U/kg IV; luego 18 U/kg/h ajustada por TTPa o anti-Xa'},
  min: 60, max: 100, preparationSeconds: 1.5, latencyMinutes: 1, peakMinutes: 10, durationMinutes: 240,
  hazards: ['bleeding'], indications: ['thromboembolism', 'coronaryThrombosis'], requiresAccess: true,
  contraindications: ['Hemorragia activa, disección aórtica, hemorragia intracraneal o antecedente de HIT. No duplicar con HBPM.'],
  regimen: {continuous: true, infusion: {amount: 18, unit: 'U/kg/h'}, monitoring: 'TTPa o anti-Xa, hemograma y plaquetas.', protocol: 'Referencia TEP: bolo80 U/kg y18 U/kg/h. PCI: bolo70–100 U/kg. SCASEST conservador:60 U/kg máximo4000U y12 U/kg/h máximo1000U/h según protocolo específico; requiere la pauta del caso.'}
 },
 alteplase_pe: {
  id: 'alteplase_pe', classId: 'thrombolytic', label: 'Alteplasa IV para TEP de alto riesgo', aliases: ['alteplasa para tep', 'alteplase pe', 'trombolisis pulmonar', 'trombólisis pulmonar', 'fibrinolisis pulmonar', 'rtpa para tep'],
  kind: 'medication', route: 'iv', dose: {amount: 100, unit: 'mg', display: '100 mg IV en 2 h para TEP con shock elegible'},
  min: 100, max: 100, preparationSeconds: 2, latencyMinutes: 5, peakMinutes: 120, durationMinutes: 180,
  hazards: ['bleeding', 'intracranialBleeding'], indications: ['obstructiveShockPE'], requiresAccess: true,
  contraindications: ['Sangrado activo, ACV reciente, lesión/cirugía intracraneal reciente, diátesis hemorrágica o hipertensión grave no controlada; revisar contraindicaciones completas.'],
  regimen: {administrationMinutes: 120, maximumDoses: 1, protocol: 'No usar de rutina en TEP sin shock. Anticoagulación parenteral al final o tras infusión cuando TTPa/tiempo de trombina sea ≤2 veces normal; seguimiento por equipo de TEP/UTI.'}
 },
 needle_decompression: {
  id: 'needle_decompression', classId: 'procedure', label: 'Descompresión torácica de urgencia', aliases: ['descompresion toracica', 'descompresión torácica', 'descompresion con aguja', 'descompresión con aguja', 'toracostomia de urgencia', 'toracostomía de urgencia'],
  kind: 'procedure', route: 'procedure', dose: {amount: 1, unit: 'procedimiento', display: 'Descompresión inmediata del hemitórax afectado'},
  min: 1, max: 1, preparationSeconds: 1, latencyMinutes: 0.2, peakMinutes: 2, durationMinutes: 10,
  hazards: ['bleeding', 'barotrauma'], indications: ['tensionPneumothorax'], requiresAccess: false,
  contraindications: ['Intervención para tensión con inestabilidad o compromiso respiratorio grave; verificar lado.'],
  regimen: {executionMinutes: 1, requiresCompletedReceipt: true, protocol: 'Por operador capacitado, descompresión con aguja o toracostomía abierta según contexto/protocolo; toracostomía abierta preferida en trauma hospitalario cuando disponible. No esperar imagen. Es un puente al drenaje definitivo, no el tratamiento final.'}
 },
 chest_drainage: {
  id: 'chest_drainage', classId: 'procedure', label: 'Colocación de drenaje pleural', aliases: ['drenaje pleural', 'tubo de torax', 'tubo de tórax', 'drenaje toracico', 'drenaje torácico', 'toracostomia con tubo', 'chest drain'],
  kind: 'procedure', route: 'procedure', dose: {amount: 1, unit: 'procedimiento', display: 'Drenaje pleural del lado afectado, con control de posición y función'},
  min: 1, max: 1, preparationSeconds: 4, latencyMinutes: 1, peakMinutes: 15, durationMinutes: 1440,
  hazards: ['bleeding', 'barotrauma'], indications: ['tensionPneumothorax', 'pleuralInfection'], requiresAccess: false,
  contraindications: ['Verificar anatomía, lado y coagulopatía; no confundir consulta aceptada con drenaje realizado.'],
  regimen: {executionMinutes: 10, requiresCompletedReceipt: true, protocol: 'Analgesia/anestesia local, técnica estéril y operador capacitado. Empiema: drenaje guiado por ecografía, habitualmente ≤14F y microbiología. Neumotórax: tubo apropiado y sistema cerrado según protocolo. Reevaluar expansión, fuga y débito.'}
 },
 niv: {
  id: 'niv', classId: 'procedure', label: 'Ventilación no invasiva', aliases: ['vni', 'niv', 'bipap', 'ventilacion no invasiva', 'ventilación no invasiva'],
  kind: 'procedure', route: 'procedure', dose: {amount: 1, unit: 'procedimiento', display: 'VNI con vigilancia continua y ajuste por respuesta'},
  min: 1, max: 1, preparationSeconds: 3, latencyMinutes: 2, peakMinutes: 20, durationMinutes: 120,
  hazards: ['aspiration', 'hypotension', 'barotrauma', 'airwayDelay'], indications: ['hypercapnicFailure', 'cardiogenicPulmonaryEdema'], requiresAccess: false,
  contraindications: ['Paro, incapacidad para proteger vía aérea, vómitos activos, shock no controlado, neumotórax sin drenaje o imposibilidad de adaptar interfaz.'],
  regimen: {executionMinutes: 5, requiresCompletedReceipt: true, protocol: 'EPOC acidótico: iniciar presión de soporte aproximadamente IPAP10/EPAP5cmH2O, titular según tolerancia, trabajo respiratorio y gasometría; O2 objetivo88–92%. Edema cardiogénico: CPAP o bilevel según contexto. Reevaluar en15–30min; fracaso requiere vía aérea invasiva.'}
 },
 intubation: {
  id: 'intubation', classId: 'procedure', label: 'Intubación y ventilación invasiva', aliases: ['intubacion', 'intubación', 'intubar', 'iot', 'intubacion orotraqueal', 'intubación orotraqueal', 'ventilacion invasiva', 'ventilación invasiva'],
  kind: 'procedure', route: 'procedure', dose: {amount: 1, unit: 'procedimiento', display: 'Asegurar vía aérea con intubación y ventilación invasiva ajustada'},
  min: 1, max: 1, preparationSeconds: 4, latencyMinutes: 1, peakMinutes: 20, durationMinutes: 1440,
  hazards: ['hypotension', 'aspiration', 'barotrauma'], indications: ['respiratoryFailure', 'airwayFailure'], requiresAccess: true,
  contraindications: ['Procedimiento por equipo capacitado con preparación hemodinámica, preoxigenación, fármacos de inducción/bloqueo y capnografía según contexto.'],
  regimen: {executionMinutes: 5, requiresCompletedReceipt: true, protocol: 'Incluye ventilación tras confirmar tubo. Asma/EPOC obstructivo: baja frecuencia, tiempo espiratorio prolongado y vigilancia de auto-PEEP/hiperinflación; no perseguir normalización rápida de CO2. SDRA requiere además estrategia protectora explícita. Mantener sedoanalgesia y control hemodinámico.'}
 },
 lung_protective_ventilation: {
  id: 'lung_protective_ventilation', classId: 'conduct', label: 'Ventilación protectora para SDRA', aliases: ['ventilacion protectora', 'ventilación protectora', 'ventilacion pulmonar protectora', 'volumen corriente bajo', 'lung protective ventilation'],
  kind: 'conduct', route: 'procedure', dose: {amount: 6, unit: 'ml/kg PBW', display: 'VT inicial6 ml/kg de peso predicho; ajustar4–8, presión meseta<30cmH2O'},
  min: 4, max: 8, preparationSeconds: 2, latencyMinutes: 3, peakMinutes: 30, durationMinutes: 1440,
  hazards: ['hypotension', 'barotrauma'], indications: ['ards'], requiresAccess: false,
  contraindications: ['Requiere vía aérea invasiva y monitorización; calcular peso predicho con talla, no peso real.'],
  regimen: {executionMinutes: 5, requiresCompletedReceipt: true, protocol: 'Ajustar PEEP/FiO2 y presión meseta; considerar PEEP mayor sin maniobras de reclutamiento prolongadas en SDRA moderado/grave. Prono prolongado si hipoxemia grave persistente; tratar la causa. Este acto no equivale a resolver SDRA.'}
 },
 amoxiclav: {
  id: 'amoxiclav', classId: 'antibiotic', label: 'Amoxicilina/ácido clavulánico IV', aliases: ['amoxiclav', 'coamoxiclav', 'co-amoxiclav', 'amoxicilina clavulanico', 'amoxicilina clavulánico', 'amoxicilina acido clavulanico', 'amoxicilina ácido clavulánico'],
  kind: 'medication', route: 'iv', dose: {amount: 1200, unit: 'mg', display: '1,2 g IV (1000/200 mg) cada 8 h'},
  min: 1200, max: 1200, preparationSeconds: 1.5, latencyMinutes: 30, peakMinutes: 240, durationMinutes: 480,
  hazards: ['allergy'], indications: ['infection', 'anaerobicInfection'], requiresAccess: true,
  contraindications: ['Anafilaxia a penicilinas o hepatotoxicidad previa por amoxicilina/clavulánico; ajustar a función renal.'],
  regimen: {intervalMinutes: 480, protocol: 'Absceso pulmonar o infección pleural comunitaria seleccionada: cultivo y reevaluación por neumología/infectología; duración prolongada y transición oral según respuesta. No sustituye drenaje del empiema.'}
 }
});
