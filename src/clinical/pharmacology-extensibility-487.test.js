import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PILOT_DRUGS_487,PILOT_DEFINITIONS_487,PHYSIOLOGY_AXES_487,PHYSIOLOGY_MODEL_487} from './physiology-pilot-definitions-487.js';
import {createPhysiologyState487,stepPhysiology487,observePhysiology487} from './physiology-pilot-487.js';
import {createPilotProfile487} from './physiology-pilot-cases-487.js';
import {loadNativeReferenceSources487} from '../../qa/physiology-pilot/native-reference-487.mjs';
import {runPhysiologyPilot487} from '../../qa/physiology-pilot/run-pilot-487.mjs';

const registryApi=await import('./pharmacology-mechanisms-487.js').catch(()=>({}));
const contentApi=await import('./pharmacology-content-487.js').catch(()=>({}));
const b1Api=await import('./pharmacology-mechanisms-b1-487.js').catch(()=>({}));
assert.equal(typeof registryApi.compileMechanismRegistry487,'function','modular mechanism registry must exist');
assert.equal(typeof contentApi.compilePharmacologyContent487,'function','separated content compiler must exist');
assert(Array.isArray(b1Api.B1_MECHANISMS_487),'B1 mechanism modules must exist');
const {compileMechanismRegistry487}=registryApi,{compilePharmacologyContent487,createB1PharmacologyContent487}=contentApi;
const {B1_MECHANISMS_487}=b1Api;
const compile=(content,modules=B1_MECHANISMS_487)=>compilePharmacologyContent487(content,{
 mechanisms:compileMechanismRegistry487(modules,PHYSIOLOGY_AXES_487),axes:PHYSIOLOGY_AXES_487,modelVersion:PHYSIOLOGY_MODEL_487});
const content=()=>createB1PharmacologyContent487(PILOT_DRUGS_487);
const cases=loadNativeReferenceSources487().cases;
const fresh=(id='HDA-001')=>createPhysiologyState487(createPilotProfile487(cases.find(c=>c.id===id)),'qa-patient');
const event=(id,drugId,amount=4,atClinicalMinute=0,action='bolus',route='iv',unit='mg')=>({
 eventId:id,patientId:'qa-patient',drugId,status:'administered',action,route,dose:{amount,unit},atClinicalMinute,sequence:0});
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log('EXTENSIBILITY PASS',name);};
const mutableModule=id=>({id,version:1,input:'exposure',requires:['renalFunction'],reads:['renalFunction'],writes:['renalFunction'],
 kineticKinds:['bolus','infusion'],doseUnits:['mg'],parameters:{gain:{min:0,max:100,default:1}},order:90,dependencies:[],
 handlers:{postNatural:(s,signal,{dt})=>({updates:{renalFunction:Math.max(0,s.renalFunction-.0001*signal*dt)}})},
 evidence:{source:'qa-only-independent-contract'},behavioralTests:['synthetic-renal-contract']});
