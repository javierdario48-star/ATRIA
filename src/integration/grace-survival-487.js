import {csGraceState487,csMissingAdminRescue487} from '../clinical/grace-survival-487.js';
export function applyGraceSurvival487(html){
 if(html.includes('id="atria-grace-survival-487"'))throw Error('duplicate apprentice grace adapter');
 const source=String.raw`<script id="atria-grace-survival-487">
(function(){
 if(window.__atriaGrace487)return;window.__atriaGrace487=true;
 ${csGraceState487.toString()}
 ${csMissingAdminRescue487.toString()}
 // Wrap the native fatal-rescue predicate, not physiology, nursing or the death UI.
 const nativeDeathPredicate=csDeathRescueMissing;
 csDeathRescueMissing=function(v,map){
  const state=sim?.csGrace487;
  if(state?.enabled&&csGraceState487(sim,C,state.activeSeconds).protected)return false;
  if(state?.enabled&&csMissingAdminRescue487(sim,C,v,map))return true;
  return nativeDeathPredicate.apply(this,arguments);
 };
 const nativeUpdate=updateSimulation;
 updateSimulation=function(dt){
  if(sim&&sim.playMode==='apprentice'&&!sim.caseEnded){
   const state=sim.csGrace487||(sim.csGrace487={enabled:true,activeSeconds:0});
   // dt is the real 1/60-second fixed-frame step; gameMinute accelerates independently.
   // The frame loop stops when play stops; hidden/background time earns no protection.
   if(document.visibilityState!=='hidden')state.activeSeconds+=
    Math.max(0,Math.min(0.25,Number(dt)||0));
  }
  return nativeUpdate.apply(this,arguments);
 };
 window.csGraceSurvival487={get:(p=sim,c=C)=>csGraceState487(p,c,p?.csGrace487?.activeSeconds||0)};
})();
</script>`;
 return html.replace('</body>',source+'</body>');
}