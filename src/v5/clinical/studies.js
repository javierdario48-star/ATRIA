import {buildStudyCatalog,resolveStudyById,materializeStudy,studyTurnaroundMinutes}
 from '../../clinical/study-registry.js';
import {isPhysicianExamStudy} from './exam-contract.js';
import {confirmedClinicalTreatment,isDeliveredClinicalAdministration} from './receipts.js';
import {readRespiratoryObservation,readNeurologicalState} from './patient-observations.js';
import {studyEvidenceId} from './study-evidence.js';
import {authoredTroponinSeries,isRepeatableStudy,isTroponinStudy,normalizeStudyOrder,studyOrderLabel} from './study-order-vocabulary.js';
import {studyCollectionDefinition,studyCollectionResult,validStudyQuantity} from './study-collections.js';

const identity=x=>typeof x==='string'&&x.trim().length>0;
const minute=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const copy=x=>structuredClone(x);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const numberIn=(text,name)=>{
 const match=String(text).match(new RegExp('\\b'+name+'\\s*(\\d+(?:[.,]\\d+)?)','i'));
 return match?Number(match[1].replace(',','.')):null;
};
function arterialGasBaseline(definition){
 if(!/gasometr|gases arteriales/i.test(definition.label||''))return null;
 const ph=numberIn(definition.result,'pH'),co2=numberIn(definition.result,'PaCO2'),
  oxygen=numberIn(definition.result,'PaO2');
 return ph===null||co2===null||oxygen===null?null:{ph,co2,oxygen};
}
function lactateReport(definition,p,atNativeMinute,{initial,baselineMatches}){
 if(!/\blactato\b/i.test(definition.label))return '';
 const lactate=String(definition.result).match(/\blactato\s*(\d+(?:[,.]\d+)?)\s*mmol\s*\/\s*l\b/i)?.[1];
 // The panel has a reference value and no lactate kinetics. A fresh gas
 // model does not establish lactate, even immediately after support changes.
 const exposed=initial&&baselineMatches&&((p.treatments||[]).some(t=>confirmedClinicalTreatment(p,t.id,atNativeMinute))||
  (p.administrationLog||[]).some(row=>isDeliveredClinicalAdministration(p,row,atNativeMinute)));
 return initial&&baselineMatches&&!exposed&&lactate?' Lactato basal de referencia: '+lactate+' mmol/L.':
  ' Lactato de esta muestra: no disponible.';
}
function pleuralBaselineOutdated(definition,c,p,atNativeMinute){
 if(!c.clinicalPolicy?.traits?.includes('tensionPneumothorax'))return false;
 const label=normalizeStudyOrder(definition.label);
 // Pleural relief changes the anatomy and perfusion that these baselines
 // describe. Vitals and a procedure receipt cannot supply a new report.
 if(!(definition.type==='imaging'&&/^(?:radiografia de torax|rx torax)\b/.test(label)||
  definition.type==='lab'&&/\bgasometria\b/.test(label)&&/\blactato\b/.test(label)))return false;
 return ['needle_decompression','chest_drainage'].some(id=>confirmedClinicalTreatment(p,id,atNativeMinute,
  receipt=>receipt.kind==='procedure.performed'));
}
// Each dynamic order captures a new specimen at request time. Its report is
// immutable when the result arrives; a later intervention needs another test.
function currentStudyResult(definition,c,p,atNativeMinute,initial){
 if(!definition.dynamic)return definition.result;
 if(['seizure-eeg','encephalitis-eeg'].includes(definition.dynamic)){
  const n=readNeurologicalState(p,atNativeMinute);
  if(n.seizureActive===true)return 'EEG de control: '+(definition.dynamic==='encephalitis-eeg'?
   'descargas temporales rítmicas con evolución en frecuencia y amplitud':'descargas rítmicas generalizadas con evolución en frecuencia y amplitud')+
   '; patrón ictal sostenido durante esta muestra, compatible con crisis en curso. Requiere reevaluación y vigilancia continua.';
  if(definition.dynamic==='seizure-eeg'&&n.seizureActive===false&&n.postictal)
   return 'EEG de control: enlentecimiento difuso posictal con descargas epileptiformes interictales, sin patrón ictal sostenido durante esta muestra. '+
    'Persisten alteración de conciencia y riesgo de recurrencia; continuar vigilancia clínica y electrográfica.';
  return definition.result;
 }
 if(definition.dynamic==='cardiac-rhythm'){
  const alternatives=c.clinicalPolicy.rhythmConversionAlternatives||[];
  const restored=alternatives.some(id=>{
   const receipt=confirmedClinicalTreatment(p,id,atNativeMinute),
    rule=c.clinicalPolicy.responses?.find(x=>x.allOf?.includes(id));
   return receipt&&atNativeMinute-receipt.administeredAtNativeMinute>=Math.max(0,rule?.delay??1);
  });
  if(restored)return 'ECG de control: ritmo sinusal a '+Math.round(p.liveVitals?.hr||80)+
   '/min tras intervención de restauración del ritmo confirmada. QRS estrecho. Continuar vigilancia de recurrencia.';
  // Rate control does not prove conversion, reperfusion or disappearance of
  // conduction disease. Preserve the native morphology in these cases.
  return Number.isFinite(p.liveVitals?.hr)?'ECG de control: frecuencia ventricular actual '+
   Math.round(p.liveVitals.hr)+'/min. Registro diagnóstico de referencia: '+definition.result:definition.result;
 }
 const respiratory=readRespiratoryObservation(p,atNativeMinute);
 if(definition.dynamic==='neuromuscular-ventilation'&&respiratory.ventilation==='invasive')
  return 'Referencia espontánea previa: '+definition.result+
   ' Control actual: ventilación invasiva confirmada. CVF y PIM espontáneas no comparables durante este soporte; persiste debilidad neuromuscular. La inmunoterapia no implica recuperación inmediata de fuerza.';
 const baseline=arterialGasBaseline(definition);
 if(!baseline||!p.liveVitals)return definition.result;
 const {ph:initialPH,co2:initialCO2,oxygen:initialO2}=baseline;
 // The initial bicarbonate retains the documented metabolic component. O2
 // and a lower displayed RR alone cannot clear a ventilatory CO2 burden.
 const hco3=numberIn(definition.result,'HCO3')??.03*initialCO2*10**(initialPH-6.1),
  burden=initialCO2+28*respiratory.fatigue,
  supported=respiratory.ventilation?clamp((respiratory.ventilationMinutes-1)/30,0,1):0,
  targetCO2=Math.max(42,initialCO2-(respiratory.ventilation==='invasive'?18:12)),
  co2=clamp(burden+(targetCO2-burden)*supported,25,110),
  initialSat=p.baselineVitals?.spo2??p.liveVitals.spo2,
  o2=clamp(initialO2+(p.liveVitals.spo2-initialSat)*2.5,25,150),
  ph=clamp(6.1+Math.log10(hco3/(.03*co2)),6.8,7.55),
  support=respiratory.ventilation==='invasive'?'Ventilación invasiva confirmada. ':
   respiratory.ventilation==='non-invasive'?'Ventilación no invasiva confirmada. ':'';
 return 'Gasometría arterial de control: pH '+ph.toFixed(2)+', PaCO2 '+Math.round(co2)+
  ' mmHg, PaO2 '+Math.round(o2)+' mmHg, HCO3 '+Math.round(hco3)+' mmol/L. '+support+
  (respiratory.fatigue>=.4?'Persiste compromiso ventilatorio por fatiga; correlacionar con estado de conciencia y entrada de aire. ':'')+
  'Interpretar con el soporte de oxígeno documentado; sin FiO2 cuantificada no se informa PaO2/FiO2.'+
  lactateReport(definition,p,atNativeMinute,{initial,baselineMatches:Number.isFinite(p.baselineVitals?.spo2)&&
   p.liveVitals.spo2===initialSat&&co2===initialCO2});
}

