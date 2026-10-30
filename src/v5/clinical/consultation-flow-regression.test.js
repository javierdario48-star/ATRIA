import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent as content} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
import {createClinicalInterface} from '../ui/clinical-controller.js';
import {closureDecisionHTML} from '../ui/clinical-closure-panel.js';
import {assessDiagnosticImpression} from './diagnostic-assessment.js';
import {generatePatientVariation} from '../content/patient-variation.js';

function fixture(caseId,patientUid) {
 let sequence=0;
 const c=content.cases.find(c=>c.id===caseId),uid=patientUid||'regression-'+caseId;
 const s=createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Médico',
  patient:{uid,caseId},content,resolveContext:()=>({patientUid:uid})});
 const post=text=>s.post({id:'cmd-'+(++sequence),text});
 const advance=async seconds=>{s.advance(seconds);await s.flush();};
 async function workup(){
  await post('/diagnostico '+c.dx[0]);await post('¿Qué antecedentes tiene?');
  await post('/monitor conectar');
  for(const technique of ['general','inspection','auscultation','percussion','palpation'])await post('/examen '+technique);
  await post('Enfermera una vía');
 }
 return {c,s,uid,post,advance,workup};
}

for(const scenario of ['withheld-beta','prior-rescue','prepared-beta'])test('CARD-08 with actual leak, allergic hypotension and rescue: '+scenario,async()=>{
 const c=content.cases.find(c=>c.id==='CARD-08');
 let uid;
 for(let i=0;i<1000&&!uid;i++){
  const candidate='card08-leak-contra-'+i;
  const generated=generatePatientVariation(c.variation,candidate+':'+c.id);
  if(generated.complicationCandidates.some(x=>x.id==='card08-aortic-leak')&&
   generated.allergies.some(x=>x.drugId==='morphine'&&x.severity==='severe'))uid=candidate;
 }
 assert(uid,'select an ordinary authored leak admission');
 const f=fixture(c.id,uid);
 try{
  await f.workup();await f.post('¿Tiene alergias?');await f.post('/estudio g_card08_cta');
  await f.post('Enfermera oxígeno 4 L/min');
  if(scenario==='prior-rescue'){await f.post('/tratamiento epi_im');await f.advance(1);}
  if(scenario==='prepared-beta'){await f.post('/tratamiento esmolol');await f.advance(1);}
  while(f.s.read().patient.liveVitals.sys>=110&&!f.s.read().patient.patientDied&&f.s.read().clock.clinicalMinute<900)await f.advance(5);
  assert(f.s.read().patient.policyState.complications.some(x=>x.id==='card08-aortic-leak'));
  const analgesia=await f.post('Enfermera morfina 4 mg');
  assert(analgesia.clinical.some(x=>['pending','executed'].includes(x.status)),JSON.stringify(analgesia));
  while(f.s.read().patient.liveVitals.sys>=100&&!f.s.read().patient.patientDied&&f.s.read().clock.clinicalMinute<1000)await f.advance(2);
  const p=f.s.read().patient;
  assert(p.liveVitals.sys<100&&!p.patientDied,JSON.stringify(p.liveVitals));
  await f.post('/reevaluar');
  assert.equal((await f.post('/disposicion quirofano')).clinical[0].status,'rejected',
   'withholding beta blockade cannot replace rescue of the active anaphylaxis');
  const rescue=await f.post('/tratamiento epi_im');
  assert(rescue.clinical.some(x=>['pending','executed'].includes(x.status)),JSON.stringify(rescue));
  await f.advance(1);
  for(const id of ['esmolol','metoprolol'])
   assert.equal((await f.post('/tratamiento '+id)).clinical[0].reason,'clinical-blood-pressure-limit');
  await f.post('/reevaluar');
  const request=await f.post('/disposicion quirofano');
  assert.equal(request.clinical[0].status,'pending',JSON.stringify(request.clinical));
  await f.advance(3.5);
  const closed=f.s.read();assert.equal(closed.patient.closure?.destination,'quirofano');
  assert.equal(closed.progress.receipts.length,1);
  assert(!closed.patient.treatments.some(x=>x.id==='aortic_surgery'));
  if(scenario!=='prepared-beta'){
   assert.equal(closed.patient.closure.quality.treatment,0,'a withheld unsafe drug earns no administration credit');
   assert(!closed.patient.treatments.some(x=>['esmolol','metoprolol'].includes(x.id)));
   assert.deepEqual(closed.patient.closure.handoff.withheldPreparations.map(x=>x.id).sort(),['esmolol','metoprolol']);
  }
 }finally{f.s.dispose();}
});

