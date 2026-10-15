import {csNurseScan487} from '../../clinical/nurse-scanner-487.js';

const nurseAddress=/^(?:enfermera|enfermero|enfermeria)\b|(?:\b(?:enfermera|enfermero|enfermeria))\s*[,!.]?\s*$/i;
const vegaAddress=/^(?:(?:dr|doctor)\.?\s*)?vega\b/i;
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

export function routeWardSpeech(text,context={}){
 const original=String(text??'').trim();
 if(!original||original.length>500)return {recipient:'none',patientUid:null,intents:[],error:'invalid-text'};
 const normalized=clean(original);
 const focus=context.focusedNpc;
 const recipient=nurseAddress.test(normalized)||focus==='nurse'?'nurse':
  vegaAddress.test(normalized)||focus==='vega'?'vega':'patient';
 const patientUid=context.patientUid??null;
 if(recipient!=='nurse')return {recipient,patientUid,intents:[],original};
 const parsed=csNurseScan487(original,context.studies||[],context.therapies||[],context.interventions||[]);
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
 return {recipient,patientUid,intents,original,
  ...(parsed.items.length>12?{error:'too-many-actions',intents:[]}:{}),
  ...(intents.length===0?{error:'no-recognized-action'}:{})};
}
