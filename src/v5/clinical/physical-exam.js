// Effective ns421-clinical-exam findings, deliberately limited to the
// migrated cases. Neither undefined findings nor an untouched organ are normal.
import {EXAM_TECHNIQUES,EXAM_REGIONS,GLASGOW_COMPONENTS,validExamSelection} from './exam-contract.js';
import {readNeurologicalState,readPatientObservations} from './patient-observations.js';
export {EXAM_TECHNIQUES,EXAM_REGIONS,GLASGOW_COMPONENTS,validExamSelection} from './exam-contract.js';
const unspecified='Sin hallazgo específico modelado en este escenario.';
const findings={
 'PERI-TER-001':{appearance:'Aspecto muy comprometido; múltiples operaciones previas.',
  inspection:'Abdomen distendido; heridas quirúrgicas recientes.',palpation:'Dolor difuso; sin colección focal palpable.'},
 'PERI-PBE-001':{appearance:'Respuestas lentas al ingreso.',inspection:'Abdomen distendido por ascitis abundante.',
  palpation:'Molestia difusa leve; sin defensa ni Blumberg franco.',percussion:'Matidez por líquido abdominal.',
  neuro:'Atención enlentecida, sin focalidad neurológica modelada.'},
 'CIRR-001':{appearance:'Adelgazado.',skin:'Arañas vasculares y eritema palmar.',
  inspection:'Abdomen globoso, con distensión por líquido.',palpation:'Ascitis moderada; abdomen globoso.',
  spleen:'Esplenomegalia.',percussion:'Matidez compatible con líquido abdominal.'},
 'PERI-SEC-001':{appearance:'Permanece inmóvil para evitar dolor.',
  inspection:'Abdomen distendido; respiración costal y superficial.',
  palpation:'Defensa y contractura difusas, Blumberg positivo.',bowel:'Ruidos hidroaéreos muy disminuidos.'},
 'APP-001':{appearance:'Molestia con el movimiento.',
  palpation:'Dolor máximo en fosa ilíaca derecha y punto de McBurney; defensa localizada y Blumberg positivo. Dolor con maniobra del psoas. Sin contractura generalizada.'}
};
const row=(regionId,organ,text)=>({regionId,organ,text:text||unspecified});
export function initializeExamination(p){Object.assign(p,{exam:{},examFindings:{},examLog:[],examDone:false,glasgow:null});}
/** Pure observation of the authorized patient's present state. No clock or treatment writes. */
export function physicalExamRows(caseId,p,technique,regionId=null,atNativeMinute=0){
 const f=findings[caseId];if(!f)throw Error('exam-case-not-migrated');
 const v=p.liveVitals,observed=readPatientObservations(p,caseId,atNativeMinute),n=observed.neuro;let rows=[];
 if(technique==='general')rows=[row('general','Aspecto general',f.appearance),
  row('general','Consciencia y orientación',n.verbal==null?'Respuesta verbal no evaluable.':n.verbal<4?'Respuesta verbal muy limitada.':
   n.verbal===4?'Comunica frases, pero no está bien orientado; pregunta dónde está.':'Alerta y orientado en esta evaluación.'),
  row('general','Perfusión y respiración',v.sys<90?'Perfusión comprometida; requiere reevaluación inmediata.':
   v.spo2<90?'Compromiso de la oxigenación.':observed.trend==='better'?'Mejor perfusión clínica que al ingreso; persiste necesidad de seguimiento.':'Valorar en conjunto con los signos actuales.'),
  row('general','Dolor observado',observed.pain==null?null:'Refiere '+observed.pain+'/10 en este momento.')];
 if(technique==='inspection')rows=[row('skin','Piel y mucosas',f.skin),
  row('thorax','Tórax / patrón respiratorio',v.rr>=26?'Respiración rápida, '+Math.round(v.rr)+' por minuto.':null),
  row('abdomen','Abdomen',f.inspection),row('perineum','Periné',f.perineum)];
 if(technique==='auscultation')rows=[row('abdomen','Intestino / abdomen',f.bowel),row('thorax','Corazón'),row('thorax','Pulmones')];
 if(technique==='percussion')rows=[row('abdomen','Abdomen',f.percussion),row('liver','Hígado'),row('spleen','Bazo'),row('renal','Región renal')];
 if(technique==='palpation')rows=[row('abdomen','Abdomen',f.palpation),row('liver','Hígado',f.liver),
  row('spleen','Bazo',f.spleen),row('pulses','Pulsos periféricos',v.sys<90?'Pulso débil con compromiso de perfusión.':null)];
 return regionId?rows.filter(r=>r.regionId===regionId):rows;
}
const response=(p,cmd,data)=>({status:'executed',eventId:cmd.eventId,patientUid:p.uid,
 receipt:{patientUid:p.uid,eventId:cmd.eventId,actorId:cmd.actorId,kind:cmd.intent.kind,id:cmd.intent.id,...data}});
