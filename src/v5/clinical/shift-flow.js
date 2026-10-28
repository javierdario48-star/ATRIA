import {clinicalExecutorFor} from '../content/clinical-cases.js';
import {clinicalAcuity} from './acuity.js';
// One deterministic admission schedule; the native patient session remains
// the only clinical owner. One real second = one displayed game minute.
export const SHIFT_DURATION_SECONDS=1440;
// 1/60-second simulation steps accumulate IEEE-754 error at exact hours.
// This epsilon is far below one frame; it never admits a patient a frame early.
const CLOCK_EPSILON=1e-8;
export const SHIFT_ARRIVAL_SECONDS=Object.freeze([0,180,420,720,1020,1260]);
const clone=x=>structuredClone(x);
export function receptionAcuity({caseData,patient=null,waitingSeconds=0}={}){
 // Native case evolution is already advanced by the one patient executor.
 // Never synthesize altered blood pressures from queue duration.
 // Reception labels the patient's current authoritative native physiology,
 // not a historical measurement that may already be stale after deterioration
 // or rescue. Measurements remain separately timestamped in the clinical record.
 const confirmed=patient?.liveVitals||patient?.lastVitalsKnown?.vitals||patient?.baselineVitals||null;
 const highRisk=!confirmed&&(['shock','bleed','peritonitis'].includes(caseData?.risk)||
  !!caseData?.physiology?.sourceControlRequired);
 return clinicalAcuity(confirmed||caseData?.vitals,{dead:!!patient?.patientDied,
  rhythm:patient?.ecg?.rhythm,highRisk});
}
export function createShiftFlow({content,mode,firstCaseId,roomId,snapshot=null,allowedCaseIds=null,caseSequence=null}){
 if(typeof roomId!=='string'||!roomId||roomId.length>100)throw Error('invalid shift room');
 const certified=content.cases.filter(c=>clinicalExecutorFor(c));
 const allowed=allowedCaseIds===null?null:new Set(allowedCaseIds);
 if(allowedCaseIds!==null&&(!Array.isArray(allowedCaseIds)||!allowedCaseIds.length||
  allowed.size!==allowedCaseIds.length||allowedCaseIds.some(id=>!certified.some(c=>c.id===id))))
  throw Error('invalid shift case selection');
 const playable=allowed?certified.filter(c=>allowed.has(c.id)):certified;
 const sequence=snapshot?.caseSequence??caseSequence;
 if(sequence!==null&&(!Array.isArray(sequence)||sequence.length!==SHIFT_ARRIVAL_SECONDS.length||
  sequence[0]!==firstCaseId||sequence.some(id=>!playable.some(c=>c.id===id))))throw Error('invalid admission sequence');
 if(!playable.some(c=>c.id===firstCaseId)||!['solo','apprentice','coop','competitive'].includes(mode))
  throw Error('invalid certified shift');
 const cases=new Map(playable.map(c=>[c.id,c])),beds=content.beds;
 if(!Array.isArray(beds)||!beds.length||new Set(beds.map(b=>b.id)).size!==beds.length)
  throw Error('invalid shift beds');
 const records=clone(snapshot?.records??[]);
 let elapsedSeconds=snapshot?.elapsedSeconds??0,nextIndex=snapshot?.nextIndex??0;
 if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0||elapsedSeconds>SHIFT_DURATION_SECONDS||
  !Number.isSafeInteger(nextIndex)||nextIndex<0||nextIndex>SHIFT_ARRIVAL_SECONDS.length||
  !Array.isArray(records)||records.length!==nextIndex||
  records.some((r,i)=>r.uid!==roomId+(i===0?':patient':':patient-'+(i+1))||
   r.index!==i||!beds.some(b=>b.id===r.bedId)||!cases.has(r.caseId)||sequence&&r.caseId!==sequence[i]||
   !Number.isFinite(r.arrivalAt)||r.arrivalAt<0||r.arrivalAt>elapsedSeconds)||
  new Set(records.filter(r=>!r.departed).map(r=>r.bedId)).size!==records.filter(r=>!r.departed).length)
  throw Error('invalid shift checkpoint');
 function admit(index){
  const caseId=sequence?sequence[index]:index===0?firstCaseId:playable[(playable.findIndex(c=>c.id===firstCaseId)+index)%playable.length].id;
  const c=cases.get(caseId),used=new Set(records.filter(r=>!r.departed).map(r=>r.bedId));
  let allowed=beds.filter(b=>!used.has(b.id));
  if(mode==='competitive'&&index===1){
   const first=beds.find(b=>b.id===records[0]?.bedId);
   const far=allowed.filter(b=>first&&Math.abs(b.patient[0]-first.patient[0])>=500);
   if(far.length)allowed=far;
  }
  const risk=receptionAcuity({caseData:c}).priority;
  const critical=allowed.filter(b=>['monitored','critical'].includes(b.acuity));
  if(risk>=2&&critical.length)allowed=critical;
  if(!allowed.length)return null;
  const bed=allowed[0],uid=roomId+(index===0?':patient':':patient-'+(index+1));
  const record={uid,index,caseId,bedId:bed.id,arrivalAt:elapsedSeconds,ownerId:null,closed:false,departed:false};
  records.push(record);return clone(record);
 }
 return Object.freeze({
  advance(deltaSeconds){
   if(!Number.isFinite(deltaSeconds)||deltaSeconds<0)throw Error('invalid shift delta');
   elapsedSeconds=Math.min(SHIFT_DURATION_SECONDS,elapsedSeconds+deltaSeconds);
   if(SHIFT_DURATION_SECONDS-elapsedSeconds<CLOCK_EPSILON)elapsedSeconds=SHIFT_DURATION_SECONDS;
   const arrivals=[];
   while(nextIndex<SHIFT_ARRIVAL_SECONDS.length){
    const due=mode==='competitive'&&nextIndex>0?SHIFT_ARRIVAL_SECONDS[nextIndex-1]:SHIFT_ARRIVAL_SECONDS[nextIndex];
    if(due-elapsedSeconds>CLOCK_EPSILON)break;
    const r=admit(nextIndex);if(!r)break;
    arrivals.push(r);nextIndex++;
   }
   return arrivals;
  },
  elapsed:()=>elapsedSeconds,remaining:()=>SHIFT_DURATION_SECONDS-elapsedSeconds,
  ended:()=>elapsedSeconds>=SHIFT_DURATION_SECONDS,records:()=>clone(records),
  record:uid=>clone(records.find(r=>r.uid===uid)||null),
  close(uid,ownerId,destination=null){const r=records.find(r=>r.uid===uid);if(!r||r.closed)return false;
   r.closed=true;r.departed=true;r.ownerId=ownerId;r.destination=destination;return true;},
  owner(uid,id){const r=records.find(r=>r.uid===uid);if(!r||r.closed)return false;if(r.ownerId)return r.ownerId===id;r.ownerId=id;return true;},
  checkpoint:()=>clone({records,elapsedSeconds,nextIndex,...(sequence?{caseSequence:sequence}:{})})
 });
}
