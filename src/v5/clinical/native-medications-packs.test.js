import test from 'node:test';
import assert from 'node:assert/strict';
import {IV_MEDICINES,NATIVE_MEDICINES,isStandardIVMedicine,isNativeMedicine,
 parseNativeMedicineDose,preflightNativeMedicine,createIVAdministration} from './native-medications.js';
import {clinicalInterventionEligibility} from './native-medication-eligibility.js';
import {respiratoryCaseDefinitions} from '../content/packs/respiratory-pack.js';
import {cardiologyCaseDefinitions} from '../content/packs/cardiology-pack.js';
import {neurologyCaseDefinitions} from '../content/packs/neurology-pack.js';
import {createAcuteCare} from './acute-care.js';
import {confirmedClinicalTreatment} from './receipts.js';

const find=id=>[...respiratoryCaseDefinitions,...cardiologyCaseDefinitions,...neurologyCaseDefinitions].find(c=>c.id===id);
const clock=(real,native=real*.12)=>({clinicalMinute:real,nativeMinute:native});
const command=(id,text,eventId=id,kind='therapy.request')=>({eventId,actorId:'doctor',patientUid:'P',intent:{id,kind,clause:text,sourceText:text}});
const patient=()=>({uid:'P',caseId:'RESP-01',treatments:[],administrationLog:[],pendingTreatments:[],procedures:{},venousAccessCount:0,
 orders:[],intentHistory:[],liveVitals:{temp:37,hr:80,rr:18,sys:120,dia:70,spo2:97}});
const proof=(cmd,row,reused=false)=>({status:'executed',eventId:cmd.eventId,receipt:{...row,reused}});
const rejected=(cmd,reason,message)=>({status:'rejected',eventId:cmd.eventId,reason,message});
const owner=(p,caseData)=>createIVAdministration(p,{caseData,doses:{ceftriaxone:{amount:1000,unit:'mg',display:'1 g'},fluid:{amount:1000,unit:'ml',display:'1 l'}},proof,rejected});
const finishDue=(o,b,a)=>o.due(b,a).flatMap(t=>o.finish(t,t.readyAtRealSecond,
 b.nativeMinute+(a.nativeMinute-b.nativeMinute)*(t.readyAtRealSecond-b.clinicalMinute)/(a.clinicalMinute-b.clinicalMinute)));

test('native formulary extends IV identities with exact non-IV formulations and unit ranges',()=>{
 assert.equal(isStandardIVMedicine('aspirin'),false);assert.equal(isNativeMedicine('aspirin'),true);
 assert.equal(IV_MEDICINES.ceftriaxone.label,'Ceftriaxona IV');
 for(const [id,text,amount,unit] of [['aspirin','aspirina 150 mg oral',150,'mg'],
  ['salbutamol','salbutamol 2,5 mg nebulizado',2.5,'mg'],['enoxaparin','enoxaparina 1 mg/kg SC',1,'mg/kg'],
  ['esmolol','esmolol 50 mcg/kg/min IV',50,'mcg/kg/min'],['epi_im','adrenalina 0,5 mg IM',.5,'mg']]){
  const dose=parseNativeMedicineDose(id,text);assert.equal(dose.amount,amount);assert.equal(dose.unit,unit);
 }
 for(const [id,text] of [['aspirin','aspirina 300 mg IV'],['salbutamol','salbutamol 50 mg nebulizado'],
  ['enoxaparin','enoxaparina 1 mg IV'],['nitroglycerin','nitroglicerina 10 mg IV'],
  ['salbutamol','salbutamol 5 mg y 2 mg nebulizados'],['aspirin','aspirina -300 mg'],
  ['nimodipine','nimodipino 60 mg intravenoso'],['epi_im','adrenalina 0,5 mg IV']])assert.throws(()=>parseNativeMedicineDose(id,text),undefined,text);
 assert.equal(parseNativeMedicineDose('anticoagulation_reversal','4F-PCC').amount,25);
 assert.equal(NATIVE_MEDICINES.salbutamol.requiresAccess,false);
 assert.equal(parseNativeMedicineDose('azithromycin','azitromicina 500 mg IV en 60 min cada 24 horas').amount,500);
 assert.throws(()=>parseNativeMedicineDose('azithromycin','azitromicina 500 mg IV en 1 min'),/unsupported-administration-timing/);
});

