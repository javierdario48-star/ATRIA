import {CLINICAL_CONTROLS,DESTINATION_LABELS} from '../content/clinical-controls.js';
import {EXAM_REGIONS,examinationRegionCommands} from './exam-contract.js';
import {nativeTreatmentDefinition,isNativeMedicine,preflightNativeMedicine} from './native-medications.js';
import {GASTRO_CONDUCT_DOSES} from './gastro-medication-rules.js';
import {routeWardSpeech} from '../core/speech-router.js';
import {requiredStudySeries} from './study-evidence.js';
import {studyOrderLabel} from './study-order-vocabulary.js';

export function clinicalActionDescriptor(kind,id,{caseData,content,patient,clock}={}){
 const base={kind,id,section:kind,label:'',command:null};
 if(kind==='vitals')return {...base,id:'vitals',section:'treatment',label:CLINICAL_CONTROLS.measure,command:'/signos',
  text:'Dile a Enfermería: «signos vitales».'};
 if(kind==='reassess')return {...base,id:'reassess',section:'patient',label:CLINICAL_CONTROLS.reassess,command:'/reevaluar',
  text:'Escribe «/reevaluar» en el chat para reevaluar al paciente.'};
 if(kind==='diagnosis')return {...base,id:'diagnosis',section:'diagnosis',label:CLINICAL_CONTROLS.diagnosis,
  text:'Abre «'+CLINICAL_CONTROLS.diagnosis+'» y registra tu hipótesis.'};
 if(kind==='history'){
  const topic=id?.replace(/^anamnesis:/,'')||'allergies';
  const aliases=caseData.intents.find(i=>i.id===topic)?.keys||[];
  const command=topic==='allergies'?'¿Tiene alergias a medicamentos?':
   topic==='onset'&&aliases.includes('inicio')?'¿A qué hora fue el inicio?':aliases[0]?'¿'+aliases[0]+'?':null;
  if(!command)return null;
  return {...base,id:topic,section:'talk',label:CLINICAL_CONTROLS.talk,command,
   text:'Abre «'+CLINICAL_CONTROLS.talk+'» y pregunta «'+command+'».'};
 }
 if(kind==='examination'){
  const region=id?.split(':')[0]?.replace(/^(?:heart|lungs)$/,'thorax')||'abdomen';
  const definition=EXAM_REGIONS[region];if(!definition)return null;
  return {...base,id:region,section:'examination',label:definition.label,commands:examinationRegionCommands(region),
   text:'Abre «'+CLINICAL_CONTROLS.examination+'» y explora «'+definition.label+'».'};
 }
 if(kind==='study'){
  const study=caseData.studies.find(s=>s.id===id);if(!study)return null;
  const series=!!requiredStudySeries(caseData,id),label=studyOrderLabel(study,{series});
  return {...base,section:'studies',label,command:'/estudio '+id+(series?' seriada':''),
   text:'Desde «'+CLINICAL_CONTROLS.studies+'», solicita «'+label+'».'};
 }
 if(kind==='closure'){
  const label=DESTINATION_LABELS[id];if(!label)return null;
  return {...base,section:'patient',label,command:'/disposicion '+id,
   text:'Abre «'+CLINICAL_CONTROLS.closureTitle+'» y selecciona «'+label+'».'};
 }
 if(kind==='wait'){
  const text={receiver:'Espera la respuesta del servicio receptor.',study:'Espera el resultado del estudio solicitado.',
   observation:'Completa el tiempo de observación clínica.',rescue:'Reevalúa la respuesta a la adrenalina antes del traslado.',execution:'Espera la confirmación pendiente de Enfermería.'}[id];
  return {...base,id:id||'execution',label:'En curso',text:text||'Espera la confirmación pendiente.'};
 }
 if(kind!=='treatment')return null;
 const item=caseData.interventions.find(x=>x.id===id)||content.therapies.find(x=>x.id===id),definition=nativeTreatmentDefinition(id,caseData);
 const alias=definition?.aliases?.[0]||content.therapies.find(x=>x.id===id)?.aliases?.[0]||item?.aliases?.[0];
 let phrase=id==='iv'?'una vía':id==='monitor'?'monitor':id==='oxygen'?'oxigeno '+(content.defaultDoses.oxygen?.amount||4)+' L/min':
  alias;
 if(!phrase)return null;
 const dose=definition?.dose||content.defaultDoses[id]||GASTRO_CONDUCT_DOSES[id];
 if(isNativeMedicine(id)&&dose&&dose.unit!=='protocolo'){
  phrase+=' '+dose.amount+' '+dose.unit+(definition?.route&&definition.route!=='inhaled'?' '+definition.route:'');
  try{preflightNativeMedicine(id,phrase,{caseData,clock,requireAccess:false,reference:dose,unfiltered:phrase});}
  catch{return null;}
 }else if(GASTRO_CONDUCT_DOSES[id])phrase+=' '+GASTRO_CONDUCT_DOSES[id].amount+' '+GASTRO_CONDUCT_DOSES[id].unit;
 else if(id==='espironolactona')phrase+=' '+(content.defaultDoses[id]?.amount||100)+' mg oral';
 let command='Enfermera, '+phrase;
 let route=routeWardSpeech(command,{patientUid:patient.uid,clinicalEvaluation:true,caseData,
  studies:caseData.studies,therapies:content.therapies,interventions:caseData.interventions});
 if(isNativeMedicine(id)&&!route.error){
  const intent=route.intents.find(i=>i.id===id);
  try{preflightNativeMedicine(id,intent?.clause||intent?.sourceText,{caseData,reference:dose,unfiltered:command});}
  catch{
   // The shared scanner normalizes some dose separators. A dose-free native
   // alias uses that SAME authored default; never display a corrupt dose.
   if(!alias)return null;
   try{preflightNativeMedicine(id,alias,{caseData,reference:dose,unfiltered:alias});}catch{return null;}
   phrase=alias;command='Enfermera, '+phrase;
   route=routeWardSpeech(command,{patientUid:patient.uid,clinicalEvaluation:true,caseData,
    studies:caseData.studies,therapies:content.therapies,interventions:caseData.interventions});
  }
 }
 if(route.error||!route.intents.some(i=>i.id===id))return null;
 return {...base,section:'treatment',label:item?.label||definition?.label||phrase,command,
  text:'Dile a Enfermería: «'+phrase+'».'};
}
