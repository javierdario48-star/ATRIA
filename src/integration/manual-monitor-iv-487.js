// Late additive adapter: manual monitor prescriptions must not disappear because
// native IV access is still being placed. Never fabricates administrations.
export function applyManualMonitorIV487(html){
 if(html.includes('id="atria-manual-monitor-iv-487"'))throw Error('duplicate manual-IV adapter');
 const runtime=String.raw`<script id="atria-manual-monitor-iv-487">
(function(){
 if(window.__csManualMonitorIV487)return;window.__csManualMonitorIV487=true;
 const nativeAdministration=addMonitorTherapy;
 const ivIds=new Set(['fluid','albumin','vasopressor','transfusion','morphine','ppi',
  'ceftriaxone','metronidazole','imipenem','ceftazidime','cefoperazone','cefepime',
  'piptazo','ampicillin','amikacin','gentamicin','fluconazole','amphotericin']);
 addMonitorTherapy=function(text){
  const t=typeof findMonitorTherapy==='function'?findMonitorTherapy(text):null;
  if(!t||!ivIds.has(t.id)||!sim||sim.caseEnded||
     Number(sim.venousAccessCount||0)>0||window.nsMayExamine?.()===false)
   return nativeAdministration.apply(this,arguments);
  const uid=sim.patientInstance?.uid;
  const queue=sim.csPhase4Pending487||(sim.csPhase4Pending487=[]);
  const already=queue.some(x=>x.id===t.id&&x.uid===uid);
  if(!already)queue.push({id:t.id,text:String(text),uid,source:'manual-monitor',
    orderedGameMinute:sim.gameMinute});
  // A cannulation is still a genuine bedside procedure; do not mark it placed.
  window.csQueueIV?.(1);
  const status=t.label+': INDICADO, NO ADMINISTRADO. Esperando acceso venoso real.';
  setMonitorFeedback(status,'warn');
  if(!already)nurseSay('Doctor, '+status+' Lo iniciaré tras la canalización sin repetir la orden.');
  // Correct clinical semantics: successfully retained ORDER, not a dose.
  sim.events?.push?.({m:sim.gameMinute,t:'Pendiente de acceso: '+t.label});
  return true;
 };
})();
</script>`;
 return html.replace('</body>',runtime+'</body>');
}
