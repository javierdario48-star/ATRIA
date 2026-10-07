import assert from 'node:assert/strict';
import {parseNaturalStudyOrders} from './natural-study-orders.js';
const studies=[
{id:'cbc',label:'Hemograma',aliases:['recuento sanguíneo completo','CBC']},
{id:'renal',label:'Función renal',aliases:['creatinina']},
{id:'gas',label:'Gasometría',aliases:['gases']},
{id:'lact',label:'Lactato',aliases:[]},
{id:'tc',label:'Tomografía abdominal',aliases:['TC abdomen','TAC abdomen']},
{id:'pcr',label:'PCR',aliases:['proteína C reactiva']},
{id:'rx',label:'Radiografía de tórax',aliases:['Rx tórax']}
];
const ids=s=>parseNaturalStudyOrders(s,studies,studies).map(x=>x.id);
assert.deepEqual(ids('Pedime un hemograma'),['cbc']);
assert.deepEqual(ids('Enfermera, solicitá hemograma y función renal'),['cbc','renal']);
assert.deepEqual(new Set(ids('Necesito gases y lactato')),new Set(['gas','lact']));
assert.deepEqual(new Set(ids('Pedí hemograma, creatinina y PCR')),new Set(['cbc','renal','pcr']));
assert.deepEqual(ids('Haceme una tomografía abdominal'),['tc']);
assert.deepEqual(ids('Quiero TC abdomen'),['tc']);
assert.deepEqual(ids('Pedime hemograma y CBC'),['cbc']);
assert.deepEqual(ids('No me pidas hemograma'),[]);
assert.deepEqual(ids('¿Podrías pedir un hemograma?'),[]);
assert.deepEqual(ids('El paciente preguntó si necesita hemograma'),[]);
assert.deepEqual(ids('Quiero banana cuántica'),[]);
assert.deepEqual(ids('La radiografía de tórax salió normal'),[]);
console.log('natural study order parser OK');
