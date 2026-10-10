// ATRIA experimental SHADOW simulator: never changes a live game patient.
// All coefficients below are GAME calibration candidates, not medical dosing
// instructions or medically validated pharmacodynamic estimates.
// Fixed 1-game-minute transitions make outcomes independent of frame rate.
import {csCasePharmProfile487} from './pharmacology-registry-487.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const round=x=>Math.round(x*1000000)/1000000;
const PK=Object.freeze({
 oxygen:{mechanism:'oxygenation',route:'inhaled',reference:4,max:15,infusion:true},
 fluid:{mechanism:'volume',route:'iv',reference:500,max:2500,infusion:false},
 vasopressor:{mechanism:'vascularTone',route:'iv',reference:.05,max:.3,infusion:true},
 morphine:{mechanism:'opioid',route:'iv',reference:4,max:30,infusion:false},
 furosemide:{mechanism:'diuresis',route:'iv',reference:40,max:200,infusion:false}
});
export const SHADOW_PILOT_DRUGS_487=PK;
const supportedMechanisms=new Set(['oxygenation','volume','vascularTone','opioid','diuresis']);
// A new molecule referencing an already modelled mechanism requires no edits
// to any case. Potency remains an explicit, separately-reviewed parameter.
export function csShadowRegisterDrug487(catalog,item){
 if(!item||typeof item.id!=='string'||!/^[a-z][a-z0-9_]*$/.test(item.id)||
  catalog[item.id]||!supportedMechanisms.has(item.mechanism)||
  !['iv','inhaled'].includes(item.route)||!Number.isFinite(item.reference)||
  item.reference<=0||!Number.isFinite(item.max)||item.max<item.reference||
  typeof item.infusion!=='boolean')
  throw Error('unknown or incomplete shadow mechanism registration');
 return Object.freeze({...catalog,[item.id]:Object.freeze({...item})});
}
const normalizedVitals=c=>{
 const [sys,dia]=String(c?.vitals?.bp||'120/80').split('/').map(Number);
 return {sys:Number(c?.vitals?.sys??sys),dia:Number(c?.vitals?.dia??dia),
  hr:Number(c?.vitals?.hr??90),rr:Number(c?.vitals?.rr??18),spo2:Number(c?.vitals?.spo2??98)};
};
function stateFromTraits(traits){
 const t=new Set(traits);
 const shock=t.has('shock')||t.has('sepsis')||t.has('hypovolemia');
 return {
  volume:t.has('bleed')?.55:t.has('sepsis')?.59:t.has('hypovolemia')?.64:t.has('ascites')?.77:.96,
  vascularTone:t.has('sepsis')?.66:t.has('ascites')?.88:1,
  cardiacOutput:1,
  oxygenReserve:.95,
  renalReserve:t.has('renalRisk')?.65:.91,
  congestion:t.has('ascites')?.80:t.has('congestion')?.75:0,
  pain:t.has('pain')?7:0,
  infection:t.has('infection')?.85:0,
  shock:shock,
  ischemiaRisk:0
 };
}
export function csShadowCreate487(c,{drugs=PK}={}){
 const profile=csCasePharmProfile487(c);
 const base=normalizedVitals(c);
 if(Object.values(base).some(x=>!Number.isFinite(x)))throw Error('case initial vitals invalid');
 const state=stateFromTraits(profile.traits);
 const initial={...state};
 return {
  caseId:c.id,traits:[...profile.traits],drugs,base,initial,state,
  minute:0,remainder:0,
  infusions:{},
  exposure:{pressor:0,oxygen:0,morphine:0,furosemide:0},
  events:[],drugTotals:{},vitals:{...base},adverse:[]
 };
}
export function csShadowAdminister487(patient,id,dose){
 const def=patient.drugs[id];
 if(!def)throw Error('shadow mechanism unvalidated for '+id);
 if(!Number.isFinite(dose)||dose<=0||dose>def.max)throw Error('invalid shadow dose '+id);
 const z=patient.state;
 if(def.mechanism==='volume'){
  const m=dose/500;
  const response=clamp((1.13-z.volume)/.60,.10,1);
  z.volume=clamp(z.volume+.115*m*response,.20,1.3);
  if(z.volume>.99)z.congestion=clamp(z.congestion+.055*m,0,1.3);
 }else if(def.mechanism==='opioid')patient.exposure.morphine+=dose/def.reference;
 else if(def.mechanism==='diuresis')patient.exposure.furosemide+=dose/def.reference;
 else patient.infusions[id]=dose;
 patient.drugTotals[id]=(patient.drugTotals[id]||0)+dose;
 patient.events.push({minute:patient.minute,id,dose,action:'administer'});
 return patient;
}
export function csShadowStop487(patient,id){
 if(!patient.drugs[id]?.infusion)throw Error('only an active infusion/support can be stopped '+id);
 patient.infusions[id]=0;
 patient.events.push({minute:patient.minute,id,action:'stop'});
 return patient;
}
export function csShadowVitals487(p){
 const x=p.state,b=p.base,n=p.initial,e=p.exposure,t=new Set(p.traits);
 const volumeDelta=x.volume-n.volume,vascularDelta=x.vascularTone-n.vascularTone;
 const pressorScale=t.has('sepsis')?1:.7;
 const pulse=clamp(b.hr-volumeDelta*55+Math.max(0,x.infection-n.infection)*12-
   Math.min(8,e.morphine*4),38,190);
 const sys=clamp(b.sys+volumeDelta*80+vascularDelta*45+
  pressorScale*18*e.pressor*(.45+.55*x.volume),50,200);
 const dia=clamp(b.dia+volumeDelta*36+vascularDelta*32+
  pressorScale*10*e.pressor*(.45+.55*x.volume),25,125);
 const morphResp=Math.min(11,e.morphine*2.0);
 const rr=clamp(b.rr+Math.max(0,n.volume-x.volume)*5-morphResp,6,45);
 const oxygenBenefit=Math.min(7,Math.max(0,98-b.spo2))*e.oxygen;
 const hypoventilation=Math.max(0,e.morphine-1.5)*2.2;
 const congestionPenalty=Math.max(0,x.congestion-n.congestion)*7;
 const spo2=clamp(b.spo2+oxygenBenefit-hypoventilation-congestionPenalty,70,100);
 return {sys:round(sys),dia:round(dia),map:round((sys+2*dia)/3),
  hr:round(pulse),rr:round(rr),spo2:round(spo2)};
}
function oneMinute(p){
 const t=new Set(p.traits),x=p.state,e=p.exposure;
 p.minute++;
 // Active inhaled oxygen and continuously infused vasopressor wash in/out.
 let oxTarget=0,pressorTarget=0;
 for(const [id,dose] of Object.entries(p.infusions)){
  const rule=p.drugs[id];
  if(!rule||!(dose>0))continue;
  if(rule.mechanism==='oxygenation')oxTarget+=dose/rule.reference;
  if(rule.mechanism==='vascularTone')pressorTarget+=dose/rule.reference;
 }
 oxTarget=clamp(oxTarget,0,1.15);
 pressorTarget=clamp(pressorTarget,0,2);
 e.oxygen+=(oxTarget-e.oxygen)*.40;
 e.pressor+=(pressorTarget-e.pressor)*.20;
 // Repeated boluses accumulate; they are not permanent status flags.
 e.morphine*=Math.exp(-Math.LN2/150);
 e.furosemide*=Math.exp(-Math.LN2/100);
 // Disease progression persists in absence of source control/hemostasis.
 if(t.has('bleed'))x.volume-=.00075;
 else if(t.has('sepsis')){x.volume-=.00045;x.vascularTone-=.00023;x.infection+=.00008;}
 else if(t.has('hypovolemia'))x.volume-=.00016;
 if(t.has('ascites'))x.congestion+=.00003;
 // Diuretic reduces congestion BUT depletes circulating volume.
 if(e.furosemide>.01){
  const effect=Math.min(3,e.furosemide);
  x.congestion-=.00125*effect;
  x.volume-=.00068*effect;
 }
 // Morphine relieves pain but can suppress respiration and arterial pressure
 // in vulnerable patients. Its respiratory cost is derived from exposure.
 if(e.morphine>.01)x.pain-=.015*Math.min(3,e.morphine);
 x.volume=clamp(x.volume,.20,1.3);
 x.vascularTone=clamp(x.vascularTone,.38,1.3);
 x.congestion=clamp(x.congestion,0,1.3);
 x.pain=clamp(x.pain,0,10);
 x.infection=clamp(x.infection,0,1.3);
 const v=csShadowVitals487(p);
 const damage=v.map<60?.00065:v.map<70?.00020:0;
 x.renalReserve=clamp(x.renalReserve-damage-
  (e.furosemide>.2&&x.volume<.6?.00018*e.furosemide:0),.10,1);
 if(e.pressor>1.5)x.ischemiaRisk=clamp(x.ischemiaRisk+.001*(e.pressor-1.5),0,1);
 p.vitals=csShadowVitals487(p);
}
export function csShadowAdvance487(p,minutes){
 if(!Number.isFinite(minutes)||minutes<0||minutes>10080)throw Error('invalid virtual time');
 // Fixed-step accumulator: 120 calls of 1 minute == one call of 120.
 let total=p.remainder+minutes;
 const count=Math.floor(total+1e-9);
 p.remainder=round(total-count);
 for(let n=0;n<count;n++)oneMinute(p);
 return p;
}
export function csShadowSnapshot487(p){
 return {
  caseId:p.caseId,minute:p.minute,traits:[...p.traits],vitals:{...p.vitals},
  state:{...p.state},infusions:{...p.infusions},
  totalTreatments:p.events.filter(x=>x.action==='administer').length
 };
}
