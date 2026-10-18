import {createWorld} from '../app/world.js';
import {createGuardSession} from './guard-session.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';

export const CLINICAL_RUNTIME_VERSION='atria-guard-runtime-1';
const STEP=1/60;
const clone=x=>structuredClone(x);
export async function clinicalContentHash(content){
 const bytes=new TextEncoder().encode(JSON.stringify(content));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
/** Headless composition of the EXISTING world, nursing, clock and native care.
 * No medical calculations or timers live here. A durable authority supplies
 * authenticated identity and wall time; speculative results stay private. */
export async function createGuardRuntime({content,roomId,caseId,members,hostId,nowMs,checkpoint=null}){
 const contentHash=await clinicalContentHash(content);
 if(checkpoint){
  if(checkpoint.schemaVersion!==1||checkpoint.modelVersion!==CLINICAL_RUNTIME_VERSION||checkpoint.contentHash!==contentHash||checkpoint.roomId!==roomId)
   throw Error('incompatible runtime checkpoint');
  ({caseId,members,hostId}=clone(checkpoint));
 }
 if(!Number.isSafeInteger(nowMs)||nowMs<0||!Array.isArray(members)||members.length<2||members.length>4||new Set(members.map(x=>x.id)).size!==members.length)throw Error('invalid clinical runtime');
 if(!Object.hasOwn(CLINICAL_EXECUTORS,caseId))throw Object.assign(Error('clinical case is not migrated'),{code:'invalid'});
 const host=members.find(x=>x.id===hostId);if(!host)throw Error('runtime host not in roster');
 const world=createWorld(content,{id:hostId,name:host.name,scrubColor:'navy'},checkpoint?.world);
 if(!checkpoint)world.enterGuard({mode:'coop',caseId,patientUid:roomId+':patient',members});
 const patient=world.snapshot().patients[0];
 const session=createGuardSession({roomId,mode:'coop',actorId:hostId,actorName:host.name,members,patient,content,
  checkpoint:checkpoint?.session,authenticate:actorId=>members.some(x=>x.id===actorId)?{id:actorId,roomId}:null,
  resolveContext:({actorId,targetPatientUid})=>({patientUid:world.patientInRangeFor(actorId,targetPatientUid||patient.uid)}),
  nursing:{enqueue:t=>world.enqueueNurseJourney(t),takeArrivals:()=>world.takeNurseArrivals(),accept:r=>world.acceptNurseClinicalResult(r)}});
 // Integer quanta avoid repeatedly adding 16.666... to a ~1.8e12 epoch.
 // 60 quanta per real millisecond; one original 1/60-second step = 1000.
 let lastWallMs=checkpoint?.lastWallMs??nowMs,pendingQuanta=checkpoint?.pendingQuanta??0;
 if(!Number.isSafeInteger(lastWallMs)||lastWallMs<0||!Number.isSafeInteger(pendingQuanta)||pendingQuanta<0)throw Error('invalid runtime checkpoint clock');
 let typingUntilMs=checkpoint?.typingUntilMs??0;
 const claims=new Map(clone(checkpoint?.claims??[])),deliveries=new Map(clone(checkpoint?.deliveries??[]));
 function awardMembers(){const receipt=session.read().patient.closure;
  if(receipt?.closed)for(const member of members)if(!claims.has(member.id))claims.set(member.id,{...clone(receipt),actorId:member.id});
 }
 return Object.freeze({
  /** Catch up bounded work WITHOUT discarding elapsed time. A caller must
   * commit intermediate checkpoints and retry before admitting new orders. */
  async advanceTo(targetMs,{maxSteps=3600}={}){
   if(!Number.isSafeInteger(targetMs)||targetMs<lastWallMs||!Number.isSafeInteger(maxSteps)||maxSteps<1)throw Error('invalid recovery wall clock');
   pendingQuanta+=(targetMs-lastWallMs)*60;lastWallMs=targetMs;
   if(!Number.isSafeInteger(pendingQuanta))throw Error('recovery interval outside supported clock');
   let steps=0;
   while(pendingQuanta>=1000&&steps<maxSteps){
    pendingQuanta-=1000;
    const simulatedAtMs=lastWallMs-pendingQuanta/60;
    world.step(STEP);session.finishNurseArrivals();session.advance(STEP,{typing:simulatedAtMs<typingUntilMs});steps++;
    // Drain the original serial completion lane regularly, not an unbounded
    // queue of callbacks after minutes of offline catch-up.
    if(steps%60===0)await session.flush();
   }
   const recovering=pendingQuanta>=1000;
   await session.flush();awardMembers();return {recovering,steps,lastWallMs};
  },
  async post(actorId,envelope){
   if(!members.some(x=>x.id===actorId))throw Error('not a clinical member');
   const ack=await session.post(envelope,actorId);await session.flush();awardMembers();return ack;
  },
  motion(actorId,target){
   if(!members.some(x=>x.id===actorId)||!Array.isArray(target)||target.length!==2||!target.every(Number.isFinite))return false;
   return actorId===hostId?world.target(...target):world.targetRemote(actorId,...target);
  },
  // Preserve the legacy host keyboard domain with finite expiry. A vanished
  // browser cannot leave the room permanently at the typing rate.
  typing(actorId,active,atMs){if(actorId===hostId)typingUntilMs=active?atMs+5000:0;},
  confirm(actorId,revision,outcomeId){
   if(!members.some(x=>x.id===actorId)||!Number.isSafeInteger(revision)||revision<0||revision>session.read().room.revision)throw Error('invalid delivery confirmation');
   const prior=deliveries.get(actorId);if(!prior||revision>=prior.revision)deliveries.set(actorId,{revision,outcomeId:outcomeId??null});
  },
  view(){const s=world.snapshot();return clone({clinical:session.read(),catalog:session.catalog(),
   spatial:{nurses:s.nurses,doctors:[{...s.player,id:hostId,kind:'doctor'},...s.others]},claims:[...claims],deliveries:[...deliveries]});},
  async checkpoint(){await session.flush();return clone({schemaVersion:1,modelVersion:CLINICAL_RUNTIME_VERSION,contentHash,roomId,caseId,members,hostId,
   lastWallMs,pendingQuanta,typingUntilMs,claims:[...claims],deliveries:[...deliveries],world:world.checkpoint(),session:await session.checkpoint()});},
  dispose(){session.dispose();world.enterLobby();}
 });
}
