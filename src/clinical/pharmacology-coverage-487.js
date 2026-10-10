// ATRIA experimental clinical mechanism coverage, independent of rendering.
// A PRESENT catalog entry is not proof of correctly modelled pharmacodynamics.
// This module never gives a dose, writes an administration or alters a patient.
import {PHARMA_RULES_487,csPharmContext487,csPharmResponse487} from './pharmacology-registry-487.js';

const GI_INFECTIONS=new Set(['PERI-PBE-001','PERI-SEC-001','PERI-TER-001','APP-001','CHOLE-001','CHOLANG-001']);
const ANTIBIOTICS=new Set(['ceftriaxone','metronidazole','imipenem','ceftazidime',
 'cefoperazone','cefepime','piptazo','ampicillin','amikacin','gentamicin']);
const ANTIFUNGALS=new Set(['fluconazole','amphotericin']);
// Mechanistic target, NOT a medication indication; clinical policy remains
// individualised and should be reviewed independently of this program.
const MECHANISMS=Object.freeze({
 oxygenation:['hypoxemia'],volume:['hypovolemia','bleed','shock'],
 albumin:['pbe','hypovolemia'],pressor:['vasoplegia','hypotension','shock'],
 opioid:['pain'],analgesic:['pain','fever'],antiemetic:['nausea'],
 acid:['ulcerBleed'],blood:['anemia','bleed'],paracentesis:['ascites'],
 spironolactone:['ascites','congestion'],steroid:['immuneInflammation','selectedRefractoryShock'],
 aza:['immuneMaintenance'],antimicrobial:['infection'],sourceControl:['uncontrolledSource'],
 deprescribe:['unsafeBetaBlocker'],diuretic:['congestion','overload'],
 betaBlocker:['indicatedRateControl'],none:[],custom:[]
});
const unique=a=>[...new Set(a)];
export function csAuditDrugCase487(caseDef,drug,patient=null){
 const id=String(drug?.id||''),c=caseDef||{};
 if(!id||!c.id)throw Error('drug and case IDs required for audit');
 const rule=PHARMA_RULES_487[id]||drug.pharmacology;
 const initial=String(c?.vitals?.bp||'120/75').split('/');
 const vitals={sys:Number(initial[0])||120,dia:Number(initial[1])||75,
  spo2:Number(c?.vitals?.spo2??98),hr:Number(c?.vitals?.hr??90)};
 const observed=patient||{liveVitals:vitals,therapyTotals:{fluidMl:0}};
 if(!rule){
  // Includes the currently unmodelled V19 heparin entry: do not silently
  // promote into a "working" anticoagulant just to make boot go green.
  return {caseId:c.id,id,status:'blocked-unmodelled',mechanism:null,
   targets:[],risks:['unverified-clinical-mechanism'],context:'unsupported',
   mustReview:true};
 }
 const ctx=csPharmContext487(c,observed);
 const traits=ctx.traits,risks=[];
 const add=flag=>risks.push(flag);
 if((id==='furosemide'||id==='espironolactona'||id==='beta_blocker'||id==='morphine')&&
    (traits.has('hypotension')||traits.has('severeShock')||traits.has('hypovolemia')||traits.has('bleed')))
  add('may-worsen-hypoperfusion');
 if((id==='amikacin'||id==='gentamicin'||id==='amphotericin'||id==='cefepime')&&traits.has('renalRisk'))
  add('renal-injury-or-accumulation');
 if(id==='fluid'&&(traits.has('congestion')||traits.has('overload')||traits.has('overloadRisk')))
  add('fluid-overload');
 if(id==='albumin'&&(traits.has('overload')||traits.has('overloadRisk')))
  add('colloid-overload');
 if(id==='morphine'&&traits.has('obstruction'))add('opioid-motility');
 if(id==='antiemetic'&&traits.has('obstruction'))add('agent-specific-obstruction-risk');
 if(id==='beta_blocker'&&traits.has('shock'))add('negative-inotropy-during-shock');
 const mechanism=rule.mechanism;
 let targets=(MECHANISMS[mechanism]||[]).filter(x=>traits.has(x));
 // Real antibacterial coverage requires an actual susceptible regimen.
 // A single broad-spectrum agent is not assumed automatically effective.
 if(mechanism==='antimicrobial'){
  if(!GI_INFECTIONS.has(c.id)||!traits.has('infection'))targets=[];
  else if(ANTIFUNGALS.has(id))targets=['only-if-susceptible-fungal-infection'];
  else if(ANTIBIOTICS.has(id))targets=['only-if-complete-susceptible-antibacterial-regimen'];
 }
 if(id==='oxygen'&&ctx.spo2>=97)targets=[];
 if(mechanism==='custom')targets=rule.indications.filter(x=>traits.has(x));
 let status=targets.length?'conditional-target':'no-demonstrated-target';
 if(risks.length)status=targets.length?'target-with-risks':'risk-without-benefit';
 // No "success" classification: pharmacology is not equivalent to the
 // clinician's diagnosis, consent, drug dose, species susceptibility, etc.
 const projection=csPharmResponse487(id,c,observed,Math.max(1,Number(rule.peakMin||0)+1),
  {},[drug]);
 if(!projection.known)throw Error('registered pharmacology is not evaluable '+id);
 return {caseId:c.id,id,status,mechanism,targets:unique(targets),
  risks:unique([...risks,...projection.warnings]),
  context:traits.has('hypotension')?'hypotensive':ctx.spo2<93?'hypoxemic':'baseline',
  mustReview:mechanism==='custom'||mechanism==='none'||mechanism==='antimicrobial'||
   status!=='no-demonstrated-target',virtualOffsets:projection.offsets};
}
export function csAuditExistingCatalog487(cases,catalog){
 if(!Array.isArray(cases)||!Array.isArray(catalog))throw Error('cases and catalog required');
 const rows=[];
 const ids=new Set(),caseIds=new Set();
 for(const c of cases){if(!c?.id||caseIds.has(c.id))throw Error('duplicate case '+c?.id);caseIds.add(c.id)}
 for(const d of catalog){if(!d?.id||ids.has(d.id))throw Error('duplicate drug '+d?.id);ids.add(d.id)}
 for(const c of cases)for(const d of catalog)rows.push(csAuditDrugCase487(c,d));
 const blocked=rows.filter(x=>x.status==='blocked-unmodelled');
 return {cases:cases.length,entries:catalog.length,pairs:rows.length,
  blockedEntries:unique(blocked.map(x=>x.id)),
  conditional:rows.filter(x=>x.status==='conditional-target').length,
  risks:rows.filter(x=>x.risks.length).length,rows};
}
