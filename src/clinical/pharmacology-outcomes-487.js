// Case-aware, virtual NON-vital pharmacology outcomes for ATRIA.
// These are relative game-state indices, not patient lab values or prescriptions.
import {csCasePharmProfile487} from './pharmacology-registry-487.js';
export const EXISTING_ABDOMINAL_COVERAGE_487={
 'APP-001':[['ceftriaxone','metronidazole'],['piptazo'],['imipenem'],['cefepime','metronidazole']],
 'CHOLE-001':[['ceftriaxone','metronidazole'],['piptazo'],['imipenem'],['cefepime','metronidazole']]
};
export function csPharmOutcomes487(c,patient,globalDrugs=[]){
 const p=csCasePharmProfile487(c),traits=new Set(p.traits),now=Number(patient?.gameMinute||0);
 const active=patient?.monitorTherapies;
 const administrations=patient?.administrationLog||[];
 const has=id=>active?.has?.(id)&&administrations.some(x=>x?.id===id);
 const get=id=>active?.get?.(id);
 const rule=id=>globalDrugs.find(d=>d.id===id)?.pharmacology;
 const strength=id=>{
  if(!has(id))return 0;
  const drug=get(id),info=rule(id);
  if(!info)return 0;
  const delay=Math.max(0,now-Number(drug.startedAt??now));
  const onset=Number(info.onsetMin||0),peak=Math.max(onset+.01,Number(info.peakMin||onset+1));
  return delay<onset?0:Math.min(1,(delay-onset+.001)/(peak-onset));
 };
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const metrics={
  // Relative disease-specific game indices; NEVER equate to a measured lab.
  painIndex:traits.has('pain')?1:0,
  nauseaIndex:traits.has('nausea')?1:0,
  ascitesIndex:traits.has('ascites')?1:0,
  immuneInflammationIndex:traits.has('immuneInflammation')?1:0,
  infectionBurdenIndex:traits.has('infection')?1:0,
  acidRiskIndex:traits.has('ulcerBleed')?1:0,
  renalInjuryIndex:0,
  anemiaHbEquivalentGain:0,
  fluidOverloadIndex:traits.has('congestion')?1:0,
  sourceControlled:patient?.phys?.sourceControlled===true,
  coverageComplete:false,
  noActiveTherapy:!active?.size
 };
 if(has('morphine'))metrics.painIndex=clamp(metrics.painIndex-.65*strength('morphine'));
 if(has('analgesia'))metrics.painIndex=clamp(metrics.painIndex-.50*strength('analgesia'));
 if(has('antiemetic'))metrics.nauseaIndex=clamp(metrics.nauseaIndex-.60*strength('antiemetic'));
 if(has('ppi'))metrics.acidRiskIndex=clamp(metrics.acidRiskIndex-.45*strength('ppi'));
 if(has('paracentesis_ter'))metrics.ascitesIndex=clamp(metrics.ascitesIndex-.70*strength('paracentesis_ter'));
 if(has('espironolactona'))metrics.ascitesIndex=clamp(metrics.ascitesIndex-.22*strength('espironolactona'));
 if(has('furosemide')&&traits.has('congestion'))
  metrics.fluidOverloadIndex=clamp(metrics.fluidOverloadIndex-.35*strength('furosemide'));
 if(has('steroid'))metrics.immuneInflammationIndex=clamp(
  metrics.immuneInflammationIndex-.43*strength('steroid'));
 if(has('aza'))metrics.immuneInflammationIndex=clamp(
  metrics.immuneInflammationIndex-.25*strength('aza'));
 if(has('transfusion')&&traits.has('anemia')){
  const count=administrations.filter(x=>x?.id==='transfusion').length;
  metrics.anemiaHbEquivalentGain=Math.min(3,count)*strength('transfusion');
 }
 const ml=Number(patient?.therapyTotals?.fluidMl||0),threshold=Number(
  c?.physiology?.fluidOverloadThresholdMl??(traits.has('ascites')?1800:2800));
 if(ml>threshold)metrics.fluidOverloadIndex=clamp((ml-threshold)/1500);
 const nephro=administrations.filter(x=>['amikacin','gentamicin','amphotericin'].includes(x?.id));
 if(nephro.length){
  const vulnerable=traits.has('renalRisk')||Number(patient?.phys?.renalReserve??1)<.55;
  metrics.renalInjuryIndex=clamp(nephro.length*(vulnerable?.20:.06),0,1);
 }
 // Antibiotics cannot clear a presumed infection unless the active drugs
 // satisfy a case-specific regimen. No inferred pathogen susceptibility.
 const regimens=c?.pharmacology?.coverageSets||c?.physiology?.coverageSets||
  EXISTING_ABDOMINAL_COVERAGE_487[c?.id]||[];
 if(traits.has('infection')&&regimens.length){
  const matched=regimens.find(set=>Array.isArray(set)&&set.length&&set.every(has));
  if(matched){
   metrics.coverageComplete=true;
   const slowest=Math.min(...matched.map(strength));
   const uncontrolled=traits.has('uncontrolledSource')&&!metrics.sourceControlled;
   metrics.infectionBurdenIndex=clamp(1-slowest*(uncontrolled?.28:.55));
  }
 }
 return metrics;
}
