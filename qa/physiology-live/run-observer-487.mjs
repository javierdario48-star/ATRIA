/** Reproducible current-code nursing journeys; VM only, never game content. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {NATIVE_PILOT_CASE_IDS_487, NATIVE_PILOT_SCENARIOS_487}
  from '../physiology-pilot/native-reference-487.mjs';
import {createLiveNativeJourney487, advanceLiveNativeJourney487, nativeObserverPort487, serializeNativePatient487}
  from './native-journey-487.mjs';
import {apply487} from '../../src/integration/apply-487.js';
import {PHYSIOLOGY_QA_FILES_487} from '../../src/integration/physiology-qa-bootstrap-487.js';
import {installPhysiologyQAObserver487} from '../../src/integration/physiology-qa-observer-487.js';

const root = new URL('../../', import.meta.url);
const times = [0, .5, 1, 2, 5, 15, 30, 60, 125];
const sources = [...PHYSIOLOGY_QA_FILES_487.map(x => 'src/' + x),
  'src/integration/physiology-qa-bootstrap-487.js', 'qa/physiology-live/native-journey-487.mjs',
  'qa/physiology-live/run-observer-487.mjs', 'qa/physiology-pilot/native-reference-487.mjs'];
const sha256 = input => createHash('sha256').update(input).digest('hex');
const sourceHashes = Object.fromEntries(sources.map(path => [path, sha256(fs.readFileSync(new URL(path, root)))]));
sourceHashes['generated-current-html'] = sha256(apply487(fs.readFileSync(new URL('vendor/atria-4.8.6/index.html', root), 'utf8')));
function order(runtime, scenario) {
  if (scenario.orders.length) runtime.ctx.nurseNatural('Enfermera ' + scenario.orders.map(o => o.text).join(' '));
}
const trajectories = [];
let comparisons = 0;
for (const caseId of NATIVE_PILOT_CASE_IDS_487) {
  for (const scenario of NATIVE_PILOT_SCENARIOS_487) {
    const native = createLiveNativeJourney487(caseId), observed = createLiveNativeJourney487(caseId);
    const observer = installPhysiologyQAObserver487(nativeObserverPort487(observed));
    order(native, scenario); order(observed, scenario);
    assert.equal(observer.report().receipts.length, 0, 'a pending order is not administration');
    const points = []; let last = 0;
    for (const at of times) {
      advanceLiveNativeJourney487(native, at - last); advanceLiveNativeJourney487(observed, at - last); last = at;
      assert.equal(serializeNativePatient487(observed.ctx.sim), serializeNativePatient487(native.ctx.sim), 'native data changed: ' + caseId + '/' + scenario.id);
      const report = observer.report();
      assert.equal(report.status, 'observing', caseId + '/' + scenario.id + ': ' + report.reason);
      assert.equal(report.comparisonComplete, true); comparisons++;
      points.push({...report.last.sample, receipts: report.receipts.length,
        pendingNative: [...(observed.ctx.sim.pendingTherapies?.keys() || [])],
        physiology: Object.fromEntries(['circulatingVolumeMl', 'interstitialFluidMl', 'perfusion',
          'vascularTone', 'pumpFunction', 'fluidOverloadRisk', 'pain', 'respiratoryDepression',
          'renalFunction', 'hepaticFunction', 'inflammation', 'infectionBurden', 'sourceControlled',
          'cumulativeUrineMl', 'cumulativeBloodLossMl', 'administeredFluidMl'].map(k => [k, report.last.state[k]]))});
    }
    const report = observer.report();
    assert.deepEqual(report.receipts.map(x => x.treatmentId).sort(), scenario.orders.map(x => x.id).sort());
    trajectories.push({caseId, scenarioId: scenario.id, orders: scenario.orders.map(x => x.text),
      receipts: report.receipts, reportBytes: Buffer.byteLength(JSON.stringify(report)), points});
    observer.stop();
  }
}

// Measure the added integration path, not catalogue scaling or physical mobile.
const pair = [createLiveNativeJourney487(), createLiveNativeJourney487()];
const timedObserver = installPhysiologyQAObserver487(nativeObserverPort487(pair[1]));
const five = {orders: NATIVE_PILOT_SCENARIOS_487.slice(1, 6).flatMap(s => s.orders)};
for (const r of pair) {order(r, five); advanceLiveNativeJourney487(r, 1);}
for (let i = 0; i < 100; i++) for (const r of pair) advanceLiveNativeJourney487(r, 1 / 60);
const durations = [[], []];
for (let i = 0; i < 600; i++) {
  for (const index of i % 2 ? [1, 0] : [0, 1]) {
    const start = performance.now(); advanceLiveNativeJourney487(pair[index], 1 / 60);
    durations[index].push(performance.now() - start);
  }
}
assert.equal(serializeNativePatient487(pair[0].ctx.sim), serializeNativePatient487(pair[1].ctx.sim));
const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)];
const timing = durations.map((values, i) => ({observer: !!i, patients: 1, activeTreatments: 5,
  ticks: values.length, tickRealSeconds: 1 / 60, p50Ms: quantile(values, .5), p95Ms: quantile(values, .95),
  meanMs: values.reduce((a, b) => a + b, 0) / values.length, maxMs: Math.max(...values)}));
const retainedReport = timedObserver.report();
assert.equal(retainedReport.status, 'observing', retainedReport.reason);
if (global.gc) global.gc();
const memory = {gcAvailable: !!global.gc, processHeapUsedBytes: process.memoryUsage().heapUsed,
  processRssBytes: process.memoryUsage().rss,
  measuredReportBytes: Buffer.byteLength(JSON.stringify(retainedReport)),
  maxTrajectoryReportBytes: Math.max(...trajectories.map(t => t.reportBytes)),
  sampleCapacity: 256, receiptCapacity: 2048,
  scope: 'process heap includes VM/native engines and retained results; JSON sizes are serialized QA reports, not incremental observer heap'};
timedObserver.stop();
const result = {schemaVersion: 1, initialHead: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
  sourceHashes, clinicalValidated: false, physicalAndroid: false, browserExecuted: false,
  realEffectOwner: 'native', liveStateWrites: 0, clockUnit: 'active real second = clinical minute',
  times, trajectories, nativeStateEqualityComparisons: comparisons, timing, memory,
  scope: 'actual generated native/nursing clinical functions in deterministic VM; DOM, pathfinding, voice recognition, network and automatic closure excluded'};
const fmt = x => Number(x).toFixed(1);
const vitals = p => `${fmt(p.sys)}/${fmt(p.dia)} · ${fmt(p.hr)} · ${fmt(p.rr)} · ${fmt(p.spo2)}`;
const lines = ['# Checkpoint 1 — Comparación del flujo clínico observado', '',
  `Base: \`${result.initialHead}\`. 24 trayectorias de enfermería actual, 216 comparaciones de estado nativo idéntico con observador ON/OFF, incluidas colecciones Map/Set. 9 tiempos hasta 125 minutos clínicos/125 segundos activos, dentro de protección temprana. Sin escritores clínicos nuevos ni validación médica de magnitudes.`, '',
  'PA sistólica/diastólica · FC · FR · SpO₂. Las diferencias detectan discrepancias; no prueban que B1 sea clínicamente superior. Los casos HDA/CIRR conservan `nativePhysiology:null` porque el modelo nativo no expone sus variables latentes.', '',
  '| Caso | Escenario | Actual a 125 min | Sombra a 125 min | Δ PAM | Δ SpO₂ | Recibos |',
  '|---|---|---|---|---:|---:|---:|'];
for (const t of trajectories) {const p = t.points.at(-1); lines.push(`| ${t.caseId} | ${t.scenarioId} | ${vitals(p.native)} | ${vitals(p.experimental)} | ${fmt(p.delta.map)} | ${fmt(p.delta.spo2)} | ${t.receipts.length} |`);}
lines.push('', '## Rendimiento medido', '',
  `Node ${process.version}, ${process.platform}/${process.arch}; 100 ticks de calentamiento y 600 muestras intercaladas por variante. Un paciente/cinco tratamientos, motor nativo y enfermería incluidos. No es una medida de FPS, Android/iOS físico ni una garantía de latencia móvil.`, '',
  '| Variante | p50 ms | p95 ms | Media ms | Máximo ms |', '|---|---:|---:|---:|---:|');
for (const t of timing) lines.push(`| ${t.observer ? 'Sombra ON' : 'Sombra OFF'} | ${t.p50Ms.toFixed(4)} | ${t.p95Ms.toFixed(4)} | ${t.meanMs.toFixed(4)} | ${t.maxMs.toFixed(4)} |`);
lines.push('', `Reporte representativo: ${memory.measuredReportBytes} bytes JSON; máximo al cierre de estas trayectorias: ${memory.maxTrajectoryReportBytes} bytes JSON. Heap del proceso trasGC: ${memory.processHeapUsedBytes} bytes; incluye fixtures/resultados y no permite atribuir todo al observador. Historial de muestras acotado a256 y recibos a2048; al exceder el ledger, se detiene con diagnóstico.`, '',
  '## Interpretación y reproducción', '',
  '- Las cinco intervenciones comparten los siete mecanismos B1 existentes. El núcleo y sus coeficientes no cambian. La matriz incluye ausencia de tratamiento, intervenciones individuales y combinaciones; las variantes de daño/dosis/función orgánica continúan cubiertas por los oráculos B1 aprobados.',
  '- Las órdenes aún en preparación tienen cero recibos y cero efecto nuevo. El evento se origina después de `recordAdministration`, con dosis histórica y acceso IV confirmado. Una vía omitida sigue siendo una hipótesis explícita B1; una vía explícita desconocida/conflictiva impide comparar. Enfermería puede descartar calificadores de la frase antes del ledger; no hay prueba física de vía ni prueba del reconocimiento de voz.',
  '- PERI-SEC conserva infección/foco sin controlar; HDA sigue perdiendo sangre; CIRR no se cura por diuresis. Presión/SpO₂ mejores no equivalen a resolver la enfermedad. No hay Hb, CO₂, electrolitos, coagulación ni mecanismo antimicrobiano nuevo.',
  '- El modelo de morfina comparte analgesia/SNC y su pico requiere calibración; las magnitudes iniciales latentes de HDA/CIRR son supuestos B1. Las expectativas clínicas independientes y fuentes permanecen en `qa/ATRIA_487_PHYSIOLOGY_PILOT_EVIDENCE.md` y `qa/physiology-pilot/clinical-expectations-487.json`.',
  '- Suspensión o cambios de infusión que eviten el recibo nativo, pérdida de ledger, cambio de paciente/ownership, pausa oculta o salto de reloj detienen la sombra. No se fabrica una suspensión ni se mantiene una comparación silenciosamente incompleta.',
  '- `node --expose-gc qa/physiology-live/run-observer-487.mjs` calcula y comprueba sin guardar. `--write` guarda este informe y `observer-487.json`; nunca reemplaza snapshots B1/nativos aprobados.', '');
if (process.argv.includes('--write')) {
  fs.writeFileSync(new URL('observer-487.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(new URL('../ATRIA_487_PHYSIOLOGY_LIVE_COMPARISON.md', import.meta.url), lines.join('\n'));
}
console.log('LIVE QA JOURNEY COMPARISON PASS', JSON.stringify({trajectories: trajectories.length,
  points: comparisons, clinicalValidated: false, timing, memory}));
