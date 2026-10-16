import {ecgAmplitude,advanceEcgPhase,ECG_RHYTHMS} from '../clinical/ecg-morphology.js';

/** Rolling *presentation-only* ECG recorder.
 *
 * The physical time axis is constant: each screen always shows 4.5 seconds.
 * Samples are appended at 125 Hz and retained until they scroll off the left.
 * A changed native HR affects only subsequent samples, never historic beats.
 *
 * No extra RAF, timers, room messages or clinical state are created.
 * Pixels are display units, not a claim of calibrated 25 mm/s medical paper.
 */
export const ECG_WINDOW_SECONDS=4.5;
export const ECG_SAMPLES_PER_SECOND=125;
const STEP=1/ECG_SAMPLES_PER_SECOND;
const SAMPLE_LIMIT=Math.ceil(ECG_WINDOW_SECONDS*ECG_SAMPLES_PER_SECOND)+4;
export function createEcgSweep({windowSeconds=ECG_WINDOW_SECONDS,width=560,height=76}={}){
 if(!Number.isFinite(windowSeconds)||windowSeconds<=0||!Number.isFinite(width)||width<=0||
  !Number.isFinite(height)||height<=0)throw Error('invalid ECG sweep geometry');
 let samples=[],lastSeconds=null,sampleSeconds=null,cycles=0,rhythm=null;
 const reset=()=>{samples=[];lastSeconds=null;sampleSeconds=null;cycles=0;rhythm=null;};
 const info=()=>Object.freeze({samples:samples.length,cycles,lastSeconds,rhythm,windowSeconds});
 const record=(at,hr,name)=>{
  cycles=advanceEcgPhase(cycles,STEP,Math.max(0,hr));
  // The beat phase follows the heart; a fibrillatory signal is clock-driven.
  // For an explicit asystole, amplitude is always zero.
  const virtualTime=hr>0?cycles*60/hr:at;
  const amp=ecgAmplitude(name==='ventricular_fibrillation'?at:virtualTime,{hr,rhythm:name});
  samples.push({time:at,value:amp});
  if(samples.length>SAMPLE_LIMIT)samples.shift();
 };
 function update(nowMs,{connected=false,measured=false,hr=null,rhythm:nextRhythm='sinus',rhythmSource='baseline-illustration'}={}){
  if(!connected||!ECG_RHYTHMS[nextRhythm]||!Number.isFinite(nowMs)){
   reset();return '';
  }
  const pulse=Number.isFinite(hr)&&hr>0?hr:0;
  const explicitArrest=rhythmSource==='case-rule'&&
   ['asystole','ventricular_fibrillation'].includes(nextRhythm);
  if(!measured&&!explicitArrest){reset();return '';}
  const now=nowMs/1000;
  // Resume/backward clock: do not fill a background gap with fabricated beats.
  if(lastSeconds!==null&&(now<lastSeconds||now-lastSeconds>1.25))reset();
  if(sampleSeconds===null){
   sampleSeconds=now-STEP;lastSeconds=now;
  }
  let steps=0;
  while(sampleSeconds+STEP<=now+1e-9&&steps<200){
   sampleSeconds+=STEP;record(sampleSeconds,pulse,nextRhythm);steps++;
  }
  lastSeconds=now;rhythm=nextRhythm;
  const cutoff=now-windowSeconds;
  while(samples.length&&samples[0].time<cutoff)samples.shift();
  const baseline=height*.65,gain=height*.43,parts=[];
  for(let i=0;i<samples.length;i++){
   const sample=samples[i],x=(sample.time-cutoff)*width/windowSeconds;
   const y=Math.max(2,Math.min(height-2,baseline-sample.value*gain));
   parts.push((i===0?'M':'L')+x.toFixed(1)+' '+y.toFixed(1));
  }
  return parts.join(' ');
 }
 return Object.freeze({update,reset,info});
}
