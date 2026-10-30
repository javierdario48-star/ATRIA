import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent as content} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
import {createClinicalInterface} from '../ui/clinical-controller.js';

function fixture(caseId) {
 let sequence=0;
 const c=content.cases.find(c=>c.id===caseId),uid='regression-'+caseId;
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
