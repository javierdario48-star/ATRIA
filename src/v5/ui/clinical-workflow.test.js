import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalWorkflow} from './clinical-workflow.js';
const base=()=>({patient:{uid:'p1',intentHistory:[],examFindings:{},orders:[],
 treatments:[],administrationLog:[],pendingTreatments:[],pendingConsults:[],consults:[],
 diagnosis:'',caseEnded:false,lastVitalsKnown:null,procedures:{}},eligibleDestinations:[]});
test('progress is documented without assuming stages complete or revealing true diagnosis',()=>{
 const s=base();let x=clinicalWorkflow(s);assert(x.steps.every(z=>z.status==='pending'));
 assert.equal(x.cue,null);
 s.patient.intentHistory=[{id:'history'}];x=clinicalWorkflow(s);
 assert.equal(x.steps[0].status,'partial','a single question does not finish anamnesis');
 assert.equal(x.cue,null,'nurse must not demand a diagnosis after one question');
 s.patient.orders=[{id:'hemograma',status:'pending'}];
 assert.equal(clinicalWorkflow(s).cue,null,'a requested study is not a result');
 s.patient.orders=[{id:'hemograma',status:'done'}];
 assert.equal(clinicalWorkflow(s).cue,null,'studies alone are not enough');
 s.patient.intentHistory.push({id:'history-2'});
 s.patient.examFindings={general:{general:{rows:[]}},abdomen:{palpation:{rows:[]}}};
 x=clinicalWorkflow(s);assert.equal(x.cue.id,'diagnosis');
 assert(!JSON.stringify(x).includes('peritonitis'));
});
test('moderate nurse asks what to do on measured instability; never orders a specific drug',()=>{
 const s=base();s.patient.lastVitalsKnown={vitals:{sys:78,spo2:92,hr:115}};
 const x=clinicalWorkflow(s);
 assert.equal(x.cue.id,'unstable');assert.match(x.cue.text,/¿Qué hacemos\?/);
 assert(!/Ringer|noradrenalina|expansi[oó]n/i.test(x.cue.text));
});
test('surgery orientation follows physician assumption only and cannot guarantee acceptance',()=>{
 const s=base();s.patient.diagnosis='Peritonitis secundaria';
 assert.match(clinicalWorkflow(s).cue.text,/según su impresión diagnóstica/);
 assert.match(clinicalWorkflow(s).cue.text,/avise a cirugía/);
 assert(!JSON.stringify(clinicalWorkflow(s)).includes('aceptada'));
 s.patient.consults=[{id:'cirugia',status:'done',accepted:false}];
 assert.notEqual(clinicalWorkflow(s).cue?.id,'surgery:peritonitis secundaria');
 s.patient.diagnosis='Peritonitis bacteriana espontánea';
 s.patient.consults=[];
 assert(!clinicalWorkflow(s).cue?.id.startsWith('surgery:'));
});
test('eligible destinations prompt a question, not a premature discharge or bypass',()=>{
 const s=base();s.patient.diagnosis='ascitis';
 s.patient.treatments=[{id:'ceftriaxona'}];s.eligibleDestinations=['uti'];
 assert.equal(clinicalWorkflow(s).cue.id,'disposition');
 assert.match(clinicalWorkflow(s).cue.text,/¿Qué destino indica\?/);
 s.patient.caseEnded=true;
 assert.equal(clinicalWorkflow(s).cue,null);
 assert.equal(clinicalWorkflow(s).steps.find(x=>x.id==='destination').status,'done');
});

test('nurse has no new coaching after care was closed or the patient died',()=>{
 const s={patient:{uid:'P',intentHistory:[],examFindings:{},orders:[],
  treatments:[],administrationLog:[],pendingConsults:[],consults:[],
  pendingTreatments:[],lastVitalsKnown:{vitals:{hr:85,sys:100,spo2:99}},
  diagnosis:'cirrosis',caseEnded:true,closure:{closed:true}}};
 assert.equal(clinicalWorkflow(s).cue,null);
 s.patient.caseEnded=false;s.patient.patientDied=true;
 assert.equal(clinicalWorkflow(s).cue,null);
});

test('after a surgical rejection nurse never invites another identical consult or a premature plan',()=>{
 const s=base();s.patient.diagnosis='apendicitis aguda';
 assert.equal(clinicalWorkflow(s).cue?.id,'surgery:apendicitis aguda');
 s.patient.pendingConsults=[{id:'cirugia',status:'pending'}];
 assert.notEqual(clinicalWorkflow(s).cue?.id,'surgery:apendicitis aguda');
 s.patient.pendingConsults=[];
 s.patient.consults=[{id:'cirugia',status:'rejected',accepted:false,
  advice:'Faltan signos vitales y examen físico dirigido.'}];
 assert.equal(clinicalWorkflow(s).cue,null,'consult refusal already explains next steps');
 s.patient.examDone=true;s.patient.lastVitalsKnown={vitals:{sys:110,spo2:99,hr:88}};
 assert.equal(clinicalWorkflow(s).cue,null,'new request belongs to the clinician');
});
