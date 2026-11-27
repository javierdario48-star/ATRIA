// Reusable V2 authoring helper. No clinical execution, catalog activation,
// clinical permission, scoring, clock, or physiology.
import {defineClinicalCase} from '../clinical-case-definition.js';
import {withPatientVariation} from '../legacy-patient-variation.js';
import {validateClinicalGraph} from '../../clinical/clinical-graph-observer.js';
const destinations=['alta','observacion','sala','uti','procedimiento','quirofano'];
const nodes=[['encounter','Ingreso'],['triage','Triaje'],['history','Anamnesis'],['exam','Exploración'],
 ['hypothesis','Hipótesis'],['studies','Estudios pendientes'],['results','Resultados'],['nursing','Enfermería pendiente'],
 ['treated','Tratamiento confirmado'],['evolution','Evolución temporal'],['complication','Complicación'],
 ['iatrogenia','Iatrogenia'],['rescue','Rescate confirmado'],['reassessment','Reevaluación'],['mentor','Dr. Vega'],
 ['unsafe','Decisión insegura'],['recoverable','Atención recuperable'],['receiver','Recepción solicitada'],
 ['accepted','Servicio acepta'],['rejected','Servicio rechaza'],['unsupported','Destino no indicado'],
 ['death','Muerte'],['recovery','Recuperación de sesión'],['reward','Cierre y XP']];
const edges=[['triage','encounter','triage','measured'],['history','encounter','history','history'],
 ['examination','encounter','exam','examined'],['hypothesis','encounter','hypothesis','hypothesis'],
 ['study-request','hypothesis','studies','ordered'],['study-result','studies','results','results'],
 ['nursing-pending','encounter','nursing','nursing'],['administration','nursing','treated','administered'],
 ['time','encounter','evolution','elapsed'],['deterioration','evolution','complication','complication'],
 ['iatrogenia','treated','iatrogenia','iatrogenia'],['rescue','complication','rescue','rescued'],
 ['reevaluation','evolution','reassessment','reassessed'],['vega','encounter','mentor','mentor'],
 ['unsafe-alta','encounter','unsafe','unsafeAlta'],['unsafe-observation','encounter','unsafe','unsafeObservation'],
 ['unsafe-recoverable','unsafe','recoverable','recoverable'],['receiver-request','reassessment','receiver','requestedReceiver'],
 ['receiver-accepted','receiver','accepted','acceptedReceiver'],['receiver-rejected','receiver','rejected','rejectedReceiver'],
 ['unsupported-destination','encounter','unsupported','unsupportedDestination'],['death','evolution','death','death'],
 ['checkpoint','encounter','recovery','recoveredCheckpoint'],['xp-once','encounter','reward','reward']];
const terminalIds={alta:'close-alta',observacion:'close-observation',sala:'close-ward',uti:'close-uti',procedimiento:'close-procedure',quirofano:'close-surgery'};
export function makeV2Graph(c,{labels={},evolutionFamilies,treatmentFamilies}){
 const allowed=c.clinicalPolicy.closure.destinations;
 if(!allowed.length||allowed.some(d=>!destinations.includes(d)))throw Error('invalid V2 destinations');
 if(!['E0','E1','E2','E3','E4'].every(k=>typeof evolutionFamilies?.[k]==='string')||
  !['T1','T2','T3','T4','T5','T6'].every(k=>typeof treatmentFamilies?.[k]?.applicable==='boolean'))throw Error('missing V2 families');
 return {schemaVersion:1,id:c.id+'@v2:clinical-graph:1',semantics:'observational; independent edges; native executor authoritative',
  evolutionFamilies,treatmentFamilies,destinations:Object.fromEntries(destinations.map(d=>[d,allowed.includes(d)?'native-safety-and-closure':(['alta','observacion'].includes(d)?'unsafe':'unsupported')])),
  nodes:[...nodes,...allowed.map(d=>[d,d])].map(([id,label])=>({id,label:labels[id]||label})),
  edges:[...edges,...allowed.map(d=>[terminalIds[d],c.clinicalPolicy.closure.consult?.[d]?.length?'accepted':'reassessment',d,d])].map(([id,from,to,when])=>({id,from,to,when}))};
}
export function createV2Revision(original,{source,packId,graph,historyAliases={}}){
 if(!original||!source||!packId)throw Error('explicit V1 revision identity required');
 const candidate=structuredClone(withPatientVariation(original));
 candidate.clinicalRevision='v2-candidate';candidate.revisionSource=source;
 candidate.variation.independentComplicationDraws=true;
 for(const [id,aliases] of Object.entries(historyAliases)){
  const intent=candidate.intents.find(x=>x.id===id);
  if(!intent||!Array.isArray(aliases)||aliases.some(x=>typeof x!=='string'||!x.trim()))throw Error('invalid authored history alias '+id);
  intent.keys=[...new Set([...intent.keys,...aliases])];
 }
 candidate.clinicalGraph=typeof graph==='function'?graph(candidate):structuredClone(graph);
 const c=defineClinicalCase(candidate),errors=validateClinicalGraph(c.clinicalGraph,c);
 if(errors.length)throw Error(errors.join('; '));
 return Object.freeze({schemaVersion:1,packId,version:'2.0.0-candidate.1',cases:[Object.freeze(c)]});
}
