import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStudyService} from './studies.js';

const cases=[
 {id:'CASE-A',studies:[
  {id:'hemograma',label:'Hemograma',aliases:['hemograma completo'],type:'lab',result:'Anemia documentada en A.'},
  {id:'eco',label:'Ecografía abdominal',aliases:['ecografia'],type:'imaging',result:'Ascitis documentada en A.'}
 ]},
 {id:'CASE-B',studies:[
  {id:'hemograma',label:'Hemograma',aliases:['hemograma completo'],type:'lab',result:'Leucocitosis documentada en B.'},
  {id:'lipasa',label:'Lipasa sérica',aliases:['lipasa'],type:'lab',result:'Lipasa elevada documentada en B.'}
 ]}
];
const patient=(uid='p-a',caseId='CASE-A')=>({uid,caseId,orders:[]});
const command=(id,eventId='e-1',atMinute=10)=>({id,eventId,actorId:'doctor-1',atMinute});

test('all catalogued studies are orderable for every case without creating treatments',()=>{
 const service=createStudyService(cases),catalog=service.catalog();
 assert(catalog.some(s=>s.id==='hemograma'));
 assert(catalog.some(s=>s.id==='lipasa'));
 assert(catalog.some(s=>s.id==='tc_cerebral'));
 for(const c of cases){
  const p=patient('patient-'+c.id,c.id);
  p.interventions=[];p.administrationLog=[];p.monitorTherapies=[];
  for(const [index,study] of catalog.entries()){
   const result=service.request(p,command(study.id,c.id+':'+index));
   assert.equal(result.status,'pending',c.id+':'+study.id);
   assert.equal(result.patientUid,p.uid);
   assert.equal(result.eventId,c.id+':'+index);
  }
  assert.equal(p.orders.length,catalog.length);
  assert(p.orders.every(o=>o.status==='pending'&&typeof o.result==='string'&&o.result.length>0));
  assert.deepEqual([p.interventions,p.administrationLog,p.monitorTherapies],[[],[],[]]);
 }
});

test('same-case native results win and another case abnormal result never leaks',()=>{
 const service=createStudyService(cases),a=patient(),b=patient('p-b','CASE-B');
 service.request(a,command('hemograma','a-native'));
 service.request(b,command('hemograma','b-native'));
 service.request(a,command('lipasa','a-fallback'));
 assert.equal(a.orders[0].result,'Anemia documentada en A.');
 assert.equal(b.orders[0].result,'Leucocitosis documentada en B.');
 assert.equal(a.orders[0].resultSource,'native');
 assert.equal(a.orders[1].resultSource,'universal-fallback');
 assert.match(a.orders[1].result,/Sin alteraciones significativas/);
 assert(!a.orders[1].result.includes('elevada documentada en B'));
});

test('turnaround uses original game minutes and results become available exactly once',()=>{
 const service=createStudyService(cases),p=patient();
 service.request(p,command('hemograma'));
 const order=p.orders[0];
 assert.equal(order.requestedAtMinute,10);
 assert.equal(order.readyAtMinute,45);
 assert.equal(order.sourceEventId,'e-1');
 assert.equal(order.actorId,'doctor-1');
 assert.deepEqual(service.advance(p,44.999),[]);
 assert.equal(order.status,'pending');
 const ready=service.advance(p,45);
 assert.equal(ready.length,1);
 assert.equal(ready[0].status,'done');
 assert.equal(ready[0].patientUid,p.uid);
 assert.equal(ready[0].result,'Anemia documentada en A.');
 assert.equal(order.status,'done');
 assert.deepEqual(service.advance(p,45),[]);
 assert.deepEqual(service.advance(p,500),[]);
 assert.deepEqual(service.advance(p,0),[]);
});

test('retries preserve one order and cannot move its deadline',()=>{
 const service=createStudyService(cases),p=patient();
 const original=service.request(p,command('hemograma'));
 const retry=service.request(p,command('hemograma','e-1',100));
 assert.deepEqual(retry,original);
 assert.equal(p.orders.length,1);
 assert.equal(p.orders[0].readyAtMinute,45);
 const second=service.request(p,command('hemograma','e-2',200));
 assert.equal(second.status,'pending');
 assert.equal(p.orders.length,1);
 assert.equal(p.orders[0].sourceEventId,'e-1');
});

