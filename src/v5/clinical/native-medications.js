// A small validated formulary. Drug identity, dose and preparation are
// shared; disease-specific effects remain solely in native case physiology.
import {HEPARIN_SIM_DOSE_487,csHeparinIssue487} from '../../clinical/urgent-care-487.js';
import {parseMorphineIVDose487} from './morphine-487.js';
import {parseSpecialIVDose487} from './iv-dose-contracts-487.js';
import {CLINICAL_TREATMENTS} from '../content/clinical-treatment-definitions.js';
import {clinicalInterventionEligibility} from './native-medication-eligibility.js';
export const IV_MEDICINES=Object.freeze({
 fluid:Object.freeze({id:'fluid',label:'Cristaloides / reposición de volumen',seconds:.8}),
 terlipressin:Object.freeze({id:'terlipressin',label:'Terlipresina IV',seconds:1.5}),
 methylprednisolone:Object.freeze({id:'methylprednisolone',label:'Metilprednisolona IV',seconds:1.5}),
 ppi:Object.freeze({id:'ppi',label:'Pantoprazol IV',seconds:.8}),
 ceftriaxone:Object.freeze({id:'ceftriaxone',label:'Ceftriaxona IV',seconds:1.5}),
 metronidazole:Object.freeze({id:'metronidazole',label:'Metronidazol IV',seconds:1.5}),
 furosemide:Object.freeze({id:'furosemide',label:'Furosemida IV',seconds:.55}),
 morphine:Object.freeze({id:'morphine',label:'Morfina IV',seconds:.55}),
 albumin:Object.freeze({id:'albumin',label:'Albúmina IV',seconds:.8,unit:'g/kg'}),
 transfusion:Object.freeze({id:'transfusion',label:'Transfusión',seconds:2.6,unit:'unidad'}),
 vasopressor:Object.freeze({id:'vasopressor',label:'Noradrenalina IV',seconds:.8,stopSeconds:1.8,unit:'µg/kg/min',continuous:true}),
 imipenem:Object.freeze({id:'imipenem',label:'Imipenem IV',seconds:1.5}),
 ceftazidime:Object.freeze({id:'ceftazidime',label:'Ceftazidima IV',seconds:.55}),
 cefoperazone:Object.freeze({id:'cefoperazone',label:'Cefoperazona IV',seconds:.55}),
 cefepime:Object.freeze({id:'cefepime',label:'Cefepime IV',seconds:.55}),
 piptazo:Object.freeze({id:'piptazo',label:'Piperacilina/tazobactam IV',seconds:1.5}),
 ampicillin:Object.freeze({id:'ampicillin',label:'Ampicilina IV',seconds:1.5}),
 amikacin:Object.freeze({id:'amikacin',label:'Amikacina IV',seconds:1.5}),
 gentamicin:Object.freeze({id:'gentamicin',label:'Gentamicina IV',seconds:1.5}),
 fluconazole:Object.freeze({id:'fluconazole',label:'Fluconazol IV',seconds:1.5}),
 amphotericin:Object.freeze({id:'amphotericin',label:'Anfotericina B IV',seconds:1.5,unit:'mg/kg',dose:{amount:.7,unit:'mg/kg',display:'0.7 mg/kg'}}),
 anticoagulation:Object.freeze({id:'anticoagulation',label:'Heparina IV',seconds:1.5,dose:HEPARIN_SIM_DOSE_487})
});
export const isStandardIVMedicine=id=>Object.hasOwn(IV_MEDICINES,id);
// Compatibility: the historical IV catalogue and strict parsers remain intact.
// All new route formulations use this same administration owner.
export const NATIVE_MEDICINES=Object.freeze({...IV_MEDICINES,
 ...Object.fromEntries(Object.entries(CLINICAL_TREATMENTS).filter(([,v])=>v.kind==='medication'))});
