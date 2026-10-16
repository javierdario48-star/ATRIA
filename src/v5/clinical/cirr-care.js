import {csAnamnesisFact} from '../../clinical/anamnesis-intents.js';
import {csEvaluateClosure487} from '../../clinical/case-completion-487.js';
import {initialCirrVitals,parseCirrDose,advanceCirrVitals} from './native-cirr.js';
import {nativeCaseXP} from './progression.js';
import {EXAM_TECHNIQUES,initializeExamination,executePhysicalExam} from './physical-exam.js';
import {executeObservation,recordVitalMeasurement} from './observations.js';

const copy=x=>structuredClone(x);
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
export const CIRR_EXAM_NAMES=EXAM_TECHNIQUES;
export function closureSnapshot(p,c,destination){return {
 caseId:c.id,diagnosis:p.diagnosis,acceptedDiagnoses:c.dx,historyAnswered:p.intentHistory.map(x=>x.id),historyRelevant:c.requiredHistory,
 examDone:p.examDone,examRegionsCount:p.examDone?2:Object.keys(p.exam).length?1:0,vitalsKnown:!!p.lastVitalsKnown,reassessments:p.reassessments,
 studiesDone:p.orders.filter(o=>o.status==='done').map(o=>o.id),extraStudies:p.orders.filter(o=>!c.keyStudies.includes(o.id)).map(o=>o.id),
 keyStudies:c.keyStudies,keyInterventions:c.keyInterventions,delivered:p.treatments.map(t=>t.id),consultsDone:[],disposition:destination,
 sys:p.liveVitals.sys,hr:p.liveVitals.hr,spo2:p.liveVitals.spo2,rr:p.liveVitals.rr,initialSys:initialCirrVitals(c).sys,
 dead:false,ended:p.caseEnded,adverseCount:0,autonomy:100,uid:p.uid};}

/** One migrated native care executor, operating on the SAME patient as C1.
 * No UI, timers, global binding, pharmacology wrapper or alternate patient state.
 */
