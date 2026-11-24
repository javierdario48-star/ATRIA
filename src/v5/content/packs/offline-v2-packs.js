// Explicit offline lab only. Never imported by the active server catalog.
import {resp01V2ExperimentalPack} from './respiratory-v2-candidate.js';
import {varixV2ExperimentalPack} from './varix-v2-candidate.js';
import {card08V2ExperimentalPack} from './card08-v2-candidate.js';
import {compileClinicalCasePack} from '../compile-clinical-case-pack.js';
import {CLINICAL_POLICY_REGISTRIES} from '../../clinical/clinical-policy-registry.js';
export const offlineV2Packs=Object.freeze([resp01V2ExperimentalPack,varixV2ExperimentalPack,card08V2ExperimentalPack]);
export function stageOfflineV2Packs(baseCases,additionalCases,packs=offlineV2Packs){
 const original=[...baseCases,...additionalCases], replacements=new Map();
 for(const pack of packs){
  const ids=pack.cases.map(c=>c.id);
  if(ids.some(id=>!original.some(c=>c.id===id)||replacements.has(id)))throw Error('Unknown/duplicate offline revision');
  const compiled=compileClinicalCasePack(pack,{...CLINICAL_POLICY_REGISTRIES,
   existingCaseIds:original.filter(c=>!ids.includes(c.id)).map(c=>c.id)});
  if(!compiled.ok)throw Error(compiled.errors.join('; '));
  for(const c of compiled.cases){
   if(c.clinicalRevision!=='v2-candidate'||!c.clinicalGraph)throw Error('Missing explicit revision');
   replacements.set(c.id,c);
  }
 }
 const replace=c=>replacements.get(c.id)||c;
 const result={baseCases:baseCases.map(replace),additionalCases:additionalCases.map(replace)};
 const combined=[...result.baseCases,...result.additionalCases];
 if(combined.length!==original.length||new Set(combined.map(c=>c.id)).size!==original.length)throw Error('Offline revision identity drift');
 return result;
}
