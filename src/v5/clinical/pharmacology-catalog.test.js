import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCasePharmacology} from './pharmacology-catalog.js';
import {createGuardSession} from './guard-session.js';
import {PHARMA_RULES_487} from '../../clinical/pharmacology-registry-487.js';

const read=id=>JSON.parse(readFileSync(new URL('../content/'+id+'.json',import.meta.url)));
const cases=read('cases'),therapies=read('therapies');
const caseBy=id=>cases.find(c=>c.id===id);
const baseVitals=c=>{const [sys,dia]=c.vitals.bp.split('/').map(Number);
 return {sys,dia,hr:c.vitals.hr,rr:c.vitals.rr,spo2:c.vitals.spo2,temp:c.vitals.temp};
};
const fresh=(c,uid='P1')=>({uid,caseId:c.id,liveVitals:baseVitals(c),
 administrationLog:[],treatments:[],pendingTreatments:[],procedures:{},
 phys:{sourceControlled:false,effectiveVolume:Number(c.physiology?.effectiveVolume??1)}});
const give=(p,id,atNativeMinute,seq=1,action)=>{
 // Native support now validates real formulations and a paired treatment,
 // just as morphine already did. A fictitious 500mg albumin/pressor/blood
 // row is not a legitimate fixture for the recovered execution contract.
 const support={albumin:{amount:1.5,unit:'g/kg'},transfusion:{amount:1,unit:'unidad'},
  vasopressor:{amount:.05,unit:'µg/kg/min'}};
 const dose=support[id]||(id==='oxygen'?{amount:4,unit:'L/min'}:{amount:id==='morphine'?4:500,unit:'mg'});
 if(id==='vasopressor'&&!action)action='start';
 const row={id,patientUid:p.uid,sourceEventId:'tx-'+seq,administeredAtNativeMinute:atNativeMinute,
  dose,...(action?{action}:{}),...(support[id]?{route:'iv'}:{})};
 p.administrationLog.push(row);
 if(id==='morphine'||support[id])p.treatments.push(structuredClone(row));
 if(id==='vasopressor')p.procedures.vasopressor={patientUid:p.uid,active:action!=='stop',
  moleculeId:'norepinephrine',sourceEventId:row.sourceEventId,dose:structuredClone(dose)};
 return row;
};
test('all 25 cases and all globally registered drugs compile; 29 V4 drug rules remain intact',()=>{
 const catalog=createCasePharmacology({cases,therapies});
 assert.equal(catalog.caseIds().length,25);
 assert.equal(catalog.drugs().length,therapies.length);
 assert.equal(Object.keys(PHARMA_RULES_487).length,29);
 for(const c of cases){
  const view=catalog.forCase(c.id);
  assert.equal(view.drugs.length,therapies.length,c.id);
  for(const r of view.drugs){
   assert.equal(typeof r.route,'string');
   assert(Array.isArray(r.hazards)&&Array.isArray(r.indications));
   if(r.mechanism!=='unmodeled')assert(r.onsetMin<=r.peakMin);
  }
 }
 const unknown=catalog.drugs().find(d=>d.id==='anticoagulation');
 assert.equal(unknown.mechanism,'unmodeled');
 assert.equal(unknown.onsetMin,null);
});
test('C12d each case has default sign/time reactions to every known drug without mutating vitals',()=>{
 const catalog=createCasePharmacology({cases,therapies});
 let pairs=0;
 for(const c of cases)for(const drug of therapies){
  for(const state of [
   {sys:76,dia:43,spo2:83,hr:137,rr:31,temp:38.6},
   {sys:122,dia:78,spo2:98,hr:87,rr:17,temp:37.0},
   {sys:108,dia:67,spo2:92,hr:113,rr:25,temp:37.9}
  ])for(const time of [0,30,240]){
   const p=fresh(c);p.liveVitals={...state};
   give(p,drug.id,0,1);
   const original=structuredClone(p);
   const response=catalog.evaluate(c.id,p,time);
   const r=response.drugs.find(x=>x.id===drug.id);
   assert(r&&r.state==='confirmed');
   for(const [axis,v] of Object.entries(r.candidateOffsets)){
    assert(Number.isFinite(v)&&Math.abs(v)<=50,c.id+'/'+drug.id+'/'+axis);
    if(r.ownedAxes.includes(axis))assert.equal(v,0,'native-writer double count prevented');
   }
   assert.deepEqual(p,original,'catalogue must be PURE and never administer/change vitals');
   pairs++;
  }
 }
 assert.equal(pairs,cases.length*therapies.length*3*3);
});
test('C12d unadministered intent does not change state; oxygen stop actually stops projection',()=>{
 const catalog=createCasePharmacology({cases,therapies}),c=caseBy('APP-001'),p=fresh(c);
 const all=catalog.evaluate(c.id,p,0);
 assert.equal(all.drugs.filter(d=>d.state==='confirmed').length,0);
 assert(all.drugs.every(d=>Object.values(d.candidateOffsets).every(n=>n===0)));
 p.liveVitals.spo2=85;
 give(p,'oxygen',1,1,'start');
 const active=catalog.evaluate(c.id,p,5).drugs.find(d=>d.id==='oxygen');
 assert(active.rawOffsets.spo2>0,'the inherited clinical response remains observable');
 assert.equal(active.candidateOffsets.spo2,0,'the native case owns the SpO2 writer');
 const stopped=give(p,'oxygen',6,2,'stop');stopped.dose.amount=0;
 const noLonger=catalog.evaluate(c.id,p,20).drugs.find(d=>d.id==='oxygen');
 assert.equal(noLonger.state,'stopped');
 assert.equal(noLonger.candidateOffsets.spo2,0);
});
test('C12d APP antibiotic regimen needs two confirmed medicines, timing and genuine source control',()=>{
 const catalog=createCasePharmacology({cases,therapies}),c=caseBy('APP-001'),p=fresh(c);
 give(p,'ceftriaxone',5,1);
 assert.equal(catalog.evaluate(c.id,p,100).outcomes.coverageComplete,false);
 give(p,'metronidazole',6,2);
 const covered=catalog.evaluate(c.id,p,180).outcomes;
 assert.equal(covered.coverageComplete,true);
 assert(covered.infectionBurdenIndex>0&&covered.infectionBurdenIndex<1);
 p.phys.sourceControlled=true;
 assert(catalog.evaluate(c.id,p,180).outcomes.infectionBurdenIndex<covered.infectionBurdenIndex);
 const early=catalog.evaluate(c.id,p,6);
 assert.equal(early.outcomes.coverageComplete,true);
 assert.equal(early.outcomes.infectionBurdenIndex,1,'a confirmed antibiotic needs time to act');
});
test('C12d CIRR native fluid overload and APP fluid effects cannot be applied twice',()=>{
 const catalog=createCasePharmacology({cases,therapies});
 for(const name of ['APP-001','CIRR-001']){
  const c=caseBy(name),p=fresh(c);
  give(p,'fluid',0);
  const fluid=catalog.evaluate(name,p,240).drugs.find(r=>r.id==='fluid');
  assert(fluid.ownedAxes.length>=2);
  assert(fluid.ownedAxes.every(k=>fluid.candidateOffsets[k]===0));
 }
});
test('C12d future cases get conservative fallback, allow explicit traits/coverage and bounded case modifiers',()=>{
 const unknown={id:'FUTURE-001',vitals:{bp:'87/48',spo2:84,hr:122,rr:27,temp:38.5},interventions:[]};
 const catalog=createCasePharmacology({cases:[...cases,unknown],therapies});
 const base=catalog.forCase('FUTURE-001');
 assert.deepEqual(base.profile.traits,['undifferentiated']);
 const p=fresh(unknown);
 give(p,'oxygen',0,1);
 const oxygen=catalog.evaluate('FUTURE-001',p,30).drugs.find(x=>x.id==='oxygen');
 assert(oxygen.candidateOffsets.spo2>0,'responsive to measured hypoxemia');
 assert.equal(catalog.evaluate('FUTURE-001',p,30).outcomes.infectionBurdenIndex,0,
  'no invented infection for unknown case');
 const tailored={...unknown,id:'FUTURE-INFECTION',pharmacology:{
  traits:['infection','uncontrolledSource','pain'],coverageSets:[['ceftriaxone','metronidazole']],
  overrides:{morphine:{responseScale:.5,extraWarnings:['risk-of-hypotension']}}
 }};
 const tailoredCatalog=createCasePharmacology({cases:[tailored],therapies});
 assert.equal(tailoredCatalog.forCase(tailored.id).drugs.find(x=>x.id==='morphine').scale,.5);
 const t=fresh(tailored);give(t,'ceftriaxone',0,1);give(t,'metronidazole',0,2);
 assert.equal(tailoredCatalog.evaluate(tailored.id,t,180).outcomes.coverageComplete,true);
 assert.throws(()=>createCasePharmacology({cases:[{...tailored,pharmacology:{traits:['infection']}}],therapies}),/coverageSets/);
});
test('C12d unknown catalog entries, missing legacy drug, invalid overrides and duplicate case IDs fail closed',()=>{
 assert.throws(()=>createCasePharmacology({cases,therapies:[...therapies,{id:'miracle',label:'Miracle'}]}),/unreviewed global treatment/);
 assert.throws(()=>createCasePharmacology({cases,therapies:therapies.filter(t=>t.id!=='morphine')}),/missing inherited pharmacology/);
 assert.throws(()=>createCasePharmacology({cases:[...cases,cases[0]],therapies}),/duplicate case pharmacology/);
 assert.throws(()=>createCasePharmacology({cases:[{...cases[0],pharmacology:{overrides:{oxygen:{responseScale:20}}}}],therapies}),/invalid case response scale/);
 assert.throws(()=>createCasePharmacology({cases:[{...cases[0],pharmacology:{overrides:{unknown:{responseScale:1}}}}],therapies}),/unknown case drug override/);
});
test('C12d repeated receipt identities, mismatched patient IDs or future timestamp cannot manufacture drug effects',()=>{
 const catalog=createCasePharmacology({cases,therapies}),c=caseBy('CIRR-001'),p=fresh(c);
 give(p,'fluid',1,1);
 assert.throws(()=>catalog.evaluate(c.id,p,0),/outside native time/);
 p.administrationLog.push({...p.administrationLog[0]});
 assert.throws(()=>catalog.evaluate(c.id,p,2),/duplicate confirmed administration/);
 p.administrationLog.pop();p.administrationLog[0].patientUid='different';
 assert.throws(()=>catalog.evaluate(c.id,p,2),/invalid or duplicate/);
});

