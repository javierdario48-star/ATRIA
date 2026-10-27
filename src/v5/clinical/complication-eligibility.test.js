import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateComplicationCandidate,evaluatePatientComplications} from './complication-eligibility.js';
const c={id:'fatigue',progressionId:'asthma-fatigue',rescueId:'ventilation'};
const ctx={nativeMinute:15,clinicalState:{workOfBreathing:'high'},registeredProgressions:{'asthma-fatigue':({nativeMinute,clinicalState})=>nativeMinute>=10&&clinicalState.workOfBreathing==='high'},registeredRescues:{ventilation:()=>true}};
test('unregistered complication never fires',()=>assert.equal(evaluateComplicationCandidate(c,{nativeMinute:15}).status,'unsupported'));
test('registered clinical owner determines eligibility',()=>{assert.equal(evaluateComplicationCandidate(c,{...ctx,nativeMinute:5}).status,'not-eligible');assert.equal(evaluateComplicationCandidate(c,ctx).status,'eligible');});
test('eligibility is pure and does not mutate physiology',()=>{const patient={variation:{complicationCandidates:[c]},liveVitals:{spo2:92}};const before=structuredClone(patient);assert.equal(evaluatePatientComplications(patient,ctx)[0].status,'eligible');assert.deepEqual(patient,before);});
test('missing rescue is not eligible',()=>assert.equal(evaluateComplicationCandidate(c,{...ctx,registeredRescues:{}}).status,'unsupported'));
