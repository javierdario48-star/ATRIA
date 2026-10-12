/**
 * TEST / QA ONLY. Deterministic reference for the generated CURRENT clinical code.
 * This VM is deliberately narrower than browser boot. It must never be imported
 * by the game. Every executed clinical excerpt comes from apply487 output;
 * extraction boundaries fail closed if that source changes shape.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {apply487} from '../../src/integration/apply-487.js';
import {PHARMA_RULES_487} from '../../src/clinical/pharmacology-registry-487.js';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const NATIVE_REFERENCE_PATH_487 = fileURLToPath(new URL('./native-reference-487.json', import.meta.url));
export const NATIVE_PILOT_CASE_IDS_487 = Object.freeze(['PERI-SEC-001', 'HDA-001', 'CIRR-001']);
export const NATIVE_PILOT_TIMES_487 = Object.freeze([0, 1, 2, 5, 15]);
export const NATIVE_CLOCK_487 = Object.freeze({
  dtUnit: 'real second', nativeGameMinutesPerRealSecond: 0.12,
  typingNativeGameMinutesPerRealSecond: 0.03, displayedClinicalMinutesPerRealSecond: 1,
  comparison: 'clinicalMinute = nativeGameMinute / 0.12, with typing disabled',
  integrationRealSeconds: 1 / 60,
  evidence: [
    'Native updateSimulation: sim.gameMinute += dt * 0.12 * (typing ? 0.25 : 1).',
    'cs-v410-modes renderHud: hours = floor(elapsedMs() / 60000).',
    'cs-v410-modes rule text: 24 minutos reales, equivalentes a 24 horas.',
    'Native administrationClock/HUD still format floor(sim.gameMinute) from 08:15; these are a separate clock.',
  ],
});

function finiteNonnegative(value, label) {
  assert(Number.isFinite(value) && value >= 0, label + ' must be finite and nonnegative');
  return value;
}
export function nativeToClinicalMinutes487(nativeMinute) {
  return finiteNonnegative(nativeMinute, 'nativeMinute') / NATIVE_CLOCK_487.nativeGameMinutesPerRealSecond;
}
export function clinicalToNativeMinutes487(clinicalMinute) {
  return finiteNonnegative(clinicalMinute, 'clinicalMinute') * NATIVE_CLOCK_487.nativeGameMinutesPerRealSecond;
}

const order = (id, text) => Object.freeze({atNativeMinute: 0, id, text});
const OXYGEN = order('oxygen', 'oxigeno 4 L/min');
const FLUID = order('fluid', 'Ringer 500 ml');
const PRESSOR = order('vasopressor', 'noradrenalina 0.05 mcg/kg/min');
const MORPHINE = order('morphine', 'morfina 4 mg');
const DIURETIC = order('furosemide', 'furosemida 40 mg');
export const NATIVE_PILOT_SCENARIOS_487 = Object.freeze([
  {id: 'untreated', orders: []},
  {id: 'oxygen', orders: [OXYGEN]},
  {id: 'fluid', orders: [FLUID]},
  {id: 'vasopressor', orders: [PRESSOR]},
  {id: 'morphine', orders: [MORPHINE]},
  {id: 'furosemide', orders: [DIURETIC]},
  {id: 'combined-support', orders: [OXYGEN, FLUID, PRESSOR]},
  {id: 'fluid-plus-diuretic', orders: [FLUID, DIURETIC]},
].map(s => Object.freeze({...s, orders: Object.freeze(s.orders)})));

const sha256 = s => createHash('sha256').update(s).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
function between(source, start, end) {
  const a = source.indexOf(start);
  assert(a >= 0 && source.indexOf(start, a + start.length) < 0, 'unique source boundary: ' + start);
  const b = source.indexOf(end, a + start.length);
  assert(b > a, 'closing source boundary: ' + end);
  return source.slice(a, b);
}
function script(html, id) {
  const marker = '<script id="' + id + '">';
  assert.equal(html.split(marker).length, 2, 'one generated script: ' + id);
  return html.split(marker)[1].split('</script>')[0];
}
function iife(code) { return '(function(){\n' + code + '\n})();'; }
const INCLUDED_SCOPE_487 = Object.freeze([
  'Native initial vitals/physiology/freshSim, catalogue, recognizers, dose parsing/defaults, actual administration/exposure log, immediate physiology, therapy totals, toxicity, coverage, progression, smoothing and updateSimulation.',
  'Native fatal-exposure update and the generated irreversible grace gate execute; the 125-second horizon stays inside unconditional grace. This is not mortality acceptance.',
  'cs-safe-v0180 procedural-state freshSim and native IV safety; confirmed venousAccessCount=1 is supplied, with no simulated cannulation.',
  'cs-safe-v0190 real medical-content initializer (including heparin), provenance/async preparation/admin wrappers and selected-patient update wrapper. V19 random initial offsets are explicitly bypassed.',
  'cs-safe-v0203 patient-binding function; V3 source wrappers for therapy response, immediate physiology, progression and milestones. clinicalV3 response/trajectory factors are fixed to1 with no random complication offset.',
  'Generated 487 peritonitis assessment/coverage, surgical monitor route, manual IV route, grace, secondary sepsis bridge, critical rescue, confirmed-action observer and atomic pharmacology startup, in their actual HTML order.',
  'cs-v412 exact alias/negation/question recognizer and monitor wrapper; ns421 clinical-state and hypoperfusion tracking; ns422 treatment-identity/continuation prefix; ns423 full evolution/recovery/binding wrapper, in actual later HTML order.',
  'Deterministic performance clock and ordered timeout queue preserve V19 550ms/800ms medication preparation. Ticks use real dt=1/60 second, followed by due timer callbacks; no direct gameMinute edits.',
]);
const EXCLUDED_SCOPE_487 = Object.freeze([
  'HTML/DOM rendering, native canvas/RAF scheduling, Android/device behavior, mobile keyboard timing (typing is false), navigation/pathfinding, audio/voice/chat presentation and network/multiplayer ownership.',
  'Nursing sprites, physical cannulation/monitor placement, composite text dispatch and nursing queues/receipts. Direct monitor orders use actual native async administration with confirmed IV1.',
  'V19/V3 random seed selection/offsets, case-variable demographics, practice/reward/XP/career/scoring UI, v40 ward/admissions/transports, shared-mode clock and study transport. No patient switching or background ward is exercised.',
  'Automatic Vega interventions, ns424 live-progress automatic closure and diagnostic/disposition UI. This matrix has no examination, diagnosis, studies, consult, source-control procedure or disposition.',
  'New shared-engine/shadow adapter and real-time guard scheduler. Display clock conversion is explicit metadata; the VM does not initialize a guard or change either existing clock.',
  'Long-term mortality, acceptance of safe treatment, clinical validity and complete browser boot are not asserted. Support alone is not definitive care for sepsis/bleeding.',
]);

let cachedSources;
export function loadNativeReferenceSources487({repoRoot = REPO_ROOT} = {}) {
  if (repoRoot === REPO_ROOT && cachedSources) return cachedSources;
  const frozenHtml = fs.readFileSync(path.join(repoRoot, 'vendor/atria-4.8.6/index.html'), 'utf8');
  const html = apply487(frozenHtml);
  // The multiplayer adapter changes lobby/guard presentation, not native timekeeping.
  // Audit the stable clinical build so every networking-only change need not rewrite
  // the deterministic physiology reference fixture.
  const baseClinicalHtml = apply487(frozenHtml,{multiplayer:false});
  const start = html.indexOf('const CASES=') + 'const CASES='.length;
  assert(start >= 'const CASES='.length, 'generated CASES literal');
  const cases = JSON.parse(html.slice(start).split('\n')[0].replace(/;\s*$/, ''));
  const catalogue = vm.runInNewContext(between(html, 'const MONITOR_THERAPY_CATALOG=[', 'function findMonitorTherapy(') + ';MONITOR_THERAPY_CATALOG');
  const nativeFind = html.match(/^function findIntervention\(text\)\{.*\}$/m)?.[0];
  const nativeNorm = html.match(/^function norm\(s\)\{.*\}$/m)?.[0];
  assert(nativeFind, 'native intervention recognizer');
  assert(nativeNorm, 'native text normalization');
  const sources = [
    ['native-normalization', nativeNorm],
    ['native-case-lookup', nativeFind],
    ['native-initial-state', between(html, 'function initialLiveVitals(){', 'function addGlobalChat(')],
    ['native-therapy', between(html, 'function findMonitorTherapy(', 'function missingAlgorithmInterventions(')],
    ['native-order-intervention', between(html, 'function orderIntervention(i){', 'function updateOrders(){')],
    ['native-tick', between(html, 'function updateOrders(){', 'function finishCase(')],
    ['native-fatal-exposure', between(html, 'function csHasTherapy(id){', 'function csDrawNameplate(')],
  ];
  const v180 = script(html, 'cs-safe-v0180');
  sources.push(['cs-safe-v0180-clinical', between(v180, '(function(){', '  // ---------- call Dr. Vega') +
    between(v180, '  // ---------- medication / IV safety ----------', '  // Tutor rescue') + '\n})();']);
  const v19 = script(html, 'cs-safe-v0190');
  sources.push(['cs-safe-v0190-clinical', between(v19, '(function(){', '  // 5) CONSULTATIONS') +
    between(v19, '  const _updateSimulationV19=updateSimulation;', '  function csSaveActiveShiftRecord(') + '\n})();']);
  const bind = script(html, 'cs-safe-v0203');
  sources.push(['cs-safe-v0203-binding', iife(between(bind, '  window.csWithPatientStateV203=function(', '  // Every nursing task'))]);
  const v3 = script(html, 'cs-rebase174-v3-safe-variants');
  sources.push(['cs-rebase174-v3-clinical', iife(between(v3, '  const V3_RESPONSE=[', '  // Patient dialogue:') +
    between(v3, '  // Different therapeutic response', '  // Append only already disclosed'))]);
  const qaIds = ['atria-peritonitis-487-disposition', 'atria-surgical-nursing-487',
    'atria-manual-monitor-iv-487', 'atria-grace-survival-487', 'atria-secondary-sepsis-bridge-487',
    'atria-critical-rescue-487', 'atria-verified-clinical-chat-487', 'atria-case-aware-pharmacology-487'];
  for (const id of qaIds) sources.push([id, script(html, id)]);
  const v412 = script(html, 'cs-v412-box-vega-audio');
  sources.push(['cs-v412-monitor-recognition', iife('const base={admin:addMonitorTherapy};\n' +
    between(v412, ' function roomToken(){', ' function mayTreat(') +
    between(v412, ' const diminutives={', ' mentorMessageIntent=function(') +
    between(v412, ' addMonitorTherapy=function(text){', ' const oldPatient=base.reply;'))]);
  sources.push(['ns421-clinical-state', script(html, 'ns421-clinical-state')]);
  const v422 = script(html, 'ns422-vega-rescue');
  sources.push(['ns422-treatment-context', between(v422, '(function(){', ' function say(') + '\n})();']);
  sources.push(['ns423-evolution', script(html, 'ns423-evolution')]);

  // Assert the real order rather than replaying an old probe's chosen order.
  const orderedIds = ['cs-safe-v0180', 'cs-safe-v0190', 'cs-safe-v0203', 'cs-rebase174-v3-safe-variants',
    ...qaIds, 'cs-v412-box-vega-audio', 'ns421-clinical-state', 'ns422-vega-rescue', 'ns423-evolution'];
  let prior = -1;
  for (const id of orderedIds) {
    const index = html.indexOf('<script id="' + id + '">');
    assert(index > prior, 'generated clinical execution order: ' + id);
    prior = index;
  }
  const activeClockSource = script(html, 'cs-v410-modes');
  const clockSource = script(baseClinicalHtml, 'cs-v410-modes');
  for(const rule of ['hours=Math.min(24,Math.floor(elapsedMs()/60000))','24 minutos reales, equivalentes a 24 horas'])assert(activeClockSource.includes(rule),'active guard preserves clinical time rule: '+rule);
  assert(clockSource.includes('hours=Math.min(24,Math.floor(elapsedMs()/60000))'), 'actual displayed guard clock');
  assert(clockSource.includes('24 minutos reales, equivalentes a 24 horas'), 'actual guard time rule');
  assert(sources.find(([id]) => id === 'native-tick')[1].includes('sim.gameMinute+=dt*0.12*(typing?0.25:1)'), 'actual native clock rule');
  const compiled = sources.map(([id, code]) => ({id, code, hash: sha256(code), compiled: new vm.Script(code, {filename: 'generated-487/' + id + '.js'})}));
  const result = {cases, catalogue, compiled, orderedIds, clockSourceHash: sha256(clockSource)};
  if (repoRoot === REPO_ROOT) cachedSources = result;
  return result;
}

/** Isolated native VM; no browser or production-state ownership is implied. */
export function createNativeReferenceRuntime487({caseId = NATIVE_PILOT_CASE_IDS_487[0],
  sources = loadNativeReferenceSources487(), confirmedIVCount = 1} = {}) {
  assert.equal(confirmedIVCount, 1, 'reference contract requires confirmed IV1');
  const clock = {realSeconds: 0, sequence: 0, timers: []};
  const uiCalls = [];
  const noop = () => {};
  const ctx = {
    window: {}, C: null, sim: null, CASES: structuredClone(sources.cases),
    MONITOR_THERAPY_CATALOG: structuredClone(sources.catalogue),
    document: {getElementById: () => null, querySelector: () => null,
      activeElement: null, visibilityState: 'visible', body: {classList: {contains: () => false}}},
    performance: {now: () => clock.realSeconds * 1000},
    setTimeout: (fn, ms = 0) => {
      const timer = {id: ++clock.sequence, at: clock.realSeconds + Number(ms) / 1000, fn};
      clock.timers.push(timer); return timer.id;
    },
    clearTimeout: id => { clock.timers = clock.timers.filter(t => t.id !== id); },
    console, selectedPlayMode: 'solo', shiftSession: null, sheetOpen: false, floatMode: null,
    complete: noop, nurseSay: text => uiCalls.push(String(text)),
    updateHud: noop, updateMonitorDOM: noop, refreshChatDock: noop, renderContent: noop,
    mentorReactToAdministration: () => false, processCommand: () => false,
    sendMessage: () => false, nurseNatural: () => false, orderStudy: noop,
    captureMonitorVitals: () => false, startCase: noop, csReturnToCases: noop,
    csBreakdown: () => ({}), monitorHTML: () => '', monitorAlarmLevel: () => ({level: 'ok'}),
    patient: {}, csProfile: {totalPatients: 0, soundEnabled: false},
    addGlobalChat: noop,
    finishCase: () => { throw Error('reference fixture must not close a case'); },
  };
  ctx.vitalsNow = () => ctx.sim?.liveVitals || ctx.initialLiveVitals();
  vm.createContext(ctx);
  let bootAudit;
  for (const source of sources.compiled) {
    const pharmacology = source.id === 'atria-case-aware-pharmacology-487';
    const before = pharmacology ? {functions: ['defaultDoseForTherapy', 'therapyEffectTotals', 'updateSimulation', 'addMonitorTherapy'].map(k => ctx[k]),
      catalogue: JSON.stringify(ctx.MONITOR_THERAPY_CATALOG), cases: JSON.stringify(ctx.CASES)} : null;
    source.compiled.runInContext(ctx, {timeout: 5000});
    if (pharmacology) {
      assert.equal(ctx.MONITOR_THERAPY_CATALOG.length, 30, 'real post-initializer catalogue has30 entries');
      assert(ctx.MONITOR_THERAPY_CATALOG.some(x => x.id === 'anticoagulation'), 'real startup initializer adds heparin');
      const missing = ctx.MONITOR_THERAPY_CATALOG.filter(t => !PHARMA_RULES_487[t.id] && !t.pharmacology).map(t => t.id);
      assert.deepEqual(missing, ['anticoagulation'], 'unsupported actual catalogue entry');
      assert.equal(ctx.window.csPharm487Boot?.status, 'rejected', 'actual startup rejects unsupported heparin');
      assert.equal(ctx.window.csPharm487Boot?.catalogCompatible, false);
      assert.equal(ctx.window.__csPharmacology487, undefined);
      assert.equal(ctx.window.csPharm487, undefined);
      ['defaultDoseForTherapy', 'therapyEffectTotals', 'updateSimulation', 'addMonitorTherapy'].forEach((k, i) =>
        assert.equal(ctx[k], before.functions[i], 'pharmacology rejection preserves ' + k));
      assert.equal(JSON.stringify(ctx.MONITOR_THERAPY_CATALOG), before.catalogue);
      assert.equal(JSON.stringify(ctx.CASES), before.cases);
      bootAudit = {catalogueSize: 30, missingDefinitions: missing, boot: plain(ctx.window.csPharm487Boot),
        rejectionPreservesNativeEndpoints: true,
        order: 'cs-safe-v0190 immediate initializer before atria-case-aware-pharmacology-487 before ns423-evolution'};
    }
  }
  ctx.C = ctx.CASES.find(c => c.id === caseId);
  assert(ctx.C, 'actual existing case: ' + caseId);
  ctx.sim = ctx.freshSim();
  ctx.sim.venousAccessCount = 1;
  ctx.sim.venousAccessTypes = ['confirmed QA fixture peripheral IV'];
  ctx.sim.patientInstance = {uid: 'native-reference-' + caseId};
  // Only variant inputs are fixed; all actual response/evolution wrappers run.
  ctx.sim.__csV19Init = true;
  ctx.sim.variant = {label: 'QA deterministic native baseline', index: 1};
  ctx.sim.clinicalV3 = {response: {id: 'typical', factor: 1}, trajectory: {id: 'typical', factor: 1},
    complication: {offset: {}}, createdAtMinute: 0};
  return {ctx, clock, bootAudit, uiCalls, sources};
}

