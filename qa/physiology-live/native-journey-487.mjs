/** QA VM, not a browser. Extends the approved native reference with the actual
 * generated nursing queue, procedure completions and dispatch adapters.
 * Pathfinding/DOM/network/voice recognition remain outside this fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../../src/integration/apply-487.js';
import {loadNativeReferenceSources487, createNativeReferenceRuntime487}
  from '../physiology-pilot/native-reference-487.mjs';
const generated = apply487(fs.readFileSync(new URL('../../vendor/atria-4.8.6/index.html', import.meta.url), 'utf8'));
const between = (from, to) => {
  const a = generated.indexOf(from), b = generated.indexOf(to, a + from.length);
  assert(a >= 0 && b > a, 'current generated nursing boundary: ' + from);
  return generated.slice(a, b);
};
const ids = ['atria-phase4-composite-orders', 'atria-phase7-nursing-receipts',
  'atria-nurse-voice-routing-487', 'atria-nurse-execution-487'];
const baseline = loadNativeReferenceSources487();
const nativeNursing = ['qa-native-nursing',
  // Permission and study transport are explicitly excluded from this local
  // five-treatment VM, as in the existing native nursing journey fixture.
  'function inferRecipient(){return null;} function mayTreat(){return true;} function findStudy(){return null;}\n' +
  generated.match(/^function nurseNatural\(q\)\{.*\}$/m)[0] + '\n' +
  between('function queueNurse(task,quiet=false){', 'function updateWardNurses(dt){')];
const procedures = between('function csQueueMonitor(){', '// Natural language to nurse.');
// Actual V19 disposition writer in its own lexical scope. Rewards, career and
// closure UI remain excluded; no replacement clinical handoff is fabricated.
const handoff=between('  const DESTS={','  function csOpenDisposition(');
const compiled = [nativeNursing, ...baseline.compiled.map(x => {
  // Keep procedural functions inside their real V18 lexical scope. The
  // approved physiology reference deliberately excluded that procedure block.
  if(x.id==='cs-safe-v0190-clinical'){
    assert(x.code.endsWith('\n})();'),'verified V19 clinical closing boundary');
    return [x.id,x.code.slice(0,-7)+handoff+'\n})();'];
  }
  if (x.id !== 'cs-safe-v0180-clinical') return [x.id, x.code];
  assert(x.code.endsWith('\n})();'), 'verified V18 clinical closing boundary');
  return [x.id, x.code.slice(0, -7) + procedures + '\n})();'];
})];
for (const id of ids) {
  const marker = '<script id="' + id + '">';
  assert.equal(generated.split(marker).length, 2, 'one current nursing adapter: ' + id);
  const position = generated.indexOf(marker);
  const before = compiled.findIndex(([name]) => name.startsWith('atria-') && generated.indexOf('<script id="' + name + '">') > position);
  assert(before >= 0, 'nursing adapter has a verified later integration boundary');
  compiled.splice(before, 0, [id, generated.split(marker)[1].split('</script>')[0]]);
}
const morphineMarker='<script id="atria-morphine-487">';
assert.equal(generated.split(morphineMarker).length,2,'single integrated morphine owner');
compiled.push(['atria-morphine-487',generated.split(morphineMarker)[1].split('</script>')[0]]);
const careMarker='<script id="atria-urgent-care-487">';
assert.equal(generated.split(careMarker).length,2,'single native urgent-care guard');
compiled.push(['atria-urgent-care-487',generated.split(careMarker)[1].split('</script>')[0]]);
const closureMarker='<script id="atria-case-completion-487">';
assert.equal(generated.split(closureMarker).length,2);
compiled.push(['atria-case-completion-487',generated.split(closureMarker)[1].split('</script>')[0]]);
const sources = {...baseline, compiled: compiled.map(([id, code]) => ({id, code,
  compiled: new vm.Script(code, {filename: 'generated-live-qa/' + id + '.js'})}))};

// JSON alone discards Map/Set contents. Tags work across VM realms, unlike
// instanceof; preserve native insertion order and undefined/nonnumeric values.
export function serializeNativePatient487(patient) {
  return JSON.stringify(patient, (_, value) => {
    const tag = Object.prototype.toString.call(value);
    if (tag === '[object Map]') return {$qaType: 'Map', entries: [...value]};
    if (tag === '[object Set]') return {$qaType: 'Set', values: [...value]};
    if (value === undefined) return {$qaType: 'undefined'};
    if (typeof value === 'number' && !Number.isFinite(value)) return {$qaType: 'number', value: String(value)};
    if (typeof value === 'function' || typeof value === 'symbol') throw Error('native patient projection cannot silently omit ' + typeof value);
    return value;
  });
}

export function createLiveNativeJourney487(caseId = 'HDA-001', {confirmedIV = 1} = {}) {
  const runtime = createNativeReferenceRuntime487({caseId, sources});
  const {ctx} = runtime;
  const noop = () => {};
  Object.assign(ctx, {nurse: {task: null, queue: [], path: [], pathIndex: 0, state: 'idle', returnTile: [8, 14]},
    wardNurses: [], player: {bubble: '', bubbleUntil: 0}, chatRole: 'nurse', pendingAddress: null,
    pathTo: () => false, advanceActor: () => true, toast: noop, csPlaySound: noop,
    formatVitalsInline: () => '', recordVitals: noop});
  ctx.window.nsMayExamine = () => true;
  ctx.document.createElement=()=>({style:{},onclick:null,textContent:''});
  ctx.document.body.appendChild=noop;
  ctx.sim.patientInstance.bed = {approach: [24, 17], label: 'QA box'};
  ctx.sim.venousAccessCount = confirmedIV;
  ctx.sim.venousAccessTypes = Array(confirmedIV).fill('confirmed fixture peripheral IV');
  ctx.sim.chats ||= {nurse: []};
  return runtime;
}

export function advanceLiveNativeJourney487(runtime, realSeconds, {typing = false, updateNurse = true, dt = 1 / 60} = {}) {
  assert(realSeconds >= 0 && dt > 0);
  const {ctx, clock} = runtime, end = clock.realSeconds + realSeconds;
  ctx.document.activeElement = typing ? {id: 'dieInput'} : null;
  while (clock.realSeconds < end - 1e-10) {
    let step = Math.min(dt, end - clock.realSeconds);
    const next = Math.min(...clock.timers.map(t => t.at));
    if (next > clock.realSeconds + 1e-10) step = Math.min(step, next - clock.realSeconds);
    clock.realSeconds += step; ctx.updateSimulation(step);
    if (updateNurse) ctx.updateNurse(step);
    let callbacks = 0;
    while (true) {
      clock.timers.sort((a, b) => a.at - b.at || a.id - b.id);
      if (!clock.timers.length || clock.timers[0].at > clock.realSeconds + 1e-9) break;
      clock.timers.shift().fn(); assert(++callbacks <= 100, 'bounded timer callbacks');
    }
  }
}

export function nativeObserverPort487(runtime) {
  const {ctx} = runtime;
  return {read: () => ({patient: ctx.sim, caseDef: ctx.C,
      mode: ctx.selectedPlayMode, hidden: ctx.document.visibilityState === 'hidden'}),
    getAdministration: () => ctx.recordAdministration, setAdministration: fn => {ctx.recordAdministration = fn;},
    getUpdate: () => ctx.updateSimulation, setUpdate: fn => {ctx.updateSimulation = fn;}};
}


/**
 * QA only: the very same generated V18 finishCase and V19 scoring/career
 * functions, restored ahead of the existing peritonitis and general handoff
 * wrappers. This is NOT a fake "caseEnded=true" closure or mock XP formula.
 * DOM, audio and profile persistence are replaced by in-memory sinks ONLY.
 */
