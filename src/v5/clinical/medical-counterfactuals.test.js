import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADDITIONAL_CASE_TRAJECTORIES,additionalCaseTargets,additionalCaseInitialVitals} from './native-additional-cases.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {GASTRO_CASE_RULES,GASTRO_DYNAMICS} from './gastro-expansion-policies.js';
import {GASTRO_CONDUCT_DOSES} from './gastro-medication-rules.js';

const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const cases=read('cases'),doses=read('default-doses');
const byId=new Map(cases.map(c=>[c.id,c]));
const sample=id=>({uid:'patient-'+id,treatments:[],administrationLog:[],pendingTreatments:[],
 procedures:{},adverseEvents:[],liveVitals:additionalCaseInitialVitals(byId.get(id))});
const medicine=(p,id)=>{
 const dose=doses[id]||GASTRO_CONDUCT_DOSES[id]||{amount:1,unit:'mg'};
 const route=GASTRO_CONDUCT_DOSES[id]?.route||(['steroid','ngt','oral_rehydration','disimpaction'].includes(id)?'documented':'iv');
 const eventId='admin-'+id,when=10;
 p.treatments.push({id,sourceEventId:eventId,patientUid:p.uid,administeredAtNativeMinute:when,
  kind:'documented-clinical-conduct',dose,route});
 if(route==='iv'||GASTRO_CONDUCT_DOSES[id]){
  p.administrationLog.push({id,sourceEventId:eventId,patientUid:p.uid,route,dose,
   administeredAtNativeMinute:when});
 }
};
test('all 25 case seeds have appropriate distinct symptoms and complete clinical data',()=>{
 assert.equal(cases.length,25);
 assert.equal(Object.keys(CLINICAL_EXECUTORS).length,25);
 for(const c of cases){
  assert(c.chief&&c.opening&&c.dx?.length>=1,c.id);
  assert(c.studies?.length&&c.interventions?.length&&c.requiredHistory?.length,c.id);
  assert(c.vitals?.bp&&Number.isFinite(c.vitals.hr)&&Number.isFinite(c.vitals.spo2),c.id);
 }
});
for(const [id,rule] of Object.entries(ADDITIONAL_CASE_TRAJECTORIES)){
 test(id+': matched untreated, queued, confirmed exposures and bounded progress',()=>{
  const c=byId.get(id),before=sample(id);
  const untreated=additionalCaseTargets(before,c,220);
  const pending=sample(id);
  pending.pendingTreatments.push({id:rule.therapy,patientUid:pending.uid,readyAtRealSecond:1});
  assert.deepEqual(additionalCaseTargets(pending,c,220),untreated,
   'queued unadministered medicine must not change physiology');
  const treated=sample(id),therapy=Array.isArray(rule.therapy)?rule.therapy[0]:rule.therapy;
  if(therapy){
   medicine(treated,therapy);
   const after=additionalCaseTargets(treated,c,220);
   assert(after.hr<untreated.hr,
    id+' actually administered indicated therapy should attenuate, not worsen, modeled tachycardia');
   assert(after.sys>=untreated.sys-1e-9,id+' indicated treatment cannot invent hypoperfusion');
  }else assert.deepEqual(additionalCaseTargets(treated,c,220),untreated,
   'no definitive therapy modeled: treatment flags cannot cure the disease');
  assert(Number.isFinite(untreated.hr)&&Number.isFinite(untreated.sys));
 });
}
test('non-variceal hemorrhage: IV PPI is supportive, NOT hemostasis',()=>{
 const id='HDA-001',c=byId.get(id),untreated=sample(id),ppi=sample(id);
 medicine(ppi,'ppi');
 assert.deepEqual(additionalCaseTargets(ppi,c,180),additionalCaseTargets(untreated,c,180));
 assert(additionalCaseTargets(ppi,c,180).sys<0,'bleeding trajectory must still deteriorate');
});
test('fluid can benefit hypovolemia but excess can harm the lungs in all additional-case models',()=>{
 for(const id of Object.keys(ADDITIONAL_CASE_TRAJECTORIES)){
  const c=byId.get(id),pt=sample(id),early=additionalCaseTargets(pt,c,140);
  pt.administrationLog.push({id:'fluid',sourceEventId:'bolus',patientUid:pt.uid,
   route:'iv',dose:{amount:1000,unit:'ml'},administeredAtNativeMinute:15});
  pt.treatments.push({id:'fluid',sourceEventId:'bolus',patientUid:pt.uid,
   route:'iv',dose:{amount:1000,unit:'ml'},administeredAtNativeMinute:15});
  const later=additionalCaseTargets(pt,c,140);
  assert(later.sys>=early.sys,'initial bolus cannot decrease BP in a hemodynamic volume model');
  for(let i=1;i<8;i++){
   const row={id:'fluid',sourceEventId:'bolus-'+i,patientUid:pt.uid,
    route:'iv',dose:{amount:1000,unit:'ml'},administeredAtNativeMinute:15+i};
   pt.administrationLog.push(row);pt.treatments.push({...row});
  }
  const harm=crystalloidOverloadOffsets(pt,c);
  assert(harm.rr>0&&harm.spo2<0,'8L must pose lung overload: '+id);
 }
});
test('evidence: variceal prophylaxis, oral CDI choices and no routine diverticular antibiotics',()=>{
 const p=sample('VARIX-001'),c=byId.get('VARIX-001');
 medicine(p,'ceftriaxone');
 assert(!confirmedClinicalMissteps(p,c).flags.some(x=>x.includes('sin foco infeccioso')));
 for(const id of ['CDI-001','UC-AS-001','DIVERT-001','ENCEF-001','VARIX-001']){
  assert(Object.hasOwn(GASTRO_CASE_RULES,id));
  assert(Object.hasOwn(GASTRO_DYNAMICS,id));
 }
 assert(GASTRO_CASE_RULES['CDI-001'].treatment.some(group=>group.includes('fidaxomicin')));
 assert(GASTRO_CASE_RULES['CDI-001'].treatment.some(group=>group.includes('vancomycin_po')));
 assert(!GASTRO_CASE_RULES['DIVERT-001'].treatment?.length);
 assert(GASTRO_CASE_RULES['UC-AS-001'].study.some(group=>group.includes('g_uc_cdi')));
 assert(GASTRO_CASE_RULES['VARIX-001'].treatment.some(group=>
  group.includes('ceftriaxone')&&group.includes('terlipressin')));
});
test('chronic illness has no imaginary immediate hemodynamic cure',()=>{
 for(const id of ['COLON-001','CELIAC-001','ACAL-001','PUD-001','HEPAT-001']){
  const c=byId.get(id),p=sample(id),v=additionalCaseTargets(p,c,320);
  assert(v.hr>=0,id+' gained a fictitious immediate cure');
 }
});
