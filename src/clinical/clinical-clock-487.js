/** QA authority clock. Explicit input only; never changes ATRIA's native pace. */
const MINUTE_US=60000000,NATIVE_QUANTA_PER_MINUTE=MINUTE_US*100,MAX_SEGMENTS=128,MAX_US=MINUTE_US*1e6;
const finite=(x,name,min=0,max=1e9)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error('invalid '+name);return x;};
const integer=(x,name,max=Number.MAX_SAFE_INTEGER)=>{finite(x,name,0,max);if(!Number.isSafeInteger(x))throw Error('invalid clock integer '+name);};
const authority=id=>{if(typeof id!=='string'||!id.trim()||id.length>160)throw Error('clinical clock authority required');};
export function validateClinicalClock487(clock){
 if(clock?.schemaVersion!==1||clock.modelVersion!=='guard-clinical-clock-1')throw Error('incompatible clinical clock');authority(clock.authorityId);
 integer(clock.clinicalUs,'clinical time',MAX_US);integer(clock.nativeQuanta,'native time');finite(clock.clinicalRemainderUs,'clock remainder',-.5,.5);
 if(clock.clinicalMinute!==clock.clinicalUs/MINUTE_US||clock.nativeMinute!==clock.nativeQuanta/NATIVE_QUANTA_PER_MINUTE)
  throw Error('corrupt derived clinical clock time');
 if(!Array.isArray(clock.segments)||clock.segments.length>MAX_SEGMENTS)throw Error('clock segment limit requires checkpoint');
 let clinical=0,native=0;
 for(const s of clock.segments){
  for(const key of ['clinicalStartUs','clinicalEndUs','nativeStartQuanta','nativeEndQuanta'])integer(s[key],key);
  if(![3,12].includes(s.nativeNumerator)||s.clinicalStartUs!==clinical||s.nativeStartQuanta!==native||s.clinicalEndUs<=clinical||
   s.nativeEndQuanta-native!==(s.clinicalEndUs-clinical)*s.nativeNumerator)throw Error('corrupt piecewise clock segment');
  clinical=s.clinicalEndUs;native=s.nativeEndQuanta;
 }
 if(clinical!==clock.clinicalUs||native!==clock.nativeQuanta)throw Error('clock history does not cover current time');return clock;
}
export function createClinicalClock487({authorityId}={}){
 authority(authorityId);return Object.freeze({schemaVersion:1,modelVersion:'guard-clinical-clock-1',authorityId,
  clinicalUs:0,clinicalRemainderUs:0,nativeQuanta:0,clinicalMinute:0,nativeMinute:0,segments:Object.freeze([])});
}
export function advanceClinicalClock487(clock,{deltaRealSeconds,nativeMinutesPerRealSecond,paused=false}={}){
 validateClinicalClock487(clock);finite(deltaRealSeconds,'delta real seconds',0,86400);
 if(![.12,.03].includes(nativeMinutesPerRealSecond))throw Error('explicit supported native clock rate/mapping required');
 if(typeof paused!=='boolean')throw Error('explicit boolean pause required');if(paused)return clock;
 const precise=deltaRealSeconds*MINUTE_US+clock.clinicalRemainderUs,delta=Math.round(precise),rest=precise-delta;
 const clinicalUs=clock.clinicalUs+delta;integer(clinicalUs,'clinical time',MAX_US);
 const numerator=nativeMinutesPerRealSecond===.12?12:3,nativeQuanta=clock.nativeQuanta+delta*numerator;
 integer(nativeQuanta,'native time');const segments=clock.segments.slice();
 if(delta>0){
  const last=segments.at(-1),sameRate=last?.nativeNumerator===numerator;
  if(!sameRate&&segments.length>=MAX_SEGMENTS)throw Error('piecewise clock segment limit requires checkpoint');
  const segment=Object.freeze({clinicalStartUs:sameRate?last.clinicalStartUs:clock.clinicalUs,clinicalEndUs:clinicalUs,
   nativeStartQuanta:sameRate?last.nativeStartQuanta:clock.nativeQuanta,nativeEndQuanta:nativeQuanta,nativeNumerator:numerator});
  if(sameRate)segments[segments.length-1]=segment;else segments.push(segment);
 }
 return Object.freeze({...clock,clinicalUs,nativeQuanta,clinicalRemainderUs:Math.abs(rest)<1e-6?0:rest,
  clinicalMinute:clinicalUs/MINUTE_US,nativeMinute:nativeQuanta/NATIVE_QUANTA_PER_MINUTE,segments:Object.freeze(segments)});
}
export function nativeToClinicalTime487(clock,nativeMinute){
 validateClinicalClock487(clock);finite(nativeMinute,'native time',0,1e6);
 const quanta=Math.round(nativeMinute*NATIVE_QUANTA_PER_MINUTE);
 if(quanta>clock.nativeQuanta)throw Error('native timestamp outside authoritative clock history range');
 if(quanta===0)return 0;
 let low=0,high=clock.segments.length-1;
 while(low<=high){
  const mid=(low+high)>>1,s=clock.segments[mid];
  if(quanta<s.nativeStartQuanta)high=mid-1;
  else if(quanta>s.nativeEndQuanta)low=mid+1;
  else return (s.clinicalStartUs+Math.round((quanta-s.nativeStartQuanta)/s.nativeNumerator))/MINUTE_US;
 }
 throw Error('missing native timestamp clock history; checkpoint/replay required');
}
