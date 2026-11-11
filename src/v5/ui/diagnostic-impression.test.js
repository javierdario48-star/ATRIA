import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {diagnosisEditorHTML,diagnosisSuggestionsHTML,diagnosisBadgeLabel,destinationButtonsHTML,createPatientClinicalOverlay} from './diagnostic-impression.js';
import {therapyHTML} from './clinical-panels.js';
import {createClinicalInterface} from './clinical-controller.js';
const cases=JSON.parse(fs.readFileSync(new URL('../content/cases.json',import.meta.url)));

test('diagnostic vocabulary offers all original peritonitis variants without identifying a correct answer',()=>{
 const html=diagnosisSuggestionsHTML(cases,'peritonitis');
 for(const label of ['Peritonitis bacteriana espontánea','Peritonitis secundaria','Peritonitis terciaria'])assert(html.includes(label));
 assert.match(diagnosisSuggestionsHTML(cases,'PBE'),/Peritonitis bacteriana espontánea/);
 assert(!/correcto|correcta|APP-001|PERI-SEC-001|compatible/.test(html.split('<p')[0]));
 assert.match(diagnosisSuggestionsHTML(cases,'peritonitis'),/impresión amplia/i);
});
test('the same editor saves, clears and presents canonical diagnosis safely; spectators can only read',()=>{
 const p={uid:'P1',diagnosis:'<script>bad</script>'};
 const edit=diagnosisEditorHTML(p);
 assert(edit.includes('&lt;script&gt;'));assert(!edit.includes('<script>'));
 assert.match(edit,/data-action="save-diagnosis"/);assert.match(edit,/data-action="clear-diagnosis"/);
 const read=diagnosisEditorHTML(p,{readOnly:true});
 assert.match(read,/readonly/);assert(!read.includes('data-action="save-diagnosis"'));
 assert(!read.includes('data-action="clear-diagnosis"'));
 assert.equal(diagnosisBadgeLabel(cases,''),'✎ Impresión diagnóstica');
 assert.equal(diagnosisBadgeLabel(cases,'peritonitis'),'✎ Precisar: peritonitis');
 assert.equal(diagnosisBadgeLabel(cases,'cirrosis'),'🩺 cirrosis ✎');
});
test('destinations render exactly the authority-provided choices; unavailable options do not appear',()=>{
 assert.equal(destinationButtonsHTML([]),'');
 const html=destinationButtonsHTML(['observacion']);
 assert.match(html,/data-destination="observacion"/);
 assert(!html.includes('sala'));assert(!html.includes('disabled'));assert(!html.includes('quirofano'));
});
test('consultation history distinguishes the actual specialist refusal from acceptance and pending requests',()=>{
 const p={consults:[{id:'cirugia',accepted:false,status:'rejected',advice:'Falta diagnóstico.'},
  {id:'cirugia',accepted:true,status:'done',advice:'Evaluación urgente.'}],pendingConsults:[{id:'cirugia'}]};
 const html=therapyHTML(p);
 assert.match(html,/Rechazada.*Falta diagnóstico/s);
 assert.match(html,/Aceptada.*Evaluación urgente/s);
 assert.match(html,/Respuesta pendiente/);
 assert(!html.includes('Recepción confirmada · derivación pendiente'));
});
test('an unchanged bedside projection preserves its existing buttons despite DOM attribute serialization',()=>{
 let html='',writes=0;
 const root={dataset:{},hidden:true};
 // Browsers serialize a valueless data attribute with an empty string value.
 Object.defineProperty(root,'innerHTML',{get:()=>html,set:value=>{writes++;html=value.replace('data-patient-diagnosis ','data-patient-diagnosis="" ');}});
 const overlay=createPatientClinicalOverlay({document:{getElementById:()=>root},window:{},cases});
 const world={uid:'P1',x:144,y:350},clinical={patient:{uid:'P1',diagnosis:'apendicitis'},eligibleDestinations:[]};
 overlay.update(world,clinical);overlay.update(world,structuredClone(clinical));
 assert.equal(writes,1,'an existing focus or pointer target must survive an identical maintenance update');
 overlay.update(world,{...clinical,patient:{...clinical.patient,diagnosis:'apendicitis aguda'}});
 assert.equal(writes,2,'changed clinical content still renders');
});

