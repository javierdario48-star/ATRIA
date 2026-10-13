import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';

const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const name='<script id="ns422-vega-rescue">';
const source=html.slice(html.indexOf(name)+name.length,html.indexOf('</script>',html.indexOf(name)));
const helperA=source.indexOf(' function csVegaPriorityStudies487(){');
const helperB=source.indexOf(' function learnerTarget(){',helperA);
const tickA=source.indexOf(' function tick(){',helperB);
const tickB=source.indexOf(' const oldMentor=mentorUserMessage;',tickA);
assert(helperA>0&&helperB>helperA&&tickA>helperB&&tickB>tickA);
let time=1000,physical=[],studies=[],messages=[],consulted=0;
const C={id:'PERI-SEC-001',vitals:{bp:'86/50'},risk:'peritonitis',
 keyStudies:['peri_cbc','peri_gas','peri_ct','ter_culture'],
 studies:[{id:'peri_cbc',label:'Hemograma'},{id:'peri_gas',label:'Gasometría'},
  {id:'peri_ct',label:'TC abdominal'},{id:'ter_culture',label:'Cultivo peritoneal'}],
 dx:['peritonitis secundaria'],keyInterventions:['ceftriaxone','metronidazole','source_control'],
 interventions:[{id:'ceftriaxone',label:'Ceftriaxona'},{id:'metronidazole',label:'Metronidazol'},
  {id:'source_control',label:'Cirugía'}]};
const sim={caseEnded:false,patientDied:false,patientInstance:{bed:{patient:[0,0]}},
 gameMinute:1,monitorConnected:false,lastVitalsKnown:false,orders:new Map(),
 pendingTherapies:new Map(),interventions:new Set(),monitorTherapies:new Map(),
 consults:new Map(),liveVitals:{sys:86,dia:50,spo2:92,temp:37,hr:128,rr:30}};
const job={active:true,phase:'assessment',participatory:false,epoch:0,
 token:null,caseId:C.id,lastPoll:-Infinity,issued:new Set(),nextReviewMinute:0};
sim.nsVegaCare=job;
const state={color:'NARANJA',treatment:{complete:false,checks:[]},vitals:sim.liveVitals};
const window={
 nsMayExamine:()=>true,nsRecordPhysicalExam:t=>{physical.push(t);if(physical.length===5)sim.examDone=true},
 nsPatientState:()=>state,
 csSurgery487Request:()=>{consulted++;sim.consults.set('cirugia',{status:'done'});return true}
};
const context={C,sim,window,careEpoch:0,destinations:{'PERI-SEC-001':'quirofano'},
 performance:{now:()=>time},token:()=>null,player:{x:0,y:0},
 patient:{ix:0,iy:0},expert:{x:0,y:0},present:id=>sim.interventions.has(id),
 support:()=>{},urgentEmpiric:()=>{},actor:fn=>fn(),say:t=>messages.push(t),
 status:()=>{},orderStudy:study=>{studies.push(study.id);sim.orders.set(study.id,{status:'pending'})},
 csSetDiagnosticImpression:()=>{sim.diagnosis='peritonitis secundaria'},
 csSetDisposition:()=>{sim.disposition={id:'quirofano'}},
 give:(job,id)=>{sim.interventions.add(id);return true},
 mentorAcuity:()=>({level:'unstable'}),
 MONITOR_THERAPY_CATALOG:[],
 antibioticCoverageStatus:()=>({score:0,ramp:0}),vitalsNow:()=>sim.liveVitals,
 captureMonitorVitals:()=>{},therapyStartedAt:()=>null};
vm.runInNewContext(source.slice(helperA,helperB)+'\n'+source.slice(tickA,tickB),context,{timeout:3000});

// One quiet bedside assessment, two high-yield studies, a single
// presumptive diagnosis, and sequential confirmed native interventions.
context.tick();
assert.equal(physical.length,5,'Vega performs the real exam without five spoken messages');
assert.equal(studies.length,0);
assert.equal(job.phase,'workup487');
assert(messages.filter(x=>/Ahora hago|Sigo con el siguiente/.test(x)).length===0,'no exam spam');
time+=700;context.tick();
assert.deepEqual(Array.from(context.csVegaPriorityStudies487()),['peri_cbc','peri_gas'],
 'shock avoids CT and cultures but still checks perfusion and infection');
assert.deepEqual(studies,['peri_cbc','peri_gas'],'one bounded workup round requests only two studies');
assert.equal(job.phase,'results');
assert.equal(messages.filter(x=>x.includes('Solicité')).length,1,'one message for the grouped studies');
assert.equal(sim.orders.has('ter_culture'),false);
assert.equal(sim.orders.has('peri_ct'),false);
for(let n=0;n<8;n++){time+=800;context.tick()}
assert.equal(messages.filter(x=>x.includes('Solicité')).length,1,'no repeated study requests while awaiting results');
sim.orders.get('peri_cbc').status='done';sim.orders.get('peri_gas').status='done';
time+=800;context.tick();
assert.equal(job.phase,'decision487');
assert.equal(sim.diagnosis,'peritonitis secundaria');
assert(messages.some(x=>x.includes('diagnóstico presuntivo es')));
assert(messages.some(x=>x.includes('¿Qué proponés hacer?')));
assert(!sim.interventions.has('ceftriaxone'),'noncritical consultation waits for learner decision');
job.phase='reassessment'; // Response "no sé" transitions here via the tested mentor routing.
time+=600;context.tick();
assert(sim.interventions.has('ceftriaxone'),'first treatment executed');
assert(!sim.interventions.has('metronidazole'),'second not simultaneous');
time+=1700;context.tick();
assert(sim.interventions.has('metronidazole'),'second distinct treatment');
time+=1700;context.tick();
assert.equal(consulted,1,'source-control requests consult, not an imaginary operation');
assert(!sim.interventions.has('source_control'));
console.log('VEGA STEPWISE RUNTIME BOT PASS',JSON.stringify({
 exams:physical.length,quickStudies:studies,stepwiseDrugs:true,
 cultureDoesNotBlock:true,ctNotMandatoryInShock:true,surgicalConsultNotOperation:true}));