test('authored diagnoses containing sin retain their clinical meaning, while negated impressions cannot authorize transfer',()=>{
 for(const [id,dx] of [['CARD-02','IAM sin elevación del ST'],['CARD-02','síndrome coronario agudo sin elevación del ST'],['RESP-05','TEP sin shock']]){
  const c=content.cases.find(c=>c.id===id);
  assert.equal(assessDiagnosticImpression(c,dx).sufficient,true,id+': '+dx);
  for(const negated of ['sin '+dx,'no tiene '+dx,dx+' descartado',dx+' con diagnóstico descartado tras estudios'])
   assert.equal(assessDiagnosticImpression(c,negated).compatible,false,negated);
 }
});

test('a study maturing in the transfer completion tick cannot alter the closed CARD-08 patient',async()=>{
 const f=fixture('CARD-08');
 try{
  await f.workup();await f.post('/estudio g_card08_cta');await f.post('/tratamiento esmolol');
  await f.advance(18.55);await f.post('/estudio g_card08_ecg');await f.advance(1.45);
  await f.post('/reevaluar');
  assert.equal((await f.post('/disposicion quirofano')).clinical[0].status,'pending');
  await f.advance(.1);
  const results=f.s.advance(3.5);await f.s.flush();
  const final=f.s.read();assert.equal(final.patient.caseEnded,true);
  assert.equal(final.progress.receipts.length,1);
  assert.equal(final.patient.orders.find(x=>x.id==='g_card08_ecg').status,'pending');
  assert(!results.some(x=>x.id==='g_card08_ecg'));
  const frozen=structuredClone(final.patient);await f.advance(20);
  assert.deepEqual(f.s.read().patient,frozen);
 }finally{f.s.dispose();}
});

test('CARD-08 real catalog: generic surgery opinion routes to cardiovascular and a single UI destination closes with one XP award',async()=>{
 const f=fixture('CARD-08');
 try{
  assert.equal(f.c.title,'Disección aórtica Stanford A');
  await f.workup();await f.post('/estudio g_card08_cta');
  await f.post('/tratamiento esmolol');await f.post('Enfermera morfina 4 mg');
  await f.advance(30);await f.post('/reevaluar');
  const opinion=await f.post('Enfermera interconsulta a cirugia');
  assert.equal(opinion.clinical[0].status,'pending',JSON.stringify(opinion.clinical));
  await f.advance(3.5);
  assert(f.s.read().patient.consults.some(x=>x.id==='cardiovascular'&&x.accepted));
  assert.equal(f.s.read().patient.caseEnded,false,'an optional opinion does not close');
  const sent=[],notices=[];
  const ui=createClinicalInterface({document:{getElementById:()=>null},session:()=>f.s,
   open:()=>{},close:()=>{},onTalk:()=>{},notify:text=>notices.push(text),cases:content.cases,
   send:async text=>{sent.push(text);return f.post(text);}});
  await ui.chooseDestination({uid:f.uid},'quirofano');
  assert.deepEqual(sent,['/disposicion quirofano'],'the authority owns the complete transfer, including consultation');
  await f.advance(4);
  const state=f.s.read();
  assert.equal(state.patient.caseEnded,true,JSON.stringify(state.closure));
  assert.equal(state.patient.closure.destination,'quirofano');
  assert.equal(state.progress.receipts.length,1);assert(state.progress.xp>0);
  assert(!state.patient.treatments.some(x=>x.id==='aortic_surgery'));
  await f.post('/disposicion quirofano');await f.advance(5);
  assert.equal(f.s.read().progress.receipts.length,1);
 }finally{f.s.dispose();}
});