function flushTimers(runtime) {
  const {clock} = runtime;
  let executed = 0;
  while (true) {
    clock.timers.sort((a, b) => a.at - b.at || a.id - b.id);
    if (!clock.timers.length || clock.timers[0].at > clock.realSeconds + 1e-9) return;
    const timer = clock.timers.shift();
    timer.fn();
    assert(++executed <= 100, 'bounded virtual timer callbacks');
  }
}

/** Advance through the actual native updateSimulation; never assign gameMinute. */
export function advanceNativeReference487(runtime, toNativeMinute) {
  finiteNonnegative(toNativeMinute, 'toNativeMinute');
  const {ctx, clock} = runtime;
  assert(toNativeMinute >= ctx.sim.gameMinute - 1e-8, 'native reference cannot reverse time');
  const toRealSeconds = nativeToClinicalMinutes487(toNativeMinute);
  while (clock.realSeconds < toRealSeconds - 1e-9) {
    let dt = Math.min(NATIVE_CLOCK_487.integrationRealSeconds, toRealSeconds - clock.realSeconds);
    const nextTimer = Math.min(...clock.timers.map(t => t.at));
    if (nextTimer > clock.realSeconds + 1e-9) dt = Math.min(dt, nextTimer - clock.realSeconds);
    clock.realSeconds += dt;
    ctx.updateSimulation(dt);
    flushTimers(runtime);
  }
  assert(Math.abs(ctx.sim.gameMinute - toNativeMinute) < 1e-8, 'native clock matches explicit no-typing conversion');
  return snapshotNativeReference487(runtime);
}

