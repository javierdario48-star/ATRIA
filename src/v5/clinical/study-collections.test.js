import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent as content} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
import {createStudyService} from './studies.js';
import {patientStudyOrders} from './study-evidence.js';
import {selectClinicalHint} from './clinical-hints.js';
import {clinicalInterventionEligibility} from './native-medication-eligibility.js';
import {clinicalCompletions,studySearchChoices} from '../ui/clinical-autocomplete.js';

const id='g_card09_cultures',caseData=content.cases.find(c=>c.id==='CARD-09');
function fixture(checkpoint){
 const s=createGuardSession({roomId:'collection-quantity',mode:'solo',actorId:'doctor',actorName:'Médica',
  patient:{uid:'P',caseId:caseData.id},content,resolveContext:()=>({patientUid:'P'}),checkpoint});
 const advance=async seconds=>{s.advance(seconds);await s.flush();};
 const missing=()=>s.clinicalHintRequirements().filter(r=>r.anyOf?.some(group=>group.includes(id)));
 const hint=()=>selectClinicalHint({patient:s.read().patient,caseData,content,
  requirements:missing(),clock:s.read().clock,destination:'sala'});
 return {s,advance,missing,hint};
}

// Losing the explicit quantity at the scanner or service boundary turns one
// collected pair into the catalog's three-pair bundle and closes the gate early.
test('one requested culture pair stays one collected pair and leaves the three-pair requirement open',async()=>{
 const f=fixture();
 try{
  const first=await f.s.post({id:'one',text:'Enfermera un par de hemocultivos'});
  assert.equal(first.clinical[0]?.status,'pending');
  let order=f.s.read().patient.orders[0];
  assert.equal(order.collection?.requestedCount,1);
  assert.equal(order.collection.collectedCount,0);
  assert.equal(order.collection.status,'pending');
  assert.equal(order.collection.microbiologyStatus,'pending');
  assert.match(order.label,/^(?:Un|1) par de hemocultivos/);
  assert.equal(order.result,undefined,'the pending collection cannot publish its future collection report');
  assert.equal(first.clinical[0].receipt?.result,undefined,'collection acknowledgement cannot disclose a report');
  assert(f.s.read().messages.some(row=>row.role==='nurse'&&/^(?:Un|1) par/.test(row.text)&&/toma pendiente/.test(row.text)));
  assert.equal(f.hint().chargeable,false,'waiting for the requested specimen is free');
  assert.equal(f.hint().action.kind,'wait');
  await f.advance(4.99);assert.equal(f.s.read().patient.orders[0].collection.collectedCount,0);
  await f.advance(.01);
  const p=f.s.read().patient;order=p.orders[0];
  assert.equal(order.status,'done');assert.equal(order.collection.status,'collected');
  assert.equal(order.collection.collectedCount,1);assert.equal(order.collection.microbiologyStatus,'pending');
  assert.match(order.result,/^(?:Un|1) par/);
  assert.match(order.result,/incubación.*siguen pendientes/s);
  assert.doesNotMatch(order.result,/Tres pares|E\. faecalis|sensible a ampicilina/);
  assert(f.s.read().messages.some(row=>row.role==='nurse'&&/toma confirmada/.test(row.text)&&/siguen pendientes/.test(row.text)));
  assert.equal(patientStudyOrders(p,'done',caseData).some(o=>o.id===id),false);
  assert.equal(f.missing().length,1);
  assert.equal(clinicalInterventionEligibility(p,caseData,'ampicillin',f.s.read().clock)?.reason,'clinical-evidence-required');
  assert.match(f.hint().action.label,/^(?:Dos|2) pares/,'Vega asks for the missing quantity');
  assert.match(f.hint().action.command,/(?:dos|2) pares de hemocultivos/i);
 }finally{f.s.dispose();}
});

test('additional pairs are a fresh pending collection and a replay never collects them twice',async()=>{
 let f=fixture();
 try{
  await f.s.post({id:'one',text:'Enfermera un par de hemocultivos'});await f.advance(5);
  const initial=structuredClone(f.s.read().patient.orders[0]);
  const text='Enfermera dos pares más de hemocultivos';
  const second=await f.s.post({id:'additional',text});
  assert.equal(second.routeError,null);assert.equal(second.clinical[0]?.status,'pending');
  await f.s.post({id:'additional',text});
  assert.equal(f.s.read().patient.orders.length,2);
  assert.equal(f.s.read().patient.orders[1].collection?.requestedCount,2);
  assert.equal(f.missing().length,1,'a pending additional order is not collected evidence');
  assert.equal(f.hint().chargeable,false);
  const checkpoint=await f.s.checkpoint();f.s.dispose();f=fixture(checkpoint);
  await f.s.post({id:'additional',text});
  assert.equal(f.s.read().patient.orders.length,2);
  await f.advance(5);
  const p=f.s.read().patient;
  assert.deepEqual(p.orders[0],initial,'later collections cannot rewrite earlier specimens');
  assert.equal(p.orders[1].collection.collectedCount,2);
  assert.equal(p.orders[1].collection.microbiologyStatus,'pending');
  assert.match(p.orders[1].result,/^(?:Dos|2) pares/);
  assert.doesNotMatch(p.orders[1].result,/E\. faecalis|sensible a ampicilina/);
  assert.equal(f.missing().length,0,'three actually collected pairs satisfy collection only');
  assert.equal(p.orders.some(o=>o.id==='g_card09_external_cultures'),false);
  const completed=await f.s.post({id:'additional',text});
  assert.equal(completed.clinical[0].receipt.collection.collectedCount,2);
  assert.equal(p.orders.length,2);
 }finally{f.s.dispose();}
});

