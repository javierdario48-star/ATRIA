import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudyService} from './studies.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
import {advanceClinicalComplications} from './clinical-policy-effects.js';
const cases=[...respiratoryPack.cases,...cardiologyPack.cases,...neurologyPack.cases];
const getCase=id=>cases.find(c=>c.id===id);
function patient(caseId){
 const c=getCase(caseId),[sys,dia]=c.vitals.bp.split('/').map(Number),v={...c.vitals,sys,dia};delete v.bp;
 return {uid:'study:'+caseId,caseId,orders:[],treatments:[],administrationLog:[],procedures:{},
  liveVitals:v,baselineVitals:{...v},neurology:structuredClone(c.clinicalPolicy.neurologyBaseline),
  observationResponses:structuredClone(c.clinicalPolicy.observationResponses||[]),policyState:{nativeMinute:0,complications:[]}};
}
const command=(id,eventId,atMinute=0,atNativeMinute=atMinute)=>({id,eventId,actorId:'doctor',atMinute,atNativeMinute});
function administer(p,id,at=1,route='procedure'){
 const t={id,patientUid:p.uid,sourceEventId:id+':completed',actorId:'doctor',route,
  ...(route==='procedure'?{kind:'procedure.performed',completionStatus:'completed'}:{}),
  dose:{amount:1,unit:route==='iv'?'mg':'procedimiento'},administeredAtNativeMinute:at};
 p.treatments.push(t);p.administrationLog.push(structuredClone(t));return t;
}
const gasValue=(result,name)=>Number(result.match(new RegExp(name+'\\s*(\\d+(?:[,.]\\d+)?)','i'))?.[1].replace(',','.'));

test('repeatable policy studies create fresh samples only after completion and replay the original event',()=>{
 const service=createStudyService(cases),p=patient('RESP-04'),id='g_resp04_gas';
 assert.equal(service.request(p,command(id,'first')).status,'pending');
 service.request(p,command(id,'pending-alias',1));assert.equal(p.orders.length,1);
 service.advance(p,5);
 assert.equal(service.request(p,command(id,'second',6)).status,'pending');
 assert.equal(p.orders.length,2);assert.equal(p.orders[1].sourceEventId,'second');
 assert.equal(service.request(p,command(id,'first',50)).receipt.sourceEventId,'first');
 assert.equal(service.request(p,command(id,'pending-alias',50)).receipt.sourceEventId,'first');
 assert.equal(p.orders.length,2);
});

test('severe-asthma repeat blood gas measures worsening ventilation and preserves the old sample',()=>{
 const service=createStudyService(cases),p=patient('RESP-04'),id='g_resp04_gas';
 service.request(p,command(id,'initial'));service.advance(p,5);
 const first=structuredClone(p.orders[0]);
 p.policyState={nativeMinute:35,complications:[{id:'resp04_respiratory_fatigue',effect:'respiratory-fatigue',status:'active',severity:1,onsetAt:20}]};
 p.liveVitals={...p.liveVitals,spo2:80,rr:24};
 service.request(p,command(id,'fatigue',35,35));
 const latest=p.orders.at(-1).result;
 assert(gasValue(latest,'PaCO2')>gasValue(first.result,'PaCO2')+10,latest);
 assert(gasValue(latest,'pH')<gasValue(first.result,'pH'),latest);
 assert(gasValue(latest,'PaO2')<gasValue(first.result,'PaO2'),latest);
 assert.deepEqual(p.orders[0],first,'later tests cannot rewrite an earlier result');
});

test('oxygen and requested ventilation cannot normalize carbon dioxide, and real ventilation improves it gradually',()=>{
 const service=createStudyService(cases),p=patient('RESP-04'),id='g_resp04_gas';
 p.policyState={nativeMinute:35,complications:[{id:'resp04_respiratory_fatigue',effect:'respiratory-fatigue',status:'active',severity:1,onsetAt:20}]};
 p.liveVitals.spo2=94;
 p.pendingTreatments=[{id:'intubation',sourceEventId:'pending'}];
 p.procedures.intubation={active:true,patientUid:p.uid,sourceEventId:'pending'};
 service.request(p,command(id,'oxygen-only',35,35));service.advance(p,40);
 const untreatedCO2=gasValue(p.orders[0].result,'PaCO2');
 assert(untreatedCO2>55,p.orders[0].result);
 administer(p,'intubation',40);
 service.request(p,command(id,'just-ventilated',41,40.1));service.advance(p,46);
 const earlyCO2=gasValue(p.orders[1].result,'PaCO2');
 assert(earlyCO2>50,'no immediate normalization after tube placement');
 service.request(p,command(id,'later-ventilated',65,65));
 const laterCO2=gasValue(p.orders[2].result,'PaCO2');
 assert(laterCO2<untreatedCO2,p.orders[2].result);
 assert(laterCO2>=42,'obstructive ventilation is conservative');
 assert.equal(p.treatments.length,1,'study never executes a treatment');
});