/** A true monitor order: returns acceptance; administration remains asynchronous. */
export function orderNativeReference487(runtime, {id, text}) {
  const {ctx} = runtime;
  assert.equal(ctx.sim.venousAccessCount, 1, 'confirmed IV remains1');
  const recognized = ctx.findMonitorTherapy(text);
  assert.equal(recognized?.id, id, 'actual late native recognizer: ' + text);
  const before = ctx.sim.administrationLog.length;
  assert.equal(ctx.addMonitorTherapy(text), true, 'native accepts monitor order: ' + text);
  assert.equal(ctx.sim.administrationLog.length, before, 'order acceptance is not fabricated administration');
  assert(ctx.sim.pendingTherapies.has(id), 'actual V19 preparation pending: ' + id);
}

export function snapshotNativeReference487(runtime) {
  const {ctx, clock} = runtime, s = ctx.sim;
  return plain({nativeMinute: s.gameMinute, clinicalMinute: nativeToClinicalMinutes487(s.gameMinute),
    realSeconds: clock.realSeconds, vitals: s.liveVitals, physiology: s.phys,
    effects: ctx.therapyEffectTotals(), toxicity: ctx.medicationSafetyOffsets(),
    fluidMl: s.therapyTotals.fluidMl, active: [...s.monitorTherapies.keys()],
    pending: [...(s.pendingTherapies?.keys() || [])], administrationCount: s.administrationLog.length,
    confirmedIV: s.venousAccessCount, hypoperfusionNativeMinutes: s.nsHypoperfusionMinutes || 0,
    graceActiveRealSeconds: s.csGrace487?.activeSeconds || 0,
    criticalSupportRealSeconds: s._criticalSupport487?.elapsedSeconds || 0,
    fatalExposureNativeMinutes: s._fatalExposure || 0, patientDied: !!s.patientDied, caseEnded: !!s.caseEnded});
}

