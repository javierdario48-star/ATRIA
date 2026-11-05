import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';
import {authoredTroponinSeries} from './study-order-vocabulary.js';

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

export function patientStudyOrders(patient,status,caseData){
 return (patient.orders||[]).filter(order=>{
  if(order.patientUid!==patient.uid)return false;
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