export const isNativeMedicine=id=>Object.hasOwn(NATIVE_MEDICINES,id);
export function nativeTreatmentDefinition(id,caseData){
 const base=CLINICAL_TREATMENTS[id]||IV_MEDICINES[id];if(!base)return null;
 const override=caseData?.clinicalPolicy?.regimens?.[id];
 const regimen={...(base.regimen||{}),...(override||{})};
 const dose=override?.dose||base.dose;
 const route=override?.route||base.route||'iv';
 return {...base,...override,id,route,regimen,dose,
  requiresAccess:override?.requiresAccess??base.requiresAccess??(route==='iv'),
  seconds:override?.preparationSeconds??base.preparationSeconds??base.seconds,
  ...(override?.dose?{min:override.min??override.dose.amount,max:override.max??override.dose.amount}:{}),
  continuous:base.continuous||regimen.continuous===true||/\/(?:min|h)$/.test(dose?.unit||'')||
   regimen.mode==='infusion'&&!Number.isFinite(regimen.administrationMinutes)};
}
export const nativeMedicineDefinition=(id,caseData)=>isNativeMedicine(id)?nativeTreatmentDefinition(id,caseData):null;
const normalizeDose=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[µμ]/g,'u').replace(/,/g,'.').replace(/[−–—]/g,'-')
 .replace(/\b([iveps])\.\s*([vomcl])\.?/g,'$1$2');
const canonicalUnit=unit=>normalizeDose(unit).replace(/\s+/g,'').replace(/^ug/,'mcg')
 .replace(/^ui/,'iu').replace(/^u(?=\/|$)/,'iu').replace(/^cc$/,'ml')
 .replace(/^(?:unidades?|unidad)$/,'iu').replace(/^(?:litros?|l)$/,'l');
const routePatterns={iv:/\b(?:iv|ev|intravenos[ao]|endovenos[ao]|intravenous)\b/,
 oral:/\b(?:oral|vo|po|enteral|por boca|per os|masticad\w*)\b/,
 inhaled:/\b(?:inhaled|inhalad\w*|inhalatori\w*|nebulizad\w*|nebulizacion)\b/,
 sc:/\b(?:sc|subcutane\w*|subcutaneous)\b/,im:/\b(?:im|intramuscular)\b/};
