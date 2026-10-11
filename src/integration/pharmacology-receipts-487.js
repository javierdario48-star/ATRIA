/** Pure QA receipt adapter. Supplied confirmations are the trust boundary;
 * matching does not prove physical delivery or install a real executor.
 * V1 retains approved B1 compatibility. V2 requires an explicit formulation
 * and complete confirmed episode history (including prior polling batches).
 * Never upgrade a native V1 row by guessing these missing fields. */
import {validateClinicalClock487,nativeToClinicalTime487} from '../clinical/clinical-clock-487.js';
import {freezePharmacology487} from '../clinical/pharmacology-mechanisms-487.js';
import {pharmacologyExecutionKey487,validatePharmacologyEpisodes487} from '../clinical/pharmacology-content-487.js';
const SOURCES=new Set(['qa-confirmed-ledger','native-administration-log']),MAX_RECEIPTS=2048;
const unit=x=>String(x||'').replace(/[µμ]/g,'mc').replace(/^ug/,'mcg');
const canonical=x=>JSON.stringify(sortKeys(x));
const sortKeys=x=>Array.isArray(x)?x.map(sortKeys):x&&typeof x==='object'?
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,sortKeys(x[k])])):x;
const timestamp=t=>({authorityId:t.authorityId,unit:t.unit,value:t.value});
const identifier=(x,name)=>{if(typeof x!=='string'||!x.trim()||x.length>200)throw Error('invalid receipt '+name);return x;};
function execution(raw,{patientId,clock,definitions},label){
 if(![1,2].includes(raw?.schemaVersion)||raw.status!=='administered')throw Error('invalid '+label+' schema/status');
 identifier(raw.eventId,'event identity');if(raw.patientId!==patientId)throw Error(label+' patient mismatch');
 const d=definitions.drugs.get(raw.treatmentId);if(!d)throw Error('unsupported treatment/formulation '+raw.treatmentId);
 if(raw.route!==d.route||!d.actions.includes(raw.action))throw Error(label+' route/action mismatch');
 const actions={administration:['bolus','start'],'dose-change':['setRate'],suspension:['stop']};
 if(!actions[raw.eventType]?.includes(raw.action))throw Error(label+' semantic action mismatch');
 if(!Number.isSafeInteger(raw.sequence)||raw.sequence<0||raw.sequence>1e9)throw Error('invalid receipt sequence');
 const stamp=raw.timestamp;
 if(stamp?.authorityId!==clock.authorityId)throw Error(label+' clock authority mismatch');
 if(typeof stamp.value!=='number'||!Number.isFinite(stamp.value)||stamp.value<0)throw Error(label+' invalid timestamp');
 let atClinicalMinute;
 if(stamp.unit==='native-minute')atClinicalMinute=nativeToClinicalTime487(clock,stamp.value);
 else if(stamp.unit==='clinical-minute')atClinicalMinute=Math.round(stamp.value*60000000)/60000000;
 else throw Error(label+' explicit timestamp unit required');
 if(atClinicalMinute>clock.clinicalMinute)throw Error(label+' future timestamp outside clock range');
 let dose;
 if(raw.action==='stop'){if(raw.dose!==undefined)throw Error(label+' suspension must not carry a new dose');}
 else{
  if(unit(raw.dose?.unit)!==unit(d.unit)||typeof raw.dose?.amount!=='number'||!Number.isFinite(raw.dose.amount)||raw.dose.amount<0||raw.dose.amount>1e6)
   throw Error(label+' dose/unit mismatch');
  if(raw.schemaVersion===2&&raw.dose.amount===0)throw Error(label+' zero dose/rate requires an explicit stop');
  dose={amount:raw.dose.amount,unit:unit(d.unit)};
 }
 const executionKey=raw.schemaVersion===2?pharmacologyExecutionKey487(raw,d):undefined;
 return {eventId:raw.eventId,patientId,drugId:d.id,status:'administered',action:raw.action,route:d.route,
  sequence:raw.sequence,atClinicalMinute,...(dose?{dose}:{}),...(executionKey?{executionKey}:{})};
}
function validateEpisodes(witnesses,context){
 const events=new Map(),sequences=new Map();
 for(const row of witnesses.values()){
  if(row.schemaVersion!==2)throw Error('mixed receipt protocol in confirmed episode history');
  const e=execution(row,context,'episode confirmation'),signature=canonical(e);
  if(events.has(e.eventId)){if(canonical(events.get(e.eventId))!==signature)throw Error('conflicting episode event '+e.eventId);continue;}
  if(sequences.has(e.sequence))throw Error('conflicting episode sequence '+e.sequence);
  events.set(e.eventId,e);sequences.set(e.sequence,e.eventId);
 }
 validatePharmacologyEpisodes487([...events.values()]);
}
export function adaptConfirmedPharmacologyEvents487(events,{patientId,definitions,confirmations,clock}={}){
 identifier(patientId,'patient');validateClinicalClock487(clock);
 if(!definitions?.drugs?.get)throw Error('validated pharmacology definitions required');
 if(!Array.isArray(events)||!Array.isArray(confirmations)||events.length>MAX_RECEIPTS||confirmations.length>MAX_RECEIPTS)
  throw Error('receipt batch limit/confirmation arrays require checkpoint');
 const versions=new Set(events.map(e=>e?.schemaVersion));
 if(versions.size>1)throw Error('mixed typed receipt protocol versions');
 const witnesses=new Map();
 for(const row of confirmations){
  if(row?.status!=='administered')continue;
  const id=identifier(row.receiptId,'confirmation identity');
  if(!SOURCES.has(row.source))throw Error('unsupported confirmation source');
  if(witnesses.has(id)&&canonical(witnesses.get(id))!==canonical(row))throw Error('conflicting confirmation receipt '+id);
  witnesses.set(id,row);
 }
 if(versions.has(2))validateEpisodes(witnesses,{patientId,clock,definitions});
 const seen=new Map(),sequences=new Map(),result=[],ignored=[];
 for(const raw of events){
  if(![1,2].includes(raw?.schemaVersion))throw Error('invalid typed receipt schema');
  if(raw.patientId!==patientId)throw Error('typed receipt patient mismatch');identifier(raw.eventId,'event identity');
  if(raw.status!=='administered'){
   if(!['pending','requested','cancelled','failed'].includes(raw.status))throw Error('unsupported typed receipt status');
   ignored.push({eventId:raw.eventId,status:raw.status,reason:'execution-not-confirmed'});continue;
  }
  const v=raw.verification;if(!v||!SOURCES.has(v.source))throw Error('independent confirmation/verification required');
  const row=witnesses.get(v.receiptId);if(!row||row.source!==v.source)throw Error('missing independent confirmation receipt '+v.receiptId);
  const e=execution(raw,{patientId,clock,definitions},'event'),w=execution(row,{patientId,clock,definitions},'confirmation');
  if(JSON.stringify(e)!==JSON.stringify(w)||raw.eventType!==row.eventType)throw Error('event/confirmation mismatch '+raw.eventId);
  e.provenance={schemaVersion:1,source:v.source,receiptId:v.receiptId,clockAuthorityId:clock.authorityId,eventType:raw.eventType,
   eventTimestamp:timestamp(raw.timestamp),confirmationTimestamp:timestamp(row.timestamp)};
  if(e.executionKey){e.provenance.executionKey=e.executionKey;delete e.executionKey;}
  const signature=JSON.stringify(e);
  if(seen.has(e.eventId)){if(seen.get(e.eventId)!==signature)throw Error('conflicting typed receipt '+e.eventId);continue;}
  if(sequences.has(e.sequence)&&sequences.get(e.sequence)!==e.eventId)throw Error('conflicting authoritative receipt sequence '+e.sequence);
  seen.set(e.eventId,signature);sequences.set(e.sequence,e.eventId);result.push(freezePharmacology487(e));
 }
 result.sort((a,b)=>a.atClinicalMinute-b.atClinicalMinute||a.sequence-b.sequence||(a.eventId<b.eventId?-1:a.eventId>b.eventId?1:0));
 return freezePharmacology487({schemaVersion:1,clockAuthorityId:clock.authorityId,events:result,ignored});
}
