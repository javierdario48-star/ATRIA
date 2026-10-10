// ATRIA 4.8.7 experimental pharmacology registry.
// Game-scale response coefficients are calibration parameters, NOT clinical
// dose recommendations or deterministic predictions of actual patient outcomes.
const D=(classId,route,onsetMin,peakMin,indications=[],hazards=[],mechanism='none')=>
 ({classId,route,onsetMin,peakMin,indications,hazards,mechanism});
// Each native catalog ID MUST appear here. Additions require review and tests.
export const PHARMA_RULES_487=Object.freeze({
 oxygen:D('respiratory','inhaled',0,3,['hypoxemia'],['hyperoxia','hypercapnia'],'oxygenation'),
 fluid:D('volume','iv',0,5,['hypovolemia','bleed','sepsis'],['overload'],'volume'),
 albumin:D('colloid','iv',5,40,['pbe','largeAscitesTap','selectedHypovolemia'],['overload'],'albumin'),
 vasopressor:D('pressor','iv',0,4,['vasoplegia','shock'],['ischemia','arrhythmia'],'pressor'),
 morphine:D('opioid','iv',1,5,['pain'],['hypotension','respiratoryDepression','ileus'],'opioid'),
 analgesia:D('analgesic','conditional',2,12,['pain','fever'],['agentSpecific'],'analgesic'),
 antiemetic:D('antiemetic','conditional',5,20,['nausea'],['qt','obstruction'],'antiemetic'),
 ppi:D('acid','iv',15,90,['ulcerBleed'],['unnecessary'],'acid'),
 transfusion:D('blood','iv',5,60,['bleed','anemia'],['overload','transfusionReaction'],'blood'),
 paracentesis_ter:D('procedure','procedure',0,15,['ascites'],['postParacentesisCirculation'],'paracentesis'),
 espironolactona:D('diuretic','oral',120,600,['ascites','congestion'],['hypotension','hyperkalemia','renal'],'spironolactone'),
 steroid:D('steroid','conditional',45,240,['immuneInflammation','selectedRefractoryShock'],['infection','hyperglycemia'],'steroid'),
 aza:D('immunomodulator','oral',4320,20160,['immuneMaintenance'],['myelosuppression','hepatotoxicity','pancreatitis'],'aza'),
 ceftriaxone:D('antibiotic','iv',20,120,['susceptibleBacteria'],['allergy','biliary'],'antimicrobial'),
 metronidazole:D('antibiotic','iv',20,120,['susceptibleAnaerobes'],['neurotoxicity'],'antimicrobial'),
 imipenem:D('antibiotic','iv',15,90,['susceptibleBacteria'],['renal','neurotoxicity'],'antimicrobial'),
 ceftazidime:D('antibiotic','iv',20,120,['susceptibleBacteria'],['renal'],'antimicrobial'),
 cefoperazone:D('antibiotic','iv',20,120,['susceptibleBacteria'],['coagulopathy'],'antimicrobial'),
 cefepime:D('antibiotic','iv',20,120,['susceptibleBacteria'],['renal','neurotoxicity'],'antimicrobial'),
 piptazo:D('antibiotic','iv',20,120,['susceptibleBacteria','susceptibleAnaerobes'],['renal','allergy'],'antimicrobial'),
 ampicillin:D('antibiotic','iv',20,120,['susceptibleBacteria'],['allergy','renal'],'antimicrobial'),
 amikacin:D('aminoglycoside','iv',15,90,['susceptibleBacteria'],['renal','ototoxicity'],'antimicrobial'),
 gentamicin:D('aminoglycoside','iv',15,90,['susceptibleBacteria'],['renal','ototoxicity'],'antimicrobial'),
 fluconazole:D('antifungal','iv',60,240,['susceptibleFungi'],['qt','hepatic'],'antimicrobial'),
 amphotericin:D('antifungal','iv',30,240,['susceptibleFungi'],['renal','electrolytes','infusion'],'antimicrobial'),
 source_control:D('procedure','procedure',30,240,['uncontrolledSource'],['procedureRisk'],'sourceControl'),
 stop_beta_blocker:D('deprescribe','none',30,180,['unsafeBetaBlocker'],['rebound'],'deprescribe'),
 furosemide:D('diuretic','iv',5,30,['overload','congestion'],['hypotension','renal','electrolytes'],'diuretic'),
 beta_blocker:D('betaBlocker','conditional',5,30,['indicatedRateControl'],['hypotension','bradycardia','shock'],'betaBlocker')
});
// Explicit baseline profiles for the actual 13 clinical seeds.
// New CASES must supply pharmacology:{traits:[...],...} and will then
// automatically inherit EVERY global drug rule, including new medications.
export const BASE_CASE_PHARMACOLOGY_487=Object.freeze({
 'CIRR-001':['ascites','congestion','renalRisk','overloadRisk'],
 'PANC-001':['pain','hypovolemia','shock','pancreatitis','nausea','overloadRisk'],
 'CROHN-001':['pain','immuneInflammation','immuneMaintenance','diarrhea'],
 'HDA-001':['bleed','hypovolemia','shock','ulcerBleed','anemia'],
 'COLON-001':['anemia','neoplasm'],
 'PERI-PBE-001':['pbe','ascites','infection','sepsis','hypovolemia','renalRisk','overloadRisk'],
 'PERI-SEC-001':['secondaryPeritonitis','infection','sepsis','vasoplegia','shock','hypovolemia','pain','uncontrolledSource'],
 'PERI-TER-001':['tertiaryPeritonitis','infection','sepsis','vasoplegia','shock','hypovolemia','renalRisk'],
 'APP-001':['appendicitis','infection','pain','uncontrolledSource'],
 'CHOLE-001':['cholecystitis','infection','pain','nausea','uncontrolledSource'],
 'ILEO-001':['obstruction','hypovolemia','shock','nausea','pain'],
 'MESI-001':['mesentericIschemia','hypovolemia','shock','pain','uncontrolledSource'],
 'CHOLANG-001':['cholangitis','infection','sepsis','vasoplegia','shock','hypovolemia','uncontrolledSource']
});
const allowedModes=new Set(['oxygenation','volume','albumin','pressor','opioid','analgesic','antiemetic','acid',
 'blood','paracentesis','spironolactone','steroid','aza','antimicrobial','sourceControl','deprescribe',
 'diuretic','betaBlocker','none','custom']);
