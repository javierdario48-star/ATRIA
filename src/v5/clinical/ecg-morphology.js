/**
 * Educational ECG morphology catalog. This module is presentation only.
 * The case-specific clinical policy selects rhythm explicitly via patient.ecg.
 * Never infer STEMI, VT, VF or asystole from low blood pressure or heart rate.
 * No clinical authority, heart-rate mutation, or treatment response lives here.
 */
export const ECG_RHYTHMS=Object.freeze({
 sinus:Object.freeze({id:'sinus',label:'Ritmo sinusal simulado',category:'organized',p:true,qrs:'narrow',st:0}),
 sinus_tachycardia:Object.freeze({id:'sinus_tachycardia',label:'Taquicardia sinusal',category:'organized',p:true,qrs:'narrow',st:0}),
 sinus_bradycardia:Object.freeze({id:'sinus_bradycardia',label:'Bradicardia sinusal',category:'organized',p:true,qrs:'narrow',st:0}),
 atrial_fibrillation:Object.freeze({id:'atrial_fibrillation',label:'Fibrilación auricular',category:'irregular',p:false,qrs:'narrow',st:0}),
 ventricular_tachycardia:Object.freeze({id:'ventricular_tachycardia',label:'Taquicardia ventricular',category:'organized',p:false,qrs:'wide',st:0}),
 ventricular_fibrillation:Object.freeze({id:'ventricular_fibrillation',label:'Fibrilación ventricular',category:'chaotic',p:false,qrs:'none',st:0}),
 asystole:Object.freeze({id:'asystole',label:'Asistolia',category:'flat',p:false,qrs:'none',st:0}),
 st_elevation:Object.freeze({id:'st_elevation',label:'Elevación del segmento ST (patrón ilustrativo)',category:'organized',p:true,qrs:'narrow',st:0.24})
});
/** Declarative case ECG seed, intentionally separate from dynamic physiology.
 * Future case rules may update patient.ecg, but the monitor never does so.
 */
export function initialCaseEcg(c){
 if(c?.ecg==null)return null;
 if(typeof c.ecg!=='object'||!ECG_RHYTHMS[c.ecg.rhythm])
  throw Error('invalid case ECG rhythm');
 return {rhythm:c.ecg.rhythm};
}
const gaussian=(x,c,w)=>Math.exp(-.5*((x-c)/w)**2);
const fract=x=>x-Math.floor(x);
const AF_PATTERN=Object.freeze([.7,1.3,.85,1.15,1.4,.65,1.1,.85]);
/** Normalized phase of a single beat, or a deterministic variable-RR sequence. */
export function ecgBeatAt(seconds,hr,rhythm='sinus'){
 if(!Number.isFinite(seconds)||!Number.isFinite(hr)||hr<=0)return null;
 const base=60/hr;
 if(rhythm!=='atrial_fibrillation'){
  const index=Math.floor(seconds/base);
  return {index,phase:fract(seconds/base)};
 }
 const period=AF_PATTERN.reduce((s,v)=>s+v,0)*base;
 const wrap=Math.floor(seconds/period),local=seconds-wrap*period;
 let acc=0;
 for(let i=0;i<AF_PATTERN.length;i++){
  const duration=AF_PATTERN[i]*base;
  if(local<acc+duration||i===AF_PATTERN.length-1)
   return {index:wrap*AF_PATTERN.length+i,phase:Math.max(0,Math.min(1,(local-acc)/duration))};
  acc+=duration;
 }
 return null;
}
export function ecgAmplitude(seconds,{hr=80,rhythm='sinus'}={}){
 if(!ECG_RHYTHMS[rhythm]||!Number.isFinite(seconds))return 0;
 const morph=ECG_RHYTHMS[rhythm];
 if(morph.category!=='flat'&&morph.category!=='chaotic'&&(!Number.isFinite(hr)||hr<=0))return 0;
 if(morph.category==='flat')return 0;
 if(morph.category==='chaotic'){
  // Deterministic coarse waveform, deliberately without identifiable PQRST.
  return .32*Math.sin(seconds*19)+.24*Math.sin(seconds*33.7+.8)+
   .19*Math.sin(seconds*12.2+2.1);
 }
 const point=ecgBeatAt(seconds,hr,rhythm);const t=point.phase;
 if(morph.qrs==='wide')return .72*gaussian(t,.29,.075)-.28*gaussian(t,.41,.08)+.24*gaussian(t,.67,.13);
 let y=0;
 if(morph.p)y+=.13*gaussian(t,.115,.024);
 if(!morph.p)y+=.016*Math.sin(seconds*17.3);
 // A human QRS spans roughly 80–110 ms. Keep peak widths based on
 // physical seconds, not a fixed percentage that shrinks at high HR.
 const qrsWidth=.016*hr/60;
 y-=.16*gaussian(t,.254,qrsWidth);
 y+=1.04*gaussian(t,.285,qrsWidth);
 y-=.29*gaussian(t,.313,qrsWidth);
 y+=.30*gaussian(t,.52,.063);
 if(morph.st)y+=morph.st*(1/(1+Math.exp(-(t-.342)/.008))-1/(1+Math.exp(-(t-.447)/.009)));
 return y;
}
/** Integrated presentation-only beat phase avoids a temporal jump when a treatment
 * changes measured HR. Never changes the clinical heart rate itself.
 */
export function advanceEcgPhase(cycles,dt,hr){
 if(!Number.isFinite(cycles)||!Number.isFinite(dt)||dt<0||!Number.isFinite(hr)||hr<0)throw Error('invalid ECG presentation clock');
 return cycles+dt*hr/60;
}
export function ecgPath({seconds=0,hr=80,rhythm='sinus',width=560,height=76,windowSeconds=4.5,samples=224}={}){
 if(!ECG_RHYTHMS[rhythm]||(!['asystole','ventricular_fibrillation'].includes(rhythm)&&(!Number.isFinite(hr)||hr<=0)))return '';
 const out=[],baseline=height*.65,gain=height*.43;
 for(let i=0;i<=samples;i++){
  const x=i*width/samples,time=seconds-windowSeconds+(x/width)*windowSeconds;
  const y=Math.max(2,Math.min(height-2,baseline-ecgAmplitude(time,{hr,rhythm})*gain));
  out.push((i===0?'M':'L')+x.toFixed(1)+' '+y.toFixed(1));
 }
 return out.join(' ');
}
/** Only case-provided rhythm annotation may activate a pathological pattern. */
export function ecgPresentation(patient){
 const connected=!!patient?.procedures?.monitor?.connected&&!patient.caseEnded;
 const vitals=patient?.lastVitalsKnown?.vitals;
 const hr=vitals&&Number.isFinite(vitals.hr)?vitals.hr:null;
 const explicit=patient?.ecg?.rhythm;
 const rhythm=explicit&&ECG_RHYTHMS[explicit]?explicit:'sinus';
 return Object.freeze({connected,measured:hr!==null,
  hr,rhythm,
  rhythmSource:explicit&&ECG_RHYTHMS[explicit]?'case-rule':'baseline-illustration',
  label:ECG_RHYTHMS[rhythm].label});
}
