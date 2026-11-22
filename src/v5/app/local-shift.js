/** One local guard owns elapsed time and confirmed per-patient receipts.
 * The clinical engine remains the sole authority for patient closure and XP.
 * Cooperative and competitive patient rotation require their own durable room
 * authority and therefore cannot call begin(... continuation:true).
 */
export function createLocalShift({caseIds=[],rotationCaseIds=caseIds,limitMinutes=1440}={}){
 const options=[...new Set(caseIds)];
 const rotation=[...new Set(rotationCaseIds)].filter(id=>options.includes(id));
 if(!Number.isFinite(limitMinutes)||limitMinutes<=0)throw Error('invalid shift duration');
 let state=null;
 const canContinue=({previous,mode}={})=>!!state&&
  ['solo','apprentice'].includes(mode)&&!!previous?.patient?.closure?.closed&&
  Number.isFinite(previous?.clock?.gameMinute)&&
  state.elapsedBefore+previous.clock.gameMinute<limitMinutes;
 const begin=({caseId,continuation=false,previous,mode}={})=>{
  if(!options.includes(caseId))return false;
  if(continuation){
   if(!canContinue({previous,mode}))return false;
   state.elapsedBefore+=previous.clock.gameMinute;
  }else state={elapsedBefore:0,seenCases:[],outcomes:new Map()};
  state.seenCases.push(caseId);
  return true;
 };
 const record=closure=>{
  if(!state||!closure?.closed||!closure.patientUid||state.outcomes.has(closure.patientUid))return false;
  state.outcomes.set(closure.patientUid,{patientUid:closure.patientUid,closed:true,
   survived:true,score:closure.quality?.score||0,xp:closure.xp||0});
  return true;
 };
 const nextCase=current=>{
  if(!state||rotation.length===0)return null;
  return rotation.find(id=>!state.seenCases.includes(id))||
   rotation[(rotation.indexOf(current)+1+rotation.length)%rotation.length];
 };
 return Object.freeze({
  begin,record,canContinue,nextCase,reset:()=>{state=null;},
  restore(saved){
   if(!saved||!Number.isFinite(saved.elapsedBefore)||saved.elapsedBefore<0||saved.elapsedBefore>limitMinutes||
    !Array.isArray(saved.seenCases)||!saved.seenCases.length||saved.seenCases.some(id=>!options.includes(id))||
    !Array.isArray(saved.outcomes)||new Set(saved.outcomes.map(x=>x.patientUid)).size!==saved.outcomes.length||
    saved.outcomes.some(x=>!x.patientUid||x.closed!==true||!Number.isFinite(x.xp)||x.xp<0))throw Error('invalid local shift checkpoint');
   state={elapsedBefore:saved.elapsedBefore,seenCases:[...saved.seenCases],
    outcomes:new Map(saved.outcomes.map(x=>[x.patientUid,{...x}]))};return true;
  },
  active:()=>!!state,
  elapsedBefore:()=>state?.elapsedBefore||0,
  totalMinutes:elapsed=>Math.min(limitMinutes,(state?.elapsedBefore||0)+Math.max(0,Number(elapsed)||0)),
  outcomes:()=>state?[...state.outcomes.values()].map(x=>({...x})):[],
  snapshot:()=>state?{elapsedBefore:state.elapsedBefore,seenCases:[...state.seenCases],
   outcomes:[...state.outcomes.values()].map(x=>({...x}))}:null
 });
}