const reject=(p,cmd)=>({status:'rejected',patientUid:p.uid,eventId:cmd.eventId,reason:'unknown-exam'});
const glasgowLabels={
 eye:{4:'Abre los ojos espontáneamente.',3:'Abre los ojos a la voz.',2:'Abre los ojos a la presión.',1:'Sin apertura ocular.'},
 verbal:{5:'Orientado: informa persona, lugar y tiempo.',4:'Conversación coherente, pero desorientado.',3:'Palabras aisladas.',2:'Solo sonidos.',1:'Sin respuesta verbal.'},
 motor:{6:'Obedece una orden de dos pasos.',5:'Localiza el estímulo.',4:'Flexión normal / retirada.',3:'Flexión anormal.',2:'Extensión.',1:'Sin respuesta motora.'}
};
/** Called by either case policy inside the existing native clinical port. */
export function executePhysicalExam(p,c,cmd,clock){
 const {intent}=cmd;if(!['exam.record','exam.glasgow'].includes(intent.kind))return null;
 if(intent.kind==='exam.glasgow'){
  const parts=intent.id==='all'?Object.keys(GLASGOW_COMPONENTS):[intent.id];
  if(parts.some(k=>!Object.hasOwn(GLASGOW_COMPONENTS,k)))return reject(p,cmd);
  const n=readNeurologicalState(p),g=p.glasgow||(p.glasgow={total:null});
  for(const k of parts){const score=glasgowLabels[k][n[k]]?n[k]:null;
   g[k]={score,text:score==null?'No evaluable'+(n.reason?': '+n.reason:'.'):glasgowLabels[k][score],
    patientUid:p.uid,eventId:cmd.eventId,nativeMinute:clock.nativeMinute};}
  const components=Object.keys(GLASGOW_COMPONENTS).map(k=>g[k]);
  g.total=components.every(x=>x&&x.score!=null)?components.reduce((sum,x)=>sum+x.score,0):null;
  return response(p,cmd,{glasgow:structuredClone(g),message:'Glasgow · '+parts.map(k=>GLASGOW_COMPONENTS[k]+': '+g[k].text).join(' · ')});
 }
 const technique=intent.id,region=intent.regionId;
 if(!Object.hasOwn(EXAM_TECHNIQUES,technique)||region&&!validExamSelection(region,technique))return reject(p,cmd);
 const rows=physicalExamRows(c.id,p,technique,region,clock.nativeMinute);
 for(const id of new Set(rows.map(r=>r.regionId))){
  p.examFindings[id]??={};p.examFindings[id][technique]={rows:rows.filter(r=>r.regionId===id),
   patientUid:p.uid,eventId:cmd.eventId,nativeMinute:clock.nativeMinute};
 }
 p.examLog.push({patientUid:p.uid,eventId:cmd.eventId,regionId:region||null,technique,nativeMinute:clock.nativeMinute});
 p.exam[technique]={rows:Object.values(p.examFindings).flatMap(techs=>techs[technique]?.rows||[]),
  eventId:cmd.eventId,nativeMinute:clock.nativeMinute};
 p.examDone=!!p.examFindings.general?.general&&EXAM_REGIONS.abdomen.techniques.every(k=>p.examFindings.abdomen?.[k]);
 return response(p,cmd,{rows:structuredClone(rows),regionId:region||null,
  message:EXAM_TECHNIQUES[technique]+(region?' · '+EXAM_REGIONS[region].label:'')+': '+rows.map(x=>x.organ+': '+x.text).join(' · ')});
}
