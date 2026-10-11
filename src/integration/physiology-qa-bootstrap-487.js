/** Lazy browser entry. Defining this API does not import B1 or wrap any native
 * endpoint. QA must explicitly enable it on a fresh local patient. */
export function installPhysiologyQABootstrap487(target, port, loadModule) {
  if (target.csPhysiologyQA487) return target.csPhysiologyQA487;
  let observer = null, pending = null, generation = 0, diagnostic = {status: 'disabled', shadowOnly: true};
  const api = Object.freeze({
    enable() {
      if (pending) return pending;
      if (observer?.report().status === 'observing') return Promise.resolve(observer.report());
      observer = null;
      const token = ++generation;
      diagnostic = {status: 'loading', shadowOnly: true};
      pending = (async () => {
        try {
          const module = await loadModule();
          if (token !== generation) return {status: 'cancelled', shadowOnly: true};
          observer = module.installPhysiologyQAObserver487(port);
          return observer.report();
        } catch (error) {
          if (token === generation) diagnostic = {status: 'error', shadowOnly: true, reason: String(error.message || error)};
          throw error;
        } finally {if (token === generation) pending = null;}
      })();
      return pending;
    },
    disable() {
      generation++; pending = null;
      observer?.stop();
      diagnostic = {status: 'disabled', shadowOnly: true};
    },
    report() {return observer ? observer.report() : {...diagnostic};},
  });
  target.csPhysiologyQA487 = api;
  return api;
}

// Explicit small dependency closure copied by the offline build. No bundler,
// external script, dependency installation, AI service or automatic fetch.
export const PHYSIOLOGY_QA_FILES_487 = Object.freeze([
  'integration/physiology-qa-observer-487.js', 'integration/physiology-shadow-487.js',
  'integration/pharmacology-receipts-487.js', 'clinical/clinical-clock-487.js',
  'clinical/physiology-pilot-487.js', 'clinical/physiology-pilot-definitions-487.js',
  'clinical/physiology-pilot-cases-487.js', 'clinical/pharmacology-content-487.js',
  'clinical/pharmacology-mechanisms-487.js', 'clinical/pharmacology-mechanisms-b1-487.js',
]);

export function applyPhysiologyQABootstrap487(html) {
  if (html.includes('id="atria-physiology-qa-487"')) throw Error('duplicate physiology QA entry');
  if (html.split('</body>').length !== 2) throw Error('unique physiology QA body anchor required');
  const runtime = `<script id="atria-physiology-qa-487">
(function(){
  const port = {
    read: () => ({patient: typeof sim==='undefined'?null:sim, caseDef: typeof C==='undefined'?null:C,
      mode: ['coop','competitive'].includes(typeof selectedPlayMode==='undefined'?null:selectedPlayMode)?selectedPlayMode:
        (typeof sim==='undefined'?null:sim?.playMode)||(typeof selectedPlayMode==='undefined'?null:selectedPlayMode),
      hidden: document.visibilityState==='hidden'}),
    getAdministration: () => typeof recordAdministration==='function'?recordAdministration:null,
    setAdministration: fn => {recordAdministration=fn;},
    getUpdate: () => typeof updateSimulation==='function'?updateSimulation:null,
    setUpdate: fn => {updateSimulation=fn;}
  };
  (${installPhysiologyQABootstrap487.toString()})(window,port,
    () => import('./qa-physiology/integration/physiology-qa-observer-487.js'));
})();
</script>`;
  return html.replace('</body>', runtime + '</body>');
}
