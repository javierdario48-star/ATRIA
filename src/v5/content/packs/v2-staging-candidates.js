// Test-only revision inventory; never imported by the active catalog.
import {resp01V2Candidate} from './respiratory-v2-candidate.js';
import {varixV2Candidate} from './varix-v2-candidate.js';
import {card08V2Candidate} from './card08-v2-candidate.js';
import {neur01V2Candidate} from './neur01-v2-candidate.js';
// Frozen order for historical campaign reproduction; new candidates append.
export const campaignV1Candidates=Object.freeze([resp01V2Candidate,varixV2Candidate,card08V2Candidate]);
export const stagedV2Candidates=Object.freeze([...campaignV1Candidates,neur01V2Candidate]);