test('CARD-05 serial ECG requires real patient-bound rhythm restoration rather than request or isolated HR drop',()=>{
 const service=createStudyService(cases),p=patient('CARD-05'),id='g_card05_ecg';
 p.liveVitals.hr=84;p.policyState.rhythm='sinus';
 p.pendingTreatments=[{id:'adenosine'}];
 service.request(p,command(id,'requested',5,5));service.advance(p,10);
 assert.match(p.orders[0].result,/TSV|Taquicardia regular/);
 administer(p,'adenosine',10,'iv');
 service.request(p,command(id,'restored',12,12));
 assert.match(p.orders[1].result,/ritmo sinusal/i);
 const before=structuredClone(p.orders[1]);
 service.advance(p,50);assert.equal(p.orders[1].result,before.result);
});

test('cross-patient, future, duplicate or unmatched receipts never restore CARD-05 rhythm',()=>{
 for(const corrupt of [p=>p.administrationLog[0].patientUid='other',p=>p.administrationLog[0].administeredAtNativeMinute=100,
  p=>p.administrationLog.push(structuredClone(p.administrationLog[0])),p=>p.treatments=[]]){
  const p=patient('CARD-05'),service=createStudyService(cases);administer(p,'adenosine',1,'iv');corrupt(p);
  service.request(p,command('g_card05_ecg','ecg',12,12));
  assert.match(p.orders[0].result,/TSV|Taquicardia regular/);
 }
});

test('serial cardiac ECG reports current ventricular frequency without declaring AF or ST elevation cured',()=>{
 for(const [caseId,id,pattern] of [['CARD-04','g_card04_ecg',/FA/],['CARD-01','g_card01_ecg',/Elevación del ST/]]){
  const p=patient(caseId),service=createStudyService(cases);p.liveVitals.hr=102;
  service.request(p,command(id,'current-ecg',30,30));
  assert.match(p.orders[0].result,/frecuencia ventricular actual 102\/min/i);
  assert.match(p.orders[0].result,pattern);
  if(caseId==='CARD-04')assert.doesNotMatch(p.orders[0].result,/ritmo sinusal/i);
 }
});

test('neuromuscular serial assessment does not invent immediate IVIG strength recovery after ventilation',()=>{
 for(const caseId of ['NEUR-09','NEUR-10']){
  const p=patient(caseId),service=createStudyService(cases),id=getCase(caseId).studies.find(s=>s.dynamic==='neuromuscular-ventilation').id;
  administer(p,'intubation',1);administer(p,'ivig',2,'iv');
  service.request(p,command(id,'assessment',60,60));
  assert.match(p.orders[0].result,/espontáneas no comparables.*persiste debilidad neuromuscular/i);
  assert.match(p.orders[0].result,/debilidad|tetraparesia|reserva ventilatoria crítica|falla ventilatoria/i);
  assert.doesNotMatch(p.orders[0].result,/fuerza normal|recuperación completa|CVF (?:4[0-9]|5[0-9])/i);
  assert.equal(p.neurology.limbStrength,getCase(caseId).clinicalPolicy.neurologyBaseline.limbStrength);
 }
});

test('repeated study checkpoint cannot bind an old event to a newer sample from a stale patient snapshot',()=>{
 const service=createStudyService(cases),p=patient('RESP-04'),id='g_resp04_gas';
 service.request(p,command(id,'first'));service.advance(p,5);
 service.request(p,command(id,'second',6));
 const restored=structuredClone(p);restored.orders.shift();
 const result=createStudyService(cases,service.checkpoint()).request(restored,command(id,'first',7));
 assert.equal(result.status,'rejected');assert.equal(result.reason,'study-order-missing');
 assert.equal(restored.orders.length,1);
});

test('every dynamic blood gas uses the native clock for future and unmatched ventilation receipts',()=>{
 for(const corrupt of [p=>p.administrationLog[0].patientUid='other',p=>p.treatments[0].administeredAtNativeMinute=100,
  p=>p.treatments[0].completionStatus='pending',p=>p.treatments=[]]){
  const p=patient('RESP-04'),service=createStudyService(cases);
  p.policyState={nativeMinute:35,complications:[{id:'any',effect:'respiratory-fatigue',status:'active',severity:1,onsetAt:20}]};
  administer(p,'intubation',1);corrupt(p);
  service.request(p,command('g_resp04_gas','gas',200,35));
  assert(gasValue(p.orders[0].result,'PaCO2')>=65,p.orders[0].result);
 }
});

test('policy fallback studies cannot inherit repeatability from another case',()=>{
 const service=createStudyService(cases),p=patient('CARD-05');
 service.request(p,command('g_resp04_gas','fallback'));service.advance(p,100);
 const again=service.request(p,command('g_resp04_gas','again',101));
 assert.equal(again.status,'executed');assert.equal(p.orders.length,1);
 assert.equal(p.orders[0].resultSource,'universal-fallback');
});

