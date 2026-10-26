import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADDITIONAL_CASE_TRAJECTORIES,additionalCaseTargets} from './native-additional-cases.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {GASTRO_CASE_RULES,GASTRO_DYNAMICS} from './gastro-expansion-policies.js';
import {evaluateGastroDisposition} from './gastro-closure-v5.js';
import {createGuardSession} from './guard-session.js';

const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const cases=read('cases'),doses=read('default-doses');
const content={cases,defaultDoses:doses,therapies:read('therapies')};
const byId=new Map(cases.map(c=>[c.id,c]));
const comparisons=[];
let sequence=0;
function doctor(caseId){
 const uid='counterfactual-'+(++sequence),session=createGuardSession({roomId:uid,mode:'solo',
  actorId:'doctor',actorName:'QA',patient:{uid,caseId},content,
  resolveContext:()=>({patientUid:uid})});
 let event=0;
 return {session,post:text=>session.post({id:'step-'+(++event),text}),
  async advance(seconds){session.advance(seconds);await session.flush();}};
}
const therapyOrders={terlipressin:'Enfermera terlipresina 2 mg',lactulose:'Enfermera lactulosa 30 ml',
 methylprednisolone:'Enfermera metilprednisolona 60 mg',fidaxomicin:'Enfermera fidaxomicina 200 mg',
 oral_rehydration:'Enfermera sales de rehidratacion oral',disimpaction:'Enfermera desimpactacion',
 steroid:'Enfermera corticoides',ngt:'Enfermera sonda nasogastrica',anticoagulation:'Enfermera heparina'};
const circulatory=new Set(['terlipressin','oral_rehydration']);
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
 test(id+': matched untreated, queued, confirmed exposures and bounded progress',async()=>{
  const c=byId.get(id),treated=doctor(id),control=doctor(id);
  const therapy=Array.isArray(rule.therapy)?rule.therapy[0]:rule.therapy;
  try{
   await treated.post('Enfermera una vía');
   await treated.advance(300);await control.advance(300);
   const minute=control.session.read().clock.nativeMinute;
   const before=additionalCaseTargets(control.session.read().patient,c,minute);
   if(therapy){
    const pending=await treated.post(therapyOrders[therapy]);
    assert.equal(pending.clinical[0]?.status,'pending');
    assert.deepEqual(additionalCaseTargets(treated.session.read().patient,c,minute),before,
     'queued unadministered medicine must not change physiology');
   }
   await treated.advance(300);await control.advance(300);
   const a=treated.session.read(),b=control.session.read(),at=a.clock.nativeMinute;
   assert.equal(at,b.clock.nativeMinute);
   const after=additionalCaseTargets(a.patient,c,at),untreated=additionalCaseTargets(b.patient,c,at);
   if(therapy){
    assert(a.patient.treatments.some(t=>t.id===therapy&&t.patientUid===a.patient.uid));
    comparisons.push({caseId:id,therapy,nativeMinute:at,effect:circulatory.has(therapy)?'circulatory':'not-modeled',
     heartRateUntreated:untreated.hr,heartRateTreated:after.hr,systolicUntreated:untreated.sys,systolicTreated:after.sys});
   }
   if(circulatory.has(therapy)){
    assert(after.hr<untreated.hr&&after.sys>untreated.sys,
     'confirmed volume/variceal support can attenuate the circulatory deterioration');
    for(const axis of ['temp','rr','spo2'])assert.equal(after[axis],untreated[axis]);
   }else assert.deepEqual(after,untreated,
    'non-hemodynamic care must not earn an invented systemic vital-sign response');
   assert(Number.isFinite(untreated.hr)&&Number.isFinite(untreated.sys));
  }finally{treated.session.dispose();control.session.dispose();}
 });
}
test('non-variceal hemorrhage: confirmed IV PPI is supportive, NOT hemostasis',async()=>{
 const id='HDA-001',c=byId.get(id),ppi=doctor(id),control=doctor(id);
 try{
  await ppi.post('Enfermera una vía');await ppi.post('Enfermera pantoprazol 40 mg');
  await ppi.advance(600);await control.advance(600);
  const a=ppi.session.read(),b=control.session.read();
  assert(a.patient.administrationLog.some(x=>x.id==='ppi'));
  assert.deepEqual(additionalCaseTargets(a.patient,c,a.clock.nativeMinute),additionalCaseTargets(b.patient,c,b.clock.nativeMinute));
  assert(additionalCaseTargets(a.patient,c,a.clock.nativeMinute).sys<0,'bleeding trajectory must still deteriorate');
 }finally{ppi.session.dispose();control.session.dispose();}
});
test('fluid can benefit hypovolemia but excess can harm the lungs in all additional-case models',async()=>{
 for(const id of Object.keys(ADDITIONAL_CASE_TRAJECTORIES)){
  const c=byId.get(id),treated=doctor(id),control=doctor(id);
  try{
   await treated.post('Enfermera una vía');await treated.post('Enfermera Ringer 1000 ml');
   await treated.advance(1);await control.advance(1);
   const a=treated.session.read(),b=control.session.read(),minute=a.clock.nativeMinute;
   assert.equal(a.exposure.confirmedCrystalloidMl,1000);
   assert(additionalCaseTargets(a.patient,c,minute).sys>=additionalCaseTargets(b.patient,c,minute).sys);
   for(let i=1;i<8;i++){await treated.post('Enfermera Ringer 1000 ml');await treated.advance(1);}
   const state=treated.session.read();assert.equal(state.exposure.confirmedCrystalloidMl,8000);
   const harm=crystalloidOverloadOffsets(state.patient,c);
   assert(harm.rr>0&&harm.spo2<0,'8L must pose lung overload: '+id);
  }finally{treated.session.dispose();control.session.dispose();}
 }
});
test('evidence: variceal prophylaxis, oral CDI choices and no routine diverticular antibiotics',async()=>{
 const f=doctor('VARIX-001'),c=byId.get('VARIX-001');
 try{
  await f.post('Enfermera una vía');await f.post('Enfermera ceftriaxona 1 g');await f.advance(2);
  const p=f.session.read().patient;assert(p.administrationLog.some(x=>x.id==='ceftriaxone'));
  assert(!confirmedClinicalMissteps(p,c).flags.some(x=>x.includes('sin foco infeccioso')));
 }finally{f.session.dispose();}
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
  const c=byId.get(id),f=doctor(id);
  try{assert(additionalCaseTargets(f.session.read().patient,c,320).hr>=0,id+' gained a fictitious immediate cure');}
  finally{f.session.dispose();}
 }
});

