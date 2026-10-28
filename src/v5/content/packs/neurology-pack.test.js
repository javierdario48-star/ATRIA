import test from 'node:test';
import assert from 'node:assert/strict';

const packModule = () => import('./neurology-pack.js').catch(() => null);
const treatmentsModule = () => import('./neurology-treatments.js').catch(() => null);

test('neurology intake provides the exact ten planned cases with distinct actionable investigations', async () => {
 const module = await packModule();
 assert.ok(module, 'neurology content module must exist');
 const {neurologyCaseDefinitions: definitions, neurologyPack: pack} = module;
 assert.deepEqual(definitions.map(c => c.id), Array.from({length: 10}, (_, i) => `NEUR-${String(i + 1).padStart(2, '0')}`));
 assert.equal(pack.cases.length, 10);
 const studies = new Set();
 for (const c of definitions) {
  assert.equal(c.specialty, 'Neurología');
  assert.ok(c.history.onset && c.history.pmh && c.history.meds && c.history.allergies);
  assert.ok(c.examFindings.neuro);
  assert.ok(c.differential.length >= 3);
  assert.ok(c.requiredHistory.includes('onset') && c.requiredHistory.includes('meds'));
  for (const study of c.studies) {
   assert.ok(study.delay >= 5, `${c.id}: no instantaneous study`);
   assert.ok(!studies.has(study.id), `${study.id}: shared case-local result`);
   studies.add(study.id);
  }
  assert.ok(!c.clinicalPolicy.closure.destinations.includes('alta'), `${c.id}: acute neurological disease requires inpatient care`);
 }
});

test('stroke cases distinguish standard IV thrombolysis, selected late thrombectomy and resolved high-risk TIA', async () => {
 const module = await packModule();
 assert.ok(module, 'neurology content module must exist');
 const [early, late, tia] = module.neurologyCaseDefinitions;
 const earlyCriteria = early.clinicalPolicy.eligibility.alteplase_stroke;
 assert.ok(earlyCriteria.requiredStudies.includes('g_neur01_ct'));
 assert.equal(earlyCriteria.onsetMinutes, 80);
 assert.equal(earlyCriteria.onsetLimitMinutes, 270);
 assert.equal(earlyCriteria.requiresNoIntracranialBleed, true);
 assert.deepEqual(earlyCriteria.bpLimit, {sys: 185, dia: 110});
 assert.ok(late.clinicalPolicy.eligibility.thrombectomy.requiredStudies.includes('g_neur02_perfusion'));
 assert.equal(late.clinicalPolicy.eligibility.thrombectomy.onsetMinutes, 480);
 assert.equal(late.clinicalPolicy.eligibility.thrombectomy.onsetLimitMinutes, 1440);
 assert.ok(late.clinicalPolicy.eligibility.thrombectomy.requiresLargeVesselOcclusion);
 assert.ok(!late.interventionIds.includes('alteplase_stroke'));
 assert.ok(tia.clinicalPolicy.closure.treatment.some(group => ['aspirin', 'clopidogrel', 'stroke_prevention'].every(id => group.includes(id))));
 assert.equal(tia.clinicalPolicy.neurologyBaseline.nihss, 0);
});

test('intracranial bleeds require cause-specific treatment and never claim definitive treatment from transfer', async () => {
 const module = await packModule();
 assert.ok(module, 'neurology content module must exist');
 const [ich, sah] = module.neurologyCaseDefinitions.slice(3, 5);
 assert.ok(ich.clinicalPolicy.traits.includes('intracranialBleed'));
 assert.ok(ich.clinicalPolicy.closure.treatment.every(group => group.includes('nicardipine') && group.includes('anticoagulation_reversal')));
 assert.ok(sah.clinicalPolicy.closure.treatment.every(group => group.includes('nimodipine')));
 assert.match(sah.clinicalPolicy.closure.summary, /No se presume.*(?:embolización|clipado)/);
 assert.ok(!sah.clinicalPolicy.responses.some(response => response.allOf.includes('nimodipine') && response.offsets.some(Number)));
});

