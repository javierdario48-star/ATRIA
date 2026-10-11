/** QA dependency inventory, never an indication policy or treatment executor. */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createNativeReferenceRuntime487} from '../physiology-pilot/native-reference-487.mjs';
import {PILOT_DEFINITIONS_487,PHYSIOLOGY_AXES_487} from '../../src/clinical/physiology-pilot-definitions-487.js';
const unique=values=>[...new Set(values)];
const planned=(catalogueKind,mechanisms,axes,extra={})=>({catalogueKind,mechanisms,axes,identityGaps:[],infrastructureGaps:[],
 eventRequirement:['confirmed-administration','confirmed-dose-change','confirmed-suspension'],nextContentCandidate:null,...extra});
// One reviewed dependency declaration per CONTENT entry, no disease-ID rules.
// These are design prerequisites, not fully validated physiological equations.
const plans={
 oxygen:planned('gas',['oxygenation'],[],{clinicalGaps:['CO2-retention-not-modelled']}),
 fluid:planned('fluid-class',['volume'],[],{identityGaps:['B1 represents balanced crystalloid; saline/electrolyte composition is unresolved']}),
 vasopressor:planned('class',['pressor'],[],{identityGaps:['B1 resolves norepinephrine only; generic vasopressor aliases cannot select another molecule']}),
 morphine:planned('molecule',['opioid-analgesia','opioid-respiratory','opioid-circulation'],[],{clinicalGaps:['separate-analgesia-and-CNS-endpoint-calibration','active-metabolites-not-modelled']}),
 furosemide:planned('molecule',['diuretic'],[],{clinicalGaps:['baseline-water-and-electrolyte-balance-not-modelled']}),
 albumin:planned('biologic',['colloid-volume'],['circulatingVolumeMl','interstitialFluidMl','renalFunction','oncoticPressure','capillaryPermeability'],
  {identityGaps:['albumin concentration and delivered amount must be explicit'],infrastructureGaps:['colloid-distribution-not-crystalloid-fraction']}),
 analgesia:planned('class',['opioid-analgesia','opioid-respiratory','opioid-circulation'],['pain','respiratoryDepression','vascularTone','renalFunction','hepaticFunction'],
  {identityGaps:['resolve paracetamol versus fentanyl; class is not an active moiety'],
   infrastructureGaps:['named-agent-definition-and-independent-PK-calibration','non-opioid-analgesia-needs-its-own-mechanism'],
   nextContentCandidate:'named-opioid-after-identity-and-PK-validation'}),
 antiemetic:planned('class',['antiemesis','agent-specific-motility'],['nauseaDrive','gutMotility','qtIntervalMs'],
  {identityGaps:['resolve ondansetron versus metoclopramide']}),
 ppi:planned('class',['acid-suppression'],['gastricAcidity','clotStability','bleedingRateMlPerMin'],
  {identityGaps:['resolve omeprazole versus pantoprazole'],infrastructureGaps:['dynamic-bleeding-driver-and-oral-absorption-when-used']}),
 transfusion:planned('blood-product',['red-cell-replacement'],['circulatingVolumeMl','hemoglobinGdl','oxygenContent','transfusionReactionRisk'],
  {eventRequirement:['blood-product-delivered','product-volume-and-composition'],infrastructureGaps:['blood-product-contract-not-molecule-PK']}),
 paracentesis_ter:planned('procedure',['ascites-drainage'],['interstitialFluidMl','ascitesVolumeMl','intraAbdominalPressure','circulatingVolumeMl'],
  {eventRequirement:['procedure-performed','removed-volume-confirmed'],infrastructureGaps:['performed-procedure-contract-not-molecule-PK']}),
 espironolactona:planned('molecule',['aldosterone-antagonism'],['renalFunction','circulatingVolumeMl','interstitialFluidMl','aldosteroneActivity','sodiumBalance','potassiumMmolL'],
  {infrastructureGaps:['oral-absorption-active-metabolite-and-slow-response']}),
 steroid:planned('class',['immune-modulation'],['inflammation','immuneActivity','glucoseMmolL','infectionBurden'],
  {identityGaps:['resolve prednisone versus methylprednisolone'],infrastructureGaps:['delayed-response-and-oral-absorption-when-used']}),
 aza:planned('molecule',['immune-maintenance'],['immuneActivity','marrowReserve','infectionBurden'],
  {infrastructureGaps:['oral-absorption-metabolism-and-weeks-scale-endpoint']}),
 source_control:planned('procedure',['source-control-performed'],['sourceControlled','infectionBurden','inflammation','sourceState'],
  {eventRequirement:['procedure-performed','source-addressed-confirmed'],infrastructureGaps:['consultation-is-not-source-control','performed-procedure-contract-not-molecule-PK']}),
 stop_beta_blocker:planned('suspension',[],[],{eventRequirement:['confirmed-suspension','installed-target-formulation-and-existing-exposure'],
  identityGaps:['identify actual delivered propranolol/carvedilol formulation'],infrastructureGaps:['beta-blocker-definition-not-installed']}),
 beta_blocker:planned('class',['beta-receptor-blockade'],['pumpFunction','vascularTone','perfusion','chronotropicDrive','cardiacConduction','portalPressure'],
  {identityGaps:['resolve propranolol versus carvedilol; different receptor effects'],infrastructureGaps:['oral-absorption-and-agent-specific-receptor-binding']}),
 anticoagulation:planned('molecule',['anticoagulation'],['coagulationActivity','thrombusBurden','bleedingRateMlPerMin','plateletCount','aPTTSeconds'],
  {identityGaps:['explicit unfractionated-heparin formulation, route, dose and monitoring'],infrastructureGaps:['heparin-remains-blocked','HIT-and-bleeding-safety-validation']})
};
const antimicrobialAxes=['infectionBurden','inflammation','renalFunction','hepaticFunction','microbialSusceptibility','pathogenBurden','unboundDrugConcentration','sourceState'];
for(const id of ['ceftriaxone','metronidazole','imipenem','ceftazidime','cefoperazone','cefepime','piptazo','ampicillin','amikacin','gentamicin','fluconazole','amphotericin']){
 const combo=['imipenem','piptazo'].includes(id);
 const extraAxes=['amikacin','gentamicin'].includes(id)?['renalInjury','auditoryInjury']:id==='amphotericin'?['renalInjury','potassiumMmolL','magnesiumMmolL']:
  id==='cefepime'?['neurotoxicityRisk']:id==='cefoperazone'?['coagulationActivity']:id==='fluconazole'?['qtIntervalMs','hepaticInjury']:[];
 plans[id]=planned(combo?'combination':'molecule',['antimicrobial',...(extraAxes.length?['agent-specific-toxicity']:[])],[...antimicrobialAxes,...extraAxes],
  {identityGaps:combo?['resolve active components, ratio and formulation']:[],
   infrastructureGaps:['susceptibility-and-exposure-response-not-static-spectrum-bonus',...(combo?['component-specific-exposures-and-composition']:[])],
   nextContentCandidate:['ceftriaxone','metronidazole'].includes(id)?'B2-after-infection-target-and-susceptibility-contract':null});
}
export function auditPharmacologyInfrastructure487(catalogue,definitions,{axes=PHYSIOLOGY_AXES_487}={}){
 if(!Array.isArray(catalogue)||!definitions?.drugs?.get||!definitions?.mechanisms?.get||!Array.isArray(axes))throw Error('validated inventory/definitions required');
 const ids=new Set(),knownAxes=new Set(axes),rows=[];
 for(const entry of catalogue){
  if(typeof entry?.id!=='string'||!entry.id||ids.has(entry.id))throw Error('invalid/duplicate catalogue id '+entry?.id);ids.add(entry.id);
  const d=definitions.drugs.get(entry.id),p=plans[entry.id],registered=d?.bindings.map(b=>b.mechanismId)??[];
  const requiredMechanisms=unique([...registered,...(p?.mechanisms??[])]),requiredAxes=unique([...(d?.requires??[]),...(p?.axes??[]),
   ...requiredMechanisms.flatMap(id=>definitions.mechanisms.get(id)?.requires??[])]);
  rows.push({id:entry.id,label:entry.label??entry.id,aliases:[...(entry.aliases??[])],catalogueKind:p?.catalogueKind??(d?'molecule':'unclassified'),
   moleculeId:d?.moleculeId??null,formulationId:d?.id??null,status:d?'executable-shadow-only':p?'blocked-unimplemented':'blocked-unclassified',
   clinicalReady:false,reusableMechanisms:requiredMechanisms.filter(id=>definitions.mechanisms.has(id)),
   missingMechanisms:requiredMechanisms.filter(id=>!definitions.mechanisms.has(id)),
   reusableAxes:requiredAxes.filter(id=>knownAxes.has(id)),missingAxes:requiredAxes.filter(id=>!knownAxes.has(id)),
   identityGaps:p?.identityGaps??[],infrastructureGaps:p?.infrastructureGaps??(d?[]:['missing-reviewed-content-contract']),
   eventRequirement:p?.eventRequirement??['independent-confirmed-administration'],
   clinicalGaps:unique(['independent-agent-dose-route-and-trajectory-calibration',...(p?.clinicalGaps??[])]),
   nextContentCandidate:p?.nextContentCandidate??null,
   effectOwner:d?'isolated-shadow-integrator-only':'unimplemented-in-shadow; existing-native-owner-unchanged'});
 }
 const executableShadowEntries=rows.filter(x=>x.status==='executable-shadow-only').length;
 return {schemaVersion:1,contentSchemaVersion:definitions.schemaVersion,contentVersion:definitions.contentVersion,
  modelVersion:definitions.modelVersion,entries:rows.length,registeredMechanisms:definitions.mechanisms.size,
  executableShadowEntries,unimplementedEntries:rows.length-executableShadowEntries,
  clinicalReady:false,realExecutorInstalled:false,rows};
}
export function currentPharmacologyCoverage487(){
 const r=createNativeReferenceRuntime487();
 return {...auditPharmacologyInfrastructure487(JSON.parse(JSON.stringify(r.ctx.MONITOR_THERAPY_CATALOG)),PILOT_DEFINITIONS_487),
  caseIds:r.ctx.CASES.map(x=>x.id),nativeBoot:r.bootAudit.boot,nativeMissingDefinitions:r.bootAudit.missingDefinitions,
  rejectionPreservesNativeEndpoints:r.bootAudit.rejectionPreservesNativeEndpoints,
  sourceEvidence:r.sources.compiled.map(({id,hash})=>({id,hash})),
  evidenceClass:'actual-current-inventory-and-compiled-contracts; missing-dependencies-are-design-proposals',
  scope:'No 30x13 efficacy matrix. No global catalog registration, live executor, production or heparin activation.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=currentPharmacologyCoverage487();
 if(process.argv.includes('--write'))fs.writeFileSync(new URL('./coverage-487.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 const output=process.argv.includes('--summary')?{entries:result.entries,cases:result.caseIds.length,
  mechanisms:result.registeredMechanisms,executableShadowEntries:result.executableShadowEntries,
  unimplementedEntries:result.unimplementedEntries,nativeBoot:result.nativeBoot.status,
  nativeMissingDefinitions:result.nativeMissingDefinitions,clinicalReady:false,realExecutorInstalled:false}:result;
 console.log(JSON.stringify(output,null,2));
}