test('explicit three-pair and generic catalog requests keep the authored bundle while pending aliases stay one order',async()=>{
 for(const phrase of ['Enfermera tres pares de hemocultivos','Enfermera hemocultivos','/estudio '+id]){
  const f=fixture();
  try{
   await f.s.post({id:'first',text:phrase});
   await f.s.post({id:'pending-alias',text:'Enfermera tres pares de hemocultivos'});
   assert.equal(f.s.read().patient.orders.length,1);
   assert.equal(f.s.read().patient.orders[0].collection?.requestedCount,3);
   await f.advance(5);
   assert.equal(f.s.read().patient.orders[0].collection.collectedCount,3);
   assert.equal(f.missing().length,0);
  }finally{f.s.dispose();}
 }
});

test('study search and autocomplete preserve an explicit specimen quantity in the selectable command',()=>{
 for(const [query,count] of [['un par de hemocultivos',1],['dos pares de hemocultivos',2],['tres pares de hemocultivos',3]]){
  const ctx={caseId:caseData.id,cases:content.cases,studies:caseData.studies};
  const rows=studySearchChoices(query,ctx);
  assert.equal(rows.length,1,query);assert.equal(rows[0].id,id);
  assert.equal(rows[0].quantity,count);
  assert.equal(rows[0].command,'/estudio '+query,'the study panel must submit the selected quantity');
  const selected=clinicalCompletions(query,{...ctx,mode:'monitor'}).filter(x=>x.kind==='study');
  assert.equal(selected.length,1,query);
  assert.match(selected[0].command,new RegExp(query,'i'));
  assert.equal(studySearchChoices('cero pares de hemocultivos',ctx).length,0);
 }
});

test('invalid or ambiguous spoken pair quantities reject the entire clinical command',async()=>{
 const f=fixture();
 try{
  for(const [index,quantity] of ['cero','0','-1','1.5','1,5'].entries()){
   const reply=await f.s.post({id:'bad-count-'+index,text:'Enfermera ECG y '+quantity+' pares de hemocultivos'});
   assert.equal(reply.routeError,'study-quantity-unavailable',quantity);
   assert.equal(reply.clinical.length,0,'no partial ECG from a rejected compound command');
  }
  const ambiguous=await f.s.post({id:'ambiguous',text:'Enfermera un par de hemocultivos y dos pares de hemocultivos'});
  assert.equal(ambiguous.routeError,'study-quantity-unavailable');
  assert.equal(f.s.read().patient.orders.length,0);
 }finally{f.s.dispose();}
});

test('collection event identity binds the quantity across restores and duplicate specimen rows never satisfy the bundle',()=>{
 const service=createStudyService([caseData]),p={uid:'P',caseId:caseData.id,orders:[]};
 const command={id,eventId:'one',actorId:'doctor',atMinute:0,atNativeMinute:0,quantity:1};
 service.request(p,command);service.advance(p,5,1);
 const restored=createStudyService([caseData],service.checkpoint());
 assert.equal(restored.request(p,{...command,quantity:3}).reason,'study-event-identity-collision');
 p.orders.push(structuredClone(p.orders[0]),{...structuredClone(p.orders[0]),patientUid:'other'});
 assert.equal(patientStudyOrders(p,'done',caseData).length,0,'duplicate and foreign samples cannot add two more pairs');
 for(const quantity of [0,-1,1.5,Infinity,'3']){
  const before=p.orders.length;
  assert.equal(restored.request(p,{...command,eventId:'bad-'+quantity,quantity}).status,'rejected');
  assert.equal(p.orders.length,before);
 }
});

test('an exact historical pending bundle survives restore without a duplicate recommendation',()=>{
 const definition=caseData.studies.find(study=>study.id===id),p={uid:'P',caseId:caseData.id,orders:[{
  id,label:definition.label,type:definition.type,result:definition.result,patientUid:'P',
  requestedAtMinute:0,readyAtMinute:5,sourceEventId:'historical',actorId:'doctor',status:'pending',nativeResult:true,resultSource:'native'
 }]};
 assert.equal(patientStudyOrders(p,'pending',caseData).length,1);
 const hint=selectClinicalHint({patient:p,caseData,content,clock:{nativeMinute:0,clinicalMinute:0},destination:'sala',
  requirements:[{type:'study',anyOf:[[id]]}]});
 assert.equal(hint.action.kind,'wait');assert.equal(hint.chargeable,false);
 createStudyService([caseData]).advance(p,5,1);
 assert.equal(patientStudyOrders(p,'done',caseData).length,1);
 assert.equal(p.orders[0].result,definition.result,'restoration preserves the exact historical report');
});

test('a count after the specimen name still requests one pair rather than the default bundle',async()=>{
 for(const text of ['Enfermera hemocultivos un par','Enfermera un solo par de hemocultivos']){
  const f=fixture();
  try{
   const reply=await f.s.post({id:'one',text});
   assert.equal(reply.routeError,null,text);
   assert.equal(f.s.read().patient.orders[0]?.collection.requestedCount,1,text);
   await f.advance(5);assert.equal(f.missing().length,1,text);
  }finally{f.s.dispose();}
 }
});
