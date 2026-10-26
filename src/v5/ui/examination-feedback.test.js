import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from '../clinical/guard-session.js';
import {createClinicalInterface} from './clinical-controller.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
function panel(session,send){
 const feedback={hidden:true,textContent:'',dataset:{}},content={dataset:{}};
 const document={getElementById:id=>id==='examFeedback'?feedback:id==='modalContent'?content:null,
  querySelector:()=>null};
 const ui=createClinicalInterface({document,session:()=>session,open:()=>{},close:()=>{},send,onTalk:()=>{},notify:()=>{}});
 ui.openSection({uid:'P1'},'examination');
 return {ui,feedback};
}
const region=id=>({closest:selector=>selector==='[data-exam-region]'?{dataset:{examRegion:id}}:null});

test('a distant region assessment reports its rejection in the examination panel',async()=>{
 const session=createGuardSession({roomId:'exam-ui',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P1',caseId:'CIRR-001'},content,resolveContext:()=>({patientUid:null})});
 let n=0;
 const {ui,feedback}=panel(session,text=>session.post({id:'exam-'+(++n),text}));
 try{
  await ui.handle(region('abdomen'));
  assert.equal(feedback.hidden,false);
  assert.equal(feedback.dataset.status,'rejected');
  assert.match(feedback.textContent,/acercate.*paciente/i);
  assert.equal(session.read().room.transcript.length,1,'stop the remaining maneuvers after the authority refuses examination');
  assert.deepEqual(session.read().patient.examFindings,{});
 }finally{session.dispose();}
});

test('closed patient examination displays the recorded chart without a new pending action',async()=>{
 const session=createGuardSession({roomId:'exam-closed',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P1',caseId:'CIRR-001'},content,resolveContext:()=>({patientUid:'P1'})});
 let n=0;const post=text=>session.post({id:'closed-'+(++n),text});
 try{
  for(const text of ['¿Desde cuándo empezó la hinchazón?','¿Toma alcohol?','/signos',
   '/examen general','/examen inspection','/examen auscultation','/examen percussion','/examen palpation',
   '/estudio hepatograma','/estudio renal','/estudio eco','/estudio paracentesis',
   'Enfermera dieta sin sal','Enfermera espironolactona 100 mg','/diagnostico cirrosis descompensada'])await post(text);
  session.advance(120);await session.flush();await post('/reevaluar');await post('/disposicion sala');
  assert(session.read().patient.closure?.closed);
  const before=n,{ui,feedback}=panel(session,post);
  await ui.handle(region('abdomen'));
  assert.equal(n,before,'a chart review cannot perform another examination');
  assert.equal(feedback.dataset.status,'review');
  assert.match(feedback.textContent,/Atención cerrada.*registrado/i);
 }finally{session.dispose();}
});

test('an examination without a confirmation is reported in the panel',async()=>{
 const session=createGuardSession({roomId:'exam-offline',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P1',caseId:'CIRR-001'},content,resolveContext:()=>({patientUid:'P1'})});
 const {ui,feedback}=panel(session,async()=>undefined);
 try{
  await ui.handle(region('abdomen'));
  assert.equal(feedback.hidden,false);
  assert.equal(feedback.dataset.status,'unconfirmed');
  assert.match(feedback.textContent,/no.*confirm/i);
  assert.deepEqual(session.read().patient.examFindings,{});
 }finally{session.dispose();}
});