export function runNativeReferenceTrajectory487(caseId, scenario, {sources = loadNativeReferenceSources487(),
  timestamps = NATIVE_PILOT_TIMES_487} = {}) {
  if (typeof scenario === 'string') scenario = NATIVE_PILOT_SCENARIOS_487.find(s => s.id === scenario);
  assert(scenario, 'known native scenario');
  const runtime = createNativeReferenceRuntime487({caseId, sources});
  const initial = snapshotNativeReference487(runtime), points = [];
  let next = 0;
  for (const at of timestamps) {
    while (next < scenario.orders.length && scenario.orders[next].atNativeMinute <= at) {
      const entry = scenario.orders[next++];
      advanceNativeReference487(runtime, entry.atNativeMinute);
      orderNativeReference487(runtime, entry);
    }
    points.push(advanceNativeReference487(runtime, at));
  }
  const administrations = runtime.ctx.sim.administrationLog.map(a => ({id: a.id,
    nativeMinute: a.m, clinicalMinute: nativeToClinicalMinutes487(a.m),
    doseDisplay: a.doseDisplay, count: a.count, defaultApplied: a.defaultApplied,
    dose: plain(runtime.ctx.sim.monitorTherapies.get(a.id).dose)}));
  assert.equal(administrations.length, scenario.orders.length, 'every pilot order actually administered');
  return {caseId, scenarioId: scenario.id, orders: plain(scenario.orders), initial, administrations, points};
}

