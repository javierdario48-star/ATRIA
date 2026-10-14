// Exact, reversible additions inside the existing native completion/status
// boundaries. No new nurse scheduler, therapy catalogue or clinical policy.
export const NURSE_STOP_FINISH_OLD_487="nurse.task=null;nurse.state='returning';pathTo(nurse,...nurse.returnTile)}\nfunction updateNurse(dt){";
export const NURSE_STOP_FINISH_NEW_487="if(t.kind==='therapy_stop')window.csCompleteTherapyStop487?.(t);"+NURSE_STOP_FINISH_OLD_487;
export const NURSE_STOP_STATUS_OLD_487="  if(item.kind==='clarify')return";
export const NURSE_STOP_STATUS_NEW_487=`  if(item.kind==='therapy'&&item.id==='vasopressor'&&item.expectedNora){
   if(item.confirmedRate?.patientId===item.uid)return {status:'COMPLETED',reason:'Nueva tasa confirmada por administración real'};
   if(item.status==='REJECTED')return {status:'REJECTED',reason:item.reason};
   const execution=item.noraExecution487||item.noraWaiting487?.noraExecution487;
   const actual=execution?.confirmedNora487,expected=item.expectedNora;
   if(actual?.patientId===item.uid&&actual.count===expected.count&&actual.dose.amount===expected.amount){
    item.confirmedRate={patientId:item.uid,count:actual.count,m:actual.m,amount:actual.dose.amount};
    return {status:'COMPLETED',reason:'Nueva tasa confirmada por administración real'};
   }
   if(!execution&&(patient.csPhase4Pending487||[]).includes(item.noraWaiting487))return {status:'WAITING',reason:'Falta acceso venoso permeable'};
   if(execution&&execution===patient.pendingTherapies?.get(item.id)&&!execution.rejectedNora487&&execution.noraAmount487===expected.amount)
    return {status:'IN_PROGRESS',reason:'Cambio de tasa pendiente; no es la administración anterior'};
   return {status:'REJECTED',reason:'La nueva tasa no se administró'};
  }
  if(item.kind==='therapy_stop'){
   const row=(patient.administrationLog||[]).find(x=>x.eventId===item.executionId&&x.action==='stop'&&x.status==='administered');
   const confirmed=item.confirmedStop;
   if(row||confirmed?.eventId===item.executionId&&confirmed.patientId===item.uid&&confirmed.status==='administered')
    return {status:'COMPLETED',reason:'Suspensión confirmada por enfermería'};
   if(item.failureReason)return {status:'REJECTED',reason:item.failureReason};
   return {status:'IN_PROGRESS',reason:'Suspensión pendiente; el soporte sigue activo'};
  }
`+NURSE_STOP_STATUS_OLD_487;
export const NURSE_STOP_VERSION_OLD_487="const version=item.kind==='therapy'?";
export const NURSE_STOP_VERSION_NEW_487="const version=item.kind==='therapy_stop'?item.executionId:item.kind==='therapy'?";
export const NORA_RECEIPT_OLD_487="   receipt.items.push(item);\n   if(entry.kind==='clarify'";
export const NORA_RECEIPT_NEW_487=`   if(entry.kind==='therapy'&&entry.id==='vasopressor'){
    item.expectedNora={count:Number(patient.therapyExposure?.get(entry.id)?.count||0)+1,
     amount:parseTherapyOrder(entry.text,findMonitorTherapy(entry.text)).amount};
    item.preExisting=patient.pendingTherapies?.has(entry.id)===true;
   }
`+NORA_RECEIPT_OLD_487;
export const NORA_DEDUPE_OLD_487="     seen.add(eventKey);\n     complete.push";
export const NORA_DEDUPE_NEW_487="     if(!item.expectedNora)seen.add(eventKey);\n     complete.push";
// Bind evidence to the existing native pending object, not a matching future
// rate/count. The native scheduler, permissions and 800ms delay stay intact.
export const NORA_PENDING_OLD_487="    const sameSim=sim,sameCaseId=C?.id,treatmentContext=window.nsTreatmentContext();";
export const NORA_PENDING_NEW_487=NORA_PENDING_OLD_487+`
    const noraExecution487=t.id==='vasopressor'?sameSim.pendingTherapies.get(t.id):null;
    if(noraExecution487)noraExecution487.noraAmount487=parseTherapyOrder(text,t).amount;`;