test('meningitis and encephalitis start appropriate empirical therapy without waiting for confirmatory CSF results', async () => {
 const module = await packModule();
 assert.ok(module, 'neurology content module must exist');
 const meningitis = module.neurologyCaseDefinitions[6];
 const encephalitis = module.neurologyCaseDefinitions[7];
 assert.ok(meningitis.ageRange[0] > 60);
 assert.ok(meningitis.clinicalPolicy.closure.treatment.some(group => ['ceftriaxone', 'vancomycin_iv', 'ampicillin', 'dexamethasone'].every(id => group.includes(id))));
 assert.equal(meningitis.clinicalPolicy.regimens.ceftriaxone.intervalMinutes, 720);
 assert.equal(meningitis.clinicalPolicy.regimens.ampicillin.intervalMinutes, 240);
 assert.ok(meningitis.clinicalPolicy.doNotDelayTreatmentFor.includes('g_neur07_csf'));
 assert.ok(encephalitis.clinicalPolicy.doNotDelayTreatmentFor.includes('g_neur08_hsv'));
 assert.ok(encephalitis.clinicalPolicy.closure.treatment.every(group => group.includes('acyclovir')));
});

test('neuromuscular crises require ventilation and immunotherapy while retaining weakness during an emergency shift', async () => {
 const module = await packModule();
 const treatmentModule = await treatmentsModule();
 assert.ok(module && treatmentModule, 'neurology content and treatment modules must exist');
 for (const c of module.neurologyCaseDefinitions.slice(8)) {
  assert.equal(c.clinicalPolicy.neurologyBaseline.motor, 6);
  assert.ok(c.clinicalPolicy.neurologyBaseline.limbStrength <= 3);
  assert.ok(c.clinicalPolicy.closure.treatment.every(group => group.includes('intubation') && (group.includes('ivig') || group.includes('plasma_exchange'))));
  assert.ok(!c.clinicalPolicy.responses.some(response => response.delay < 1440 && response.allOf.some(id => ['ivig', 'plasma_exchange'].includes(id))));
 }
 assert.ok(treatmentModule.NEUROLOGY_TREATMENTS.ivig.latencyMinutes >= 2880);
 assert.ok(treatmentModule.NEUROLOGY_TREATMENTS.plasma_exchange.latencyMinutes >= 1440);
});

test('neurological formulary has guideline doses, explicit routes and drug-specific harm metadata', async () => {
 const module = await treatmentsModule();
 assert.ok(module, 'neurology treatment module must exist');
 const t = module.NEUROLOGY_TREATMENTS;
 assert.deepEqual([t.alteplase_stroke.dose.amount, t.alteplase_stroke.dose.unit], [0.9, 'mg/kg']);
 assert.equal(t.alteplase_stroke.regimen.maximumTotalMg, 90);
 assert.equal(t.nimodipine.route, 'oral');
 assert.equal(t.nimodipine.dose.amount, 60);
 assert.equal(t.lorazepam.regimen.maximumDoseMg, 4);
 assert.equal(t.levetiracetam.regimen.maximumDoseMg, 4500);
 assert.equal(t.acyclovir.dose.amount, 10);
 assert.equal(t.acyclovir.regimen.intervalHours, 8);
 assert.equal(t.ivig.dose.amount, 0.4);
 assert.equal(t.ivig.regimen.days, 5);
 for (const [id, treatment] of Object.entries(t)) {
  assert.equal(id, treatment.id);
  assert.ok(treatment.dose.amount >= treatment.min && treatment.dose.amount <= treatment.max);
  assert.ok(treatment.hazards.length > 0);
  assert.ok(treatment.indications.length > 0);
 }
 assert.ok(t.alteplase_stroke.hazards.includes('intracranial_hemorrhage'));
 assert.ok(t.lorazepam.hazards.includes('respiratory_depression'));
 assert.ok(t.nimodipine.hazards.includes('never_intravenous'));
});

test('confirmed treatment of refractory status has an authored postictal course without instant normal consciousness', async () => {
 const module = await packModule();
 const c = module.neurologyCaseDefinitions.find(x => x.id === 'NEUR-06');
 const responses = c.clinicalPolicy.observationResponses;
 assert.equal(responses?.length, 2);
 assert.deepEqual(responses[0].allOf, ['lorazepam', 'levetiracetam']);
 assert.equal(responses[0].neurology.seizureActive, false);
 assert.equal(responses[0].neurology.postictal, true);
 assert.ok(responses[0].delay > 0 && responses[0].peak > responses[0].delay);
 assert.deepEqual(responses[1].neurology, {eye: 3, verbal: 3, motor: 5});
 assert.ok(responses[1].delay >= responses[0].peak);
 assert.ok(responses[1].peak > responses[1].delay);
});
