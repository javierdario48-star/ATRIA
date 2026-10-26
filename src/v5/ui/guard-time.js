// One game minute per real second. Display-only: the runtime owns time.
export const GUARD_DURATION_SECONDS=1440;
export function formatGuardTime(elapsedSeconds){
 const seconds=Number.isFinite(elapsedSeconds)?Math.max(0,Math.min(GUARD_DURATION_SECONDS,elapsedSeconds)):0;
 const minute=Math.floor(seconds),timeOfDay=(8*60+15+minute)%(24*60);
 const clock=n=>String(n).padStart(2,'0');
 const time=clock(Math.floor(timeOfDay/60))+':'+clock(timeOfDay%60);
 const progress=clock(Math.floor(minute/60))+':'+clock(minute%60)+' / 24:00';
 return {time,progress,ended:seconds>=GUARD_DURATION_SECONDS,
  accessible:'Hora del hospital '+time+'. Guardia transcurrida '+progress+'.'};
}
