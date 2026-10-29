// Receipt adapter to EFFECTIVE V4 adverse-reaction equations. Pure offsets;
// native case physiology remains the only writer. No order or warning is a dose.
import {csSevereDrugReaction487} from '../../clinical/general-therapy-487.js';
import {csHeparinHarm487,csHeparinClinicalRisk487} from '../../clinical/urgent-care-487.js';
import {BASE_CASE_PHARMACOLOGY_487} from '../../clinical/pharmacology-registry-487.js';
import {matchesMedicationAllergy487,matchesMedicationHypersensitivity487} from './medication-safety-487.js';
import {confirmedMorphineResponse487} from './morphine-487.js';
import {confirmedNativeSupportEffects487} from './native-support-487.js';
import {SAFETY_TREATMENTS} from '../content/packs/safety-treatments.js';
import {CLINICAL_TREATMENTS} from '../content/clinical-treatment-definitions.js';
import {isDeliveredClinicalAdministration} from './receipts.js';
const axes=['temp','hr','rr','sys','dia','spo2'];
const zero=()=>Object.fromEntries(axes.map(k=>[k,0]));
const clamp=x=>Math.max(0,Math.min(1,x));
// These coefficients bound an educational off-target response. Each dose is
// normalized only against that molecule's own regimen; U/kg and mg/kg are
// never treated as equivalent exposures or clinical bleeding probabilities.
const antithromboticScale=Object.freeze({heparin_therapeutic:1,enoxaparin:1,
 aspirin:.35,clopidogrel:.4,ticagrelor:.45,alteplase_pe:1.15,alteplase_stroke:1.15});
