import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {createGuardSession} from './guard-session.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
const load=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const results=[],stable=new Set(['CIRR-001','APP-001','CHOLE-001']);
let seq=0;
function bot(caseId,mode,label){
 const n=++seq,uid=caseId+'-'+mode+'-'+label+'-'+n;
 const members=mode==='coop'?[{id:'doctor',name:'Bot'},{id:'colleague',name:'Observer'}]:[{id:'doctor',name:'Bot'}];
 const s=createGuardSession({roomId:'physio-'+n,mode,actorId:'doctor',actorName:'Bot',
  members,patient:{uid,caseId},content,resolveContext:()=>({patientUid:uid})});
 let id=0;
 return {s,send:t=>s.post({id:'p'+(++id),text:t}),async advance(t){s.advance(t);await s.flush();}};
}
for(const caseId of Object.keys(CLINICAL_EXECUTORS))for(const mode of ['solo','apprentice','coop']){
 test('longitudinal fluid counterfactual '+caseId+' '+mode,async()=>{
  const treated=bot(caseId,mode,'8-bolus'),control=bot(caseId,mode,'no-fluid');
  const c=content.cases.find(x=>x.id===caseId);
  try{
   await treated.send('Enfermera una vía');
   const empty=treated.s.read().patient;
   assert.equal(crystalloidOverloadOffsets(empty,c).spo2,0);
   assert.equal(crystalloidOverloadOffsets(control.s.read().patient,c).spo2,0);
   for(let n=0;n<8;n++){
    const order=await treated.send('Enfermera Ringer 500 ml');
    assert.equal(order.clinical[0].status,'pending');
    await treated.advance(.82);
    await control.advance(.82);
   }
   const actual=treated.s.read(),baseline=control.s.read();
   assert.equal(actual.exposure.confirmedCrystalloidMl,4000);
   assert.equal(baseline.exposure.confirmedCrystalloidMl,0);
   const expected=crystalloidOverloadOffsets(actual.patient,c);
   assert(expected.spo2<=-4&&expected.rr>=4,'native confirmed crystalloid offset missing');
   // A 60-real-second observation resolves native response latency instead
   // of mistaking an immediate pending order for observed respiratory injury.
   await treated.advance(60);await control.advance(60);
   const exposed=treated.s.read(),untreated=control.s.read();
   const lung=confirmedClinicalMissteps(exposed.patient,c);
   const satGap=exposed.patient.liveVitals.spo2-untreated.patient.liveVitals.spo2;
   const rrGap=exposed.patient.liveVitals.rr-untreated.patient.liveVitals.rr;
   assert(Number.isFinite(satGap)&&Number.isFinite(rrGap));
   assert.equal(exposed.progress.xp,0);
   assert.equal(exposed.progress.receipts.length,0);
   assert.equal(untreated.progress.receipts.length,0);
   if(stable.has(caseId)){
    assert(satGap< -2,caseId+' 4L must compromise measured oxygenation versus untreated control, got '+satGap);
    assert(rrGap>2,caseId+' 4L must provoke observed tachypnea versus untreated control, got '+rrGap);
   }
   // For septic cases, fluid may simultaneously restore perfusion and harm
   // the lungs. Characterize both effects without inventing a single-axis
   // universal prognosis.
   results.push({caseId,mode,administeredMl:4000,plannedOffset:expected,
    spo2Gap:Number(satGap.toFixed(3)),rrGap:Number(rrGap.toFixed(3)),
    systolicGap:Number((exposed.patient.liveVitals.sys-untreated.patient.liveVitals.sys).toFixed(3)),
    adverseEvents:lung.adverseCount,died:!!exposed.patient.patientDied});
  }finally{treated.s.dispose();control.s.dispose();}
 });
}
test('21 matched-pair physiology simulations cover every active clinical writer',()=>{
 assert.equal(Object.keys(CLINICAL_EXECUTORS).length,7);
 console.log('ATRIA_ALL_CASES_LONGITUDINAL_BOTS='+JSON.stringify(results));
});