export function createCirrCare(p,c,{mode,defaultDoses,progress}){
 if(c.id!=='CIRR-001')throw Error('C2 care only supports CIRR-001');
 Object.assign(p,{liveVitals:initialCirrVitals(c),baselineVitals:initialCirrVitals(c),intentHistory:[],exam:{},examDone:false,lastVitalsKnown:null,
  diagnosis:'',reassessments:0,lastReassessment:null,pendingTreatments:[],administrationLog:[],procedures:{},caseEnded:false,closure:null});
 initializeExamination(p);
 const pending=new Map();
 const rejected=(cmd,reason,message)=>({status:'rejected',eventId:cmd.eventId,patientUid:p.uid,reason,
  ...(message?{receipt:{eventId:cmd.eventId,patientUid:p.uid,message}}:{})});
 const executed=(cmd,data)=>({status:'executed',eventId:cmd.eventId,patientUid:p.uid,
  receipt:{eventId:cmd.eventId,patientUid:p.uid,actorId:cmd.actorId,kind:cmd.intent.kind,id:cmd.intent.id,...data}});
 const txReceipt=(cmd,t,reused=false)=>executed(cmd,{therapyId:t.id,sourceEventId:t.sourceEventId,dose:copy(t.dose),
  administeredAtRealSecond:t.administeredAtRealSecond,administeredAtNativeMinute:t.administeredAtNativeMinute,reused,
  message:(reused?'Ya ejecutado por la indicación original: ':t.id==='sal_restriccion'?'Conducta registrada: ':'Administración confirmada: ')+t.label+(t.dose?' · '+t.dose.display:'')+'.'});
 function readiness(destination){
  const out=csEvaluateClosure487(closureSnapshot(p,c,destination));
  if(p.pendingTreatments.length){out.ready=false;out.action=null;out.missing.push('Esperar la ejecución o resolución de las intervenciones en preparación.');}
  if(p.treatments.some(t=>!p.lastReassessment?.interventionEvents?.includes(t.sourceEventId))){
   out.ready=false;out.action=null;out.missing.push('Reevaluar después de la última intervención efectivamente ejecutada.');
  }
  return out;
 }
 return Object.freeze({
  readiness,
  execute(cmd,clock){
   if(cmd.patientUid!==p.uid)return rejected(cmd,'wrong-patient');
   if(p.caseEnded)return rejected(cmd,'patient-not-active');
   const {intent}=cmd;
   if(intent.kind==='history.ask'){
    const text=norm(intent.sourceText),fact=csAnamnesisFact(c,intent.sourceText);
    const exact=c.intents.filter(i=>i.keys.some(k=>(' '+text+' ').includes(' '+norm(k)+' '))).sort((a,b)=>
     Math.max(...b.keys.map(k=>norm(k).length))-Math.max(...a.keys.map(k=>norm(k).length)))[0];
    const historyId=exact?.id||(fact?.text?'anamnesis:'+fact.intent:null),answer=exact?.answers?.[0]||fact?.text||(/^hola\b|^buenas\b/.test(text)?c.opening:null);
    if(!answer)return rejected(cmd,'unknown-question','No entendí la pregunta. Podés preguntarme por el inicio, síntomas o antecedentes.');
    if(historyId&&!p.intentHistory.some(x=>x.id===historyId))p.intentHistory.push({id:historyId,answer,source:exact?'case.intents.'+exact.id:fact.source,eventId:cmd.eventId});
    return executed(cmd,{answer,message:answer,historyId,source:exact?'case.intents.'+exact.id:fact?.source||'case.opening'});
   }
   const exam=executePhysicalExam(p,c,cmd,clock);if(exam)return exam;
   const observation=executeObservation(p,cmd,clock);if(observation)return observation;
   if(intent.kind==='therapy.request'&&['espironolactona','sal_restriccion','paracentesis_ter'].includes(intent.id)){
    let dose=null;
    if(intent.id==='espironolactona'){try{dose=parseCirrDose(intent.clause||intent.sourceText,defaultDoses?.espironolactona);}catch(error){return rejected(cmd,error.message,'Dosis o vía no validada en C2. Esquema disponible: espironolactona 100 mg oral. No administrado.');}}
    const existing=p.treatments.find(t=>t.id===intent.id);if(existing)return txReceipt(cmd,existing,true);
    const job=pending.get(intent.id);
    if(job){job.commands.push(copy(cmd));return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};}
    const label=c.interventions.find(i=>i.id===intent.id)?.label||intent.id;
    if(intent.id==='sal_restriccion'){
     const t={id:intent.id,label,dose,sourceEventId:cmd.eventId,patientUid:p.uid,actorId:cmd.actorId,administeredAtNativeMinute:clock.nativeMinute,administeredAtRealSecond:clock.clinicalMinute};
     p.treatments.push(t);return txReceipt(cmd,t);
    }
    const task={id:intent.id,label,dose,sourceEventId:cmd.eventId,patientUid:p.uid,actorId:cmd.actorId,
     readyAtRealSecond:clock.clinicalMinute+.55,commands:[copy(cmd)]};
    pending.set(intent.id,task);p.pendingTreatments.push({id:task.id,sourceEventId:task.sourceEventId,patientUid:p.uid,readyAtRealSecond:task.readyAtRealSecond});
    return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};
   }
   if(intent.kind==='patient.reassess'){
    p.reassessments++;p.lastReassessment={nativeMinute:clock.nativeMinute,eventId:cmd.eventId,vitals:copy(p.liveVitals),
     administrationEvents:p.administrationLog.map(t=>t.sourceEventId),interventionEvents:p.treatments.map(t=>t.sourceEventId)};
    recordVitalMeasurement(p,clock,cmd.eventId,'reassessment');
    return executed(cmd,{assessment:copy(p.lastReassessment),message:'Reevaluación registrada. PA '+Math.round(p.liveVitals.sys)+'/'+Math.round(p.liveVitals.dia)+' · FC '+Math.round(p.liveVitals.hr)+'. Ascitis y respuesta diurética no tienen cinética modelada en la semilla original; continuar seguimiento.'});
   }
   if(intent.kind==='diagnosis.record'){
    p.diagnosis=intent.value;return executed(cmd,{diagnosis:p.diagnosis,message:'Impresión diagnóstica registrada: '+p.diagnosis+'.'});
   }
   if(intent.kind==='case.close'){
    const evaluation=readiness(intent.id);
    if(!evaluation?.ready)return rejected(cmd,'closure-not-ready',(evaluation?.missing||['Destino no disponible.']).join(' '));
    const xp=nativeCaseXP({score:evaluation.quality.score,mode});
    const receipt={kind:'clinical.closure',eventId:cmd.eventId,patientUid:p.uid,actorId:cmd.actorId,caseId:c.id,
     destination:intent.id,quality:copy(evaluation.quality),xp,closed:true};
    progress.award(receipt);p.caseEnded=true;p.closure=copy(receipt);
    return executed(cmd,{closure:copy(receipt),message:'Caso cerrado: '+(intent.id==='sala'?'internación en sala':'observación')+' · '+evaluation.quality.score+'/100 · +'+xp+' XP.'});
   }
   return rejected(cmd,'clinical-action-not-migrated');
  },
  advance(clockBefore,clockAfter,dt){
   const completions=[];if(p.caseEnded)return completions;
   // Split at the original 550ms preparation boundary. An order does not
   // contribute to physiology before the native administration actually occurs.
   let cursor=clockBefore.clinicalMinute;
   const due=[...pending.values()].filter(t=>t.readyAtRealSecond<=clockAfter.clinicalMinute+1e-9).sort((a,b)=>a.readyAtRealSecond-b.readyAtRealSecond);
   for(const task of due){
    const at=Math.max(cursor,task.readyAtRealSecond);advanceCirrVitals(p,c,at-cursor);cursor=at;
    const fraction=dt>0?(at-clockBefore.clinicalMinute)/dt:0;
    const t={id:task.id,label:task.label,dose:copy(task.dose),sourceEventId:task.sourceEventId,patientUid:p.uid,actorId:task.actorId,
     administeredAtRealSecond:at,administeredAtNativeMinute:clockBefore.nativeMinute+(clockAfter.nativeMinute-clockBefore.nativeMinute)*fraction};
    p.treatments.push(t);p.administrationLog.push(copy(t));pending.delete(task.id);
    p.pendingTreatments=p.pendingTreatments.filter(x=>x.sourceEventId!==task.sourceEventId);
    for(const cmd of task.commands)completions.push(txReceipt(cmd,t));
   }
   advanceCirrVitals(p,c,Math.max(0,clockAfter.clinicalMinute-cursor));return completions;
  },
  dispose(){pending.clear();p.pendingTreatments=[];}
 });
}
