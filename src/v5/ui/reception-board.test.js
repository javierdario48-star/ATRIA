import test from 'node:test';
import assert from 'node:assert/strict';
import {receptionBoardHTML,updateReceptionBoard} from './reception-board.js';
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

// Minimal browser-serialization fixture: disabled attributes and empty data
// attributes are serialized differently from their authored HTML. Root identity
// represents the button subtree a user is actually pressing.
function serializedHost(){
 let html='',root=null,writes=0;const clock={textContent:''};
 return {get innerHTML(){return html;},set innerHTML(value){
  html=value.replace(/ disabled(?=>)/g,' disabled=""').replace(/data-reception-clock>/g,'data-reception-clock="">');
  root={};writes++;
 },get firstElementChild(){return root;},querySelector(){return clock;},get writes(){return writes;},clock};
}
test('four-doctor reception keeps a button subtree through normalized disabled attributes and 100 countdown snapshots',()=>{
 const host=serializedHost(),shift={mode:'competitive',remainingSeconds:1200,patients:[
  {uid:'rival',ownerId:'other',bedId:'B1'}, {uid:'available',bedId:'B2'}]};
 updateReceptionBoard(host,receptionBoardHTML(shift,[],'me'));const root=host.firstElementChild;
 for(let i=1;i<=100;i++){
  assert.equal(updateReceptionBoard(host,receptionBoardHTML({...shift,remainingSeconds:1200-i},[],'me')),false);
  assert.equal(host.firstElementChild,root,'polling must not detach the action subtree');
 }
 assert.equal(host.writes,1);assert.equal(host.clock.textContent,'18:20');
 assert.equal(updateReceptionBoard(host,receptionBoardHTML({...shift,patients:[...shift.patients,{uid:'new',bedId:'B3'}]},[],'me')),true);
});
test('leaving and reopening another dialog invalidates cached reception even if its markup is unchanged',()=>{
 const host=serializedHost(),html=receptionBoardHTML({mode:'coop',remainingSeconds:1200,patients:[]});
 updateReceptionBoard(host,html);host.innerHTML='<h2>Otro panel</h2>';
 assert.equal(updateReceptionBoard(host,html),true);assert.match(host.innerHTML,/Recepción/);
});
