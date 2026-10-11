/** Versioned experimental identities/formulations. No global catalog registration. */
import {compileMechanismBinding487,freezePharmacology487,pharmacologyIndex487} from './pharmacology-mechanisms-487.js';
const idOK=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{0,79}$/.test(x);
const number=(x,name,min=0,max=1e6)=>{
 if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error('invalid '+name);return x;
};
const canonical=x=>JSON.stringify(sortValue(x));
// Compact non-security index key; active/queued definitions ALSO compare the
// exact canonical record. Never use this fingerprint to prove administration.
function fingerprint(value){
 let a=2166136261,b=3339675911;
 for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b^value.charCodeAt(i),2246822519);}
 return 'content-'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
function sortValue(x){
 if(Array.isArray(x))return x.map(sortValue);
 if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sortValue(x[k])]));return x;
}
function kinetics(form,axes){
 const k=structuredClone(form.pharmacokinetics),mode=form.administration.mode;
 if(!k||k.kind!==mode||!['support','physical-volume','bolus','infusion'].includes(mode))throw Error('unsupported kinetics/administration '+form.id);
 const allowed=mode==='support'?['kind','responseHalfLifeMin']:mode==='physical-volume'?['kind']:
  ['kind','halfLifeMin','responseHalfLifeMin','effectSiteHalfLifeMin','onsetMin','renalWeight','hepaticWeight'];
 if(Object.keys(k).some(key=>!allowed.includes(key)))throw Error('unknown pharmacokinetic field '+form.id);
 if(['bolus','infusion'].includes(mode)){
  for(const key of ['halfLifeMin','responseHalfLifeMin'])number(k[key],key,1e-9);
  for(const key of ['effectSiteHalfLifeMin','onsetMin','renalWeight','hepaticWeight'])number(k[key],key);
  if(k.renalWeight+k.hepaticWeight>1)throw Error('invalid clearance '+form.id);
  if(k.renalWeight&&!axes.has('renalFunction'))throw Error('missing physiology variable renalFunction');
  if(k.hepaticWeight&&!axes.has('hepaticFunction'))throw Error('missing physiology variable hepaticFunction');
  number(form.administration.referenceDose,'reference dose',1e-9);
 }else if(mode==='support')number(k.responseHalfLifeMin,'support half-life',1e-9);
 return k;
}
export function compilePharmacologyContent487(content,{mechanisms,axes,modelVersion}={}){
 if(content?.schemaVersion!==2||typeof content.version!=='string'||!content.version||
  !Array.isArray(content.molecules)||!Array.isArray(content.formulations)||!mechanisms?.get||!Array.isArray(axes)||!modelVersion)
  throw Error('incompatible/incomplete pharmacology content version');
 const moleculeIndex=new Map(),drugIndex=new Map(),formulatedMolecules=new Set(),knownAxes=new Set(axes);
 for(const m of content.molecules){
  if(!idOK(m?.id)||moleculeIndex.has(m.id))throw Error('invalid/duplicate molecule identity');
  if(!Number.isInteger(m.version)||m.version<1||!['molecule','fluid','gas'].includes(m.kind)||
   typeof m.activeMoiety!=='string'||!m.activeMoiety||typeof m.label!=='string'||!m.label||!m.evidence?.source)
   throw Error('incomplete molecule identity/evidence '+m.id);
  moleculeIndex.set(m.id,freezePharmacology487(structuredClone(m)));
 }
 for(const form of content.formulations){
  if(!idOK(form?.id)||drugIndex.has(form.id)||!Number.isInteger(form.version)||form.version<1)throw Error('invalid/duplicate formulation identity');
  const molecule=moleculeIndex.get(form.moleculeId);if(!molecule)throw Error('missing molecule '+form.moleculeId);formulatedMolecules.add(form.moleculeId);
  if(!['iv','im','oral','inhaled'].includes(form.route)||!form.administration?.unit||!form.evidence?.source)
   throw Error('incomplete formulation route/unit/evidence '+form.id);
  const k=kinetics(form,knownAxes),expected=['support','infusion'].includes(k.kind)?['start','setRate','stop']:
   k.kind==='physical-volume'?['bolus']:['bolus','stop'];
  const actions=form.administration.actions;
  if(!Array.isArray(actions)||actions.length!==expected.length||new Set(actions).size!==actions.length||expected.some(a=>!actions.includes(a)))
   throw Error('invalid formulation actions '+form.id);
  if(!Array.isArray(form.effects)||!form.effects.length)throw Error('missing formulation mechanisms '+form.id);
  const bindings=[],ids=new Set(),requires=new Set();
  if(k.renalWeight)requires.add('renalFunction');if(k.hepaticWeight)requires.add('hepaticFunction');
  for(const raw of form.effects){
   const b=compileMechanismBinding487(raw,mechanisms),m=mechanisms.get(b.mechanismId);
   if(ids.has(m.id))throw Error('duplicate mechanism binding '+form.id+'/'+m.id);ids.add(m.id);
   const deliveryCompatible=m.input==='exposure'?['bolus','infusion'].includes(k.kind):m.input==='support'?k.kind==='support':k.kind==='physical-volume';
   if(!deliveryCompatible||!m.kineticKinds.includes(k.kind)||!m.doseUnits.includes(form.administration.unit))throw Error('mechanism kinetics/unit mismatch '+form.id+'/'+m.id);
   for(const axis of m.requires){if(!knownAxes.has(axis))throw Error('missing physiology variable '+axis+' for '+form.id);requires.add(axis);}
   bindings.push(b);
  }
  const signature=canonical({form,molecule,mechanisms:bindings.map(b=>{const {handlers,accumulate,...m}=mechanisms.get(b.mechanismId);return m;})});
  const legacyKinetics=form.legacy?.mechanism==='volume'?{...k,intravascularFraction:bindings.find(b=>b.mechanismId==='volume').parameters.intravascularFraction}:k;
  drugIndex.set(form.id,freezePharmacology487({id:form.id,moleculeId:form.moleculeId,definitionVersion:form.version,
   route:form.route,unit:form.administration.unit,actions:[...actions],referenceDose:form.administration.referenceDose,
   kinetics:legacyKinetics,bindings,requires:[...requires],evidence:structuredClone(form.evidence),mechanism:form.legacy?.mechanism,signature,fingerprint:fingerprint(signature)}));
 }
 for(const id of moleculeIndex.keys())if(!formulatedMolecules.has(id))throw Error('molecule has no formulation '+id);
 return Object.freeze({schemaVersion:2,modelVersion,contentVersion:content.version,clinicalReady:false,
  molecules:pharmacologyIndex487(moleculeIndex),drugs:pharmacologyIndex487(drugIndex),mechanisms,
  content:freezePharmacology487(structuredClone(content))});
}
export function createB1PharmacologyContent487(legacyDrugs){
 if(!Array.isArray(legacyDrugs))throw Error('legacy drug array required');
 const content={schemaVersion:2,version:'b1-compatible-1',molecules:[],formulations:[]};
 const bindings={oxygenation:['oxygenation'],volume:['volume'],pressor:['pressor'],
  opioid:['opioid-respiratory','opioid-analgesia','opioid-circulation'],diuretic:['diuretic']};
 for(const d of legacyDrugs){
  const moleculeId=d.id==='vasopressor'?'norepinephrine':d.id==='fluid'?'balanced-crystalloid':d.id;
  if(!bindings[d.mechanism])throw Error('unsupported legacy mechanism '+d.mechanism);
  const pharmacokinetics=structuredClone(d.kinetics);delete pharmacokinetics.intravascularFraction;
  content.molecules.push({id:moleculeId,version:1,kind:d.mechanism==='volume'?'fluid':d.mechanism==='oxygenation'?'gas':'molecule',
   activeMoiety:moleculeId,label:moleculeId,evidence:structuredClone(d.evidence)});
  content.formulations.push({id:d.id,version:1,moleculeId,route:d.route,
   administration:{mode:d.kinetics.kind,unit:d.unit,actions:[...d.actions],...(d.referenceDose?{referenceDose:d.referenceDose}:{})},
   pharmacokinetics,effects:bindings[d.mechanism].map(mechanismId=>({mechanismId,
    parameters:d.mechanism==='volume'?{intravascularFraction:d.kinetics.intravascularFraction}:d.mechanism==='oxygenation'?{}:{gain:1}})),
   evidence:structuredClone(d.evidence),legacy:{mechanism:d.mechanism}});
 }
 return content;
}