function validateNativeRoute(raw,route){
 for(const [id,re] of Object.entries(routePatterns))if(id!==route&&re.test(raw))throw Error('unsupported-dose-route');
 if(/\b(?:nasal|sl|sublingual|rectal|pr|ia|intraarterial|intratecal|epidural)\b/.test(raw))throw Error('unsupported-dose-route');
 if(/\bvia\s*$/.test(raw))throw Error('unsupported-dose-route');
}
const hasNumber=raw=>/(?:^|\s)[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?![\w.])/.test(raw);
const units='(?:mcg|ug|mg|g|ml|cc|litros?|l|iu|ui|u|j|lpm|procedimientos?|procedure|exchange|intento|plan)';
const dosePattern=new RegExp('(?:^|\\s)([+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+))\\s*('+units+'(?:\\s*\\/\\s*(?:kg|h|min|hora|minuto)(?:\\s*\\/\\s*(?:min|h|hora|minuto|pbw))?)*(?:\\s+pbw)?)\\b','g');
function parseDefinedDose(def,text,reference){
 if(!Number.isFinite(reference?.amount)||reference.amount<=0||!reference.unit)throw Error('native formulation missing');
 let raw=normalizeDose(text);validateNativeRoute(raw,def.route);
 const timing=[...raw.matchAll(/\b(en|durante|cada)\s*(\d+(?:\.\d+)?)\s*(min(?:utos?)?|h(?:oras?)?)\b/g)];
 for(const [whole,mode,number,unit] of timing){
  const actual=Number(number)*(unit.startsWith('h')?60:1),r=def.regimen||{};
  const expected=mode==='cada'?r.intervalMinutes:r.administrationMinutes??r.infusionMinutes??r.executionMinutes;
  if(!Number.isFinite(expected)||actual!==expected)throw Error('unsupported-administration-timing');
  raw=raw.replace(whole,' ');
 }
 const matches=[...raw.matchAll(dosePattern)];
 if(matches.length>1)throw Error('ambiguous-dose');
 if(!matches.length){
  // Digits inside a molecule alias (MgSO4, 4F-PCC) are not a prescribed dose.
  if(hasNumber(raw)||/\b(?:mg|g|mcg|ug|kg|ml|iu|ui)\b/.test(raw))throw Error('invalid-dose');
  return {...reference,display:reference.display||reference.amount+' '+reference.unit,defaultApplied:true};
 }
 const match=matches[0],rest=raw.slice(0,match.index)+raw.slice(match.index+match[0].length);
 if(hasNumber(rest)||/\b(?:mcg|ug|mg|ml|iu|ui|kg)\b/.test(rest))throw Error('ambiguous-dose-qualifier');
 const wanted=canonicalUnit(reference.unit),given=canonicalUnit(match[2]);
 let factor=1;
 if(given!==wanted){
  const gm=given.match(/^(mcg|mg|g)(.*)$/),wm=wanted.match(/^(mcg|mg|g)(.*)$/);
  if(gm&&wm&&gm[2]===wm[2])factor={mcg:.001,mg:1,g:1000}[gm[1]]/{mcg:.001,mg:1,g:1000}[wm[1]];
  else if(given==='l'&&wanted==='ml')factor=1000;
  else throw Error('unsupported-dose-unit');
 }
 const amount=Number(match[1])*factor,min=def.min??reference.amount,max=def.max??reference.amount;
 if(!Number.isFinite(amount)||amount<=0||amount<min-1e-9||amount>max+1e-9)throw Error('unsupported-dose');
 return {...reference,amount,display:Math.abs(amount-reference.amount)<1e-9&&reference.display?reference.display:amount+' '+reference.unit,defaultApplied:false};
}
/** One pure formulation contract for single orders, batch preflight and bedside execution. */
export function parseNativeMedicineDose(id,text,reference,unfiltered=text,caseData){
 const def=nativeMedicineDefinition(id,caseData);if(!def)throw Error('unknown-native-medicine');
 const override=caseData?.clinicalPolicy?.regimens?.[id];
 if(isStandardIVMedicine(id)&&!override)return parseIVMedicineDose(id,text,reference??def.dose,unfiltered);
 const ref=override?.dose??reference??def.dose;
 // A heparin bolus and its ongoing infusion are distinct dimensional doses.
 if(def.regimen.infusion&&/\/(?:h|hora)\b/.test(normalizeDose(text))){
  const infusion=def.regimen.infusion;
  return parseDefinedDose({...def,min:infusion.min??infusion.amount,max:infusion.max??infusion.amount},text,infusion);
 }
 return parseDefinedDose(def,text,ref);
}
export function parseNativeProcedureDose(id,text,caseData){
 const def=nativeTreatmentDefinition(id,caseData);
 if(!def||!['procedure','conduct'].includes(def.kind))throw Error('unknown-native-procedure');
 return parseDefinedDose(def,text,def.dose);
}
function exposureIssue(p,c,medicine,dose,clock,eventId){
 if(!c?.clinicalPolicy&&!CLINICAL_TREATMENTS[medicine.id])return null;
 const regimen=medicine.regimen;
 const rows=p.administrationLog.filter(t=>t.id===medicine.id&&t.patientUid===p.uid&&t.sourceEventId!==eventId&&t.action!=='stop');
 const pending=p.pendingTreatments.filter(t=>t.id===medicine.id&&t.patientUid===p.uid&&t.sourceEventId!==eventId&&
  !rows.some(r=>r.sourceEventId===t.sourceEventId));
 if(!medicine.continuous){
  if(Number.isFinite(regimen.maximumDoses)&&rows.length+pending.length>=regimen.maximumDoses||
   regimen.mayRepeatOnce&&rows.length+pending.length>=2||regimen.doNotRepeatRoutinely&&(rows.length||pending.length))
   return 'maximum-administrations-exceeded';
  const last=rows.at(-1),interval=regimen.repeatAfterMinutes??regimen.repeatIntervalMinutes??regimen.intervalMinutes;
  if((last&&Number.isFinite(interval)&&clock?.nativeMinute-last.administeredAtNativeMinute<interval-1e-9)||
   pending.length&&Number.isFinite(interval))return 'administration-interval-required';
  if(regimen.maxCumulative&&[...rows,...pending].reduce((n,t)=>{
   const reserved=t.prescribedDose??t.dose;
   return n+(reserved?.unit===dose.unit?reserved.amount:0);
  },dose.amount)>regimen.maxCumulative.amount+1e-9)
   return 'maximum-cumulative-dose-exceeded';
 }
 if(regimen.bands){
  const result=p.orders.filter(t=>t.patientUid===p.uid&&t.status==='done').map(t=>normalizeDose(t.result)).join('\n');
  const inr=Number(result.match(/inr\s*([\d.]+)/)?.[1]);
  const band=regimen.bands.find(b=>(b.inrMin===undefined||inr>=b.inrMin)&&(b.inrMinExclusive===undefined||inr>b.inrMinExclusive)&&
   (b.inrMaxExclusive===undefined||inr<b.inrMaxExclusive)&&(b.inrMaxInclusive===undefined||inr<=b.inrMaxInclusive));
  if(!Number.isFinite(inr)||!band||dose.amount!==band.unitsPerKg)return 'unsupported-INR-dose-band';
 }
 return null;
}
export function preflightNativeMedicine(id,text,{caseData,reference,unfiltered=text,patient,clock,requireAccess=true,eventId}={}){
 const medicine=nativeMedicineDefinition(id,caseData);if(!medicine)throw Error('unknown-native-medicine');
 const dose=parseNativeMedicineDose(id,text,reference,unfiltered,caseData);
 const issue=patient?clinicalInterventionEligibility(patient,caseData,id,clock):null;
 if(issue){const error=Error(issue.reason);error.clinicalMessage=issue.message;throw error;}
 if(patient&&requireAccess&&medicine.requiresAccess&&(patient.venousAccessCount??0)<1)throw Error('venous-access-required');
 const exposure=patient&&exposureIssue(patient,caseData,medicine,dose,clock,eventId);
 if(exposure)throw Error(exposure);
 return {medicine,dose};
}
// One dose dispatcher for compound preflight, physical nursing and execution.
// Morphine has a validated range in the original final wrapper, rather than a
// fixed 4mg reference; medical excess within that range is allowed to execute.
export function parseIVMedicineDose(id,text,reference,unfiltered=text){
 return id==='morphine'?parseMorphineIVDose487(text,reference):
  parseSpecialIVDose487(id,text,reference,unfiltered)||parseStandardIVDose(text,reference);
}
export function parseStandardIVDose(text,reference){
 if(reference===HEPARIN_SIM_DOSE_487){
  const issue=csHeparinIssue487(text);
  if(issue)throw Error('unsupported-heparin-dose-route');
  return {...reference};
 }
 if(!Number.isFinite(reference?.amount)||!['mg','ml'].includes(reference.unit))throw Error('IV formulation missing');
 const raw=String(text||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/,/g,'.');
 if(/\b(oral|po|im|intramuscular|subcutane\w*|sc|nasal)\b/.test(raw))
  throw Error('unsupported-dose-route');
 const matches=[...raw.matchAll(/(?:^|\s)([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(mg|g|ml|cc|litros?|l)\b/g)];
 if(matches.length===0){
  if(/\d|\b(mcg|ug|gramos?|miligramos?|litros?)\b/.test(raw))throw Error('invalid-dose');
  return {...reference,defaultApplied:true};
 }
 if(matches.length!==1)throw Error('ambiguous-dose');
 const chosen=matches[0],rest=raw.slice(0,chosen.index)+raw.slice(chosen.index+chosen[0].length);
 if(/\d|\b(mcg|ug|mg|g|ml|cc|litros?|microgramos?)\b/.test(rest))
  throw Error('ambiguous-dose-qualifier');
 const unit=chosen[2],actual=Number(chosen[1])*(unit==='g'?1000:unit==='l'||unit.startsWith('litro')?1000:1);
 if((reference.unit==='mg'&&!['mg','g'].includes(unit))||
  (reference.unit==='ml'&&!['ml','cc','l','litro','litros'].includes(unit))||
  !Number.isFinite(actual)||
  (reference.unit==='mg'?actual!==reference.amount:
   !(actual>=500&&actual<=40000&&Number.isInteger(actual/500))))
  throw Error('unsupported-dose');
 return {...reference,amount:actual,display:reference.unit==='ml'?
  (actual%1000===0?actual/1000+' l':actual+' ml'):reference.display,
  defaultApplied:false};
}

/** Scheduling and receipts for validated IV medicine: never changes vitals.
 * Calling care.advance() remains the only path to a true administration.
 */
export function createIVAdministration(p,{doses,labels=()=>null,proof,rejected,caseData=null,checkpoint=null}){
 const tasks=new Map(structuredClone(checkpoint?.tasks??[]));
 const copy=x=>structuredClone(x);
 const remove=task=>{tasks.delete(task.sourceEventId);p.pendingTreatments=p.pendingTreatments.filter(x=>x.sourceEventId!==task.sourceEventId);};
 const molecule=id=>nativeMedicineDefinition(id,caseData)?.moleculeId||(id==='vasopressor'?'norepinephrine':id);
 const duration=medicine=>Number.isFinite(medicine.regimen.administrationMinutes)?medicine.regimen.administrationMinutes:
  Number.isFinite(medicine.regimen.infusionMinutes)?(medicine.regimen.bolusMinutes||0)+medicine.regimen.infusionMinutes:0;
 function request(cmd,clock){
  const id=cmd.intent.id;
  const medicine=nativeMedicineDefinition(id,caseData),stop=cmd.intent.kind==='therapy.stop';
  if(!medicine||cmd.intent.kind!=='therapy.request'&&!(stop&&medicine.continuous))return null;
  let dose;
  try{if(!stop)({dose}=preflightNativeMedicine(id,cmd.intent.clause||cmd.intent.sourceText,
   {caseData,reference:doses?.[id]??medicine.dose,unfiltered:cmd.intent.sourceText,patient:p,clock,eventId:cmd.eventId}));}
  catch(error){return rejected(cmd,error.message,error.clinicalMessage||'Dosis, vía o acceso no validado. No administrado.');}
  // A fresh clinical order is another exposure, even to the same drug.
  // Only replay of the SAME eventId may share an execution (room authority
  // already deduplicates transport retries by actor+commandId).
  if(tasks.has(cmd.eventId))return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};
  if(p.administrationLog.some(t=>t.sourceEventId===cmd.eventId))
   return proof(cmd,p.administrationLog.find(t=>t.sourceEventId===cmd.eventId),true);
  const active=medicine.continuous?p.procedures[id]:null;
  if(medicine.continuous){
   const prior=[...tasks.values()].find(t=>t.id===id);
   if(prior){
    if(!stop&&prior.action!=='stop'&&prior.dose.amount===dose.amount){
     prior.commands.push(copy(cmd));return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};
    }
    return rejected(cmd,'infusion-change-pending','Esperar la confirmación del cambio de infusión pendiente.');
   }
   if(stop&&!active?.active)return rejected(cmd,'infusion-not-active','No hay '+medicine.label+' administrada y activa para suspender.');
  }
  if(!stop&&medicine.requiresAccess&&(p.venousAccessCount??0)<1)
   return rejected(cmd,'venous-access-required','Primero confirmar al menos una vía venosa periférica. No administrado.');
  const legacy=isStandardIVMedicine(id)&&!caseData?.clinicalPolicy?.regimens?.[id];
  const task={id,label:stop?(id==='vasopressor'?'Noradrenalina suspendida':medicine.label+' suspendida'):labels(id)||medicine.label,dose,sourceEventId:cmd.eventId,
   actorId:cmd.actorId,patientUid:p.uid,
   ...(!legacy?{route:medicine.route,regimen:copy(medicine.regimen),phase:'preparing',administrationMinutes:duration(medicine)}:{}),
   ...(medicine.continuous?{action:stop?'stop':active?.active?'setRate':'start',
    previousSourceEventId:active?.sourceEventId??null,...(stop?{previousDose:copy(active.dose)}:{})}:{}),
   readyAtRealSecond:clock.clinicalMinute+(stop?medicine.stopSeconds??1.8:medicine.seconds??1.5),commands:[copy(cmd)]};
  tasks.set(cmd.eventId,task);
  p.pendingTreatments.push({id,sourceEventId:task.sourceEventId,patientUid:p.uid,
   ...(task.phase?{dose:copy(dose)}:{}),
   readyAtRealSecond:task.readyAtRealSecond});
  return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};
 }
 function due(before,after){
  for(const t of tasks.values())if(t.phase==='administering'){
   const nativeDelta=after.nativeMinute-before.nativeMinute,realDelta=after.clinicalMinute-before.clinicalMinute;
   t.readyAtRealSecond=nativeDelta>0?before.clinicalMinute+(t.readyAtNativeMinute-before.nativeMinute)*realDelta/nativeDelta:
    after.clinicalMinute+1;
   const pending=p.pendingTreatments.find(x=>x.sourceEventId===t.sourceEventId);
   if(pending)pending.readyAtRealSecond=t.readyAtRealSecond;
  }
  return [...tasks.values()].filter(t=>t.readyAtRealSecond<=after.clinicalMinute+1e-9);
 }
 function advanceDelivery(nativeMinute){
  for(const task of tasks.values())if(task.phase==='administering'){
   const row=p.administrationLog.find(t=>t.sourceEventId===task.sourceEventId);if(!row)throw Error('missing administering receipt');
   const elapsed=Math.max(0,nativeMinute-task.startedAtNativeMinute),r=task.regimen||{};
   const fraction=Number.isFinite(r.infusionMinutes)&&r.bolusFraction>0?
    (elapsed<(r.bolusMinutes||1)?r.bolusFraction*Math.min(1,elapsed/(r.bolusMinutes||1)):
     r.bolusFraction+(1-r.bolusFraction)*Math.min(1,(elapsed-(r.bolusMinutes||1))/r.infusionMinutes)):
    Math.min(1,elapsed/task.administrationMinutes);
   row.deliveryFraction=Math.max(row.deliveryFraction,Math.min(1,fraction));
   row.dose={...copy(task.dose),amount:task.dose.amount*row.deliveryFraction,
    display:task.dose.amount*row.deliveryFraction+' '+task.dose.unit};
  }
 }
 function finish(task,at,nativeMinute){
  if(tasks.get(task.sourceEventId)!==task)throw Error('unknown medicine preparation');
  const medicine=nativeMedicineDefinition(task.id,caseData);
  if(medicine.continuous&&(p.procedures[task.id]?.sourceEventId??null)!==task.previousSourceEventId){
   remove(task);
   return task.commands.map(cmd=>rejected(cmd,'infusion-state-changed','La infusión cambió antes de completar la ejecución. No se aplicó este cambio.'));
  }
  if(task.phase==='administering'){
   if(nativeMinute+1e-9<task.readyAtNativeMinute)throw Error('infusion completion before full administration');
   advanceDelivery(nativeMinute);
   const row=p.administrationLog.find(t=>t.sourceEventId===task.sourceEventId);
   Object.assign(row,{dose:copy(task.dose),deliveryFraction:1,status:'completed',completionStatus:'completed',
    completedAtRealSecond:at,completedAtNativeMinute:nativeMinute});
   p.treatments.push(copy(row));remove(task);
   return task.commands.map(cmd=>proof(cmd,row,cmd.eventId!==task.sourceEventId));
  }
  const issue=task.action!=='stop'&&clinicalInterventionEligibility(p,caseData,task.id,{clinicalMinute:at,nativeMinute});
  if(issue){remove(task);return task.commands.map(cmd=>rejected(cmd,issue.reason,issue.message));}
  const infusionDose=medicine.regimen.infusion&&
   (task.action==='stop'?task.previousDose:task.dose?.unit===medicine.regimen.infusion.unit?task.dose:medicine.regimen.infusion);
  const t={id:task.id,label:task.label,dose:copy(task.dose),sourceEventId:task.sourceEventId,
   actorId:task.actorId,patientUid:p.uid,route:medicine.route,administeredAtRealSecond:at,
   ...(task.action?{action:task.action,moleculeId:molecule(task.id),...(task.action==='stop'?{previousDose:copy(task.previousDose)}:{}),
    ...(infusionDose?{infusionDose:copy(infusionDose)}:{})}:{}),
   ...(task.phase?{regimen:copy(task.regimen)}:{}),
   administeredAtNativeMinute:nativeMinute};
  if(!medicine.continuous&&task.administrationMinutes>0){
   Object.assign(task,{phase:'administering',startedAtNativeMinute:nativeMinute,
    readyAtNativeMinute:nativeMinute+task.administrationMinutes,readyAtRealSecond:at+task.administrationMinutes/.12});
   p.administrationLog.push({...t,dose:{...copy(task.dose),amount:0,display:'0 '+task.dose.unit},
    prescribedDose:copy(task.dose),deliveryFraction:0,status:'administering',completionStatus:'pending'});
   const pending=p.pendingTreatments.find(x=>x.sourceEventId===task.sourceEventId);
   if(pending)Object.assign(pending,{status:'administering',readyAtNativeMinute:task.readyAtNativeMinute,readyAtRealSecond:task.readyAtRealSecond});
   return [];
  }
  if(medicine.continuous)p.procedures[task.id]={patientUid:p.uid,moleculeId:molecule(task.id),route:medicine.route,
   active:task.action!=='stop',dose:task.action==='stop'?null:copy(infusionDose??task.dose),sourceEventId:task.sourceEventId};
  p.treatments.push(t);p.administrationLog.push(copy(t));remove(task);
  return task.commands.map(cmd=>proof(cmd,t,cmd.eventId!==task.sourceEventId));
 }
 return Object.freeze({request,due,finish,advanceDelivery,owns:task=>tasks.get(task.sourceEventId)===task,
  checkpoint:()=>copy({tasks:[...tasks]}),
  dispose(){tasks.clear();}});
}
