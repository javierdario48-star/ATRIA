import {csNurseScan487} from '../../clinical/nurse-scanner-487.js';
import {EXAM_TECHNIQUES,GLASGOW_COMPONENTS,validExamSelection,isPhysicianExamStudy} from '../clinical/exam-contract.js';
import {planNursingIVAccess} from '../clinical/nursing-access-plan.js';
import {nursingFormulationVocabulary487} from '../clinical/iv-dose-contracts-487.js';

const nurseAddress=/^(?:enfermera|enfermero|enfermeria)\b|(?:\b(?:enfermera|enfermero|enfermeria))\s*[,!.]?\s*$/i;
const vegaAddress=/^(?:(?:dr|doctor)\.?\s*)?vega\b/i;
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

export function routeWardSpeech(text,context={}){
 const original=String(text??'').trim();
 if(!original||original.length>500)return {recipient:'none',patientUid:null,intents:[],error:'invalid-text'};
 const normalized=clean(original);
 if(normalized==='/diagnostico-borrar'&&context.clinicalEvaluation){
  const patientUid=context.patientUid??null;
  return {recipient:'patient',patientUid,original,intents:patientUid?
   [{kind:'diagnosis.record',id:'diagnostico',value:'',sourceText:original}]:[],
   ...(!patientUid?{error:'no-patient-target'}:{})};
 }
 // Speaking a specific presumed diagnosis to the nurse is the SAME
 // authenticated diagnosis.record intent as the editor and /diagnostico.
 // Require an explicit affirmative diagnostic phrase: ordinary questions,
 // nursing orders and negations must not silently overwrite an impression.
 const addressed=/^(?:enfermera|enfermero|enfermer[ií]a)\s*[,.:]?\s*/i.exec(original);
 const diagnosticSpeech=addressed?original.slice(addressed[0].length):
  context.focusedNpc==='nurse'?original:null;
 const said=diagnosticSpeech&&/^(?:(?:mi\s+)?(?:impresi[oó]n\s+diagn[oó]stica|diagn[oó]stico\s+(?:presuntivo|probable))\s*(?::|es|ser[ií]a)\s*|(?:creo|pienso|considero)\s+que\s+(?:el\s+paciente\s+)?(?:tiene|padece|es)\s+|(?:la\s+enfermedad|el\s+diagn[oó]stico)\s+es\s+)(.+)$/i.exec(diagnosticSpeech);
 if(context.clinicalEvaluation&&said&&!/[¿?]/.test(original)){
  const value=said[1].trim().replace(/[.!]+$/,'').trim(),patientUid=context.patientUid??null;
  const error=!value||value.length>200?'invalid-clinical-command':!patientUid?'no-patient-target':null;
  return {recipient:'nurse',patientUid,original,intents:error?[]:
   [{kind:'diagnosis.record',id:'diagnostico',value,sourceText:original}],
   ...(error?{error}:{})};
 }
 const monitor=/^\/monitor\s+(conectar|desconectar)$/i.exec(normalized);
 if(monitor&&context.clinicalEvaluation){
  const patientUid=context.patientUid??null;
  return {recipient:'nurse',patientUid,original,intents:patientUid?[{kind:'monitor.set',id:monitor[1]==='conectar'?'connect':'disconnect',sourceText:original}]:[],
   ...(!patientUid?{error:'no-patient-target'}:{})};
 }
 const glasgow=/^\/glasgow(?:\s+(\S+))?$/i.exec(original);
 if(glasgow&&context.clinicalEvaluation){
  const component=glasgow[1]||'all',patientUid=context.patientUid??null;
  const error=component!=='all'&&!Object.hasOwn(GLASGOW_COMPONENTS,component)?'invalid-clinical-command':!patientUid?'no-patient-target':null;
  return {recipient:'patient',patientUid,original,intents:error?[]:[{kind:'exam.glasgow',id:component,sourceText:original}],...(error?{error}:{})};
 }
 // Menu/bot protocol for a catalogued treatment. It enters the SAME native
 // preflight, bedside queue and receipt path as a natural-language order.
 const treatment=/^\/tratamiento\s+([a-z][a-z0-9_]*)(?:\s+(.+))?$/i.exec(original);
 if(treatment&&context.clinicalEvaluation){
  const id=treatment[1],patientUid=context.patientUid??null;
  const known=[...(context.therapies||[]),...(context.interventions||[])].some(t=>t.id===id);
  const error=!known?'unknown-treatment':!patientUid?'no-patient-target':null;
  const intents=error?[]:planNursingIVAccess([{kind:'therapy.request',id,sourceText:original,clause:treatment[2]||'',count:1}],context);
  const batchError=!error&&intents.length>1&&context.validateClinicalBatch?.(intents);
  return {recipient:'nurse',patientUid,original,intents:error||batchError?[]:intents,...(error||batchError?{error:error||batchError}:{})};
 }
 const clinical=/^\/(signos|examen|reevaluar|diagnostico|disposicion|cierre-parcial)(?:\s+(.+))?$/i.exec(original);
 if(clinical&&context.clinicalEvaluation){
  const action=clinical[1].toLowerCase(),value=clinical[2]?.trim(),patientUid=context.patientUid??null;
  const kinds={signos:'vitals.record',examen:'exam.record',reevaluar:'patient.reassess',diagnostico:'diagnosis.record',disposicion:'case.close','cierre-parcial':'case.close'};
  const parts=action==='examen'?(value||'').split(/\s+/):[],regionId=parts.length===2?parts[0]:null,
   technique=regionId?parts[1]:value;
  const valid=action==='examen'?(regionId?validExamSelection(regionId,technique):Object.hasOwn(EXAM_TECHNIQUES,technique)):
   ['disposicion','cierre-parcial'].includes(action)?['sala','observacion','alta','uti','quirofano','procedimiento'].includes(value):
   action==='diagnostico'?!!value&&value.length<=200:!value;
  const error=!valid?'invalid-clinical-command':!patientUid?'no-patient-target':null;
  return {recipient:'patient',patientUid,original,intents:error?[]:[{kind:kinds[action],id:action==='examen'?technique:['disposicion','cierre-parcial'].includes(action)?value:action,
   ...(action==='cierre-parcial'?{partial:true}:{}),
   ...(regionId?{regionId}:{}),
   ...(action==='diagnostico'?{value}:{}),sourceText:original}],...(error?{error}:{})};
 }
 const consult=/^(?:\/consulta\s+|enfermer(?:a|o|ia)[,:]?\s+(?:interconsulta\s+(?:a\s+)?|consulta\s+(?:a\s+)?))([a-z]+(?:\s+intensiva)?)[.!]?$/i.exec(normalized);
 if(consult&&context.clinicalEvaluation){
  const aliases={cirugia:'cirugia',uti:'uti',uci:'uti','terapia intensiva':'uti',gastro:'gastro',gastroenterologia:'gastro',neurologia:'neurology',neurocirugia:'neurosurgery'};
  const service=aliases[consult[1]]||consult[1],allowed=new Set(['cirugia','uti','gastro',...(context.consultServices||[])]);
  const patientUid=context.patientUid??null,error=!allowed.has(service)?'unknown-consultation':!patientUid?'no-patient-target':null;
  return {recipient:'nurse',patientUid,original,
   intents:!error?[{kind:'consult.request',id:service,sourceText:original,clause:original}]:[],
   ...(error?{error}:{})};
 }
 // A transfer is a closure request, NOT evidence that surgery or discharge
 // already happened. Only the native case evaluator may accept it.
 const nurseTransfer=/^enfermer(?:a|o|ia)[,:]?\s+(?:(?:derivar|enviar|trasladar)\s+(?:a|al)\s+|internar\s+en\s+|dar\s+(?:de\s+)?)(cirugia|quirofano|sala|uti|observacion|alta)$/i.exec(normalized);
 const nurseSurgery=/^enfermer(?:a|o|ia)[,:]?\s+(?:cirugia|quirofano)$/i.test(normalized);
 const destination=nurseTransfer?.[1]==='cirugia'?'quirofano':nurseTransfer?.[1];
 if(context.clinicalEvaluation&&(destination||nurseSurgery&&context.surgicalConsultDone)){
  const patientUid=context.patientUid??null;
  return {recipient:'nurse',patientUid,original,
   intents:patientUid?[{kind:'case.close',id:destination||'quirofano',sourceText:original}]:[],
   ...(!patientUid?{error:'no-patient-target'}:{})};
 }
 const explicitStudy=/^\/estudio\s+([a-z0-9_-]+)$/i.exec(original);
 if(explicitStudy){
  const patientUid=context.patientUid??null,study=(context.studies||[]).find(s=>s.id===explicitStudy[1]);
  const error=isPhysicianExamStudy(explicitStudy[1])?'physician-exam-required':!study?'unknown-study':!patientUid?'no-patient-target':null;
  return {recipient:'nurse',patientUid,original,intents:error?[]:[{kind:'study.request',id:study.id,
   sourceText:original,clause:original,count:1}],...(error?{error}:{})};
 }
 const focus=context.focusedNpc;
 const recipient=nurseAddress.test(normalized)?'nurse':vegaAddress.test(normalized)?'vega':
  focus==='nurse'?'nurse':focus==='vega'?'vega':'patient';
 const patientUid=context.patientUid??null;
 if(recipient!=='nurse')return {recipient,patientUid,intents:context.clinicalEvaluation&&recipient==='patient'&&patientUid?
  [{kind:'history.ask',id:'dialogue',sourceText:original}]:[],original};
 if(/\btacto rectal\b/.test(normalized))return {recipient,patientUid,intents:[],original,error:'physician-exam-required'};
 const vocabulary=nursingFormulationVocabulary487(original,context);
 const parsed=csNurseScan487(vocabulary.text,vocabulary.studies,vocabulary.therapies,context.interventions||[]);
 if(!parsed.active)return {recipient,patientUid,intents:[],original,error:'question-or-negation'};
 if(parsed.unknown.length)return {recipient,patientUid,intents:[],original,error:'unknown-clause',unknown:parsed.unknown};
 if(!patientUid)return {recipient,patientUid,intents:[],original,error:'no-patient-target'};
 const intents=[];
 for(const item of parsed.items.slice(0,12)){
  if(item.negated||item.routeOnly)continue;
  let kind;
  if(item.kind==='study')kind='study.request';
  else if(item.kind==='therapy')kind=item.action==='stop'?'therapy.stop':'therapy.request';
  else if(['monitor','iv','vitals','surgery'].includes(item.kind))kind='procedure.request';
  else continue;
  intents.push({kind,id:item.id,sourceText:original,clause:item.text,count:item.count||1});
 }
 const planned=planNursingIVAccess(intents,context);
 // A compound command is one clinical intention. Never start its monitor,
 // IV placement or first drug when another clause fails native validation.
 const batchError=planned.length>1&&typeof context.validateClinicalBatch==='function'?
  context.validateClinicalBatch(planned):null;
 return {recipient,patientUid,intents:batchError?[]:planned,original,
  ...(batchError?{error:batchError}:{}),
  ...(parsed.items.length>12||planned.length>12?{error:'too-many-actions',intents:[]}:{}),
  ...(planned.length===0?{error:'no-recognized-action'}:{})};
}
