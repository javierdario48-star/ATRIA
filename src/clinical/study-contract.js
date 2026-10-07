export const REAL_MINUTE_MS=60_000;
export function gameHoursToRealMs(hours){return hours*REAL_MINUTE_MS}
export function resolveStudy({nativeResult=null,fallbackResult,turnaroundGameHours}){
 if(!fallbackResult)throw new Error('fallbackResult required');
 if(!(turnaroundGameHours>0))throw new Error('turnaroundGameHours must be positive');
 return {result:nativeResult??fallbackResult,source:nativeResult!=null?'native':'universal-fallback',delayMs:gameHoursToRealMs(turnaroundGameHours)};
}
export function orderUniversalStudy({id,label,nativeResult,fallbackResult,turnaroundGameHours,now=Date.now()}){
 const r=resolveStudy({nativeResult,fallbackResult,turnaroundGameHours});
 return{id,label,status:'pending',requestedAt:now,readyAt:now+r.delayMs,result:r.result,resultSource:r.source};
}
