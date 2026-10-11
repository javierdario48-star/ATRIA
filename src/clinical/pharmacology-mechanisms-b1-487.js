/** Exact B1 extraction, not new calibration or a clinical approval. */
import {freezePharmacology487} from './pharmacology-mechanisms-487.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),LN2=Math.log(2);
const base=(id,input,requires,reads,writes,order,handlers,extra={})=>({id,version:1,input,requires,reads,writes,order,handlers,
 dependencies:[],parameters:input==='exposure'?{gain:{min:0,max:100,default:1}}:{},
 kineticKinds:input==='exposure'?['bolus','infusion']:input==='support'?['support']:['physical-volume'],
 doseUnits:input==='exposure'?['mg','mcg','mcg/kg/min','mg/min','mg/kg']:input==='support'?['L/min']:['ml'],riskCodes:[],
 evidence:{source:'qa/ATRIA_487_PHYSIOLOGY_PILOT_EVIDENCE.md',calibration:'preserved-b1-estimates'},
 behavioralTests:['src/clinical/physiology-pilot-487.test.js','src/clinical/pharmacology-extensibility-487.test.js'],...extra});
export const B1_MECHANISMS_487=freezePharmacology487([
 base('volume','receipt',['circulatingVolumeMl','interstitialFluidMl','administeredFluidMl'],
  ['circulatingVolumeMl','interstitialFluidMl','administeredFluidMl'],['circulatingVolumeMl','interstitialFluidMl','administeredFluidMl'],0,{
   receipt:(s,_,{amount,parameters:p})=>({updates:{circulatingVolumeMl:s.circulatingVolumeMl+amount*p.intravascularFraction,
    interstitialFluidMl:s.interstitialFluidMl+amount*(1-p.intravascularFraction),administeredFluidMl:s.administeredFluidMl+amount}})
  },{parameters:{intravascularFraction:{min:1e-9,max:1,default:.25}}}),
 base('pressor','exposure',['vascularTone','pumpFunction','perfusion','ischemiaRisk'],['vascularTone'],['vascularTone','ischemiaRisk'],10,{
  preCirculation:(s,p)=>{const risk=clamp(Math.max(0,p-3)/5,0,1);return {updates:{vascularTone:s.vascularTone*(1+p**2/(1+p**2)),ischemiaRisk:risk},
   risks:risk>.05?['pressor-excess']:[]};}
 },{riskCodes:['pressor-excess']}),
 base('opioid-respiratory','exposure',['respiratoryDepression','sedation'],[],['respiratoryDepression','sedation'],20,{
  preCirculation:(_,p)=>{const depression=clamp(.12*p+.08*p**2/(1+p),0,.98);return {updates:{respiratoryDepression:depression,sedation:.6*p/(1+p)},
   risks:depression>.3?['opioid-respiratory-depression']:[]};}
 },{riskCodes:['opioid-respiratory-depression']}),
 base('opioid-analgesia','exposure',['pain'],['pain'],['pain'],21,{
  preCirculation:(s,p)=>({updates:{pain:s.pain*(1-.8*p/(.4+p))}})
 }),
 base('opioid-circulation','exposure',['vascularTone','pumpFunction'],['vascularTone','pumpFunction'],['vascularTone','pumpFunction'],30,{
  preCirculation:(s,p)=>{const strength=p/(.4+p);return {updates:{vascularTone:s.vascularTone*(1-.16*strength),pumpFunction:s.pumpFunction*(1-.05*strength)}};}
 }),
 base('oxygenation','support',['gasExchangeImpairment','oxygenSupport','oxygenFlowLpm','oxygenResponseHalfLifeMin'],
  ['oxygenSupport','oxygenFlowLpm','oxygenResponseHalfLifeMin'],['oxygenSupport','oxygenFlowLpm','oxygenResponseHalfLifeMin'],40,{
   receipt:(_,__,{action,amount,kinetics:k})=>({updates:{oxygenFlowLpm:action==='stop'?0:amount,oxygenResponseHalfLifeMin:k.responseHalfLifeMin}}),
   postCirculation:(s,_,{dt})=>{const target=s.oxygenFlowLpm/(s.oxygenFlowLpm+2);
    return {updates:{oxygenSupport:s.oxygenSupport||s.oxygenFlowLpm?
     target+(s.oxygenSupport-target)*Math.exp(-LN2*dt/s.oxygenResponseHalfLifeMin):0}};}
  }),
 base('diuretic','exposure',['circulatingVolumeMl','interstitialFluidMl','renalFunction','perfusion','drugDiuresisMlPerMin','cumulativeUrineMl'],
  ['circulatingVolumeMl','renalFunction','perfusion','cumulativeUrineMl'],['circulatingVolumeMl','drugDiuresisMlPerMin','cumulativeUrineMl'],50,{
   postCirculation:(s,d,{dt})=>{const rate=8*d**2/(.35**2+d**2)*s.renalFunction**1.5*clamp(s.perfusion/.8,0,1);
    const urine=Math.min(Math.max(0,s.circulatingVolumeMl-500),rate*dt);
    return {updates:{drugDiuresisMlPerMin:rate,circulatingVolumeMl:s.circulatingVolumeMl-urine,cumulativeUrineMl:s.cumulativeUrineMl+urine}};},
   postNatural:(s,d)=>({updates:{},risks:d>.05&&s.perfusion<.6?['diuretic-hypoperfusion']:[]})
  },{riskCodes:['diuretic-hypoperfusion']})
]);
