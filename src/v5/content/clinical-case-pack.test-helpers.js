// Complete content fixtures for compiler/lifecycle tests. No clinical runtime lives here.
export function playableCase(id = 'RESP-101') {
 return {
  id, specialty: 'Respiratorio', selector: 'Disnea progresiva', area: 'Guardia',
  demo: 'Mujer, 42 años', chief: 'Disnea y fiebre.', opening: 'Me cuesta respirar.',
  vitals: {temp: 38.2, hr: 112, rr: 26, bp: '110/70', spo2: 90},
  exam: 'Taquipnea y crepitantes en base derecha.',
  intents: [{id: 'onset', keys: ['desde cuando'], answers: ['Desde ayer.'], reveal: 'disnea de un día'}],
  studies: [{id: 'chest_xray', label: 'Radiografía de tórax', aliases: ['radiografia'], type: 'imaging', delay: 2, result: 'Infiltrado basal derecho.'}],
  interventions: [{id: 'oxygen', label: 'Oxígeno', aliases: ['oxigeno']}],
  dx: ['neumonía'], requiredHistory: ['onset'], keyStudies: ['chest_xray'], keyInterventions: ['oxygen'],
  common: {name: 'Ana', age: '42', arrival: 'Vine acompañada.', reason: ['Me falta el aire.'], current: ['Sigo agitada.'], concern: ['Me preocupa respirar.'], allergies: ['No conozco alergias.'], pmh: ['Sin antecedentes.'], surgeries: ['Ninguna.'], meds: ['No tomo medicación.'], pain: ['No me duele.']},
  anamnesis: {otherSymptoms: 'Tengo fiebre.', historySummary: 'Sin antecedentes conocidos.'},
  variation: {ageRange: [18, 70], firstNames: ['Ana'], lastNames: ['Paz'], personalities: ['serena'], openings: ['Me cuesta respirar.'], allergies: [], complications: []},
  clinicalExecutorId: 'acute-policy-v1', closurePolicyId: 'policy-closure-v1', studyPolicyId: 'case-studies-v1', examPolicyId: 'case-exam-v1',
  clinicalPolicy: {schemaVersion: 1, treatmentId: 'oxygen'}
 };
}
export function casePack(cases = [playableCase()], overrides = {}) {
 return {schemaVersion: 1, packId: 'respiratory-pack', version: '1.0.0', cases, ...overrides};
}
export function executableRegistries() {
 const policy = () => ({
  version: '1.0.0', execute: entry => ({caseId: entry.id}),
  validateCase: entry => entry.clinicalPolicy.schemaVersion === 1 ? [] : ['unsupported clinical policy schema']
 });
 return {
  executors: new Map([['acute-policy-v1', policy()]]),
  closurePolicies: new Map([['policy-closure-v1', policy()]]),
  studyPolicies: new Map([['case-studies-v1', policy()]]),
  examPolicies: new Map([['case-exam-v1', policy()]]),
  drugs: new Map([['oxygen', {
   version: '1.0.0', execute: (owner, command, clock) => owner.execute(command, clock),
   validateCase: entry => entry.interventions.some(item => item.id === 'oxygen') ? [] : ['oxygen action missing']
  }]]), progressions: new Map(), rescues: new Map(), existingCaseIds: []
 };
}
export function passingEvidence(staged) {
 return {ok: true, packId: staged.packId, version: staged.version, digest: staged.digest,
  evidence: staged.cases.map(entry => ({caseId: entry.id, passed: true,
   checks: {history: true, exam: true, studies: true, treatment: true, trajectory: true, closure: true, xp: true}}))};
}
