import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagnosticMultiplier,partialDisposition} from './partial-closure.js';
import {createGuardSession} from './guard-session.js';
import {caseDebriefHTML} from '../ui/case-debrief.js';
import {closureDecisionHTML} from '../ui/clinical-closure-panel.js';
import {routeWardSpeech} from '../core/speech-router.js';

const read=name=>JSON.parse(readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const cirr=content.cases.find(c=>c.id==='CIRR-001');
const app=content.cases.find(c=>c.id==='APP-001');
function fixture(caseId,roomId){
 const s=createGuardSession({roomId,mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'})});
 let seq=0;return {s,send:text=>s.post({id:'m'+(++seq),text})};
}
test('patient-first chat remains default after an explicit nurse prefix',()=>{
 assert.equal(routeWardSpeech('Enfermera, monitor',{focusedNpc:'patient',patientUid:'P'}).recipient,'nurse');
 assert.equal(routeWardSpeech('¿Cómo te sientes?',{focusedNpc:null,patientUid:'P'}).recipient,'patient');
 assert.equal(routeWardSpeech('/cierre-parcial sala',{clinicalEvaluation:true,patientUid:'P'}).intents[0].partial,true);
});
test('partial CIRR observation closes with incomplete work and reduced native XP',async()=>{
 const f=fixture('CIRR-001','partial-cirr');
 try{
  await f.send('/diagnostico cirrosis');
  const result=await f.send('/cierre-parcial observacion');
  assert.equal(result.clinical[0].status,'executed');
  const state=f.s.read();assert(state.patient.caseEnded);
  assert(state.patient.closure.quality.score<100);
  assert.equal(state.progress.receipts.length,1);
  assert(state.patient.closure.xp>0&&state.patient.closure.xp<133);
  assert(state.patient.closure.debrief.missing.length>0);
  assert(caseDebriefHTML(state.patient.closure).includes('Te faltó'));
  assert.equal((await f.send('/cierre-parcial observacion')).clinical[0].status,'rejected');
 }finally{f.s.dispose();}
});
test('wrong diagnosis yields zero score and zero XP but retains a real closure receipt',async()=>{
 const f=fixture('CIRR-001','partial-wrong');
 try{
  await f.send('/diagnostico resfriado');
  const r=await f.send('/cierre-parcial observacion');
  assert.equal(r.clinical[0].status,'executed');
  assert.equal(f.s.read().patient.closure.quality.diagnosticFactor,0);
  assert.equal(f.s.read().patient.closure.quality.score,0);
  assert.equal(f.s.read().patient.closure.xp,0);
  assert.equal(f.s.read().progress.receipts.length,1);
 }finally{f.s.dispose();}
});
test('contextually plausible but underspecified diagnosis receives 0.6 modifier',()=>{
 for(const diagnosis of ['ascitis','cirrosis compensada']){
  assert.equal(diagnosticMultiplier({diagnosis},cirr,content.cases),.6,diagnosis);
 }
 assert.equal(diagnosticMultiplier({diagnosis:'cirrosis descompensada'},cirr,content.cases),1);
 assert.equal(diagnosticMultiplier({diagnosis:'resfriado'},cirr,content.cases),0);
});
test('surgical destination refuses wrong diagnosis even if consult had previously accepted',()=>{
 const p={caseEnded:false,patientDied:false,diagnosis:'resfriado',
  liveVitals:{sys:112,spo2:98},consults:[{id:'cirugia',accepted:true,status:'done'}]};
 const q={score:70,diagnosis:0,history:10,safety:20,studies:10,treatment:25,efficiency:5,penalty:0,extraStudies:0};
 const refusal=partialDisposition(p,app,'quirofano',{quality:q},{cases:content.cases});
 assert.equal(refusal.ready,false);
 assert.match(refusal.missing.join(' '),/Cirugía rechaza/);
 p.diagnosis='apendicitis aguda';
 const accepted=partialDisposition(p,app,'quirofano',{quality:q},{cases:content.cases});
 assert.equal(accepted.ready,true);
 assert.equal(accepted.quality.diagnosticFactor,1);
});
test('compact closure menu exposes attempts with partial work without claiming readiness',()=>{
 const state={patient:{uid:'P',diagnosis:'cirrosis',intentHistory:[],orders:[],
  examFindings:{},treatments:[],administrationLog:[],consults:[],pendingConsults:[],
  pendingTreatments:[],procedures:{},caseEnded:false,patientDied:false},
  eligibleDestinations:[]};
 const html=closureDecisionHTML(state);
 assert(html.includes('data-destination="observacion"'));
 assert(html.includes('data-destination="quirofano"'));
 assert(!html.includes('El servidor aún no habilita'));
});

test('partially graded peritonitis respects the native 69-point ceiling in debrief',async()=>{
 const pbe=content.cases.find(c=>c.id==='PERI-PBE-001');
 const patient={uid:'P',caseEnded:false,patientDied:false,diagnosis:'PBE',
  liveVitals:{sys:115,spo2:96},consults:[],administrationLog:[]};
 const original={score:69,diagnosis:15,history:15,safety:20,studies:15,treatment:15,
  efficiency:5,extraStudies:0,penalty:0,handoffCredit:0};
 const part=partialDisposition(patient,pbe,'sala',{quality:original,ready:false},{cases:content.cases});
 assert.equal(part.ready,true);
 assert.equal(part.quality.score,69);
 assert.equal(part.quality.partialScorePenalty,16);
 const {createClosureDebrief}=await import('./closure-debrief.js');
 const scorecard=createClosureDebrief(patient,pbe,part.quality);
 assert.equal(scorecard.score,69);
 assert(scorecard.deductions.some(x=>x.label.includes('atención parcial')&&x.points===-16));
});
