/** Opt-in, single-patient QA bridge. The native engine remains the sole live
 * effect owner. Only two call-through hooks observe actual receipts and dt;
 * no nursing, vital, survival, procedure or reward state is written here. */
import {createPhysiologyShadow487, samplePhysiologyShadow487} from './physiology-shadow-487.js';
import {adaptConfirmedPharmacologyEvents487} from './pharmacology-receipts-487.js';
import {createClinicalClock487, advanceClinicalClock487} from '../clinical/clinical-clock-487.js';
import {PILOT_DEFINITIONS_487} from '../clinical/physiology-pilot-definitions-487.js';

const plain = x => structuredClone(x);
const cleanUnit = x => String(x || '').replace(/[µμ]/g, 'mc').replace(/^ug/, 'mcg');
const normalize = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const EPS_NATIVE = 1e-8;
const routeAliases = new Map([
  ...['iv', 'ev', 'intravenosa', 'intravenoso', 'endovenosa', 'endovenoso', 'venosa'].map(x => [x, 'iv']),
  ...['inhalada', 'inhalado', 'inhalatoria', 'inhalatorio', 'nasal'].map(x => [x, 'inhaled']),
  ...['im', 'sc', 'sq', 'vo', 'po', 'sl', 'oral', 'peroral', 'intramuscular', 'subcutanea',
    'subcutaneo', 'rectal', 'intranasal', 'sublingual', 'transdermica', 'transdermico',
    'epidural', 'intratecal', 'intraperitoneal', 'intraosea', 'intraarterial'].map(x => [x, 'unsupported']),
]);
export function pharmacologyRouteConflict487(raw, expected) {
  const text = normalize(raw).replace(/\b([iesvp])\.\s*([vmoqc])\.?/g, '$1$2');
  const tokens = text.match(/[a-z]+/g) || [];
  for (let i = 0; i < tokens.length; i++) {
    const actual = routeAliases.get(tokens[i]);
    if (actual && actual !== expected) return true;
    if (['via', 'ruta'].includes(tokens[i]) && routeAliases.get(tokens[i + 1]) !== expected) return true;
  }
  // An omitted route remains the documented pilot assumption. The native
  // ledger cannot independently establish formulation/route or recover text
  // discarded by the existing nursing parser.
  return false;
}

