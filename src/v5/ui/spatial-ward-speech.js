// Presentation only: short-range ward speech. No clinical or ownership writes.
// The canonical bedside distance comes from the same spatial interaction policy.
import {PATIENT_RANGE} from '../engine/interactions.js';
export const WARD_SPEECH_RADIUS=180;
const finitePose=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const near=(a,b,r)=>finitePose(a)&&finitePose(b)&&Math.hypot(a.x-b.x,a.y-b.y)<=r;
export function canHearWardDoctor(scene,actorId,selfId){
 if(!actorId)return false;
 if(actorId===selfId||actorId==='local-player'||actorId===scene?.player?.id)return true;
 const other=scene?.others?.find(a=>a.id===actorId);
 return near(scene?.player,other,WARD_SPEECH_RADIUS);
}
export function canHearWardPatient(scene,patientUid){
 const patient=scene?.patients?.find(p=>p.uid===patientUid&&!p.departed);
 return near(scene?.player,patient,PATIENT_RANGE);
}
