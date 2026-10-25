import test from 'node:test';
import assert from 'node:assert/strict';
import {receptionBoardHTML} from './reception-board.js';
test('reception shows two independent boxes, labels and countdown',()=>{
 const h=receptionBoardHTML({mode:'competitive',remainingSeconds:1260,patients:[
 {uid:'a',bedId:'B1',caseId:'X',triage:{state:'critical',label:'CRÍTICO'}},
 {uid:'b',bedId:'B3',caseId:'X',ownerId:'me',triage:{state:'stable',label:'ESTABLE'}}]},[{id:'X',demo:'Ana',chief:'Dolor'}],'me');
 assert.match(h,/data-acuity="critical"/);assert.match(h,/data-acuity="stable"/);
 assert.match(h,/21:00/);assert.match(h,/B3/);assert.match(h,/A tu cargo/);
});

test('reception separates current cases from accepted departures, with an available box',()=>{
 const html=receptionBoardHTML({mode:'solo',remainingSeconds:900,patients:[
  {uid:'a',bedId:'B1',caseId:'X',closed:true,departed:true,destination:'quirofano',triage:{state:'urgent',label:'URGENTE'}},
  {uid:'b',bedId:'B1',caseId:'X',triage:{state:'stable',label:'ESTABLE'}}]},[{id:'X',demo:'Ana'}]);
 assert.match(html,/Pacientes en atención · 1/);
 assert.match(html,/Atenciones finalizadas · 1/);
 assert.match(html,/Derivado a Quirófano · Box liberado/);
 assert.match(html,/data-patient-uid="a" disabled/);
 assert.match(html,/data-patient-uid="b"\s*>Ir al box/);
});

test('competitive reception distinguishes available patients, owned beds and rival cases',()=>{
 const h=receptionBoardHTML({mode:'competitive',remainingSeconds:900,patients:[
  {uid:'free',bedId:'B1',caseId:'C',triage:{state:'stable',label:'ESTABLE'}},
  {uid:'mine',bedId:'B2',caseId:'C',ownerId:'a',triage:{state:'stable',label:'ESTABLE'}},
  {uid:'busy',bedId:'B3',caseId:'C',ownerId:'b',triage:{state:'urgent',label:'URGENTE'}}
 ]},[{id:'C',demo:'Paciente'}],'a');
 assert.match(h,/data-patient-uid="free"[^>]*>Atender y asignarme/);
 assert.match(h,/data-patient-uid="mine"[^>]*>Volver a mi box/);
 assert.match(h,/data-patient-uid="busy" disabled>Ocupado/);
 assert.match(h,/A cargo de otro médico/);
});
