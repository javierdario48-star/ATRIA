import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {readPatientObservations,readNeurologicalState} from './patient-observations.js';
import {advanceClinicalComplications} from './clinical-policy-effects.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
const load=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
let serial=0;
function doctor(caseId){
 const uid='observation-'+(++serial),s=createGuardSession({roomId:uid,mode:'solo',
  actorId:'doctor',actorName:'QA',patient:{uid,caseId},content,resolveContext:()=>({patientUid:uid})});
 let event=0;
 return {s,post:text=>s.post({id:'step-'+(++event),text}),
  async advance(seconds){s.advance(seconds);await s.flush();},
  read(){const state=s.read();return readPatientObservations(state.patient,caseId,state.clock.nativeMinute);}};
}
test('lactulose improves hepatic orientation after real administration and observation time, rather than BP',async()=>{
 const treated=doctor('ENCEF-001'),control=doctor('ENCEF-001');
 try{
  assert.equal(treated.read().neuro.verbal,4);
  const pending=await treated.post('Enfermera lactulosa 30 ml');
  assert.equal(pending.clinical[0]?.status,'pending');assert.equal(treated.read().neuro.verbal,4);
  await treated.advance(2);assert.equal(treated.read().neuro.verbal,4,'not an immediate reversal');
  await treated.advance(760);await control.advance(762);
  assert.equal(treated.read().neuro.verbal,5);assert.equal(control.read().neuro.verbal,4);
  const state=treated.s.read(),p=state.patient,t=p.treatments.find(x=>x.id==='lactulose');
  assert.equal(readPatientObservations(p,'ENCEF-001',t.administeredAtNativeMinute-.01).neuro.verbal,4,
   'future administrations do not act in the past');
  assert.equal(readPatientObservations({...p,uid:'another-patient'},'ENCEF-001',state.clock.nativeMinute).neuro.verbal,4);
  const reply=await treated.post('¿Sabe dónde está?');
  assert(!reply.clinical.some(x=>x.status==='rejected'));
  assert.equal(treated.s.read().progress.xp,0);
 }finally{treated.s.dispose();control.s.dispose();}
});
for(const [caseId,order,therapy,flag] of [
 ['FECAL-001','Enfermera desimpactacion','disimpaction','bowelImpactionResolved'],
 ['ILEO-001','Enfermera sonda nasogastrica','ngt','bowelDecompressed']
])test(caseId+' local treatment relieves the modeled bowel complaint only after confirmed completion',async()=>{
 const f=doctor(caseId);
 try{
  const original=f.read();assert.equal(original[flag],false);
  const pending=await f.post(order);assert.equal(pending.clinical[0]?.status,'pending');
  assert.equal(f.read()[flag],false);await f.advance(2);
  assert.equal(f.read()[flag],false,'completion is followed by an observation delay');
  await f.advance(50);const after=f.read();
  assert.equal(after[flag],true);assert(after.pain<original.pain);
  const state=f.s.read(),p=state.patient,t=p.treatments.find(x=>x.id===therapy);
  assert.equal(readPatientObservations(p,caseId,t.administeredAtNativeMinute-.01)[flag],false);
  assert.equal(readPatientObservations({...p,uid:'another-patient'},caseId,state.clock.nativeMinute)[flag],false);
  const answer=await f.post('¿Cómo se siente ahora?');
  assert.match(answer.clinical.map(x=>x.receipt?.answer||'').join(' '),caseId==='FECAL-001'?/evacuar|evacuación/:/sonda|distensión/);
  assert.equal(f.s.read().progress.receipts.length,0);
 }finally{f.s.dispose();}
});

function neurologicalPatient(){
 return {uid:'neuro-observation',caseId:'OBSERVATION-CASE',treatments:[],administrationLog:[],
  liveVitals:{temp:37,hr:90,rr:18,sys:120,dia:75,spo2:97},
  neurology:{eye:1,verbal:1,motor:4,seizureActive:true},
  observationResponses:[
   {allOf:['lorazepam','levetiracetam'],delay:2,peak:10,neurology:{seizureActive:false,postictal:true}},
   {allOf:['lorazepam','levetiracetam'],delay:10,peak:30,neurology:{eye:3,verbal:3,motor:5}}
  ]};
}
function completedMedication(p,id,at=0,completedAt=at){
 const t={id,patientUid:p.uid,sourceEventId:id+':completed',route:'iv',
  dose:{amount:1,unit:'mg'},administeredAtNativeMinute:at,completedAtNativeMinute:completedAt};
 p.treatments.push(t);p.administrationLog.push(structuredClone(t));return t;
}