export function installPhysiologyQAObserver487(port) {
  const initial = port.read(), patient = initial.patient, caseDef = initial.caseDef;
  const uid = patient?.patientInstance?.uid;
  if (!['solo', 'apprentice'].includes(initial.mode)) throw Error('QA shadow requires a local solo/apprentice patient');
  if (initial.hidden) throw Error('QA shadow requires a visible clinical session');
  if (!uid || patient.gameMinute !== 0 || patient.administrationLog?.length || patient.monitorTherapies?.size)
    throw Error('QA shadow requires a fresh untreated patient; checkpoint/replay is not implemented');
  const nativeAdministration = port.getAdministration(), nativeUpdate = port.getUpdate();
  if (typeof nativeAdministration !== 'function' || typeof nativeUpdate !== 'function')
    throw Error('actual native administration and update endpoints required');
  let clock = createClinicalClock487({authorityId: 'native-qa:' + uid});
  let shadow = createPhysiologyShadow487(caseDef, patient, {clock: {mode: 'clinical'}});
  let status = 'observing', reason = null, sequence = 0, captured = [], receipts = [], issues = [];
  const counts = new Map(), continuingDoses = new Map();
  let installed = false, nativeTail = null;

  function detach() {
    if (port.getAdministration() === administration) port.setAdministration(nativeAdministration);
    if (port.getUpdate() === update) port.setUpdate(nativeUpdate);
  }
  function fail(error) {
    status = 'error'; reason = String(error.message || error);
    try {detach();} catch (restoreError) {reason += '; detach failed: ' + String(restoreError.message || restoreError);}
  }
  function samePatient() {
    const current = port.read();
    if (current.patient !== patient || current.patient?.patientInstance?.uid !== uid || current.caseDef !== caseDef)
      throw Error('patient/case changed; start a new shadow on an untreated patient');
    if (!['solo', 'apprentice'].includes(current.mode)) throw Error('shared/multiplayer ownership is outside QA shadow');
    if (current.hidden) throw Error('hidden session requires a new checkpoint/replay');
    if (patient.caseEnded || patient.patientDied) throw Error('native patient ended; shadow observation stopped');
    if (installed && (port.getAdministration() !== administration || port.getUpdate() !== update))
      throw Error('QA endpoint ownership changed; checkpoint/replay required');
    if (Math.abs(patient.gameMinute - clock.nativeMinute) > EPS_NATIVE)
      throw Error('native time discontinuity; checkpoint/replay required');
    if ((patient.administrationLog?.at(-1) || null) !== nativeTail)
      throw Error('native ledger changed outside observed administration boundary');
    return current;
  }
  function sample() {
    samePatient();
    const events = [], confirmations = [], newlyAccepted = [];
    for (const entry of captured) {
      const d = PILOT_DEFINITIONS_487.drugs.get(entry.id);
      if (!d) {
        if (!issues.some(x => x.treatmentId === entry.id)) issues.push({code: 'unsupported-by-pilot', treatmentId: entry.id});
        continue;
      }
      if (entry.count !== (counts.get(entry.id) || 0) + 1) throw Error('missing native administration count for ' + entry.id);
      if (pharmacologyRouteConflict487(entry.raw, d.route)) throw Error('native order route cannot be verified as ' + d.route + ' for ' + entry.id);
      if (d.route === 'iv' && entry.confirmedIV <= 0) throw Error('native IV execution lacks confirmed access for ' + entry.id);
      if (entry.id === 'vasopressor' && !/nora|norepinefr/.test(normalize(entry.raw)))
        throw Error('generic vasopressor does not establish norepinephrine identity');
      const match = entry.doseDisplay.match(/^(\d+(?:\.\d+)?)\s*(L\/min|ml|mg|(?:mcg|µg|μg|ug)\/kg\/min)$/);
      if (!match || cleanUnit(match[2]) !== d.unit || Number(match[1]) !== entry.amount || cleanUnit(entry.unit) !== d.unit)
        throw Error('native historical dose/unit mismatch for ' + entry.id);
      const active = patient.monitorTherapies?.get(entry.id);
      if (!active || Number(active.lastGivenAt) + EPS_NATIVE < entry.nativeMinute)
        throw Error('recorded administration is not present in native active therapy for ' + entry.id);
      const continuous = ['support', 'infusion'].includes(d.kinetics.kind);
      const action = continuous ? (counts.has(entry.id) ? 'setRate' : 'start') : 'bolus';
      const eventId = uid + ':native-qa:' + entry.sequence;
      // Canonical microsecond clock endpoint tolerates only floating point
      // rounding, never an unobserved span of native time.
      if (entry.nativeMinute > clock.nativeMinute + EPS_NATIVE) throw Error('native receipt is ahead of observed clock');
      const timestamp = {authorityId: clock.authorityId, unit: 'native-minute',
        value: Math.min(entry.nativeMinute, clock.nativeMinute)};
      const event = {schemaVersion: 1, eventId, patientId: uid, treatmentId: entry.id,
        eventType: action === 'setRate' ? 'dose-change' : 'administration', status: 'administered',
        action, route: d.route, sequence: entry.sequence, dose: {amount: entry.amount, unit: d.unit}, timestamp,
        verification: {source: 'native-administration-log', receiptId: eventId + ':ledger'}};
      const confirmation = {...event, source: event.verification.source, receiptId: event.verification.receiptId};
      delete confirmation.verification;
      events.push(event); confirmations.push(confirmation);
      newlyAccepted.push({...event, nativeEvidence: {...entry, routeSource: 'pilot-definition-with-native-dose-and-access'}});
      counts.set(entry.id, entry.count);
      if (continuous) continuingDoses.set(entry.id, event.dose);
    }
    for (const [id, dose] of continuingDoses) {
      const active = patient.monitorTherapies?.get(id);
      if (!active) throw Error('continuous support suspension lacks a confirmed native receipt for ' + id);
      if (Number(active.dose?.amount) !== dose.amount || cleanUnit(active.dose?.unit) !== dose.unit)
        throw Error('continuous rate/dose changed without a confirmed native receipt for ' + id);
    }
    if (receipts.length + newlyAccepted.length > 2048 || issues.length > 64) throw Error('QA receipt/issue limit requires checkpoint');
    const accepted = adaptConfirmedPharmacologyEvents487(events, {patientId: uid,
      definitions: PILOT_DEFINITIONS_487, confirmations, clock});
    const snapshot = {patientInstance: {uid}, gameMinute: patient.gameMinute,
      liveVitals: {...patient.liveVitals}, phys: patient.phys || null, administrationLog: accepted.events};
    shadow = samplePhysiologyShadow487(shadow, snapshot, {atClinicalMinute: clock.clinicalMinute});
    receipts.push(...newlyAccepted); captured = [];
  }
  function administration() {
    const before = patient.administrationLog?.at(-1);
    const expectedTail = nativeTail;
    const out = nativeAdministration.apply(this, arguments);
    if (status !== 'observing') return out;
    try {
      if ((before || null) !== expectedTail) throw Error('native ledger changed outside observed administration boundary');
      const current = port.read();
      if (current.patient !== patient) throw Error('administration belongs to a different patient');
      const row = patient.administrationLog?.at(-1), t = arguments[0];
      if (row === before || !row || row.id !== t?.id || row.count !== out?.count)
        throw Error('native execution did not produce a distinct confirmed receipt');
      if (captured.length >= 2048) throw Error('QA capture queue limit requires checkpoint');
      nativeTail = row;
      captured.push({id: row.id, count: row.count, sequence: ++sequence, nativeMinute: row.m,
        doseDisplay: String(row.doseDisplay || ''), amount: Number(t.dose?.amount), unit: cleanUnit(t.dose?.unit),
        raw: String(row.raw || ''), defaultApplied: !!row.defaultApplied,
        confirmedIV: Number(patient.venousAccessCount || 0)});
    } catch (error) { fail(error); }
    return out;
  }
  function update(dt) {
    if (status !== 'observing') return nativeUpdate.apply(this, arguments);
    const before = patient.gameMinute;
    const out = nativeUpdate.apply(this, arguments);
    try {
      const delta = patient.gameMinute - before;
      if (port.read().patient !== patient) throw Error('patient switched during native update');
      if (delta < 0 || !Number.isFinite(delta)) throw Error('native clock reversed or became invalid');
      if (delta > 0) {
        if (!Number.isFinite(dt) || dt <= 0) throw Error('invalid native update dt');
        const rate = [.12, .03].find(r => Math.abs(delta - dt * r) <= Math.max(1e-12, Math.abs(delta) * 1e-8));
        if (!rate) throw Error('unsupported native clock rate; checkpoint/replay required');
        clock = advanceClinicalClock487(clock, {deltaRealSeconds: dt, nativeMinutesPerRealSecond: rate});
      }
      samePatient();
      if (clock.clinicalMinute - shadow.state.requestedClinicalMinute >= .25 - 1e-9) sample();
    } catch (error) { fail(error); }
    return out;
  }
  sample();
  try { port.setAdministration(administration); port.setUpdate(update); installed = true; }
  catch (error) { detach(); throw error; }
  return Object.freeze({
    stop() { if (status === 'observing') { status = 'stopped'; reason = 'QA observer disabled'; detach(); } },
    report() {
      if (status === 'observing') { try { sample(); } catch (error) { fail(error); } }
      return plain({schemaVersion: 1, status, reason, patientId: uid, caseId: caseDef.id,
        shadowOnly: true, clinicalValidated: false, effectOwner: 'native', clock, receipts, issues,
        comparisonComplete: issues.length === 0 && status !== 'error', unprocessedEvidence: captured,
        sampleCapacity: 256, samples: shadow.samples, last: {sample: shadow.samples.at(-1), state: shadow.state}});
    },
  });
}
