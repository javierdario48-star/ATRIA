// Case admissions and reception triage for the original 24-minute / 24-hour
// shift. This module owns only the scheduling/bed occupancy policy. Every
// patient must still be created by the native per-patient clinical executor.
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';

export const SHIFT_DURATION_SECONDS=24*60;
export const SHIFT_ARRIVALS=Object.freeze({
 solo:Object.freeze([0,180,420,720,1020,1260]),
 apprentice:Object.freeze([0,180,420,720,1020,1260]),
 coop:Object.freeze([0,180,420,720,1020,1260]),
 competitive:Object.freeze([0,0,180,420,720,1020,1260])
});
const clone=x=>structuredClone(x);
const number=x=>x==null||String(x).trim()===''?NaN:Number.isFinite(Number(x))?Number(x):NaN;
const pressure=(sys,dia)=>(sys+2*dia)/3;

// The unconnected bedside monitor MUST remain 'unmonitored'. Reception has
// initial triage measurements, which are not continuous ECG/vital readings.
// Risk/queue delay may raise priority, but NEVER change a patient's vitals.
export function receptionAcuity(caseData,patient=null,waitingSeconds=0){
 const recorded=patient?.lastVitalsKnown?.vitals||patient?.baselineVitals||caseData?.vitals||{};
 const bp=String(recorded.bp||'').split('/').map(number);
 const sys=number(recorded.sys??bp[0]),dia=number(recorded.dia??bp[1]);
 const hr=number(recorded.hr),spo2=number(recorded.spo2),rr=number(recorded.rr);
 const risk=String(caseData?.risk||'');
 const highRisk=['shock','bleed','peritonitis'].includes(risk)||
  !!caseData?.physiology?.sourceControlRequired;
 const measurements=[sys,dia,hr,spo2,rr];
 if(patient?.patientDied||sys<80||(Number.isFinite(sys)&&Number.isFinite(dia)&&pressure(sys,dia)<55)||
  spo2<90||hr>=150||rr>=35)
  return {state:'critical',label:'CRÍTICO',color:'red',priority:3};
 if(highRisk||sys<95||hr>115||spo2<94||rr>=26||
  (waitingSeconds>=300&&(sys<105||hr>=100)))
  return {state:'urgent',label:'URGENTE',color:'orange',priority:2};
 if(sys<105||hr>=100||number(recorded.temp)>=38||
  (waitingSeconds>=600&&Number.isFinite(sys)&&sys<110))
  return {state:'warning',label:'VIGILANCIA',color:'yellow',priority:1};
 if(measurements.some(v=>!Number.isFinite(v)))
  return {state:'unknown',label:'PENDIENTE',color:'gray',priority:0};
 return {state:'stable',label:'ESTABLE',color:'green',priority:0};
}

export function createShiftFlow({content,roomId,firstCaseId,mode,snapshot=null}){
 if(!['solo','apprentice','coop','competitive'].includes(mode))
  throw Error('invalid shift mode');
 if(typeof roomId!=='string'||!roomId||roomId.length>100)throw Error('invalid shift room');
 const cases=content?.cases?.filter(c=>Object.hasOwn(CLINICAL_EXECUTORS,c.id))||[];
 const beds=content?.beds||[];
 if(!cases.some(c=>c.id===firstCaseId)||!beds.length)throw Error('uncertified shift seed or no beds');
 if(new Set(beds.map(b=>b.id)).size!==beds.length)throw Error('duplicate shift beds');
 const byId=new Map(cases.map(c=>[c.id,c])),byBed=new Map(beds.map(b=>[b.id,b]));
 const schedule=SHIFT_ARRIVALS[mode];
 let elapsedSeconds=snapshot?.elapsedSeconds??0,nextIndex=snapshot?.nextIndex??0;
 const patients=clone(snapshot?.patients??[]);
 if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0||elapsedSeconds>SHIFT_DURATION_SECONDS||
  !Number.isSafeInteger(nextIndex)||nextIndex<0||nextIndex>schedule.length||
  !Array.isArray(patients)||patients.length!==nextIndex)
  throw Error('invalid shift checkpoint');
 if(patients.some((p,i)=>p.uid!==roomId+':patient-'+(i+1)||!byBed.has(p.bedId)||
  !byId.has(p.caseId)||!Number.isFinite(p.arrivedAt)||p.arrivedAt>elapsedSeconds))
  throw Error('invalid shift patient records');
 const activeBeds=()=>new Set(patients.filter(p=>!p.departed).map(p=>p.bedId));
 function caseAt(index){
  if(index===0)return firstCaseId;
  const start=cases.findIndex(c=>c.id===firstCaseId);
  return cases[(start+index)%cases.length].id;
 }
 function chooseBed(caseId,index){
  const used=activeBeds(),c=byId.get(caseId);
  let eligible=beds.filter(b=>!used.has(b.id));
  if(!eligible.length)return null;
  if(mode==='competitive'&&index===1){
   // The second starting patient belongs to the opposite hospital wing.
   const other=patients[0]&&byBed.get(patients[0].bedId);
   if(other){
    const opposite=eligible.filter(b=>Math.abs(b.patient[0]-other.patient[0])>=500);
    if(opposite.length)eligible=opposite;
   }
  }
  const acuity=receptionAcuity(c);
  if(acuity.priority>=2){
   const monitored=eligible.filter(b=>['critical','monitored'].includes(b.acuity));
   if(monitored.length)eligible=monitored;
  }else{
   const standard=eligible.filter(b=>b.acuity!=='critical');
   if(standard.length)eligible=standard;
  }
  return eligible[0]||null;
 }
 function advance(deltaSeconds){
  if(!Number.isFinite(deltaSeconds)||deltaSeconds<0)throw Error('invalid shift delta');
  elapsedSeconds=Math.min(SHIFT_DURATION_SECONDS,elapsedSeconds+deltaSeconds);
  const arrivals=[];
  while(nextIndex<schedule.length&&schedule[nextIndex]<=elapsedSeconds){
   const caseId=caseAt(nextIndex),bed=chooseBed(caseId,nextIndex);
   if(!bed)break; // A full hospital preserves the pending entry.
   const record={uid:roomId+':patient-'+(nextIndex+1),index:nextIndex,
    caseId,bedId:bed.id,arrivedAt:schedule[nextIndex],departed:false,closed:false,ownerId:null};
   patients.push(record);nextIndex++;arrivals.push(clone(record));
  }
  return arrivals;
 }
 function close(uid,ownerId=null){
  const p=patients.find(p=>p.uid===uid);
  if(!p||p.closed)return false;
  p.closed=true;p.departed=true;p.ownerId=ownerId;return true;
 }
 function claim(uid,actorId){
  const p=patients.find(p=>p.uid===uid);
  if(!p||p.closed||!actorId)return false;
  if(p.ownerId)return p.ownerId===actorId;
  p.ownerId=actorId;return true;
 }
 return Object.freeze({
  advance,claim,close,
  ended:()=>elapsedSeconds>=SHIFT_DURATION_SECONDS,
  elapsed:()=>elapsedSeconds,
  remaining:()=>SHIFT_DURATION_SECONDS-elapsedSeconds,
  records:()=>clone(patients),
  get:uid=>clone(patients.find(p=>p.uid===uid)||null),
  reception:()=>patients.filter(p=>!p.departed).map(p=>({
   ...clone(p),waitingSeconds:Math.max(0,elapsedSeconds-p.arrivedAt),
   acuity:receptionAcuity(byId.get(p.caseId),null,elapsedSeconds-p.arrivedAt)})),
  checkpoint:()=>clone({elapsedSeconds,nextIndex,patients})
 });
}
