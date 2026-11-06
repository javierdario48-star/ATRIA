import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent as content} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
import {clinicalInterventionEligibility} from './native-medication-eligibility.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {clinicalPolicyTargets} from './clinical-policy-effects.js';
import {createProgressionLedger} from './progression.js';
import {appDiseaseTargetOffsets} from './app-disease-progression.js';
import {choleDiseaseTargetOffsets} from './native-chole.js';
import {confirmedSepsisView487,sepsisCoverage487} from './native-peritonitis.js';

function fixture(caseId,uid='freedom-'+caseId,options={}){
 let sequence=0;
 const c=content.cases.find(c=>c.id===caseId);
 const s=createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Médico',
  patient:{uid,caseId},content,resolveContext:()=>({patientUid:uid}),...options});
 const post=text=>s.post({id:'order-'+(++sequence),text});
 const advance=async seconds=>{s.advance(seconds);await s.flush();};
 return {c,s,post,advance};
}
const pending=ack=>assert(ack.clinical.some(row=>row.status==='pending'),JSON.stringify(ack));

test('hypotension advises against metoprolol but does not prevent the physician administering it',async()=>{
 const f=fixture('CARD-10','hypotensive-beta-freedom');
 try{
  assert(f.s.read().patient.liveVitals.sys<90);
  assert(clinicalInterventionEligibility(f.s.read().patient,f.c,'metoprolol',f.s.read().clock));
  await f.post('Enfermera una vía');pending(await f.post('/tratamiento metoprolol'));
  await f.advance(3);
  const started=f.s.read().patient.administrationLog.find(row=>row.id==='metoprolol');
  assert(started?.clinicalAdvisories?.length);assert.equal(started.status,'administering');
  await f.advance(25);
  const p=f.s.read().patient,row=p.administrationLog.find(row=>row.id==='metoprolol');
  assert.equal(row.status,'completed');
  assert(confirmedClinicalMissteps(p,f.c).adverseCount>0);
 }finally{f.s.dispose();}
});

test('APP volume benefit follows actual delivered millilitres, preserving its 500 ml reference response',async()=>{
 const values=[];
 for(const amount of [0,1,500]){
  const f=fixture('APP-001','fluid-dose-'+amount);
  try{
   if(amount){await f.post('Enfermera una vía');pending(await f.post('Enfermera Ringer '+amount+' ml'));}
   await f.advance(20);values.push(f.s.read().patient.liveVitals);
  }finally{f.s.dispose();}
 }
 const tiny=values[1].sys-values[0].sys,reference=values[2].sys-values[0].sys;
 assert(reference>13);assert(Math.abs(tiny/reference-1/500)<1e-8);
});

test('tiny legacy antibiotic doses cannot provide a complete regimen response in APP, CHOLE or sepsis',async()=>{
 for(const caseId of ['APP-001','CHOLE-001','PERI-PBE-001']){
  const f=fixture(caseId,'tiny-native-'+caseId);
  try{
   await f.post('Enfermera una vía');await f.post('Enfermera ceftriaxona 1 mg');
   if(caseId!=='PERI-PBE-001')await f.post('Enfermera metronidazol 1 mg');
   await f.advance(3);const p=f.s.read().patient,none={...p,administrationLog:[],treatments:[]};
   if(caseId==='APP-001')assert.deepEqual(appDiseaseTargetOffsets(p,f.c,360),appDiseaseTargetOffsets(none,f.c,360));
   if(caseId==='CHOLE-001')assert.deepEqual(choleDiseaseTargetOffsets(p,f.c,360),choleDiseaseTargetOffsets(none,f.c,360));
   if(caseId==='PERI-PBE-001'){
    const coverage=sepsisCoverage487(confirmedSepsisView487(p,360),f.c,360);
    assert(coverage.score<=.001,'a thousandth dose must not gain the old 15% minimum response');
   }
  }finally{f.s.dispose();}
 }
});

