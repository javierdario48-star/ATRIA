import test from 'node:test';
import assert from 'node:assert/strict';
import {activeNurseGuidance,visibleClinicalRows,selectNurseGuidance,finalNurseMessage} from './guard-message-policy.js';
test('nurse prompts are spaced, deduplicated, and canceled after closure',()=>{
 const cue={id:'surgery',text:'¿Aviso a cirugía?'},seen=new Set();
 assert.equal(selectNurseGuidance({cue,patientId:'p',now:20000,lastPatientAt:19000}),null);
 assert.equal(selectNurseGuidance({cue,patientId:'p',now:40000,concluded:true}),null);
 const line=selectNurseGuidance({cue,patientId:'p',now:40000,seen});
 assert.equal(line.id,'nurse-guidance:p:surgery');
 seen.add('p:surgery');assert.equal(selectNurseGuidance({cue,patientId:'p',now:80000,seen}),null);
 assert.deepEqual(activeNurseGuidance([line],{id:'diagnosis'},'p'),[]);
 assert.deepEqual(activeNurseGuidance([line],cue,'p'),[line]);
});
test('a destination receipt, and only that receipt, produces one final acknowledgment',()=>{
 const state={patient:{uid:'p',closure:{closed:false,destination:'quirofano',eventId:'e1'}}};
 assert.equal(finalNurseMessage(state),null);
 state.patient.closure.closed=true;
 assert.match(finalNurseMessage(state).text,/Cirugía aceptó/);
 assert.equal(finalNurseMessage(state).id,'nurse-final:p:e1');
 const rows=visibleClinicalRows([{role:'nurse',text:'Caso cerrado: cirugía'},
  {role:'patient',text:'Bien doctor'}],{concluded:true});
 assert.deepEqual(rows,[{role:'patient',text:'Bien doctor'}]);
});
