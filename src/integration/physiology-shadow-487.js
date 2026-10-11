/** QA-only, read-only observer. No browser installation, closures over sim,
 * native function wrapping, Date.now, writes to patients, or global catalogue. */
import {createPhysiologyState487,stepPhysiology487,observePhysiology487} from '../clinical/physiology-pilot-487.js';
import {createPilotProfile487} from '../clinical/physiology-pilot-cases-487.js';
import {PILOT_DEFINITIONS_487} from '../clinical/physiology-pilot-definitions-487.js';

const unit=x=>String(x||'').replace(/[µμ]/g,'mc').replace(/^ug/,'mcg');
const nonnegative=(x,name)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<0)throw Error('invalid '+name);return x;};
const patientId=p=>p?.patientInstance?.uid;
function clockDefinition(clock){
 if(clock?.mode==='clinical')return Object.freeze({mode:'clinical'});
 if(clock?.mode==='native-no-typing'&&clock.nativeMinutesPerClinicalMinute===.12)
  return Object.freeze({...clock});
 throw Error('explicit supported shadow clock required');
}
export function createPhysiologyShadow487(caseDef,initialPatient,{clock,definitions=PILOT_DEFINITIONS_487}={}){
 const mapping=clockDefinition(clock),id=patientId(initialPatient);
 if(!id)throw Error('initial patient identity required');
 if(initialPatient.gameMinute!==0||initialPatient.administrationLog?.length)
  throw Error('shadow requires initial untreated history or an explicit versioned replay checkpoint');
 return {modelVersion:definitions.modelVersion,patientId:id,clock:mapping,definitions,
  state:createPhysiologyState487(createPilotProfile487(caseDef,initialPatient),id),
  legacyCounts:Object.create(null),issues:[],samples:[]};
}
function clinicalTime(shadow,patient,options){
 if(shadow.clock.mode==='clinical')return nonnegative(options.atClinicalMinute,'clinical clock');
 if(options.typing!==false)throw Error('typing requires a piecewise clock map; native-no-typing must be explicit');
 return nonnegative(patient.gameMinute,'native clock')/shadow.clock.nativeMinutesPerClinicalMinute;
}
function legacyDose(row,d){
 // Do not copy dose from monitorTherapies: it is the LATEST dose, not history.
 const match=String(row.doseDisplay||'').match(/^(\d+(?:\.\d+)?)\s*(L\/min|ml|mg|(?:mcg|µg|μg|ug)\/kg\/min)$/);
 if(!match||unit(match[2])!==unit(d.unit))throw Error('missing/invalid historical dose unit '+row.id);
 return {amount:Number(match[1]),unit:unit(match[2])};
}
function readEvents(shadow,patient){
 if(!Array.isArray(patient.administrationLog)||patient.administrationLog.length>2048)
  throw Error('missing or excessive administration history');
 const counts=Object.assign(Object.create(null),shadow.legacyCounts),events=[],issues=shadow.issues.slice();
 for(const row of patient.administrationLog){
  if(row?.status&&row.status!=='administered')continue;
  const id=row.drugId??row.id,d=shadow.definitions.drugs.get(id);
  if(!d){
   if(!issues.some(x=>x.drugId===id&&x.code==='unsupported-by-pilot'))
    issues.push({code:'unsupported-by-pilot',drugId:id});
   continue;
  }
  if(row.eventId){events.push({...row});continue;} // kernel validates typed receipts
  if(shadow.clock.mode!=='native-no-typing')throw Error('legacy history requires native clock mapping');
  if(!Number.isInteger(row.count)||row.count<1)throw Error('missing historical administration count '+id);
  const previous=counts[id]||0;
  if(row.count>previous+1)throw Error('incomplete administration history for '+id+'; replay required');
  counts[id]=Math.max(previous,row.count);
  events.push({eventId:shadow.patientId+':native:'+id+':'+row.count,patientId:shadow.patientId,
   drugId:id,status:'administered',action:d.kinetics.kind==='support'||d.kinetics.kind==='infusion'?'setRate':'bolus',
   route:row.route??d.route,dose:legacyDose(row,d),
   atClinicalMinute:nonnegative(row.m,'administration clock')/shadow.clock.nativeMinutesPerClinicalMinute,
   sequence:row.sequence??0});
 }
 if(issues.length>64)throw Error('shadow issue limit requires checkpoint');
 return {events,counts,issues};
}
export function samplePhysiologyShadow487(shadow,patient,options={}){
 if(patientId(patient)!==shadow.patientId)throw Error('shadow patient mismatch');
 const at=clinicalTime(shadow,patient,options),delta=at-(shadow.state.requestedUs+shadow.state.requestedRemainderUs)/60000000;
 if(delta< -1e-8)throw Error('shadow clock reversed; replay required');
 const {events,counts,issues}=readEvents(shadow,patient);
 const state=stepPhysiology487(shadow.state,events,Math.max(0,delta),shadow.definitions);
 const experimental=observePhysiology487(state),native={...patient.liveVitals};
 for(const key of ['sys','dia','hr','rr','spo2','temp'])nonnegative(native[key],'native vital '+key);
 native.map=(native.sys+2*native.dia)/3;
 const differences=Object.fromEntries(['sys','dia','map','hr','rr','spo2','temp'].map(key=>[key,experimental[key]-native[key]]));
 // Old HDA/CIRR have no explicit latent physiology. A null comparison remains
 // null; this adapter does not fabricate native volume/perfusion observations.
 const sample={requestedClinicalMinute:at,integratedClinicalMinute:state.clinicalMinute,
  native,experimental,delta:differences,nativePhysiology:patient.phys?structuredClone(patient.phys):null,
  exposureIds:Object.keys(state.exposures),adverseEvents:state.adverseEvents.map(x=>({...x}))};
 return {...shadow,state,legacyCounts:counts,issues,samples:[...shadow.samples.slice(-255),sample]};
}