test('CARD-09 can start directed medicine while current cultures/report/history remain incomplete',async()=>{
 const f=fixture('CARD-09');
 try{
  await f.post('Enfermera una vía');
  await f.post('/estudio g_card09_cultures');
  const before=f.s.read();
  assert.equal(before.patient.orders[0].status,'pending');
  assert.equal(clinicalInterventionEligibility(before.patient,f.c,'ampicillin',before.clock).reason,'clinical-evidence-required');
  const order=await f.post('Enfermera ampicilina 2 g IV');pending(order);
  assert.equal(f.s.read().patient.administrationLog.length,0,'a prescription is not delivered medicine');
  await f.advance(2);
  let p=f.s.read().patient;
  assert.equal(p.administrationLog[0].id,'ampicillin');
  assert.equal(p.administrationLog[0].status,'administering');
  assert(p.administrationLog[0].dose.amount>0&&p.administrationLog[0].dose.amount<2000);
  assert(p.administrationLog[0].clinicalAdvisories.some(a=>a.code==='clinical-evidence-required'));
  assert.equal(p.treatments.length,0,'starting a thirty-minute infusion is not completion');
  await f.advance(251);
  p=f.s.read().patient;
  assert.equal(p.administrationLog[0].status,'completed');
  assert.equal(p.administrationLog[0].dose.amount,2000);
  assert.equal(p.treatments.length,1);
  const collection=p.orders.find(o=>o.id==='g_card09_cultures');
  assert.equal(collection.status,'done');
  assert.match(collection.result,/incubación.*pendientes/s);
  assert.doesNotMatch(collection.result,/sensible a ampicilina/);
  assert.equal(p.orders.some(o=>o.id==='g_card09_external_cultures'),false);
  assert.equal(f.s.read().progress.xp,0,'drug administration does not award XP');
 }finally{f.s.dispose();}
});

test('documented intracranial bleeding advises against aspirin without preventing real oral delivery',async()=>{
 const f=fixture('NEUR-04');
 try{
  const order=await f.post('Enfermera aspirina 300 mg oral');pending(order);
  await f.advance(3);
  const p=f.s.read().patient,row=p.administrationLog.find(r=>r.id==='aspirin');
  assert.equal(row.route,'oral');assert.equal(row.dose.amount,300);
  assert(row.clinicalAdvisories.some(a=>a.code==='clinical-contraindication'));
  assert(confirmedClinicalMissteps(p,f.c).adverseCount>0,'the existing quality evaluator receives the unsafe clinical decision');
  assert(p.adverseEvents.every(e=>e.kind!=='antithrombotic-bleeding'),'delivery alone does not fabricate immediate hemorrhage');
 }finally{f.s.dispose();}
});

test('positive excessive native doses are executed in their supported route without replacing the recorded dose',async()=>{
 const f=fixture('RESP-01');
 try{
  pending(await f.post('/tratamiento salbutamol 50 mg nebulizados'));
  await f.advance(3);
  const p=f.s.read().patient,row=p.administrationLog.find(r=>r.id==='salbutamol');
  assert.equal(row.dose.amount,50);assert.equal(row.route,'inhaled');
  assert(row.clinicalAdvisories.some(a=>a.code==='dose-outside-regimen'));
  assert(confirmedClinicalMissteps(p,f.c).adverseCount>0);
  assert.equal(f.s.read().progress.xp,0);
 }finally{f.s.dispose();}
});

test('an initially insufficient dose does not conceal a subsequent adequate administration from response or checklist',async()=>{
 const f=fixture('RESP-03','corrected-dose-resp-freedom');
 try{
  pending(await f.post('/tratamiento salbutamol 0.001 mg nebulizados'));
  pending(await f.post('/tratamiento ipratropium 0.5 mg nebulizados'));
  await f.advance(3);
  assert(!f.s.read().closure.fulfilledTreatmentIds.includes('salbutamol'));
  pending(await f.post('/tratamiento salbutamol 5 mg nebulizados'));
  await f.advance(3);
  const p=f.s.read().patient,rows=p.administrationLog.filter(row=>row.id==='salbutamol');
  assert.deepEqual(rows.map(row=>row.dose.amount),[0.001,5],'both real doses remain in the clinical record');
  assert(f.s.read().closure.fulfilledTreatmentIds.includes('salbutamol'),'the real corrected dose satisfies treatment evidence');
  const minute=40,corrected=clinicalPolicyTargets(p,f.c,minute),
   tinyOnly={...p,treatments:p.treatments.filter(row=>row.sourceEventId!==rows[1].sourceEventId),
    administrationLog:p.administrationLog.filter(row=>row.sourceEventId!==rows[1].sourceEventId)};
  assert(corrected.rr<clinicalPolicyTargets(tinyOnly,f.c,minute).rr-1,'the corrected dose supplies its native response');
 }finally{f.s.dispose();}
});