test('a post-treatment study cannot sample before the patient-bound treatment actually completes',()=>{
 const c=structuredClone(getCase('RESP-06')),id='g_resp06_test_followup';
 c.studies.push({id,label:'Coagulación de control tras trombólisis',type:'lab',delay:5,
  result:'aPTT 31 s; tiempo de trombina 18 s.',requiresCompletedTreatments:['alteplase_pe']});
 const service=createStudyService([c]),p=patient(c.id);
 p.pendingTreatments=[{id:'alteplase_pe'}];
 const before=service.request(p,command(id,'followup',200,35));
 assert.equal(before.status,'rejected');assert.equal(before.reason,'study-requires-completed-treatment');
 assert.equal(p.orders.length,0,'an order or ongoing infusion cannot create a post-lysis sample');
 const t=administer(p,'alteplase_pe',30,'iv');
 t.completedAtNativeMinute=40;p.administrationLog[0].completedAtNativeMinute=40;
 assert.equal(service.request(p,command(id,'followup',201,39)).status,'rejected');
 assert.equal(p.orders.length,0,'the native completion time gates sampling');
 assert.equal(service.request(p,command(id,'followup',202,40)).status,'pending');
 assert.equal(p.orders.length,1);assert.equal(p.orders[0].sampledAtNativeMinute,40);
 assert.equal(p.orders[0].requestedAtMinute,202);
 service.advance(p,207);
 assert.equal(service.request(p,command(id,'followup',208,41)).receipt.result,'aPTT 31 s; tiempo de trombina 18 s.');
});

test('post-treatment samples reject foreign, future, duplicate and unmatched administrations',()=>{
 const c=structuredClone(getCase('RESP-06')),id='g_resp06_test_followup';
 c.studies.push({id,label:'Coagulación de control tras trombólisis',type:'lab',delay:5,
  result:'aPTT 31 s; tiempo de trombina 18 s.',requiresCompletedTreatments:['alteplase_pe']});
 for(const corrupt of [p=>p.administrationLog[0].patientUid='another',
  p=>p.treatments[0].administeredAtNativeMinute=90,
  p=>p.administrationLog.push(structuredClone(p.administrationLog[0])),p=>p.treatments=[]]){
  const p=patient(c.id),service=createStudyService([c]);administer(p,'alteplase_pe',30,'iv');corrupt(p);
  const result=service.request(p,command(id,'followup',200,40));
  assert.equal(result.status,'rejected');assert.equal(p.orders.length,0);
 }
});

test('serial EEG reports ongoing ictal activity and a later postictal sample only after confirmed sequential control',()=>{
 const service=createStudyService(cases),p=patient('NEUR-06'),id='g_neur06_eeg';
 service.request(p,command(id,'ictal',0,0));service.advance(p,15);
 assert.match(p.orders[0].result,/actividad ictal|patrón ictal/i);
 const first=structuredClone(p.orders[0]);
 administer(p,'lorazepam',1,'iv');const secondLine=administer(p,'levetiracetam',2,'iv');
 secondLine.completedAtNativeMinute=12;p.administrationLog[1].completedAtNativeMinute=12;
 service.request(p,command(id,'at-completion',16,12));service.advance(p,31);
 assert.match(p.orders[1].result,/actividad ictal|patrón ictal/i,'completion is not instant seizure control');
 service.request(p,command(id,'postictal',40,42));
 assert.match(p.orders[2].result,/enlentecimiento.*posictal/i);
 assert.match(p.orders[2].result,/sin patrón ictal sostenido.*muestra/i);
 assert.doesNotMatch(p.orders[2].result,/EEG normal|curación|recuperación completa/i);
 assert.deepEqual(p.orders[0],first,'a control EEG cannot rewrite the earlier ictal record');
});

test('encephalitis EEG observes the real recurrent seizure episode and retains its abnormal baseline after rescue',()=>{
 const c=getCase('NEUR-08'),p=patient(c.id),service=createStudyService(cases),id='g_neur08_eeg';
 p.variation={complicationCandidates:[{id:c.clinicalPolicy.complications[0].id}]};
 advanceClinicalComplications(p,c,25);advanceClinicalComplications(p,c,35);
 service.request(p,command(id,'recurrent-seizure',35,35));service.advance(p,50);
 assert.match(p.orders[0].result,/actividad ictal|patrón ictal/i);
 administer(p,'lorazepam',35,'iv');administer(p,'levetiracetam',35,'iv');
 advanceClinicalComplications(p,c,55);
 service.request(p,command(id,'after-rescue',55,55));
 assert.match(p.orders[1].result,/Enlentecimiento temporal izquierdo.*descargas periódicas/i);
 assert.doesNotMatch(p.orders[1].result,/EEG normal|actividad ictal persistente/i);
 assert.equal(p.neurology.infectiousConfusion,true);
});
