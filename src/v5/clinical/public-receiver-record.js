// The receiving service is given an explicit chart, never the active case,
// hidden physiology, susceptibility, random draw or true diagnostic answer.
// Published protocols are knowledge, not the identity of this patient.
import {assessDiagnosticImpression} from './diagnostic-assessment.js';
import {physicianExaminationsPerformed} from './diagnostic-evidence.js';
import {hasRecordedVitals,postInterventionReassessments} from './observations.js';
import {publicClosureRule,RECEIVER_SERVICE_LABELS} from './public-receiver-policy.js';
import {evaluateClinicalPolicyDisposition} from './clinical-policy-closure.js';
import {evaluateHistoricalGastroDisposition,evaluateGastroDisposition} from './gastro-closure-v5.js';
import {gastroClosureRule} from './gastro-expansion-policies.js';
import {clinicalTransferContinuation} from './transfer-continuation.js';
import {consultationEvidenceReview,consultationPreparationReview} from './consultation-evidence.js';
import {criticalCareReview487} from './critical-care-review.js';
const copy=x=>structuredClone(x);
const privateKeys=new Set(['caseId','caseData','clinicalPolicy','clinicalAdvisories','pharmacology','complicationCandidates','variation','diagnosticCompatible']);
const communicated=value=>Array.isArray(value)?value.map(communicated):value&&typeof value==='object'?
 Object.fromEntries(Object.entries(value).filter(([key])=>!privateKeys.has(key)).map(([key,item])=>[key,communicated(item)])):value;
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function publicReceiverRecord(p){
 const knownAllergies=(p.intentHistory||[]).some(x=>/allerg/i.test(x.id));
 return communicated(copy({uid:p.uid,diagnosis:p.diagnosis,liveVitals:p.liveVitals,
  lastVitalsKnown:p.lastVitalsKnown,firstVitalsKnown:p.firstVitalsKnown,
  exam:p.exam,examDone:p.examDone,examFindings:p.examFindings,examLog:p.examLog,
  intentHistory:p.intentHistory,orders:p.orders,administrationLog:p.administrationLog,
  treatments:p.treatments,procedures:p.procedures,venousAccessCount:p.venousAccessCount,
  pendingTreatments:p.pendingTreatments,pendingConsults:p.pendingConsults,consults:p.consults,
  reassessments:p.reassessments,physicianReassessed:p.physicianReassessed,lastReassessment:p.lastReassessment,
  caseEnded:p.caseEnded,patientDied:p.patientDied,
  allergies:knownAllergies?p.allergies:[],severeAllergies:knownAllergies?p.severeAllergies:[],
  adverseEvents:p.adverseEvents,
  policyState:{nativeMinute:p.policyState?.nativeMinute??p.phys?.lastNativeMinute??0,
   realSecond:p.policyState?.realSecond,startedAtNativeMinute:p.policyState?.startedAtNativeMinute??0,complications:[]},
  phys:{lastNativeMinute:p.phys?.lastNativeMinute??p.policyState?.nativeMinute??0}}));
}
function legacyAssessment(p,c,destination){
 const done=(p.treatments||[]).filter(t=>t.patientUid===p.uid).map(t=>t.id);
 if(p.venousAccessCount>0)done.push('iv');
 const studies=(p.orders||[]).filter(o=>o.patientUid===p.uid&&o.status==='done'&&o.result);
 const snapshot={caseId:c.id,diagnosis:p.diagnosis,acceptedDiagnoses:c.dx,
  diagnosticCompatible:assessDiagnosticImpression(c,p.diagnosis).sufficient,diagnosticAssessment:assessDiagnosticImpression(c,p.diagnosis),
  historyAnswered:(p.intentHistory||[]).map(x=>x.id),historyRelevant:c.requiredHistory||[],historyCount:(p.intentHistory||[]).length,
  examDone:p.examDone,examRegionsCount:Object.keys(p.examFindings||{}).length,
  examPerformed:physicianExaminationsPerformed(p),vitalsKnown:hasRecordedVitals(p),
  reassessments:postInterventionReassessments(p),studiesDone:studies.map(x=>x.id),
  studyResults:Object.fromEntries(studies.map(x=>[x.id,x.result])),keyStudies:c.keyStudies,keyInterventions:c.keyInterventions,
  delivered:done,administered:done,consultsDone:(p.consults||[]).filter(x=>x.status==='done'&&x.accepted).map(x=>x.id),
  ...p.liveVitals,initialSys:p.firstVitalsKnown?.vitals?.sys??p.lastVitalsKnown?.vitals?.sys??p.liveVitals.sys,
  disposition:destination,dead:p.patientDied,ended:p.caseEnded,patientDied:p.patientDied,caseEnded:p.caseEnded};
 return gastroClosureRule(c.id)?evaluateGastroDisposition(snapshot):evaluateHistoricalGastroDisposition(snapshot);
}
export function publicProtocolAssessment(p,published,destination){
 return published.clinicalPolicy?evaluateClinicalPolicyDisposition(p,published,destination):legacyAssessment(p,published,destination);
}
// A positive public study can establish a time-critical indication even when
// the typed impression is wrong. Compare the communicated positive authored
// report, not the secret case ID or an unperformed requested study.
function positivePublicEvidence(p,c){
 const rule=publicClosureRule(c),diagnostic=new Set([...(rule?.study||[]).flat(),...(rule?.requiredStudies||[])]);
 return (p.orders||[]).some(row=>row.patientUid===p.uid&&row.status==='done'&&row.result&&
  diagnostic.has(row.id)&&(c.studies||[]).some(study=>{
   const expected=norm(study.result),actual=norm(row.result),index=actual.indexOf(expected);
   return study.id===row.id&&expected.length>12&&index>=0&&
    !/descartad|se descarta|no se (?:observa|evidencia|demuestra)|negativo para|sin evidencia de/.test(actual.slice(Math.max(0,index-90),index));
  }));
}
function contradictoryPublicEvidence(p,c){
 const rule=publicClosureRule(c),diagnostic=new Set([...(rule?.study||[]).flat(),...(rule?.requiredStudies||[])]);
 return (p.orders||[]).some(row=>row.patientUid===p.uid&&row.status==='done'&&diagnostic.has(row.id)&&
  [...String(row.result||'').matchAll(/(?:no hay evidencia de|sin evidencia de|sin signos de|se descarta)\s+([^.;\n]+)/gi)]
   .some(match=>assessDiagnosticImpression(c,match[1]).compatible));
}
export function publicReceiverOptions(record,catalog,destination=null,requestedService=null){
 const options=[];
 for(const c of catalog){
  const rule=publicClosureRule(c);if(!rule)continue;
  for(const [target,services] of Object.entries(rule.consult||{})){
   if(destination&&destination!==target)continue;
   if(requestedService&&!services.includes(requestedService)&&!(requestedService==='cirugia'&&services.some(x=>['cardiovascular','neurosurgery'].includes(x))))continue;
   const dx=assessDiagnosticImpression(c,record.diagnosis);
   const urgentExam=rule.urgentStudyBypass===true&&physicianExaminationsPerformed(record).length>0;
   if(!dx.compatible&&!positivePublicEvidence(record,c)&&!urgentExam)continue;
   const assessment=publicProtocolAssessment(record,c,target);
   const objective=assessment?.objectiveReceiverIndication===true&&(positivePublicEvidence(record,c)||urgentExam);
   if(!dx.compatible&&!objective)continue;
   const service=requestedService&&services.includes(requestedService)?requestedService:services.find(id=>Object.hasOwn(RECEIVER_SERVICE_LABELS,id));
   if(!service)continue;
   options.push({protocol:c,destination:target,service,objective,assessment,rank:dx.level==='specific'?2:1});
  }
 }
 return options.sort((a,b)=>b.rank-a.rank);
}
export function evaluatePublicReceiver(record,catalog,{destination=null,service,transfer=false}={}){
 const options=publicReceiverOptions(record,catalog,destination,service);
 const refusal={accepted:false,status:'no-indication',reasonCode:record.diagnosis?'destination-not-indicated':'diagnosis-missing',
  decision:'REJECTED_NO_INDICATION',reason:record.diagnosis?
   'Con la impresión diagnóstica y los datos comunicados no hay una indicación de recepción por este servicio.':
   'Falta registrar una impresión diagnóstica para fundamentar la solicitud.'};
 if(!options.length)return refusal;
 let firstIssue;
 for(const option of options){
  const {protocol,destination:target,assessment,objective}=option,rule=publicClosureRule(protocol);
  const evidence=consultationEvidenceReview(record,protocol,rule,{objectiveReceiverIndication:objective});
  if(evidence){firstIssue??=evidence;continue;}
  if(contradictoryPublicEvidence(record,protocol)){
   firstIssue??={accepted:false,status:'contradictory-evidence',reasonCode:'communicated-evidence-contradicts-hypothesis',
    decision:'REJECTED_DIAGNOSIS_INSUFFICIENT',reason:'El informe comunicado contradice explícitamente la hipótesis; aclarar el diagnóstico antes de esta recepción.'};continue;
  }
  if(transfer&&assessment?.requirements?.some(x=>x.reason==='destination-not-indicated')){firstIssue??=refusal;continue;}
  // A critical destination may be received by a specialty team (e.g. a
  // coronary unit). Preserve its published protocol rather than replacing
  // that team's judgement with the generic ICU acuity filter.
  if(option.service==='uti'){
   const traits=protocol.clinicalPolicy?.traits||[];
   const criticalIllness=traits.some(t=>['neuromuscularWeakness','intracranialBleed','statusEpilepticus','convulsiveStatusEpilepticus','respiratoryFailure','ards'].includes(t))||
    record.treatments.some(t=>t.patientUid===record.uid&&['intubation','lung_protective_ventilation','temporary_pacing'].includes(t.id)&&t.kind==='procedure.performed');
   const critical=criticalCareReview487(record.liveVitals,{recentShock:record.firstVitalsKnown?.vitals?.sys<90,criticalIllness});
   if(!critical.accepted){firstIssue??={...critical,reasonCode:'destination-not-indicated',decision:'REJECTED_NO_INDICATION'};continue;}
  }
  const continuation=clinicalTransferContinuation(record,protocol,target);
  const preparation=consultationPreparationReview(assessment,{transfer,pendingTreatments:continuation.pendingBlockers.length});
  if(preparation){firstIssue??=preparation;continue;}
  return {accepted:true,status:'accepted',decision:'ACCEPTED',reasonCode:null,
   destination:target,service:option.service,publicProtocolId:protocol.id,
   reason:'Recepción aceptada según el diagnóstico presuntivo, la evidencia comunicada y la preparación confirmada. Mantener soporte y vigilancia durante el traslado. La aceptación no acredita un procedimiento realizado.'+
    (continuation.withheldPreparations?.length?' No retrasar el tratamiento definitivo para administrar una preparación actualmente contraindicada; esa omisión queda documentada en el traslado.':'')};
 }
 return firstIssue||refusal;
}