test('case regimen supplies real default and explicit dose contract instead of legacy GI dose',()=>{
 const c=find('NEUR-07');
 assert.equal(parseNativeMedicineDose('ceftriaxone','ceftriaxona',undefined,undefined,c).amount,2000);
 assert.equal(parseNativeMedicineDose('ceftriaxone','ceftriaxona 2 g IV',undefined,undefined,c).amount,2000);
 assert.throws(()=>parseNativeMedicineDose('ceftriaxone','ceftriaxona 1 g IV',undefined,undefined,c));
 assert.equal(parseNativeMedicineDose('clopidogrel','clopidogrel',undefined,undefined,find('NEUR-03')).amount,300);
});

test('native route/access preflight and executor share the same rejection',()=>{
 const p=patient(),c=find('RESP-01'),o=owner(p,c);
 assert.equal(o.request(command('amoxicillin','amoxicilina 1 g oral'),clock(0)).status,'pending');
 finishDue(o,clock(0),clock(2));assert.equal(p.administrationLog[0].route,'oral');
 assert.equal(p.administrationLog[0].dose.amount,1000);
 assert.throws(()=>preflightNativeMedicine('azithromycin','azitromicina',{patient:p,caseData:c,clock:clock(2)}),/venous-access-required/);
 assert.equal(o.request(command('azithromycin','azitromicina'),clock(2)).reason,'venous-access-required');
});

test('fixed-interval native medicines cannot repeat before the authored administration interval',()=>{
 const p=patient(),c=find('RESP-01'),o=owner(p,c);
 const first=command('enoxaparin','enoxaparina 1 mg/kg SC','first');
 assert.equal(o.request(first,clock(0)).status,'pending');
 assert.equal(o.request(command('enoxaparin','enoxaparina 1 mg/kg SC','queued-repeat'),clock(0)).reason,
  'administration-interval-required');
 finishDue(o,clock(0),clock(2));
 const started=p.administrationLog[0].administeredAtNativeMinute;
 assert.equal(o.request(first,clock(2)).receipt.reused,true);
 assert.equal(o.request(command('enoxaparin','enoxaparina 1 mg/kg SC','early-repeat'),clock(4,started+719)).reason,
  'administration-interval-required');
 assert.equal(o.request(command('enoxaparin','enoxaparina 1 mg/kg SC','due-repeat'),clock(5,started+720)).status,'pending');
});

test('an infusion reserves its prescribed amount against the cumulative limit while delivery is partial',()=>{
 const p=patient();p.venousAccessCount=1;
 const c={clinicalPolicy:{regimens:{metoprolol:{repeatIntervalMinutes:0,maxCumulative:{amount:5,unit:'mg'}}}}};
 const o=owner(p,c);
 assert.equal(o.request(command('metoprolol','metoprolol 5 mg IV','first'),clock(0)).status,'pending');
 finishDue(o,clock(0),clock(3));
 assert.equal(p.administrationLog[0].status,'administering');assert.equal(p.administrationLog[0].dose.amount,0);
 assert.equal(o.request(command('metoprolol','metoprolol 5 mg IV','second'),clock(3)).reason,
  'maximum-cumulative-dose-exceeded');
 assert.equal(p.pendingTreatments.length,1);
});