// The caller owns the clinical clock and the authoritative patient objects.
// This service only requests/results existing studies; it has no drug writer.
export function createStudyService(cases,checkpoint=null){
 if(!Array.isArray(cases)||cases.some(c=>!identity(c?.id)||!Array.isArray(c.studies))||
    new Set(cases.map(c=>c.id)).size!==cases.length)throw Error('valid unique study cases required');
 const definitions=copy(cases),byCase=new Map(definitions.map(c=>[c.id,c]));
 // New V5 study timings are isolated here. Never mutate the legacy V4 registry.
 const localTiming=new Map(definitions.flatMap(c=>(c.studies||[])
  .filter(s=>String(s.id).startsWith('g_')&&Number.isFinite(s.delay)&&s.delay>=5&&s.delay<=1440)
  .map(s=>[s.id,s.delay])));
 const catalog=buildStudyCatalog(definitions).filter(s=>!isPhysicianExamStudy(s.id)),events=new Map(copy(checkpoint?.events??[]));
 const patientValid=p=>identity(p?.uid)&&byCase.has(p.caseId)&&Array.isArray(p.orders);
 const rejected=(p,eventId,reason)=>({status:'rejected',patientUid:p?.uid??null,eventId:eventId??null,reason});
 const turnaround=definition=>localTiming.get(definition.id)??studyTurnaroundMinutes(definition);
 const sourceOf=(order,eventId)=>order.sourceEventId===eventId||order.series?.sourceEventId===eventId;
 function acknowledged(p,eventId,order){
  const event=events.get(eventId),series=event?.series===true,
   source=series?order.series:order,
   binding={patientUid:p.uid,eventId,studyId:event?.studyId??order.id,sourceEventId:source.sourceEventId},
   control=event?.control===true||order.sourceEventId===eventId&&order.control===true,
   qualified=control?{control:true,label:order.control?order.label:studyOrderLabel(order,{control:true})}:{};
  if(order.status==='unavailable')return {status:'rejected',patientUid:p.uid,eventId,reason:order.reason,receipt:{
   ...binding,label:order.label,...qualified,actorId:order.actorId,status:order.status,message:order.message,
   requestedAtMinute:order.requestedAtMinute,requestedAtNativeMinute:order.requestedAtNativeMinute
  }};
  if(source.status!=='done')return {status:'pending',patientUid:p.uid,eventId,sourceEventId:source.sourceEventId,...(series?{series:true}:{}),
   ...(control||order.collection?{receipt:{...binding,...qualified,
    ...(order.collection?{label:order.label,collection:copy(order.collection)}:{})}}:{})};
  return {status:'executed',patientUid:p.uid,eventId,receipt:{
   ...binding,...qualified,
   actorId:source.actorId,result:order.result,resultSource:order.resultSource,
   requestedAtMinute:source.requestedAtMinute,readyAtMinute:source.readyAtMinute,
   ...(minute(order.sampledAtNativeMinute)?{sampledAtNativeMinute:order.sampledAtNativeMinute}:{}),
   ...(order.collection?{label:order.label,collection:copy(order.collection)}:{}),
   ...(event?.series?{samples:copy(order.samples)}:{})
  }};
 }
 function startSeries(order,native,{eventId,actorId,atMinute}){
  order.series={sourceEventId:eventId,actorId,requestedAtMinute:atMinute,status:'pending',readyAtMinute:null};
  order.samples=[{afterNativeMinutes:0,sampledAtNativeMinute:order.sampledAtNativeMinute,readyAtMinute:order.readyAtMinute,
   result:order.result,status:order.status},...native.seriesSamples.map(sample=>({afterNativeMinutes:sample.afterNativeMinutes,status:'scheduled'}))];
 }
 function advanceSeries(order,native,atMinute,atNativeMinute){
  const next=order.samples.findIndex(sample=>sample.status==='scheduled');
  // A late order or clock tick never backdates a collection or collects
  // multiple timed samples together. Keep the authored spacing.
  if(next>0&&authoredTroponinSeries(native)){
   const sample=order.samples[next],previous=order.samples[next-1],target=previous.sampledAtNativeMinute+
    (sample.afterNativeMinutes-previous.afterNativeMinutes);
   if(atNativeMinute>=target){
    sample.sampledAtNativeMinute=atNativeMinute;
    sample.readyAtMinute=atMinute+turnaround(native);
    sample.result=native.seriesSamples[next-1].result;sample.status='pending';
    if(next===order.samples.length-1)order.series.readyAtMinute=sample.readyAtMinute;
   }
  }
  for(const sample of order.samples)if(sample.status==='pending'&&sample.readyAtMinute<=atMinute)sample.status='done';
  if(order.samples.every(sample=>sample.status==='done'))order.series.status='done';
 }
 return Object.freeze({
  acknowledged,
  checkpoint:()=>copy({events:[...events]}),
  catalog:()=>copy(catalog.map(s=>localTiming.has(s.id)?{...s,gameHours:localTiming.get(s.id)/60}:s)),
  request(patient,command={}){
   const {id,eventId,actorId,atMinute,atNativeMinute,series=false,control=false,quantity,additional=false}=command||{};
   if(!patientValid(patient))return rejected(patient,eventId,'invalid-patient');
   if(!identity(id)||!identity(eventId)||!identity(actorId)||!minute(atMinute)||typeof series!=='boolean'||
    typeof control!=='boolean'||typeof additional!=='boolean'||quantity!==undefined&&!validStudyQuantity(quantity)||
    atNativeMinute!==undefined&&!minute(atNativeMinute))
    return rejected(patient,eventId,'invalid-study-request');
   if(isPhysicianExamStudy(id))return rejected(patient,eventId,'physician-exam-required');
   const fingerprint=JSON.stringify([patient.uid,patient.caseId,id,actorId,...(series?[true]:[]),
    ...(quantity!==undefined?[{quantity,additional}]:additional?[{additional}]:[]),...(control?[{control:true}]:[])]);
   const prior=events.get(eventId);
   if(prior&&prior.fingerprint!==fingerprint)
    return rejected(patient,eventId,'study-event-identity-collision');
   // The original binding survives a restored patient snapshot/new service.
   const source=patient.orders.find(o=>sourceOf(o,eventId)),sourceSeries=source?.series?.sourceEventId===eventId;
   if(source&&(source.id!==id||(sourceSeries?source.series:source).actorId!==actorId||sourceSeries!==series||
      source.patientUid!==patient.uid||(source.control===true)!==control||source.collection&&
       (source.collection.explicitQuantity!==(quantity!==undefined)||source.collection.additional!==additional||
        quantity!==undefined&&source.collection.requestedCount!==quantity)))return rejected(patient,eventId,'study-event-identity-collision');
   const caseDef=byCase.get(patient.caseId),evidenceId=studyEvidenceId(caseDef,id),native=caseDef.studies.find(s=>s.id===evidenceId),
    collection=studyCollectionDefinition(native),
    repeatable=!!caseDef.clinicalPolicy&&isRepeatableStudy(native),
    bound=source||prior?.sourceEventId&&patient.orders.find(o=>sourceOf(o,prior.sourceEventId)),
    sampleMinute=atNativeMinute??(minute(patient.policyState?.nativeMinute)?patient.policyState.nativeMinute:atMinute),
    matching=patient.orders.filter(o=>o.patientUid===patient.uid&&studyEvidenceId(caseDef,o.id)===evidenceId),
    baselineOnly=repeatable&&(native.dynamic===true&&!arterialGasBaseline(native)||control&&!native.dynamic),
    outdated=baselineOnly&&!native.requiresCompletedTreatments?.length&&pleuralBaselineOutdated(native,caseDef,patient,sampleMinute);
   if(series&&(!caseDef.clinicalPolicy||!authoredTroponinSeries(native)))return rejected(patient,eventId,'study-series-unavailable');
   if((quantity!==undefined||additional)&&!collection)return rejected(patient,eventId,'study-quantity-unavailable');
   if(control&&(!repeatable||collection||series))return rejected(patient,eventId,'invalid-study-request');
   // A stale snapshot must not rebind an old event to a newer sample.
   if(prior?.sourceEventId&&!bound)return rejected(patient,eventId,'study-order-missing');
   let existing=bound;
   if(!existing&&!additional&&!outdated&&!(control&&baselineOnly)){
    // An explicit control can share the acquisition at this native minute.
    // An older pending report does not satisfy a later explicit control.
    existing=repeatable&&!collection?matching.find(o=>o.status==='pending'&&o.sampledAtNativeMinute===sampleMinute):undefined;
    if(!existing&&!control)existing=matching.find(o=>o.status!=='unavailable'&&(!repeatable||o.status==='pending')&&
     (!collection||quantity===undefined||(o.collection?.requestedCount??collection.requiredCount)===quantity));
   }
   if(existing){
    if(existing.patientUid!==patient.uid)return rejected(patient,eventId,'study-patient-mismatch');
    if(series&&!existing.series){
     if(!minute(existing.sampledAtNativeMinute))return rejected(patient,eventId,'study-series-initial-time-unavailable');
     startSeries(existing,native,{eventId,actorId,atMinute});
     advanceSeries(existing,native,atMinute,sampleMinute);
    }
    events.set(eventId,{fingerprint,sourceEventId:series?existing.series.sourceEventId:existing.sourceEventId,
     studyId:id,...(series?{series:true}:{}),...(control?{control:true}:{})});
    return acknowledged(patient,eventId,existing);
   }
   if(native?.requiresCompletedTreatments?.some(id=>!confirmedClinicalTreatment(patient,id,sampleMinute)))
    return rejected(patient,eventId,'study-requires-completed-treatment');
   events.set(eventId,{fingerprint});
   const study=resolveStudyById(id,caseDef,catalog);
   if(!study||!native&&id!=='troponina'&&isTroponinStudy(study))return rejected(patient,eventId,'unknown-study');
   const definition=materializeStudy(native||study,caseDef);
   const requestedCount=quantity??collection?.requiredCount,
    label=studyOrderLabel(definition,{control,quantity:requestedCount}),
    acquisition={id,label,type:definition.type,patientUid:patient.uid,requestedAtMinute:atMinute,sourceEventId:eventId,actorId,
     ...(control?{control:true}:{})};
   // A known but unmodeled control has a terminal request record, with no
   // specimen time or report. A pending baseline still matures on its own.
   const unavailable=baselineOnly&&(control||outdated||matching.some(order=>order.status==='done'));
   const order=unavailable?{...acquisition,status:'unavailable',reason:'study-control-unavailable',
    message:'Esta guardia no dispone de un informe de control para ese protocolo.',requestedAtNativeMinute:sampleMinute}:
    {...acquisition,result:collection?studyCollectionResult(definition,requestedCount):native&&caseDef.clinicalPolicy?
     currentStudyResult(definition,caseDef,patient,sampleMinute,!control&&!matching.some(o=>minute(o.sampledAtNativeMinute))):definition.result,
    sampledAtNativeMinute:sampleMinute,
    resultSource:definition.nativeResult?'native':'universal-fallback',
    nativeResult:definition.nativeResult,universalFallback:definition.universalFallback,
    status:'pending',readyAtMinute:atMinute+turnaround(definition),
    ...(collection?{collection:{unit:collection.unit,requestedCount,collectedCount:0,status:'pending',
     microbiologyStatus:'pending',explicitQuantity:quantity!==undefined,additional,
     collectedAtMinute:null,collectedAtNativeMinute:null}}:{})};
   if(series)startSeries(order,native,{eventId,actorId,atMinute});
   patient.orders.push(order);
   events.set(eventId,{fingerprint,sourceEventId:eventId,studyId:id,...(series?{series:true}:{}),...(control?{control:true}:{})});
   return acknowledged(patient,eventId,order);
  },
  advance(patient,atMinute,atNativeMinute=atMinute){
   if(!minute(atMinute)||!minute(atNativeMinute))throw Error('valid study minute required');
   if(!patientValid(patient))throw Error('valid study patient required');
   const ready=[];
   for(const order of patient.orders){
    if(order.patientUid!==patient.uid)continue;
    if(order.status==='pending'&&minute(order.readyAtMinute)&&order.readyAtMinute<=atMinute){
     if(order.collection){
      order.collection.collectedCount=order.collection.requestedCount;
      order.collection.status='collected';order.collection.collectedAtMinute=atMinute;
      order.collection.collectedAtNativeMinute=atNativeMinute;
     }
     order.status='done';
     ready.push(copy(order));
    }
    if(order.series?.status==='pending'&&!patient.caseEnded){
     const caseDef=byCase.get(patient.caseId),id=studyEvidenceId(caseDef,order.id),native=caseDef.studies.find(s=>s.id===id);
     advanceSeries(order,native,atMinute,atNativeMinute);
     if(order.series.status==='done')ready.push({...copy(order),completionSourceEventId:order.series.sourceEventId});
    }
   }
   return ready;
  }
 });
}
