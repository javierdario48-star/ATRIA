import {csGraceState487,csMissingAdminRescue487} from '../clinical/grace-survival-487.js';
export function applyGraceSurvival487(html){
 if(html.includes('id="atria-grace-survival-487"'))throw Error('duplicate apprentice grace adapter');
 // Source-level safety check at the actual irreversible death transition.
 // This is essential: wrapping a rescue predicate alone does not protect
 // against a cached/overwritten predicate or accumulated fatal exposure.
 const irreversible='if((sim._fatalExposure||0)>=1.35&&!sim._deathTriggered){';
 const guarded='if((sim._fatalExposure||0)>=1.35&&!sim._deathTriggered&&!window.csEarlyCriticalDeathGuard487?.(sim,C)){';
 if(html.split(irreversible).length!==2)throw Error('native fatal boundary not uniquely located');
 html=html.replace(irreversible,guarded);
 const source=String.raw`<script id="atria-grace-survival-487">
(function(){
 if(window.__atriaGrace487)return;window.__atriaGrace487=true;
 ${csGraceState487.toString()}
 ${csMissingAdminRescue487.toString()}
 // All four modes get the same per-patient minimum active observation time.
 // Wrap only the native fatal-rescue predicate, not the treatment engine or death UI.
 function ensureGracePatient487(p){
  if(!p||p.caseEnded||p.patientDied||
     !['apprentice','solo','coop','competitive'].includes(p.playMode))return null;
  const state=p.csGrace487||(p.csGrace487={enabled:true,activeSeconds:0,earnedCredit:0});
  // Real-device guard: do not trust accumulated simulation ticks as a wall clock.
  // Native simulation may run multiple logical updates per rendered frame.
  if(typeof performance!=='undefined'&&typeof performance.now==='function'){
    const now=performance.now();
    if(!Number.isFinite(state.csWallBornAt487))state.csWallBornAt487=now;
    state.csWallAge487=Math.max(0,(now-state.csWallBornAt487)/1000);
  }
  state.enabled=true;
  // Earned time is monotonic. Never credit an unadministered order.
  const observed=csGraceState487(p,C,state.activeSeconds);
  state.earnedCredit=Math.max(Number(state.earnedCredit)||0,Number(observed.observedCredit??observed.credit)||0);
  return state;
 }
 // The native irreversible death transition consults this *separate* gate.
 // This remains authoritative even if a later adapter overwrites the predicate.
 window.csEarlyCriticalDeathGuard487=function(p,c){
  const state=ensureGracePatient487(p);
  // Both clocks must elapse: a 120-second physical session can never be
  // mistaken for three minutes due to accelerated game/shift scheduling.
  const observed=Math.min(state?.activeSeconds??Infinity,state?.csWallAge487??Infinity);
  return !!state&&csGraceState487(p,c,observed).protected;
 };
 const nativeDeathPredicate=csDeathRescueMissing;
 csDeathRescueMissing=function(v,map){
  if(window.csEarlyCriticalDeathGuard487(sim,C))return false;
  const state=sim?.csGrace487;
  if(state?.enabled&&csMissingAdminRescue487(sim,C,v,map))return true;
  return nativeDeathPredicate.apply(this,arguments);
 };
 const nativeUpdate=updateSimulation;
 updateSimulation=function(dt){
  const p=sim,state=ensureGracePatient487(p);
  if(state&&document.visibilityState!=='hidden'){
   // Earn time only while visible; physical device time is an independent
   // hard upper bound on simulated active time, never a shortcut to death.
   if(typeof performance!=='undefined'&&typeof performance.now==='function'&&
      Number.isFinite(state.csWallBornAt487))
     state.activeSeconds=Math.min(state.activeSeconds,Math.max(0,
       (performance.now()-state.csWallBornAt487)/1000));
   // dt counts ACTIVE real time, not accelerated simulation hours.
   state.activeSeconds+=Math.max(0,Math.min(0.25,Number(dt)||0));
   ensureGracePatient487(p);
  }
  // Never carry lethal damage accumulated by a legacy pathway across the
  // protected interval. Do NOT modify vitals, drugs, diagnostics or case state.
  if(state&&window.csEarlyCriticalDeathGuard487(p,C))
   p._fatalExposure=0;
  return nativeUpdate.apply(this,arguments);
 };
 window.csGraceSurvival487={
  get:(p=sim,c=C)=>csGraceState487(p,c,p?.csGrace487?.activeSeconds||0),
  check:(p=sim,c=C)=>window.csEarlyCriticalDeathGuard487(p,c)
 };
})();
</script>`;
 return html.replace('</body>',source+'</body>');
}