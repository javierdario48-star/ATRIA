// QA only: execute the unchanged effective V4 consultation chain and the V5
// room/port path with equivalent clinical facts. Never imported by the game.
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
 {id:'accepted-team',caseId:'APP-001',diagnosis:'apendicitis aguda',exam:true},
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
 if(scenario.exam){await send('/signos');for(const part of ['general','inspection','auscultation','percussion','palpation'])await send('/examen '+part);}
 await send('Enfermera cirugía');await send('Enfermera cirugía');
 session.advance(3.49);await session.flush();assert.equal(session.read().patient.consults.length,0);
 session.advance(.01);await session.flush();
 const migrated=session.read().patient.consults.at(-1);
 for(const key of ['status','accepted','advice'])assert.equal(migrated[key],original[key],scenario.id+'/'+key);
 assert.equal(session.read().patient.consults.length,1);
 assert.deepEqual(session.read().eligibleDestinations,[],'team review never fabricates handoff prerequisites');
 assert.equal(session.read().patient.treatments.length,0);
 assert.equal(session.read().progress.receipts.length,0);
 results.push({...scenario,original,migrated});session.dispose();
}
const report={reference:'effective generated V4 native runtime, original consultation and response timer',
 sourceHashes:sources.compiled.map(({id,hash})=>({id,sha256:hash})),scenarios:results,
 noPerformedSurgery:true,noAutomaticHandoff:true,allMatched:true};
const out=process.env.V5_SURGERY_EVIDENCE||'qa/v5-browser-results';await fs.mkdir(out,{recursive:true});
await fs.writeFile(out+'/surgery-native-parity.json',JSON.stringify(report,null,2)+'\n');
console.log('SURGERY V4/V5 PARITY PASS',JSON.stringify({scenarios:results.length,realSeconds:3.5,allMatched:true}));