export function createNativeXPJourney487(caseId){
 const score=between('  function csEnsureV19(){','  let csActor')+'\n'+
  between('  function csCriticalCase(){','  function csDebriefMoments(){');
 const baseFinish=between("finishCase=function(reason='completed'){",'function csHasTherapy(id){');
 const v19Finish=between('  function csCaseClosureEligibilityV487(s=sim){','  // 9) REALER CONTINUOUS SHIFT:');
 assert(score.includes('csResultCareer=function(score,b)'),'genuine native V19 reward formula');
 assert(baseFinish.includes('sim.caseEnded=true')&&baseFinish.includes('csResultCareer(score,b)'),
  'genuine V18 closure must mark ended AND invoke career scoring');
 const closureSources=[];
 for(const source of compiled){
  if(source[0]==='cs-safe-v0180-clinical')closureSources.push(source,
    ['qa-real-v18-finish',baseFinish]);
  else if(source[0]==='cs-safe-v0190-clinical')closureSources.push(source,
    ['qa-real-v19-score',score],
    ['qa-real-v19-finish',v19Finish]);
  else closureSources.push(source);
 }
 const tailored={...sources,compiled:closureSources.map(([id,code])=>({
  id,code,compiled:new vm.Script(code,{filename:'generated-full-closing-qa/'+id+'.js'})
 }))};
 // Context variables used by the genuine source, initialized by the fixture.
 // They do NOT supply a scoring formula or directly set caseEnded/XP.
 const fixture='var CS_XP_PER_LEVEL=200;'+
  'var csProfile={xp:0,reputation:50,totalPatients:0,safePatients:0,'+
  'criticalSafePatients:0,soloPatients:0,apprenticePatients:0,shiftPatients:0,'+
  'streak:0,bestStreak:0,deathsAttributable:0,bestScore:0,recentScores:[]};'+
  'function csLevel(xp=csProfile?.xp||0){return 1+Math.floor(Math.max(0,xp)/CS_XP_PER_LEVEL)}'+
  'function csSaveProfile(){} function csCheckCoatUnlock(){return false}'+
  'function csPlaySound(){} function csRefreshProfileSurfaces(){}'+
  'function csShowOutcome(){} function csCloseOutcome(){}'+
  'function csFinishHTML(){return "<div>QA: result screen disabled</div>"}';
 tailored.compiled.unshift({id:'qa-in-memory-profile-ui',code:fixture,
  compiled:new vm.Script(fixture,{filename:'qa-in-memory-profile-ui.js'})});
 const rt=createNativeReferenceRuntime487({caseId,sources:tailored}),{ctx}=rt;
 const noop=()=>{};
 Object.assign(ctx,{nurse:{task:null,queue:[],path:[],pathIndex:0,state:'idle',returnTile:[8,14]},
  wardNurses:[],player:{bubble:'',bubbleUntil:0},chatRole:'nurse',pendingAddress:null,
  pathTo:()=>false,advanceActor:()=>true,toast:noop,csPlaySound:noop,
  formatVitalsInline:()=>'',recordVitals:noop,csRefreshProfileSurfaces:noop,
  csShowOutcome:noop,csCloseOutcome:noop});
 ctx.window.nsMayExamine=()=>true;
 ctx.document.createElement=()=>({style:{},textContent:'',appendChild:noop,
  classList:{add:noop,remove:noop}});
 ctx.document.body.appendChild=noop;
 ctx.sim.patientInstance.bed={approach:[24,17],label:'QA box'};
 ctx.sim.venousAccessCount=1;ctx.sim.venousAccessTypes=['QA confirmed IV'];
 ctx.sim.chats||={nurse:[]};
 return rt;
}
