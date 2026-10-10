// Audit the CURRENT boot catalog against the declared global clinical rules.
// A GREEN structural matrix does NOT certify pharmacological correctness.
import {PHARMA_RULES_487,csCasePharmProfile487} from './pharmacology-registry-487.js';
import {SHADOW_PILOT_DRUGS_487} from './pharmacology-shadow-487.js';
const PILOT_CASES=new Set(['PERI-SEC-001','HDA-001','CIRR-001']);
export function csPharmCoverageAudit487(cases,catalog){
 if(!Array.isArray(cases)||!Array.isArray(catalog))throw Error('invalid audit inputs');
 const ids=new Set(),errors=[];
 for(const drug of catalog){
  if(!drug?.id||ids.has(drug.id))errors.push('duplicate-or-missing-drug-id:'+String(drug?.id));
  ids.add(drug?.id);
 }
 const caseIds=new Set();
 for(const c of cases){
  if(!c?.id||caseIds.has(c.id))errors.push('duplicate-or-missing-case-id:'+String(c?.id));
  caseIds.add(c?.id);
 }
 const entries=[],unknown=new Set(),counts={
  pilotTested:0,pilotOnly:0,contractOnly:0,missingRules:0
 };
 for(const c of cases){
  const profile=csCasePharmProfile487(c);
  for(const med of catalog){
   const def=PHARMA_RULES_487[med.id]||med.pharmacology;
   let status='contract-only';
   if(!def){status='missing-rules';unknown.add(med.id);counts.missingRules++;}
   else if(SHADOW_PILOT_DRUGS_487[med.id]){
    status=PILOT_CASES.has(c.id)?'pilot-tested':'pilot-only';
    if(status==='pilot-tested')counts.pilotTested++;
    else counts.pilotOnly++;
   }else counts.contractOnly++;
   entries.push({caseId:c.id,drugId:med.id,mechanism:def?.mechanism||null,
    status,hasCaseProfile:profile.traits.length>0});
  }
 }
 return {
  cases:cases.length,drugs:catalog.length,pairs:entries.length,
  errors,counts,missingRules:[...unknown].sort(),entries,
  deployable:errors.length===0&&counts.missingRules===0
 };
}
