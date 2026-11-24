// Third isolated pilot. The V1 policy is already declarative; preserve its
// physiology, treatments, variant facts and surgical handoff semantics.
// No active catalog registration or parallel executor.
import {defineClinicalCase} from '../clinical-case-definition.js';
import {cardiologyPack} from './cardiology-pack.js';
import {card08V2Graph} from './card08-v2-graph.js';
const original=cardiologyPack.cases.find(c=>c.id==='CARD-08');
if(!original)throw Error('CARD-08 V1 source missing');
const candidate=structuredClone(original);
candidate.clinicalRevision='v2-candidate';
candidate.revisionSource='atria-cardiology@1.0.0:CARD-08';
candidate.clinicalGraph=card08V2Graph;
// Separate complication lottery from identity/history/personality draws.
candidate.variation.independentComplicationDraws=true;
export const card08V2Candidate=defineClinicalCase(candidate);
export const card08V2ExperimentalPack=Object.freeze({
 schemaVersion:1,packId:'atria-cardiology-card08-v2-staging',
 version:'2.0.0-candidate.1',cases:[card08V2Candidate]
});
