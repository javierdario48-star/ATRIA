/**
 * C08.a Spatial nursing journeys. This component owns ONLY world movement and
 * task presence, never therapy administration, monitor connections, IV access,
 * pharmacological effects, medical clock or clinical receipts.
 *
 * The clinical authority remains the sole source of executed/rejected state.
 * A nurse arriving at the bed produces an arrival event, NOT an intervention.
 */
const id=value=>typeof value==='string'&&value.length>0&&value.length<=160;
const copy=value=>structuredClone(value);

export function createNurseDispatcher({navigation,nurses,patients}={}){
 if(!navigation||!Array.isArray(nurses)||!Array.isArray(patients))throw Error('nursing spatial context required');
 const tasks=new Map(),arrivals=[],byUid=new Map(patients.map(p=>[p.uid,p]));
 let disposed=false,queuedRetryTime=0;
 function assignment(task){
  // One bedside intervention per patient. Other nurses may work in other boxes,
  // but several NPCs must not pile onto the same patient for a compound order.
  if([...tasks.values()].some(other=>other!==task&&other.patientUid===task.patientUid&&
    (other.stage==='travelling'||other.stage==='at-bed')))return false;
  const patient=byUid.get(task.patientUid);
  if(!patient||!Array.isArray(patient.approach))return false;
  const goal=navigation.nearest(...patient.approach,8);
  if(!goal)return false;
  const target=navigation.center(...goal);
  const candidates=nurses.filter(n=>!n.journeyId).sort((a,b)=>
   Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y)||a.id.localeCompare(b.id));
  for(const nurse of candidates){
   if(!navigation.target(nurse,target.x,target.y))continue;
   nurse.journeyId=task.eventId;
   task.nurseId=nurse.id;task.stage='travelling';task.destination=target;
   return true;
  }
  return false;
 }
 function assignWaiting(){
  for(const task of tasks.values())if(task.stage==='queued')assignment(task);
 }
 function release(task){
  const nurse=nurses.find(n=>n.id===task.nurseId&&n.journeyId===task.eventId);
  if(nurse){
   nurse.journeyId=null;nurse.path=[];nurse.pathIndex=0;nurse.target=null;nurse.moving=false;
   // A subsequent patrol command is issued by the existing world loop.
   nurse.patrolAt=0;
  }
 }
 return Object.freeze({
  enqueue({eventId,patientUid,kind}={}){
   if(disposed)return {status:'disposed'};
   if(!id(eventId)||!id(patientUid)||!id(kind))return {status:'invalid-task'};
   const prior=tasks.get(eventId);
   if(prior)return {status:prior.patientUid===patientUid&&prior.kind===kind?'duplicate':'conflict',task:copy(prior)};
   if(!byUid.has(patientUid))return {status:'unknown-patient'};
   const task={eventId,patientUid,kind,stage:'queued',nurseId:null,destination:null};
   tasks.set(eventId,task);assignWaiting();
   return {status:task.stage,task:copy(task)};
  },
  /** Called at the *same* fixed world simulation step, with no timers/RAF. */
  advance(dt){
   if(disposed)return;
   if(!Number.isFinite(dt)||dt<0)throw Error('invalid nursing step');
   for(const nurse of nurses){
    if(!nurse.journeyId)continue;
    const task=tasks.get(nurse.journeyId);
    if(!task||task.stage!=='travelling')continue;
    const reached=navigation.move(nurse,dt);
    if(!reached||nurse.target!==null)continue;
    if(Math.hypot(nurse.x-task.destination.x,nurse.y-task.destination.y)>1e-4)continue;
    task.stage='at-bed';
    arrivals.push({eventId:task.eventId,patientUid:task.patientUid,kind:task.kind,nurseId:nurse.id});
   }
   // A blocked path might require a full A* search. Retry at 1 Hz in
   // simulation time (not another real-time timer or independent RAF).
   // Fresh orders and completed nursing jobs still schedule immediately.
   queuedRetryTime+=dt;
   if(queuedRetryTime>=1){queuedRetryTime%=1;assignWaiting();}
  },
  takeArrivals(){if(disposed)return [];return copy(arrivals.splice(0));},
  /** Only a caller holding a native *matching receipt* may mark execution.
   * This remains presentation state and never mutates the clinical patient.
   */
  acceptClinicalResult({eventId,patientUid,status,receipt}={}){
   if(disposed)return {status:'disposed'};
   const task=tasks.get(eventId);
   if(!task||task.patientUid!==patientUid)return {status:'unknown-task'};
   if(task.stage==='confirmed'||task.stage==='rejected')return {status:'already-final'};
   if(status==='executed'){
    if(task.stage!=='at-bed')return {status:'nurse-not-at-bed'};
    if(receipt?.eventId!==eventId||receipt?.patientUid!==patientUid)return {status:'invalid-receipt'};
    task.stage='confirmed';
   }else if(status==='rejected'||status==='unconfirmed')task.stage='rejected';
   else return {status:'invalid-result'};
   release(task);assignWaiting();
   return {status:task.stage};
  },
  cancel(eventId){
   if(disposed)return false;
   const task=tasks.get(eventId);
   if(!task||!['queued','travelling','at-bed'].includes(task.stage))return false;
   task.stage='cancelled';release(task);assignWaiting();return true;
  },
  snapshot:()=>disposed?[]:copy([...tasks.values()]),
  dispose(){
   if(disposed)return;disposed=true;
   for(const task of tasks.values())release(task);
   tasks.clear();arrivals.length=0;
  }
 });
}