function confirmedRows(p,atNativeMinute){
 const candidates=(p.administrationLog||[]).filter(row=>row.action!=='stop'&&
  (row.id==='anticoagulation'||row.id==='epi_im'||row.id==='furosemide'||Object.hasOwn(antithromboticScale,row.id)||
   matchesMedicationAllergy487(p,row.id,true)||matchesMedicationHypersensitivity487(p,row.id)));
 if(!candidates.length)return [];
 if(!Number.isFinite(atNativeMinute)||atNativeMinute<0)throw Error('invalid adverse-reaction clock');
 const seen=new Set();
 return candidates.filter(row=>{
  if(row.status==='administering'){
   if(row.dose?.amount===0&&row.deliveryFraction===0)return false;
   if(!isDeliveredClinicalAdministration(p,row,atNativeMinute))
    throw Error('adverse reaction requires unique confirmed patient administration');
   return true;
  }
  const matching=(p.treatments||[]).filter(t=>t.sourceEventId===row.sourceEventId);
  const sameSource=(p.administrationLog||[]).filter(t=>t.sourceEventId===row.sourceEventId);
  const hasRealTime=row.administeredAtRealSecond!==undefined||matching[0]?.administeredAtRealSecond!==undefined;
  if(row.patientUid!==p.uid||typeof row.sourceEventId!=='string'||!row.sourceEventId||
    seen.has(row.sourceEventId)||!Number.isFinite(row.administeredAtNativeMinute)||
    row.administeredAtNativeMinute<0||row.administeredAtNativeMinute>atNativeMinute+1e-9||
    sameSource.length!==1||matching.length!==1||matching[0].id!==row.id||matching[0].patientUid!==p.uid||
    row.status!==undefined&&!['executed','completed','administered','confirmed'].includes(row.status)||
    hasRealTime&&(!Number.isFinite(row.administeredAtRealSecond)||row.administeredAtRealSecond<0||
     row.administeredAtRealSecond!==matching[0].administeredAtRealSecond)||
    matching[0].administeredAtNativeMinute!==row.administeredAtNativeMinute||
    !Number.isFinite(row.dose?.amount)||row.dose.amount<=0||typeof row.dose?.unit!=='string'||
    matching[0].dose?.amount!==row.dose?.amount||matching[0].dose?.unit!==row.dose?.unit||
    matching[0].route!==row.route)
   throw Error('adverse reaction requires unique confirmed patient administration');
  seen.add(row.sourceEventId);return true;
 });
}
function epinephrineRelief(rows,trigger,atNativeMinute){
 const definition=SAFETY_TREATMENTS.epi_im;
 const doses=rows.filter(row=>row.id==='epi_im'&&row.route==='im'&&
  row.dose.amount===definition.dose.amount&&row.dose.unit===definition.dose.unit&&
  row.administeredAtNativeMinute>=trigger.administeredAtNativeMinute);
 // Educational bounded rescue, not measured PK. It modifies only this allergic
 // episode, never the underlying illness or actual vital signs. No change at
 // administration; recovery evolves over minutes and may remain incomplete.
 let remaining=1;
 for(const row of doses){
  const elapsed=atNativeMinute-row.administeredAtNativeMinute;
  const phase=clamp((elapsed-definition.latencyMinutes)/(definition.peakMinutes-definition.latencyMinutes));
  remaining*=1-.8*phase;
 }
 return {relief:Math.min(.95,1-remaining),sourceEventIds:doses.map(row=>row.sourceEventId)};
}
function newAntithromboticBleeding(p,c,rows,atNativeMinute){
 const traits=[...new Set([...(c?.pharmacology?.traits??BASE_CASE_PHARMACOLOGY_487[c?.id]??[]),...(c?.clinicalPolicy?.traits??[])])];
 const active=traits.some(trait=>['bleed','activeBleeding','intracranialBleed','intracranialBleeding','aorticDissection'].includes(trait));
 const caseForRisk={...c,pharmacology:{...c?.pharmacology,traits}};
 const flags={...p.clinicalFlags,...(active?{activeBleeding:true}:{})};
 const risk=csHeparinClinicalRisk487(caseForRisk,{clinicalFlags:flags,phys:p.phys});
 // A drug hazard or an absent indication alone never fabricates hemorrhage.
 // Repeated correctly administered ACS/PE treatment in a low-risk patient is
 // not forced to cause bleeding by the legacy "three exposures" fallback.
 if(risk.level==='low')return [];
 const reactions=[];
 for(const [id,scale] of Object.entries(antithromboticScale)){
  const doses=rows.filter(row=>row.id===id);
  if(!doses.length)continue;
  const definition=CLINICAL_TREATMENTS[id],regimen=c?.clinicalPolicy?.regimens?.[id];
  const reference=regimen?.dose??definition.dose,route=regimen?.route??definition.route;
  for(const row of doses)if(row.route!==route||(row.prescribedDose??row.dose).unit!==reference.unit||
   (row.prescribedDose??row.dose).amount<(regimen?.min??regimen?.dose?.amount??definition.min)||
   (row.prescribedDose??row.dose).amount>(regimen?.max??regimen?.dose?.amount??definition.max))
   throw Error('adverse reaction requires validated antithrombotic dose and route');
  const first=doses.reduce((a,b)=>a.administeredAtNativeMinute<=b.administeredAtNativeMinute?a:b);
  const harm=csHeparinHarm487(caseForRisk,{patientInstance:{uid:p.uid},clinicalFlags:flags,
   phys:p.phys,gameMinute:atNativeMinute,therapyExposure:new Map([['anticoagulation',{count:doses.length}]]),
   csHeparinHarm487:{patientId:p.uid,firstMinute:first.administeredAtNativeMinute}});
  const exposure=Math.max(.25,Math.min(1.5,first.dose.amount/reference.amount));
  const factor=Math.min(1.25,scale*exposure);
  reactions.push({kind:'antithrombotic-bleeding',sourceEventId:first.sourceEventId,
   patientUid:p.uid,drugId:id,label:first.label,severity:Math.min(1,harm.bleedingSeverity*factor),
   offsets:Object.fromEntries(axes.map(key=>[key,harm.offsets[key]*factor])),riskLevel:risk.level});
 }
 return reactions;
}
export function confirmedMedicationHarms487(p,c,atNativeMinute){
 const rows=confirmedRows(p,atNativeMinute),reactions=[];
 for(const row of rows){
  if(matchesMedicationAllergy487(p,row.id,true)){
   const native=csSevereDrugReaction487({patientInstance:{uid:p.uid},
    gameMinute:atNativeMinute,csSevereDrugReaction487:{patientId:p.uid,
     drug:row.id,minute:row.administeredAtNativeMinute}});
   const rescue=epinephrineRelief(rows,row,atNativeMinute),remaining=1-rescue.relief;
   reactions.push({kind:'severe-drug-allergy',sourceEventId:row.sourceEventId,
    patientUid:p.uid,drugId:row.id,label:row.label,...native,
    severity:native.severity*remaining,underlyingSeverity:native.severity,
    offsets:Object.fromEntries(axes.map(key=>[key,native.offsets[key]*remaining])),
    rescueSourceEventIds:rescue.sourceEventIds,
    manifestation:'Compromiso respiratorio y circulatorio por anafilaxia; puede acompañarse de urticaria o angioedema. Adrenalina IM inmediata y soporte ABC.'});
  }else if(matchesMedicationHypersensitivity487(p,row.id)){
   const elapsed=atNativeMinute-row.administeredAtNativeMinute;
   const severity=clamp((elapsed-.25)/5)*clamp((90-elapsed)/30);
   reactions.push({kind:'cutaneous-drug-hypersensitivity',sourceEventId:row.sourceEventId,
    patientUid:p.uid,drugId:row.id,label:row.label,severity,
    offsets:{temp:0,hr:3*severity,rr:.5*severity,sys:0,dia:0,spo2:0},
    manifestation:'Prurito y habones cutáneos leves sin compromiso de vía aérea, respiración ni circulación; retirar el desencadenante y reevaluar por progresión.'});
  }
 }
 // Document an adverse event only after actual pressure decline is observed.
 // This pure evidence projection never applies a second furosemide offset.
 const diuretic=rows.filter(row=>row.id==='furosemide'&&row.route==='iv');
 if(diuretic.length>=3&&p.liveVitals){
  const totalMg=diuretic.reduce((sum,row)=>sum+row.dose.amount,0);
  const first=diuretic.reduce((a,b)=>a.administeredAtNativeMinute<=b.administeredAtNativeMinute?a:b);
  const initialSys=Number(String(c?.vitals?.bp||'').split('/')[0]);
  const drop=initialSys-p.liveVitals.sys;
  if(totalMg>=120&&atNativeMinute-first.administeredAtNativeMinute>=5&&
   Number.isFinite(initialSys)&&drop>=10){
   reactions.push({kind:'diuretic-volume-depletion',sourceEventId:first.sourceEventId,
    patientUid:p.uid,drugId:'furosemide',label:first.label||'Furosemida IV',
    severity:Math.min(1,drop/30),offsets:zero(),
    manifestation:'Hipotensión observada tras diurético IV repetido; reevaluar perfusión, balance y función renal.'});
  }
 }
 // Preserve the original bounded response; no invented linear stacking.
 // A later confirmed dose can trigger a new episode after recovery.
 const severe=reactions.filter(x=>x.kind==='severe-drug-allergy');
 const mild=reactions.filter(x=>x.kind==='cutaneous-drug-hypersensitivity');
 const peak=severe.reduce((best,x)=>x.severity>(best?.severity??0)?x:best,null);
 const cutaneous=mild.reduce((best,x)=>x.severity>(best?.severity??0)?x:best,null);
 const offsets={...(peak?.offsets??cutaneous?.offsets??zero())},legacyBleedingOffsets=zero(),heparin=rows.filter(x=>x.id==='anticoagulation');
 if(heparin.length){
  const first=heparin.reduce((a,b)=>a.administeredAtNativeMinute<=b.administeredAtNativeMinute?a:b);
  const harm=csHeparinHarm487(c,{patientInstance:{uid:p.uid},clinicalFlags:p.clinicalFlags,
   phys:p.phys,gameMinute:atNativeMinute,therapyExposure:new Map([['anticoagulation',{count:heparin.length}]]),
   csHeparinHarm487:{patientId:p.uid,firstMinute:first.administeredAtNativeMinute}});
  for(const key of axes){legacyBleedingOffsets[key]=harm.offsets[key];offsets[key]+=harm.offsets[key];}
  reactions.push({kind:'anticoagulant-bleeding',sourceEventId:first.sourceEventId,
   patientUid:p.uid,drugId:first.id,label:first.label,severity:harm.bleedingSeverity});
 }
 const antithrombotics=newAntithromboticBleeding(p,c,rows,atNativeMinute);
 const bleedingPeak=antithrombotics.reduce((best,x)=>x.severity>(best?.severity??0)?x:best,null);
 // One bounded bleeding envelope rather than additive full-strength shock
 // for each member of an antithrombotic combination.
 if(bleedingPeak)for(const key of axes){
  const existing=legacyBleedingOffsets[key];
  const candidate=bleedingPeak.offsets[key];
  if(key==='hr'||key==='rr')offsets[key]+=Math.max(0,candidate-existing);
  else if(key==='sys'||key==='dia')offsets[key]+=Math.min(0,candidate-existing);
 }
 reactions.push(...antithrombotics);
 return {offsets,reactions};
}
export function applyMedicationHarmTargets487(target,p,c,atNativeMinute){
 const {offsets}=confirmedMedicationHarms487(p,c,atNativeMinute);
 for(const key of axes)target[key]+=offsets[key];
 return target;
}
/** Document only an emerged complication. Resolution preserves history/score.
 * Returns new events for the authoritative global transcript.
 */