test('declared seizure observation responds after both real completions and retains gradual postictal impairment',()=>{
 const p=neurologicalPatient();completedMedication(p,'lorazepam',1);
 p.pendingTreatments=[{id:'levetiracetam'}];
 assert.equal(readNeurologicalState(p,50).seizureActive,true,'a pending second line cannot stop the seizure');
 completedMedication(p,'levetiracetam',2,12);
 assert.equal(readNeurologicalState(p,11).seizureActive,true,'future completion cannot act in the past');
 assert.equal(readNeurologicalState(p,12).seizureActive,true,'completion is followed by the authored observation delay');
 assert.equal(readNeurologicalState(p,21).seizureActive,true);
 const controlled=readNeurologicalState(p,22);
 assert.equal(controlled.seizureActive,false);assert.equal(controlled.postictal,true);
 assert.equal(controlled.eye,1,'cessation of movements is not immediate return of consciousness');
 const intermediate=readNeurologicalState(p,32),later=readNeurologicalState(p,42);
 assert(intermediate.eye>1&&intermediate.eye<3,'postictal consciousness improves gradually');
 assert.deepEqual([later.eye,later.verbal,later.motor],[3,3,5]);
 assert.equal(later.postictal,true);assert.equal(later.seizureActive,false);
 const before=structuredClone(p);readPatientObservations(p,p.caseId,42);assert.deepEqual(p,before);
 assert.deepEqual(p.neurology,{eye:1,verbal:1,motor:4,seizureActive:true},'the authored baseline is immutable');
});

test('neurological response does not accept foreign, future, duplicate or unmatched medication proof',()=>{
 for(const corrupt of [p=>p.administrationLog[1].patientUid='another',
  p=>p.administrationLog[1].completedAtNativeMinute=100,
  p=>p.administrationLog.push(structuredClone(p.administrationLog[1])),p=>p.treatments.pop()]){
  const p=neurologicalPatient();completedMedication(p,'lorazepam',1);completedMedication(p,'levetiracetam',2);corrupt(p);
  const n=readNeurologicalState(p,50);
  assert.equal(n.seizureActive,true);assert.deepEqual([n.eye,n.verbal,n.motor],[1,1,4]);
 }
});

test('an owned neurological complication worsens and then recovers toward its disease baseline without curing it',()=>{
 const c=neurologyPack.cases.find(c=>c.id==='NEUR-08'),candidate=c.clinicalPolicy.complications[0],
  p={...neurologicalPatient(),caseId:c.id,neurology:structuredClone(c.clinicalPolicy.neurologyBaseline),
   observationResponses:c.clinicalPolicy.observationResponses||[],
   variation:{complicationCandidates:[{id:candidate.id}]}};
 advanceClinicalComplications(p,c,25);advanceClinicalComplications(p,c,35);
 let n=readNeurologicalState(p,35);
 assert.deepEqual([n.eye,n.verbal,n.motor],[2,2,4]);assert.equal(n.seizureActive,true);
 completedMedication(p,'lorazepam',35);completedMedication(p,'levetiracetam',35);
 advanceClinicalComplications(p,c,35);
 assert.equal(readNeurologicalState(p,35).verbal,2,'rescue does not erase the complication immediately');
 advanceClinicalComplications(p,c,45);n=readNeurologicalState(p,45);
 assert.deepEqual([n.eye,n.verbal,n.motor],[3,3,5]);
 advanceClinicalComplications(p,c,55);n=readNeurologicalState(p,55);
 assert.deepEqual([n.eye,n.verbal,n.motor],[4,4,6]);assert.equal(n.seizureActive,false);
 assert.equal(n.infectiousConfusion,true);assert.equal(n.focalDeficit,'Anomia y amnesia reciente');
 assert.deepEqual(p.neurology,c.clinicalPolicy.neurologyBaseline);
});
