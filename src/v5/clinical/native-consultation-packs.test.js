import test from 'node:test';
import assert from 'node:assert/strict';
import {createSurgicalConsultation} from './surgical-consultation.js';
import {clinicalContent as content} from '../server/content.js';
import {createGuardSession} from './guard-session.js';

function fixture(id){
 const c=content.cases.find(c=>c.id===id);let now=0;
 const p={uid:'P',diagnosis:'',liveVitals:{hr:80,rr:18,sys:120,dia:70,spo2:97},orders:[],
  treatments:[],consults:[],pendingConsults:[],pendingTreatments:[],administrationLog:[],procedures:{},examFindings:{}};
 const q=createSurgicalConsultation(p,c,{cases:[c],readiness:()=>({missing:[]}),
  executed:(cmd,data)=>({status:'executed',eventId:cmd.eventId,receipt:data}),
  acceptTransfer:()=>({status:'executed',receipt:{transfer:true}})});
 const cmd=(service,eventId=service,kind='consult.request')=>({eventId,patientUid:'P',actorId:'D',intent:{id:service,kind}});
 const send=(service,eventId)=>q.request(cmd(service,eventId),{clinicalMinute:now,nativeMinute:now});
 const finish=()=>q.due({}, {clinicalMinute:now+3.5}).flatMap(t=>q.finish(t,now+3.5,now+3.5));
 async function evidence(){
  // The previous fixture asserted readiness with an empty checklist while it
  // had no studies or medication receipts. Prepare the public chart through
  // the real executor; this test still isolates the receiver's delayed queue.
  const native=createGuardSession({roomId:'native-queue-'+id,mode:'solo',actorId:'D',actorName:'Doctor',
   patient:{uid:'P',caseId:id},content,resolveContext:()=>({patientUid:'P'})});
  let seq=0;const post=text=>native.post({id:'care-'+(++seq),text});
  try{
   await post('/diagnostico '+c.dx[0]);await post('/monitor conectar');
   for(const technique of ['general','inspection','auscultation','percussion','palpation'])await post('/examen '+technique);
   if(c.specialty==='Neurología')await post('/examen neurological');
   await post('Enfermera una vía');
   const recipes={
    'CARD-01':{studies:['g_card01_ecg'],meds:['aspirin','ticagrelor','enoxaparin']},
    'NEUR-02':{studies:['g_neur02_ct','g_neur02_cta','g_neur02_perfusion'],meds:['stroke_prevention']},
    'NEUR-09':{studies:['g_neur09_fvc','g_neur09_gas'],meds:['intubation','ivig']}
   },recipe=recipes[id];
   for(const study of recipe.studies)await post('/estudio '+study);
   for(const drug of recipe.meds)await post('/tratamiento '+drug);
   for(let i=0;i<40&&(native.read().patient.pendingTreatments.length||native.read().patient.orders.some(o=>o.status==='pending'));i++){native.advance(5);await native.flush();}
   await post('/reevaluar');
   Object.assign(p,native.read().patient);now=native.read().clock.clinicalMinute;
  }finally{native.dispose();}
 }

 return {p,c,q,cmd,send,finish,evidence,get now(){return now;}};
}

test('declared specialty consultations use one delayed queue and require actual diagnosis, vitals and directed exam',async()=>{
 const f=fixture('CARD-01');
 assert.equal(f.send('cardiologia').status,'pending');assert.deepEqual(f.p.consults,[]);
 const rejected=f.finish();assert.equal(rejected[0].receipt.accepted,false);
 assert.equal(f.p.consults[0].reasonCode,'diagnosis-missing');
 await f.evidence();f.send('cardiologia','valid');f.send('cardiologia','second');
 assert.equal(f.p.pendingConsults.length,1);assert.equal(f.q.due({}, {clinicalMinute:f.now+3.49}).length,0);
 const before=structuredClone({treatments:f.p.treatments,log:f.p.administrationLog});
 const reply=f.finish();assert.equal(reply.length,2);assert(reply.every(r=>r.receipt.accepted),JSON.stringify(f.p.consults.at(-1)));
 assert.deepEqual(f.p.treatments,before.treatments);assert.deepEqual(f.p.administrationLog,before.log);
 assert(!f.p.procedures.coronary_reperfusion,'consultation is not reperfusion');
 assert.equal(f.send('cardiologia','reuse').receipt.reused,true);
 assert.equal(f.send('neurosurgery','not-declared').status,'pending');
 assert.equal(f.finish()[0].receipt.accepted,false);
 assert.equal(f.p.consults.at(-1).reviewStatus,'no-indication','an implemented but inappropriate service must give a clinical refusal');
 f.q.dispose();
});

test('critical neuromuscular patients remain eligible for UTI with supported normal vital signs',async()=>{
 const f=fixture('NEUR-09');await f.evidence();
 assert(f.p.treatments.some(t=>t.id==='intubation'&&t.kind==='procedure.performed'));
 const before=structuredClone({treatments:f.p.treatments,log:f.p.administrationLog});
 f.send('uti');const rows=f.finish();assert.equal(rows[0].receipt.accepted,true);
 assert.match(rows[0].receipt.message,/soporte/);
 assert.deepEqual(f.p.treatments,before.treatments);assert.deepEqual(f.p.administrationLog,before.log);
 f.send('neurology');assert.equal(f.finish()[0].receipt.accepted,true);
 assert.deepEqual(f.p.treatments,before.treatments);f.q.dispose();
});

test('declared transfer acceptance never produces the definitive neurological procedure',async()=>{
 const f=fixture('NEUR-02');
 assert.equal(f.q.request(f.cmd('procedimiento','premature','case.close'),{clinicalMinute:0}).status,'rejected');
 await f.evidence();const before=structuredClone({treatments:f.p.treatments,log:f.p.administrationLog});const task=f.q.request(f.cmd('procedimiento','transfer','case.close'),{clinicalMinute:f.now,nativeMinute:f.now});
 assert.equal(task.status,'pending');assert.equal(f.finish()[0].receipt.transfer,true);
 assert.equal(f.p.consults.at(-1).id,'neurology');assert.deepEqual(f.p.treatments,before.treatments);
 assert.deepEqual(f.p.administrationLog,before.log);assert(!f.p.procedures.thrombectomy);f.q.dispose();
});
