import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {additionalCaseInitialVitals,additionalCaseTargets,advanceAdditionalCaseVitals,
 ADDITIONAL_CASE_TRAJECTORIES} from './native-additional-cases.js';
const cases=JSON.parse(fs.readFileSync(new URL('../content/cases.json',import.meta.url)));
const factory=id=>{const c=cases.find(c=>c.id===id);
 return {c,p:{uid:'case-'+id,liveVitals:additionalCaseInitialVitals(c),treatments:[],orders:[],
  administrationLog:[],procedures:{},adverseEvents:[]}};};
for(const id of Object.keys(ADDITIONAL_CASE_TRAJECTORIES)){
 test(id+' disease untreated does not heal spontaneously and remains case-specific',()=>{
  const {c,p}=factory(id),initial={...p.liveVitals};
  advanceAdditionalCaseVitals(p,c,60,200);
  if(id!=='COLON-001')assert(p.liveVitals.hr>initial.hr);
  assert(p.liveVitals.sys<=initial.sys);
  assert(p.liveVitals.spo2<=initial.spo2);
  assert.throws(()=>additionalCaseTargets(p,{...c,id:'UNKNOWN'},40));
 });
}
test('hemorrhage responds only to administered patient-bound transfusion, not an order',()=>{
 const {c,p}=factory('HDA-001'),{p:untreated}=factory('HDA-001');
 p.treatments.push({id:'transfusion',patientUid:p.uid,sourceEventId:'tx1',dose:{amount:1,unit:'unidad'},route:'iv',administeredAtNativeMinute:0});
 p.administrationLog.push({id:'transfusion',patientUid:p.uid,sourceEventId:'tx1',dose:{amount:1,unit:'unidad'},route:'iv',administeredAtNativeMinute:0});
 advanceAdditionalCaseVitals(p,c,60,120);
 advanceAdditionalCaseVitals(untreated,c,60,120);
 assert(p.liveVitals.sys>untreated.liveVitals.sys);
 assert(p.liveVitals.hr<untreated.liveVitals.hr);
});
test('arterial ischemia anticoagulation does not simulate reperfusion or normalize shock',()=>{
 const {c,p}=factory('MESI-001'),{p:bare}=factory('MESI-001');
 p.administrationLog.push({id:'anticoagulation',patientUid:p.uid,sourceEventId:'hep',dose:{amount:1,unit:'protocolo'},route:'iv',administeredAtNativeMinute:0});
 p.treatments.push({id:'anticoagulation',patientUid:p.uid,sourceEventId:'hep',dose:{amount:1,unit:'protocolo'},route:'iv',administeredAtNativeMinute:0});
 advanceAdditionalCaseVitals(p,c,60,250);advanceAdditionalCaseVitals(bare,c,60,250);
 assert.deepEqual(p.liveVitals,bare.liveVitals);
 assert(p.liveVitals.sys<c.vitals.bp.split('/')[0]);
});

test('GI cases inherit confirmed repeat-diuretic harm and freeze physiology after handoff',()=>{
 for(const id of ['UC-AS-001','CDI-001','DIARR-001']){
  const {c,p}=factory(id),{p:untreated}=factory(id);
  for(let i=0;i<13;i++){
   const row={id:'furosemide',patientUid:p.uid,sourceEventId:'furo-'+i,
    dose:{amount:40,unit:'mg'},route:'iv',administeredAtNativeMinute:i};
   p.administrationLog.push(row);p.treatments.push({...row});
  }
  advanceAdditionalCaseVitals(p,c,72,72);
  advanceAdditionalCaseVitals(untreated,c,72,72);
  assert(p.liveVitals.sys<untreated.liveVitals.sys-15,id+' wrong diuresis must lower BP');
  assert(p.liveVitals.hr>untreated.liveVitals.hr+8,id+' wrong diuresis must raise HR');
  const after=structuredClone(p.liveVitals);
  p.caseEnded=true;
  advanceAdditionalCaseVitals(p,c,120,200);
  assert.deepEqual(p.liveVitals,after,id+' transfer freezes all vital changes');
 }
});

test('DIARR-001 oral recovery requires a completed patient-bound conduct and elapsed native time',()=>{
 const {c,p}=factory('DIARR-001'),{p:control}=factory('DIARR-001');
 const oral={id:'oral_rehydration',patientUid:p.uid,sourceEventId:'oral',route:'documented',
  kind:'documented-clinical-conduct',administeredAtNativeMinute:70};
 p.treatments.push({...oral,patientUid:'other-patient'});
 assert.deepEqual(additionalCaseTargets(p,c,145),additionalCaseTargets(control,c,145));
 p.treatments[0]={...oral,status:'pending'};
 assert.deepEqual(additionalCaseTargets(p,c,145),additionalCaseTargets(control,c,145));
 p.treatments[0]=oral;
 for(const minute of [69,70,78])
  assert.deepEqual(additionalCaseTargets(p,c,minute),additionalCaseTargets(control,c,minute));
 const delayed=additionalCaseTargets(p,c,145),untreated=additionalCaseTargets(control,c,145);
 assert(delayed.hr<0&&delayed.sys>0,'confirmed rehydration improves circulation after absorption');
 for(const axis of ['temp','rr','spo2'])assert.equal(delayed[axis],untreated[axis]);
});

test('DIARR-001 oral and confirmed IV fluid share one bounded circulatory response',()=>{
 const {c,p}=factory('DIARR-001'),{p:control}=factory('DIARR-001');
 const fluid={id:'fluid',patientUid:p.uid,sourceEventId:'iv',dose:{amount:250,unit:'ml'},route:'iv',
  administeredAtNativeMinute:1};
 const oral={id:'oral_rehydration',patientUid:p.uid,sourceEventId:'oral',route:'documented',
  kind:'documented-clinical-conduct',administeredAtNativeMinute:1};
 const minute=145,untreated=additionalCaseTargets(control,c,minute);
 p.administrationLog.push(fluid);
 assert.deepEqual(additionalCaseTargets(p,c,minute),untreated,'an unmatched exposure cannot improve perfusion');
 p.treatments.push({...fluid,patientUid:'other-patient'});
 assert.deepEqual(additionalCaseTargets(p,c,minute),untreated,'delivery evidence belongs to the patient');
 p.treatments[0]={...fluid};
 assert.deepEqual(additionalCaseTargets(p,c,0),additionalCaseTargets(control,c,0),'future IV delivery has no effect');
 const small=additionalCaseTargets(p,c,minute);
 fluid.dose={amount:1250,unit:'ml'};
 p.treatments[0]={...fluid};
 const iv=additionalCaseTargets(p,c,minute);
 assert(small.sys>untreated.sys&&iv.sys>small.sys);
 assert(small.hr<untreated.hr&&iv.hr<small.hr);
 p.treatments.push(oral);
 assert.deepEqual(additionalCaseTargets(p,c,minute),iv,'combining routes must not count the same deficit twice');
});