test('new early repeat orders execute as separate doses and an identical transport retry remains one exposure',async()=>{
 const f=fixture('RESP-01');
 try{
  const text='/tratamiento enoxaparin 1 mg/kg SC';
  const first=await f.s.post({id:'same-command',text});pending(first);
  await f.s.post({id:'same-command',text});
  pending(await f.post(text));pending(await f.post(text));
  await f.advance(3);
  const p=f.s.read().patient,rows=p.administrationLog.filter(r=>r.id==='enoxaparin');
  assert.equal(rows.length,3);assert.equal(new Set(rows.map(r=>r.sourceEventId)).size,3);
  assert(rows.slice(1).every(r=>r.clinicalAdvisories.some(a=>a.code==='administration-interval-required')));
  assert(confirmedClinicalMissteps(p,f.c).adverseCount>0);
  assert.equal(f.s.read().progress.xp,0);
 }finally{f.s.dispose();}
});

test('excess morphine uses the existing bounded opioid response after a true forty-milligram administration',async()=>{
 const f=fixture('APP-001');
 try{
  await f.post('Enfermera una vía');pending(await f.post('Enfermera morfina 40 mg IV'));
  await f.advance(3);
  assert.equal(f.s.read().patient.administrationLog.find(r=>r.id==='morphine').dose.amount,40);
  await f.advance(25);
  const p=f.s.read().patient;
  assert(p.liveVitals.rr<f.c.vitals.rr,'native opioid physiology remains active');
  assert(f.s.pharmacologyRead().drugs.find(d=>d.id==='morphine').kinetics.respiratoryRisk);
 }finally{f.s.dispose();}
});

test('unsupported molecule, formulation route and nonpositive/ambiguous doses reject as technical limitations',async()=>{
 const f=fixture('RESP-01');
 try{
  for(const text of ['/tratamiento unknown_molecule 10 mg IV','Enfermera aspirina 300 mg IV',
   'Enfermera salbutamol 0 mg nebulizados','Enfermera salbutamol 5 mg y 2 mg nebulizados']){
   const ack=await f.post(text);
   assert(ack.routeError||ack.clinical.some(r=>r.status==='rejected'),text);
  }
  await f.advance(3);assert.equal(f.s.read().patient.administrationLog.length,0);
 }finally{f.s.dispose();}
});

test('natural route words and weight-based dimensions retain their original native formulation',async()=>{
 const f=fixture('RESP-01','natural-routes-freedom');
 try{
  pending(await f.post('Enfermera salbutamol 5 mg nebulizados'));
  pending(await f.post('Enfermera enoxaparina 1 mg/kg SC'));
  await f.advance(3);
  assert.deepEqual(f.s.read().patient.administrationLog.map(r=>[r.id,r.route,r.dose.amount,r.dose.unit]),
   [['salbutamol','inhaled',5,'mg'],['enoxaparin','sc',1,'mg/kg']]);
 }finally{f.s.dispose();}
});

test('legacy diuretic accepts a real excessive dose and the existing native exposure response remains observable',async()=>{
 const f=fixture('APP-001','furosemide-dose-freedom');
 try{
  await f.post('Enfermera una vía');pending(await f.post('Enfermera furosemida 400 mg IV'));
  await f.advance(3);
  assert.equal(f.s.read().patient.administrationLog.find(r=>r.id==='furosemide').dose.amount,400);
  const initial=f.s.read().patient.liveVitals.sys;
  await f.advance(180);
  assert(f.s.read().patient.liveVitals.sys<initial,'existing excess-diuresis envelope is applied by the native writer');
 }finally{f.s.dispose();}
});

