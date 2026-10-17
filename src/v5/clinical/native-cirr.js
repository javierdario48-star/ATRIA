import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
// Original native CIRR vital model, migrated explicitly from 4.8.6/4.8.7.
// See qa/v5/characterize-cirr-native.mjs. No severity helper or shadow engine.
const keys=['temp','hr','rr','sys','dia','spo2'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function initialCirrVitals(c){
 if(c?.id!=='CIRR-001')throw Error('native CIRR model requires CIRR-001');
 const [sys,dia]=String(c.vitals.bp).split('/').map(Number);
 return {temp:c.vitals.temp,hr:c.vitals.hr,rr:c.vitals.rr,sys,dia,spo2:c.vitals.spo2};
}
export function parseCirrDose(text,reference={amount:100,unit:'mg',display:'100 mg'}){
 const raw=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/,/g,'.');
 if(/\b(iv|ev|im|sc|intraven\w*|endoven\w*|intramuscular|subcutane\w*|nasal)\b/.test(raw))throw Error('unsupported-dose-route');
 const matches=[...raw.matchAll(/(?:^|\s)([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(mg|g)\b/g)];
 if(!matches.length){
  if(/\d|\b(ml|mcg|ug|litros?)\b/.test(raw))throw Error('invalid-dose');
  return {...reference,defaultApplied:true};
 }
 if(matches.length!==1)throw Error('ambiguous-dose');
 const remaining=raw.slice(0,matches[0].index)+raw.slice(matches[0].index+matches[0][0].length);
 if(/\d|\b(?:ml|cc|mcg|ug|mg|g|litros?|microgramos?|miligramos?)\b/.test(remaining))throw Error('ambiguous-dose-qualifier');
 const amount=Number(matches[0][1])*(matches[0][2]==='g'?1000:1);
 // C2 only certifies the original reference regimen. Other explicit regimens
 // await C3 validation; they must never silently become the default dose.
 if(!Number.isFinite(amount)||amount<=0||amount!==reference.amount)throw Error('unsupported-dose');
 return {defaultApplied:false,amount,unit:'mg',display:amount>=1000?amount/1000+' g':amount+' mg'};
}
export function advanceCirrVitals(p,c,dt){
 if(!Number.isFinite(dt)||dt<0)throw Error('invalid physiology delta');
 if(p.caseEnded)return;
 const target=initialCirrVitals(c),active=new Set(p.treatments.map(t=>t.id));
 // Native spironolactone/sodium restriction effects are empty. CIRR has no
 // peritonitis engine, shock progression or modeled ascites/diuresis kinetics.
 if(active.has('paracentesis_ter')){target.hr-=3;target.rr-=2;}
 // No unsupported positive Ringer blood-pressure response in stable CIRR.
 // Respiratory fluid overload is independently evidenced by repeated dosing.
 const overload=crystalloidOverloadOffsets(p,c);
 target.rr+=overload.rr;target.spo2+=overload.spo2;
 const bounds={temp:[34.5,41],hr:[38,175],rr:[8,42],sys:[55,190],dia:[30,115],spo2:[72,100]};
 // Exact closed form of repeated native 1/60-second Euler smoothing for a
 // constant target, plus its fractional final step. No unbounded catch-up loop.
 const steps=Math.floor(dt*60+1e-10),remaining=Math.max(0,dt-steps/60);
 for(const key of keys){target[key]=clamp(target[key],...bounds[key]);const rate=key==='temp'?.08:.38;
  const blend=1-Math.pow(1-rate/60,steps)*(1-Math.min(1,remaining*rate));
  p.liveVitals[key]+=(target[key]-p.liveVitals[key])*blend;}
}
