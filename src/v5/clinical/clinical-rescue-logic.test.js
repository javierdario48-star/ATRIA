import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalRescueAlternatives,confirmedClinicalRescue,outstandingClinicalRescue} from './clinical-rescue-logic.js';
import {complicationDispositionRequirements} from './clinical-disposition-safety.js';
import {resp01V2Candidate as respiratory} from '../content/packs/respiratory-v2-candidate.js';
import {varixV2Candidate as bleeding} from '../content/packs/varix-v2-candidate.js';

test('one generic AND-OR contract powers treatment proof and pending closure requirements',()=>{
 const c={rescueAllOf:['amoxicillin'],rescueAnyOf:['oxygen','doxycycline']};
 assert.deepEqual(clinicalRescueAlternatives(c),[['amoxicillin','oxygen'],['amoxicillin','doxycycline']]);
 assert.deepEqual(outstandingClinicalRescue(c,['amoxicillin']),[['oxygen'],['doxycycline']]);
 assert.deepEqual(outstandingClinicalRescue(c,['oxygen']),[['amoxicillin']]);
 assert.deepEqual(outstandingClinicalRescue(c,['amoxicillin','doxycycline']),[]);
 const receipts={amoxicillin:{id:'amoxicillin',sourceEventId:'a',administeredAtNativeMinute:2},
  doxycycline:{id:'doxycycline',sourceEventId:'d',administeredAtNativeMinute:4},
  oxygen:{id:'oxygen',sourceEventId:'o',administeredAtNativeMinute:5}};
 assert.deepEqual(confirmedClinicalRescue(c,id=>receipts[id]).evidence.map(r=>r.id),
  ['amoxicillin','doxycycline'],'the earliest actual alternative satisfies native rescue');
 delete receipts.amoxicillin;
 assert.equal(confirmedClinicalRescue(c,id=>receipts[id]).rescued,false);
 assert.deepEqual(confirmedClinicalRescue({},id=>receipts[id]),{rescued:false,evidence:[]});
});
test('different disease identities accept the same alternatives without a per-case rescue patch',()=>{
 for(const original of [respiratory,bleeding]){
  const c=structuredClone(original);
  c.id='synthetic-'+original.id;
  const def={id:'synthetic-deterioration',rescueAllOf:['amoxicillin'],
   rescueAnyOf:['oxygen','doxycycline']};
  c.clinicalPolicy.complications=[def];
  const patient={policyState:{complications:[{id:def.id,status:'active',onsetAt:1}]}};
  const decide=(destination,fulfilled,deferred=[])=>complicationDispositionRequirements({
   patient,caseData:c,destination,fulfilled,continuation:{deferredTreatmentIds:deferred}});
  assert.deepEqual(decide('procedimiento',new Set())[0].anyOf,
   [['amoxicillin','oxygen'],['amoxicillin','doxycycline']]);
  assert.deepEqual(decide('procedimiento',new Set(['amoxicillin']))[0].anyOf,
   [['oxygen'],['doxycycline']]);
  assert.deepEqual(decide('procedimiento',new Set(['amoxicillin','doxycycline'])),[]);
  assert.deepEqual(decide('alta',new Set(['amoxicillin','doxycycline'])).map(x=>x.reason),
   ['manifested-complication-recovery']);
  assert.deepEqual(decide('procedimiento',new Set(['amoxicillin']),['oxygen']),[],
   'receiver-owned alternative is accepted only when continuation is recorded');
  assert.deepEqual(decide('procedimiento',new Set(['amoxicillin']),['not-a-care-option'])[0].anyOf,
   [['oxygen'],['doxycycline']]);
 }
});
test('real V2 rescues retain their authored mandatory actions',()=>{
 for(const c of [respiratory,bleeding]){
  const def=c.clinicalPolicy.complications[0];
  assert.deepEqual(clinicalRescueAlternatives(def),[def.rescueAllOf]);
  assert.deepEqual(outstandingClinicalRescue(def),[def.rescueAllOf]);
 }
});
