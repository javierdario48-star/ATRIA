import test from 'node:test';
import assert from 'node:assert/strict';
import {receptionBoardHTML} from './reception-board.js';
import {SHIFT_DURATION_SECONDS} from '../clinical/shift-flow.js';

const cases=[{id:'critical',chief:'Hematemesis',risk:'bleed',vitals:{bp:'70/40',hr:132,rr:29,spo2:88,temp:37.2}},
 {id:'stable',chief:'Control',vitals:{bp:'120/80',hr:70,rr:16,spo2:98,temp:36.8}}];
const patients=[{uid:'patient-a',caseId:'critical',bedId:'B3',name:'Paciente A'},
 {uid:'patient-b',caseId:'stable',bedId:'B7',name:'Paciente B'}];

test('reception distinguishes simultaneous critical and stable arrivals without using an unconnected monitor',()=>{
 const html=receptionBoardHTML({patients,cases,elapsedSeconds:0});
 assert.match(html,/data-patient-uid="patient-a" data-acuity="critical"/);
 assert.match(html,/data-patient-uid="patient-b" data-acuity="stable"/);
 assert.match(html,/CRÍTICO/);
 assert.match(html,/ESTABLE/);
 assert.match(html,/24 h restantes/);
 assert.match(html,/Triaje de ingreso/);
});

test('reception reflects the correct closing state and guards against HTML in patient names',()=>{
 const html=receptionBoardHTML({patients:[{...patients[0],name:'<svg/onload=alert(1)>'}],cases,
  clinical:{patient:{uid:'patient-a',caseEnded:true}},elapsedSeconds:SHIFT_DURATION_SECONDS});
 assert.match(html,/ATENCIÓN CERRADA/);
 assert.doesNotMatch(html,/<svg\/onload/);
 assert.match(html,/0 h restantes/);
});