test('oral, inhaled, SC and IM doses produce real route-specific receipts after their own preparations without IV access',()=>{
 const p=patient(),o=owner(p,find('RESP-01'));
 for(const [id,text] of [['amoxicillin','amoxicilina 1 g oral'],['salbutamol','salbutamol 5 mg nebulizados'],
  ['enoxaparin','enoxaparina 1 mg/kg SC'],['epi_im','adrenalina 0,5 mg IM']])
  assert.equal(o.request(command(id,text),clock(0)).status,'pending');
 assert.equal(p.administrationLog.length,0);finishDue(o,clock(0),clock(.99));assert.equal(p.administrationLog.length,0);
 finishDue(o,clock(.99),clock(3));
 assert.deepEqual(p.administrationLog.map(r=>[r.route,r.dose.amount,r.dose.unit]),
  [['oral',1000,'mg'],['inhaled',5,'mg'],['sc',1,'mg/kg'],['im',.5,'mg']]);
 assert.equal(p.venousAccessCount,0);assert(p.administrationLog.every(r=>r.patientUid==='P'&&r.sourceEventId));
});

test('finite infusion prepares, delivers gradually on native time and certifies completion once',()=>{
 const p=patient();p.venousAccessCount=1;const c=find('NEUR-07'),o=owner(p,c);
 assert.equal(o.request(command('ceftriaxone','ceftriaxona 2 g IV','tx'),clock(0)).status,'pending');
 assert.equal(p.administrationLog.length,0);
 finishDue(o,clock(0),clock(2));
 assert.equal(p.treatments.length,0);assert.equal(p.administrationLog.length,1);
 assert.equal(p.administrationLog[0].status,'administering');assert.equal(p.administrationLog[0].dose.amount,0);
 const started=p.administrationLog[0].administeredAtNativeMinute;
 o.advanceDelivery(started+15);
 assert.equal(p.administrationLog[0].dose.amount,1000);assert.equal(p.administrationLog[0].prescribedDose.amount,2000);
 assert.equal(p.administrationLog[0].deliveryFraction,.5);assert.equal(p.treatments.length,0);
 assert.equal(confirmedClinicalTreatment(p,'ceftriaxone',started+15),undefined);
 const before=clock(2,started),after=clock(1002,started+30);
 const done=finishDue(o,before,after);
 assert.equal(done.length,1);assert.equal(done[0].status,'executed');
 assert.equal(p.administrationLog.length,1);assert.equal(p.administrationLog[0].dose.amount,2000);
 assert.equal(p.administrationLog[0].status,'completed');assert.equal(p.treatments.length,1);
 assert.equal(confirmedClinicalTreatment(p,'ceftriaxone',after.nativeMinute).dose.amount,2000);
 assert.equal(p.pendingTreatments.length,0);
 assert.equal(o.request(command('ceftriaxone','ceftriaxona 2 g IV','tx'),after).receipt.reused,true);
});

test('infusion checkpoint preserves cumulative delivery and native-time completion',()=>{
 const p=patient();p.venousAccessCount=1;const c=find('NEUR-07'),first=owner(p,c);
 first.request(command('ceftriaxone','ceftriaxona','tx'),clock(0));finishDue(first,clock(0),clock(2));
 first.advanceDelivery(10);const before=p.administrationLog[0].dose.amount;
 const saved=structuredClone(p),restored=createIVAdministration(saved,{caseData:c,proof,rejected,checkpoint:first.checkpoint()});
 restored.advanceDelivery(20);assert(saved.administrationLog[0].dose.amount>before);
 assert.equal(saved.treatments.length,0);assert.equal(restored.due(clock(2,.18),clock(200,20)).length,0);
 const done=finishDue(restored,clock(200,20),clock(600,31));
 assert.equal(done.length,1);assert.equal(saved.administrationLog.length,1);assert.equal(saved.treatments.length,1);
 assert.equal(saved.administrationLog[0].deliveryFraction,1);first.dispose();restored.dispose();
});

