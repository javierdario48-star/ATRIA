import assert from 'node:assert/strict';
import {csPeritonitisSnapshot487,csPeritonitisEvaluate487} from '../src/clinical/peritonitis-pathways.js';

const c={id:'PERI-TER-001',vitals:{bp:'82/48'}};
const s={
 diagnosis:'peritonitis terciaria',intentHistory:[{id:'onset'}],examDone:true,
 examRegions:new Set(),lastVitalsKnown:true,orders:new Map(),
 administrationLog:[],consults:new Map([['uti',{status:'done'}]]),
 liveVitals:{sys:78,spo2:85},nsCareBaseline:{sys:82},
 phys:{sourceControlled:false},patientDied:false,caseEnded:false,
 patientInstance:{uid:'qa-urgent-1'},monitorTherapies:new Map(),
 therapyExposure:new Map(),pendingTherapies:new Map()
};
const give=id=>{
 s.administrationLog.push({id,m:1,status:'administered'});
 s.monitorTherapies.set(id,{id,startedAt:1});
 if(['oxygen','vasopressor'].includes(id))
  s.therapyExposure.set(id,{lastConfirmedAdministration487:{id,patientId:s.patientInstance.uid,m:1}});
};
const evaluate=()=>csPeritonitisEvaluate487(csPeritonitisSnapshot487(s,c));
give('oxygen');give('vasopressor');give('imipenem');
assert.equal(evaluate().ready,true,'confirmed support + adequate antimicrobial permits UTI handoff');
assert.equal(evaluate().action,'uti');
s.pendingTherapies.set('oxygen',{kind:'therapy_stop'});
assert.equal(evaluate().ready,true,'pending withdrawal must not cancel active oxygen before actual nurse completion');
s.pendingTherapies.delete('oxygen');
s.monitorTherapies.delete('oxygen');
s.administrationLog.push({id:'oxygen',action:'stop',status:'administered',m:2});
assert.equal(evaluate().ready,false,'past oxygen receipt does not satisfy CURRENT hypoxemia after real stop');
assert(evaluate().missing.some(x=>/oxigeno/i.test(x.normalize('NFD').replace(/[\u0300-\u036f]/g,''))));
assert(!csPeritonitisSnapshot487(s,c).administered.includes('oxygen'));
give('oxygen');
assert.equal(evaluate().ready,true,'confirmed restart restores current oxygen support');
s.pendingTherapies.set('vasopressor',{kind:'therapy_stop'});
assert.equal(evaluate().ready,true,'pending pressor stop leaves active hemodynamic support');
s.pendingTherapies.delete('vasopressor');
s.monitorTherapies.delete('vasopressor');
s.administrationLog.push({id:'vasopressor',action:'stop',status:'administered',m:3});
assert.equal(evaluate().ready,false,'withdrawn pressor cannot falsely satisfy shock support');
assert(evaluate().missing.some(x=>/hemodinamico/i.test(x.normalize('NFD').replace(/[\u0300-\u036f]/g,''))));
give('fluid');
assert.equal(evaluate().ready,true,'actual fluid resuscitation remains historically relevant after pressor stop');
assert.equal(evaluate().procedurePerformed,false,'handoff still does not invent completed surgery');

const rollover={...s,administrationLog:[...Array.from({length:79},(_,i)=>({id:'analgesia',m:i})),{id:'imipenem',m:80}],
 monitorTherapies:new Map([['oxygen',{id:'oxygen'}],['vasopressor',{id:'vasopressor'}]]),
 therapyExposure:new Map([
  ['oxygen',{lastConfirmedAdministration487:{id:'oxygen',patientId:s.patientInstance.uid}}],
  ['vasopressor',{lastConfirmedAdministration487:{id:'vasopressor',patientId:s.patientInstance.uid}}]
 ])};
assert.equal(csPeritonitisEvaluate487(csPeritonitisSnapshot487(rollover,c)).ready,true,
 'bounded ledger restores verified currently active support with matching patient UID');
rollover.therapyExposure.get('oxygen').lastConfirmedAdministration487.patientId='different-patient';
assert.equal(csPeritonitisEvaluate487(csPeritonitisSnapshot487(rollover,c)).ready,false,
 'receipt from another patient cannot authorize support');
rollover.therapyExposure.get('oxygen').lastConfirmedAdministration487.patientId=s.patientInstance.uid;
rollover.monitorTherapies.delete('oxygen');
assert.equal(csPeritonitisEvaluate487(csPeritonitisSnapshot487(rollover,c)).ready,false,
 'stale receipt cannot revive a support that is no longer active');

const antibio={...s,administrationLog:[{id:'imipenem',m:2},{id:'imipenem',action:'stop',status:'administered',m:3}],
 monitorTherapies:new Map([['oxygen',{id:'oxygen'}],['vasopressor',{id:'vasopressor'}]]),
 therapyExposure:new Map([
  ['oxygen',{lastConfirmedAdministration487:{id:'oxygen',patientId:s.patientInstance.uid}}],
  ['vasopressor',{lastConfirmedAdministration487:{id:'vasopressor',patientId:s.patientInstance.uid}}]
 ])};
assert.equal(csPeritonitisEvaluate487(csPeritonitisSnapshot487(antibio,c)).ready,true,
 'antibiotic initial coverage is a past-confirmed requirement, unlike continuous support');
console.log('ATRIA EMERGENCY CONTINUOUS SUPPORT EVIDENCE PASS',JSON.stringify({
 caseId:c.id,historyVersusActiveSupport:true,nativeConfirmedStop:true,
 pendingDoesNotStop:true,rollbackHistoryBounded:true,patientReceiptIsolation:true,
 antibioticsRemainCompliance:true,changesToSurgeryRules:0,physicalBrowser:false
}));
