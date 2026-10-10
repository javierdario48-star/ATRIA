export function applyClinicalConfirmations487(html){
 if(html.includes('id="atria-verified-clinical-chat-487"'))throw Error('duplicate confirmed-action observer');
 const style='<style id="atria-verified-clinical-chat-style-487">'+
  '#chatDock .chatRecentLine.clinical-ok{color:#8df1b1!important;background:rgba(24,108,66,.18)!important;border-left:3px solid #39d98c!important;padding:2px 5px!important;border-radius:5px;white-space:normal!important;overflow-wrap:anywhere!important}'+
  '#chatDock .chatRecentLine.clinical-ok span{color:#8df1b1!important;font-weight:700!important}'+
  '</style>';
 const script=String.raw`<script id="atria-verified-clinical-chat-487">
(function(){
 if(window.__atriaVerifiedClinicalChat487)return;
 window.__atriaVerifiedClinicalChat487=true;
 function emit(patient,message){
  if(!patient||!message)return;
  const record=()=>{
   addGlobalChat('clinical-ok','✓ '+message);
   const box=document.querySelector?.('#chatDock .chatRecent');
   if(box&&typeof recentChatLines==='function')box.innerHTML=recentChatLines();
   else if(typeof refreshChatDock==='function'&&document.activeElement?.id!=='dieInput')
    refreshChatDock();
  };
  if(patient===sim)record();
  else if(typeof window.csWithPatientStateV203==='function')
   window.csWithPatientStateV203(patient,patient._targetCaseId||C?.id,record);
 }
 function reconcile(p){
  if(!p||!C||p.caseEnded||p.patientDied)return;
  const state=p._csConfirmedLog487||(p._csConfirmedLog487={monitor:false,iv:0,admin:0,group:false});
  if(p.monitorConnected&&!state.monitor){
   state.monitor=true;emit(p,'Monitor puesto y conectado');
  }
  const iv=Math.max(0,Number(p.venousAccessCount||0));
  if(iv>state.iv){
   emit(p,iv>=2?'Dos vías periféricas colocadas':'Una vía periférica colocada');
   state.iv=iv;
  }
  const log=Array.isArray(p.administrationLog)?p.administrationLog:[];
  const labels={oxygen:'Oxígeno',fluid:'Ringer/cristaloides',ceftriaxone:'Ceftriaxona',
   metronidazole:'Metronidazol',vasopressor:'Noradrenalina',piptazo:'Piperacilina/tazobactam',
   imipenem:'Imipenem',albumin:'Albúmina',transfusion:'Transfusión'};
  for(let i=state.admin;i<log.length;i++){
   const a=log[i];if(!a?.id)continue;
   emit(p,(labels[a.id]||String(a.label||a.id)).slice(0,90)+
    ' aplicado'+(a.doseDisplay?' · '+String(a.doseDisplay).slice(0,45):''));
  }
  state.admin=log.length;
  if(!state.group&&log.some(x=>x.id==='ceftriaxone')&&log.some(x=>x.id==='metronidazole')){
   state.group=true;emit(p,'Ceftriaxona y metronidazol aplicados');
  }
  // An earlier pending message is NOT an accurate active monitor status
  // after native administration. Never mark a non-logged dose as given.
  if(/(?:no administrad[oa]|todavia no administrad[oa])/i.test(String(p.monitorFeedback||''))){
   const m=String(p.monitorFeedback).toLowerCase();
   const id=Object.keys(labels).find(id=>
    (m.includes(id==='fluid'?'ringer':id==='vasopressor'?'noradrenalina':id)||
     m.includes((labels[id]||'').toLowerCase()))&&log.some(x=>x.id===id));
   if(id&&p===sim&&typeof setMonitorFeedback==='function')
    setMonitorFeedback(labels[id]+': administrado y registrado en el historial.','good');
  }
 }
 const oldUpdate=updateSimulation;
 updateSimulation=function(dt){
  const p=sim,out=oldUpdate.apply(this,arguments);
  // Look only at native completed state, including background ward results.
  reconcile(p);
  return out;
 };
 const oldTherapy=addMonitorTherapy;
 addMonitorTherapy=function(){
  const out=oldTherapy.apply(this,arguments);
  reconcile(sim);
  return out;
 };
 window.csClinicalConfirm487={reconcile};
})();
</script>`;
 return html.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
}
