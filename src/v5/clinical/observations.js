const copy=x=>structuredClone(x);
const executed=(p,cmd,data)=>({status:'executed',patientUid:p.uid,eventId:cmd.eventId,
 receipt:{patientUid:p.uid,eventId:cmd.eventId,actorId:cmd.actorId,kind:cmd.intent.kind,id:cmd.intent.id,...data}});
// Monitor readout variability is measurement-scale, deterministic and bounded.
// It never changes the patient physiology, administration time or case score.
// Spot measurements and reassessment snapshots retain their exact native values.
const monitorRanges=Object.freeze({
 hr:[1.4,30,240],rr:[.8,4,60],sys:[2.0,45,220],
 dia:[1.2,25,150],spo2:[.32,0,100],temp:[.035,30,45]
});
export function monitorMeasurement(p,clock){
 const vitals=copy(p.liveVitals);
 const id=String(p.uid||'patient');
 let seed=0;
 for(let i=0;i<id.length;i++)seed=(seed*31+id.charCodeAt(i))%1009;
 const phase=seed*2*Math.PI/1009;
 const time=Number.isFinite(clock?.clinicalMinute)?clock.clinicalMinute:0;
 for(const [key,[amplitude,low,high]] of Object.entries(monitorRanges)){
  if(!Number.isFinite(vitals[key]))continue;
  const oscillation=.72*Math.sin(time*2.6+phase+key.length*.9)+
   .28*Math.sin(time*4.1+phase*.7+key.charCodeAt(0)*.09);
  vitals[key]=Math.max(low,Math.min(high,vitals[key]+amplitude*oscillation));
 }
 return vitals;
}
export function recordVitalMeasurement(p,clock,eventId,source){
 p.lastVitalsKnown={patientUid:p.uid,vitals:source==='monitor'?monitorMeasurement(p,clock):copy(p.liveVitals),nativeMinute:clock.nativeMinute,eventId,source};
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

/** Peripheral IV access is a bedside procedure, not a drug effect.
 * The case executor calls this only after the assigned nurse reaches the bed.
 */
export function executeVenousAccess(p,cmd){
 if(cmd.intent.kind!=='procedure.request'||cmd.intent.id!=='iv')return null;
 const requested=cmd.intent.count===2?2:1,previous=p.venousAccessCount??0;
 p.venousAccessCount=Math.max(previous,requested);
 p.procedures.iv={eventId:cmd.eventId,patientUid:p.uid,count:p.venousAccessCount};
 return executed(p,cmd,{count:p.venousAccessCount,
  message:previous>=requested?'Acceso venoso ya confirmado: '+p.venousAccessCount+'.':
   'Acceso venoso periférico confirmado: '+p.venousAccessCount+'.'});
}