test('C12d live solo APP uses the same inherited drug catalogue but only confirmed native treatments count',async()=>{
 const content={cases,therapies,defaultDoses:read('default-doses')};
 const session=createGuardSession({roomId:'pharm-APP',mode:'solo',actorId:'doctor',
  actorName:'Doctor',patient:{uid:'P1',caseId:'APP-001'},content,
  resolveContext:()=>({patientUid:'P1'})});
 try{
  assert.equal(session.pharmacologyRules().drugs.length,therapies.length);
  let state=session.pharmacologyRead();
  assert.equal(state.outcomes.coverageComplete,false);
  assert.equal(state.drugs.filter(d=>d.state==='confirmed').length,0);
  await session.post({id:'iv',text:'Enfermera dos vías'});
  const order=await session.post({id:'antibiotics',
   text:'Enfermera ceftriaxona 1 g y metronidazol 500 mg'});
  assert.deepEqual(order.clinical.map(x=>x.status),['pending','pending']);
  state=session.pharmacologyRead();
  assert.equal(state.outcomes.coverageComplete,false,'a prescription is not a drug exposure');
  session.advance(1.51);await session.flush();
  state=session.pharmacologyRead();
  assert.equal(state.drugs.find(d=>d.id==='ceftriaxone').state,'confirmed');
  assert.equal(state.drugs.find(d=>d.id==='metronidazole').state,'confirmed');
  assert.equal(state.outcomes.coverageComplete,true);
  assert.equal(state.outcomes.infectionBurdenIndex,1,'antibiotic effects cannot be instantaneous');
  assert.equal(session.read().patient.administrationLog.length,2);
  await session.post({id:'antibiotics',text:'Enfermera ceftriaxona 1 g y metronidazol 500 mg'});
  assert.equal(session.read().patient.administrationLog.length,2);
  assert.equal(session.pharmacologyRead().drugs.find(d=>d.id==='ceftriaxone').sourceEventId,
   state.drugs.find(d=>d.id==='ceftriaxone').sourceEventId);
 }finally{session.dispose();}
});
test('C12d solo CIRR exposes every inherited medication without authorizing unimplemented ones',async()=>{
 const content={cases,therapies,defaultDoses:read('default-doses')};
 const session=createGuardSession({roomId:'pharm-CIRR',mode:'solo',actorId:'doctor',
  actorName:'Doctor',patient:{uid:'P2',caseId:'CIRR-001'},content,
  resolveContext:()=>({patientUid:'P2'})});
 try{
  assert.equal(session.pharmacologyRules().drugs.length,therapies.length);
  const attempted=await session.post({id:'unsupported',text:'Enfermera vasopresor'});
  assert.equal(attempted.clinical[0].status,'rejected');
  assert.equal(session.pharmacologyRead().drugs.find(d=>d.id==='vasopressor').state,'not-administered');
  const first=await session.post({id:'oxygen',text:'Enfermera oxígeno 4 L/min'});
  assert.equal(first.clinical[0].status,'executed');
  assert.equal(session.pharmacologyRead().drugs.find(d=>d.id==='oxygen').state,'confirmed');
  const stopped=await session.post({id:'stopoxygen',text:'Enfermera suspender oxígeno'});
  assert.equal(stopped.clinical[0].status,'executed');
  assert.equal(session.pharmacologyRead().drugs.find(d=>d.id==='oxygen').state,'stopped');
 }finally{session.dispose();}
});
