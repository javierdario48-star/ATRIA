import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {createStudyService} from './studies.js';
import {createClinicalContent} from '../content/clinical-content.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
import {clinicalCompletions,studySearchChoices} from '../ui/clinical-autocomplete.js';
import {routeWardSpeech} from '../core/speech-router.js';
import {selectClinicalHint} from './clinical-hints.js';
import {studyOrderVocabulary} from './study-order-vocabulary.js';

const read=name=>JSON.parse(readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content=createClinicalContent({cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')},
 {additionalCases:[...cardiologyPack.cases,...respiratoryPack.cases,...neurologyPack.cases]});
const {cases}=content;
const setup=(caseId,config=content,checkpoint)=>createGuardSession({roomId:'study-order:'+caseId,mode:'solo',
 actorId:'doctor',actorName:'Médica',patient:{uid:'patient',caseId},content:config,checkpoint,resolveContext:()=>({patientUid:'patient'})});

test('ward study search and nursing phrases request one native result with its original turnaround',async()=>{
 const matrix=[
  ['CARD-01','g_card01_troponin',10,['troponina','troponinas','troponina cardíaca','troponina ultrasensible','troponina de alta sensibilidad','troponina cardíaca ultrasensible I','hs-cTn','hs cTnI','troponina I']],
  ['CARD-10','g_card10_labs',10,['troponina cardíaca','hs-cTnI']],
  ['RESP-05','g_resp05_troponin',8,['troponinas','hs-cTn']],
  ['CARD-01','g_card01_ecg',5,['ECG','EKG','electrocardiograma']],
  ['APP-001','app_cbc',45,['hemograma','biometría','biometría hemática']],
  ['NEUR-01','g_neur01_glucose',5,['glucemia','glicemia']],
  ['CHOLANG-001','cholang_liver',70,['hepatograma','perfil hepático']],
  ['RESP-06','g_resp06_labs',8,['coagulograma','perfil de coagulación']]
 ];
 for(const [caseId,id,turnaround,aliases] of matrix){
  const session=setup(caseId);
  try{
   for(const [index,phrase] of aliases.entries()){
    const results=clinicalCompletions(phrase,{mode:'monitor',caseId,cases,studies:session.catalog()});
    assert.deepEqual(results.filter(x=>x.kind==='study').map(x=>x.id),['study:'+id],caseId+': '+phrase);
    assert.deepEqual(studySearchChoices(phrase,{caseId,cases,studies:session.catalog()}).map(x=>x.id),[id],caseId+': '+phrase);
    const ack=await session.post({id:'study-'+index,text:'Enfermera, '+phrase});
    assert.deepEqual(ack.clinical.map(x=>[x.kind,x.id]),[['study.request',id]],caseId+': '+phrase);
   }
   const selected=await session.post({id:'menu',text:'/estudio '+id});
   assert.equal(selected.clinical[0]?.id,id);
   assert.equal(session.read().patient.orders.length,1);
   session.advance(turnaround-.001);await session.flush();
   assert.equal(session.read().patient.orders[0].status,'pending');
   session.advance(.001);await session.flush();
   const [order]=session.read().patient.orders;
   assert.equal(order.status,'done');
   assert.equal(order.readyAtMinute,turnaround);
   assert.equal(order.resultSource,'native');
   const authored=cases.find(c=>c.id===caseId).studies.find(s=>s.id===id).result;
   if(id==='g_card01_ecg')assert.ok(order.result.includes(authored));
   else assert.equal(order.result,authored);
   const after=await session.post({id:'after',text:'Enfermera, '+aliases.at(-1)});
   if(id!=='g_card01_ecg'){
    assert.equal(session.read().patient.orders.length,1);
    assert.equal(after.clinical[0]?.receipt?.sourceEventId,order.sourceEventId);
   }
  }finally{session.dispose();}
 }
});


test('VEDB and lower endoscopy names resolve to one native colonoscopy, never upper endoscopy',()=>{
 for(const caseId of ['CROHN-001','COLON-001']){
  const c=cases.find(item=>item.id===caseId);
  const vocabulary=studyOrderVocabulary(c.studies,c.studies);
  for(const phrase of ['VEDB','videoendoscopia digestiva baja','endoscopia digestiva baja',
   'videocolonoscopia','video colonoscopia','colonoscopia','VCC']){
   assert.equal(vocabulary.resolve(phrase)?.study?.id,'colonoscopia',caseId+': '+phrase);
  }
  assert.notEqual(vocabulary.resolve('endoscopia digestiva alta')?.study?.id,'colonoscopia');
  assert.equal(vocabulary.catalog.filter(study=>study.id==='colonoscopia').length,1);
 }
});
test('hemogram, leukocytes and C-reactive protein follow the documented local panel',async()=>{
 for(const [caseId,cbc,ids] of [['APP-001','app_cbc',['app_cbc']],['CHOLE-001','chole_cbc',['chole_cbc','pcr']],
  ['ILEO-001','ileo_lab',['ileo_lab','pcr']],['DIVERT-001','g_divert_labs',['g_divert_labs']]]){
  const session=setup(caseId);
  try{
   const ordered=await session.post({id:'panel',text:'Enfermera, hemograma y PCR'});
   assert.deepEqual(ordered.clinical.map(row=>row.id),ids,caseId);
   const cells=await session.post({id:'cells',text:'Enfermera, leucocitos'});
   assert.equal(cells.clinical[0]?.id,cbc);
   session.advance(70);await session.flush();
   const orders=session.read().patient.orders;
   assert.deepEqual(orders.map(row=>row.id),ids);
   const native=cases.find(c=>c.id===caseId).studies.find(row=>row.id===cbc);
   assert.equal(orders[0].result,native.result);
   assert.equal(orders[0].patientUid,'patient');
   assert.equal(orders[0].sampledAtNativeMinute,0);
   if(ids.includes('pcr'))assert.match(orders[1].result,/sin valor individual cuantificado/i);
   const replay=await session.post({id:'hemogram-replay',text:'/estudio hemograma'});
   assert.equal(replay.clinical[0].receipt.sourceEventId,orders[0].sourceEventId);
   assert.equal(replay.clinical[0].receipt.sampledAtNativeMinute,0);
  }finally{session.dispose();}
 }
});
test('native CT technique is shared by clinical search, voice and direct requests',async()=>{
 for(const [caseId,id,plain,authored,unsupported] of [
  ['NEUR-02','g_neur02_ct','TC de cráneo','TC de cráneo sin contraste','TC de cráneo con contraste'],
  ['PANC-001','tc','TC abdomen','TC abdomen con contraste','TC abdomen sin contraste']
 ]){
  const session=setup(caseId);
  try{
   const choices=text=>studySearchChoices(text,{caseId,cases,studies:session.catalog()}).map(row=>row.id);
   assert.deepEqual(choices(plain),[id]);
   assert.deepEqual(choices(authored),[id]);
   assert.deepEqual(choices(unsupported),[]);
   const simple=await session.post({id:'plain',text:'Enfermera, '+plain});
   assert.equal(simple.clinical[0]?.id,id);
   const same=await session.post({id:'protocol',text:'Enfermera, '+authored});
   assert.equal(same.clinical[0]?.id,id);
   const different=await session.post({id:'different',text:'/estudio '+unsupported});
   assert.equal(different.routeError,'study-method-unavailable');
   await session.post({id:'other-region',text:'Enfermera, TC de tórax'});
   const pending=session.read().patient.orders;
   assert.deepEqual(pending.map(row=>row.id),[id,'tc_torax']);
   assert(pending.every(row=>row.status==='pending'&&row.result===undefined));
   session.advance(121);await session.flush();
   const [scan]=session.read().patient.orders;
   assert.equal(scan.status,'done');
   assert.equal(scan.result,cases.find(c=>c.id===caseId).studies.find(row=>row.id===id).result);
   assert.equal(scan.patientUid,'patient');
   assert.equal(scan.sampledAtNativeMinute,0);
  }finally{session.dispose();}
 }
});
test('RESP-03 captures a new blood gas after nurse-confirmed ventilation and restores both acquisitions',async()=>{
 const session=setup('RESP-03'),firstOrder={id:'gas-initial',text:'Enfermera gasometría'};
 let restored;
 try{
  await session.post(firstOrder);
  assert.equal(session.read().patient.orders[0].result,undefined);
  session.advance(5);await session.flush();
  const [initial]=session.read().patient.orders;
  assert.match(initial.result,/PaCO2 64 mmHg/);
  assert.doesNotMatch(initial.result,/Ventilación no invasiva confirmada/);

  await session.post({id:'monitor',text:'Enfermera monitor'});
  await session.post({id:'niv',text:'Enfermera VNI'});
  session.advance(65);await session.flush();
  const ventilation=session.read().patient.treatments.find(row=>row.id==='niv');
  assert.equal(ventilation?.kind,'procedure.performed');
  await session.post({id:'gas-control',text:'Enfermera gases arteriales'});
  session.advance(5);await session.flush();
  const orders=session.read().patient.orders;
  assert.equal(orders.length,2);
  assert.deepEqual(orders[0],initial);
  assert.equal(orders[1].id,initial.id);
  assert.equal(orders[1].patientUid,initial.patientUid);
  assert.notEqual(orders[1].sourceEventId,initial.sourceEventId);
  assert(orders[1].sampledAtNativeMinute>ventilation.administeredAtNativeMinute);
  assert.match(orders[1].result,/Ventilación no invasiva confirmada/);
  assert.notEqual(orders[1].result,initial.result);

  restored=setup('RESP-03',content,await session.checkpoint());
  assert.deepEqual(restored.read().patient.orders,orders);
  const replay=await restored.post(firstOrder);
  assert.equal(replay.clinical[0].receipt.sourceEventId,initial.sourceEventId);
  assert.equal(replay.clinical[0].receipt.result,initial.result);
  assert.equal(restored.read().patient.orders.length,2);
 }finally{session.dispose();restored?.dispose();}
});

test('a troponin with an unavailable assay or unmodeled series never falls back to a single or foreign test',async()=>{
 for(const [caseId,phrases] of [
  ['CARD-01',['troponina T','hs-cTnT','troponina cardíaca ultrasensible T','troponina I/T','troponina C','troponinas seriadas',
   'troponina 0/1 h','troponina ahora y a los 60 min','dos troponinas','troponina x2']],
  ['CARD-02',['troponina ultrasensible seriada','troponina seriada']],
  ['RESP-05',['troponina I','troponina T','hs-cTnI']],
  ['CARD-06',['hs-cTn','troponina de alta sensibilidad']],
  ['APP-001',['troponina I','troponina seriada','hs-cTn','glicemia capilar']]
 ]){
  const session=setup(caseId);
  try{
   for(const [index,phrase] of phrases.entries()){
    assert.deepEqual(clinicalCompletions(phrase,{mode:'monitor',caseId,cases,studies:session.catalog()}).filter(x=>x.kind==='study'),[],phrase);
    const ack=await session.post({id:'unavailable-'+index,text:'Enfermera, ECG y '+phrase});
    assert.deepEqual(ack.clinical,[],phrase);
    assert.match(ack.routeError,/^study-(?:assay|series|method)-unavailable$/,phrase);
   }
   assert.deepEqual(session.read().patient.orders,[]);
  }finally{session.dispose();}
 }
});

test('a study ID from another case cannot masquerade as a case-native troponin assay',async()=>{
 const session=setup('APP-001');
 try{
  const reply=await session.post({id:'foreign',text:'/estudio g_card02_troponin'});
  assert.equal(reply.routeError,'unknown-study');
  assert.equal(session.read().patient.orders.length,0);
  assert.equal(createStudyService(cases).request({uid:'patient',caseId:'APP-001',orders:[]},
   {id:'g_card02_troponin',eventId:'foreign',actorId:'doctor',atMinute:0}).status,'rejected');
 }finally{session.dispose();}
});

test('an explicitly documented T assay cannot be selected by an I alias',()=>{
 const c=structuredClone(cases.find(c=>c.id==='CARD-02'));
 c.studies.find(s=>s.id==='g_card02_troponin').result='Troponina T ultrasensible 42 ng/L.';
 const ctx={patientUid:'patient',caseData:c,studies:c.studies};
 assert.equal(routeWardSpeech('Enfermera, troponina cardíaca de alta sensibilidad T',ctx).intents[0]?.id,'g_card02_troponin');
 assert.equal(routeWardSpeech('Enfermera, hs-cTnI',ctx).error,'study-assay-unavailable');
 assert.deepEqual(studySearchChoices('troponina T',{caseId:c.id,cases:[c]}).map(study=>study.id),['g_card02_troponin']);
 assert.deepEqual(studySearchChoices('troponina I',{caseId:c.id,cases:[c]}),[]);
});

test('an ambiguous measurement or an assay mentioned only as an alternative cannot select that assay',()=>{
 const c=structuredClone(cases.find(c=>c.id==='CARD-02'));
 const study=c.studies.find(s=>s.id==='g_card02_troponin'),ctx={patientUid:'patient',caseData:c,studies:c.studies};
 study.result='Troponina I/T inicial 180 ng/L.';
 assert.equal(routeWardSpeech('Enfermera, troponina I',ctx).error,'study-assay-unavailable');
 study.result='Troponina inicial 180 ng/L. Considerar troponina T como método alternativo.';
 assert.equal(routeWardSpeech('Enfermera, troponina T',ctx).error,'study-assay-unavailable');
});

test('partial troponin searches prioritize the same case-native study',()=>{
 const session=setup('CARD-01');
 try{
  const ctx={caseId:'CARD-01',cases,studies:session.catalog(),mode:'monitor'};
  for(const phrase of ['tropo','hs-cT']){
   assert.deepEqual(studySearchChoices(phrase,ctx).map(study=>study.id),['g_card01_troponin']);
   assert.deepEqual(clinicalCompletions(phrase,ctx).filter(study=>study.kind==='study').map(study=>study.id),['study:g_card01_troponin']);
  }
 }finally{session.dispose();}
});

test('an authored control extends an already reported native initial sample and clears the actual checklist only at completion',async()=>{
 const c=structuredClone(cases.find(c=>c.id==='CARD-02')),id='g_card02_troponin';
 const definition=c.studies.find(s=>s.id===id);
 definition.seriesSamples=[{afterNativeMinutes:4,result:'Segundo informe del fixture.'}];
 definition.seriesRequired=true;
 c.keyStudies=c.keyStudies.filter(studyId=>studyId!==id);
 c.clinicalPolicy.closure.requiredStudies=c.clinicalPolicy.closure.requiredStudies.filter(studyId=>studyId!==id);
 const config={...content,cases:cases.map(x=>x.id===c.id?c:x)},session=setup(c.id,config);
 try{
  const first=await session.post({id:'initial',text:'Enfermera, hs-cTnI'});
  assert.equal(first.clinical[0].status,'pending');
  session.advance(10);await session.flush();
  const initial=await session.post({id:'initial',text:'Enfermera, hs-cTnI'});
  assert.equal(initial.clinical[0].status,'executed');
  const missing=()=>session.clinicalHintRequirements().filter(r=>r.anyOf?.some(group=>group.includes(id)));
  assert.equal(missing().length,1,'an initial result does not satisfy an authored series gate');
  const hint=selectClinicalHint({patient:session.read().patient,caseData:c,requirements:missing(),content:config,
   clock:session.read().clock,destination:'uti'});
  assert.equal(hint.action.command,'/estudio '+id+' seriada');
  assert.deepEqual(studySearchChoices(hint.action.label,{caseId:c.id,cases:[c],studies:session.catalog()})
   .map(({id,series})=>[id,series]),[[id,true]]);
  const control=await session.post({id:'control',text:'Enfermera, troponina de control'});
  assert.equal(control.clinical[0]?.status,'pending');
  assert.equal(session.read().patient.orders.length,1);
  assert.deepEqual((await session.post({id:'initial',text:'Enfermera, hs-cTnI'})).clinical,initial.clinical);
  session.advance(33.25);await session.flush();
  assert.equal(missing().length,1,'a second collection still needs its authored turnaround');
  session.advance(.25);await session.flush();
  const [order]=session.read().patient.orders;
  assert.equal(order.samples[0].sampledAtNativeMinute,0);
  assert.equal(order.samples[0].readyAtMinute,10);
  assert.equal(order.samples[0].result,definition.result);
  assert.ok(order.samples[1].sampledAtNativeMinute>=4);
  assert.equal(order.samples[1].result,'Segundo informe del fixture.');
  const final=await session.post({id:'control',text:'Enfermera, troponina de control'});
  assert.equal(final.clinical[0]?.status,'executed');
  assert.equal(final.clinical[0]?.receipt?.samples.length,2);
  assert.equal(missing().length,0);
  assert.equal(session.read().closure.quality.extraStudies,0);
  const alias=await session.post({id:'after-series',text:'Enfermera, troponinas'});
  assert.equal(alias.clinical[0]?.receipt?.sourceEventId,initial.clinical[0].receipt.sourceEventId);
  assert.equal(session.read().patient.orders.length,1);
 }finally{session.dispose();}
});

test('the initial result and series settle independently when the series is ordered first',async()=>{
 const c=structuredClone(cases.find(c=>c.id==='CARD-02')),id='g_card02_troponin';
 const definition=c.studies.find(study=>study.id===id),result='Segundo resultado reservado hasta el informe.';
 definition.seriesSamples=[{afterNativeMinutes:.6,result}];
 const session=setup(c.id,{...content,cases:cases.map(x=>x.id===c.id?c:x)});
 try{
  const sendSeries=()=>session.post({id:'series-first',text:'/estudio '+id+' seriada'});
  const sendInitial=()=>session.post({id:'initial-alias',text:'Enfermera, troponina I'});
  assert.equal((await sendSeries()).clinical[0]?.status,'pending');
  assert.equal((await sendInitial()).clinical[0]?.status,'pending');
  assert.equal(session.read().patient.orders[0].result,undefined);
  assert.equal(session.read().patient.orders[0].samples[0].result,undefined);
  const [firstReport]=session.advance(10);await session.flush();
  assert.equal(firstReport.samples[1].result,undefined);
  assert.equal((await sendSeries()).clinical[0]?.status,'pending');
  const initial=(await sendInitial()).clinical[0];
  assert.equal(initial.status,'executed');assert.equal(initial.receipt.result,definition.result);
  assert.equal(initial.receipt.samples,undefined);
  const fresh=await session.post({id:'later-initial-alias',text:'Enfermera, hs-cTnI'});
  assert.equal(fresh.clinical[0]?.status,'executed');
  assert.equal(fresh.clinical[0]?.receipt?.result,definition.result);
  assert.equal(session.read().patient.orders[0].samples[1].status,'pending');
  assert.ok(!JSON.stringify(session.read()).includes(result),'unreported result is absent from the public patient and chat');
  session.advance(5);await session.flush();
  const series=(await sendSeries()).clinical[0];
  assert.equal(series.status,'executed');assert.equal(series.receipt.samples[1].result,result);
  assert.equal(session.read().patient.orders.length,1);
  assert.equal(session.read().messages.filter(message=>message.id.startsWith('completion:')).length,2);
 }finally{session.dispose();}
});

test('an explicitly authored troponin series preserves specimen times, report delays and event replay',()=>{
 const caseData=structuredClone(cases.find(c=>c.id==='CARD-02'));
 const definition=caseData.studies.find(s=>s.id==='g_card02_troponin');
 definition.seriesSamples=[{afterNativeMinutes:60,result:'Segundo valor autorizado para este fixture.'}];
 const {intents}=routeWardSpeech('Enfermera, troponinas seriadas',{caseData,studies:caseData.studies,patientUid:'patient'});
 assert.deepEqual(intents.map(({id,series})=>[id,series]),[[definition.id,true]]);
 const compound=routeWardSpeech('Enfermera, troponina y troponina de control',{caseData,studies:caseData.studies,patientUid:'patient'});
 assert.deepEqual(compound.intents.map(({id,series})=>[id,series]),[[definition.id,true]]);
 const p={uid:'patient',caseId:caseData.id,orders:[]};
 const cmd={id:definition.id,series:true,eventId:'first',actorId:'doctor',atMinute:20,atNativeMinute:4};
 let service=createStudyService([caseData]);
 assert.equal(service.request(p,cmd).status,'pending');
 assert.equal(service.request(p,{...cmd,eventId:'alias'}).sourceEventId,'first');
 assert.equal(p.orders.length,1);
 assert.equal(service.advance(p,30,10)[0]?.completionSourceEventId,undefined,'only the initial sample is ready');
 assert.equal(p.orders[0].samples[0].status,'done');
 assert.equal(p.orders[0].samples[0].sampledAtNativeMinute,4);
 assert.equal(p.orders[0].samples[0].readyAtMinute,30);
 assert.equal(p.orders[0].samples[0].result,definition.result);
 assert.equal(p.orders[0].samples[1].sampledAtNativeMinute,undefined);
 service=createStudyService([caseData],service.checkpoint());
 assert.deepEqual(service.advance(p,420,63.99),[]);
 assert.deepEqual(service.advance(p,421,64),[]);
 assert.equal(p.orders[0].samples[1].sampledAtNativeMinute,64);
 assert.equal(p.orders[0].samples[1].readyAtMinute,431);
 assert.deepEqual(service.advance(p,430,65),[]);
 assert.equal(service.advance(p,431,65.2).length,1);
 const replay=service.request(p,{...cmd,eventId:'alias',atMinute:500,atNativeMinute:80});
 assert.equal(replay.status,'executed');
 assert.deepEqual(replay.receipt.samples.map(x=>[x.sampledAtNativeMinute,x.readyAtMinute,x.result]),[
  [4,30,definition.result],[64,431,'Segundo valor autorizado para este fixture.']
 ]);
 assert.equal(p.orders.length,1);
});