test('stroke thrombolysis delivers the actual one-minute bolus before its sixty-minute infusion',()=>{
 const p=patient(),c=find('NEUR-01');p.venousAccessCount=1;
 p.orders=c.studies.filter(s=>['g_neur01_ct','g_neur01_glucose'].includes(s.id)).map(s=>({...s,status:'done',patientUid:p.uid}));
 p.intentHistory=['onset','meds','risk'].map(id=>({id}));const o=owner(p,c);
 assert.equal(o.request(command('alteplase_stroke','alteplasa 0,9 mg/kg IV'),clock(0)).status,'pending');
 finishDue(o,clock(0),clock(60));const start=p.administrationLog[0].administeredAtNativeMinute;
 o.advanceDelivery(start+.5);assert(Math.abs(p.administrationLog[0].deliveryFraction-.05)<1e-9);
 o.advanceDelivery(start+1);assert(Math.abs(p.administrationLog[0].deliveryFraction-.1)<1e-9);
 o.advanceDelivery(start+31);assert(Math.abs(p.administrationLog[0].deliveryFraction-.55)<1e-9);
 assert.equal(p.treatments.length,0);assert.equal(p.administrationLog.length,1);
});

test('PCC preflight uses the documented INR band and repeat limits share the dose validator',()=>{
 const p=patient(),c=find('NEUR-04');p.venousAccessCount=1;
 p.orders=c.studies.filter(s=>['g_neur04_ct','g_neur04_inr'].includes(s.id)).map(s=>({...s,status:'done',patientUid:p.uid}));
 p.intentHistory=[{id:'meds'}];
 assert.equal(preflightNativeMedicine('anticoagulation_reversal','PCC 25 UI/kg IV',{patient:p,caseData:c,clock:clock(0)}).dose.amount,25);
 assert.throws(()=>preflightNativeMedicine('anticoagulation_reversal','PCC 50 UI/kg IV',{patient:p,caseData:c,clock:clock(0)}),/unsupported-INR-dose-band/);
 const o=owner(p,c);o.request(command('anticoagulation_reversal','PCC 25 UI/kg IV','pcc'),clock(0));
 assert.throws(()=>preflightNativeMedicine('anticoagulation_reversal','PCC 25 UI/kg IV',{patient:p,caseData:c,clock:clock(0)}),/maximum-administrations-exceeded/);
 assert.doesNotThrow(()=>preflightNativeMedicine('anticoagulation_reversal','PCC 25 UI/kg IV',{patient:p,caseData:c,clock:clock(0),eventId:'pcc'}));
});

test('acute executor enforces clinical eligibility on direct medication calls before any preparation',()=>{
 const p=patient(),c={...find('NEUR-01'),interventions:[{id:'alteplase_stroke',label:'Alteplasa'}]};
 const policy={initialVitals:()=>({...p.liveVitals}),advanceVitals(){},conducts:[],evaluate:()=>({ready:false,missing:[]})};
 const care=createAcuteCare(p,c,{mode:'solo',defaultDoses:{},progress:{award(){}},cases:[c]},policy);p.venousAccessCount=1;
 assert.equal(care.execute(command('alteplase_stroke','alteplasa 0,9 mg/kg IV'),clock(0)).reason,'clinical-evidence-required');
 care.advance(clock(0),clock(2000),2000);
 assert.equal(p.pendingTreatments.length,0);assert.equal(p.administrationLog.length,0);assert.equal(p.treatments.length,0);care.dispose();
});

test('one long native advance preserves both preparation and timed administration boundaries',()=>{
 const p=patient(),c={...find('NEUR-07'),interventions:[{id:'ceftriaxone',label:'Ceftriaxona'}]};
 const policy={initialVitals:()=>({...p.liveVitals}),advanceVitals(){},conducts:[],evaluate:()=>({ready:false,missing:[]})};
 const care=createAcuteCare(p,c,{mode:'solo',defaultDoses:{},progress:{award(){}},cases:[c]},policy);p.venousAccessCount=1;
 care.execute(command('ceftriaxone','ceftriaxona 2 g IV'),clock(0));
 const results=care.advance(clock(0),clock(300),300);
 assert.equal(results.length,1);assert.equal(p.administrationLog.length,1);assert.equal(p.treatments.length,1);
 const row=p.administrationLog[0];assert.equal(row.administeredAtRealSecond,1.5);
 assert.equal(row.completedAtRealSecond,251.5);assert.equal(row.completedAtNativeMinute-row.administeredAtNativeMinute,30);
 assert.equal(row.dose.amount,2000);care.dispose();
});

