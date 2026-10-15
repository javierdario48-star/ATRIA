// Explicit ATRIA 5 Core public API; no legacy global overrides or HTML patches.
export {createRoomAuthority} from './core/room-authority.js';
export {routeWardSpeech} from './core/speech-router.js';
export {createRoomReplica} from './core/replica.js';
export {createNativeClinicalPort} from './adapters/native-clinical-port.js';
export {roomReducer,ROOM_STATES} from '../social/room-state.js';
export {FrameScheduler} from '../app/frame-scheduler.js';
