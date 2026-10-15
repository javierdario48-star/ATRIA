// Case-specific original APP-001 vitals/doses, characterized from the effective
// 4.8.7 VM in qa/v5/fixtures/app-native-reference.json. Pure simulation only.
const keys=['temp','hr','rr','sys','dia','spo2'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const bounds={temp:[34.5,41],hr:[38,175],rr:[8,42],sys:[55,190],dia:[30,115],spo2:[72,100]};
export const APP_NATIVE_PREPARATION_SECONDS=Object.freeze({
 ceftriaxone:1.5,metronidazole:1.5,fluid:.8
});
export function initialAppVitals(c){
 if(c?.id!=='APP-001')throw Error('native APP model requires APP-001');
 const [sys,dia]=String(c.vitals.bp).split('/').map(Number);
 return {temp:c.vitals.temp,hr:c.vitals.hr,rr:c.vitals.rr,sys,dia,spo2:c.vitals.spo2};
}
export function parseAppDose(text,reference){
 if(!Number.isFinite(reference?.amount)||!['mg','ml'].includes(reference.unit))throw Error('APP default dose missing');
 const raw=String(text||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/,/g,'.');
 if(/\b(oral|po|im|intramuscular|subcutane\w*|sc|nasal)\b/.test(raw))
  throw Error('unsupported-dose-route');
 const matches=[...raw.matchAll(/(?:^|\s)([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(mg|g|ml|cc|l)\b/g)];
 if(matches.length===0){
  if(/\d|\b(mcg|ug|gramos?|miligramos?|litros?)\b/.test(raw))throw Error('invalid-dose');
  return {...reference,defaultApplied:true};
 }
 if(matches.length!==1)throw Error('ambiguous-dose');
 const chosen=matches[0],rest=raw.slice(0,chosen.index)+raw.slice(chosen.index+chosen[0].length);
 if(/\d|\b(mcg|ug|mg|g|ml|cc|litros?|microgramos?)\b/.test(rest))
  throw Error('ambiguous-dose-qualifier');
 const unit=chosen[2],actual=Number(chosen[1])*(unit==='g'?1000:unit==='l'?1000:1);
 if((reference.unit==='mg'&&!['mg','g'].includes(unit))||
  (reference.unit==='ml'&&!['ml','cc','l'].includes(unit))||
  !Number.isFinite(actual)||actual!==reference.amount)
  throw Error('unsupported-dose');
 return {...reference,defaultApplied:false};
}
export function advanceAppVitals(p,c,dt){
 if(!Number.isFinite(dt)||dt<0)throw Error('invalid APP physiology delta');
 if(p.caseEnded)return;
 const target=initialAppVitals(c);
 if(p.treatments?.some(t=>t.id==='fluid')){
  target.sys+=14;target.dia+=7;target.hr-=12;target.rr-=1;
 }
 const steps=Math.floor(dt*60+1e-10),remaining=Math.max(0,dt-steps/60);
 for(const key of keys){
  target[key]=clamp(target[key],...bounds[key]);
  const rate=key==='temp'?.08:.38;
  const blend=1-Math.pow(1-rate/60,steps)*(1-Math.min(1,remaining*rate));
  p.liveVitals[key]+=(target[key]-p.liveVitals[key])*blend;
 }
}
