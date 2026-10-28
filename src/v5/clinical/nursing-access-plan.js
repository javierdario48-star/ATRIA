import {NATIVE_MEDICINES,isNativeMedicine,nativeMedicineDefinition,parseNativeMedicineDose} from './native-medications.js';

/** Small read-only dependency planner, used AFTER the legacy nurse scanner.
 * Real IV placement remains an ordinary visible, authorized room action and
 * must reach the patient's bed before any medicine can be prepared.
 */
export function planNursingIVAccess(intents,{venousAccessCount,pendingIV,defaultDoses,caseData}={}){
 if(!Number.isInteger(venousAccessCount)||venousAccessCount<0)return intents;
 const validIV=intents.filter(item=>{
  if(item.kind!=='therapy.request'||!isNativeMedicine(item.id)||!nativeMedicineDefinition(item.id,caseData)?.requiresAccess)return false;
  try{parseNativeMedicineDose(item.id,item.clause||item.sourceText,defaultDoses?.[item.id]??NATIVE_MEDICINES[item.id]?.dose,item.sourceText,caseData);return true;}
  catch{return false;}
 });
 if(!validIV.length)return intents;
 const explicit=intents.filter(item=>item.kind==='procedure.request'&&item.id==='iv');
 if(explicit.length){
  // Stable order among non-access actions; do not inject a second IV.
  return [...explicit,...intents.filter(item=>!explicit.includes(item))];
 }
 if(venousAccessCount>=1||pendingIV)return intents;
 const medication=validIV[0];
 return [{kind:'procedure.request',id:'iv',count:1,automatic:true,
  clause:'una vía',sourceText:medication.sourceText},...intents];
}
