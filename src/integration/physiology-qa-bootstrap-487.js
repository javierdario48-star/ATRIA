/** Lazy browser entry. Defining this API does not import B1 or wrap any native
 * endpoint. QA must explicitly enable it on a fresh local patient. */
export function installPhysiologyQABootstrap487(target, port, loadModule, loadRingerModule) {
  if (target.csPhysiologyQA487) return target.csPhysiologyQA487;
  let observer = null, pending = null, generation = 0, diagnostic = {status: 'disabled', shadowOnly: true};
  let ringer=null,ringerPending=null,ringerGeneration=0,admissionHook=null,admissionOriginal=null;
  let ringerDiagnostic={status:'disabled',shadowOnly:true};
  function disarm(){
    if(admissionHook&&port.getAdmission()===admissionHook)port.setAdmission(admissionOriginal);
    admissionHook=null;admissionOriginal=null;
  }
  function ringerPreflight(){
    if(pending||observer?.report().status==='observing')throw Error('disable the shadow observer before requesting a fresh Ringer admission');
    if(typeof loadRingerModule!=='function')throw Error('QA Ringer module is not configured');
  }
  const api = Object.freeze({
    enable() {
      if(ringerPending||admissionHook||ringer?.report().status==='active')throw Error('stop the Ringer experiment at patient end before starting shadow');
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
      ringerGeneration++;ringerPending=null;
      disarm();
      ringerDiagnostic={status:'disabled',shadowOnly:true};
      observer?.stop();
      diagnostic = {status: 'disabled', shadowOnly: true};
    },
    report() {return observer ? observer.report() : {...diagnostic};},
    enableRinger(){
      ringerPreflight();
      if(ringerPending)return ringerPending;
      if(ringer?.report().status==='active')return Promise.resolve(ringer.report());
      if(admissionHook)throw Error('Ringer is already armed for a future admission');
      const requested=port.read(),requestedUid=requested.patient?.patientInstance?.uid;
      const token=++ringerGeneration;
      ringerDiagnostic={status:'loading',shadowOnly:true};
      ringerPending=(async()=>{try{
        const module=await loadRingerModule();if(token!==ringerGeneration)return {status:'cancelled'};
        const current=port.read();
        if(current.patient!==requested.patient||current.caseDef!==requested.caseDef||current.patient?.patientInstance?.uid!==requestedUid)
          throw Error('requested Ringer admission changed during module loading');
        ringer=module.installRingerPhysiologyQA487(port);return ringer.report();
      }catch(error){if(token===ringerGeneration)ringerDiagnostic={status:'error',shadowOnly:true,reason:String(error.message||error)};throw error;
      }finally{if(token===ringerGeneration)ringerPending=null;}})();return ringerPending;
    },
    armRinger(){
      ringerPreflight();
      if(ringerPending||ringer?.report().status==='active')throw Error('finish and roll back the current Ringer admission first');
      if(admissionHook)return Promise.resolve({...ringerDiagnostic});
      if(typeof port.getAdmission?.()!=='function'||typeof port.setAdmission!=='function')throw Error('actual QA admission boundary required');
      const token=++ringerGeneration;
      ringerPending=(async()=>{try{
        const module=await loadRingerModule();if(token!==ringerGeneration)return {status:'cancelled'};
        admissionOriginal=port.getAdmission();
        admissionHook=function(){
          const output=admissionOriginal.apply(this,arguments);
          disarm();
          try{ringer=module.installRingerPhysiologyQA487(port);}
          catch(error){ringerDiagnostic={status:'blocked',shadowOnly:true,reason:String(error.message||error)};}
          return output;
        };
        port.setAdmission(admissionHook);
        ringerDiagnostic={status:'armed-for-next-admission',shadowOnly:true,caseId:'PERI-SEC-001'};
        return {...ringerDiagnostic};
      }catch(error){if(token===ringerGeneration)ringerDiagnostic={status:'error',shadowOnly:true,reason:String(error.message||error)};throw error;
      }finally{if(token===ringerGeneration)ringerPending=null;}})();return ringerPending;
    },
    ownsRinger(p,c){return ringer?.owns(p,c)===true;},
    ringerCompletionAllowed(p,caseId){return ringer?.completionAllowed(p,caseId)!==false;},
    reportRinger(){return ringer?.report().status==='active'?ringer.report():{...ringerDiagnostic};},
    rollbackRinger(){ringerGeneration++;ringerPending=null;disarm();const out=ringer?.rollback()??{status:'disabled'};
      if(out.status==='disabled'){ringer=null;ringerDiagnostic={status:'disabled',shadowOnly:true};}return out;},
  });
  target.csPhysiologyQA487 = api;
  return api;
}