const allowedRoutes=new Set(['iv','oral','inhaled','conditional','procedure','none']);
const nonBlank=x=>typeof x==='string'&&!!x.trim();
export function csValidateDrug487(id,definition){
 if(!nonBlank(id)||!/^[a-z][a-z0-9_]*$/.test(id))throw Error('invalid drug id '+id);
 if(!definition||!nonBlank(definition.classId)||!allowedRoutes.has(definition.route)||
  !allowedModes.has(definition.mechanism)||!Number.isFinite(definition.onsetMin)||
  !Number.isFinite(definition.peakMin)||definition.onsetMin<0||definition.peakMin<definition.onsetMin||
  !Array.isArray(definition.indications)||!Array.isArray(definition.hazards))
  throw Error('incomplete clinical pharmacology for '+id);
 if(definition.mechanism==='custom'){
  if(!definition.response||typeof definition.response!=='object')throw Error('custom effect parameters required for '+id);
  for(const [axis,val] of Object.entries(definition.response)){
   if(!['temp','hr','rr','sys','dia','spo2','renalRisk'].includes(axis)||!Number.isFinite(val)||Math.abs(val)>50)
    throw Error('unsafe/unbounded custom response '+id+'/'+axis);
  }
 }
 return true;
}
export function csCasePharmProfile487(c){
 const traits=c?.pharmacology?.traits??BASE_CASE_PHARMACOLOGY_487[c?.id];
 if(!Array.isArray(traits)||!traits.length||traits.some(t=>!nonBlank(t)))
  throw Error('case '+String(c?.id)+' requires explicit pharmacology.traits');
 const unique=[...new Set(traits)];
 const cfg=c?.pharmacology||{};
 if(cfg.newDrugs&&!Array.isArray(cfg.newDrugs))throw Error('newDrugs must be an array in '+c.id);
 if(cfg.susceptibility&&typeof cfg.susceptibility!=='object')throw Error('invalid susceptibility '+c.id);
 return {id:c.id,traits:unique,susceptibility:cfg.susceptibility||{},
  newDrugs:cfg.newDrugs||[],overrides:cfg.overrides||{}};
}
export function csBuildPharmRegistry487(nativeCatalog,cases){
 if(!Array.isArray(nativeCatalog)||!Array.isArray(cases))throw Error('invalid pharmacology inputs');
 const registry=new Map();
 for(const item of nativeCatalog){
  if(!item?.id||registry.has(item.id))throw Error('duplicate native drug '+item?.id);
  const definition=PHARMA_RULES_487[item.id];
  csValidateDrug487(item.id,definition);
  registry.set(item.id,{...item,pharmacology:{...definition}});
 }
 const profiles=new Map();
 for(const c of cases){
  if(!c?.id||profiles.has(c.id))throw Error('invalid/duplicate case '+c?.id);
  const profile=csCasePharmProfile487(c);
  profiles.set(c.id,profile);
  for(const drug of profile.newDrugs){
   // A new case contributes the full molecule definition and aliases.
   // The same drug then becomes available to ALL existing and future cases.
   if(!drug||!nonBlank(drug.id)||!nonBlank(drug.label)||!Array.isArray(drug.aliases)||
      !drug.aliases.some(nonBlank))throw Error('new case drug needs ID, label and aliases '+c.id);
   csValidateDrug487(drug.id,drug.pharmacology);
   if(registry.has(drug.id)){
    const x=registry.get(drug.id);
    if(JSON.stringify(x.pharmacology)!==JSON.stringify(drug.pharmacology))
     throw Error('conflicting worldwide pharmacology definition '+drug.id+' in '+c.id);
    continue;
   }
   registry.set(drug.id,{id:drug.id,label:drug.label,aliases:drug.aliases,
    effects:{},pharmacology:{...drug.pharmacology}});
  }
 }
 // Every possible drug/case pair resolves, including newly declared drugs.
 for(const [id,item] of registry)for(const [caseId,p] of profiles){
  csValidateDrug487(id,item.pharmacology);
  const custom=p.overrides[id];
  if(custom&&typeof custom!=='object')throw Error('invalid '+caseId+' override '+id);
 }
 return {drugs:[...registry.values()],profiles:[...profiles.values()]};
}
export function csPharmContext487(c,patient,vitals={}){
 const p=csCasePharmProfile487(c);
 const set=new Set(p.traits);
 const measured=vitals||patient?.liveVitals||{};
 const sys=Number(measured.sys??parseInt(String(c?.vitals?.bp||'120'),10));
 const dia=Number(measured.dia??60);
 const map=(sys+2*dia)/3;
 const spo2=Number(measured.spo2??c?.vitals?.spo2??98);
 const vol=Number(patient?.phys?.effectiveVolume);
 const renal=Number(patient?.phys?.renalReserve);
 if(spo2<93)set.add('hypoxemia');
 if(sys<90||map<65)set.add('hypotension');
 if(map<55)set.add('severeShock');
 if(set.has('sepsis')&&map<65)set.add('vasoplegia');
 if(Number.isFinite(vol)&&vol<.68)set.add('hypovolemia');
 if(Number.isFinite(renal)&&renal<.55)set.add('renalRisk');
 if(Number(patient?.therapyTotals?.fluidMl||0)>Number(c?.physiology?.fluidOverloadThresholdMl||2800))
  set.add('overload');
 return {traits:set,profile:p,sys,dia,map,spo2,renal,vol};
}
// A coefficient-based response estimate in VIRTUAL units. Applies to all cases,
// uses patient condition, and never inserts undocumented treatments.
export function csPharmResponse487(id,c,patient,elapsedMin=0,vitals={}){
 const descriptor=PHARMA_RULES_487[id]||
   (c?.pharmacology?.newDrugs||[]).find(d=>d.id===id)?.pharmacology;
 if(!descriptor)return {known:false,offsets:{},warnings:['missing-pharmacology']};
 const ctx=csPharmContext487(c,patient,vitals);
 const t=ctx.traits; const offsets={temp:0,hr:0,rr:0,sys:0,dia:0,spo2:0};
 const onset=Math.max(0,descriptor.onsetMin),peak=Math.max(onset+.001,descriptor.peakMin);
 const phase=elapsedMin<onset?0:Math.min(1,(elapsedMin-onset+.001)/(peak-onset));
 const beneficial=descriptor.indications.some(x=>t.has(x));
 const lowPressure=t.has('hypotension')||t.has('severeShock');
 const renalRisk=t.has('renalRisk');
 const warn=[];
 // Explicitly never use +SpO2 for transfusion: oxygen CONTENT != saturation.
 switch(descriptor.mechanism){
 case 'oxygenation':
  offsets.spo2=t.has('hypoxemia')?Math.min(7,Math.max(0,98-ctx.spo2)):ctx.spo2>=97?0:1;
  break;
 case 'volume':
  if(t.has('hypovolemia')){offsets.sys=8;offsets.dia=4;offsets.hr=-7}
  else if(t.has('overload')||t.has('congestion')){offsets.spo2=-3;offsets.rr=3;warn.push('volume-overload')}
  else {offsets.sys=1;offsets.dia=0.5}
  break;
 case 'albumin':
  if(t.has('pbe')){offsets.sys=4;offsets.dia=2}
  else if(t.has('hypovolemia')){offsets.sys=3;offsets.dia=1}
  else if(t.has('overloadRisk'))warn.push('albumin-overload-risk');
  break;
 case 'pressor':
  if(lowPressure&&t.has('vasoplegia')){offsets.sys=15;offsets.dia=9;offsets.hr=-2}
  else if(lowPressure){offsets.sys=7;offsets.dia=3}
  else {offsets.sys=4;offsets.dia=2;warn.push('pressor-without-shock')}
  if(t.has('mesentericIschemia'))warn.push('mesenteric-perfusion-caution');
  break;
 case 'opioid':
  if(t.has('pain')){offsets.hr=-4;offsets.rr=-1}
  if(lowPressure){offsets.sys-=6;offsets.dia-=3;warn.push('opioid-hypotension')}
  if(t.has('obstruction'))warn.push('opioid-motility-risk');
  break;
 case 'analgesic':
  if(t.has('pain'))offsets.hr=-4;
  break;
 case 'antiemetic':
  if(t.has('obstruction'))warn.push('agent-dependent-obstruction-risk');
  break;
 case 'blood':
  if(t.has('bleed')&&lowPressure){offsets.sys=8;offsets.dia=4;offsets.hr=-4}
  break;
 case 'paracentesis':
  if(t.has('ascites'))offsets.rr=-2;
  break;
 case 'diuretic':
  if(t.has('overload')||t.has('congestion')){offsets.rr=-2;offsets.spo2=1}
  if(lowPressure||t.has('hypovolemia')){offsets.sys-=9;offsets.dia-=5;offsets.hr+=5;warn.push('diuretic-in-shock')}
  if(renalRisk)warn.push('diuretic-renal-caution');
  break;
 case 'betaBlocker':
  offsets.hr=-11;offsets.sys=-7;offsets.dia=-3;
  if(lowPressure)warn.push('beta-blocker-in-shock');
  break;
 case 'custom':
  for(const [k,v] of Object.entries(descriptor.response||{}))if(k in offsets)offsets[k]=v;
  break;
 // Antimicrobials: no immediate BP or SpO2 miracle. Native coverageSets and
 // susceptibility must drive inflammation with delayed time to benefit.
 default:break;
 }
 for(const k of Object.keys(offsets))offsets[k]*=phase;
 return {known:true,id,beneficial,offsets,warnings:warn,phase,mechanism:descriptor.mechanism};
}
