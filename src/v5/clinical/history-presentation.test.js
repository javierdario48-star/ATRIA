import test from 'node:test';
import assert from 'node:assert/strict';
import {historyHTML,patientHTML} from '../ui/clinical-panels.js';
test('history shows acquired evidence and real order states while preserving unknown signs and untouched anatomy',()=>{
 const p={uid:'P1',caseId:'APP-001',liveVitals:{hr:123,sys:88,dia:56,rr:28,temp:39,spo2:90},
  intentHistory:[{answer:'Dolor desde ayer.'}],exam:{palpation:{rows:[{organ:'Abdomen',text:'Blumberg positivo.'}]}},
  orders:[{id:'app_ct',label:'TC',status:'pending',result:'DO NOT REVEAL'}],treatments:[],pendingTreatments:[],consults:[]};
 const html=historyHTML(p);
 assert.match(html,/Dolor desde ayer/);assert.match(html,/Blumberg/);assert.match(html,/Pendiente/);
 assert.doesNotMatch(html,/88\/56|FC 123|DO NOT REVEAL|Esplenomegalia/);
 assert.match(html,/todavía no se registraron/);
});
test('patient presentation is shared without rewriting HTML by string replacements and escapes clinical text',()=>{
 const html=patientHTML({caseId:'APP-001',diagnosis:'<script>bad</script>'});
 assert.match(html,/&lt;script&gt;bad/);assert.match(html,/data-action="clinical-history"/);
 assert.doesNotMatch(html,/ascitis|<script>/);
});
