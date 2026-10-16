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

/** C08c: nasal oxygen is a real bedside intervention, not a generic SpO2 buff.
 * V4 verifies 2 and 4 L/min but its hypoxemic PERI-SEC physiology is deferred.
 */
export function parseNasalOxygenFlow(text,reference={amount:4}){
 const raw=String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/,/g,'.');
 if(/\b(?:oral|intravenos\w*|endovenos\w*|mascara|mask|reservorio|alto flujo|venturi)\b/.test(raw))
  throw Error('unsupported-oxygen-device');
 const matches=[...raw.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:l\s*(?:\/\s*|\s+por\s+|\s+)min|lpm)\b/g)];
 let leftover=raw;for(const match of matches)leftover=leftover.replace(match[0],' ');
 if(matches.length>1||/\d/.test(leftover))throw Error('ambiguous-oxygen-flow');
 const amount=matches.length?Number(matches[0][1]):reference.amount;
 if(![2,4].includes(amount))throw Error('unsupported-oxygen-flow');
 return {amount,unit:'L/min',display:amount+' L/min',device:'nasal-cannula',
  defaultApplied:matches.length===0};
}
export function executeOxygenSupport(p,cmd,clock){
 const {intent}=cmd;
 if(intent.id!=='oxygen'||!['therapy.request','therapy.stop'].includes(intent.kind))return null;
 const stop=intent.kind==='therapy.stop',prior=p.procedures.oxygen;
 let dose=null;
 if(!stop){
  try{dose=parseNasalOxygenFlow(intent.clause||intent.sourceText);}
  catch(error){return {status:'rejected',eventId:cmd.eventId,patientUid:p.uid,reason:error.message};}
 }
 if(stop&&!prior?.active)return {status:'rejected',eventId:cmd.eventId,patientUid:p.uid,reason:'oxygen-not-active'};
 const unchanged=!stop&&prior?.active&&prior.flowLpm===dose.amount;
 const action=stop?'stop':prior?.active?'setRate':'start';
 if(!unchanged){
  p.procedures.oxygen={patientUid:p.uid,active:!stop,flowLpm:stop?0:dose.amount,
   device:'nasal-cannula',sourceEventId:cmd.eventId};
  const administered={id:'oxygen',label:stop?'Oxígeno suspendido':'Oxígeno suplementario',
   action,dose:stop?{amount:0,unit:'L/min',display:'0 L/min'}:dose,
   sourceEventId:cmd.eventId,actorId:cmd.actorId,patientUid:p.uid,
   administeredAtRealSecond:clock.clinicalMinute,administeredAtNativeMinute:clock.nativeMinute};
  p.administrationLog.push(administered);p.treatments.push(administered);
 }
 return executed(p,cmd,{...(stop?{}:{therapyId:'oxygen'}),
  action,flowLpm:stop?0:dose.amount,reused:unchanged,
  message:unchanged?'Oxígeno nasal ya confirmado a '+dose.display+'.':
   stop?'Oxígeno nasal suspendido y comprobado.':
   'Oxígeno nasal '+dose.display+' confirmado en cama. Sin efecto fisiológico modelado para este caso.'});
}
