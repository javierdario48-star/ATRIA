import {createClinicalHintLedger,hintAdjustedXP,hintPenaltyPercent} from './clinical-hint-ledger.js';
import {auditClosureRequirements,clinicalChecklist,clinicalHintRequirements,hintDestination} from './clinical-hint-requirements.js';
import {selectClinicalHint} from './clinical-hints.js';
import {createRoomAuthority} from '../core/room-authority.js';
import {clinicalExecutorFor} from '../content/clinical-cases.js';
import {CLINICAL_TREATMENTS} from '../content/clinical-treatment-definitions.js';
import {materializeGuardPatient} from '../content/guard-patient-variation.js';
import {createNativeClinicalPort} from '../adapters/native-clinical-port.js';
import {createStudyService} from './studies.js';
import {isTroponinStudy,studyOrderVocabulary} from './study-order-vocabulary.js';
import {createCirrCare} from './cirr-care.js';
import {createAppCare} from './app-care.js';
import {createPeritonitisCare} from './peritonitis-care.js';
import {createCholangitisCare} from './cholangitis-care.js';
import {createCholeCare} from './chole-care.js';
import {createPancCare,createAdditionalCaseCare,ADDITIONAL_CASE_DISPOSITIONS} from './additional-case-care.js';
import {createProgressionLedger} from './progression.js';
import {assertMatchingClinicalReceipt} from './receipts.js';
import {createGuardClock} from './guard-clock.js';
import {refreshMonitoring,parseNasalOxygenFlow} from './observations.js';
import {vegaGuidance} from './vega-guidance.js';
import {NATIVE_MEDICINES,isNativeMedicine,nativeMedicineDefinition,preflightNativeMedicine} from './native-medications.js';
import {clinicalInterventionCapability} from './native-medication-eligibility.js';
import {parseCirrDose} from './native-cirr.js';
import {summarizeIVExposures} from './medication-exposure.js';
import {createCasePharmacology} from './pharmacology-catalog.js';
import {advanceNativeSurvival} from './survival-487-bridge.js';
import {confirmedFluidFeedback,fluidFeedbackLabel} from './fluid-feedback.js';
import {patientAllergyFacts487} from './medication-safety-487.js';
import {documentMedicationComplications487} from './medication-harms-487.js';
import {CASE_CLOSURE_RULES_487,CLOSURE_DEST_LABELS_487} from '../../clinical/case-completion-487.js';
import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';
import {GASTRO_CONDUCT_DOSES} from './gastro-medication-rules.js';
import {isExaminationCommand,isExaminationKind,isPhysicianExamStudy} from './exam-contract.js';
import {consultationEvidenceReview} from './consultation-evidence.js';
import {unrescuedTransferReactions} from './transfer-continuation.js';

const copy=value=>structuredClone(value);
const pendingStudyKey=(source,series)=>series?JSON.stringify(['series',source]):source;
function hideUnreportedStudyResults(orders){
 for(const order of orders){
  if(order.status!=='done'&&(order.collection||order.samples||isTroponinStudy(order)))delete order.result;
  for(const sample of order.samples||[])if(sample.status!=='done')delete sample.result;
 }
 return orders;
}
const survivalSensitiveIV=new Set(['anticoagulation','morphine','albumin','transfusion','vasopressor','ppi']);
const routeReason={
 'no-patient-target':'Acercate al paciente y volvé a enviar el mensaje.',
 'physician-exam-required':'El tacto rectal lo realizás desde Examen físico → Periné.',
 'question-or-negation':'Pregunta o indicación negada: no ejecuté ninguna acción.',
 'unknown-clause':'La indicación necesita una aclaración; no ejecuté acciones.',
 'study-assay-unavailable':'Este caso no documenta ese ensayo de troponina I o T. No solicité el estudio.',
 'study-method-unavailable':'Este caso no documenta ese método de medición. No solicité el estudio.',
 'study-series-unavailable':'No hay una serie de troponina disponible con esa indicación. No solicité muestras.',
 'unsafe-compound-order':'Orden combinada no ejecutada: al menos una dosis, vía o intervención no está validada. Corregí la indicación completa.'
};

/** Local authoritative clinical composition. C1 studies and C2 native CIRR
 * care mutate the same owned patient through one port; UI never mutates it.
 */
