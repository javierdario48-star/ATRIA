/** Pure experimental mechanism contracts. No clinical/runtime installation. */
export const MECHANISM_PHASES_487=Object.freeze(['receipt','preCirculation','postCirculation','postNatural']);
export const freezePharmacology487=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freezePharmacology487);Object.freeze(x);}return x;
};
export const pharmacologyIndex487=index=>Object.freeze({get:id=>index.get(id),has:id=>index.has(id),size:index.size,values:()=>index.values()});
const idOK=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{0,79}$/.test(x);
const list=(x,label,nonempty=false)=>{
 if(!Array.isArray(x)||(nonempty&&!x.length)||x.some(v=>typeof v!=='string'||!v)||new Set(x).size!==x.length)
  throw Error('invalid '+label);return x;
};
export function compileMechanismRegistry487(modules,axes){
 if(!Array.isArray(modules)||!Array.isArray(axes))throw Error('mechanism registry arrays required');
 const knownAxes=new Set(axes),index=new Map();
 for(const raw of modules){
  if(!idOK(raw?.id)||index.has(raw.id))throw Error('invalid/duplicate mechanism id '+raw?.id);
  if(!Number.isInteger(raw.version)||raw.version<1||!['exposure','support','receipt'].includes(raw.input))throw Error('incomplete mechanism version/input '+raw.id);
  for(const key of ['requires','reads','writes']){
   list(raw[key],'mechanism '+key,key==='requires');
   for(const axis of raw[key])if(!knownAxes.has(axis))throw Error('missing physiology variable '+axis+' for '+raw.id);
  }
  for(const axis of [...raw.reads,...raw.writes])if(!raw.requires.includes(axis))throw Error('undeclared mechanism dependency '+axis+' for '+raw.id);
  if(!raw.writes.length)throw Error('incomplete mechanism writes '+raw.id);
  list(raw.kineticKinds,'mechanism kinetic inputs',true);list(raw.doseUnits,'mechanism dose units',true);
  list(raw.dependencies,'mechanism dependencies');list(raw.behavioralTests,'mechanism behavioral tests',true);
  if(!raw.evidence?.source)throw Error('incomplete mechanism evidence '+raw.id);
  if(!Number.isInteger(raw.order)||Math.abs(raw.order)>10000)throw Error('invalid mechanism order '+raw.id);
  if(!raw.handlers||!Object.keys(raw.handlers).length)throw Error('incomplete mechanism handlers '+raw.id);
  for(const [phase,handler]of Object.entries(raw.handlers))
   if(!MECHANISM_PHASES_487.includes(phase)||typeof handler!=='function')throw Error('invalid mechanism handler '+raw.id+'/'+phase);
  if((raw.input==='receipt'&&Object.keys(raw.handlers).some(phase=>phase!=='receipt'))||
   (raw.input==='exposure'&&raw.handlers.receipt))throw Error('unsupported mechanism phase for input '+raw.id);
  if((raw.input==='receipt'&&!raw.handlers.receipt)||(raw.input==='support'&&(!raw.handlers.receipt||!raw.handlers.postCirculation)))
   throw Error('incomplete mechanism delivery handlers '+raw.id);
  if(raw.input==='exposure'&&!['preCirculation','postCirculation','postNatural'].some(p=>raw.handlers[p]))throw Error('incomplete exposure handler '+raw.id);
  if(!raw.parameters||typeof raw.parameters!=='object'||Array.isArray(raw.parameters))throw Error('incomplete mechanism parameters '+raw.id);
  for(const [name,bounds]of Object.entries(raw.parameters))
   if(!/^[a-z][a-zA-Z0-9_]{0,79}$/.test(name)||!Number.isFinite(bounds.min)||!Number.isFinite(bounds.max)||bounds.min>bounds.max||
    !Number.isFinite(bounds.default)||bounds.default<bounds.min||bounds.default>bounds.max)throw Error('invalid mechanism parameter '+raw.id+'/'+name);
  if(raw.accumulate!==undefined&&typeof raw.accumulate!=='function')throw Error('invalid mechanism accumulator '+raw.id);
  if(raw.input==='exposure'&&!raw.accumulate&&Object.keys(raw.parameters).some(k=>k!=='gain'))
   throw Error('parameterized mechanism needs an accumulator '+raw.id);
  const {handlers,accumulate,...metadata}=raw;
  const m={...structuredClone(metadata),riskCodes:[...list(raw.riskCodes??[],'risk codes')],handlers:Object.freeze({...handlers}),
   accumulate:accumulate??((sum,exposure,parameters)=>sum+exposure*(parameters.gain??1))};
  index.set(raw.id,freezePharmacology487(m));
 }
 const ordered=[],done=new Set(),visiting=new Set();
 function visit(id){
  if(done.has(id))return;if(visiting.has(id))throw Error('cyclic mechanism dependency '+id);
  const m=index.get(id);if(!m)throw Error('missing mechanism dependency '+id);
  visiting.add(id);for(const dep of m.dependencies)visit(dep);visiting.delete(id);done.add(id);ordered.push(id);
 }
 [...index.values()].sort((a,b)=>a.order-b.order||(a.id<b.id?-1:1)).forEach(m=>visit(m.id));
 const ranks=new Map(ordered.map((id,i)=>[id,i]));
 return Object.freeze({schemaVersion:1,...pharmacologyIndex487(index),order:Object.freeze(ordered),rank:id=>ranks.get(id)});
}
export function compileMechanismBinding487(raw,registry){
 const m=registry.get(raw?.mechanismId);if(!m)throw Error('unsupported mechanism '+raw?.mechanismId);
 if(raw.parameters!==undefined&&(!raw.parameters||typeof raw.parameters!=='object'||Array.isArray(raw.parameters)))throw Error('invalid mechanism binding parameters '+m.id);
 const supplied=raw.parameters??{},parameters={};
 for(const name of Object.keys(supplied))if(!Object.hasOwn(m.parameters,name))throw Error('unknown mechanism parameter '+m.id+'/'+name);
 for(const [name,b]of Object.entries(m.parameters)){
  const value=Object.hasOwn(supplied,name)?supplied[name]:b.default;
  if(typeof value!=='number'||!Number.isFinite(value)||value<b.min||value>b.max)throw Error('invalid mechanism parameter '+m.id+'/'+name);
  parameters[name]=value;
 }
 return freezePharmacology487({mechanismId:m.id,parameters});
}
const normalized=new Set(['renalFunction','hepaticFunction','gasExchangeImpairment','oxygenSupport','respiratoryDepression','sedation','ischemiaRisk','fluidOverloadRisk']);
function applyEvaluation(state,module,result,context){
 if(!result||typeof result!=='object'||!result.updates||typeof result.updates!=='object'||Array.isArray(result.updates))throw Error('invalid mechanism result '+module.id);
 for(const [axis,value]of Object.entries(result.updates)){
  if(!module.writes.includes(axis))throw Error('undeclared mechanism write '+module.id+'/'+axis);
  if(axis==='sourceControlled'){
   if(typeof value!=='boolean')throw Error('invalid mechanism boolean '+axis);
  }else if(typeof value!=='number'||!Number.isFinite(value)||value<(axis==='oxygenResponseHalfLifeMin'?1e-9:0)||value>(normalized.has(axis)?1:1e9))
   throw Error('invalid mechanism state value '+module.id+'/'+axis);
 }
 const risks=result.risks??[];if(!Array.isArray(risks)||risks.some(code=>!module.riskCodes.includes(code)))throw Error('undeclared mechanism risk '+module.id);
 Object.assign(state,result.updates);for(const code of risks)context.note(code);
}
export function evaluateMechanism487(state,module,phase,signal,context){
 const handler=module.handlers[phase];if(!handler)return;
 const inputs=Object.freeze(Object.fromEntries(module.reads.map(axis=>[axis,state[axis]])));
 // Recording risks is a private kernel capability; modules return checked risks.
 const {note,...publicContext}=context;
 applyEvaluation(state,module,handler(inputs,signal,Object.freeze(publicContext)),context);
}
export function runMechanismPhase487(state,phase,activeSignals,context,registry){
 const active=[...activeSignals.keys()].sort((a,b)=>registry.rank(a)-registry.rank(b));
 for(const id of active){const m=registry.get(id);if(!m)throw Error('missing active mechanism '+id);
  evaluateMechanism487(state,m,phase,activeSignals.get(id),context);
 }
}