test('diagnosis editor closes before network acknowledgement, pins patient and preserves rejected draft',async()=>{
 const nodes={
  modal:{dataset:{}},modalContent:{dataset:{}},
  diagnosisInput:{value:'',readOnly:false,focus(){}},
  diagnosisSuggestions:{innerHTML:''}
 };
 const document={getElementById:id=>nodes[id]||null};
 let current={uid:'P1',bedId:'A',diagnosis:'',liveVitals:true,caseEnded:false};
 let closes=0,resolve,requests=[],messages=[];
 const controller=createClinicalInterface({
  document,session:()=>({read:()=>({patient:current,canEdit:true})}),
  open:(_html,panel)=>{nodes.modal.dataset.panel=panel;nodes.diagnosisInput={value:current.diagnosis,readOnly:false,focus(){}};},
  close:()=>{closes++;nodes.modal.dataset.panel='';},
  send:(command,options)=>{requests.push({command,options});return new Promise(r=>resolve=r);},
  notify:text=>messages.push(text),cases:[]
 });
 controller.showDiagnosis(current);
 nodes.diagnosisInput.value='apendicitis aguda';
 const pending=controller.saveDiagnosis();
 assert.equal(closes,1,'valid save dismisses the editor without awaiting network');
 const duplicate=controller.saveDiagnosis();
 await Promise.resolve();
 assert.equal(requests.length,1,'rapid duplicate tap must not post twice');
 assert.equal(requests[0].options.patientUid,'P1');
 assert.equal(requests[0].command,'/diagnostico apendicitis aguda');
 current={...current,uid:'P2',bedId:'B'};
 resolve({status:'received',clinical:[{status:'rejected'}]});
 await Promise.all([pending,duplicate]);
 current={...current,uid:'P1',bedId:'A'};
 controller.showDiagnosis(current);
 assert.equal(nodes.diagnosisInput.value,'apendicitis aguda','rejected draft survives patient changes');
 assert.ok(messages.some(message=>/no se confirm/i.test(message)));
});

test('late diagnosis response does not close a reopened editor for the same patient',async()=>{
 const nodes={modal:{dataset:{}},modalContent:{dataset:{}},diagnosisInput:{value:'',readOnly:false,focus(){}},
  diagnosisSuggestions:{innerHTML:''}};
 const patient={uid:'P1',bedId:'A',diagnosis:'',liveVitals:true,caseEnded:false};
 let closeCount=0,resolve;
 const controller=createClinicalInterface({
  document:{getElementById:id=>nodes[id]||null},
  session:()=>({read:()=>({patient,canEdit:true})}),
  open:(_html,panel)=>{nodes.modal.dataset.panel=panel;nodes.diagnosisInput={value:patient.diagnosis,readOnly:false,focus(){}};},
  close:()=>{closeCount++;nodes.modal.dataset.panel='';},
  send:()=>new Promise(r=>resolve=r),notify:()=>{},cases:[]
 });
 controller.showDiagnosis(patient);
 nodes.diagnosisInput.value='apendicitis';
 const pending=controller.saveDiagnosis();
 await Promise.resolve();
 controller.showDiagnosis(patient);
 nodes.diagnosisInput.value='peritonitis';
 resolve({status:'received',clinical:[{status:'executed'}]});
 await pending;
 assert.equal(closeCount,1);
 assert.equal(nodes.modal.dataset.panel,'diagnosis','old response cannot dismiss a new editor');
 assert.equal(nodes.diagnosisInput.value,'peritonitis','old response cannot overwrite a newer draft');
});