export const NORA_CANCEL_OLD_487="if(!window.nsMayContinueTreatment(sameSim,treatmentContext)){sameSim.pendingTherapies.delete(t.id);return;}";
export const NORA_CANCEL_NEW_487=`if(!window.nsMayContinueTreatment(sameSim,treatmentContext)){
        sameSim.pendingTherapies.delete(t.id);
        if(noraExecution487){noraExecution487.rejectedNora487=true;window.csNurseReconcile487?.(sameSim,sameSim===sim);}
        return;
      }`;
export const NORA_DELIVERY_OLD_487="          if(ok)csLogAction(procedural?'procedure':'admin',t.id,t.label,actor);";
export const NORA_DELIVERY_NEW_487=`          if(noraExecution487){
            noraExecution487.confirmedNora487=ok?sameSim.therapyExposure?.get(t.id)?.lastConfirmedAdministration487:null;
            noraExecution487.rejectedNora487=!noraExecution487.confirmedNora487;
          }
`+NORA_DELIVERY_OLD_487;
export const NORA_BIND_RECEIPT_OLD_487="  for(const item of receipt.items){\n   const state=csNurseClinicalStatus487(patient,item);";
export const NORA_BIND_RECEIPT_NEW_487=`  for(const item of receipt.items){
   if(item.expectedNora){
    item.noraExecution487=patient.pendingTherapies?.get(item.id);
    item.noraWaiting487=(patient.csPhase4Pending487||[]).find(x=>x.id===item.id&&x.uid===item.uid);
   }
   const state=csNurseClinicalStatus487(patient,item);`;
