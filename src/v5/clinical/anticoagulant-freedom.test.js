import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
const load=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
for(const caseId of ['APP-001','CIRR-001'])test(caseId+': actual heparin during bleeding executes and worsens perfusion',async()=>{
 const s=createGuardSession({roomId:'heparin-'+caseId,mode:'solo',actorId:'doc',actorName:'Doctor',
  patient:{uid:'P',caseId,clinicalFlags:{activeBleeding:true}},content,resolveContext:()=>({patientUid:'P'})});
 try{
  const base=s.read().patient.liveVitals;
  await s.post({id:'iv',text:'Enfermera una vía'});
  const ack=await s.post({id:'heparin',text:'Enfermera heparina IV'});
  assert.equal(ack.clinical[0].status,'pending');
  s.advance(1.4);await s.flush();
  assert.equal(s.read().patient.administrationLog.length,0);
  assert.equal(s.read().patient.liveVitals.sys,base.sys);
  for(let i=0;i<100;i++)s.advance(.25);await s.flush();
  const state=s.read();
  assert.equal(state.patient.administrationLog.length,1);
  assert.equal(state.patient.administrationLog[0].id,'anticoagulation');
  assert(state.patient.liveVitals.sys<base.sys-10);
  assert(state.patient.liveVitals.hr>base.hr+5);
  assert.equal(state.patient.adverseEvents[0].kind,'anticoagulant-bleeding');
  assert(state.closure.quality.penalty>=5);
  await s.post({id:'heparin',text:'Enfermera heparina IV'});s.advance(1);
  assert.equal(s.read().patient.administrationLog.length,1);
 }finally{s.dispose();}
});
test('heparin clarification is technical; unsupported dose or route never becomes default heparin IV',async()=>{
 const s=createGuardSession({roomId:'heparin-technical',mode:'solo',actorId:'doc',actorName:'Doctor',
  patient:{uid:'P',caseId:'APP-001',clinicalFlags:{activeBleeding:true}},content,resolveContext:()=>({patientUid:'P'})});
 try{
  await s.post({id:'iv',text:'Enfermera una vía'});
  let i=0;
  for(const text of ['heparina 5000 UI IV','heparina 80 mg','heparina oral','heparina SC']){
   const ack=await s.post({id:'bad'+(++i),text:'Enfermera '+text});
   assert(ack.routeError||ack.clinical.every(x=>x.status==='rejected'),text);
   s.advance(5);await s.flush();
  }
  assert.equal(s.read().patient.administrationLog.length,0);
  assert.equal(s.read().patient.adverseEvents.length,0);
 }finally{s.dispose();}
});
