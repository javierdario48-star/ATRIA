// Mode intent and delivery receipts only. No patient state or clinical execution.
export const outcomeId=p=>p?.closure?.closed?p.closure.eventId:p?.patientDied?'death:'+p.uid+':'+p.survival.atRealSecond:null;
export function createCooperativeLifecycle(){
 let generation=0,intent=null,roomId=null;const receipts=new Map();
 return Object.freeze({
  begin(role){intent={role,generation:++generation};roomId=null;receipts.clear();return intent.generation;},
  cancel(){generation++;intent=null;roomId=null;receipts.clear();},
  current:token=>token===intent?.generation,
  mayEnter(role,{phase,hasSession,recovering=false}){return phase==='lobby'&&!hasSession&&(intent?.role===role||role==='guest'&&recovering&&!intent);},
  bind(id){roomId=id;},
  confirm(room,eventId,actor,p,members){if(room!==roomId||eventId!==outcomeId(p)||!eventId||!members.some(x=>x.userId===actor))return false;receipts.set(actor,eventId);return true;},
  delivered(p,hostId,members){const id=outcomeId(p);return !!id&&members.every(x=>x.userId===hostId||receipts.get(x.userId)===id);}
 });
}