export function createGuardSession({roomId,mode,actorId,actorName,patient,content,resolveContext,onChange=()=>{},progress=createProgressionLedger(),nursing=null,
 members=[{id:actorId,name:actorName}],authenticate=null,checkpoint=null}){
 if(!['solo','apprentice','coop'].includes(mode)||typeof resolveContext!=='function')throw Error('supported clinical mode/context required');
 if(mode==='coop'&&(members.length<2||members.length>4||!members.some(x=>x.id===actorId)))throw Error('cooperative roster requires two to four doctors');
 const memberNames=new Map(members.map(x=>[x.id,String(x.name||x.id).slice(0,32)]));
 const caseData=content.cases.find(c=>c.id===patient.caseId);if(!caseData)throw Error('unknown patient case');
 const executor=clinicalExecutorFor(caseData);
 if(checkpoint&&(checkpoint.schemaVersion!==1||checkpoint.modelVersion!=='atria-clinical-c5b-1'||
  checkpoint.roomId!==roomId||checkpoint.mode!==mode||checkpoint.actorId!==actorId||
  checkpoint.patient.uid!==patient.uid||checkpoint.patient.caseId!==caseData.id||
  JSON.stringify(checkpoint.members)!==JSON.stringify(members)))throw Error('incompatible clinical checkpoint room/patient/model');
 if(checkpoint)progress=createProgressionLedger(checkpoint.progress);
 const resolvedPatient=materializeGuardPatient(patient,caseData,checkpoint);
 const nativePatient={uid:patient.uid,caseId:patient.caseId,orders:[],treatments:[],
  allergyHistory:copy(resolvedPatient.allergyHistory||[]),intolerances:copy(resolvedPatient.intolerances||[]),
  ...(resolvedPatient.backgroundHistory?{backgroundHistory:copy(resolvedPatient.backgroundHistory)}:{}),
  ...(caseData.variation?{name:resolvedPatient.name,age:resolvedPatient.age,
    personality:resolvedPatient.personality,behavior:copy(resolvedPatient.behavior),opening:resolvedPatient.opening,
    variation:resolvedPatient.variation}:{}),
  ...patientAllergyFacts487(resolvedPatient),adverseEvents:[]};
 if(nativePatient.allergies.length){
  const labels=new Map(content.therapies.map(x=>[x.id,x.label]));
  nativePatient.allergyHistoryAnswer='Tengo alergia a '+nativePatient.allergies.map(id=>
   (labels.get(id)||id)+(nativePatient.severeAllergies.includes(id)?' (reacción grave)':'')).join(', ')+'.';
 }
 const encounterId=checkpoint?.encounterId||roomId+':care:'+nativePatient.uid;
 const hintLedger=createClinicalHintLedger({roomId,encounterId,patientUid:nativePatient.uid},checkpoint?.hints);
 function rewardFor(receipt,doctorId){
  if(!receipt)return receipt;
  const baseXP=receipt.baseXP??receipt.xp,count=hintLedger.count(doctorId);
  return {...copy(receipt),actorId:doctorId,baseXP,hintCount:count,
   hintPenaltyPercent:hintPenaltyPercent(count),xp:hintAdjustedXP(baseXP,count)};
 }
 const options={mode,defaultDoses:content.defaultDoses,
  progress:{...progress,award:receipt=>progress.award(rewardFor(receipt,receipt.actorId))},
  cases:content.cases,checkpoint:checkpoint?.care,clinicalClock:()=>clock,
  nursingWorkPending:()=>nursingWorkPending()};
 // Every case inherits the validated global formulary (including cases that
 // do not yet have an active clinical executor). This is a PURE interpreter,
 // not a replacement for the native APP/CIRR physiological owner.
 const pharmacology=createCasePharmacology({cases:content.cases,therapies:content.therapies});
 const factory={cirr:createCirrCare,app:createAppCare,peritonitis:createPeritonitisCare,
   cholangitis:createCholangitisCare,chole:createCholeCare,panc:createPancCare,
   additional:createAdditionalCaseCare}[executor];
 const care=factory?factory(nativePatient,caseData,options):null;
 // Factories initialize their native fields. Restore the SAME owned object
 // afterwards so every executor and pending task keeps its original reference.
 if(checkpoint){
  for(const k of Object.keys(nativePatient))delete nativePatient[k];Object.assign(nativePatient,copy(checkpoint.patient));
  nativePatient.behavior??=copy(resolvedPatient.behavior);
 }
 const studies=createStudyService(content.cases,checkpoint?.studies),studyOrdering=studyOrderVocabulary(studies.catalog(),caseData.studies);
 const orderedStudies=studyOrdering.catalog;
 const labels=new Map(orderedStudies.map(s=>[s.id,s.label])),pendingStudyRequests=new Map(),pendingNurseJobs=new Map(),waitingForAccess=new Map();
 if(checkpoint){
  for(const [k,v] of checkpoint.pendingStudyRequests)pendingStudyRequests.set(k,new Set(v));
  for(const [k,v] of checkpoint.pendingNurseJobs)pendingNurseJobs.set(k,copy(v));
  for(const [k,v] of checkpoint.waitingForAccess)waitingForAccess.set(k,copy(v));
 }
 const nursingWorkPending=()=>pendingNurseJobs.size>0||waitingForAccess.size>0;
 if(nursing&&(!['enqueue','takeArrivals','accept'].every(k=>typeof nursing[k]==='function')))
  throw Error('nursing adapter needs enqueue, takeArrivals and accept');
 for(const item of [...content.therapies,...caseData.interventions])labels.set(item.id,item.label);
 // Read-only all-or-nothing preflight for *compound* nurse orders. Reuse the
 // same native case formulary and dose/device parsers; never preview effects.
 // Single orders still return their existing per-intervention rejection.
 const migratedTherapies=new Set(['oxygen',...Object.keys(NATIVE_MEDICINES),
  ...(caseData.clinicalPolicy?caseData.interventions.map(x=>x.id):[]),
  ...(['APP-001','CHOLE-001','PANC-001'].includes(caseData.id)?['npo']:
   caseData.id==='CIRR-001'?['espironolactona','sal_restriccion','paracentesis_ter']:
   ADDITIONAL_CASE_DISPOSITIONS[caseData.id]?.conducts||[])]);
 function validateClinicalBatch(intents){
  if(intents.length<2)return null;
  for(const intent of intents){
   if(!['therapy.request','therapy.stop'].includes(intent.kind))continue;
   if(!migratedTherapies.has(intent.id)||
      intent.kind==='therapy.stop'&&intent.id!=='oxygen'&&!nativeMedicineDefinition(intent.id,caseData)?.continuous)
    return 'unsafe-compound-order';
   if(intent.kind==='therapy.stop'){
    if(!nativePatient.procedures?.[intent.id]?.active)
     return 'unsafe-compound-order';
    continue;
   }
   try{
    if(isNativeMedicine(intent.id)){
     preflightNativeMedicine(intent.id,intent.clause||intent.sourceText,{caseData,patient:nativePatient,clock,requireAccess:false,
      reference:content.defaultDoses?.[intent.id]??NATIVE_MEDICINES[intent.id]?.dose,unfiltered:intent.sourceText});
    }
    else if(intent.id==='oxygen')
     parseNasalOxygenFlow(intent.clause||intent.sourceText,undefined,intent.sourceText);
    else if(intent.id==='espironolactona')
     parseCirrDose(intent.clause||intent.sourceText,content.defaultDoses?.espironolactona);
   }catch{return 'unsafe-compound-order';}
  }
  return null;
 }
 const guardClock=createGuardClock(actorId,checkpoint?.clock);let clock=guardClock.read(),disposed=false,deathPublished=checkpoint?.deathPublished??false;
 const credentials=Object.freeze({roomId,actorId,nonce:Symbol('local-room')});
 const port=createNativeClinicalPort({
  checkpoint:checkpoint?.port,
  validateReceipt:assertMatchingClinicalReceipt,
  withPatient:async(uid,fn)=>{if(uid!==nativePatient.uid)throw Error('patient not in this room');return fn(nativePatient);},
  invoke:async({eventId,actorId,patientUid,intent})=>{
   if(intent.kind==='nurse.inquire'&&intent.id==='allergies'){
    // Use the medication executor's existing safety facts; never invent negatives.
    const labels=new Map(content.therapies.map(t=>[t.id,t.label]));
    const display=id=>labels.get(id)||id.replace(/_/g,' ');
    const allergies=nativePatient.allergies||[],intolerances=nativePatient.intolerances||[];
    const severe=new Set(nativePatient.severeAllergies||[]);
    const parts=[];
    if(allergies.length)parts.push('Alergias registradas: '+allergies.map(id=>
     display(id)+(severe.has(id)?' (reacción grave)':'')).join(', ')+'.');
    if(intolerances.length)parts.push('Intolerancias registradas: '+intolerances.map(display).join(', ')+'.');
    if(!parts.length)parts.push('No constan alergias medicamentosas en la ficha disponible; hay que confirmarlo con el paciente o un acompañante.');
    return {status:'executed',patientUid,eventId,receipt:{patientUid,eventId,kind:intent.kind,id:intent.id,message:parts.join(' ')}};
   }
   if(intent.kind==='case.close'){
    const rule=caseData.clinicalPolicy?.closure||GASTRO_CASE_RULES[caseData.id]||CASE_CLOSURE_RULES_487[caseData.id];
    if(rule&&!rule.destinations.includes(intent.id))return {status:'rejected',patientUid,eventId,reason:'destination-not-indicated',
     receipt:{patientUid,eventId,decision:'REJECTED_NO_INDICATION',reasonCode:'destination-not-indicated',
      message:'El destino solicitado no está indicado con la situación clínica actual. Revisá la necesidad de vigilancia, tratamiento y nivel de cuidado.'}};
    if(unrescuedTransferReactions(nativePatient,caseData,clock.nativeMinute).length)
     return {status:'rejected',patientUid,eventId,reason:'stabilization-insufficient',
      receipt:{patientUid,eventId,decision:'REJECTED_STABILIZATION_INSUFFICIENT',reasonCode:'stabilization-insufficient',
       message:'Reacción alérgica grave activa: falta un rescate confirmado posterior al desencadenante antes del traslado.'}};
   }
   if(nursing&&intent.kind==='case.close'&&nursingWorkPending())
    return {status:'rejected',patientUid,eventId,reason:'nursing-work-in-progress'};
   if(intent.kind==='case.close'&&!intent.partial){
    const rule=caseData.clinicalPolicy?.closure||GASTRO_CASE_RULES[caseData.id]||CASE_CLOSURE_RULES_487[caseData.id];
    const issue=consultationEvidenceReview(nativePatient,caseData,rule);
    if(issue)return {status:'rejected',patientUid,eventId,reason:rule?.consult?.[intent.id]?.length?'transfer-not-accepted':'closure-not-ready',
     receipt:{eventId,patientUid,decision:issue.decision,reasonCode:issue.reasonCode,message:issue.reason}};
   }
   const ivMedicine=!!care&&intent.kind==='therapy.request'&&isNativeMedicine(intent.id);
   const nativeOralMedicine=!!care&&intent.kind==='therapy.request'&&!!GASTRO_CONDUCT_DOSES[intent.id];
   const definition=nativeMedicineDefinition(intent.id,caseData)||CLINICAL_TREATMENTS[intent.id];
   const requiresAccess=!!definition?.requiresAccess;
   const clinicalProcedure=!!care&&intent.kind==='therapy.request'&&CLINICAL_TREATMENTS[intent.id]?.kind!=='medication'&&!!CLINICAL_TREATMENTS[intent.id];
   const infusionStop=!!care&&intent.kind==='therapy.stop'&&definition?.continuous;
   const oxygenAction=!!care&&intent.id==='oxygen'&&['therapy.request','therapy.stop'].includes(intent.kind);
   const cirrBedside=caseData.id==='CIRR-001'&&intent.kind==='therapy.request'&&
    ['espironolactona','paracentesis_ter'].includes(intent.id);
   const physical=nursing&&(intent.kind==='procedure.request'&&['iv','monitor','vitals'].includes(intent.id)||
    intent.kind==='monitor.set'&&intent.id==='connect'||ivMedicine||nativeOralMedicine||clinicalProcedure||infusionStop||cirrBedside||oxygenAction);
   if(physical){
    if(nativePatient.caseEnded)return {status:'rejected',patientUid,eventId,reason:'patient-not-active'};
    // Native case policy remains the only executor. These are the same
    // certified dose/route parsers that it calls, never a new catalog.
    try{
     if(ivMedicine){
      preflightNativeMedicine(intent.id,intent.clause||intent.sourceText,{caseData,patient:nativePatient,clock,requireAccess:false,eventId,
       reference:content.defaultDoses?.[intent.id]??NATIVE_MEDICINES[intent.id]?.dose,unfiltered:intent.sourceText});
     }
     const eligibility=intent.kind!=='therapy.stop'&&clinicalInterventionCapability(nativePatient,caseData,intent.id,clock);
     if(eligibility)throw Error(eligibility.reason);
     if(oxygenAction&&intent.kind==='therapy.request')parseNasalOxygenFlow(intent.clause||intent.sourceText,undefined,intent.sourceText);
     if(cirrBedside&&intent.id==='espironolactona')
      parseCirrDose(intent.clause||intent.sourceText,content.defaultDoses?.espironolactona);
    }catch(error){return {status:'rejected',patientUid,eventId,reason:error.message};}
    if(infusionStop&&!nativePatient.procedures[intent.id]?.active)
     return {status:'rejected',patientUid,eventId,reason:'infusion-not-active'};
    if(oxygenAction){
     const active=nativePatient.procedures.oxygen;
     if(intent.kind==='therapy.stop'&&!active?.active)
      return {status:'rejected',patientUid,eventId,reason:'oxygen-not-active'};
     if(intent.kind==='therapy.request'&&active?.active&&
        active.flowLpm===parseNasalOxygenFlow(intent.clause||intent.sourceText,undefined,intent.sourceText).amount)
      return care.execute({eventId,actorId,patientUid,intent},clock);
    }
    // IV therapy can only start its native pharmacological preparation
    // once access exists. If a legitimate IV trip is in progress, wait for its
    // exact receipt before queueing the bedside medication.
    if((ivMedicine||clinicalProcedure)&&requiresAccess&&nativePatient.venousAccessCount<1){
     if([...pendingNurseJobs.values()].some(j=>j.intent.kind==='procedure.request'&&j.intent.id==='iv')){
      waitingForAccess.set(eventId,{eventId,actorId,patientUid,intent:copy(intent)});
      return {status:'pending',patientUid,eventId};
     }
     return {status:'rejected',patientUid,eventId,reason:'venous-access-required'};
    }
    // An already connected bedside monitor is an existing verified setup,
    // not a reason to send a second nurse to connect the same cables.
    if((intent.kind==='procedure.request'&&intent.id==='monitor'||
        intent.kind==='monitor.set'&&intent.id==='connect')&&
       nativePatient.procedures.monitor?.connected)
     return care.execute({eventId,actorId,patientUid,intent},clock);
    // Repeated requests for access that already exists should not schedule
    // fictitious second cannulation; two requested lines still need two.
    if(intent.kind==='procedure.request'&&intent.id==='iv'&&
       (nativePatient.venousAccessCount??0)>=(intent.count===2?2:1))
     return care.execute({eventId,actorId,patientUid,intent},clock);
    // Reconfirmed therapies reuse the native certificate, rather than send an
    // NPC on a fictitious second administration after a finished treatment.
    if(intent.kind==='therapy.request'&&!oxygenAction&&!ivMedicine&&nativePatient.treatments.some(t=>t.id===intent.id))
     return care.execute({eventId,actorId,patientUid,intent},clock);
    const travel=nursing.enqueue({eventId,patientUid,kind:intent.id});
    if(['queued','travelling'].includes(travel.status)){
     pendingNurseJobs.set(eventId,{eventId,actorId,patientUid,intent:copy(intent)});
     return {status:'pending',patientUid,eventId};
    }
    return {status:'rejected',patientUid,eventId,reason:'nurse-'+travel.status};
   }
   if(intent.kind==='study.request'){
    const result=studies.request(nativePatient,{id:intent.id,eventId,actorId,atMinute:clock.clinicalMinute,
     atNativeMinute:clock.nativeMinute,series:intent.series,quantity:intent.quantity,additional:intent.additional});
    if(result.status==='pending'){
     const source=result.sourceEventId;
     const key=pendingStudyKey(source,result.series);
     if(!pendingStudyRequests.has(key))pendingStudyRequests.set(key,new Set());
     pendingStudyRequests.get(key).add(eventId);
    }
    return result;
   }
   return care?care.execute({eventId,actorId,patientUid,intent},clock):{status:'rejected',patientUid,eventId,reason:'clinical-action-not-migrated'};
  }
 });
 const authority=createRoomAuthority({roomId,mode,members,patients:[{uid:patient.uid}],
  checkpoint:checkpoint?.authority,
  authenticate:token=>token===credentials?{id:actorId,roomId}:authenticate?.(token)??null,clinicalPort:port,
  resolveSpeechContext:({envelope,actorId:requestActor})=>({...resolveContext({actorId:requestActor,targetPatientUid:envelope.targetPatientUid}),clinicalEvaluation:!!care,
   ...(care&&nursing?{venousAccessCount:nativePatient.venousAccessCount??0,pendingIV:[...pendingNurseJobs.values()].some(j=>j.intent.kind==='procedure.request'&&j.intent.id==='iv'),defaultDoses:content.defaultDoses}:{}),
   studies:orderedStudies,studyOrdering,caseData,therapies:content.therapies,interventions:caseData.interventions,
    surgicalConsultDone:!!nativePatient.consults?.some(x=>x.id==='cirugia'&&x.status==='done'&&x.accepted),
    consultServices:[...new Set(Object.values(caseData.clinicalPolicy?.closure?.consult||{}).flat())],
   validateClinicalBatch}),
  respondNpc:({patientUid,text})=>vegaGuidance(patientUid===nativePatient.uid?nativePatient:null,caseData,text),
  time:()=>clock.clinicalMinute,emit:(event,snapshot)=>onChange(copy(event),copy(snapshot))});
 function closureReadiness(destination){
  const out=care?.readiness(destination);if(!out)return null;
  if(nursingWorkPending()){
   out.ready=false;out.action=null;out.choices=[];
   out.missing.push('Esperar la ejecución o resolución de las tareas físicas de enfermería pendientes.');
  }
  return out;
 }
 function currentChecklist(){
  const destination=hintDestination(nativePatient,caseData,closureReadiness),assessment=closureReadiness(destination);
  return {destination,assessment,requirements:clinicalHintRequirements(nativePatient,caseData,assessment,destination)};
 }
 function eligibleDestinations(){
  if(!care||nativePatient.caseEnded)return [];
  const destinations=(caseData.clinicalPolicy?.closure||GASTRO_CASE_RULES[caseData.id]||CASE_CLOSURE_RULES_487[caseData.id])?.destinations;
  if(destinations)return destinations.filter(id=>closureReadiness(id)?.ready);
  const out=closureReadiness();return out?.ready?[out.action]:[];
 }
 const publishReadiness=()=>authority.reportCareReadiness({patientUid:nativePatient.uid,destinations:eligibleDestinations()});
 function resultText(item,label){
  if(item.kind==='nurse.inquire'&&item.status==='executed')return item.receipt?.message||'La consulta no tiene información disponible.';
  // An unanswered history question is a patient reply, not a failed nursing procedure.
  if(item.kind==='history.ask')return null;
  if(item.status==='unconfirmed')
   return item.receipt?.message||'ATRIA: error técnico recuperable. '+label+': ejecución no confirmada; comprobá el estado del paciente antes de repetir.';
  if(item.kind==='study.request'&&item.receipt?.collection){
   const collectionLabel=item.receipt.label||label;
   if(item.status==='pending')return collectionLabel+': solicitado; toma pendiente. Microbiología pendiente.';
   if(item.status==='executed')return collectionLabel+': toma confirmada. '+item.receipt.result;
  }
  if(item.status!=='rejected')return null;
  if(item.receipt?.message)return 'No ejecutado: '+item.receipt.message;
  if(item.reason==='clinical-action-not-migrated'){
   // Unsupported clinical execution is a system limitation, not a clinical
   // contraindication. Never tell the learner that surgery is inappropriate.
   if(item.kind==='case.close')
    return 'ATRIA: no se pudo evaluar el destino de este paciente. La derivación no fue registrada; no se trata de un rechazo clínico. Conservá la atención y reportá el caso '+caseData.id+'.';
   if(item.kind==='consult.request')
    return 'ATRIA: no se pudo registrar la interconsulta. No implica que el servicio haya rechazado al paciente. Caso '+caseData.id+'.';
   return item.kind==='therapy.request'?
    label+': la orden no se pudo evaluar en este caso; no fue administrada.':
    label+': la orden no se pudo evaluar; no fue ejecutada.';
  }
  if(item.reason==='nursing-work-in-progress')
   return label+': todavía hay órdenes de enfermería en curso. Esperá su confirmación antes de cerrar la atención.';
  if(item.reason==='pending-clinical-treatment')
   return 'El traslado está pendiente de preparación. Enfermería todavía debe iniciar o confirmar una intervención.';
  if(item.reason==='patient-not-active')
   return label+': el caso ya finalizó; no se admiten nuevas órdenes.';
  if(item.reason==='oxygen-not-active')return label+': no hay oxígeno activo que suspender.';
  if(item.reason==='venous-access-required')
   return label+': necesitás una vía venosa confirmada antes de administrarlo.';
  const technical={
   'unsupported-dose-route':'esa vía no está implementada para esta presentación.',
   'unsupported-morphine-dose-route':'esta presentación admite una sola dosis positiva en mg por vía IV.',
   'invalid-dose':'no pude interpretar la dosis y su unidad.',
   'unsupported-dose':'la dosis debe ser un valor positivo con su unidad.',
   'ambiguous-dose':'hay más de una dosis en la indicación; especificá una por administración.',
   'ambiguous-dose-qualifier':'no pude distinguir la dosis de las otras cantidades; especificá la indicación.',
   'intubation-required':'se necesita una vía aérea intubada para conectar este ventilador.'
  };
  return label+': no ejecutado; '+(technical[item.reason]||'no pude confirmar esta ejecución. Revisá la presentación y el estado de la orden antes de repetirla.');
 }
 function messages(room){
  const closureText=item=>item.kind==='case.close'?item.receipt?.message?.replace(/ · \+\d+ XP\.$/,'.'):item.receipt?.message;
  const rows=[],announcedResults=new Set();
  for(const event of room.events){
   if(event.type==='chat.posted'){
    const message={...event.message,id:(mode==='coop'?event.message.actorId+':':'')+event.message.id},selected=/^\/estudio\s+([a-z0-9_-]+)( seriada)?$/i.exec(message.text);
    // The physical exam is the doctor's recorded observation. Keep the full
    // room event for authority/replay, but present its findings in the exam
    // panel rather than turn each maneuver into doctor and nurse chat rows.
    const examination=isExaminationCommand(message.text),examOnly=event.clinical.length>0&&
     event.clinical.every(item=>isExaminationKind(item.kind)&&item.status==='executed');
    // A menu selection retains its exact protocol ID; the shared presentation
    // uses the familiar clinical label rather than exposing that internal ID.
    const text=selected&&labels.has(selected[1])?'Enfermera, '+labels.get(selected[1])+(selected[2]||''):message.text;
    if(!examOnly&&!examination)rows.push({id:'player:'+message.id,name:memberNames.get(message.actorId)||actorName,
     actorId:message.actorId,patientUid:message.patientUid,text,role:'player'});
    const systemGuidance=examination||event.routeError==='physician-exam-required'||
     event.routeError==='no-patient-target'&&message.recipient==='patient';
    if(event.routeError)rows.push({id:'route:'+message.id,name:systemGuidance?'ATRIA':'Enfermera',role:systemGuidance?'system':'nurse',
     actorId:message.actorId,text:examination?(event.routeError==='no-patient-target'?'Examen no registrado. Acercate al paciente para explorarlo.':
      'Examen no registrado. Revisá la región y la maniobra seleccionadas.'):
      routeReason[event.routeError]||'No pude ejecutar esa indicación.'});
    for(let i=0;i<event.clinical.length;i++){
     const item=event.clinical[i],label=labels.get(item.id)||item.id;
     if(isExaminationKind(item.kind)&&item.status==='executed'||isPhysicianExamStudy(item.id))continue;
     const nativeText=closureText(item);
     const feedback=resultText(item,label)||
      (nativeText|| (item.status==='pending'?
       item.kind==='case.close'?'Traslado solicitado. Enfermería verificó los signos; esperamos la respuesta del servicio receptor.':
       item.kind==='study.request'?label+': solicitado; pendiente de resultado.':
        label+': orden recibida; pendiente de enfermería o preparación, todavía no ejecutada.':
       label+': resultado disponible.'));
     rows.push({id:'ack:'+message.id+':'+i,
      name:isExaminationKind(item.kind)?'ATRIA':item.kind==='history.ask'?'Paciente':'Enfermera',
      role:isExaminationKind(item.kind)?'system':item.kind==='history.ask'?'patient':'nurse',actorId:message.actorId,text:feedback});
    }
    if(event.npcReply?.role==='mentor')
     rows.push({id:'npc:'+message.id,name:event.npcReply.name,role:'mentor',actorId:message.actorId,text:event.npcReply.text});
   }else if(event.type==='clinical.care-ready'){
    rows.push({id:'ready:'+event.patientUid+':'+event.revision,name:'Enfermera',role:'nurse',
     text:'Se cumplen los requisitos mínimos para continuar el cuidado: '+event.destinations.map(id=>CLOSURE_DEST_LABELS_487[id]).join(' · ')+'. Podés elegir el destino junto al paciente.'});
   }else if(event.type==='clinical.complication'){
    rows.push({id:'complication:'+event.sourceEventId,name:'Enfermera',role:'nurse',text:event.message});
   }else if(event.type==='clinical.patient-died'){
    rows.push({id:'death:'+event.patientUid+':'+event.revision,name:'ATRIA',
     role:'system',text:'El paciente falleció por '+(event.cause==='critical-hypoxemia'?
      'hipoxemia crítica sostenida':'colapso circulatorio sostenido')+
      '. Caso finalizado sin XP.'});
   }else if(event.type==='clinical.completed'){
    for(const item of event.clinical){
     if(isExaminationKind(item.kind)&&item.status==='executed'||isPhysicianExamStudy(item.id))continue;
     const source=(item.receipt?.sourceEventId||event.eventId)+(item.receipt?.samples?':series':'');
     if(announcedResults.has(source))continue;
     announcedResults.add(source);rows.push({id:'completion:'+source,name:'Enfermera',role:'nurse',actorId:event.actorId,
      text:resultText(item,labels.get(item.id)||item.id)||
       (closureText(item)||(labels.get(item.id)||item.id)+': resultado disponible.')});
    }
   }
  }
  return rows;
 }
 return Object.freeze({
  /** Operational data only. Caller serializes mutations and awaits this
   * barrier before committing world + session as one durable transaction. */
  async checkpoint(){
   if(disposed)throw Error('guard session disposed');await authority.flush();
   return copy({schemaVersion:1,modelVersion:'atria-clinical-c5b-1',roomId,mode,actorId,actorName,members,
    patient:nativePatient,encounterId,hints:hintLedger.checkpoint(),clock:guardClock.checkpoint(),deathPublished,progress:progress.read(),
    care:care?.checkpoint()??null,studies:studies.checkpoint(),port:port.checkpoint(),authority:authority.checkpoint(),
    pendingStudyRequests:[...pendingStudyRequests].map(([k,v])=>[k,[...v]]),pendingNurseJobs:[...pendingNurseJobs],waitingForAccess:[...waitingForAccess]});
  },
  hintBinding(doctorId=actorId){return {roomId,encounterId,patientUid:nativePatient.uid,actorId:doctorId};},
  hintCount:doctorId=>hintLedger.count(doctorId),
  rewardFor,
  async hint(request,authenticatedCredentials=credentials){
   if(disposed)return {status:'rejected',reason:'room-disposed'};
   await authority.flush();
   const identity=authenticatedCredentials===credentials?{id:actorId,roomId}:authenticate?.(authenticatedCredentials);
   if(!identity||identity.roomId!==roomId||!memberNames.has(identity.id)||request?.actorId!==identity.id)
    return {status:'rejected',reason:'hint-forbidden'};
   if(nativePatient.caseEnded||nativePatient.patientDied)return {status:'rejected',reason:'patient-not-active'};
   if(resolveContext({actorId:identity.id,targetPatientUid:nativePatient.uid})?.patientUid!==nativePatient.uid)
    return {status:'rejected',reason:'approach-patient-to-claim'};
   try{return hintLedger.request(request,this.clinicalHint());}
   catch{return {status:'unavailable',reason:'hint-evaluation-failed'};}
  },
  clinicalHintRequirements(){return currentChecklist().requirements;},
  // Diagnostic-only snapshot of the same readiness and requirements as Vega.
  // Never alters clinical eligibility, patient state, receipts or XP.
  auditClosureRequirements(destinationOverride){
   // An explicit destination is diagnostic only; it cannot alter the
   // current hint destination or the clinical authority's closure decision.
   const allowed=clinicalClosureRule(caseData)?.destinations;
   if(destinationOverride!==undefined&&(!Array.isArray(allowed)||
    !allowed.includes(destinationOverride)))throw Error('unsupported audit destination');
   const {destination,assessment,requirements}=destinationOverride===undefined?
    currentChecklist():{
     destination:destinationOverride,
     assessment:closureReadiness(destinationOverride),
     requirements:clinicalHintRequirements(nativePatient,caseData,
      closureReadiness(destinationOverride),destinationOverride)
    };
   return copy({caseId:caseData.id,destination,
    ...auditClosureRequirements(assessment,requirements)});
  },
  clinicalHint(){
   const {destination,assessment,requirements}=currentChecklist();
   const subject={...nativePatient,hintPendingActions:[...pendingNurseJobs.values(),...waitingForAccess.values()].map(j=>({id:j.intent.id}))};
   return selectClinicalHint({patient:subject,caseData,content,clock,destination,requirements,
    fulfilledTreatmentIds:assessment?.fulfilledTreatmentIds||[]});
  },
  catalog:()=>copy(orderedStudies),
  hasCommand:authority.hasCommand,
  async post(envelope,authenticatedCredentials=credentials){
   if(disposed)return {status:'rejected',reason:'room-disposed'};
   const reply=await authority.dispatch({kind:'chat.post',...envelope},authenticatedCredentials);publishReadiness();return reply;
  },
  advance:function advance(deltaRealSeconds,{typing=false}={}){
   if(disposed)throw Error('guard session disposed');
   if(!Number.isFinite(deltaRealSeconds)||deltaRealSeconds<0||deltaRealSeconds>86400)
    throw Error('invalid guard delta');
   if(nativePatient.caseEnded){clock=guardClock.advance(deltaRealSeconds,typing);return [];}
   // A long presentation frame must preserve adverse episodes, support changes
   // and fatal exposure in the SAME clock/executor path. A pending medicine
   // only selects time resolution; effects still require actual administration.
   if((['peritonitis','cholangitis','panc','additional'].includes(executor)||nativePatient.severeAllergies.length||nativePatient.administrationLog?.some(x=>survivalSensitiveIV.has(x.id))||
     nativePatient.pendingTreatments?.some(x=>survivalSensitiveIV.has(x.id)))&&deltaRealSeconds>.25){
    const ready=[];
    for(let elapsed=0;elapsed<deltaRealSeconds-1e-9;elapsed+=.25)
     ready.push(...advance(Math.min(.25,deltaRealSeconds-elapsed),{typing}));
    return ready;
   }
   const before=clock;
   clock=guardClock.advance(deltaRealSeconds,typing);
   if(nativePatient.policyState)nativePatient.policyState.realSecond=clock.clinicalMinute;
   for(const result of care?.advance(before,clock,deltaRealSeconds)||[]){
    // Actual bedside IV completion, never an order or a repeated transport ACK.
    // Reuse V4 clinical traits, but preserve the unique V5 fluid/vital owners.
    if(result.status==='executed'&&result.receipt?.therapyId==='fluid'&&!result.receipt?.reused){
     const status=confirmedFluidFeedback(nativePatient,caseData);
     result.receipt.message=(result.receipt.message||'Administración confirmada.')+
      ' '+fluidFeedbackLabel(status);
    }
    // Once the ORIGINAL case preparation clock completes, publish its native
    // receipt and only then release the spatial bedside job.
    port.complete(result);
    if(pendingNurseJobs.has(result.eventId)){
     const ack=nursing.accept({eventId:result.eventId,patientUid:result.patientUid,
      status:result.status,receipt:result.receipt});
     if(ack.status!==(result.status==='executed'?'confirmed':'rejected'))
      throw Error('physical therapy completion mismatch');
     pendingNurseJobs.delete(result.eventId);
    }
   }
   // A consultation can close during care.advance above. Its authoritative
   // receipt is already published; no later subsystem may mutate this patient
   // in the same tick, including a study that matures before the outer frame.
   if(nativePatient.caseEnded){publishReadiness();return [];}
   // The bedside task confirms START of a real timed infusion, while the
   // clinical port remains pending until its administered dose is complete.
   // This lets the same nurse initiate another infusion without fabricating
   // delivery or holding an NPC at the bed for two simulated hours.
   if(nursing)for(const [eventId,task] of pendingNurseJobs){
    const delivery=nativePatient.administrationLog?.find(row=>row.sourceEventId===eventId&&row.patientUid===nativePatient.uid&&row.status==='administering');
    if(!delivery)continue;
    const ack=nursing.accept({eventId,patientUid:task.patientUid,status:'executed',
     receipt:{eventId,patientUid:task.patientUid,kind:'administration.started',therapyId:delivery.id,completed:false}});
    if(ack.status!=='confirmed')throw Error('physical infusion start mismatch');
    pendingNurseJobs.delete(eventId);
   }
   // The existing authoritative guard clock drives the V4-proven pure survival
   // policies AFTER the native case vital writer; no additional timer/loop.
   if(care){
    for(const event of documentMedicationComplications487(nativePatient,caseData,clock))
     authority.reportPatientComplication(event);
    advanceNativeSurvival(nativePatient,caseData,mode,before,clock);
   }
   if(nativePatient.patientDied&&!deathPublished){
    deathPublished=true;
    if(nativePatient.deathAttribution?.classification==='treatment-contributed')
     progress.penalizeDeath({patientUid:nativePatient.uid,
      actorId:nativePatient.deathAttribution.actorIds?.[0]||actorId,eventId:roomId+':death:'+nativePatient.uid});
    care.dispose(); // cancel native medication and consultation preparations
    const reject=eventId=>port.complete({eventId,patientUid:nativePatient.uid,
     status:'rejected',reason:'patient-not-active'});
    // Cancel every pending native binding, including a specialist whose
    // response was still being prepared. No orphan pending ACK survives death.
    for(const [eventId,record] of port.checkpoint().receipts)
     if(record.ack.status==='pending')reject(eventId);
    pendingStudyRequests.clear();
    waitingForAccess.clear();
    // A nurse already walking to the bed must still report rejected arrival.
    if(!authority.reportPatientDeath({patientUid:nativePatient.uid,
       cause:nativePatient.deathReason,atNativeMinute:clock.nativeMinute}))
     throw Error('native death/room authority disagreement');
   }
   refreshMonitoring(nativePatient,clock);
   if(deathPublished)return [];
   const ready=studies.advance(nativePatient,clock.clinicalMinute,clock.nativeMinute);
   for(const order of ready){
    const source=order.completionSourceEventId??order.sourceEventId,
     key=pendingStudyKey(source,!!order.completionSourceEventId),
     fallback=!order.completionSourceEventId&&order.series?.sourceEventId===source?[]:[source];
    for(const eventId of pendingStudyRequests.get(key)||fallback)
     port.complete(studies.acknowledged(nativePatient,eventId,order));
    pendingStudyRequests.delete(key);
   }
   publishReadiness();return hideUnreportedStudyResults(copy(ready));
  },
  flush:()=>authority.flush(),
  /** Drain ONLY arrivals issued by the existing spatial world. The UI cannot
   * fabricate an arrival, execute a native intervention or mint its receipt.
   * Completion is committed through the original port and room authority.
   */
  finishNurseArrivals(){
   if(disposed||!nursing)return [];
   const results=[];
   for(const arrival of nursing.takeArrivals()){
    const task=pendingNurseJobs.get(arrival.eventId);
    if(!task||task.patientUid!==arrival.patientUid)continue;
    if(arrival.status==='error-recoverable'){
     const error={status:'unconfirmed',eventId:task.eventId,patientUid:task.patientUid,reason:arrival.reason,
      receipt:{eventId:task.eventId,patientUid:task.patientUid,decision:'ERROR_RECOVERABLE',
       message:'Enfermería: no se pudo llegar a la cama dentro del tiempo previsto. La orden no se ejecutó; revisá el acceso y reintentá.'}};
     port.complete(error);pendingNurseJobs.delete(task.eventId);
     if(task.intent.kind==='procedure.request'&&task.intent.id==='iv')for(const [id,waiting] of waitingForAccess){
      waitingForAccess.delete(id);port.complete({...error,eventId:id,patientUid:waiting.patientUid,
       receipt:{eventId:id,patientUid:waiting.patientUid,decision:'ERROR_RECOVERABLE',
        message:'Enfermería: acceso venoso no confirmado por una demora técnica. Tratamiento no administrado; podés reintentar.'}});
     }
     results.push(error);continue;
    }
    const result=nativePatient.caseEnded?
     {status:'rejected',patientUid:task.patientUid,eventId:task.eventId,reason:'patient-not-active'}:
     care?.execute(task,clock)??{
      status:'rejected',patientUid:task.patientUid,eventId:task.eventId,reason:'clinical-action-not-migrated'};
    if(result.status==='pending'){
     // The nurse is physically at the bedside, supervising the existing
     // preparation. care.advance() alone will issue the terminal receipt.
     results.push(copy(result));continue;
    }
    port.complete(result);
    pendingNurseJobs.delete(arrival.eventId);
    const spatial=nursing.accept({eventId:arrival.eventId,patientUid:arrival.patientUid,
     status:result.status,receipt:result.receipt});
    if(spatial.status!==(result.status==='executed'?'confirmed':'rejected'))
     throw Error('nursing spatial acknowledgment mismatch');
    if(task.intent.kind==='procedure.request'&&task.intent.id==='iv'){
     for(const [id,waiting] of waitingForAccess){
      waitingForAccess.delete(id);
      if(result.status==='executed'){
       const next=nursing.enqueue({eventId:id,patientUid:waiting.patientUid,kind:waiting.intent.id});
       if(['queued','travelling'].includes(next.status))
        pendingNurseJobs.set(id,waiting);
       else port.complete({status:'rejected',eventId:id,patientUid:waiting.patientUid,reason:'nurse-'+next.status});
      }else port.complete({status:'rejected',eventId:id,patientUid:waiting.patientUid,
       reason:'venous-access-unavailable'});
     }
    }
    results.push(copy(result));
   }
   publishReadiness();return results;
  },
  // Minimal read-only projection for 30Hz ECG paint; never clone room events or
  // recalculate closure from the presentation loop. Authority owns all writes.
  monitorRead(uid){
   if(disposed||uid!==nativePatient.uid)return null;
   return {uid:nativePatient.uid,caseEnded:!!nativePatient.caseEnded,
    patientDied:!!nativePatient.patientDied,
    ecg:nativePatient.ecg?copy(nativePatient.ecg):null,
    procedures:{monitor:{connected:!!nativePatient.procedures?.monitor?.connected}},
    lastVitalsKnown:nativePatient.lastVitalsKnown?{vitals:copy(nativePatient.lastVitalsKnown.vitals)}:null};
  },
  // On-demand projection: only confirmed receipts count, all catalogue drugs
  // available for each case; monitor paint never recalculates pharmacology.
  pharmacologyRead:()=>pharmacology.evaluate(caseData.id,nativePatient,clock.nativeMinute),
  pharmacologyRules:()=>pharmacology.forCase(caseData.id),
  read(doctorId=actorId,{includeChecklist=true}={}){const room=authority.snapshot(),subject=copy(nativePatient);
   hideUnreportedStudyResults(subject.orders);
   const caseReward=subject.closure?rewardFor(subject.closure,doctorId):null;
   const displayMessages=messages(room),options=eligibleDestinations();
   const checklist=includeChecklist&&currentChecklist();
   // Ready to request includes checks performed as part of the handoff. The
   // existing eligibleDestinations still reports destinations accepted now.
   const activeReaction=checklist&&unrescuedTransferReactions(nativePatient,caseData,clock.nativeMinute).length>0;
   const canRequest=checklist&&!!checklist.assessment&&checklist.requirements.every(r=>r.type==='closure')&&!activeReaction;
   return {hintBinding:{roomId,encounterId,patientUid:nativePatient.uid,actorId:doctorId},hintCount:hintLedger.count(doctorId),
   caseReward,room,patient:subject,exposure:summarizeIVExposures(nativePatient),clock:copy(clock),messages:displayMessages,progress:progress.read(),
   eligibleDestinations:options,
   ...(checklist?{clinicalChecklist:clinicalChecklist(nativePatient,checklist.requirements,options.length>0||
    canRequest,activeReaction)}:{}),
   closure:copy(closureReadiness(executor==='peritonitis'?undefined:
    (caseData.clinicalPolicy?.closure||GASTRO_CASE_RULES[caseData.id]||CASE_CLOSURE_RULES_487[caseData.id])?.destinations?.[0]||'sala'))};},
  dispose(){if(disposed)return;disposed=true;pendingNurseJobs.clear();waitingForAccess.clear();pendingStudyRequests.clear();care?.dispose();authority.dispose();}
 });
}
