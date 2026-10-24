import test from 'node:test';
import assert from 'node:assert/strict';
import {routeWardSpeech} from '../core/speech-router.js';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
const data=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:data('cases'),therapies:data('therapies'),defaultDoses:data('default-doses')};
const context={patientUid:'P1',clinicalEvaluation:true,studies:[],therapies:content.therapies,
 interventions:content.cases.find(x=>x.id==='APP-001').interventions};

test('natural nurse handoffs normalize surgical, admission, observation and discharge destinations without bypass',()=>{
 const inputs=[['Enfermera derivar a cirugía','quirofano'],
  ['Enfermera trasladar al quirófano','quirofano'],
  ['Enfermera internar en sala','sala'],
  ['Enfermera dar de alta','alta'],
  ['Enfermera enviar a UTI','uti'],
  ['Enfermera derivar a observación','observacion']];
 for(const [text,destination] of inputs){
  const r=routeWardSpeech(text,context);
  assert.equal(r.error,undefined,text);
  assert.deepEqual(r.intents.map(x=>[x.kind,x.id]),[['case.close',destination]],text);
  assert.equal(r.recipient,'nurse');
 }
 const missing=routeWardSpeech('Enfermera derivar a cirugía',{...context,patientUid:null});
 assert.equal(missing.error,'no-patient-target');
 assert.deepEqual(missing.intents,[]);
});

test('bare "Enfermera cirugía" first requests surgery; after accepted consult routes to closure',()=>{
 const before=routeWardSpeech('Enfermera cirugía',{...context,surgicalConsultDone:false});
 assert.deepEqual(before.intents.map(x=>[x.kind,x.id]),[['procedure.request','cirugia']]);
 const after=routeWardSpeech('Enfermera cirugía',{...context,surgicalConsultDone:true});
 assert.deepEqual(after.intents.map(x=>[x.kind,x.id]),[['case.close','quirofano']]);
});

test('natural surgical transfer without evidence is rejected at request time; discharge remains gated',async()=>{
 for(const [caseId,text] of [['APP-001','Enfermera derivar a cirugía'],
  ['CIRR-001','Enfermera dar de alta']]){
  const s=createGuardSession({roomId:'natural-'+caseId,mode:'solo',actorId:'doc',
   actorName:'Doctor',patient:{uid:'P1',caseId},content,
   resolveContext:()=>({patientUid:'P1'})});
  try{
   const result=await s.post({id:'premature',text});
   if(caseId==='APP-001'){
    assert.equal(result.clinical[0]?.status,'rejected');
    assert.equal(result.clinical[0]?.reason,'transfer-not-accepted');
    assert.equal(s.read().patient.pendingConsults.length,0);
   }else{
    assert.equal(result.clinical[0]?.status,'rejected');
    assert.equal(result.clinical[0]?.reason,'closure-not-ready');
   }
   assert.equal(s.read().patient.caseEnded,false);
   assert.equal(s.read().progress.xp,0);
  }finally{s.dispose();}
 }
});
