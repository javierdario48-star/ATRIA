import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';
import {createLiveNativeJourney487, nativeObserverPort487} from '../../qa/physiology-live/native-journey-487.mjs';
assert(fs.existsSync(new URL('./physiology-qa-bootstrap-487.js', import.meta.url)),
  'QA observer must be available through an OFF-by-default browser entry point');
const {installPhysiologyQABootstrap487, applyPhysiologyQABootstrap487} = await import('./physiology-qa-bootstrap-487.js');
const module = await import('./physiology-qa-observer-487.js');
let checks = 0;
const check = async (name, fn) => {await fn(); checks++; console.log('QA BOOTSTRAP PASS', name);};
await check('default OFF loads nothing and preserves actual endpoint identities', async () => {
  const r = createLiveNativeJourney487(), port = nativeObserverPort487(r), target = {};
  const admin = port.getAdministration(), update = port.getUpdate(); let loads = 0;
  installPhysiologyQABootstrap487(target, port, async () => {loads++; return module;});
  assert.equal(target.csPhysiologyQA487.report().status, 'disabled');
  assert.equal(loads, 0); assert.equal(port.getAdministration(), admin); assert.equal(port.getUpdate(), update);
  await target.csPhysiologyQA487.enable();
  assert.equal(loads, 1); assert.equal(target.csPhysiologyQA487.report().status, 'observing');
  target.csPhysiologyQA487.disable();
  assert.equal(port.getAdministration(), admin); assert.equal(port.getUpdate(), update);
});
await check('disabling a pending import prevents late installation', async () => {
  const r = createLiveNativeJourney487(), port = nativeObserverPort487(r), target = {}, admin = port.getAdministration();
  let resolve;
  installPhysiologyQABootstrap487(target, port, () => new Promise(done => {resolve = done;}));
  const start = target.csPhysiologyQA487.enable();
  target.csPhysiologyQA487.disable(); resolve(module); await start;
  assert.equal(port.getAdministration(), admin);
  assert.equal(target.csPhysiologyQA487.report().status, 'disabled');
});
await check('repeated enable calls share one installation and one import', async () => {
  const r = createLiveNativeJourney487(), port = nativeObserverPort487(r), target = {}; let loads = 0;
  installPhysiologyQABootstrap487(target, port, async () => {loads++; return module;});
  await Promise.all([target.csPhysiologyQA487.enable(), target.csPhysiologyQA487.enable()]);
  assert.equal(loads, 1); assert.equal(target.csPhysiologyQA487.report().status, 'observing');
  target.csPhysiologyQA487.disable();
});
await check('missing module gives a diagnostic and leaves the game functions intact', async () => {
  const r = createLiveNativeJourney487(), port = nativeObserverPort487(r), target = {}, update = port.getUpdate();
  installPhysiologyQABootstrap487(target, port, async () => {throw Error('offline module unavailable');});
  await assert.rejects(target.csPhysiologyQA487.enable(), /offline/);
  assert.equal(target.csPhysiologyQA487.report().status, 'error'); assert.equal(port.getUpdate(), update);
});
await check('a failed restart reports its new error rather than a stale stopped session', async () => {
  const r = createLiveNativeJourney487(), port = nativeObserverPort487(r), target = {}, update = port.getUpdate();
  installPhysiologyQABootstrap487(target, port, async () => module);
  await target.csPhysiologyQA487.enable(); target.csPhysiologyQA487.disable();
  r.ctx.sim.gameMinute = 1;
  await assert.rejects(target.csPhysiologyQA487.enable(), /untreated/);
  assert.equal(target.csPhysiologyQA487.report().status, 'error');
  assert.equal(port.getUpdate(), update);
});
await check('build appends exactly one lazy entry without rewriting existing HTML', async () => {
  const base = '<html><body><script>const original=1;</script></body></html>';
  const installed = applyPhysiologyQABootstrap487(base);
  assert.equal(installed.replace(/<script id="atria-physiology-qa-487">[\s\S]*?<\/script>/, ''), base);
  assert.throws(() => applyPhysiologyQABootstrap487(installed), /duplicate/);
  const full = apply487(fs.readFileSync('vendor/atria-4.8.6/index.html', 'utf8'));
  assert.equal(full.split('<script id="atria-physiology-qa-487">').length, 2, 'browser entry is wired in current build');
  const r = createLiveNativeJourney487(), admin = r.ctx.recordAdministration, update = r.ctx.updateSimulation;
  const entry = full.split('<script id="atria-physiology-qa-487">')[1].split('</script>')[0];
  vm.runInContext(entry, r.ctx, {timeout: 1000});
  assert.equal(r.ctx.window.csPhysiologyQA487.report().status, 'disabled');
  assert.equal(r.ctx.recordAdministration, admin); assert.equal(r.ctx.updateSimulation, update);
});
console.log('PHYSIOLOGY QA BOOTSTRAP PASS', JSON.stringify({checks, defaultEnabled: false}));
