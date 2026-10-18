import {csNurseScan487} from '../../clinical/nurse-scanner-487.js';
import {EXAM_TECHNIQUES,GLASGOW_COMPONENTS,validExamSelection} from '../clinical/exam-contract.js';
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
 const clinical=/^\/(signos|examen|reevaluar|diagnostico|disposicion)(?:\s+(.+))?$/i.exec(original);
 if(clinical&&context.clinicalEvaluation){
  const action=clinical[1].toLowerCase(),value=clinical[2]?.trim(),patientUid=context.patientUid??null;
  const kinds={signos:'vitals.record',examen:'exam.record',reevaluar:'patient.reassess',diagnostico:'diagnosis.record',disposicion:'case.close'};
  const parts=action==='examen'?(value||'').split(/\s+/):[],regionId=parts.length===2?parts[0]:null,
   technique=regionId?parts[1]:value;
  const valid=action==='examen'?(regionId?validExamSelection(regionId,technique):Object.hasOwn(EXAM_TECHNIQUES,technique)):
   action==='disposicion'?['sala','observacion','alta','uti','quirofano','procedimiento'].includes(value):
   action==='diagnostico'?!!value&&value.length<=200:!value;
  const error=!valid?'invalid-clinical-command':!patientUid?'no-patient-target':null;
  return {recipient:'patient',patientUid,original,intents:error?[]:[{kind:kinds[action],id:action==='examen'?technique:action==='disposicion'?value:action,
   ...(regionId?{regionId}:{}),
   ...(action==='diagnostico'?{value}:{}),sourceText:original}],...(error?{error}:{})};
 }
 const consult=/^(?:\/consulta\s+|enfermer(?:a|o|ia)[,:]?\s+(?:interconsulta\s+(?:a\s+)?|consulta\s+(?:a\s+)?))(cirugia|uti|terapia intensiva|uci)[.!]?$/i.exec(normalized);
 if(consult&&context.clinicalEvaluation){
  const patientUid=context.patientUid??null;
  return {recipient:'nurse',patientUid,original,
   intents:patientUid?[{kind:'consult.request',id:consult[1]==='cirugia'?'cirugia':'uti',sourceText:original,clause:original}]:[],
   ...(!patientUid?{error:'no-patient-target'}:{})};
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
  const error=!study?'unknown-study':!patientUid?'no-patient-target':null;
  return {recipient:'nurse',patientUid,original,intents:error?[]:[{kind:'study.request',id:study.id,
   sourceText:original,clause:original,count:1}],...(error?{error}:{})};
 }
 const focus=context.focusedNpc;
 const recipient=nurseAddress.test(normalized)?'nurse':vegaAddress.test(normalized)?'vega':
  focus==='nurse'?'nurse':focus==='vega'?'vega':'patient';
 const patientUid=context.patientUid??null;
 if(recipient!=='nurse')return {recipient,patientUid,intents:context.clinicalEvaluation&&recipient==='patient'&&patientUid?
  [{kind:'history.ask',id:'dialogue',sourceText:original}]:[],original};
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