test('existing oral GI formulations use the same delivery owner for excessive and repeated doses',async()=>{
 for(const [caseId,id,clause,amount] of [['ENCEF-001','lactulose','60 ml oral',60],
  ['CIRR-001','espironolactona','200 mg oral',200]]){
  const f=fixture(caseId,'oral-dose-freedom-'+id);
  try{
   pending(await f.post('/tratamiento '+id+' '+clause));await f.advance(2);
   pending(await f.post('/tratamiento '+id+' '+clause));await f.advance(2);
   const rows=f.s.read().patient.administrationLog.filter(r=>r.id===id);
   assert.equal(rows.length,2);assert(rows.every(r=>r.route==='oral'&&r.dose.amount===amount));
   assert(rows.every(r=>r.clinicalAdvisories.some(a=>a.code==='dose-outside-regimen')));
  }finally{f.s.dispose();}
 }
});

test('a tiny executed directed antibiotic dose cannot supply full response or satisfy the treatment checklist',async()=>{
 const f=fixture('CARD-09','tiny-dose-card09-freedom');
 try{
  await f.post('Enfermera una vía');
  pending(await f.post('/tratamiento ampicillin 2 mg IV'));pending(await f.post('/tratamiento ceftriaxone 2 g IV'));
  await f.advance(253);
  const p=f.s.read().patient,minute=f.s.read().clock.nativeMinute;
  const untreated=clinicalPolicyTargets({...p,treatments:[],administrationLog:[]},f.c,minute);
  const tiny=clinicalPolicyTargets(p,f.c,minute);
  assert(Math.abs(tiny.temp-untreated.temp)<.001,'a one-thousandth dose cannot receive the full authored antibiotic effect');
  assert(!f.s.read().closure.fulfilledTreatmentIds.includes('ampicillin'));
  assert.equal(f.s.read().progress.xp,0);
 }finally{f.s.dispose();}
});

test('CARD-09 hint waits for requested collection and external report, then recommends executable directed therapy',async()=>{
 const f=fixture('CARD-09','card09-hint-freedom');
 try{
  await f.post('/monitor conectar');await f.post('/diagnostico endocarditis aortica');
  await f.post('/examen general');await f.post('/examen thorax auscultation');
  for(const text of ['¿Cuándo empezó?','¿Tiene antecedentes?','¿Qué medicamentos toma?','¿Tiene alergias?',
   '¿Tuvo infección o cultivos positivos?'])await f.post(text);
  await f.post('Enfermera una vía');await f.post('Enfermera oxígeno 4 L/min');
  for(const id of ['g_card09_cultures','g_card09_external_cultures','g_card09_echo'])await f.post('/estudio '+id);
  const waiting=f.s.clinicalHint();
  assert.notEqual(waiting.action?.kind,'treatment');
  assert.notEqual(waiting.action?.id,'g_card09_cultures','do not reorder a pending collection');
  assert.notEqual(waiting.action?.id,'g_card09_external_cultures','do not reorder a pending external report');
  await f.advance(16);
  const p=f.s.read().patient;
  assert.match(p.orders.find(o=>o.id==='g_card09_external_cultures').result,/48 h.*E\. faecalis sensible a ampicilina/s);
  assert.match(p.orders.find(o=>o.id==='g_card09_cultures').result,/siguen pendientes/);
  const hint=f.s.clinicalHint();assert.equal(hint.action?.id,'ampicillin',JSON.stringify(hint));
  pending(await f.post(hint.action.command));
  assert.notEqual(f.s.clinicalHint().action?.id,'ampicillin','do not recommend a second dose during preparation');
 }finally{f.s.dispose();}
});

function previousCareer(){
 const progress=createProgressionLedger();
 progress.award({kind:'clinical.closure',patientUid:'previous-patient',eventId:'previous-closure',actorId:'doctor',xp:30,closed:true});
 return progress;
}

test('untreated native disease death closes once and keeps its outcome without a physician-caused death debit',async()=>{
 const f=fixture('PERI-SEC-001','natural-death-freedom',{progress:previousCareer()});
 try{
  await f.advance(300);
  const state=f.s.read();assert(state.patient.patientDied);
  assert.equal(state.patient.deathAttribution.classification,'disease');
  assert.equal(state.progress.xp,30);assert.equal(state.progress.penalties.length,0);
  assert.equal(state.room.events.filter(e=>e.type==='clinical.patient-died').length,1);
  await f.advance(30);assert.equal(f.s.read().progress.penalties.length,0);
 }finally{f.s.dispose();}
});