// Explicit small dependency closure copied by the offline build. No bundler,
// external script, dependency installation, AI service or automatic fetch.
export const PHYSIOLOGY_QA_FILES_487 = Object.freeze([
  'integration/physiology-qa-observer-487.js', 'integration/physiology-shadow-487.js',
  'integration/physiology-ringer-owner-487.js',
  'integration/pharmacology-receipts-487.js', 'clinical/clinical-clock-487.js',
  'clinical/physiology-pilot-487.js', 'clinical/physiology-pilot-definitions-487.js',
  'clinical/physiology-pilot-cases-487.js', 'clinical/pharmacology-content-487.js',
  'clinical/pharmacology-mechanisms-487.js', 'clinical/pharmacology-mechanisms-b1-487.js',
]);

export const RINGER_SAFETY_OLD_487='if(fluidMl>threshold){const over=';
export const RINGER_SAFETY_NEW_487='if(fluidMl>threshold&&!window.csPhysiologyQA487?.ownsRinger?.(sim,C)){const over=';
export const RINGER_COMPLETION_OLD_487='if(!window.nsMayContinueTreatment(sameSim,treatmentContext)){';
export const RINGER_COMPLETION_NEW_487='if(!window.nsMayContinueTreatment(sameSim,treatmentContext)||(t.id===\'fluid\'&&window.csPhysiologyQA487?.ringerCompletionAllowed?.(sameSim,sameCaseId)===false)){';
export function applyPhysiologyQABootstrap487(html) {
  if (html.includes('id="atria-physiology-qa-487"')) throw Error('duplicate physiology QA entry');
  if (html.split('</body>').length !== 2) throw Error('unique physiology QA body anchor required');
  if(html.includes('function medicationSafetyOffsets(){')){
    if(html.split(RINGER_SAFETY_OLD_487).length!==2)throw Error('unique native fluid safety contribution required');
    html=html.replace(RINGER_SAFETY_OLD_487,RINGER_SAFETY_NEW_487);
    if(html.split(RINGER_COMPLETION_OLD_487).length!==2)throw Error('unique native therapy completion boundary required');
    html=html.replace(RINGER_COMPLETION_OLD_487,RINGER_COMPLETION_NEW_487);
  }
  const runtime = `<script id="atria-physiology-qa-487">
(function(){
  const port = {
    read: () => ({patient: typeof sim==='undefined'?null:sim, caseDef: typeof C==='undefined'?null:C,
      mode: ['coop','competitive'].includes(typeof selectedPlayMode==='undefined'?null:selectedPlayMode)?selectedPlayMode:
        (typeof sim==='undefined'?null:sim?.playMode)||(typeof selectedPlayMode==='undefined'?null:selectedPlayMode),
      hidden: document.visibilityState==='hidden',shiftActive:typeof shiftSession!=='undefined'&&!!shiftSession?.active,
      nursingBusy:typeof nurse!=='undefined'&&(!!nurse?.task||!!nurse?.queue?.length),
      nativeRate:(['dieInput','monitorMedInput'].includes(document.activeElement?.id)||document.body.classList.contains('keyboardOpen'))?.03:.12}),
    getAdministration: () => typeof recordAdministration==='function'?recordAdministration:null,
    setAdministration: fn => {recordAdministration=fn;},
    getUpdate: () => typeof updateSimulation==='function'?updateSimulation:null,
    setUpdate: fn => {updateSimulation=fn;},
    getImmediate:()=>applyImmediatePhysiology,setImmediate:fn=>{applyImmediatePhysiology=fn;},
    getPhysiology:()=>updatePhysiologyState,setPhysiology:fn=>{updatePhysiologyState=fn;},
    getProgression:()=>progressionOffsets,setProgression:fn=>{progressionOffsets=fn;},
    getDelivery:()=>addMonitorTherapy,setDelivery:fn=>{addMonitorTherapy=fn;},
    getNursing:()=>nurseNatural,setNursing:fn=>{nurseNatural=fn;},parseNursing:text=>window.csNurseVoice487.parse(text),
    getAdmission:()=>startCase,setAdmission:fn=>{startCase=fn;},
    resolveDelivery:text=>{const t=findMonitorTherapy(text);if(t)t.dose=parseTherapyOrder(text,t);return t;},
    rejectDelivery:reason=>{nurseSay(reason);setMonitorFeedback(reason,'warn');}
  };
  (${installPhysiologyQABootstrap487.toString()})(window,port,
    () => import('./qa-physiology/integration/physiology-qa-observer-487.js'),
    () => import('./qa-physiology/integration/physiology-ringer-owner-487.js'));
})();
</script>`;
  return html.replace('</body>', runtime + '</body>');
}
