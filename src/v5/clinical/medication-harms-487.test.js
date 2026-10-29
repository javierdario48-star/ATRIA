import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advanceLegacy}
 from '../../../qa/physiology-live/native-journey-487.mjs';
import {confirmedMedicationHarms487,documentMedicationComplications487} from './medication-harms-487.js';
import {CLINICAL_TREATMENTS} from '../content/clinical-treatment-definitions.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
import {createGuardSession} from './guard-session.js';
const load=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const c=content.cases.find(x=>x.id==='APP-001');
function patient(){
 const row={id:'ceftriaxone',label:'Ceftriaxona',patientUid:'P',sourceEventId:'dose',
  dose:{amount:1000,unit:'mg'},administeredAtNativeMinute:.18};
 return {uid:'P',severeAllergies:['ceftriaxone'],administrationLog:[row],treatments:[{...row}]};
}
function administer(p,id,minute,sourceEventId='confirmed-'+id){
 const t=CLINICAL_TREATMENTS[id];
 const row={id,label:t.label,patientUid:p.uid,sourceEventId,route:t.route,
  dose:structuredClone(t.dose),administeredAtNativeMinute:minute};
 p.administrationLog.push(row);p.treatments.push(structuredClone(row));return row;
}
test('genuinely delivered partial infusion can trigger allergy before completion without premature treatment credit',()=>{
 const p=patient(),row=p.administrationLog[0];p.treatments=[];
 Object.assign(row,{route:'iv',status:'administering',completionStatus:'pending',
  dose:{amount:250,unit:'mg'},prescribedDose:{amount:1000,unit:'mg'},deliveryFraction:.25});
 assert.ok(confirmedMedicationHarms487(p,c,5).reactions.some(x=>x.kind==='severe-drug-allergy'&&x.severity>0));
 assert.equal(p.treatments.length,0);
 row.dose.amount=0;row.deliveryFraction=0;
 assert.deepEqual(confirmedMedicationHarms487(p,c,5).reactions,[]);
 row.dose.amount=300;row.deliveryFraction=.25;
 assert.throws(()=>confirmedMedicationHarms487(p,c,5),/unique confirmed/);
});
test('a true IM adrenaline receipt gradually reduces only the severe allergic episode',()=>{
 const p=patient(),at=3,baseline=confirmedMedicationHarms487(p,c,at);
 administer(p,'epi_im',at);
 assert.deepEqual(confirmedMedicationHarms487(p,c,at).offsets,baseline.offsets);
 assert.deepEqual(confirmedMedicationHarms487(p,c,at+1).offsets,confirmedMedicationHarms487(patient(),c,at+1).offsets);
 const middle=confirmedMedicationHarms487(p,c,at+3),full=confirmedMedicationHarms487(p,c,at+5);
 assert(middle.offsets.sys>baseline.offsets.sys&&middle.offsets.sys<0);
 assert(full.offsets.sys>middle.offsets.sys&&full.offsets.sys<0,'one IM dose does not promise instant or complete recovery');
 assert.deepEqual(full.reactions[0].rescueSourceEventIds,['confirmed-epi_im']);
 assert.equal(full.reactions[0].sourceEventId,'dose');
 assert.equal(p.liveVitals,undefined,'pure offsets never create or write vital signs');
});
test('a pending, earlier, wrong-route or wrong-dose adrenaline order cannot rescue anaphylaxis',()=>{
 const untreated=confirmedMedicationHarms487(patient(),c,8).offsets;
 for(const change of [
  p=>{p.pendingTreatments=[{id:'epi_im'}];},
  p=>{administer(p,'epi_im',0);},
  p=>{const row=administer(p,'epi_im',3);row.route='iv';p.treatments.at(-1).route='iv';},
  p=>{const row=administer(p,'epi_im',3);row.dose.amount=.05;p.treatments.at(-1).dose.amount=.05;}
 ]){
  const p=patient();change(p);assert.deepEqual(confirmedMedicationHarms487(p,c,8).offsets,untreated);
 }
 const p=patient();administer(p,'epi_im',3);p.treatments.pop();
 assert.throws(()=>confirmedMedicationHarms487(p,c,8),/unique confirmed/);
});
test('repeat IM adrenaline remains tied to distinct actual receipts and preserves progressive rescue',()=>{
 const p=patient();administer(p,'epi_im',3,'epi-1');
 const one=confirmedMedicationHarms487(p,c,10);
 administer(p,'epi_im',8,'epi-2');
 assert.deepEqual(confirmedMedicationHarms487(p,c,8).reactions[0].rescueSourceEventIds,['epi-1','epi-2']);
 assert(confirmedMedicationHarms487(p,c,10).offsets.sys>one.offsets.sys);
 p.administrationLog.push({...p.administrationLog.at(-1)});
 assert.throws(()=>confirmedMedicationHarms487(p,c,10),/unique confirmed/);
});
test('typed nonsevere hypersensitivity causes observable skin findings with modest stress, never shock',()=>{
 const p=patient();p.severeAllergies=[];
 p.allergyHistory=[{drugId:'ceftriaxone',type:'hypersensitivity',severity:'mild',reaction:'urticaria'}];
 const early=confirmedMedicationHarms487(p,c,.18),later=confirmedMedicationHarms487(p,c,6);
 assert.equal(early.reactions[0].severity,0);
 assert.equal(later.reactions[0].kind,'cutaneous-drug-hypersensitivity');
 assert.match(later.reactions[0].manifestation,/Prurito y habones/);
 assert.equal(later.offsets.sys,0);assert.equal(later.offsets.dia,0);assert.equal(later.offsets.spo2,0);
 assert(later.offsets.hr<=3&&later.offsets.rr<=.5);
 p.liveVitals={temp:37,hr:90,rr:18,sys:120,dia:70,spo2:98};
 assert.match(documentMedicationComplications487(p,c,{nativeMinute:6,clinicalMinute:60})[0].message,/cutánea/);
 p.allergyHistory=[{drugId:'ceftriaxone',type:'intolerance',severity:'severe',reaction:'náuseas'}];
 assert.equal(confirmedMedicationHarms487(p,c,6).reactions.length,0);
});
test('new formulary hazard labels and appropriate reperfusion never fabricate hemorrhage or anaphylaxis',()=>{
 for(const id of Object.keys(CLINICAL_TREATMENTS)){
  const p={uid:'P',administrationLog:[],treatments:[]};administer(p,id,0);
  assert.equal(confirmedMedicationHarms487(p,c,30).reactions.length,0,id);
 }
 for(const [caseDef,id] of [[respiratoryPack.cases[5],'alteplase_pe'],[neurologyPack.cases[0],'alteplase_stroke'],[cardiologyPack.cases[0],'heparin_therapeutic']]){
  const p={uid:'P',administrationLog:[],treatments:[]};
  for(let i=0;i<3;i++)administer(p,id,i,`${id}-${i}`);
  assert.equal(confirmedMedicationHarms487(p,caseDef,30).reactions.length,0,caseDef.id);
 }
});
test('new antithrombotics produce bounded gradual harm only with documented bleeding risk and valid receipts',()=>{
 const bleed=content.cases.find(x=>x.id==='HDA-001');
 for(const id of ['aspirin','clopidogrel','ticagrelor','heparin_therapeutic','enoxaparin','alteplase_pe','alteplase_stroke']){
  const p={uid:'P',administrationLog:[],treatments:[]};administer(p,id,1);
  assert.equal(confirmedMedicationHarms487(p,bleed,1).offsets.sys,0,id);
  const response=confirmedMedicationHarms487(p,bleed,6);
  assert(response.offsets.sys<0&&response.offsets.sys>=-48.75,id);
  assert.equal(response.reactions[0].kind,'antithrombotic-bleeding');
  p.treatments=[];assert.throws(()=>confirmedMedicationHarms487(p,bleed,6),/unique confirmed/);
 }
 const p={uid:'P',administrationLog:[],treatments:[]};
 administer(p,'aspirin',1);administer(p,'heparin_therapeutic',1);administer(p,'ticagrelor',1);
 const combined=confirmedMedicationHarms487(p,bleed,10);
 assert(combined.offsets.sys>=-39,'one bounded bleeding envelope for combined treatment');
});
test('allergy offsets reproduce the actual generated 4.8.7 execution at the same elapsed native time',()=>{
 const original=createLiveNativeJourney487('APP-001');
 original.ctx.sim.clinicalFlags={drugAllergies:['ceftriaxone'],severeAllergies:['ceftriaxone']};
 assert.equal(original.ctx.addMonitorTherapy('ceftriaxona 1 g'),true);
 assert.equal(original.ctx.window.csCare487.allergy().active,false);
 advanceLegacy(original,2.5);
 const p=patient(),at=original.ctx.sim.csSevereDrugReaction487.minute;
 for(const seconds of [0,3,10,20,60,100,170]){
  if(seconds)advanceLegacy(original,seconds);
  const old=original.ctx.window.csCare487.allergy();
  const elapsed=original.ctx.sim.gameMinute-at;
  const actual=confirmedMedicationHarms487(p,c,.18+elapsed);
  assert.equal(actual.reactions.length,1);
  for(const [key,value] of Object.entries(old.offsets))
   assert(Math.abs(actual.offsets[key]-value)<1e-8,key+' original versus migrated');
 }
});
test('pending, unspecified-severity and nonmatching allergies never generate severe reaction',()=>{
 const p=patient();
 p.administrationLog=[];
 assert.equal(confirmedMedicationHarms487(p,c,3).reactions.length,0);
 p.administrationLog=p.treatments;
 p.severeAllergies=[];p.allergies=['ceftriaxone'];
 assert.equal(confirmedMedicationHarms487(p,c,3).reactions.length,0);
 p.severeAllergies=['penicillin'];
 assert.equal(confirmedMedicationHarms487(p,c,3).reactions.length,0);
 p.severeAllergies=['cephalosporin'];
 assert(confirmedMedicationHarms487(p,c,3).offsets.sys<0);
});
test('anticoagulant bleeding matches actual 4.8.7 offsets at identical exposure age',()=>{
 const original=createLiveNativeJourney487('APP-001');
 original.ctx.sim.clinicalFlags={activeBleeding:true};
 assert.equal(original.ctx.addMonitorTherapy('heparina IV'),true);
 advanceLegacy(original,2.5);
 const at=original.ctx.sim.csHeparinHarm487.firstMinute;
 const p=patient();p.severeAllergies=[];p.clinicalFlags={activeBleeding:true};
 for(const row of [...p.administrationLog,...p.treatments]){
  row.id='anticoagulation';row.dose={amount:1,unit:'protocolo'};
 }
 for(const seconds of [0,3,10,20,60]){
  if(seconds)advanceLegacy(original,seconds);
  const old=original.ctx.window.csCare487.heparinHarm();
  const actual=confirmedMedicationHarms487(p,c,.18+original.ctx.sim.gameMinute-at);
  for(const [key,value] of Object.entries(old.offsets))
   assert(Math.abs(actual.offsets[key]-value)<1e-8,key+' original anticoagulant harm');
 }
});
test('duplicate, future, wrong patient and unmatched therapy cannot manufacture a reaction',()=>{
 for(const mutate of [
  p=>p.administrationLog.push({...p.administrationLog[0]}),
  p=>p.administrationLog[0].administeredAtNativeMinute=30,
  p=>p.administrationLog[0].patientUid='other',
  p=>p.treatments=[],
  p=>p.treatments[0].dose={amount:500,unit:'mg'},
  p=>p.administrationLog[0].administeredAtRealSecond=1,
  p=>p.administrationLog[0].status='pending',
  p=>p.administrationLog.push({...p.administrationLog[0],id:'unrelated-drug'})
 ]){
  const p=patient();mutate(p);
  assert.throws(()=>confirmedMedicationHarms487(p,c,3),/unique confirmed/);
 }
});
test('physical nursing preserves travel and preparation before an unblocked allergenic IV order',async()=>{
 let arrived=[],accepted=[];
 const jobs=[],s=createGuardSession({roomId:'allergy-nurse',mode:'solo',actorId:'doc',actorName:'Doctor',
  patient:{uid:'P',caseId:'APP-001',allergies:[{drugId:'ceftriaxone',severity:'severe'}]},content,
  resolveContext:()=>({patientUid:'P'}),nursing:{
   enqueue:job=>{jobs.push(job);return {status:'travelling'};},
   takeArrivals:()=>{const x=arrived;arrived=[];return x;},
   accept:result=>{accepted.push(result);return {status:result.status==='executed'?'confirmed':'rejected'};}
  }});
 try{
  await s.post({id:'iv',text:'Enfermera una vía'});
  arrived.push(jobs[0]);s.finishNurseArrivals();await s.flush();
  const ack=await s.post({id:'pair',text:'Enfermera ceftriaxona 1 g y metronidazol 500 mg'});
  assert.deepEqual(ack.clinical.map(x=>x.status),['pending','pending']);
  s.advance(26);await s.flush();
  assert.equal(s.read().patient.administrationLog.length,0);
  assert.equal(s.read().patient.adverseEvents.length,0);
  arrived.push(...jobs.slice(1));s.finishNurseArrivals();
  s.advance(1.4);await s.flush();assert.equal(s.read().patient.administrationLog.length,0);
  s.advance(26);await s.flush();
  assert.equal(s.read().patient.administrationLog.length,2);
  assert.equal(s.read().patient.adverseEvents.length,1);
  assert.equal(accepted.length,3);
 }finally{s.dispose();}
});

