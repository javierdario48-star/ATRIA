// Isolated V2; preserve all native V1 physiology, handoff and seeded identity.
import {cardiologyPack} from './cardiology-pack.js';
import {card08V2Graph} from './card08-v2-graph.js';
import {createV2Revision} from './v2-revision-template.js';
export const card08V2ExperimentalPack=createV2Revision(cardiologyPack.cases.find(c=>c.id==='CARD-08'),{
 source:'atria-cardiology@1.0.0:CARD-08',packId:'atria-cardiology-card08-v2-staging',graph:card08V2Graph,
 historyAliases:{pmh:['hipertension','presion alta','tension alta']}
});
export const card08V2Candidate=card08V2ExperimentalPack.cases[0];
