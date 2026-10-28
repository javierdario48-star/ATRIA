import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedClinicalTreatment} from './receipts.js';
import * as receipts from './receipts.js';

for(const route of ['iv','oral','inhaled','sc','im'])test('confirmed administration supports '+route+' without trusting an order',()=>{
 const t={id:'drug',patientUid:'p',sourceEventId:'e',administeredAtNativeMinute:2,route,dose:{amount:1,unit:'mg'},completionStatus:'completed'};
 const p={uid:'p',treatments:[t],administrationLog:[structuredClone(t)]};
 assert.equal(confirmedClinicalTreatment(p,'drug',3),t);
 assert.equal(confirmedClinicalTreatment(p,'drug',1),undefined);
 p.administrationLog[0].patientUid='other';assert.equal(confirmedClinicalTreatment(p,'drug',3),undefined);
 p.administrationLog[0].patientUid='p';p.administrationLog[0].status='administering';assert.equal(confirmedClinicalTreatment(p,'drug',3),undefined);
});
test('a procedure needs its patient-bound completed native execution',()=>{
 const t={id:'intubation',patientUid:'p',sourceEventId:'e',administeredAtNativeMinute:2,route:'procedure',kind:'procedure.performed',completionStatus:'completed'};
 const p={uid:'p',treatments:[t],administrationLog:[]};
 assert.equal(confirmedClinicalTreatment(p,'intubation',3),t);
 t.completionStatus='pending';assert.equal(confirmedClinicalTreatment(p,'intubation',3),undefined);
 t.completionStatus='completed';t.kind='consultation.accepted';assert.equal(confirmedClinicalTreatment(p,'intubation',3),undefined);
});

test('timed administration credit requires consistent completed delivery evidence',()=>{
 const completed={id:'drug',patientUid:'p',sourceEventId:'e',administeredAtNativeMinute:2,
  completedAtNativeMinute:32,route:'iv',dose:{amount:2000,unit:'mg'},prescribedDose:{amount:2000,unit:'mg'},
  deliveryFraction:1,status:'completed',completionStatus:'completed'};
 for(const mutate of [
  p=>p.administrationLog[0].completionStatus='pending',
  p=>p.administrationLog[0].completedAtNativeMinute=33,
  p=>p.administrationLog[0].completedAtNativeMinute=1,
  p=>p.treatments[0].completedAtNativeMinute=1,
  p=>p.treatments[0].status='administering',
  p=>p.administrationLog[0].deliveryFraction=.5,
  p=>p.treatments[0].deliveryFraction=.5,
  p=>p.administrationLog[0].prescribedDose.amount=4000
 ]){
  const p={uid:'p',treatments:[structuredClone(completed)],administrationLog:[structuredClone(completed)]};
  assert.equal(confirmedClinicalTreatment(p,'drug',32),p.treatments[0]);
  assert.equal(confirmedClinicalTreatment(p,'drug',31),undefined);
  mutate(p);
  assert.equal(confirmedClinicalTreatment(p,'drug',32),undefined,'inconsistent completion cannot certify the dose');
 }
});

test('delivered administration validates partial exposure without granting completed treatment credit',()=>{
 assert.equal(typeof receipts.isDeliveredClinicalAdministration,'function');
 const partial={id:'drug',patientUid:'p',sourceEventId:'e',administeredAtNativeMinute:2,route:'iv',
  dose:{amount:1000,unit:'mg'},prescribedDose:{amount:2000,unit:'mg'},deliveryFraction:.5,
  status:'administering',completionStatus:'pending'};
 for(const mutate of [
  p=>p.administrationLog[0].patientUid='other',
  p=>p.administrationLog[0].administeredAtNativeMinute=18,
  p=>p.administrationLog[0].dose.amount=0,
  p=>p.administrationLog[0].dose.amount=2000,
  p=>p.administrationLog[0].dose.unit='ml',
  p=>p.administrationLog[0].prescribedDose.amount=4000,
  p=>p.administrationLog[0].deliveryFraction=1,
  p=>p.administrationLog[0].completionStatus='completed',
  p=>p.administrationLog[0].completedAtNativeMinute=17,
  p=>p.administrationLog.push(structuredClone(partial)),
  p=>p.treatments.push(structuredClone(partial))
 ]){
  const p={uid:'p',treatments:[],administrationLog:[structuredClone(partial)]};
  assert.equal(receipts.isDeliveredClinicalAdministration(p,p.administrationLog[0],17),true);
  assert.equal(confirmedClinicalTreatment(p,'drug',17),undefined);
  mutate(p);assert.equal(receipts.isDeliveredClinicalAdministration(p,p.administrationLog[0],17),false);
 }
 const p={uid:'p',treatments:[],administrationLog:[partial]};
 assert.equal(receipts.isDeliveredClinicalAdministration(p,structuredClone(partial),17),false,'a detached record is not an owned administration');
});

test('delivered administration accepts each completed repeat only with its own matching treatment',()=>{
 assert.equal(typeof receipts.isDeliveredClinicalAdministration,'function');
 const first={id:'drug',patientUid:'p',sourceEventId:'first',administeredAtNativeMinute:2,route:'oral',dose:{amount:1,unit:'mg'}};
 const second={...first,sourceEventId:'second',administeredAtNativeMinute:12};
 const p={uid:'p',treatments:[first,second],administrationLog:[structuredClone(first),structuredClone(second)]};
 for(const row of p.administrationLog)assert.equal(receipts.isDeliveredClinicalAdministration(p,row,13),true);
 p.treatments.pop();assert.equal(receipts.isDeliveredClinicalAdministration(p,p.administrationLog[1],13),false);
});

test('the final delivered fraction remains exposure while native completion is being committed',()=>{
 const row={id:'drug',patientUid:'p',sourceEventId:'e',administeredAtNativeMinute:2,route:'iv',
  dose:{amount:2000,unit:'mg'},prescribedDose:{amount:2000,unit:'mg'},deliveryFraction:1,
  status:'administering',completionStatus:'pending'};
 const p={uid:'p',treatments:[],administrationLog:[row]};
 assert.equal(receipts.isDeliveredClinicalAdministration(p,row,32),true);
 assert.equal(confirmedClinicalTreatment(p,'drug',32),undefined);
});
