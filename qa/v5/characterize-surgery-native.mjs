// QA only: execute the unchanged effective V4 consultation chain and the V5
// room/port path. Preserve timing; explicitly verify the stricter V5 clinical
// evidence and preparation rules instead of requiring obsolete V4 replies.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createNativeReferenceRuntime487,advanceNativeReference487,loadNativeReferenceSources487} from '../physiology-pilot/native-reference-487.mjs';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
const load=async name=>JSON.parse(await fs.readFile(new URL('../../src/v5/content/'+name+'.json',import.meta.url)));
const content={cases:await load('cases'),therapies:await load('therapies'),defaultDoses:await load('default-doses')};
const scenarios=[
 {id:'missing-diagnosis',caseId:'APP-001',diagnosis:'',exam:false},
 {id:'broad-diagnosis',caseId:'APP-001',diagnosis:'peritonitis',exam:true},
 {id:'wrong-diagnosis',caseId:'APP-001',diagnosis:'cirrosis',exam:true},
 {id:'missing-exam',caseId:'APP-001',diagnosis:'apendicitis aguda',exam:false},
 {id:'documented-awaiting-preparation',caseId:'APP-001',diagnosis:'apendicitis aguda',exam:true},
 {id:'medical-focus',caseId:'CIRR-001',diagnosis:'cirrosis',exam:true},
 {id:'secondary-missing-diagnosis',caseId:'PERI-SEC-001',diagnosis:'',exam:false},
 {id:'secondary-urgent-specific',caseId:'PERI-SEC-001',diagnosis:'peritonitis secundaria',exam:false},
 {id:'secondary-broad-diagnosis',caseId:'PERI-SEC-001',diagnosis:'peritonitis',exam:true},
 {id:'secondary-documented-focus',caseId:'PERI-SEC-001',diagnosis:'peritonitis secundaria',exam:true}
];
const sources=loadNativeReferenceSources487(),results=[];
for(const scenario of scenarios){
 const legacy=createNativeReferenceRuntime487({caseId:scenario.caseId,sources}),p=legacy.ctx.sim;
 // Peritonitis also refreshes its bedside action after a response. Stub only
 // that presentation sink, as in the historical live-native journey fixture.
 legacy.ctx.document.createElement=()=>({style:{},textContent:'',onclick:null});
 legacy.ctx.document.body.appendChild=()=>{};
 p.diagnosis=scenario.diagnosis;
 if(scenario.exam){p.examDone=true;p.lastVitalsKnown=true;}
 legacy.ctx.nurseNatural('Enfermera cirugía');legacy.ctx.nurseNatural('Enfermera cirugía');
 assert.equal(p.consults.get('cirugia').status,'pending');
 advanceNativeReference487(legacy,3.49*.12);
 assert.equal(p.consults.get('cirugia').status,'pending');
 advanceNativeReference487(legacy,3.5*.12);
 const original=JSON.parse(JSON.stringify(p.consults.get('cirugia')));
 let seq=0;
 const session=createGuardSession({roomId:'surgery-parity',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P',caseId:scenario.caseId},content,resolveContext:()=>({patientUid:'P'})});
 const send=text=>session.post({id:String(++seq),text});
 if(scenario.diagnosis)await send('/diagnostico '+scenario.diagnosis);
 await send('/signos');
 if(scenario.exam){for(const part of ['general','inspection','auscultation','percussion','palpation'])await send('/examen '+part);}
 await send('Enfermera cirugía');await send('Enfermera cirugía');
 session.advance(3.49);await session.flush();assert.equal(session.read().patient.consults.length,0);
 session.advance(.01);await session.flush();
 const migrated=session.read().patient.consults.at(-1);
 const expected={
  'missing-diagnosis':'diagnosis-missing','broad-diagnosis':'diagnosis-incompatible',
  'wrong-diagnosis':'diagnosis-incompatible','missing-exam':'examination-incomplete',
  'documented-awaiting-preparation':'indispensable-study-pending','medical-focus':'destination-not-indicated',
  'secondary-missing-diagnosis':'diagnosis-missing','secondary-urgent-specific':'examination-incomplete',
  'secondary-broad-diagnosis':'diagnosis-specificity','secondary-documented-focus':'stabilization-insufficient'
 };
 assert.equal(migrated.status,'rejected',scenario.id);
 assert.equal(migrated.accepted,false,scenario.id);
 assert.equal(migrated.reasonCode,expected[scenario.id],scenario.id);
 assert.equal(migrated.respondedAtRealSecond,3.5,scenario.id+' preserves native response time');
 assert.equal(session.read().patient.consults.length,1);
 assert.deepEqual(session.read().eligibleDestinations,[],'team review never fabricates handoff prerequisites');
 assert.equal(session.read().patient.treatments.length,0);
 assert.equal(session.read().progress.receipts.length,0);
 let corrected=null;
 if(['documented-awaiting-preparation','secondary-documented-focus'].includes(scenario.id)){
  await send('Enfermera una vía');
  if(scenario.caseId==='APP-001'){
   await send('/estudio app_cbc');await send('/estudio app_us');
  }else await send('Enfermera Ringer 500 ml');
  await send('Enfermera ceftriaxona 1 g y metronidazol 500 mg');
  session.advance(scenario.caseId==='APP-001'?120:4);await session.flush();
  await send('/consulta cirugia');session.advance(3.5);await session.flush();
  corrected=session.read().patient.consults.at(-1);
  assert.equal(corrected.accepted,true,scenario.id+' permits corrected preparation');
  assert.equal(session.read().patient.caseEnded,false,'manual opinion leaves the decision to the doctor');
  assert.equal(session.read().progress.receipts.length,0);
 }
 results.push({...scenario,original,migrated,corrected,legacyDifference:original.advice!==migrated.advice});session.dispose();
}
const report={reference:'effective generated V4 native runtime, original consultation and response timer',
 sourceHashes:sources.compiled.map(({id,hash})=>({id,sha256:hash})),scenarios:results,
 noPerformedSurgery:true,noAutomaticHandoff:true,responseTimingMatched:true,
 clinicalRule:'V5 separately validates diagnosis, measured vitals, directed examination and essential preparation',
 reviewedLegacyDifferences:results.filter(row=>row.legacyDifference).map(row=>row.id)};
const out=process.env.V5_SURGERY_EVIDENCE||'qa/v5-browser-results';await fs.mkdir(out,{recursive:true});
await fs.writeFile(out+'/surgery-native-parity.json',JSON.stringify(report,null,2)+'\n');
console.log('SURGERY V5 CLINICAL REVIEW PASS',JSON.stringify({scenarios:results.length,realSeconds:3.5,correctedAcceptances:results.filter(row=>row.corrected?.accepted).length}));
