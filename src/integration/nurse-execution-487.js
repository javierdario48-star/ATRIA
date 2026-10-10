export function applyNurseExecution487(html){
 if(html.includes('id="atria-nurse-execution-487"'))throw Error('duplicate nurse task adapter');
 const runtime=String.raw`<script id="atria-nurse-execution-487">
(function(){
 if(window.__csNurseExecution487)return;window.__csNurseExecution487=true;
 const previousStart=startNextTask,previousUpdate=updateNurse;
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
  return previousUpdate.apply(this,arguments);
 };
})();
</script>`;
 return html.replace('</body>',runtime+'</body>');
}
