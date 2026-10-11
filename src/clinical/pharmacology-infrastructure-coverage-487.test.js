import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertRescueSourceRevisions487} from '../../qa/physiology-pilot/rescue-source-compatibility-487.mjs';
import {createNativeReferenceRuntime487} from '../../qa/physiology-pilot/native-reference-487.mjs';
import {PILOT_DEFINITIONS_487,PILOT_DRUGS_487,PHYSIOLOGY_AXES_487,PHYSIOLOGY_MODEL_487} from './physiology-pilot-definitions-487.js';
import {compilePharmacologyContent487,createB1PharmacologyContent487} from './pharmacology-content-487.js';
const api=await import('../../qa/pharmacology-infrastructure/coverage-487.mjs').catch(()=>({}));
assert.equal(typeof api.auditPharmacologyInfrastructure487,'function','dependency coverage auditor must exist');
const native=createNativeReferenceRuntime487(),catalogue=JSON.parse(JSON.stringify(native.ctx.MONITOR_THERAPY_CATALOG));
const before=JSON.stringify(catalogue),report=api.auditPharmacologyInfrastructure487(catalogue,PILOT_DEFINITIONS_487);
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('INFRASTRUCTURE COVERAGE PASS',name);};
const row=id=>report.rows.find(x=>x.id===id);
check('actual post-initializer thirty entries stay distinct from five shadow definitions',()=>{
 assert.equal(report.entries,30);assert.equal(report.executableShadowEntries,5);assert.equal(report.unimplementedEntries,25);
 assert.equal(report.clinicalReady,false);assert.equal(report.realExecutorInstalled,false);assert.equal(report.registeredMechanisms,7);
 assert.equal(JSON.stringify(catalogue),before);assert.equal(new Set(report.rows.map(x=>x.id)).size,30);
 assert.deepEqual(report.rows.filter(x=>x.status==='executable-shadow-only').map(x=>x.id),['oxygen','fluid','vasopressor','morphine','furosemide']);
});
check('classes, procedures, blood products and suspension are not counterfeit molecules',()=>{
 for(const id of ['analgesia','antiemetic','ppi','steroid','beta_blocker'])assert.equal(row(id).catalogueKind,'class');
 for(const id of ['source_control','paracentesis_ter'])assert.equal(row(id).catalogueKind,'procedure');
 assert.equal(row('stop_beta_blocker').catalogueKind,'suspension');assert.equal(row('transfusion').catalogueKind,'blood-product');
 assert(row('analgesia').identityGaps.some(x=>/paracetamol.*fentanyl/.test(x)));
 assert(row('source_control').eventRequirement.includes('procedure-performed'));
 assert(row('stop_beta_blocker').eventRequirement.includes('confirmed-suspension'));
});
check('reuse report distinguishes installed mechanisms from merely present axes',()=>{
 assert.deepEqual(row('analgesia').reusableMechanisms,['opioid-analgesia','opioid-respiratory','opioid-circulation']);
 assert.equal(row('analgesia').nextContentCandidate,'named-opioid-after-identity-and-PK-validation');
 for(const id of row('analgesia').reusableMechanisms)
  for(const axis of PILOT_DEFINITIONS_487.mechanisms.get(id).requires)assert(row('analgesia').reusableAxes.includes(axis));
 assert(row('ceftriaxone').reusableAxes.includes('infectionBurden'));assert(row('ceftriaxone').missingMechanisms.includes('antimicrobial'));
 assert(row('ceftriaxone').missingAxes.includes('microbialSusceptibility'));
 assert(row('espironolactona').missingAxes.includes('potassiumMmolL'));
 assert(row('transfusion').missingAxes.includes('hemoglobinGdl'));assert(row('ppi').missingAxes.includes('gastricAcidity'));
 assert(row('beta_blocker').missingAxes.includes('chronotropicDrive'));
});
check('fixed combinations cannot masquerade as several effects on one exposure',()=>{
 for(const id of ['piptazo','imipenem']){
  assert.equal(row(id).catalogueKind,'combination');assert(row(id).infrastructureGaps.includes('component-specific-exposures-and-composition'));
 }
});
check('heparin stays explicitly blocked with haemostasis and monitoring gaps',()=>{
 assert.equal(native.bootAudit.boot.status,'rejected');assert.deepEqual(native.bootAudit.missingDefinitions,['anticoagulation']);
 const h=row('anticoagulation');assert.equal(h.status,'blocked-unimplemented');
 for(const axis of ['coagulationActivity','thrombusBurden','plateletCount','aPTTSeconds'])assert(h.missingAxes.includes(axis));
 assert(h.missingMechanisms.includes('anticoagulation'));assert.equal(h.nextContentCandidate,null);
});
check('new registered molecule inherits coverage from bindings without a coverage or core edit',()=>{
 const c=createB1PharmacologyContent487(PILOT_DRUGS_487),m=structuredClone(c.molecules.find(x=>x.id==='morphine')),
  f=structuredClone(c.formulations.find(x=>x.id==='morphine'));
 m.id=m.activeMoiety='qa-next-molecule';f.id='qa-next-formulation';f.moleculeId=m.id;delete f.legacy;
 c.molecules.push(m);c.formulations.push(f);
 const defs=compilePharmacologyContent487(c,{mechanisms:PILOT_DEFINITIONS_487.mechanisms,axes:PHYSIOLOGY_AXES_487,modelVersion:PHYSIOLOGY_MODEL_487});
 const r=api.auditPharmacologyInfrastructure487([...catalogue,{id:f.id,label:'Synthetic next formulation'}],defs).rows.at(-1);
 assert.equal(r.status,'executable-shadow-only');assert.equal(r.moleculeId,m.id);assert.equal(r.reusableMechanisms.length,3);
 assert.equal(r.missingAxes.length,0);assert.equal(r.clinicalReady,false);
});
check('duplicate and unknown catalogue entries cannot silently become supported',()=>{
 assert.throws(()=>api.auditPharmacologyInfrastructure487([...catalogue,catalogue[0]],PILOT_DEFINITIONS_487),/duplicate/);
 const x=api.auditPharmacologyInfrastructure487([{id:'new-unmodelled',label:'No known mechanism'}],PILOT_DEFINITIONS_487).rows[0];
 assert.equal(x.status,'blocked-unclassified');assert(x.infrastructureGaps.includes('missing-reviewed-content-contract'));
});
check('committed report pins the real catalogue, thirteen cases and rejected startup',()=>{
 const stored=JSON.parse(fs.readFileSync(new URL('../../qa/pharmacology-infrastructure/coverage-487.json',import.meta.url)));
 assert.deepEqual(stored.rows,report.rows);assert.equal(stored.caseIds.length,13);assert.equal(stored.nativeBoot.status,'rejected');
 assert.equal(stored.contentSchemaVersion,2);assert(stored.sourceEvidence.every(x=>x.hash.length===64));
 const current=api.currentPharmacologyCoverage487();
 assertRescueSourceRevisions487(Object.fromEntries(current.sourceEvidence.map(x=>[x.id,x.hash])),
  Object.fromEntries(stored.sourceEvidence.map(x=>[x.id,x.hash])));
 current.sourceEvidence=stored.sourceEvidence;
 assert.deepEqual(stored,current,'full inventory unchanged; only two explicitly checked rescue source revisions');
});
console.log('PHARMACOLOGY INFRASTRUCTURE COVERAGE PASS',JSON.stringify({checks,entries:report.entries,executable:5,unimplemented:25,clinicalReady:false}));
