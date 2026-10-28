import test from 'node:test';
import assert from 'node:assert/strict';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {confirmedNativeSupportEffects487} from './native-support-487.js';
import {clinicalPolicyTargets} from './clinical-policy-effects.js';
test('a declared pressor response has one beneficial owner while inherited excess-dose harm remains',()=>{
 const c=cardiologyPack.cases.find(x=>x.id==='CARD-10'),row={id:'vasopressor',patientUid:'p',sourceEventId:'pressor',
  action:'start',route:'iv',dose:{amount:.05,unit:'µg/kg/min'},administeredAtNativeMinute:1};
 const p={uid:'p',liveVitals:{hr:120,rr:30,sys:82,dia:48,spo2:88},administrationLog:[row],treatments:[structuredClone(row)],
  procedures:{vasopressor:{patientUid:'p',sourceEventId:'pressor',active:true,moleculeId:'norepinephrine',dose:{...row.dose}}}};
 const inherited=confirmedNativeSupportEffects487(p,c,60);
 assert.equal(inherited.offsets.sys,0);assert.equal(inherited.offsets.dia,0);
 const baseline=clinicalPolicyTargets({...p,administrationLog:[],treatments:[],procedures:{}},c,60),policy=clinicalPolicyTargets(p,c,60);
 assert.equal(policy.sys-baseline.sys,18);assert.equal(policy.dia-baseline.dia,9);
 row.dose.amount=.3;p.treatments[0].dose.amount=.3;p.procedures.vasopressor.dose.amount=.3;
 const excessive=confirmedNativeSupportEffects487(p,c,60);
 assert(excessive.drugs.vasopressor.toxicity.hr>0);assert.deepEqual(excessive.offsets,excessive.drugs.vasopressor.toxicity);
});