function syntheticContent({twoRoutes=false,effects=null}={}){
 const c=content(),m=c.molecules.find(x=>x.id==='morphine'),f=c.formulations.find(x=>x.id==='morphine');
 c.molecules.push({...structuredClone(m),id:'qa-reused-opioid',activeMoiety:'qa-reused-opioid',label:'Synthetic mechanism reuse fixture'});
 c.formulations.push({...structuredClone(f),id:'qa-reused-opioid-iv',moleculeId:'qa-reused-opioid',legacy:null,
  ...(effects?{effects}:{}),route:'iv'});
 if(twoRoutes)c.formulations.push({...structuredClone(c.formulations.at(-1)),id:'qa-reused-opioid-im',route:'im'});
 return c;
}
check('compiled legacy facade and separated content are immutable',()=>{
 const d=compile(content());assert.equal(d.drugs.size,5);assert.equal(d.molecules.size,5);assert.equal(d.mechanisms.size,7);
 assert.equal(d.drugs.get('morphine').moleculeId,'morphine');assert.equal(d.drugs.get('vasopressor').moleculeId,'norepinephrine');
 assert(d.drugs.get('morphine').requires.includes('renalFunction'));assert(d.drugs.get('morphine').requires.includes('hepaticFunction'));
 assert.equal(PILOT_DEFINITIONS_487.drugs.get('fluid').kinetics.intravascularFraction,.25,'legacy definition facade preserved');
 assert.equal(d.drugs.set,undefined);assert.equal(d.mechanisms.set,undefined);
 assert.throws(()=>{d.drugs.get('morphine').bindings[0].parameters.gain=100;},TypeError);
 assert.throws(()=>{d.molecules.get('morphine').activeMoiety='fake';},TypeError);
});
check('module validation rejects incomplete handlers/evidence/tests',()=>{
 for(const field of ['handlers','evidence','behavioralTests']){
  const m=mutableModule('qa-incomplete');delete m[field];
  assert.throws(()=>compileMechanismRegistry487([...B1_MECHANISMS_487,m],PHYSIOLOGY_AXES_487),/incomplete|handler|evidence|test/i);
 }
 assert.throws(()=>compileMechanismRegistry487([...B1_MECHANISMS_487,{...mutableModule('qa-incomplete'),handlers:{}}],PHYSIOLOGY_AXES_487),/handler|incomplete/i);
});
check('module references reject missing axes and duplicate/cyclic dependencies',()=>{
 const m={...mutableModule('qa-coagulation'),requires:['plateletCount'],reads:['plateletCount']};
 assert.throws(()=>compileMechanismRegistry487([...B1_MECHANISMS_487,m],PHYSIOLOGY_AXES_487),/plateletCount/);
 assert.throws(()=>compileMechanismRegistry487([...B1_MECHANISMS_487,B1_MECHANISMS_487[0]],PHYSIOLOGY_AXES_487),/duplicate/i);
 const a={...mutableModule('qa-a'),dependencies:['qa-b']},b={...mutableModule('qa-b'),dependencies:['qa-a']};
 assert.throws(()=>compileMechanismRegistry487([a,b],PHYSIOLOGY_AXES_487),/cycle|cyclic/i);
 assert.throws(()=>compileMechanismRegistry487([{...a,dependencies:['absent']}],PHYSIOLOGY_AXES_487),/dependency|absent/i);
});
check('handler phases unsupported by an input kind fail compilation',()=>{
 const volume=B1_MECHANISMS_487.find(m=>m.id==='volume'),opioid=mutableModule('qa-wrong-phase');
 assert.throws(()=>compileMechanismRegistry487([{...volume,handlers:{...volume.handlers,postNatural:()=>({updates:{}})}}],PHYSIOLOGY_AXES_487),/unsupported mechanism phase/);
 assert.throws(()=>compileMechanismRegistry487([{...opioid,handlers:{...opioid.handlers,receipt:()=>({updates:{}})}}],PHYSIOLOGY_AXES_487),/unsupported mechanism phase/);
});
check('content validation rejects identity, PK, axis and parameter gaps',()=>{
 for(const mutate of [
  c=>c.molecules.push(structuredClone(c.molecules[0])),
  c=>{c.formulations[0].moleculeId='absent';},
  c=>{c.formulations.find(x=>x.id==='morphine').pharmacokinetics.halfLifeMin=Infinity;},
  c=>{c.formulations.find(x=>x.id==='morphine').effects[0].mechanismId='not-installed';},
  c=>{c.formulations.find(x=>x.id==='morphine').effects[0].parameters.gain=NaN;},
  c=>{c.formulations.find(x=>x.id==='morphine').effects[0].parameters.gain=101;},
  c=>{c.formulations.find(x=>x.id==='morphine').administration.referenceDose=0;},
  c=>{c.schemaVersion=99;},
 ]){const c=content();mutate(c);assert.throws(()=>compile(c));}
 const c=content(),f=c.formulations.find(x=>x.id==='morphine');f.effects.push(structuredClone(f.effects[0]));
 assert.throws(()=>compile(c),/duplicate.*mechanism|binding/i);
});
check('new molecule reuses three registered mechanisms across all pilot states',()=>{
 const d=compile(syntheticContent());
 for(const id of ['PERI-SEC-001','HDA-001','CIRR-001']){
  const a=stepPhysiology487(fresh(id),[event('old','morphine')],30,PILOT_DEFINITIONS_487);
  const b=stepPhysiology487(fresh(id),[event('new','qa-reused-opioid-iv')],30,d);
  assert.deepEqual(observePhysiology487(b),observePhysiology487(a),id);
  assert.equal(Object.keys(b.exposures).length,1,'bindings must share one exposure');
  assert(b.pain<fresh(id).pain);assert(b.respiratoryDepression>0);
 }
});
check('one molecule can have independent route and PK formulations',()=>{
 const c=syntheticContent({twoRoutes:true}),im=c.formulations.at(-1);
 im.pharmacokinetics.onsetMin=10;const d=compile(c);
 const iv=stepPhysiology487(fresh(),[event('iv','qa-reused-opioid-iv')],5,d);
 const slow=stepPhysiology487(fresh(),[event('im','qa-reused-opioid-im',4,0,'bolus','im')],5,d);
 assert(iv.pain<slow.pain);assert.equal(slow.respiratoryDepression,0);
 assert.equal(d.drugs.get('qa-reused-opioid-im').moleculeId,d.drugs.get('qa-reused-opioid-iv').moleculeId);
 assert.throws(()=>stepPhysiology487(fresh(),[event('wrong','qa-reused-opioid-im')],1,d),/route/i);
});
check('multi-agent shared mechanism aggregation applies each exposure once',()=>{
 const d=compile(syntheticContent());
 const combined=stepPhysiology487(fresh(),[event('half-a','morphine',2),event('half-b','qa-reused-opioid-iv',2)],30,d);
 const full=stepPhysiology487(fresh(),[event('full','morphine',4)],30,d);
 assert.deepEqual(observePhysiology487(combined),observePhysiology487(full));
 const e=event('once','qa-reused-opioid-iv');
 assert.deepEqual(stepPhysiology487(fresh(),[e,e],30,d),stepPhysiology487(fresh(),[e],30,d));
});
check('synthetic new mechanism uses existing axes without changing integrator',()=>{
 const m=mutableModule('qa-renal-challenge'),c=syntheticContent({effects:[{mechanismId:m.id,parameters:{gain:1}}]});
 const d=compile(c,[...B1_MECHANISMS_487,m]);
 for(const id of ['PERI-SEC-001','HDA-001','CIRR-001']){
  const a=stepPhysiology487(fresh(id),[],30,d),b=stepPhysiology487(fresh(id),[event('new','qa-reused-opioid-iv')],30,d);
  assert(b.renalFunction<a.renalFunction,id);assert.equal(b.respiratoryDepression,0);
 }
});
check('evaluators cannot write undeclared/invalid axes or mutate declared inputs',()=>{
 for(const handler of [()=>({updates:{sourceControlled:true}}),()=>({updates:{renalFunction:NaN}}),
  ()=>({updates:{renalFunction:2}}),s=>{s.renalFunction=0;return {updates:{}};}]){
  const m={...mutableModule('qa-bad-output'),handlers:{postNatural:handler}};
  const c=syntheticContent({effects:[{mechanismId:m.id,parameters:{gain:1}}]}),d=compile(c,[...B1_MECHANISMS_487,m]);
  const s=fresh(),before=JSON.stringify(s),exposures=s.exposures;
  assert.throws(()=>stepPhysiology487(s,[event('bad','qa-reused-opioid-iv')],1,d));
  assert.equal(JSON.stringify(s),before);assert.equal(s.exposures,exposures);
 }
});
check('active formulation revisions require explicit replay/migration',()=>{
 const c=content(),a=compile(c),s=stepPhysiology487(fresh(),[event('given','morphine')],1,a);
 const changed=content();changed.formulations.find(x=>x.id==='morphine').pharmacokinetics.halfLifeMin=240;
 assert.throws(()=>stepPhysiology487(s,[],1,compile(changed)),/definition|version|revision|manifest/i);
 const modules=B1_MECHANISMS_487.map(m=>m.id==='opioid-analgesia'?{...m,version:m.version+1}:m);
 assert.throws(()=>stepPhysiology487(s,[],1,compile(content(),modules)),/definition|version|revision|manifest/i);
});
check('evaluators cannot bypass risk validation through a kernel callback',()=>{
 const m={...mutableModule('qa-risk-bypass'),handlers:{postNatural:(_,__,ctx)=>{
  assert.equal(ctx.note,undefined,'risk recording remains private to the integrator');return {updates:{},risks:['undeclared-risk']};
 }}};
 const d=compile(syntheticContent({effects:[{mechanismId:m.id,parameters:{gain:1}}]}),[...B1_MECHANISMS_487,m]);
 const s=fresh(),before=JSON.stringify(s);
 assert.throws(()=>stepPhysiology487(s,[event('risk','qa-reused-opioid-iv')],1,d),/undeclared mechanism risk/);
 assert.equal(JSON.stringify(s),before);
});
check('invalid positive-only axis writes fail in the first step',()=>{
 const m={...mutableModule('qa-invalid-half-life'),requires:['oxygenResponseHalfLifeMin'],reads:[],writes:['oxygenResponseHalfLifeMin'],
  handlers:{postNatural:()=>({updates:{oxygenResponseHalfLifeMin:0}})}};
 const d=compile(syntheticContent({effects:[{mechanismId:m.id,parameters:{gain:1}}]}),[...B1_MECHANISMS_487,m]);
 const s=fresh(),before=JSON.stringify(s);
 assert.throws(()=>stepPhysiology487(s,[event('invalid','qa-reused-opioid-iv')],1,d),/invalid mechanism state value/);
 assert.equal(JSON.stringify(s),before);
});
check('malformed patch containers cannot silently become an empty effect',()=>{
 for(const updates of [true,1,'invalid']){
  const m={...mutableModule('qa-malformed-patch'),handlers:{postNatural:()=>({updates})}};
  const d=compile(syntheticContent({effects:[{mechanismId:m.id,parameters:{gain:1}}]}),[...B1_MECHANISMS_487,m]);
  assert.throws(()=>stepPhysiology487(fresh(),[event('malformed','qa-reused-opioid-iv')],1,d),/invalid mechanism result/);
 }
});
check('unsupported infusion onset is rejected rather than silently ignored',()=>{
 const c=content();c.formulations.find(x=>x.id==='vasopressor').pharmacokinetics.onsetMin=60;
 assert.throws(()=>compile(c),/unsupported infusion onset/);
});
check('receipt deduplication stores compact keys, not a whole content record per dose',()=>{
 const s=stepPhysiology487(fresh(),[event('given','morphine')],1,PILOT_DEFINITIONS_487);
 assert(s.seenEvents.given.length<500,'receipt index must not replicate full formulation/module metadata');
});
check('support formulation switching requires delivered suspension and can then proceed',()=>{
 const c=content(),f=c.formulations.find(x=>x.id==='oxygen');c.formulations.push({...structuredClone(f),id:'qa-second-oxygen',legacy:null});
 const d=compile(c),s=stepPhysiology487(fresh(),[event('start','oxygen',4,0,'start','inhaled','L/min')],1,d);
 assert.throws(()=>stepPhysiology487(s,[event('conflict','qa-second-oxygen',4,1,'start','inhaled','L/min')],1,d),/support|channel|suspension/);
 const stopped=stepPhysiology487(s,[event('stop','oxygen',0,1,'stop','inhaled','L/min')],0,d);
 const switched=stepPhysiology487(stopped,[event('switch','qa-second-oxygen',2,1,'start','inhaled','L/min')],1,d);
 assert.equal(switched.oxygenFlowLpm,2);
});
check('unrecognized PK fields and explicit null binding parameters are rejected',()=>{
 const c=content();c.formulations.find(x=>x.id==='morphine').pharmacokinetics.fakeAbsorption=123;
 assert.throws(()=>compile(c),/kinetic|PK|field/i);
 const b=content();b.formulations.find(x=>x.id==='morphine').effects[0].parameters.gain=null;
 assert.throws(()=>compile(b),/parameter/i);
});

