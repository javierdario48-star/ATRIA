// Visual/acoustic presentation only. Clinical authority and chat delivery
// remain untouched. Voices must be local and unobstructed by solid walls
// or closed doors in the ORIGINAL authored hospital collision grid.
export const WARD_SPEECH_RADIUS=96;
export const PATIENT_SPEECH_RADIUS=112;
const finitePose=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function audible(a,b,r,navigation){
 return finitePose(a)&&finitePose(b)&&Number.isFinite(r)&&
  Math.hypot(a.x-b.x,a.y-b.y)<=r&&
  navigation?.soundClear?.(a.x,a.y,b.x,b.y)===true;
}
export function canHearWardDoctor(scene,actorId,selfId,navigation){
 if(!actorId||!scene?.player)return false;
 if(actorId===selfId||actorId==='local-player'||actorId===scene.player.id)return true;
 const other=scene.others?.find(a=>a.id===actorId);
 return audible(scene.player,other,WARD_SPEECH_RADIUS,navigation);
}
export function canHearWardPatient(scene,patientUid,navigation){
 const patient=scene?.patients?.find(p=>p.uid===patientUid&&!p.departed);
 if(!patient||!finitePose(scene?.player)||!finitePose(patient)||!navigation)return false;
 if(Math.hypot(scene.player.x-patient.x,scene.player.y-patient.y)>PATIENT_SPEECH_RADIUS)return false;
 // The patient sprite sits on a blocked bed tile in ATRIA. The reachable
 // approach tile is their voice location for wall occlusion; use the exact
 // patient coordinates as the fallback for synthetic/open-map tests.
 const entrance=Array.isArray(patient.approach)&&patient.approach.length===2?
  navigation.center(...patient.approach):patient;
 return finitePose(entrance)&&navigation.soundClear(scene.player.x,scene.player.y,entrance.x,entrance.y)===true;
}
