// Content only. The shared V5 medication/procedure owner executes these actions;
// a request, consultation or transfer acceptance is never an administration.
// Doses apply to adults. See docs/clinical/cardiology-references.md.
const classes = {aspirin: 'antiplatelet', ticagrelor: 'antiplatelet', clopidogrel: 'antiplatelet', atorvastatin: 'statin', nitroglycerin: 'vasodilator', adenosine: 'antiarrhythmic', metoprolol: 'betaBlocker', amiodarone: 'antiarrhythmic', atropine: 'antimuscarinic', esmolol: 'betaBlocker'};
const medication = (id, label, aliases, route, amount, unit, display, min, max, timing, hazards, indications, regimen) => ({
 id, classId: classes[id], label, aliases, kind: 'medication', route, dose: {amount, unit, display}, min, max,
 preparationSeconds: 2, latencyMinutes: timing[0], peakMinutes: timing[1], durationMinutes: timing[2],
 hazards, indications, requiresAccess: route === 'iv', ...(regimen ? {regimen} : {})
});
const procedure = (id, label, aliases, minutes, indications, regimen = {}) => ({
 id, classId: 'procedure', label, aliases, kind: 'procedure', route: 'procedure', dose: {amount: 1, unit: 'procedimiento', display: '1 procedimiento por equipo capacitado'},
 min: 1, max: 1, preparationSeconds: 4, latencyMinutes: 1, peakMinutes: 10, durationMinutes: 720,
 hazards: ['proceduralComplications'], indications, requiresAccess: true,
 regimen: {executionMinutes: minutes, requiresCompletedReceipt: true, ...regimen}
});