export const NORA_FLUSH_OLD_487="if(typeof addMonitorTherapy==='function'&&typeof MONITOR_THERAPY_CATALOG!=='undefined'&&MONITOR_THERAPY_CATALOG.some(x=>x.id===item.id))addMonitorTherapy(item.text);else prevNatural.call(this,item.text);";
export const NORA_FLUSH_NEW_487=NORA_FLUSH_OLD_487+"\n    if(item.id==='vasopressor')item.noraExecution487=sim.pendingTherapies?.get(item.id);";
// This is a contract for the existing norepinephrine entry, not another drug
// registry. No conversion from mg, volume/hour or an unidentified class.
export function noradrenalineOrderIssue487(raw,original=raw,unfiltered=original){
 const normalize=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[µμ]/g,'u').replace(/,/g,'.').replace(/\b([ievs])\.\s*([vomc])\.?/g,'$1$2');
 const given=normalize(original);
 const name=/\b(?:noradrenalina|norepinefrina|nora)\b/;
 if((given.match(/\b(?:noradrenalina|norepinefrina|nora)\b/g)||[]).length!==1||
   (normalize(unfiltered).match(/\b(?:noradrenalina|norepinefrina|nora)\b/g)||[]).length!==1)
  return 'Especificá una única molécula y tasa de noradrenalina por ejecución.';
 const source=given.replace(/\//g,' ').replace(/\s+/g,' ').trim(),identity=source.match(name);
 if(/\bvia\b(?!\s+(?:iv|ev|intravenos[oa]|endovenos[oa])\b)/.test(source))return 'Especificá una vía IV completa; una vía incompleta no confirma administración.';
 const numbers=source.match(/\d+(?:\.\d+)?/g)||[];
 const rate=source.match(/(?:^|\s)(\d+(?:\.\d+)?)\s+(?:mcg|ug)\s+kg\s+min(?:\s|$)/);
 if(numbers.length&&(!rate||numbers.length!==1||!Number.isFinite(Number(rate[1]))||Number(rate[1])<=0||rate.index<identity.index))
  return 'Indicá después del nombre una tasa positiva en mcg/kg/min IV, con cero inicial para fracciones.';
 // Only an explicit supported command/default or one absolute IV rate is
 // accepted. Unknown route, bolus, spelled/negative dose or modal context cannot
 // silently fall back to the default infusion. Preserve the WHOLE raw clause.
 const rest=source.replace(rate?.[0]||'__no_rate__',' ').replace(name,' ').replace(/\s+/g,' ').trim();
 if(!/^(?:(?:enfermera|enfermero|enfermeria|por|favor|indico|solicito|necesito|pido|quiero|administrar|administra|dar|da|pasar|pasa|iniciar|inicia|infundir|infusion|iv|ev|via|intravenoso|intravenosa|endovenoso|endovenosa|vasopresor)\s*)*$/.test(rest))
  return 'Indicación ambigua o incompatible: especificá noradrenalina en infusión IV y su tasa en mcg/kg/min.';
 if(/[+−–—-]\s*\d|(?:^|\s)[.,]\d/.test(given))return 'Usá una tasa positiva explícita con cero inicial; no se convierten signos ambiguos.';
 return null;
}
export function applyNurseExecution487(html){
 if(html.includes('id="atria-nurse-execution-487"'))throw Error('duplicate nurse task adapter');
 for(const [from,to] of [[NURSE_STOP_FINISH_OLD_487,NURSE_STOP_FINISH_NEW_487],
  [NURSE_STOP_STATUS_OLD_487,NURSE_STOP_STATUS_NEW_487],[NURSE_STOP_VERSION_OLD_487,NURSE_STOP_VERSION_NEW_487],
  [NORA_RECEIPT_OLD_487,NORA_RECEIPT_NEW_487],[NORA_DEDUPE_OLD_487,NORA_DEDUPE_NEW_487],
  [NORA_PENDING_OLD_487,NORA_PENDING_NEW_487],[NORA_CANCEL_OLD_487,NORA_CANCEL_NEW_487],
  [NORA_DELIVERY_OLD_487,NORA_DELIVERY_NEW_487],[NORA_BIND_RECEIPT_OLD_487,NORA_BIND_RECEIPT_NEW_487],
  [NORA_FLUSH_OLD_487,NORA_FLUSH_NEW_487]]){
  if(html.split(from).length!==2)throw Error('native therapy stop boundary missing/ambiguous');
  html=html.replace(from,to);
 }
 const runtime=String.raw`<script id="atria-nurse-execution-487">
(function(){
 if(window.__csNurseExecution487)return;window.__csNurseExecution487=true;
 ${noradrenalineOrderIssue487.toString()}
 window.csNoradrenalineOrderIssue487=noradrenalineOrderIssue487;
 const previousStart=startNextTask,previousUpdate=updateNurse,previousFinish=typeof finishNurseTask==='function'?finishNurseTask:null;
 // Use the existing bedside queue and its authorized native finish, including
 // patient binding. Pending stop never changes active support or dose counts.
 let stopSequence=0,completingStop=null;
 const previousRecord=typeof recordAdministration==='function'?recordAdministration:null;
 if(previousRecord)recordAdministration=function(t){
  if(t?.action!=='stop'){
   const before=sim?.administrationLog?.at(-1),out=previousRecord.apply(this,arguments),row=sim?.administrationLog?.at(-1);
   // One compact verified start on the existing exposure entry survives the
   // 80-row display window. It is captured at delivery, never from a chat or
   // reconstructed from an arbitrary active marker.
   if((t?.id==='oxygen'||t?.id==='vasopressor'&&!noradrenalineOrderIssue487(t.raw))&&out&&row&&row!==before&&row.id===t.id&&row.count===out.count)
    out.lastConfirmedAdministration487={id:t.id,patientId:sim.patientInstance?.uid,m:row.m,count:row.count,dose:{...t.dose},
     ...(t.id==='vasopressor'?{moleculeId:'norepinephrine',route:'iv'}:{route:'inhaled'})};
   return out;
  }
  const task=completingStop;
  if(!task||task._targetSim!==sim||t.id!==task.id)return null;
  const previous=sim.therapyExposure.get(t.id);
  const row={m:sim.gameMinute,id:t.id,label:task.activeTherapy.label,raw:task.raw,
   count:previous.count,doseDisplay:'Suspensión confirmada',action:'stop',eventType:'suspension',
   status:'administered',eventId:task.executionId,patientId:task.uid,route:task.route,
   previousDose:{...task.activeTherapy.dose}};
  sim.administrationLog.push(row);if(sim.administrationLog.length>80)sim.administrationLog.shift();
  return previous;
 };
 function cancelStop(task,reason){
  const target=task._targetSim;
  if(target?.pendingTherapies?.get(task.id)===task.pending)target.pendingTherapies.delete(task.id);
  task.receiptItem.failureReason=reason;
 }
 window.csCompleteTherapyStop487=function(task){
  if(nurse.task!==task||task.mode!==selectedPlayMode||task._targetSim!==sim||task.uid!==sim?.patientInstance?.uid||task.caseId!==C?.id||
    sim.caseEnded||sim.patientDied||sim.monitorTherapies.get(task.id)!==task.activeTherapy||
    sim.pendingTherapies.get(task.id)!==task.pending||!window.nsMayContinueTreatment?.(sim,task.context)){
   cancelStop(task,'La suspensión no se ejecutó: cambió el paciente, el soporte o el permiso.');return false;
  }
  completingStop=task;
  try{recordAdministration({id:task.id,action:'stop'});}finally{completingStop=null;}
  if(sim.administrationLog.at(-1)?.eventId!==task.executionId){cancelStop(task,'No se pudo registrar la suspensión.');return false;}
  task.receiptItem.confirmedStop={eventId:task.executionId,patientId:task.uid,m:sim.gameMinute,status:'administered'};
  sim.monitorTherapies.delete(task.id);sim.pendingTherapies.delete(task.id);
  // Historical interventions/administrations are intentionally retained. The
  // existing rescue/grace consumers require active support as well as history.
  sim.events.push({m:sim.gameMinute,t:task.stopLabel+' por enfermería; administración previa conservada.'});
  setMonitorFeedback(task.id==='oxygen'?'Oxígeno suspendido y registrado. Reevaluá la saturación.':
   'Noradrenalina suspendida y registrada. Reevaluá presión y perfusión; la retirada puede agravar la hipotensión.','good');
  renderMonitorTherapies();renderAdministrationHistory();updateMonitorDOM();
  window.csNurseReconcile487?.(sim,true);window.csClinicalConfirm487?.reconcile(sim);
  // Its bounded receipt is terminal/notified. A permanent unique stop key
  // adds no duplicate protection and would otherwise grow across restarts.
  sim.csNurse487SeenEvents?.delete('therapy_stop:'+task.id+':COMPLETED:'+task.executionId);
  return true;
 };
 window.csQueueTherapyStop487=function(id,raw){
  if(!['oxygen','vasopressor'].includes(id)||!previousRecord||!['solo','apprentice'].includes(selectedPlayMode)||
    !sim||!C||sim.caseEnded||sim.patientDied||window.nsMayExamine?.()===false)return false;
  const active=sim.monitorTherapies.get(id),exposure=sim.therapyExposure.get(id);
  const confirmed=exposure?.lastConfirmedAdministration487;
  const label=id==='oxygen'?'Oxígeno':'Noradrenalina',stopLabel=id==='oxygen'?'Oxígeno suspendido':'Noradrenalina suspendida';
  if(!active||!confirmed||id==='vasopressor'&&confirmed.moleculeId!=='norepinephrine'||confirmed.patientId!==sim.patientInstance?.uid||confirmed.count!==exposure.count||
    confirmed.m!==active.lastGivenAt){
   nurseSay('No hay '+label+' administrado y activo para suspender.');return false;
  }
  if(sim.pendingTherapies.has(id)){nurseSay(label+' tiene una ejecución pendiente; esperá su confirmación.');return false;}
  const uid=sim.patientInstance?.uid,executionId=uid+':native-stop:'+ ++stopSequence;
  const pending={label:'Suspender '+label,action:'stop',startedAt:performance.now()};
  const item={kind:'therapy_stop',id,label:stopLabel,uid,executionId,status:'RECEIVED',reason:''};
  const task={kind:'therapy_stop',id,label:'Suspender '+label,stopLabel,route:confirmed.route,bedside:true,raw:String(raw),
   _targetSim:sim,_targetCaseId:C.id,
   uid,caseId:C.id,mode:selectedPlayMode,context:window.nsTreatmentContext?.(),activeTherapy:active,executionId,receiptItem:item,pending};
  sim.pendingTherapies.set(id,pending);
  if(queueNurse(task)===false){sim.pendingTherapies.delete(id);return false;}
  (sim.csNurse487History||(sim.csNurse487History=[])).push({id:executionId,uid,bed:sim.patientInstance?.bed?.label||'',items:[item]});
  sim.csNurse487History=sim.csNurse487History.slice(-32);
  window.csNurseReconcile487?.(sim,true);
  return true;
 };
 // A previous phase drained IV medications on active-patient simulation ticks.
 // That never ran for a patient left in a different box: completed cannulation
 // must resume that patient's retained orders at the actual native completion.
 if(previousFinish)finishNurseTask=function(){
  const task=nurse.task,target=task?._targetSim||sim;
  const oldCount=Number(target?.venousAccessCount||0);
  const result=previousFinish.apply(this,arguments);
  if(task?.kind==='therapy_stop'&&target?.pendingTherapies?.get(task.id)===task.pending)
   cancelStop(task,'La suspensión no se ejecutó; no hubo completion autorizado.');
  if(task?.kind!=='iv_access'||!target||target.caseEnded||Number(target.venousAccessCount||0)<=oldCount)return result;
  const drain=()=>{
   const pending=target.csPhase4Pending487;
   if(!Array.isArray(pending)||!pending.length)return;
   const uid=target.patientInstance?.uid;
   for(const item of pending.slice(0,12)){
    if(item.uid!==uid)continue;
    const index=pending.indexOf(item);if(index<0)continue;
    pending.splice(index,1);
    const isCatalog=typeof MONITOR_THERAPY_CATALOG!=='undefined'&&MONITOR_THERAPY_CATALOG.some(x=>x.id===item.id);
    // Deferred IV medication remains bound to its own original order text,
    // never to whichever message arrives while cannulation completes.
    if(isCatalog){
     const scanned=window.csNurseVoice487?.parse?.(item.text);
     const authorized=!!scanned?.active&&scanned.items?.some(x=>
      x.kind==='therapy'&&x.id===item.id&&!x.negated&&!x.routeOnly);
     if(!authorized){
      (target.csNurse487RejectedOrders||(target.csNurse487RejectedOrders=[])).push({
       uid,itemId:item.id,text:String(item.text||'').slice(0,180),reason:'no matching explicit drug'});
      target.csNurse487RejectedOrders=target.csNurse487RejectedOrders.slice(-30);
      nurseSay('Orden pendiente BLOQUEADA: medicamento sin indicación explícita coincidente.');
      continue;
     }
     const evidence=target.csNurse487MedicationProvenance||(target.csNurse487MedicationProvenance=[]);
     const source=[...(target.csNurse487OrderAudit||[])].reverse().find(e=>
      e.patientUid===uid&&e.items?.some(x=>x.kind==='therapy'&&x.id===item.id&&!x.negated));
     evidence.push({uid,itemId:item.id,orderText:String(item.text).slice(0,180),
      intentId:source?.id||null,sourceText:source?.text||String(item.text).slice(0,180),
      origin:'orden farmacológica previa',at:target.gameMinute});
     if(evidence.length>80)evidence.splice(0,evidence.length-80);
    }
    const ok=isCatalog?addMonitorTherapy(item.text):nurseNatural('enfermera '+item.text);
    if(item.id==='vasopressor')item.noraExecution487=target.pendingTherapies?.get(item.id);
    if(ok===false){
     pending.push(item);
     nurseSay('No pude comenzar '+item.text+' después de canalizar la vía; la indicación continúa pendiente.');
    }
   }
  };
  if(target!==sim&&typeof window.csWithPatientStateV203==='function')
   window.csWithPatientStateV203(target,task._targetCaseId,drain);
  else if(target===sim)drain();
  return result;
 };
 startNextTask=function(){
  const prior=nurse.task,result=previousStart.apply(this,arguments),task=nurse.task;
  if(task&&!prior&&task.bedside){
   task.csTaskBegan487=performance.now();
   const bed=(task._targetSim||sim)?.patientInstance?.bed;
   if(Array.isArray(bed?.approach))task.csRouteFound487=pathTo(nurse,bed.approach[0],bed.approach[1]);
  }
  return result;
 };
 updateNurse=function(dt){
  // V2: earlier watchdog observed only the master sprite. The native multi-box
  // scheduler swaps every ward nurse through a shared actor adapter *inside*
  // previousUpdate, therefore a blocked ward nurse was never recovered.
  const now=performance.now();
  const actors=[nurse,...(typeof wardNurses!=='undefined'?wardNurses:[])];
  for(const actor of actors){
   const task=actor.task;
   if(!task?.bedside||actor.state!=='to_patient')continue;
   if(!Number.isFinite(task.csTaskBegan487))task.csTaskBegan487=now;
   if(now-task.csTaskBegan487<11000)continue;
   actor.state='working';actor.taskEnds=now+1600;
   actor.path=[];actor.pathIndex=0;
   // No clinical state is written here: only native finishNurseTask can
   // actually connect a monitor or establish a peripheral access.
   const message='La ruta al box sigue bloqueada. Personal del sector completa el procedimiento; confirmaré al terminar.';
   const target=task._targetSim;
   if(target&&target!==sim&&typeof window.csWithPatientStateV203==='function')
    window.csWithPatientStateV203(target,task._targetCaseId,()=>nurseSay(message));
   else nurseSay(message);
  }
  for(const actor of actors){
   if(actor.state==='returning'&&!actor.task){
    actor.csReturnSince487??=now;
    if(now-actor.csReturnSince487>4500){
     // The existing per-actor native update finishes the return and starts
     // that SAME nurse's next task; never use global startNextTask here.
     actor.path=[];actor.pathIndex=0;actor.csReturnSince487=null;
    }
   }else actor.csReturnSince487=null;
  }
  const out=previousUpdate.apply(this,arguments);
  // Start the bounded return watchdog at the actual task transition, not
  // one subsequent frame later (a stalled route must not delay the next IV).
  for(const actor of actors)if(actor.state==='returning'&&!actor.task)
   actor.csReturnSince487??=now;
  return out;
 };
})();
</script>`;
 return html.replace('</body>',runtime+'</body>');
}
