import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalChecklistHTML} from './clinical-checklist.js';
import {closureDecisionHTML} from './clinical-closure-panel.js';

const state=()=>({patient:{
 uid:'P1',diagnosis:'',intentHistory:[],examFindings:{},examDone:false,
 orders:[],treatments:[],pendingTreatments:[],administrationLog:[],
 consults:[],pendingConsults:[],lastVitalsKnown:null,procedures:{},
 caseEnded:false,patientDied:false
},eligibleDestinations:[],canEdit:true});
test('on-demand bedside checklist contains all seven stages without clinical spoilers',()=>{
 const s=state();
 let html=clinicalChecklistHTML(s);
 for(const label of ['Anamnesis','Examen físico','Estudios','Estabilización',
  'Impresión diagnóstica','Tratamiento','Destino'])assert(html.includes(label),label);
 assert.equal((html.match(/<li data-status=/g)||[]).length,7);
 assert(!html.includes('Peritonitis')&&!html.includes('ceftriaxona'));
 s.patient.intentHistory.push({id:'complaint'});
 html=clinicalChecklistHTML(s);
 assert.match(html,/data-status="partial"/);
 assert.match(clinicalChecklistHTML(s,{collapsed:true}),/aria-expanded="false"/);
 assert(!clinicalChecklistHTML(s,{collapsed:true}).includes('Examen físico'));
});
test('closing case offers only server-authorized destinations and cannot skip missing care',()=>{
 const s=state();
 let html=closureDecisionHTML(s);
 assert.match(html,/El servidor aún no habilita/);
 assert(!html.includes('data-destination='));
 assert(html.includes('data-action="close-diagnosis"'));
 s.patient.diagnosis='Peritonitis secundaria';
 s.eligibleDestinations=['observacion','uti'];
 html=closureDecisionHTML(s);
 assert.match(html,/Peritonitis secundaria/);
 assert.match(html,/data-destination="observacion"/);
 assert.match(html,/data-destination="uti"/);
 assert(!html.includes('data-destination="quirofano"'),'no case-dependent invented close choices');
 s.canEdit=false;
 html=closureDecisionHTML(s);
 assert(!html.includes('data-destination='));
 s.canEdit=true;s.patient.caseEnded=true;
 html=closureDecisionHTML(s);
 assert(!html.includes('data-destination='));
});
test('no closure action calculates XP, grants surgery or asserts outcome on its own',()=>{
 const s=state();s.patient.diagnosis='Peritonitis secundaria';
 const rendered=closureDecisionHTML(s);
 assert(!/XP|100\/100|aceptada|éxito quirúrgico/i.test(rendered));
 assert(!rendered.includes('data-action="request-surgery"'));
});
