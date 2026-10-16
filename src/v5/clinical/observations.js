const copy=x=>structuredClone(x);
const executed=(p,cmd,data)=>({status:'executed',patientUid:p.uid,eventId:cmd.eventId,
 receipt:{patientUid:p.uid,eventId:cmd.eventId,actorId:cmd.actorId,kind:cmd.intent.kind,id:cmd.intent.id,...data}});
export function recordVitalMeasurement(p,clock,eventId,source){
 p.lastVitalsKnown={patientUid:p.uid,vitals:copy(p.liveVitals),nativeMinute:clock.nativeMinute,eventId,source};
}
/** Recording is an observation, never a physiological step or an administration. */
export function executeObservation(p,cmd,clock){
 const {intent}=cmd;
 const connecting=intent.kind==='monitor.set'&&intent.id==='connect'||intent.kind==='procedure.request'&&intent.id==='monitor';
 if(intent.kind==='monitor.set'&&intent.id==='disconnect'){
  p.procedures.monitor={...p.procedures.monitor,patientUid:p.uid,connected:false,disconnectedByEventId:cmd.eventId};
  return executed(p,cmd,{connected:false,message:'Monitor desconectado. Se conserva la última medición registrada.'});
 }
 if(!connecting&&intent.kind!=='vitals.record'&&!(intent.kind==='procedure.request'&&intent.id==='vitals'))return null;
 if(connecting){
  if(!p.procedures.monitor?.connected)p.procedures.monitor={patientUid:p.uid,eventId:cmd.eventId,connected:true};
  recordVitalMeasurement(p,clock,p.procedures.monitor.eventId,'monitor');
 }else recordVitalMeasurement(p,clock,cmd.eventId,'spot');
 return executed(p,cmd,{vitals:copy(p.lastVitalsKnown.vitals),...(connecting?{connected:true}:{}),
  message:(connecting?'Monitor conectado. ':'')+'Signos registrados: FC '+Math.round(p.liveVitals.hr)+
   ' · PA '+Math.round(p.liveVitals.sys)+'/'+Math.round(p.liveVitals.dia)+' · FR '+Math.round(p.liveVitals.rr)+
   ' · SpO₂ '+Math.round(p.liveVitals.spo2)+'%.'});
}
export function refreshMonitoring(p,clock){
 if(p.procedures?.monitor?.connected&&!p.caseEnded)recordVitalMeasurement(p,clock,p.procedures.monitor.eventId,'monitor');
}
