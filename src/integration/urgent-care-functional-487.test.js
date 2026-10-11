import assert from 'node:assert/strict';
import {PHARMA_RULES_487} from '../clinical/pharmacology-registry-487.js';
import {DYNAMIC_THERAPIES_487,COMPLIANCE_THERAPIES_487,
 csHeparinIssue487,csCareCompliance487} from '../clinical/urgent-care-487.js';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance}
 from '../../qa/physiology-live/native-journey-487.mjs';

const ids=[...Object.keys(PHARMA_RULES_487),'anticoagulation'];
assert.equal(ids.length,30);
assert.equal(DYNAMIC_THERAPIES_487.length,11);
assert.equal(COMPLIANCE_THERAPIES_487.length,19);
assert.deepEqual([...new Set([...DYNAMIC_THERAPIES_487,...COMPLIANCE_THERAPIES_487])].sort(),
 [...ids].sort(),'all 30 native treatments have exactly one primary role');
const create=(id,opts)=>createLiveNativeJourney487(id,opts);
const admin=(r,id='anticoagulation')=>r.ctx.sim.administrationLog.filter(x=>x.id===id);
let checks=0;
function check(label,fn){fn();checks++;console.log('EMERGENCY CARE FUNCTIONAL PASS',label);}

check('13 native case seeds and catalogue have reviewed care rules',()=>{
 const seeds=['CIRR-001','PANC-001','CROHN-001','HDA-001','COLON-001',
  'PERI-PBE-001','PERI-SEC-001','PERI-TER-001','APP-001','CHOLE-001',
  'ILEO-001','MESI-001','CHOLANG-001'];
 for(const id of seeds){
  const r=create(id),report=r.ctx.window.csCare487.report();
  assert.equal(report.caseId,id);assert.equal(report.catalogueSize,30);
  assert.equal(report.knownRoles,30);assert.equal(report.missingFromCatalogue.length,0);
  assert.equal(report.safeForDischarge,null,'requirements must not give automatic discharge');
 }
});
check('heparin is genuinely required by MESI and cannot instantly reverse ischemia',()=>{
 const r=create('MESI-001'),c=r.ctx;
 assert(c.C.keyInterventions.includes('anticoagulation'));
 assert.equal(c.window.csCare487.report().heparinComplete,false);
 const before=c.therapyEffectTotals();
 assert.equal(c.addMonitorTherapy('heparina IV'),true);
 assert.equal(admin(r).length,0,'a monitor search/order is not a dose');
 assert.equal(c.window.csCare487.report().heparinComplete,false);
 advance(r,2.2);
 assert.equal(admin(r).length,1,'native V19 execution must occur first');
 const dose=c.sim.monitorTherapies.get('anticoagulation').dose;
 assert.equal(dose.unit,'protocolo');
 assert.equal(dose.amount,1,'this is an educational marker, NOT a clinical bolus');
 assert.equal(c.window.csCare487.report().heparinComplete,true);
 const after=c.therapyEffectTotals();
 for(const k of Object.keys(before))assert.equal(after[k],before[k],
  'anticoagulation never directly offsets vital '+k);
 assert.equal(c.sim.phys?.sourceControlled===true,false,'anticoagulation is not revascularization');
 assert.equal(c.window.csPharm487Boot.status,'rejected',
  'experimental global drug owner must stay disabled');
});
check('native nursing and monitor execute the same verified anticoagulation',()=>{
 const a=create('MESI-001'),b=create('MESI-001');
 a.ctx.addMonitorTherapy('heparina IV');
 b.ctx.nurseNatural('enfermera heparina IV');
 assert.equal(admin(a).length,0);assert.equal(admin(b).length,0);
 advance(a,2.2);advance(b,2.2);
 assert.equal(admin(a).length,1,'manual monitor real V19 completion');
 assert.equal(admin(b).length,1,'nurse actual V19 completion');
 assert.deepEqual(
  [admin(a)[0].id,admin(a)[0].doseDisplay],
  [admin(b)[0].id,admin(b)[0].doseDisplay]);
 assert.equal(b.ctx.window.csCare487.report().heparinComplete,true);
});
check('invalid heparin molecule, explicit dose, and route must not become administration',()=>{
 for(const raw of ['anticoagulación','anticoagulante','heparina 5000 UI IV',
  'heparina 80 mg IV','heparina 1000 U/h IV',
  'heparina oral','heparina SC','heparina IM','heparina 1 mg',
  'heparina vía desconocida','heparina y heparina IV']){
  const r=create('MESI-001');
  assert.equal(r.ctx.addMonitorTherapy(raw),false,raw);
  advance(r,2);
  assert.equal(admin(r).length,0,raw);
  assert.equal(r.ctx.window.csCare487.report().heparinComplete,false,raw);
 }
});
check('HDA, major bleeding, HIT and no indication block both entry paths',()=>{
 for(const [id,mutate] of [
  ['HDA-001',()=>{}],['MESI-001',s=>{s.phys={...(s.phys||{}),activeBleeding:true};}],
  ['MESI-001',s=>{s.clinicalFlags={knownHIT:true};}],
  ['COLON-001',()=>{}]]){
  const r=create(id);mutate(r.ctx.sim);
  assert.equal(r.ctx.addMonitorTherapy('heparina IV'),false,id);
  r.ctx.nurseNatural('enfermera heparina IV');advance(r,2.2);
  assert.equal(admin(r).length,0,id);
  assert.equal(r.ctx.window.csCare487.report().heparinComplete,false,id);
 }
});
check('future case with reviewed indication inherits heparin condition, not fake hemodynamics',()=>{
 const c={id:'FUTURE-VTE-001',keyInterventions:['anticoagulation'],
  pharmacology:{anticoagulationIndicated:true}};
 const patient={administrationLog:[],monitorTherapies:new Map(),therapyExposure:new Map(),
  patientInstance:{uid:'qa-vte'},phys:{renalReserve:.75},clinicalFlags:{}};
 assert.equal(csHeparinIssue487('heparina IV',c,patient),null);
 assert.equal(csCareCompliance487(c,patient,ids.map(id=>({id}))).heparinComplete,false);
 patient.administrationLog.push({id:'anticoagulation',m:1,doseDisplay:'protocolo'});
 assert.equal(csCareCompliance487(c,patient,ids.map(id=>({id}))).heparinComplete,true);
 patient.clinicalFlags.majorBleeding=true;
 assert.match(csHeparinIssue487('heparina IV',c,patient),/hemorragia/i);
});
check('antibiotic coverage is initial confirmed-care, not a clock or vital writer',()=>{
 const r=create('PERI-SEC-001'),c=r.ctx;
 const no=c.window.csCare487.report();
 assert.equal(no.coverageComplete,false);
 c.addMonitorTherapy('ceftriaxona');c.addMonitorTherapy('metronidazol');
 assert.equal(c.window.csCare487.report().coverageComplete,false,
  'unconfirmed orders are not antibiotic coverage');
 advance(r,2.5);
 const after=c.window.csCare487.report();
 assert.equal(after.coverageComplete,true,
  'initial broad-spectrum combination is fulfilled on confirmed administration');
 assert.equal(after.safeForDischarge,null,'treatment alone is not a discharge');
});
check('renal toxicity is contextual WARNING, not an invented immediate kidney injury',()=>{
 const r=create('PERI-TER-001');const p=r.ctx.sim;
 p.phys={...(p.phys||{}),renalReserve:.43};
 const before=p.phys.renalReserve;
 p.administrationLog.push({id:'gentamicin',m:1,count:1,doseDisplay:'80 mg'});
 const status=r.ctx.window.csCare487.report();
 assert(status.exposureRisks.some(x=>x.id==='gentamicin'));
 assert.equal(p.phys.renalReserve,before,
  'read-only requirement evaluator must never decrement renal reserve');
});
check('confirmed antimicrobial history survives bounded native ledger rollover',()=>{
 const r=create('PERI-SEC-001'),s=r.ctx.sim;
 s.administrationLog=[];
 s.therapyExposure.set('ceftriaxone',{count:1,lastMinute:1});
 s.therapyExposure.set('metronidazole',{count:1,lastMinute:1});
 assert.equal(r.ctx.window.csCare487.report().coverageComplete,true);
});
check('source control cannot be spoofed by a drug order or accepted consult',()=>{
 const r=create('PERI-SEC-001');const p=r.ctx.sim;
 p.administrationLog.push({id:'source_control',m:1});
 assert.equal(r.ctx.window.csCare487.report().delivered.includes('source_control'),false);
 p.interventions.add('source_control');
 assert.equal(r.ctx.window.csCare487.report().delivered.includes('source_control'),true,'confirmed procedure on non-septic patient');
 p.phys={...(p.phys||{}),sourceControlled:true};
 assert.equal(r.ctx.window.csCare487.report().delivered.includes('source_control'),true);
});
console.log('EMERGENCY CARE FUNCTIONAL COMPLETE',JSON.stringify({
 checks,existingCases:13,therapies:30,dynamic:11,compliance:19,
 heparinNativeExecution:true,nurseAndMonitor:true,heparinVitalsWriter:false,
 unsafeRoutesFailClosed:true,antimicrobialsConfirmedImmediate:true,
 physicalAndroid:false,fullBrowser:false,clinicalDoseRecommendations:false
}));