test('native fatal fluid overload records contributing delivered sources and one bounded career debit',async()=>{
 const f=fixture('CIRR-001','attributable-death-freedom',{progress:previousCareer()});
 try{
  await f.post('Enfermera una vía');pending(await f.post('Enfermera Ringer 10 l'));
  await f.advance(720);await f.advance(20);
  const state=f.s.read();assert(state.patient.patientDied);
  assert.equal(state.patient.deathAttribution.classification,'treatment-contributed');
  assert.deepEqual(state.patient.deathAttribution.actorIds,['doctor']);
  assert.deepEqual(state.patient.deathAttribution.sourceEventIds,[state.patient.administrationLog.find(r=>r.id==='fluid').sourceEventId]);
  assert.equal(state.progress.penalties.length,1);assert.equal(state.progress.xp,15);
  await f.advance(30);assert.equal(f.s.read().progress.penalties.length,1);
  const checkpoint=await f.s.checkpoint();
  const restored=createGuardSession({roomId:'attributable-death-freedom',mode:'solo',actorId:'doctor',actorName:'Médico',
   patient:{uid:'attributable-death-freedom',caseId:'CIRR-001'},content,checkpoint,resolveContext:()=>({patientUid:'attributable-death-freedom'})});
  try{restored.advance(30);assert.equal(restored.read().progress.penalties.length,1);}finally{restored.dispose();}
 }finally{f.s.dispose();}
});

async function cooperativeFluidDeath(amounts){
 const uid='cooperative-fluid-causality-'+amounts.join('-');
 const members=amounts.map((_,index)=>({id:String.fromCharCode(97+index),name:'Doctor '+index}));
 const s=createGuardSession({roomId:uid,mode:'coop',actorId:'a',actorName:'Doctor 0',members,
  authenticate:id=>({id,roomId:uid}),patient:{uid,caseId:'CIRR-001'},content,
  resolveContext:()=>({patientUid:uid}),progress:previousCareer()});
 try{
  await s.post({id:'access',text:'Enfermera una vía'},'a');
  for(let index=0;index<amounts.length;index++)
   pending(await s.post({id:'fluid-'+index,text:'Enfermera Ringer '+amounts[index]+' ml'},members[index].id));
  s.advance(720);await s.flush();s.advance(20);await s.flush();
  const state=s.read();assert(state.patient.patientDied);
  return state;
 }finally{s.dispose();}
}

test('an innocuous fluid dose from a teammate is not a causal death source or career debit',async()=>{
 const state=await cooperativeFluidDeath([1,10000]);
 assert.deepEqual(state.patient.deathAttribution.actorIds,['b']);
 assert.deepEqual(state.patient.deathAttribution.sourceEventIds,
  [state.patient.administrationLog.find(row=>row.actorId==='b').sourceEventId]);
 assert.equal(state.progress.penalties[0].actorId,'b');
});

test('jointly lethal fluid doses retain both responsible doctors',async()=>{
 const state=await cooperativeFluidDeath([5000,5000]);
 assert.deepEqual(state.patient.deathAttribution.actorIds,['a','b']);
 assert.equal(state.patient.deathAttribution.sourceEventIds.length,2);
});

test('independently lethal fluid doses do not let either responsible doctor hide behind the other dose',async()=>{
 const state=await cooperativeFluidDeath([10000,10000]);
 assert.deepEqual(state.patient.deathAttribution.actorIds,['a','b']);
 assert.equal(state.patient.deathAttribution.sourceEventIds.length,2);
});

test('alternative jointly lethal fluid groups retain every causal doctor',async()=>{
 const state=await cooperativeFluidDeath([2000,2000,6000]);
 assert.deepEqual(state.patient.deathAttribution.actorIds,['a','b','c']);
 assert.equal(state.patient.deathAttribution.sourceEventIds.length,3);
});
