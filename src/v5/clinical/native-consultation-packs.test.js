import test from 'node:test';
import assert from 'node:assert/strict';
import {createSurgicalConsultation} from './surgical-consultation.js';
import {cardiologyCaseDefinitions} from '../content/packs/cardiology-pack.js';
import {neurologyCaseDefinitions} from '../content/packs/neurology-pack.js';

function fixture(id){
 const c=[...cardiologyCaseDefinitions,...neurologyCaseDefinitions].find(c=>c.id===id);
 const p={uid:'P',diagnosis:'',liveVitals:{hr:80,rr:18,sys:120,dia:70,spo2:97},orders:[],
  treatments:[],consults:[],pendingConsults:[],pendingTreatments:[],administrationLog:[],procedures:{},examFindings:{}};
 const q=createSurgicalConsultation(p,c,{cases:[c],readiness:()=>({missing:[]}),
  executed:(cmd,data)=>({status:'executed',eventId:cmd.eventId,receipt:data}),
  acceptTransfer:()=>({status:'executed',receipt:{transfer:true}})});
 const cmd=(service,eventId=service,kind='consult.request')=>({eventId,patientUid:'P',actorId:'D',intent:{id:service,kind}});
 const send=(service,eventId)=>q.request(cmd(service,eventId),{clinicalMinute:0,nativeMinute:0});
 const finish=()=>q.due({}, {clinicalMinute:3.5}).flatMap(t=>q.finish(t,3.5));
 function evidence(){
  p.diagnosis=c.dx[0];p.lastVitalsKnown={patientUid:'P'};p.examDone=true;
  p.examFindings={thorax:{auscultation:{patientUid:'P',eventId:'exam-thorax',rows:[{text:'Hallazgos torácicos'}]}},
   neurological:{neurological:{patientUid:'P',eventId:'exam-neuro',rows:[{text:'Hallazgos neurológicos'}]}}};
 }
 return {p,c,q,cmd,send,finish,evidence};
}

test('declared specialty consultations use one delayed queue and require actual diagnosis, vitals and directed exam',()=>{
 const f=fixture('CARD-01');
 assert.equal(f.send('cardiologia').status,'pending');assert.deepEqual(f.p.consults,[]);
 const rejected=f.finish();assert.equal(rejected[0].receipt.accepted,false);
 assert.equal(f.p.consults[0].reviewStatus,'missing-evidence');
 f.evidence();f.send('cardiologia','valid');f.send('cardiologia','second');
 assert.equal(f.p.pendingConsults.length,1);assert.equal(f.q.due({}, {clinicalMinute:3.49}).length,0);
 const reply=f.finish();assert.equal(reply.length,2);assert(reply.every(r=>r.receipt.accepted));
 assert.deepEqual(f.p.treatments,[]);assert.deepEqual(f.p.administrationLog,[]);
 assert(!f.p.procedures.coronary_reperfusion,'consultation is not reperfusion');
 assert.equal(f.send('cardiologia','reuse').receipt.reused,true);
 assert.equal(f.send('neurosurgery','not-declared'),null);
 f.q.dispose();
});

test('critical neuromuscular patients remain eligible for UTI with supported normal vital signs',()=>{
 const f=fixture('NEUR-09');f.evidence();
 f.p.treatments.push({id:'intubation',patientUid:'P',sourceEventId:'airway',kind:'procedure.performed'});
 f.send('uti');const rows=f.finish();assert.equal(rows[0].receipt.accepted,true);
 assert.match(rows[0].receipt.message,/soporte/);
 assert.equal(f.p.treatments.length,1);assert.equal(f.p.administrationLog.length,0);
 f.send('neurology');assert.equal(f.finish()[0].receipt.accepted,true);
 assert.equal(f.p.treatments.length,1);f.q.dispose();
});

test('declared transfer acceptance never produces the definitive neurological procedure',()=>{
 const f=fixture('NEUR-02');
 assert.equal(f.q.request(f.cmd('procedimiento','premature','case.close'),{clinicalMinute:0}).status,'rejected');
 f.evidence();const task=f.q.request(f.cmd('procedimiento','transfer','case.close'),{clinicalMinute:0});
 assert.equal(task.status,'pending');assert.equal(f.finish()[0].receipt.transfer,true);
 assert.equal(f.p.consults.at(-1).id,'neurology');assert.deepEqual(f.p.treatments,[]);
 assert.deepEqual(f.p.administrationLog,[]);assert(!f.p.procedures.thrombectomy);f.q.dispose();
});
