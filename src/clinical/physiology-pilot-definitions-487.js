// Experimental B1 definitions, deliberately separate from the active catalogue.
// Reference exposures are normalization constants, NEVER automatic prescriptions.
export const PHYSIOLOGY_MODEL_487='b1-shadow-1';
export const PHYSIOLOGY_AXES_487=Object.freeze(['circulatingVolumeMl','interstitialFluidMl',
 'vascularTone','pumpFunction','perfusion','gasExchangeImpairment','oxygenSupport',
 'fluidOverloadRisk','pain','respiratoryDepression','sedation','renalFunction',
 'hepaticFunction','inflammation','infectionBurden','sourceControlled','ischemiaRisk']);
const label={pressor:'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6363e9b4-29df-4553-904d-a563e5adda6e',
 opioid:'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6023606c-150c-40c5-9175-598efe2a56c3',
 diuretic:'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c5db2be1-088f-1110-e053-2a95a90acac8'};
export const PILOT_DRUGS_487=Object.freeze([
 {id:'oxygen',mechanism:'oxygenation',route:'inhaled',unit:'L/min',actions:['start','setRate','stop'],
  requires:['gasExchangeImpairment','oxygenSupport'],kinetics:{kind:'support',responseHalfLifeMin:.25},
  evidence:{kind:'simulator-estimate',source:'https://www.brit-thoracic.org.uk/clinical-resources/guidelines/emergency-oxygen/',
   note:'Targets are patient/profile dependent. Flow-to-support and settling time need calibration; no CO2 model.'}},
 {id:'fluid',mechanism:'volume',route:'iv',unit:'ml',actions:['bolus'],
  requires:['circulatingVolumeMl','interstitialFluidMl'],kinetics:{kind:'physical-volume',intravascularFraction:.25},
  evidence:{kind:'simulator-estimate',source:'https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026',
   note:'Crystalloid compartment fraction and refill are reduced-model estimates. Reassess current volume and congestion.'}},
 {id:'vasopressor',mechanism:'pressor',route:'iv',unit:'mcg/kg/min',actions:['start','setRate','stop'],
  referenceDose:.05,requires:['vascularTone','pumpFunction','perfusion'],
  kinetics:{kind:'infusion',halfLifeMin:2.4,responseHalfLifeMin:.5,effectSiteHalfLifeMin:0,onsetMin:0,renalWeight:0,hepaticWeight:0},
  evidence:{kind:'mixed',source:label.pressor,note:'2.4min plasma half-life is label data. Separate0.5min response decay is an estimate fitted to label pressor cessation1–2min; normalized Hill response/ischemia risk remain estimates.'}},
 {id:'morphine',mechanism:'opioid',route:'iv',unit:'mg',actions:['bolus','stop'],
  referenceDose:4,requires:['pain','respiratoryDepression','vascularTone','renalFunction','hepaticFunction'],
  kinetics:{kind:'bolus',halfLifeMin:120,responseHalfLifeMin:120,effectSiteHalfLifeMin:10,onsetMin:0,renalWeight:.45,hepaticWeight:.4},
  evidence:{kind:'simulator-estimate',source:label.opioid,note:'IV maximum CNS effect can be delayed30min. 120min and10min reduced-compartment values are estimates; renal/hepatic prolongation does not model M3G/M6G separately.'}},
 {id:'furosemide',mechanism:'diuretic',route:'iv',unit:'mg',actions:['bolus','stop'],
  referenceDose:40,requires:['circulatingVolumeMl','interstitialFluidMl','renalFunction','perfusion'],
  kinetics:{kind:'bolus',halfLifeMin:120,responseHalfLifeMin:25,effectSiteHalfLifeMin:8,onsetMin:5,renalWeight:.55,hepaticWeight:0},
  evidence:{kind:'mixed',source:label.diuretic,note:'IV onset≤5min, peak≤30min, diuresis≈2h and terminalhalf-life≈2h are label data. Separate25min response pool and8min effect-site are calibration estimates, not measured compartments.'}}
]);
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
export function compilePhysiologyDefinitions487(drugs=PILOT_DRUGS_487){
 const index=new Map(),axes=new Set(PHYSIOLOGY_AXES_487),modes=new Set(['oxygenation','volume','pressor','opioid','diuretic']);
 const required={oxygenation:['gasExchangeImpairment','oxygenSupport'],volume:['circulatingVolumeMl','interstitialFluidMl'],
  pressor:['vascularTone','pumpFunction','perfusion'],opioid:['pain','respiratoryDepression','vascularTone','renalFunction','hepaticFunction'],
  diuretic:['circulatingVolumeMl','interstitialFluidMl','renalFunction','perfusion']};
 const kinds={oxygenation:'support',volume:'physical-volume',pressor:'infusion',opioid:'bolus',diuretic:'bolus'};
 const units={oxygenation:'L/min',volume:'ml',pressor:'mcg/kg/min',opioid:'mg',diuretic:'mg'};
 if(!Array.isArray(drugs))throw Error('drug definitions must be an array');
 for(const item of drugs){
  if(typeof item?.id!=='string'||! /^[a-z][a-z0-9-]{0,79}$/.test(item.id)||index.has(item.id))throw Error('invalid/duplicate physiology drug id');
  for(const axis of item.requires||[])if(!axes.has(axis))throw Error('missing physiology variable '+axis+' for '+item.id);
  if(!modes.has(item.mechanism)||!item.requires?.length||!item.evidence?.source)
   throw Error('unsupported or incomplete mechanism '+item.id);
  for(const axis of required[item.mechanism])if(!item.requires.includes(axis))throw Error('missing mechanism variable '+axis+' for '+item.id);
  if(!['iv','inhaled'].includes(item.route)||!item.unit||!Array.isArray(item.actions)||!item.actions.length)
   throw Error('missing route, unit or action '+item.id);
  const k=item.kinetics;
  if(!k||!['support','physical-volume','infusion','bolus'].includes(k.kind))throw Error('invalid kinetics '+item.id);
  if(k.kind!==kinds[item.mechanism]||item.unit!==units[item.mechanism]||
   item.route!==(item.mechanism==='oxygenation'?'inhaled':'iv'))throw Error('mechanism kinetics/route/unit mismatch '+item.id);
  const expectedActions=['support','infusion'].includes(k.kind)?['start','setRate','stop']:
   k.kind==='physical-volume'?['bolus']:['bolus','stop'];
  if(item.actions.length!==expectedActions.length||expectedActions.some(x=>!item.actions.includes(x)))throw Error('invalid mechanism actions '+item.id);
  if(['bolus','infusion'].includes(k.kind)){
   for(const key of ['halfLifeMin','responseHalfLifeMin'])if(!Number.isFinite(k[key])||k[key]<=0)throw Error('invalid '+key+' '+item.id);
   for(const key of ['effectSiteHalfLifeMin','onsetMin','renalWeight','hepaticWeight'])if(!Number.isFinite(k[key])||k[key]<0)throw Error('invalid '+key+' '+item.id);
   if(k.renalWeight+k.hepaticWeight>1||!Number.isFinite(item.referenceDose)||item.referenceDose<=0)throw Error('invalid clearance/reference dose '+item.id);
  }
  if(k.kind==='support'&&(!Number.isFinite(k.responseHalfLifeMin)||!(k.responseHalfLifeMin>0)))throw Error('invalid support kinetics '+item.id);
  if(k.kind==='physical-volume'&&!(k.intravascularFraction>0&&k.intravascularFraction<=1))throw Error('invalid fluid distribution '+item.id);
  index.set(item.id,freeze(structuredClone(item)));
 }
 // Frozen Map alone is mutable. Expose a read-only indexed facade, not its setter.
 return Object.freeze({modelVersion:PHYSIOLOGY_MODEL_487,schemaVersion:1,
  drugs:Object.freeze({get:id=>index.get(id),has:id=>index.has(id),size:index.size,values:()=>index.values()})});
}
export const PILOT_DEFINITIONS_487=compilePhysiologyDefinitions487();
