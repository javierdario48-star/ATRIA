// Isolated early-window ischemic stroke pilot; NEUR-02 extended-window
// thrombectomy remains V1. Reuse the native V1 eligibility and treatment owners.
import {neurologyPack} from './neurology-pack.js';
import {createV2Revision,makeV2Graph} from './v2-revision-template.js';
export const neur01V2ExperimentalPack=createV2Revision(neurologyPack.cases.find(c=>c.id==='NEUR-01'),{
 source:'atria-neurology@1.0.0:NEUR-01',packId:'atria-neurology-neur01-v2-staging',
 // The native ICU receiver declines stable patients. Reserve ICU for a
 // manifested complication/critical state, rather than rewarding a bed request.
 escalationDestinations:['uti'],
 graph:c=>makeV2Graph(c,{
 labels:{encounter:'Déficit focal discapacitante',triage:'Triaje neurológico y glucemia',exam:'Examen neurológico y NIHSS',
  results:'TC sin sangre y glucemia informadas',treated:'Reperfusión IV y plan preventivo documentados',
  complication:'Pérdida de protección de vía aérea',rescue:'Soporte ventilatorio confirmado',receiver:'Consulta Neurología/UTI',
  sala:'Unidad ACV recibe',uti:'Cuidados intensivos reciben'},
 evolutionFamilies:{E0:'déficit focal inicial',E1:'respuesta a reperfusión confirmada sin fingir recuperación focal',
  E2:'progresión sin cuidado eficaz o demora',E3:'deterioro de protección de vía aérea',E4:'iatrogenia y rescate'},
 treatmentFamilies:{T1:{applicable:true,meaning:'monitorización neurológica y tensional'},
  T2:{applicable:true,meaning:'trombólisis IV según evaluación y recibo'},
  T3:{applicable:true,meaning:'soporte de vía aérea si indicado'},
  T4:{applicable:false,reason:'sin procedimiento no quirúrgico específico adicional'},
  T5:{applicable:true,meaning:'reperfusión IV; sin oclusión proximal tratable en este caso'},
  T6:{applicable:false,reason:'sin cirugía indicada'}}
 })});
export const neur01V2Candidate=neur01V2ExperimentalPack.cases[0];
