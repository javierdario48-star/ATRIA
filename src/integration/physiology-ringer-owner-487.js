/** QA-only admission lease: reuse the registered B1 volume RECEIPT, not its
 * natural-disease step. Native progression and clinical policy retain ownership.
 * The native executor explicitly chooses Ringer/IV/bolus before recording it;
 * CP1 receipts and old administrations are never upgraded or replayed by guess. */
import {PILOT_DEFINITIONS_487} from '../clinical/physiology-pilot-definitions-487.js';
import {createPilotProfile487} from '../clinical/physiology-pilot-cases-487.js';
import {pilotFluidOverloadRisk487,pilotFluidRespiratorySigns487} from '../clinical/physiology-pilot-487.js';
import {evaluateMechanism487} from '../clinical/pharmacology-mechanisms-487.js';
import {createClinicalClock487,advanceClinicalClock487} from '../clinical/clinical-clock-487.js';
import {adaptConfirmedPharmacologyEvents487} from './pharmacology-receipts-487.js';
import {pharmacologyRouteConflict487} from './physiology-qa-observer-487.js';

export function installRingerPhysiologyQA487(port){
 const admission=port.read(),patient=admission.patient,caseDef=admission.caseDef;
 if(caseDef?.id!=='PERI-SEC-001'||!['solo','apprentice'].includes(admission.mode)||admission.hidden||admission.shiftActive||
  !patient?.phys||patient.caseEnded||patient.patientDied||Number(patient.gameMinute)!==0||patient.administrationLog?.length||
  patient.pendingTherapies?.size||patient.monitorTherapies?.size||patient.interventions?.size||patient.therapyExposure?.size||
  patient.csPhase4Pending487?.length||patient.csNurse487History?.length||admission.nursingBusy||
  patient.csRinger487)throw Error('Ringer QA requires a fresh untreated local PERI-SEC admission outside an active ward');
 const patientId=patient.patientInstance?.uid,caseId=caseDef.id,physiologyDefinition=JSON.stringify(caseDef.physiology);
 if(typeof patientId!=='string'||!patientId||patientId.length>160)throw Error('Ringer patient identity required');
 const definition=PILOT_DEFINITIONS_487.drugs.get('fluid'),binding=definition.bindings.find(x=>x.mechanismId==='volume');
 if(!binding||definition.route!=='iv'||definition.actions.join()!=='bolus')throw Error('validated B1 IV fluid bolus required');
 const originals={},hooks={},access={Nursing:'nursing',Delivery:'delivery',Administration:'record',Immediate:'immediate',Physiology:'physiology',Progression:'progression'};
 if(typeof port.resolveDelivery!=='function'||typeof port.rejectDelivery!=='function'||typeof port.parseNursing!=='function')throw Error('Ringer requires pre-parser and pre-delivery contract gates');
 for(const key of Object.keys(access)){
  const fn=port['get'+key]?.();if(typeof fn!=='function'||typeof port['set'+key]!=='function')throw Error('missing Ringer port '+key);
  originals[key]=fn;
 }
 const profile=createPilotProfile487(caseDef,patient),capsule={schemaVersion:1,owner:'b1-volume-v1',patientId,caseId:caseDef.id,
  definitionFingerprint:definition.fingerprint,formulationVersion:definition.definitionVersion,
  state:{circulatingVolumeMl:profile.circulatingVolumeMl,interstitialFluidMl:profile.interstitialFluidMl,
   administeredFluidMl:0,fluidOverloadRisk:0,profile},applications:0,seen:{},status:'active'};
 let clock=createClinicalClock487({authorityId:'ringer:'+patientId}),pending=null,lastNative=0,active=true,blockedReason=null,clockFault=null;
 // Ownership is pinned independently of admission eligibility. An invalid
 // context must refuse new deliveries, never silently reactivate old writers.
 const owns=p=>active&&p===patient;
 function contextError(){
  if(clockFault)return clockFault;
  const current=port.read();
  // Native admission clones encounter demographics; its completion binder
  // temporarily selects the canonical catalogue case. Both represent the same
  // physiological definition. Do not confuse this binding with owner migration.
  if(current.patient!==patient||current.caseDef?.id!==caseId||JSON.stringify(current.caseDef?.physiology)!==physiologyDefinition||
   patient.patientInstance?.uid!==patientId||patient.csRinger487!==capsule)
   return 'Ringer QA patient identity/context changed; finish this admission without migration';
  if(!['solo','apprentice'].includes(current.mode)||current.hidden||current.shiftActive)
   return 'Ringer QA context is no longer a visible local admission';
  if(Object.keys(access).some(key=>port['get'+key]()!==hooks[key]))return 'Ringer QA endpoint ownership changed; no new administration';
  return null;
 }
 function sync(){
  if(port.read().patient!==patient)return;
  const now=Number(patient.gameMinute),delta=now-lastNative;
  if(!Number.isFinite(delta)||delta<-1e-8)clockFault='Ringer clinical clock discontinuity; no new doses without replay';
  if(delta>1e-10&&!clockFault){
   const rate=port.read().nativeRate;
   try{clock=advanceClinicalClock487(clock,{deltaRealSeconds:delta/rate,nativeMinutesPerRealSecond:rate});lastNative=now;}
   catch(error){clockFault='Ringer clinical clock: '+String(error.message||error);}
  }
  if(clockFault)blockedReason=clockFault;
  capsule.state.circulatingVolumeMl=patient.phys.effectiveVolume*profile.euvolemicVolumeMl;
  capsule.state.fluidOverloadRisk=capsule.state.administeredFluidMl?pilotFluidOverloadRisk487(capsule.state):0;
 }
 function qualificationError(t){
  // This fixed formulation is an execution policy, not an inference from an
  // old row. All omitted routes choose its IV default, including native rescue.
  // The retained raw order must not explicitly request an incompatible route.
  const raw=String(t.raw||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  // This executor supports a completed bolus only. An explicit duration or
  // repetition interval cannot be silently reduced by the native parser to one.
  const timed=/\b(?:cada|durante|lentamente|segundos?|segs?|minutos?|mins?|horas?|hrs?|dias?)\b|\d\s*(?:s|min|h)\b/.test(raw);
  if(!/\bringer\b/.test(raw)||pharmacologyRouteConflict487(raw,'iv')||/\b(?:nacl|cloruro|salin\w*|fisiologic\w*)\b/.test(raw)||
   timed||
   /\b(?:suspend\w*|deten\w*|paus\w*|retir\w*|interrump\w*|titul\w*|ajust\w*|infu\w*|perfusi\w*|goteo)\b|(?:\/|\bpor\b|\bcada\b)\s*(?:h\b|hr\b|hora\w*|min\w*)|-\s*\d/.test(raw)||
   !Number.isFinite(t.dose?.amount)||t.dose.amount<=0||t.dose.amount>1e6||t.dose.unit!=='ml')
   return 'En esta prueba se administra Ringer IV en bolos con dosis positiva en ml; otras formulaciones, infusiones, titulación y suspensión del bolo requieren un contrato diferente.';
  if(capsule.applications>=2048)return 'Ringer receipt limit requires a new admission';
  return null;
 }
 function contractError(t){return qualificationError(t)||(Number(patient.venousAccessCount)<=0?'Ringer IV requiere acceso venoso confirmado.':null);}
 hooks.Nursing=function(text){
  const context=port.read();
  if(owns(context.patient,context.caseDef)){
   const parsed=port.parseNursing(text),fluids=parsed.active?parsed.items.filter(x=>x.kind==='therapy'&&x.id==='fluid'&&!x.negated):[];
   for(const item of fluids){
    // Existing scanner supplies identity. Inspect the ORIGINAL named clause
    // before a separate 'vía' item can discard an unknown route qualifier.
    const raw=String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/(\d),(\d)/g,'$1.$2');
    const start=raw.indexOf('ringer'),clause=start<0?item.text:raw.slice(start).split(/[,;]|\s+(?:y|e|ademas|luego|despues)\s+/)[0];
    const t=port.resolveDelivery(clause),reason=contextError()||qualificationError(t||{raw:clause});
    if(reason){blockedReason=reason;port.rejectDelivery(reason);return false;}
   }
  }
  return originals.Nursing.apply(this,arguments);
 };
 hooks.Delivery=function(text){
  const context=port.read();
  if(owns(context.patient,context.caseDef)){
   const t=port.resolveDelivery(text);
   if(t?.id==='fluid'){
    const reason=contextError()||contractError(t);if(reason){blockedReason=reason;port.rejectDelivery(reason);return false;}
   }
  }
  return originals.Delivery.apply(this,arguments);
 };
 function executorContract(t){
  const reason=contextError()||contractError(t);if(reason)throw Error(reason);
  sync();
  if(clockFault)throw Error(clockFault);
  const sequence=Number(patient.therapyExposure?.get('fluid')?.count||0)+1,eventId=patientId+':ringer:'+sequence;
  return {schemaVersion:2,eventId,patientId,treatmentId:'fluid',eventType:'administration',action:'bolus',status:'administered',sequence,
   route:'iv',dose:{amount:t.dose.amount,unit:'ml'},formulation:{id:definition.id,moleculeId:definition.moleculeId,
    definitionVersion:definition.definitionVersion,fingerprint:definition.fingerprint},episodeId:eventId,previousEventId:null,
   timestamp:{authorityId:clock.authorityId,unit:'clinical-minute',value:clock.clinicalMinute},
   verification:{source:'native-administration-log',receiptId:eventId+':completed'}};
 }
 hooks.Administration=function(t){
  const context=port.read();if(!owns(context.patient,context.caseDef)||t?.id!=='fluid')return originals.Administration.apply(this,arguments);
  const receipt=executorContract(t);
  // Select the fixed QA formulation prospectively at execution. Only after
  // native completion is its row admitted as an administered V2 event.
  t.execution487={route:receipt.route,action:receipt.action,formulation:structuredClone(receipt.formulation),selection:'named-Ringer-native-IV-bolus'};
  const result=originals.Administration.apply(this,arguments),row=patient.administrationLog.at(-1);
  if(row?.id!=='fluid'||row.count!==receipt.sequence||row.m!==patient.gameMinute||row.doseDisplay!==t.dose.display)
   throw Error('Ringer native administration completion did not match its executor');
  const confirmation={...structuredClone(receipt),source:'native-administration-log',receiptId:receipt.verification.receiptId};
  delete confirmation.verification;
  const event=adaptConfirmedPharmacologyEvents487([receipt],{patientId,clock,definitions:PILOT_DEFINITIONS_487,confirmations:[confirmation]}).events[0];
  row.pharmacology487={...receipt,executionEvidence:'fixed-Ringer-IV-bolus-executor-with-native-ledger-completion'};
  pending={event,row};return result;
 };
 function applyRingerReceipt487(t){
  const row=patient.administrationLog.at(-1),receipt=row?.pharmacology487;
  if(!receipt||receipt.patientId!==patientId||receipt.dose.amount!==t.dose?.amount)throw Error('Ringer effect requires its completed execution receipt');
  if(Object.hasOwn(capsule.seen,receipt.eventId))return;
  if(pending?.row!==row||pending.event.eventId!==receipt.eventId)throw Error('unobserved Ringer delivery requires replay');
  sync();const before=capsule.state.circulatingVolumeMl;
  evaluateMechanism487(capsule.state,PILOT_DEFINITIONS_487.mechanisms.get('volume'),'receipt',0,
   {amount:pending.event.dose.amount,action:'bolus',parameters:binding.parameters,kinetics:definition.kinetics,note:()=>{}});
  patient.phys.effectiveVolume+=(capsule.state.circulatingVolumeMl-before)/profile.euvolemicVolumeMl;
  capsule.seen[receipt.eventId]=true;capsule.applications++;pending=null;sync();
 }
 hooks.Immediate=function(t){
  const context=port.read();if(!owns(context.patient,context.caseDef)||t?.id!=='fluid')return originals.Immediate.apply(this,arguments);
  // Entire old fluid/V3 call is bypassed. Other drugs use their original chain.
  return applyRingerReceipt487(t);
 };
 hooks.Physiology=function(){const out=originals.Physiology.apply(this,arguments);if(owns(port.read().patient,port.read().caseDef))sync();return out;};
 hooks.Progression=function(){
  const out=originals.Progression.apply(this,arguments);
  if(owns(port.read().patient,port.read().caseDef)){
   sync();const signs=pilotFluidRespiratorySigns487(capsule.state.fluidOverloadRisk);out.rr+=signs.rr;out.spo2+=signs.spo2;
  }return out;
 };
 patient.csRinger487=capsule;
 for(const key of Object.keys(access))port['set'+key](hooks[key]);
 return Object.freeze({owns,
  completionAllowed(p,caseId){
   if(!active||p!==patient)return true;
   const reason=caseId!==capsule.caseId?'Ringer QA completion case identity changed':contextError();
   if(reason){blockedReason=reason;return false;}return true;
  },
  report:()=>structuredClone({status:capsule.status,blockedReason,owner:capsule.owner,patientId,applications:capsule.applications,state:capsule.state,
   definitionFingerprint:capsule.definitionFingerprint,clock,shadowOnly:false,scope:'receipt-volume-and-overload-only; native disease retained'}),
  rollback(){
   if(!patient.caseEnded&&!patient.patientDied&&(Number(patient.gameMinute)>0||capsule.applications||patient.administrationLog.length||patient.pendingTherapies?.size))return {status:'blocked-active-patient',reason:'owner is pinned until patient end; no mid-guard migration/replay'};
   for(const key of Object.keys(access))if(port['get'+key]()===hooks[key])port['set'+key](originals[key]);
   if(Number(patient.gameMinute)===0&&!patient.administrationLog.length)delete patient.csRinger487;
   active=false;capsule.status='disabled';return {status:'disabled'};
  }
 });
}
