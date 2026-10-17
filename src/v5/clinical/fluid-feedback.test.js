import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {confirmedFluidFeedback,fluidFeedbackLabel} from './fluid-feedback.js';
import {createGuardSession} from './guard-session.js';
import {therapyHTML} from '../ui/clinical-panels.js';
const get=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:get('cases'),therapies:get('therapies'),defaultDoses:get('default-doses')};
const caseOf=id=>content.cases.find(c=>c.id===id);
test('eight independently confirmed 500ml Ringer doses appear in the transcript with distinct cumulative totals',async()=>{
 for(const caseId of ['APP-001','CIRR-001']){
  const p={uid:'fluid-'+caseId,caseId};
  const s=createGuardSession({roomId:'fluid-feedback-'+caseId,mode:'solo',actorId:'qa',actorName:'QA',
   patient:p,content,resolveContext:()=>({patientUid:p.uid})});
  let i=0;const post=text=>s.post({id:'fluid-'+(++i),text});
  try{
   await post('Enfermera una vía');
   for(let n=1;n<=8;n++){
    const reply=await post('Enfermera Ringer 500 ml');
    assert.equal(reply.clinical[0].status,'pending');
    assert.equal(confirmedFluidFeedback(s.read().patient,caseOf(caseId)).totalMl,(n-1)*500);
    s.advance(2.7);await s.flush();
    const state=s.read(),status=confirmedFluidFeedback(state.patient,caseOf(caseId));
    assert.equal(status.totalMl,n*500);
    assert.equal(status.administrations,n);
    assert(state.messages.some(x=>x.text?.includes('Ringer confirmado: '+
     (n*500).toLocaleString('es-AR')+' ml en '+n+' ')));
    assert(therapyHTML(state.patient).includes('data-fluid-total-ml="'+n*500+'"'));
   }
   assert.equal(s.read().patient.administrationLog.filter(t=>t.id==='fluid').length,8);
   const state=s.read();
   assert.equal(state.exposure.confirmedCrystalloidMl,4000);
   assert.equal(state.progress.xp,0,'feedback never manufactures XP');
  }finally{s.dispose();}
 }
});
test('V4 pharmacology flags inherited without declaring hypoxia at 500ml',()=>{
 const c=caseOf('CIRR-001');
 const uid='P',p={uid,caseId:c.id,liveVitals:{sys:108,dia:68,hr:94,rr:20,spo2:96,temp:37},
  lastVitalsKnown:null,administrationLog:[],treatments:[]};
 assert.equal(fluidFeedbackLabel(confirmedFluidFeedback(p,c)),'');
 p.administrationLog.push({id:'fluid',patientUid:uid,sourceEventId:'1',dose:{amount:500,unit:'ml'},administeredAtNativeMinute:0});
 p.treatments.push({...p.administrationLog[0]});
 const a=confirmedFluidFeedback(p,c);
 assert.equal(a.totalMl,500);assert.equal(a.congestionRisk,true);
 assert.equal(a.respiratoryChangeMeasured,false);
 assert.match(fluidFeedbackLabel(a),/Riesgo basal/);
 p.lastVitalsKnown={vitals:{spo2:90}};
 assert.equal(confirmedFluidFeedback(p,c).respiratoryChangeMeasured,true);
});
test('pending, counterfeit, repeated and wrong-patient receipts can never appear as Ringer administered',()=>{
 const c=caseOf('APP-001'),p={uid:'P',caseId:'APP-001',liveVitals:{sys:118,dia:72,hr:108,rr:20,spo2:98,temp:38},
  treatments:[{id:'fluid'}],pendingTreatments:[{id:'fluid'}],administrationLog:[]};
 assert.equal(confirmedFluidFeedback(p,c).totalMl,0);
 const row={id:'fluid',patientUid:'P',sourceEventId:'fluid-one',dose:{amount:500,unit:'ml'},administeredAtNativeMinute:1};
 p.administrationLog=[row];
 assert.throws(()=>confirmedFluidFeedback(p,c),/uniquely confirmed/);
 p.treatments=[{...row}];
 assert.equal(confirmedFluidFeedback(p,c).totalMl,500);
 p.administrationLog.push({...row});assert.throws(()=>confirmedFluidFeedback(p,c),/uniquely confirmed/);
 p.administrationLog.pop();p.administrationLog[0].patientUid='B';
 assert.throws(()=>confirmedFluidFeedback(p,c),/uniquely confirmed/);
});
