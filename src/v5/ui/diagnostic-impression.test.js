import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {diagnosisEditorHTML,diagnosisSuggestionsHTML,diagnosisBadgeLabel,destinationButtonsHTML} from './diagnostic-impression.js';
import {therapyHTML} from './clinical-panels.js';
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