let numericComparisons=0;
function equivalent(expected,actual,path='B1'){
 if(typeof expected==='number'){
  assert(Number.isFinite(actual),path+' finite');
  assert(Math.abs(expected-actual)<=1e-8+Math.abs(expected)*1e-10,path+': '+actual+' != '+expected);
  numericComparisons++;return;
 }
 if(expected===null||typeof expected!=='object'){assert.equal(actual,expected,path);return;}
 if(Array.isArray(expected))assert.equal(actual?.length,expected.length,path+' length');
 for(const [key,value]of Object.entries(expected))equivalent(value,actual?.[key],path+'.'+key);
}
check('all approved B1 trajectories retain observations, exposure and risk chronology',()=>{
 const expected=JSON.parse(fs.readFileSync(new URL('../../qa/physiology-pilot/pilot-comparison-487.json',import.meta.url),'utf8'));
 const actual=runPhysiologyPilot487();
 equivalent(expected.nativeComparison,actual.nativeComparison,'nativeComparison');
 equivalent(expected.newScenarios,actual.newScenarios,'newScenarios');
 equivalent(expected.timing,actual.timing,'timing');
 assert.equal(actual.nativeWrites,0);assert.equal(actual.runtimeHooks,0);assert.equal(actual.clinicalValidated,false);
});
console.log('PHARMACOLOGY EXTENSIBILITY PASS',JSON.stringify({checks,numericComparisons,realMoleculesAdded:0,clinicalActivation:false}));
