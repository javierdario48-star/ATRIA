import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent as content} from '../server/content.js';
import {createGuardRuntime} from './guard-runtime.js';
import {createNavigation} from '../engine/navigation.js';
import {clinicalInterventionEligibility} from './native-medication-eligibility.js';
import {deriveClinicalCertificationPlan,treatmentCommand} from '../../../qa/v5/certify-clinical-cases.mjs';

for(const mode of ['coop','competitive'])for(const caseId of ['CARD-08','HDA-001'])
 test(mode+' '+caseId+': destination alone starts receiver evaluation, survives pending recovery and closes once',async()=>{
  const members=[{id:'host',name:'Anfitrión'},{id:'doctor',name:'Médica'}];
  const c=content.cases.find(c=>c.id===caseId),plan=deriveClinicalCertificationPlan(c,content);
  let nowMs=1700000000000,sequence=0,runtime,restored=false,transfer;
  const make=checkpoint=>createGuardRuntime({content,roomId:'automatic-'+mode+'-'+caseId,
   caseId,mode,members,hostId:'host',nowMs,checkpoint});
  try{
   runtime=await make(null);
   const uid=runtime.view('doctor').clinical.patient.uid;
   const read=()=>runtime.view('doctor').clinical;
   const send=(text,id='test-'+(++sequence))=>runtime.post('doctor',{id,text,targetPatientUid:uid});
   const advance=async seconds=>{
    nowMs+=Math.round(seconds*1000);
    while((await runtime.advanceTo(nowMs)).recovering){}
   };
   const record=read().shift.patients.find(p=>p.uid===uid),nav=createNavigation(content.map);
   const point=nav.center(...content.beds.find(b=>b.id===record.bedId).approach);
   assert(runtime.motion('doctor',[point.x,point.y],1));
   for(let t=0;t<120&&!runtime.claim('doctor',uid);t++)await advance(.25);
   assert.equal(read().shift.confirmedFocusPatientUid,uid);
   for(const question of plan.history)await send(question.text);
   await send('/monitor conectar');
   for(const exam of plan.exams)await send(exam);
   await send('/diagnostico '+(caseId==='HDA-001'?'hemorragia digestiva alta':plan.diagnosis));
   for(const study of plan.studyIds)await send('/estudio '+study);
   await send('Enfermera una vía');
   if(!c.clinicalPolicy)for(const command of plan.legacyMedicationCommands||[])await send(command);
   const prescribed=new Set();
   for(let t=0;t<300&&!read().patient.caseEnded;t++){
    const state=read();
    if(c.clinicalPolicy)for(const id of plan.treatmentIds){
     if(id==='iv'||prescribed.has(id)||clinicalInterventionEligibility(state.patient,c,id,state.clock))continue;
     const ack=await send(treatmentCommand(c,content,id));
     if(ack.clinical?.some(x=>['pending','executed'].includes(x.status)))prescribed.add(id);
    }
    if(t%5===0){
     await send('/reevaluar');
     const id='destination-'+(++sequence),text='/disposicion '+plan.destination;
     const ack=await send(text,id);
     if(ack.clinical?.some(x=>x.status==='pending')&&!restored){
      transfer={id,text};
      assert.equal(read().patient.consults.length,0,'no manual consultation precedes this destination');
      assert.equal(read().patient.pendingConsults.length,1);
      assert.equal(read().progress.receipts.length,0);
      const before=runtime.view('doctor'),checkpoint=await runtime.checkpoint();runtime.dispose();
      runtime=await make(checkpoint);restored=true;
      assert.deepEqual(runtime.view('doctor').clinical.patient,before.clinical.patient);
      assert.equal((await send(text,id)).clinical[0].status,'pending');
      assert.equal(read().patient.pendingConsults.length,1,'replay cannot duplicate receiver evaluation');
     }
    }
    if(!read().patient.caseEnded)await advance(1);
   }
   const final=read();assert(restored,'a real pending transfer must cross recovery');
   assert.equal(final.patient.closure?.destination,plan.destination,JSON.stringify(final.closure));
   assert.equal(final.patient.consults.length,1);assert.equal(final.patient.consults[0].accepted,true);
   assert.equal(final.progress.receipts.length,1);assert(final.progress.xp>0);
   assert.equal(final.shift.outcomes.length,1);
   const before=runtime.view('doctor'),saved=await runtime.checkpoint();runtime.dispose();runtime=await make(saved);
   await send(transfer.text,transfer.id);await advance(5);
   assert.deepEqual(read().patient,before.clinical.patient);
   assert.deepEqual(read().progress,before.clinical.progress);
   const claims=runtime.view('doctor').claims;
   assert.equal(claims.length,mode==='coop'?2:1);
   assert.equal(new Set(claims.map(([,claim])=>claim.actorId)).size,claims.length);
   assert.deepEqual(runtime.view('host').claims,claims);
  }finally{runtime?.dispose();}
 });