export function documentMedicationComplications487(p,c,clock){
 if(p.caseEnded)return [];
 const {reactions}=confirmedMedicationHarms487(p,c,clock.nativeMinute),created=[];
 p.adverseEvents??=[];
 const opioid=confirmedMorphineResponse487(p,c,clock.nativeMinute);
 const previousOpioid=p.adverseEvents.find(x=>x.kind==='opioid-respiratory-depression'&&x.status==='active');
 const observed=opioid?.respiratoryRisk&&
  (opioid.offsets.rr<0&&p.liveVitals.rr<12||opioid.offsets.spo2<0&&p.liveVitals.spo2<94);
 if(observed||previousOpioid){
  // This binary documentation flag is NOT a new toxicity equation. The exact
  // original respiratoryRisk/offsets drive physiology above. Record a clinical
  // complication only once impaired respiration is observed, and retain it
  // through temporary oxygen support until the recovered opioid risk wears off.
  reactions.push({kind:'opioid-respiratory-depression',patientUid:p.uid,drugId:'morphine',
   sourceEventId:previousOpioid?.sourceEventId??opioid.sourceEventId,
   severity:(previousOpioid?opioid?.respiratoryRisk:observed)?1:0});
 }
 const support=confirmedNativeSupportEffects487(p,c,clock.nativeMinute).drugs;
 const albumin=support.albumin;
 const previousAlbumin=p.adverseEvents.find(x=>x.kind==='albumin-respiratory-overload'&&x.status==='active');
 if(previousAlbumin||albumin?.toxicity.spo2<0&&p.liveVitals.spo2<94){
  reactions.push({kind:'albumin-respiratory-overload',patientUid:p.uid,drugId:'albumin',
   sourceEventId:previousAlbumin?.sourceEventId??albumin.sourceEventId,
   severity:albumin?.toxicity.spo2<0?1:0});
 }
 const pressor=support.vasopressor;
 const previousPressor=p.adverseEvents.find(x=>x.kind==='vasopressor-excess-response'&&x.status==='active');
 const [initialSys,initialDia]=String(c.vitals.bp).split('/').map(Number);
 // Document the EXISTING native excess-rate response only after it has
 // emerged in measured pressure. Subtracting the inherited toxic component
 // leaves the ordinary support contribution; no second pressure equation or
 // new dose/death threshold is introduced here.
 const pressorObserved=pressor?.active&&pressor.toxicity.sys>0&&
  (p.liveVitals.sys>initialSys+pressor.offsets.sys-pressor.toxicity.sys||
   p.liveVitals.dia>initialDia+pressor.offsets.dia-pressor.toxicity.dia);
 if(pressorObserved||previousPressor){
  reactions.push({kind:'vasopressor-excess-response',patientUid:p.uid,drugId:'vasopressor',
   sourceEventId:previousPressor?.sourceEventId??pressor.sourceEventId,
   severity:pressor?.active&&pressor.toxicity.sys>0?1:0});
 }
 for(const r of reactions){
  const previous=p.adverseEvents.find(x=>x.kind===r.kind&&x.sourceEventId===r.sourceEventId);
  if(previous){
   previous.peakSeverity=Math.max(previous.peakSeverity,r.severity);
   if(r.severity===0&&clock.nativeMinute>previous.atNativeMinute){
    previous.resolvedAtNativeMinute??=clock.nativeMinute;previous.status='resolved';
   }
   continue;
  }
  if(r.severity<=.18)continue; // effective V4 alert threshold
  const event={kind:r.kind,sourceEventId:r.sourceEventId,patientUid:p.uid,
   drugId:r.drugId,atNativeMinute:clock.nativeMinute,atRealSecond:clock.clinicalMinute,
   peakSeverity:r.severity,status:'active',
   message:r.kind==='vasopressor-excess-response'?
    'Respuesta presora excesiva tras noradrenalina a tasa elevada: aumento de presión observado más allá del soporte habitual. Reevaluar la tasa y la indicación.':r.kind==='albumin-respiratory-overload'?
    'Sobrecarga respiratoria tras dosis repetidas de albúmina: deterioro de la saturación. Reevaluar el soporte y las nuevas administraciones.':
    r.kind==='opioid-respiratory-depression'?
    'Depresión respiratoria tras morfina: deterioro respiratorio observado con exposición opioide activa. Reevaluar y estabilizar.':r.kind==='severe-drug-allergy'?
    'Reacción alérgica grave tras '+r.label+': deterioro respiratorio y hemodinámico. Adrenalina IM inmediata, O2, soporte circulatorio y reevaluación.':r.kind==='cutaneous-drug-hypersensitivity'?
    'Hipersensibilidad cutánea tras '+r.label+': prurito y habones sin compromiso ABC. Retirar el desencadenante y reevaluar.':r.kind==='antithrombotic-bleeding'?
    'Sangrado agravado tras '+r.label+' en un paciente con riesgo hemorrágico documentado: deterioro progresivo de perfusión. Reevaluar, suspender la exposición y tratar el sangrado según su causa.':
    r.kind==='diuretic-volume-depletion'?
    'Hipotensión observada tras dosis repetidas de furosemida IV: posible depleción de volumen y riesgo de lesión renal. Reevaluar perfusión, balance y nuevas dosis.':
    'Sangrado agravado tras heparina: taquicardia e hipotensión por pérdida sanguínea. Priorizar estabilización.'};
  p.adverseEvents.push(event);created.push(structuredClone(event));
 }
 return created;
}
