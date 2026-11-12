// One composition path for the browser, durable server and certification bots.
// Only loadContent/server bootstrap may supply a validated committed catalog;
// staged definitions are passed explicitly by the offline certification runner.
import {CLINICAL_TREATMENTS} from './clinical-treatment-definitions.js';
import {withPatientVariation,withPreviousPatientVariation} from './legacy-patient-variation.js';

const previousContents=new WeakMap();
export function createClinicalContent(base,{additionalCases=[]}={}){
 const content=composeClinicalContent(base,additionalCases,withPatientVariation);
 // Retain the original catalog, the expanded unvaried revisions, and the
 // exact varied revisions from before specialty packs and the PMH correction.
 previousContents.set(content,[base,composeClinicalContent(base,[],null),
  ...(additionalCases.length?[composeClinicalContent(base,additionalCases,null)]:[]),
  composeClinicalContent(base,additionalCases,withPreviousPatientVariation),
  ...(additionalCases.length?[composeClinicalContent(base,[],withPreviousPatientVariation)]:[])]);
 return content;
}
function composeClinicalContent(base,additionalCases,variation){
 if(!base||!Array.isArray(base.cases)||!Array.isArray(base.therapies)||!Array.isArray(additionalCases))throw Error('clinical content required');
 const ids=new Set(base.cases.map(c=>c.id));
 for(const c of additionalCases){if(!c?.id||ids.has(c.id))throw Error('duplicate clinical content '+c?.id);ids.add(c.id);}
 const therapies=new Map(base.therapies.map(t=>[t.id,t]));
 for(const definition of Object.values(CLINICAL_TREATMENTS)){
  if(therapies.has(definition.id))throw Error('duplicate clinical treatment '+definition.id);
  therapies.set(definition.id,definition);
 }
 const cases=[...base.cases,...additionalCases.map(c=>({...c,interventions:c.interventions.map(i=>{
  const definition=therapies.get(i.id);return definition?{...i,label:definition.label,aliases:[...new Set([i.id,...definition.aliases,...i.aliases])]}:i;
 })}))];
 return {...base,cases:variation?cases.map(variation):cases,therapies:[...therapies.values()],defaultDoses:{...base.defaultDoses,
  ...Object.fromEntries(Object.values(CLINICAL_TREATMENTS).map(t=>[t.id,t.dose]))}};
}
// Old guards retain their original content/selection/reward contract. Only an
// exact hash of a source-owned previous revision may be restored as that revision.
export const previousClinicalContents=content=>previousContents.get(content)||[];
