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
 p.treatments.push({id:'transfusion',patientUid:p.uid,sourceEventId:'tx1',dose:{amount:1,unit:'unidad'}});
 p.administrationLog.push({id:'transfusion',patientUid:p.uid,sourceEventId:'tx1',dose:{amount:1,unit:'unidad'}});
 advanceAdditionalCaseVitals(p,c,60,120);
 advanceAdditionalCaseVitals(untreated,c,60,120);
 assert(p.liveVitals.sys>untreated.liveVitals.sys);
 assert(p.liveVitals.hr<untreated.liveVitals.hr);
});
test('ischemia anticoagulation slows progression but never normalizes untreated shock',()=>{
 const {c,p}=factory('MESI-001'),{p:bare}=factory('MESI-001');
 p.administrationLog.push({id:'anticoagulation',patientUid:p.uid,sourceEventId:'hep',dose:{amount:1,unit:'protocolo'}});
 p.treatments.push({id:'anticoagulation',patientUid:p.uid,sourceEventId:'hep',dose:{amount:1,unit:'protocolo'},administeredAtNativeMinute:0});
 advanceAdditionalCaseVitals(p,c,60,250);advanceAdditionalCaseVitals(bare,c,60,250);
 assert(p.liveVitals.sys>bare.liveVitals.sys);
 assert(p.liveVitals.sys<c.vitals.bp.split('/')[0]);
});
