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
  const task=nurse.task,now=performance.now();
  if(task?.bedside){
   if(!Number.isFinite(task.csTaskBegan487))task.csTaskBegan487=now;
   if(nurse.state==='to_patient'&&now-task.csTaskBegan487>=11000){
    nurse.state='working';nurse.taskEnds=now+1600;nurse.path=[];nurse.pathIndex=0;
    nurseSay('El acceso al box sigue bloqueado. Otra enfermera del sector completa la tarea y avisara al terminar.');
   }
  }
  const result=previousUpdate.apply(this,arguments);
  if(nurse.state==='returning'&&!nurse.task){
    nurse.csReturnSince487??=now;
    if(now-nurse.csReturnSince487>4500){nurse.state='idle';nurse.path=[];nurse.pathIndex=0;nurse.csReturnSince487=null;startNextTask()}
  }else nurse.csReturnSince487=null;
  return result;
 };
})();
</script>`;
 return html.replace('</body>',runtime+'</body>');
}
