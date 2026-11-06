import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';
import {authoredTroponinSeries} from './study-order-vocabulary.js';
import {studyCollectionDefinition,validStudyQuantity} from './study-collections.js';

// Only authored, same-patient coverage can substitute for a checklist item.
// A similar label, an incidental finding or a generic normal result cannot.
export function studyEvidenceId(caseData,id){
 const aliases=(caseData.clinicalPolicy?.closure||GASTRO_CASE_RULES[caseData.id])?.studyEquivalences;
 return aliases&&Object.hasOwn(aliases,id)?aliases[id]:id;
}

export function requiredStudySeries(caseData,id){
 const definition=caseData?.studies?.find(study=>study.id===studyEvidenceId(caseData,id));
 return definition?.seriesRequired===true&&authoredTroponinSeries(definition)?definition:null;
}

// Count only unique, patient-bound collection receipts. Requesting specimens
// never supplies collected evidence, and duplicate rows cannot multiply it.
export function patientStudyCollectionProgress(patient,caseData,id){
 const definition=caseData?.studies?.find(study=>study.id===studyEvidenceId(caseData,id)),
  collection=studyCollectionDefinition(definition);
 if(!collection)return null;
 const sources=new Map(),orders=patient.orders||[],realMinute=patient.policyState?.realSecond,
  nativeMinute=patient.policyState?.nativeMinute;
 for(const order of orders)sources.set(order.sourceEventId,(sources.get(order.sourceEventId)||0)+1);
 const validOrders=[],pendingOrders=[];
 let collectedCount=0,pendingCount=0;
 for(const order of orders){
  if(order.patientUid!==patient.uid||studyEvidenceId(caseData,order.id)!==definition.id||
   typeof order.sourceEventId!=='string'||!order.sourceEventId||sources.get(order.sourceEventId)!==1||
   !Number.isFinite(order.requestedAtMinute)||order.requestedAtMinute<0||!Number.isFinite(order.readyAtMinute)||
   order.readyAtMinute<order.requestedAtMinute)continue;
  const row=order.collection;
  if(!row){
   // Exact historical service output remains valid in old checkpoints. Its
   // authored three-pair bundle is never inferred from a bare matching ID.
   if(order.label===definition.label&&order.result===definition.result&&order.nativeResult===true&&order.resultSource==='native'){
    if(order.status==='pending'){pendingCount+=collection.requiredCount;pendingOrders.push(order);}
    else if(order.status==='done'&&(!Number.isFinite(realMinute)||order.readyAtMinute<=realMinute)){
     collectedCount+=collection.requiredCount;validOrders.push(order);
    }
   }
   continue;
  }
  if(row.unit!==collection.unit||!validStudyQuantity(row.requestedCount)||row.microbiologyStatus!=='pending')continue;
  if(order.status==='pending'&&row.status==='pending'&&row.collectedCount===0){
   pendingCount+=row.requestedCount;pendingOrders.push(order);continue;
  }
  if(order.status!=='done'||row.status!=='collected'||row.collectedCount!==row.requestedCount||
   !Number.isFinite(row.collectedAtMinute)||row.collectedAtMinute<order.readyAtMinute||
   !Number.isFinite(row.collectedAtNativeMinute)||row.collectedAtNativeMinute<0||
   Number.isFinite(realMinute)&&row.collectedAtMinute>realMinute||
   Number.isFinite(nativeMinute)&&row.collectedAtNativeMinute>nativeMinute)continue;
  collectedCount+=row.collectedCount;validOrders.push(order);
 }
 return {...collection,collectedCount,pendingCount,requestedCount:collectedCount+pendingCount,
  remainingCount:Math.max(0,collection.requiredCount-collectedCount),orders:validOrders,pendingOrders};
}

export function patientStudyOrders(patient,status,caseData){
 return (patient.orders||[]).filter(order=>{
  if(order.patientUid!==patient.uid)return false;
  const collection=patientStudyCollectionProgress(patient,caseData,order.id);
  if(collection)return status==='pending'?collection.pendingOrders.includes(order):
   status==='done'&&collection.collectedCount>=collection.requiredCount&&collection.orders.includes(order);
  const required=requiredStudySeries(caseData,order.id);
  if(!required)return order.status===status;
  if(status==='pending')return order.series?.status==='pending';
  return status==='done'&&order.series?.status==='done'&&order.status==='done'&&order.samples?.length===required.seriesSamples.length+1&&
   order.samples.every((sample,index)=>{
    const authored=required.seriesSamples[index-1],previous=order.samples[index-1];
    return sample.status==='done'&&Number.isFinite(sample.sampledAtNativeMinute)&&sample.sampledAtNativeMinute>=0&&
     Number.isFinite(sample.readyAtMinute)&&sample.result===(authored?.result??required.result)&&
     (index===0?sample.afterNativeMinutes===0&&sample.sampledAtNativeMinute===order.sampledAtNativeMinute&&sample.readyAtMinute===order.readyAtMinute:
      sample.afterNativeMinutes===authored.afterNativeMinutes&&sample.sampledAtNativeMinute>=previous.sampledAtNativeMinute+
       (sample.afterNativeMinutes-previous.afterNativeMinutes));
   })&&order.series.readyAtMinute===order.samples.at(-1).readyAtMinute;
 });
}