test('one event cannot select a different study, actor or patient',()=>{
 const service=createStudyService(cases),p=patient(),other=patient('p-other','CASE-B');
 service.request(p,command('hemograma'));
 assert.equal(service.request(p,command('eco')).status,'rejected');
 assert.equal(service.request(p,{...command('hemograma'),actorId:'doctor-2'}).status,'rejected');
 assert.equal(service.request(other,command('hemograma')).status,'rejected');
 assert.equal(p.orders.length,1);
 assert.equal(other.orders.length,0);
});

test('completed duplicate requests return a matching result receipt without new effects',()=>{
 const service=createStudyService(cases),p=patient();
 service.request(p,command('hemograma'));
 service.advance(p,100);
 for(const eventId of ['e-1','e-2']){
  const result=service.request(p,command('hemograma',eventId,100));
  assert.equal(result.status,'executed');
  assert.equal(result.receipt.patientUid,p.uid);
  assert.equal(result.receipt.eventId,eventId);
  assert.equal(result.receipt.sourceEventId,'e-1');
  assert.equal(result.receipt.studyId,'hemograma');
  assert.equal(result.receipt.result,'Anemia documentada en A.');
 }
 assert.equal(p.orders.length,1);
 assert.deepEqual(service.advance(p,200),[]);
});

test('events stay bound after a patient snapshot is restored into another object',()=>{
 const service=createStudyService(cases),p=patient();
 service.request(p,command('hemograma'));
 const restored=structuredClone(p);
 assert.equal(service.request(restored,command('eco')).status,'rejected');
 assert.equal(service.request(restored,command('hemograma')).status,'pending');
 assert.equal(restored.orders.length,1);
 const reconstructed=createStudyService(cases);
 assert.equal(reconstructed.request(restored,command('eco')).status,'rejected');
 assert.equal(restored.orders.length,1);
});

test('catalog callers cannot change definitions and requests do not modify source content',()=>{
 const input=structuredClone(cases),before=structuredClone(input),service=createStudyService(input);
 const displayed=service.catalog();
 displayed[0].id='morphine';displayed[0].aliases.push('morfina');displayed.length=0;
 const p=patient();
 assert.equal(service.request(p,command('hemograma')).status,'pending');
 assert(service.catalog().some(s=>s.id==='hemograma'));
 assert.equal(service.request(p,command('morphine','medicine')).status,'rejected');
 assert.equal(p.orders.length,1);
 assert.deepEqual(input,before);
 const ready=service.advance(p,100);
 ready[0].result='changed by the view';
 assert.equal(p.orders[0].result,'Anemia documentada en A.');
});

test('unknown studies, unknown cases and invalid request times leave orders unchanged',()=>{
 const service=createStudyService(cases),p=patient();
 for(const order of [command('morphine'),command('hemograma','negative',-1),
  command('hemograma','nan',NaN),command('hemograma','string','10'),
  {...command('hemograma','no-actor'),actorId:''},
  {...command('hemograma','no-event'),eventId:''}]){
  assert.equal(service.request(p,order).status,'rejected');
 }
 assert.deepEqual(p.orders,[]);
 const unknown=patient('p-unknown','UNKNOWN');
 assert.equal(service.request(unknown,command('hemograma','unknown-case')).status,'rejected');
 assert.deepEqual(unknown.orders,[]);
 assert.throws(()=>service.advance(p,NaN),/minute/i);
 assert.deepEqual(p.orders,[]);
});

test('all 25 cases can complete global studies without changing their original case content',()=>{
 const canonical=JSON.parse(readFileSync(new URL('../content/cases.json',import.meta.url),'utf8'));
 const before=structuredClone(canonical),service=createStudyService(canonical),catalog=service.catalog();
 assert.equal(canonical.length,25);
 let ordered=0,completed=0;
 for(const c of canonical){
  const p=patient('canonical:'+c.id,c.id);
  for(const study of catalog){
   const eventId=c.id+':'+study.id;
   assert.equal(service.request(p,command(study.id,eventId,0)).status,'pending');
   const order=p.orders.at(-1),native=c.studies.find(x=>x.id===study.id);
   if(native){assert.equal(order.result,native.result);assert.equal(order.resultSource,'native');}
   assert.equal(order.patientUid,p.uid);
   assert.equal(order.sourceEventId,eventId);
   ordered++;
  }
  const end=Math.max(...p.orders.map(o=>o.readyAtMinute));
  completed+=service.advance(p,end).length;
  assert(p.orders.every(o=>o.status==='done'));
  assert.deepEqual(service.advance(p,end+1),[]);
 }
 assert.equal(ordered,25*catalog.length);
 assert.equal(completed,ordered);
 assert.deepEqual(canonical,before);
});