test('CARD-08 service identifies diagnosis, monitoring, examination and essential preparation separately; all refusals are recoverable',async()=>{
 const f=fixture('CARD-08');
 const opinion=async()=>{const ack=await f.post('/consulta cirugia');assert.equal(ack.clinical[0].status,'pending');await f.advance(3.5);return f.s.read().patient.consults.at(-1);};
 try{
  assert.equal((await opinion()).reasonCode,'diagnosis-missing');
  await f.post('/diagnostico neumonia');
  assert.equal((await opinion()).reasonCode,'diagnosis-incompatible');
  await f.post('/diagnostico diseccion aortica');
  assert.equal((await opinion()).reasonCode,'diagnosis-specificity');
  await f.post('/diagnostico diseccion aortica tipo A');
  assert.equal((await opinion()).reasonCode,'vitals-missing');
  await f.post('/monitor conectar');
  assert.equal((await opinion()).reasonCode,'examination-incomplete');
  for(const technique of ['general','inspection','auscultation','percussion','palpation'])await f.post('/examen '+technique);
  await f.post('/estudio g_card08_cta');await f.advance(16);
  assert.equal((await opinion()).reasonCode,'stabilization-insufficient');
  assert.equal(f.s.read().patient.caseEnded,false);assert.equal(f.s.read().progress.xp,0);
  await f.post('¿Qué antecedentes tiene?');await f.post('Enfermera una vía');
  await f.post('/estudio g_card08_cta');await f.post('/tratamiento esmolol');
  await f.advance(20);await f.post('/reevaluar');
  const accepted=await opinion();assert.equal(accepted.accepted,true,accepted.advice);
  assert.equal(accepted.decision,'ACCEPTED');
  await f.post('/diagnostico neumonia');
  const rejected=await f.post('/disposicion quirofano');
  assert.equal(rejected.clinical[0].status,'rejected','a previous acceptance cannot authorize a newly incompatible diagnosis');
  assert.equal(f.s.read().patient.caseEnded,false);
  await f.post('/diagnostico diseccion aortica tipo A');
  assert.equal((await f.post('/disposicion quirofano')).clinical[0].status,'executed');
  assert.equal(f.s.read().progress.receipts.length,1);
 }finally{f.s.dispose();}
});

for(const caseId of ['HDA-001','VARIX-001'])test(caseId+': syndromic HDA, actual monitor and directed examination permit one-action endoscopy transfer after real preparation',async()=>{
 const f=fixture(caseId);
 try{
  await f.workup();await f.post('/diagnostico HDA');
  await f.post('/estudio '+(caseId==='HDA-001'?'hda_lab':'g_varix_cbc'));
  await f.post('Enfermera Ringer 500 ml');
  if(caseId==='HDA-001')await f.post('Enfermera pantoprazol 40 mg');
  else{await f.post('Enfermera ceftriaxona 1 g');await f.post('Enfermera terlipresina 2 mg');}
  await f.advance(100);await f.post('/reevaluar');
  const wrong=await f.post('/disposicion quirofano');
  assert.equal(wrong.clinical[0].status,'rejected');
  assert.equal(wrong.clinical[0].receipt?.reasonCode,'destination-not-indicated');
  assert(!/implementad|migrad/.test(wrong.clinical[0].receipt?.message||''));
  const requested=await f.post('/disposicion procedimiento');
  assert.equal(requested.clinical[0].status,'pending',JSON.stringify(requested.clinical));
  assert.equal(f.s.read().patient.caseEnded,false);
  await f.advance(3.5);
  const state=f.s.read();
  assert.equal(state.patient.closure?.destination,'procedimiento',JSON.stringify(state.closure));
  assert(state.patient.consults.some(x=>x.id==='gastro'&&x.accepted));
  assert.equal(state.patient.lastVitalsKnown.source,'monitor','the actual connected monitor remains sufficient without another spot measurement');
  assert.equal(state.progress.receipts.length,1);assert(state.progress.xp>0);
  assert.equal(state.patient.closure.quality.diagnosticFactor,caseId==='VARIX-001'?.6:1);
  assert(!state.patient.treatments.some(x=>x.id==='variceal_ligation'));
 }finally{f.s.dispose();}
});

test('every playable case presents the same six destination decisions before diagnosis or receiver acceptance',()=>{
 for(const c of content.cases){
  const html=closureDecisionHTML({patient:{uid:'P',caseId:c.id,diagnosis:'',orders:[],treatments:[],consults:[]}});
  for(const id of ['alta','observacion','sala','uti','quirofano','procedimiento'])
   assert(html.includes('data-destination="'+id+'"'),c.id+': '+id);
 }
});