export const CARDIOLOGY_TREATMENTS = Object.freeze({
 aspirin: medication('aspirin', 'Ácido acetilsalicílico oral', ['aspirina', 'aas', 'acido acetilsalicilico'], 'oral', 300, 'mg', '300 mg masticados; luego 75–100 mg/día', 150, 325, [10, 30, 1440],
  ['bleeding', 'aspirinHypersensitivity', 'aorticDissection'], ['coronaryIschemia'], {mode: 'loading', maintenance: {amount: 100, unit: 'mg', intervalMinutes: 1440}}),
 ticagrelor: medication('ticagrelor', 'Ticagrelor oral', ['ticagrelor', 'carga de ticagrelor'], 'oral', 180, 'mg', '180 mg de carga; luego 90 mg cada 12 h', 180, 180, [30, 90, 720],
  ['bleeding', 'intracranialBleedingHistory', 'aorticDissection', 'bradyarrhythmia', 'dyspnea'], ['coronaryIschemia'], {mode: 'loading', maintenance: {amount: 90, unit: 'mg', intervalMinutes: 720}}),
 clopidogrel: medication('clopidogrel', 'Clopidogrel oral', ['clopidogrel', 'carga de clopidogrel'], 'oral', 600, 'mg', '600 mg de carga para PCI si ticagrelor/prasugrel no son adecuados; luego 75 mg/día', 300, 600, [60, 120, 1440],
  ['bleeding', 'aorticDissection'], ['coronaryIschemia'], {mode: 'loading', maintenance: {amount: 75, unit: 'mg', intervalMinutes: 1440}, caution: 'No duplicar inhibidores P2Y12; esta carga no corresponde a fibrinólisis en mayores de 75 años.'}),
 atorvastatin: medication('atorvastatin', 'Atorvastatina oral', ['atorvastatina', 'estatina de alta intensidad'], 'oral', 80, 'mg', '80 mg por vía oral cada 24 h', 40, 80, [1440, 4320, 1440],
  ['severeActiveLiverDisease', 'myopathy', 'drugInteractions'], ['coronaryIschemia'], {intervalMinutes: 1440, noAcuteVitalBenefit: true}),
 nitroglycerin: medication('nitroglycerin', 'Nitroglicerina IV en infusión', ['nitroglicerina iv', 'nitroglicerina intravenosa', 'infusion de nitroglicerina', 'nitroglicerina'], 'iv', 10, 'mcg/min', 'Iniciar 10 mcg/min IV y titular con TA continua; máximo del protocolo 200 mcg/min', 5, 200, [2, 10, 15],
  ['hypotension', 'preloadDependence', 'rightVentricularInfarction', 'pde5Inhibitor', 'severeAorticStenosis'], ['hypertensiveCongestion', 'coronaryIschemia'],
  {mode: 'infusion', initialRate: {amount: 10, unit: 'mcg/min'}, titrationStep: {amount: 5, unit: 'mcg/min'}, titrationIntervalMinutes: 3, minimumRate: 5, maximumRate: 200, unit: 'mcg/min', reassess: 'TA, dolor y perfusión en cada ajuste; suspender ante hipotensión. No equivale a bolo IV.'}),
 adenosine: medication('adenosine', 'Adenosina IV rápida', ['adenosina', 'adenosina iv'], 'iv', 6, 'mg', '6 mg IV en bolo rápido seguido de lavado; una segunda dosis de 12 mg si persiste TSV regular', 6, 12, [.1, .5, 1],
  ['bronchospasm', 'preexcitedAtrialFibrillation', 'irregularWideComplexTachycardia', 'highGradeAvBlock'], ['regularNarrowComplexTachycardia'],
  {mode: 'rapid-bolus', initialDose: {amount: 6, unit: 'mg'}, secondDose: {amount: 12, unit: 'mg'}, intervalMinutes: 2, monitoring: 'ECG continuo y equipo de reanimación; no tratar FA preexcitada o taquicardia irregular de QRS ancho.'}),
 metoprolol: medication('metoprolol', 'Metoprolol tartrato IV', ['metoprolol', 'metoprolol iv'], 'iv', 2.5, 'mg', '2.5–5 mg IV en 2 min; reevaluar antes de repetir, máximo acumulado 15 mg', 2.5, 5, [3, 15, 180],
  ['hypotension', 'cardiogenicShock', 'acuteDecompensatedHeartFailure', 'highGradeAvBlock', 'severeBronchospasm', 'preexcitedAtrialFibrillation'], ['atrialFibrillationRateControl', 'aorticDissection'],
  {mode: 'slow-bolus', administrationMinutes: 2, repeatIntervalMinutes: 5, maxCumulative: {amount: 15, unit: 'mg'}, monitoring: 'FC, TA, intervalo PR y signos de bajo gasto.'}),
 amiodarone: medication('amiodarone', 'Amiodarona IV para FA seleccionada', ['amiodarona', 'amiodarona iv'], 'iv', 300, 'mg', '300 mg IV en dextrosa al 5% durante 30–60 min; después 900–1200 mg/24 h según especialista', 300, 300, [15, 60, 360],
  ['hypotension', 'bradyarrhythmia', 'qtProlongation', 'drugInteractions', 'preexcitedAtrialFibrillation', 'conversionEmbolism'], ['atrialFibrillationRateControl'],
  {mode: 'infusion', administrationMinutes: 60, diluent: 'dextrosa al 5%', diluentVolumeMl: 250, preferredAccess: 'central', maintenance: {amount: 900, maxAmount: 1200, unit: 'mg', intervalMinutes: 1440}, caution: 'Puede cardiovertir: valorar trombo y anticoagulación. El esquema de TV estable (150 mg/10 min) es distinto.'}),
 atropine: medication('atropine', 'Atropina IV', ['atropina', 'atropina iv'], 'iv', 1, 'mg', '1 mg IV; repetir cada 3–5 min si procede, máximo acumulado 3 mg', 1, 1, [1, 3, 20],
  ['tachyarrhythmia', 'coronaryIschemia', 'unreliableInfranodalBlock'], ['symptomaticBradycardia'],
  {mode: 'bolus', repeatIntervalMinutes: 3, maxCumulative: {amount: 3, unit: 'mg'}, caution: 'En BAV completo con QRS ancho puede no responder: no retrasar estimulación.'}),
 esmolol: medication('esmolol', 'Esmolol IV en infusión', ['esmolol', 'esmolol iv', 'infusion de esmolol'], 'iv', 50, 'mcg/kg/min', '50 mcg/kg/min IV, titular a 50–300 mcg/kg/min; carga opcional 500 mcg/kg en 1 min si tolera', 50, 300, [2, 10, 15],
  ['hypotension', 'cardiogenicShock', 'highGradeAvBlock', 'bradyarrhythmia', 'acuteSevereAorticRegurgitation', 'severeBronchospasm'], ['aorticDissection', 'atrialFibrillationRateControl'],
  {mode: 'infusion', optionalLoadingDose: {amount: 500, unit: 'mcg/kg', administrationMinutes: 1}, initialRate: {amount: 50, unit: 'mcg/kg/min'}, titrationStep: {amount: 50, unit: 'mcg/kg/min'}, titrationIntervalMinutes: 5, minimumRate: 50, maximumRate: 300, unit: 'mcg/kg/min', targetHeartRate: [60, 80], targetSystolic: 'Menor de 120 mmHg o mínimo que preserve perfusión; monitorización continua.'}),
 vagal_maneuver: {
  id: 'vagal_maneuver', classId: 'conduct', label: 'Maniobra de Valsalva modificada', aliases: ['maniobra vagal', 'maniobras vagales', 'valsalva', 'valsalva modificada'], kind: 'conduct', route: 'procedure',
  dose: {amount: 1, unit: 'intento', display: 'Un intento supervisado con monitorización'}, min: 1, max: 1,
  preparationSeconds: 2, latencyMinutes: .5, peakMinutes: 1, durationMinutes: 720,
  hazards: ['unstableTachyarrhythmia'], indications: ['regularNarrowComplexTachycardia'], requiresAccess: false,
  regimen: {executionMinutes: 1, requiresCompletedReceipt: true, caution: 'Solo TSV regular estable; si hay compromiso hemodinámico, cardioversión sincronizada.'}
 },
 coronary_reperfusion: procedure('coronary_reperfusion', 'Angioplastia coronaria urgente realizada', ['angioplastia primaria', 'pci primaria', 'angioplastia coronaria', 'revascularizacion coronaria', 'reperfusion coronaria'], 20, ['coronaryOcclusion'],
  {resource: 'hemodinamia', caution: 'Recibo de PCI completada en centro capaz. Activar o derivar a hemodinamia no implica reperfusión. En shock tratar inicialmente el vaso culpable.'}),
 cardioversion: {
  ...procedure('cardioversion', 'Cardioversión eléctrica sincronizada realizada', ['cardioversion sincronizada', 'cardioversion electrica', 'cardioversion'], 2, ['unstableTachyarrhythmia', 'selectedAtrialFibrillation', 'refractoryRegularSvt']),
  dose: {amount: 200, unit: 'J', display: 'FA: 200 J bifásicos sincronizados; TSV regular: 100 J, según ritmo/dispositivo'}, min: 100, max: 200,
  hazards: ['sedationComplications', 'conversionEmbolism', 'unsynchronizedShock'],
  regimen: {executionMinutes: 2, requiresCompletedReceipt: true, synchronized: true, energyByRhythm: {atrialFibrillation: 200, regularNarrowComplex: 100}, sedation: 'Sedación y analgesia si son factibles sin demorar una intervención urgente.', caution: 'Verificar sincronización. FA >24 h o de duración incierta estable requiere anticoagulación previa adecuada o exclusión de trombo por ETE.'}
 },
 temporary_pacing: {
  ...procedure('temporary_pacing', 'Estimulación cardíaca temporal con captura confirmada', ['marcapasos temporal', 'marcapaso transcutaneo', 'marcapasos transcutaneo', 'estimulacion transcutanea', 'marcapasos transvenoso'], 5, ['symptomaticHighGradeAvBlock']),
  dose: {amount: 70, unit: 'lpm', display: 'Estimulación inicial a 70/min, titular y confirmar captura eléctrica y mecánica'}, min: 60, max: 80,
  regimen: {executionMinutes: 5, requiresCompletedReceipt: true, mode: 'transcutaneous-bridge', verify: 'Captura eléctrica y pulso/perfusión mecánica; analgesia/sedación según tolerancia; preparar estimulación transvenosa por especialista.'}
 },
 pericardial_drainage: procedure('pericardial_drainage', 'Drenaje pericárdico urgente realizado', ['pericardiocentesis', 'drenaje pericardico', 'drenaje pericardico urgente'], 10, ['tamponade'],
  {resource: 'cardiologia-intervencionista', guidance: 'Ecografía a pie de cama y operador capacitado; cirugía si hemopericardio/pus o acceso percutáneo no viable.', caution: 'La aceptación para traslado no equivale a drenaje realizado.'}),
 aortic_surgery: procedure('aortic_surgery', 'Reparación quirúrgica de aorta ascendente realizada', ['cirugia de aorta', 'reparacion de aorta ascendente', 'cirugia de diseccion aortica'], 180, ['typeAAorticDissection'],
  {resource: 'cirugia-cardiovascular', caution: 'Solo recibo de reparación completada; la interconsulta y el traslado aceptado se registran por separado.'}),
 valve_surgery: procedure('valve_surgery', 'Cirugía valvular por endocarditis realizada', ['cirugia valvular', 'reemplazo valvular', 'cirugia de endocarditis'], 180, ['complicatedEndocarditis'],
  {resource: 'cirugia-cardiovascular', caution: 'Indicación por insuficiencia cardíaca/disfunción valvular, infección no controlada o riesgo embólico; el traslado no representa cirugía realizada.'})
});
