// Adult emergency safety formulary, shared by every case. A verified IM
// administration is required before rescue; this definition executes nothing.
// Sources: docs/clinical/medication-safety-references.md.
export const SAFETY_TREATMENTS = Object.freeze({
 epi_im: Object.freeze({
  id: 'epi_im', label: 'Adrenalina IM para anafilaxia',
  aliases: ['adrenalina im', 'epinefrina im', 'epinephrine im', 'adrenalina intramuscular', 'epinefrina intramuscular', 'adrenalina para anafilaxia'],
  kind: 'medication', classId: 'adrenergic', route: 'im',
  dose: Object.freeze({amount: 0.5, unit: 'mg', display: '0,5 mg IM (0,5 ml de 1 mg/ml) en cara anterolateral del muslo; repetir a los 5 min si persiste compromiso ABC'}),
  min: 0.5, max: 0.5, preparationSeconds: 1, latencyMinutes: 1, peakMinutes: 5, durationMinutes: 15,
  hazards: Object.freeze(['tachyarrhythmia', 'hypertension', 'ischemia', 'wrong_route_or_concentration']),
  indications: Object.freeze(['anaphylaxis']), requiresAccess: false,
  contraindications: Object.freeze(['No hay contraindicación absoluta de adrenalina IM ante anafilaxia con compromiso de vía aérea, respiración o circulación. No equivale a bolo IV de adrenalina.']),
  regimen: Object.freeze({
   intervalMinutes: 5, repeatIfPersistentABC: true, concentrationMgPerMl: 1, volumeMl: 0.5,
   administrationSite: 'anterolateral thigh', firstLine: true,
   protocol: 'Administrar inmediatamente ante anafilaxia; retirar el desencadenante si es posible y pedir ayuda. O2, monitorización y cristaloides IV tempranos ante compromiso circulatorio, con reevaluación. Repetir IM a los 5 min si persiste compromiso ABC; tras dos dosis sin respuesta, ayuda experta y protocolo de anafilaxia refractaria. Antihistamínicos no corrigen ABC y no deben retrasar adrenalina; corticoides no son tratamiento rutinario inicial.'
  })
 })
});
