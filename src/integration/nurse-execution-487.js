// Exact, reversible additions inside the existing native completion/status
// boundaries. No new nurse scheduler, therapy catalogue or clinical policy.
export const NURSE_STOP_FINISH_OLD_487="nurse.task=null;nurse.state='returning';pathTo(nurse,...nurse.returnTile)}\nfunction updateNurse(dt){";
export const NURSE_STOP_FINISH_NEW_487="if(t.kind==='therapy_stop')window.csCompleteTherapyStop487?.(t);"+NURSE_STOP_FINISH_OLD_487;
export const NURSE_STOP_STATUS_OLD_487="  if(item.kind==='clarify')return";
export const NURSE_STOP_STATUS_NEW_487=`  if(item.kind==='therapy_stop'){
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
export function applyNurseExecution487(html){
 if(html.includes('id="atria-nurse-execution-487"'))throw Error('duplicate nurse task adapter');
 for(const [from,to] of [[NURSE_STOP_FINISH_OLD_487,NURSE_STOP_FINISH_NEW_487],
  [NURSE_STOP_STATUS_OLD_487,NURSE_STOP_STATUS_NEW_487],[NURSE_STOP_VERSION_OLD_487,NURSE_STOP_VERSION_NEW_487]]){
  if(html.split(from).length!==2)throw Error('native therapy stop boundary missing/ambiguous');
  html=html.replace(from,to);
 }
 const runtime=String.raw`<script id="atria-nurse-execution-487">
(function(){
 if(window.__csNurseExecution487)return;window.__csNurseExecution487=true;
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
   if(t?.id==='oxygen'&&out&&row&&row!==before&&row.id===t.id&&row.count===out.count)
    out.lastConfirmedAdministration487={id:t.id,patientId:sim.patientInstance?.uid,m:row.m,count:row.count,dose:{...t.dose}};
   return out;
  }
  const task=completingStop;
  if(!task||task._targetSim!==sim||t.id!==task.id)return null;
  const previous=sim.therapyExposure.get(t.id);
  const row={m:sim.gameMinute,id:t.id,label:task.activeTherapy.label,raw:task.raw,
   count:previous.count,doseDisplay:'Suspensión confirmada',action:'stop',eventType:'suspension',
   status:'administered',eventId:task.executionId,patientId:task.uid,route:'inhaled',
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
  sim.events.push({m:sim.gameMinute,t:'Oxígeno suspendido por enfermería; administración previa conservada.'});
  setMonitorFeedback('Oxígeno suspendido y registrado. Reevaluá la saturación.','good');
  renderMonitorTherapies();renderAdministrationHistory();updateMonitorDOM();
  window.csNurseReconcile487?.(sim,true);window.csClinicalConfirm487?.reconcile(sim);
  // Its bounded receipt is terminal/notified. A permanent unique stop key
  // adds no duplicate protection and would otherwise grow across restarts.
  sim.csNurse487SeenEvents?.delete('therapy_stop:'+task.id+':COMPLETED:'+task.executionId);
  return true;
 };
 window.csQueueTherapyStop487=function(id,raw){
  if(id!=='oxygen'||!previousRecord||!['solo','apprentice'].includes(selectedPlayMode)||
    !sim||!C||sim.caseEnded||sim.patientDied||window.nsMayExamine?.()===false)return false;
  const active=sim.monitorTherapies.get(id),exposure=sim.therapyExposure.get(id);
  const confirmed=exposure?.lastConfirmedAdministration487;
  if(!active||!confirmed||confirmed.patientId!==sim.patientInstance?.uid||confirmed.count!==exposure.count||
    confirmed.m!==active.lastGivenAt){
   nurseSay('No hay oxígeno administrado y activo para suspender.');return false;
  }
  if(sim.pendingTherapies.has(id)){nurseSay('Oxígeno tiene una ejecución pendiente; esperá su confirmación.');return false;}
  const uid=sim.patientInstance?.uid,executionId=uid+':native-stop:'+ ++stopSequence;
  const pending={label:'Suspender oxígeno',action:'stop',startedAt:performance.now()};
  const item={kind:'therapy_stop',id,label:'Oxígeno suspendido',uid,executionId,status:'RECEIVED',reason:''};
  const task={kind:'therapy_stop',id,label:'Suspender oxígeno',bedside:true,raw:String(raw),
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
    const ok=isCatalog?addMonitorTherapy(item.text):nurseNatural('enfermera '+item.text);
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