test('swallow screening is pending until bedside execution completes and only authored safe outcomes enable oral treatment',()=>{
 const p=patient(),c={...find('NEUR-05'),interventions:[{id:'swallow_screen',label:'Deglución'},{id:'nimodipine',label:'Nimodipino'}]};
 const policy={initialVitals:()=>({...p.liveVitals}),advanceVitals(){},conducts:['swallow_screen'],evaluate:()=>({ready:false,missing:[]})};
 const care=createAcuteCare(p,c,{mode:'solo',defaultDoses:{},progress:{award(){}},cases:[c]},policy);
 p.orders=c.studies.filter(s=>s.id==='g_neur05_ct').map(s=>({...s,patientUid:'P',status:'done'}));
 assert.equal(care.execute(command('nimodipine','nimodipino'),clock(0)).reason,'clinical-swallow-assessment-required');
 care.execute(command('swallow_screen','evaluar deglucion'),clock(0));
 care.advance(clock(0),clock(1),1);assert.equal(p.swallowScreen,undefined);assert.equal(p.treatments.length,0);
 care.advance(clock(1),clock(50),49);assert.equal(p.swallowScreen.safe,true);
 assert.equal(p.treatments[0].resultSafe,true);assert.equal(p.administrationLog.length,0);
 assert.equal(care.execute(command('nimodipine','nimodipino 60 mg oral'),clock(50)).status,'pending');
 care.advance(clock(50),clock(80),30);assert.equal(p.administrationLog[0].route,'oral');
 assert.equal(p.administrationLog[0].dose.amount,60);care.dispose();
});

test('continuous native infusions use their own molecule and route through start, rate and stop',()=>{
 const p=patient();p.venousAccessCount=1;p.intentHistory=[{id:'meds'}];const c=find('CARD-01'),o=owner(p,c);
 o.request(command('nitroglycerin','nitroglicerina 10 mcg/min IV','start'),clock(0));finishDue(o,clock(0),clock(3));
 assert.equal(p.procedures.nitroglycerin.moleculeId,'nitroglycerin');assert.equal(p.procedures.nitroglycerin.active,true);
 o.request(command('nitroglycerin','nitroglicerina 20 mcg/min IV','rate'),clock(3));finishDue(o,clock(3),clock(6));
 assert.equal(p.administrationLog.at(-1).action,'setRate');assert.equal(p.procedures.nitroglycerin.dose.amount,20);
 o.request(command('nitroglycerin','suspender nitroglicerina','stop','therapy.stop'),clock(6));finishDue(o,clock(6),clock(9));
 assert.equal(p.administrationLog.at(-1).action,'stop');assert.equal(p.procedures.nitroglycerin.active,false);
 assert(p.administrationLog.every(r=>r.moleculeId==='nitroglycerin'));
});

