import {createClinicalContent} from './clinical-content.js';
import {readCertifiedCaseCatalog} from './certified-case-catalog.js';
import {CLINICAL_POLICY_REGISTRIES} from '../clinical/clinical-policy-registry.js';
const names={map:'hospital',cases:'cases',algorithms:'algorithms',examSegments:'exam-segments',
 therapies:'therapies',defaultDoses:'default-doses',beds:'beds',colors:'colors',assets:'assets',certifiedCatalog:'certified-case-packs'};
export async function loadContent(base=new URL('./',import.meta.url),signal){
 const values=await Promise.all(Object.entries(names).map(async([key,name])=>{
  const response=await fetch(new URL(name+'.json',base),{signal});
  if(!response.ok)throw Error('No se pudo cargar '+name+' ('+response.status+')');
  return [key,await response.json()];
 }));
 const {certifiedCatalog,...content}=Object.fromEntries(values);
 content.assetUrls=Object.fromEntries(Object.entries(content.assets).map(([key,asset])=>[key,new URL(asset.path,base).href]));
 // New V5-only artwork; do not alter canonical 4.8.7 asset manifest hashes.
 content.assetUrls.wardrobe=new URL('assets/player-wardrobe.avif',base).href;
 const catalog=readCertifiedCaseCatalog(certifiedCatalog,{...CLINICAL_POLICY_REGISTRIES,existingCaseIds:content.cases.map(c=>c.id)});
 if(!catalog.ok)throw Error('Catálogo clínico no certificado: '+catalog.errors.join('; '));
 return createClinicalContent(content,{additionalCases:catalog.cases});
}