test('severe ulcerative colitis must not be handed off without CDI screening evidence',()=>{
 const c=byId.get('UC-AS-001');
 const base={caseId:c.id,diagnosis:c.dx[0],acceptedDiagnoses:c.dx,
  historyAnswered:c.requiredHistory,historyRelevant:c.requiredHistory,
  examDone:true,examRegionsCount:5,vitalsKnown:true,reassessments:1,
  studiesDone:['g_uc_labs'],delivered:['methylprednisolone'],
  consultsDone:[],disposition:'sala',sys:104,hr:124,rr:22,spo2:97,initialSys:104,
  dead:false,ended:false,extraStudies:[],keyStudies:c.keyStudies,
  keyInterventions:c.keyInterventions,adverseCount:0,uid:'screening-qa'};
 const noScreen=evaluateGastroDisposition(base);
 assert.equal(noScreen.ready,false);
 assert(noScreen.missing.some(m=>m.includes('g_uc_cdi')));
 const screened=evaluateGastroDisposition({...base,studiesDone:['g_uc_labs','g_uc_cdi']});
 assert(!screened.missing.some(m=>m.includes('g_uc_cdi')));
});

test('export matched pharmacology comparison for manual clinical review',()=>{
 assert(comparisons.length>=5,'must have meaningful pharmacological comparators');
 fs.mkdirSync('qa/v5-medical-bot-results',{recursive:true});
 fs.writeFileSync('qa/v5-medical-bot-results/matched-pharmacology.json',
  JSON.stringify({model:'bounded educational physiological trajectories',comparisons},null,2));
});