test('therapeutic heparin receipts preserve the actual prescribed rate separately from the initial bolus',()=>{
 const p=patient();p.venousAccessCount=1;const o=owner(p,find('RESP-01'));
 assert.equal(o.request(command('heparin_therapeutic','heparina terapeutica 80 U/kg IV','bolus'),clock(0)).status,'pending');
 finishDue(o,clock(0),clock(2));
 assert.equal(p.administrationLog[0].dose.amount,80);assert.equal(p.administrationLog[0].dose.unit,'U/kg');
 assert.equal(p.administrationLog[0].infusionDose.amount,18);assert.equal(p.procedures.heparin_therapeutic.dose.amount,18);
 const c={clinicalPolicy:{regimens:{heparin_therapeutic:{infusion:{amount:12,unit:'U/kg/h',min:10,max:18}}}}};
 const next=createIVAdministration(p,{caseData:c,proof,rejected});
 assert.equal(next.request(command('heparin_therapeutic','heparina terapeutica 10 U/kg/h IV','rate'),clock(2)).status,'pending');
 finishDue(next,clock(2),clock(4));
 const rate=p.administrationLog[1];assert.equal(rate.action,'setRate');
 assert.equal(rate.dose.amount,10);assert.equal(rate.dose.unit,'U/kg/h');
 assert.equal(rate.infusionDose.amount,10);assert.equal(p.procedures.heparin_therapeutic.dose.amount,10);
 assert.equal(next.request(command('heparin_therapeutic','suspender heparina terapeutica','stop','therapy.stop'),clock(4)).status,'pending');
 finishDue(next,clock(4),clock(6));
 const stop=p.administrationLog[2];assert.equal(stop.action,'stop');
 assert.equal(stop.previousDose.amount,10);assert.equal(stop.infusionDose.amount,10);
 assert.equal(p.procedures.heparin_therapeutic.active,false);
});

test('stroke eligibility requires actual patient-bound studies/history and excludes pressure, bleeding and expired onset',()=>{
 const p=patient(),c=find('NEUR-01');
 assert.equal(clinicalInterventionEligibility(p,c,'alteplase_stroke',clock(0)).reason,'clinical-evidence-required');
 p.orders=c.studies.filter(s=>['g_neur01_ct','g_neur01_glucose'].includes(s.id)).map(s=>({...s,patientUid:p.uid,status:'done'}));
 p.intentHistory=['onset','meds','risk'].map(id=>({id}));
 assert.equal(clinicalInterventionEligibility(p,c,'alteplase_stroke',clock(0)),null);
 p.liveVitals.sys=186;assert.equal(clinicalInterventionEligibility(p,c,'alteplase_stroke',clock(0)).reason,'clinical-blood-pressure-limit');
 p.liveVitals.sys=120;
 assert.equal(clinicalInterventionEligibility(p,c,'alteplase_stroke',clock(5000,200)).reason,'clinical-onset-window-exceeded');
 const bleed=structuredClone(c);bleed.clinicalPolicy.traits.push('intracranialBleed');
 assert.equal(clinicalInterventionEligibility(p,bleed,'alteplase_stroke',clock(0)).reason,'clinical-contraindication');
 p.orders[0].patientUid='another';assert.equal(clinicalInterventionEligibility(p,c,'alteplase_stroke',clock(0)).reason,'clinical-evidence-required');
});

test('new procedures finish only after preparation and executionMinutes; no fabricated drug administrations',()=>{
 const p=patient(),c={...find('CARD-05'),interventions:[{id:'cardioversion',label:'Cardioversión'}]};
 const policy={initialVitals:()=>({...p.liveVitals}),advanceVitals(){},conducts:['cardioversion'],evaluate:()=>({ready:false,missing:[]})};
 const care=createAcuteCare(p,c,{mode:'solo',defaultDoses:{},progress:{award(){}},cases:[c]},policy);
 p.venousAccessCount=1;p.orders=[{id:'g_card05_ecg',patientUid:'P',status:'done'}];
 const result=care.execute(command('cardioversion','cardioversion 100 J','cv'),clock(0));assert.equal(result.status,'pending');
 care.advance(clock(0),clock(4),4);assert.equal(p.treatments.length,0);assert.equal(p.administrationLog.length,0);
 care.advance(clock(4),clock(14,2.47),10);assert.equal(p.treatments.length,0);
 care.advance(clock(14,2.47),clock(15,2.5),1);
 assert.equal(p.treatments.length,1);assert.equal(p.treatments[0].kind,'procedure.performed');
 assert.equal(p.treatments[0].dose.amount,100);assert.equal(p.administrationLog.length,0);
 assert.equal(p.procedures.cardioversion.patientUid,'P');assert.equal(p.procedures.cardioversion.performed,true);
 care.dispose();
});