test('pending transfer survives reconnection, replay cannot duplicate XP, and late studies cannot mutate the closed patient',async()=>{
 const f=fixture('CARD-08');let restored;
 try{
  await f.workup();await f.post('/estudio g_card08_cta');await f.post('/tratamiento esmolol');
  await f.advance(20);await f.post('/reevaluar');
  await f.post('/estudio g_celiac_biopsy');
  const command={id:'durable-transfer',text:'/disposicion quirofano'};
  assert.equal((await f.s.post(command)).clinical[0].status,'pending');
  const checkpoint=await f.s.checkpoint();f.s.dispose();
  const create=checkpoint=>createGuardSession({roomId:f.uid,mode:'solo',actorId:'doctor',actorName:'Médico',
   patient:{uid:f.uid,caseId:f.c.id},content,resolveContext:()=>({patientUid:f.uid}),checkpoint});
  restored=create(checkpoint);
  assert.equal((await restored.post(command)).clinical[0].status,'pending');
  restored.advance(3.5);await restored.flush();
  const closed=restored.read();assert.equal(closed.patient.caseEnded,true);
  assert.equal(closed.progress.receipts.length,1);
  restored.advance(400);await restored.flush();
  assert.deepEqual(restored.read().patient,closed.patient,'the receiving service owns future care after transfer');
  const saved=await restored.checkpoint();restored.dispose();restored=create(saved);
  await restored.post(command);
  assert.deepEqual(restored.read().progress,closed.progress);
 }finally{f.s.dispose();restored?.dispose();}
});

test('NEUR-07 transfers monitored antibiotic infusions to UTI after actual delivery starts, without waiting for the entire future course or inventing completion',async()=>{
 const f=fixture('NEUR-07');
 try{
  await f.workup();await f.post('/examen neurological neurological');
  await f.post('¿Desde cuando?');
  await f.post('/estudio g_neur07_labs');await f.post('/estudio g_neur07_cultures');
  for(const text of ['/tratamiento dexamethasone','/tratamiento ceftriaxone 2000 mg IV',
   '/tratamiento vancomycin_iv','/tratamiento ampicillin 2000 mg IV'])await f.post(text);
  await f.advance(70);await f.post('/reevaluar');
  const before=f.s.read();
  assert(before.patient.administrationLog.some(x=>x.status==='administering'&&x.deliveryFraction>0&&x.deliveryFraction<1));
  const transfer=await f.post('/disposicion uti');
  assert.equal(transfer.clinical[0].status,'pending',JSON.stringify(transfer.clinical));
  await f.advance(3.5);
  const state=f.s.read();assert.equal(state.patient.closure?.destination,'uti',JSON.stringify(state.closure));
  assert(state.patient.closure.handoff.continuingAdministrations.some(x=>x.id==='vancomycin_iv'));
  assert(!state.patient.treatments.some(x=>x.id==='vancomycin_iv'),'transfer does not complete the dose');
  assert.equal(state.progress.receipts.length,1);
 }finally{f.s.dispose();}
});

test('CARD-07 recognizes real IV preparation for urgent receiver-owned pericardial drainage',async()=>{
 const f=fixture('CARD-07');
 try{
  await f.workup();await f.post('/estudio g_card07_echo');await f.advance(15);await f.post('/reevaluar');
  const request=await f.post('/disposicion procedimiento');
  assert.equal(request.clinical[0].status,'pending',JSON.stringify(request.clinical));
  await f.advance(3.5);assert.equal(f.s.read().patient.closure?.destination,'procedimiento');
  assert(!f.s.read().patient.treatments.some(x=>x.id==='pericardial_drainage'));
 }finally{f.s.dispose();}
});

test('CARD-08 UI starts and completes a transfer without any preceding manual consultation',async()=>{
 const f=fixture('CARD-08');
 try{
  await f.workup();await f.post('/estudio g_card08_cta');await f.post('/tratamiento esmolol');
  await f.advance(30);await f.post('/reevaluar');
  const sent=[];
  const ui=createClinicalInterface({document:{getElementById:()=>null},session:()=>f.s,
   open:()=>{},close:()=>{},onTalk:()=>{},notify:()=>{},cases:content.cases,
   send:async text=>{sent.push(text);return f.post(text);}});
  await ui.chooseDestination({uid:f.uid},'quirofano');
  assert.deepEqual(sent,['/disposicion quirofano']);
  assert.equal(f.s.read().patient.caseEnded,false);
  await f.advance(3.5);
  assert.equal(f.s.read().patient.closure?.destination,'quirofano');
  assert.equal(f.s.read().progress.receipts.length,1);
 }finally{f.s.dispose();}
});