test('repeated confirmed IV diuretic causes a documented event only after measured hypotension',()=>{
 const p={uid:'P',liveVitals:{temp:38,hr:120,rr:20,sys:110,dia:70,spo2:98},
  administrationLog:[],treatments:[],adverseEvents:[]};
 for(let i=0;i<13;i++){
  const row={id:'furosemide',label:'Furosemida IV',patientUid:p.uid,sourceEventId:'furo-'+i,
   route:'iv',dose:{amount:40,unit:'mg'},administeredAtNativeMinute:i};
  p.administrationLog.push(row);p.treatments.push({...row});
 }
 assert.equal(confirmedMedicationHarms487(p,c,20).reactions[0].severity,0,
  'dose count alone does not invent an observed injury');
 p.liveVitals.sys=92;
 const harm=confirmedMedicationHarms487(p,c,20);
 assert.equal(harm.reactions.length,1);
 assert.equal(harm.reactions[0].kind,'diuretic-volume-depletion');
 assert.equal(harm.offsets.sys,0,'documentation never doubles the native pressure effect');
 const events=documentMedicationComplications487(p,c,{nativeMinute:20,clinicalMinute:166});
 assert.equal(events.length,1);
 assert.match(events[0].message,/furosemida IV/);
 assert.equal(documentMedicationComplications487(p,c,{nativeMinute:21,clinicalMinute:175}).length,0,
  'repeated observations cannot duplicate the same event');
 p.liveVitals.sys=116;
 assert.equal(documentMedicationComplications487(p,c,{nativeMinute:22,clinicalMinute:183}).length,0);
 assert.equal(p.adverseEvents[0].status,'resolved','recovery must clear active adverse-event state');
 p.caseEnded=true;
 assert.deepEqual(documentMedicationComplications487(p,c,{nativeMinute:22,clinicalMinute:183}),[]);
 const invalid={...p,caseEnded:false,administrationLog:p.administrationLog,
  treatments:p.treatments.slice(1)};
 assert.throws(()=>confirmedMedicationHarms487(invalid,c,22),/unique confirmed/);
});