export function generateNativeReference487({sources = loadNativeReferenceSources487()} = {}) {
  const audit = createNativeReferenceRuntime487({sources});
  const trajectories = NATIVE_PILOT_CASE_IDS_487.flatMap(caseId => NATIVE_PILOT_SCENARIOS_487.map(s =>
    runNativeReferenceTrajectory487(caseId, s, {sources})));
  return {schema: 'atria-native-reference-487/v1', testOnly: true,
    baselineCommit: '7d761ee69ebd05bd8a403babae104e5ca78b26d6',
    clock: plain(NATIVE_CLOCK_487), deterministicVariant: {responseFactor: 1, trajectoryFactor: 1,
      randomV19Offsets: false, randomV3ComplicationOffsets: false},
    scope: {fullBrowser: false, android: false, mortalityAcceptance: false,
      included: INCLUDED_SCOPE_487, excluded: EXCLUDED_SCOPE_487, sourceOrder: sources.orderedIds,
      extractedSourceHashes: Object.fromEntries(sources.compiled.map(s => [s.id, s.hash])),
      guardClockSourceHash: sources.clockSourceHash},
    startup: audit.bootAudit, catalogueIds: audit.ctx.MONITOR_THERAPY_CATALOG.map(t => t.id),
    caseEngines: NATIVE_PILOT_CASE_IDS_487.map(id => ({id,
      engine: audit.ctx.CASES.find(c => c.id === id).physiology?.engine || null})),
    timestampsNativeMinutes: [...NATIVE_PILOT_TIMES_487],
    timestampsClinicalMinutes: NATIVE_PILOT_TIMES_487.map(nativeToClinicalMinutes487), trajectories};
}

export function readFrozenNativeReference487() {
  return JSON.parse(fs.readFileSync(NATIVE_REFERENCE_PATH_487, 'utf8'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const generated = generateNativeReference487();
  if (process.argv.includes('--write')) fs.writeFileSync(NATIVE_REFERENCE_PATH_487, JSON.stringify(generated, null, 2) + '\n');
  console.log(JSON.stringify({testOnly: true, catalogue: generated.startup.catalogueSize,
    boot: generated.startup.boot.status, trajectories: generated.trajectories.length,
    points: generated.trajectories.reduce((n, t) => n + t.points.length, 0),
    clock: generated.clock.comparison, frozenWritten: process.argv.includes('--write')}));
}
