import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {respiratoryPack} from '../../src/v5/content/packs/respiratory-pack.js';
import {neurologyPack} from '../../src/v5/content/packs/neurology-pack.js';
import {cardiologyPack} from '../../src/v5/content/packs/cardiology-pack.js';
import {chooseClinicalScenarioSeed} from '../v5/scenario-seeds.mjs';
import * as certification from '../v5/certify-clinical-cases.mjs';
import {certifyClinicalCases, runClinicalCaseScenario, deriveClinicalCertificationPlan,
 CLINICAL_CERTIFICATION_PROFILES} from '../v5/certify-clinical-cases.mjs';
const load=name=>JSON.parse(fs.readFileSync(new URL('../../src/v5/content/'+name+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const app=content.cases.find(c=>c.id==='APP-001');
const peri=content.cases.find(c=>c.id==='PERI-SEC-001');
test('a declared definitive surgical pathway selects the receiving operating team before a routine ward',()=>{
 const c=cardiologyPack.cases.find(x=>x.id==='CARD-09');
 const plan=deriveClinicalCertificationPlan(c,content);
 assert.equal(plan.destination,'quirofano');assert.deepEqual(plan.consults,['cardiovascular']);
});
test('cooperative endocarditis with valvular edema transfers for surgery without claiming an unfinished operation',async()=>{
 const c=cardiologyPack.cases.find(x=>x.id==='CARD-09'),composed=await certification.clinicalCertificationContent([c]);
 const seed=chooseClinicalScenarioSeed(composed.cases.find(x=>x.id===c.id),'valvular-edema',
  variant=>variant.complicationCandidates.some(x=>x.id==='card09-valvular-edema'),{mode:'coop'});
 const row=await runClinicalCaseScenario(c,{mode:'coop',seed,horizon:1440,recovery:true});
 assert.equal(row.passed,true,JSON.stringify(row.failures));
 assert.equal(row.closureReceipt.destination,'quirofano');
 assert(row.complications.some(x=>x.id==='card09-valvular-edema'));
 assert(row.consultations.some(x=>x.id==='cardiovascular'&&x.accepted===true));
 assert(!row.treatments.some(x=>x.id==='valve_surgery'),'transfer cannot invent a completed operation');
 assert.equal(row.pendingTreatments.length,0);assert.equal(row.xpReceipts.length,1);
});
test('abandonment preserves a single irreversible death when postmortem commands have no bedside target',async()=>{
 const c=respiratoryPack.cases.find(x=>x.id==='RESP-04'),row=await runClinicalCaseScenario(c,{profile:'abandon',horizon:400,seed:'abandoned-terminal'});
 assert.equal(row.final.died,true);assert.equal(row.terminalIntegrity.postmortemCommandsRejected,true);
 assert(Object.values(row.terminalIntegrity).every(x=>x===true));assert.equal(row.final.xp,0);
});
for(const id of ['NEUR-03','NEUR-07'])test('neurological certification observes time and delayed native closure for '+id,async()=>{
 const c=neurologyPack.cases.find(x=>x.id===id),row=await runClinicalCaseScenario(c,{seed:'neuro-closure-'+id,horizon:1440,recovery:true});
 assert.equal(row.passed,true,JSON.stringify(row.failures));
 assert.equal(row.closureIntegrity.singleClosureReceipt,true);assert.equal(row.xpReceipts.length,1);
});
test('a competent doctor can rescue refractory PE hypoxemia while the real thrombolytic infusion completes',async()=>{
 const c=respiratoryPack.cases.find(x=>x.id==='RESP-06');
 assert(c.interventions.some(x=>x.id==='intubation'),'refractory hypoxemia needs an executable airway option');
 const row=await runClinicalCaseScenario(c,{seed:'pe-refractory-rescue',horizon:1300,recovery:true});
 assert.equal(row.passed,true,JSON.stringify({failures:row.failures,missing:row.readiness?.missing}));
 assert(row.treatments.some(t=>t.id==='intubation'&&t.kind==='procedure.performed'));
 const lysis=row.administrations.find(t=>t.id==='alteplase_pe');
 assert(lysis.completedAtNativeMinute-lysis.administeredAtNativeMinute>=120-1e-8);
 const sample=row.studies.find(x=>x.id==='g_resp06_coag_followup');
 assert(sample.sampledAtNativeMinute>=lysis.completedAtNativeMinute);
});
for(const [id,horizon] of [['RESP-02',720],['RESP-03',150],['RESP-05',150]])
 test('actual specialty transfer closes '+id+' with native support, procedures and one XP receipt',async()=>{
  const c=respiratoryPack.cases.find(x=>x.id===id),row=await runClinicalCaseScenario(c,{seed:'transfer-'+id,horizon,recovery:true});
  assert.equal(row.passed,true,JSON.stringify({failures:row.failures,missing:row.readiness?.missing}));
  assert.equal(row.closureReceipt.destination,row.plan.destination);
  assert.equal(row.xpReceipts.length,1);assert(row.xpReceipts[0].xp>0);
 });

test('real public runtime certification produces patient-bound administration, study, closure and XP receipts',async()=>{
 const before=JSON.stringify(content),row=await runClinicalCaseScenario(peri,{content,seed:'real-peritonitis',mode:'solo',horizon:300,recovery:true});
 assert.equal(row.passed,true,JSON.stringify(row.failures));
 assert.deepEqual(row.checks,{history:true,exam:true,studies:true,treatment:true,trajectory:true,closure:true,xp:true});
 assert.equal(row.reception.confirmedFocusPatientUid,row.patientUid);
 assert(row.reception.arrival.patientUid===row.patientUid);
 assert(row.history.every(x=>x.patientUid===row.patientUid&&x.eventId));
 assert(row.studies.every(x=>x.patientUid===row.patientUid&&x.status==='done'&&x.readyAtMinute>=x.requestedAtMinute));
 assert(row.administrations.some(x=>x.id==='ceftriaxone'&&x.sourceEventId));
 assert(row.administrations.some(x=>x.id==='metronidazole'&&x.sourceEventId));
 assert(row.nursing.confirmedEventIds.length>=3,'access and actual IV medicines need physical nurse completion');
 assert(row.firstMeaningfulPhysiologicalDelta.atRealSecond>0);
 assert(row.closureReceipt.closed&&row.closureReceipt.destination==='quirofano');
 assert.equal(row.xpReceipts.length,1);
 assert.equal(row.xpReceipts[0].eventId,row.closureReceipt.eventId);
 assert.equal(row.progress.xp,row.closureReceipt.xp);
 assert(row.recovery.samePatient&&row.recovery.sameAdministrations&&row.recovery.sameXP&&row.recovery.sameEventIds);
 assert(row.recovery.replayUnchanged);
 assert.equal(JSON.stringify(content),before,'the runner must not patch content or patient fixtures to make care pass');
});

test('an unchanged native trajectory is reported honestly even when all care, handoff and XP complete',async()=>{
 const row=await runClinicalCaseScenario(app,{content,seed:'real-stable-app',horizon:180});
 assert.equal(row.checks.treatment,true);
 assert.equal(row.checks.closure,true);
 assert.equal(row.checks.xp,true);
 assert.equal(row.checks.trajectory,false);
 assert.equal(row.firstMeaningfulPhysiologicalDelta,null);
 assert.equal(row.passed,false);
 assert.deepEqual(row.initial.vitals,row.final.vitals);
});

test('omitting studies records the real failure even when an urgent receiving team permits transfer',async()=>{
 const row=await runClinicalCaseScenario(app,{content,profile:'omit-studies',seed:'omitted-app',horizon:180});
 assert.equal(row.checks.studies,false);
 assert.equal(row.studies.length,0);
 assert.equal(row.passed,false);
 assert(row.commands.every(x=>!x.text.startsWith('/estudio ')));
});

test('abandonment advances the same native clock and cannot manufacture a successful closure or XP',async()=>{
 const row=await runClinicalCaseScenario(app,{content,profile:'abandon',seed:'abandon-app',horizon:60});
 assert.equal(row.passed,false);
 assert.equal(row.final.atRealSecond,60);
 assert.equal(row.final.atNativeMinute,7.2);
 assert.equal(row.administrations.length,0);
 assert.equal(row.closureReceipt,null);
 assert.equal(row.xpReceipts.length,0);
 assert.equal(row.progress.xp,0);
 assert(row.observations.length>2);
});

test('the staged runner preserves pack identity and rejects a case whose real public care cannot execute',async()=>{
 const staged={packId:'unmodeled-certification',version:'1.0.0',digest:'real-digest',cases:[{...app,id:'UNMODELED-991'}]};
 const result=await certifyClinicalCases(staged);
 assert.equal(result.ok,false);
 assert.equal(result.packId,staged.packId);
 assert.equal(result.version,staged.version);
 assert.equal(result.digest,staged.digest);
 assert.equal(result.evidence.length,1);
 assert.equal(result.evidence[0].passed,false);
 assert(!Object.values(result.evidence[0].checks).some(Boolean));
});

test('policy plans use authored treatment alternatives, exact case regimen, required studies and targeted examination',()=>{
 const c={id:'RESP-PLAN',dx:['neumonia'],requiredHistory:['onset','allergies'],intents:[{id:'onset',keys:['desde cuando']},{id:'allergies',keys:['alergias']}],studies:[{id:'g_cxr'},{id:'g_renal'}],keyStudies:['g_cxr'],keyInterventions:['amoxicillin'],clinicalPolicy:{regimens:{amoxicillin:{dose:{amount:1000,unit:'mg'},route:'oral'}},closure:{destinations:['alta'],treatment:[['amoxicillin'],['different_drug']],requiredStudies:['g_cxr','g_renal'],requiredExams:['thorax:auscultation']}}};
 const plan=deriveClinicalCertificationPlan(c,content);
 assert.equal(plan.destination,'alta');
 assert(plan.studyIds.includes('g_cxr')&&plan.studyIds.includes('g_renal'));
 assert(plan.treatmentIds.includes('amoxicillin'));
 assert(!plan.treatmentIds.includes('different_drug'));
 assert(plan.exams.includes('/examen thorax auscultation'));
 assert(plan.history.some(x=>x.intentId==='allergies'));
 assert.deepEqual(CLINICAL_CERTIFICATION_PROFILES,['competent','slow','inexperienced','negligent','omit-studies','wrong-medication','no-allergy-question','abandon','complication-rescue']);
});

test('policy vasopressor orders identify the actual molecule and obtain a real administration',async()=>{
 const row=await runClinicalCaseScenario(respiratoryPack.cases[1],{seed:'cert-pressor-molecule',horizon:60});
 const command=row.commands.find(x=>x.text.startsWith('/tratamiento vasopressor '));
 assert(command,'the hypotensive patient requires the planned vasopressor order');
 assert(!command.clinical.some(x=>x.status==='rejected'),JSON.stringify(command));
 assert(row.administrations.some(x=>x.id==='vasopressor'&&x.patientUid===row.patientUid&&x.sourceEventId),
  'a generated valid order must leave the actual bedside preparation queue');
});

test('real policy certification evidence is already plain JSON without undefined optional receipts',async()=>{
 const row=await runClinicalCaseScenario(respiratoryPack.cases[0],{seed:'cert-plain-json',horizon:60,recovery:true});
 assert.equal(row.passed,true,JSON.stringify(row.failures));
 assert.deepEqual(row,JSON.parse(JSON.stringify(row)),
  'canonical registry evidence must preserve the exact runner envelope');
});

test('certification fails when observed persistence, nursing, sync, reward or rescue evidence is missing',async()=>{
 assert.equal(typeof certification.assessClinicalCertificationEvidence,'function',
  'the certification decision must include the recorded runtime integrity evidence');
 const row=await runClinicalCaseScenario(respiratoryPack.cases[0],{seed:'cert-integrity',horizon:60,recovery:true,mode:'coop'});
 assert.equal(row.passed,true,JSON.stringify(row.failures));
 assert.equal(row.integrityChecks.persistence,true);
 assert.equal(row.integrityChecks.sync,true);
 assert.equal(row.integrityChecks.nursing,true);
 assert.equal(row.integrityChecks.clock,true);
 assert.equal(row.integrityChecks.performanceXP,true);
 assert.equal(row.integrityChecks.terminal,true);
 const incomplete=[
  ['persistence',{...row,recovery:{...row.recovery,sameXP:false}}],
  ['sync',{...row,sharedViews:row.sharedViews.map((view,index)=>index?view:{...view,administrationEventIds:[]})}],
  ['nursing',{...row,nursing:{...row.nursing,tasks:row.nursing.tasks.map(task=>({...task,stage:'travelling'}))}}],
  ['clock',{...row,observations:[...row.observations,{...row.final,atRealSecond:row.final.atRealSecond+10}]}],
  ['performanceXP',{...row,closureReceipt:{...row.closureReceipt,quality:{...row.closureReceipt.quality,score:40}}}],
  ['terminal',{...row,closureIntegrity:{...row.closureIntegrity,replayUnchanged:false}}],
  ['complicationRescue',{...row,profile:'complication-rescue',complicationDefinitions:[{id:'unobserved'}],complications:[]}]
 ];
 for(const [check,evidence] of incomplete){
  const result=certification.assessClinicalCertificationEvidence(evidence);
  assert.equal(result.passed,false,check+' must prevent certification');
  assert.equal(result.integrityChecks[check],false,check);
  assert(result.failures.some(message=>message.includes(check)),JSON.stringify(result.failures));
 }
});

test('post-thrombolysis studies and heparin are deferred until actual lytic completion',async()=>{
 const row=await runClinicalCaseScenario(respiratoryPack.cases[5],{seed:'cert-post-lysis-order',horizon:60});
 assert(row.plan.studyIds.includes('g_resp06_coag_followup'));
 assert(!row.commands.some(x=>x.text==='/estudio g_resp06_coag_followup'),
  'a new post-treatment sample cannot be requested during the lytic infusion');
 assert(!row.commands.some(x=>x.text.startsWith('/tratamiento heparin_therapeutic ')),
  'pending alteplase and baseline coagulation cannot authorize the later heparin order');
 assert.equal(row.passed,false,'an in-progress infusion is not a completed journey');
});

test('the negligent profile attempts disposition without credit for omitted bedside care',async()=>{
 assert(CLINICAL_CERTIFICATION_PROFILES.includes('negligent'));
 const row=await runClinicalCaseScenario(app,{content,profile:'negligent',seed:'cert-negligent',horizon:30});
 assert.equal(row.passed,false);
 assert.equal(row.final.atRealSecond,30);
 assert.equal(row.history.length,1,'the opening reply does not supply the required history');
 assert.equal(row.examLog.length,0);
 assert.equal(row.studies.length,0);
 assert.equal(row.administrations.length,0);
 assert(row.commands.some(command=>command.text.startsWith('/disposicion ')));
 assert.equal(row.closureReceipt,null);
 assert.equal(row.progress.xp,0);
});
