import {createWorld} from '../app/world.js';
import {createGuardSession} from './guard-session.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {createShiftFlow,receptionAcuity} from './shift-flow.js';
import {outcomeId} from '../social/cooperative-lifecycle.js';

export const CLINICAL_RUNTIME_VERSION='atria-guard-runtime-1';
const STEP=1/60;
const clone=x=>structuredClone(x);
export async function clinicalContentHash(content){
 const bytes=new TextEncoder().encode(JSON.stringify(content));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
/** One world, nurse dispatcher and shift clock; one original native clinical
 * session per patient. Only the existing durable CAS owner can mutate them. */
export async function createGuardRuntime({content,roomId,caseId,members,hostId,mode='coop',nowMs,checkpoint=null}){
 const contentHash=await clinicalContentHash(content);
 if(checkpoint){
  if(checkpoint.schemaVersion!==1||checkpoint.modelVersion!==CLINICAL_RUNTIME_VERSION||
    checkpoint.contentHash!==contentHash||checkpoint.roomId!==roomId)throw Error('incompatible runtime checkpoint');
  ({caseId,members,hostId,mode='coop'}=clone(checkpoint));
 }
 if(!['coop','competitive'].includes(mode)||!Number.isSafeInteger(nowMs)||nowMs<0||
   !Array.isArray(members)||members.length<2||members.length>4||
   new Set(members.map(x=>x.id)).size!==members.length)throw Error('invalid multiplayer clinical runtime');
 if(!Object.hasOwn(CLINICAL_EXECUTORS,caseId))throw Object.assign(Error('clinical case is not migrated'),{code:'invalid'});
 const host=members.find(m=>m.id===hostId);if(!host)throw Error('runtime host not in roster');
 const world=createWorld(content,{id:hostId,name:host.name,scrubColor:'navy'},checkpoint?.world);
 if(!checkpoint)world.enterGuard({mode,caseId,patientUid:roomId+':patient',members});
 const shift=createShiftFlow({content,mode,firstCaseId:caseId,roomId,snapshot:checkpoint?.shift});
 const sessions=new Map(),focused=new Map(clone(checkpoint?.focused??[]));
 const claims=new Map(clone(checkpoint?.claims??[])),deliveries=new Map(clone(checkpoint?.deliveries??[])),
  motionReceipts=new Map(clone(checkpoint?.motionReceipts??[]));
 let lastWallMs=checkpoint?.lastWallMs??nowMs,pendingQuanta=checkpoint?.pendingQuanta??0,
  typingUntilMs=checkpoint?.typingUntilMs??0;
 if(!Number.isSafeInteger(lastWallMs)||lastWallMs<0||!Number.isSafeInteger(pendingQuanta)||pendingQuanta<0)
  throw Error('invalid runtime checkpoint clock');
 const savedSessions=new Map(clone(checkpoint?.sessions??[]));
 if(checkpoint?.session)savedSessions.set(roomId+':patient',checkpoint.session);
 function makeSession(r){
  if(sessions.has(r.uid))return sessions.get(r.uid);
  if(!world.snapshot().patients.some(p=>p.uid===r.uid)&&!world.addPatient({uid:r.uid,caseId:r.caseId,bedId:r.bedId}))
   throw Error('bed placement failed');
  const patient=world.snapshot().patients.find(p=>p.uid===r.uid);
  const session=createGuardSession({roomId,mode:'coop',actorId:hostId,actorName:host.name,members,patient,content,
   checkpoint:savedSessions.get(r.uid)||null,
   authenticate:id=>members.some(m=>m.id===id)?{id,roomId}:null,
   resolveContext:({actorId,targetPatientUid})=>({patientUid:world.patientInRangeFor(actorId,targetPatientUid||r.uid)}),
   nursing:{enqueue:t=>world.enqueueNurseJourney(t),
    takeArrivals:()=>world.takeNurseArrivals(r.uid),accept:v=>world.acceptNurseClinicalResult(v)}});
  sessions.set(r.uid,session);return session;
 }
 if(!checkpoint?.shift){
  shift.advance(0);
  if(mode==='competitive'&&checkpoint?.ownerId)shift.owner(roomId+':patient',checkpoint.ownerId);
 }else if(!shift.records().length)throw Error('empty shift checkpoint');
 for(const r of shift.records())makeSession(r);
 const firstUid=shift.records()[0].uid;
 const preferred=id=>focused.get(id)||firstUid;
 const activeSession=id=>sessions.get(preferred(id))||sessions.get(firstUid);
 function claimPatient(actorId,uid){
  const r=shift.record(uid);
  if(!members.some(m=>m.id===actorId)||!r||r.closed||shift.ended())return false;
  if(!world.patientInRangeFor(actorId,uid))return false;
  focused.set(actorId,uid);
  if(mode==='competitive'){
   if(r.ownerId)return r.ownerId===actorId;
   return shift.owner(uid,actorId);
  }
  return true;
 }
 function awardMembers(){
  for(const r of shift.records()){
   const receipt=sessions.get(r.uid)?.read().patient.closure;
   if(!receipt?.closed)continue;
   shift.close(r.uid,r.ownerId,receipt.destination);
   world.departPatient(r.uid);
   for(const m of members){
    if(mode==='competitive'&&m.id!==r.ownerId)continue;
    const key=r.index===0?m.id:m.id+':'+r.index;
    if(!claims.has(key))claims.set(key,{...clone(receipt),actorId:m.id});
   }
  }
 }
 async function flush(){for(const s of sessions.values())await s.flush();}
 function clinicalView(actorId){
  const state=activeSession(actorId).read(),rows=shift.records();
  const items=rows.map(r=>{
   const p=sessions.get(r.uid)?.read().patient,c=content.cases.find(x=>x.id===r.caseId);
   const triage=receptionAcuity({caseData:c,patient:p,waitingSeconds:r.ownerId?0:Math.max(0,shift.elapsed()-r.arrivalAt)});
   return {...r,triage,closed:!!p?.caseEnded,patientDied:!!p?.patientDied,ownerId:r.ownerId||null,
    score:p?.closure?.quality?.score??null};
  });
  const outcomes=items.filter(r=>r.closed||r.patientDied).map(r=>{
   const p=sessions.get(r.uid).read().patient;
   return {patientUid:r.uid,ownerId:r.ownerId,closed:!!p.closure?.closed,
    survived:!p.patientDied,score:p.closure?.quality?.score??0,
    xp:p.closure?.xp??0,points:p.closure?.quality?.score??0};
  });
  state.shift={mode,elapsedSeconds:shift.elapsed(),remainingSeconds:shift.remaining(),ended:shift.ended(),
   focusPatientUid:state.patient.uid,patients:items,outcomes};
  if(mode==='competitive')state.competition={mode,ownerId:items.find(r=>r.uid===state.patient.uid)?.ownerId||null,
   patientUid:state.patient.uid,outcomes};
  return state;
 }
 return Object.freeze({
  async advanceTo(targetMs,{maxSteps=3600}={}){
   if(!Number.isSafeInteger(targetMs)||targetMs<lastWallMs||!Number.isSafeInteger(maxSteps)||maxSteps<1)
    throw Error('invalid recovery wall clock');
   pendingQuanta+=(targetMs-lastWallMs)*60;lastWallMs=targetMs;
   if(!Number.isSafeInteger(pendingQuanta))throw Error('recovery interval outside supported clock');
   let steps=0;
   while(pendingQuanta>=1000&&steps<maxSteps){
    pendingQuanta-=1000;
    const atMs=lastWallMs-pendingQuanta/60;
    if(!shift.ended()){
     world.step(STEP);
     for(const session of sessions.values()){session.finishNurseArrivals();session.advance(STEP,{typing:atMs<typingUntilMs});}
     for(const r of shift.advance(STEP))makeSession(r);
    }
    steps++;
    if(steps%60===0)await flush();
   }
   await flush();awardMembers();return {recovering:pendingQuanta>=1000,steps,lastWallMs};
  },
  claim:claimPatient,
  async post(actorId,envelope){
   if(!members.some(m=>m.id===actorId))throw Error('not a clinical member');
   const uid=preferred(actorId),record=shift.record(uid);
   if(envelope.targetPatientUid&&envelope.targetPatientUid!==uid)
    return {roomId,commandId:envelope.id,status:'rejected',reason:'patient-selection-changed'};
   if(shift.ended())return {roomId,commandId:envelope.id,status:'rejected',reason:'shift-ended'};
   if(!record)return {roomId,commandId:envelope.id,status:'rejected',reason:'patient-not-active'};
   if(mode==='competitive'){
    if(record.ownerId&&record.ownerId!==actorId)
     return {roomId,commandId:envelope.id,status:'rejected',reason:'other-player-owns-patient'};
    if(!record.ownerId&&!claimPatient(actorId,uid))
     return {roomId,commandId:envelope.id,status:'rejected',reason:'approach-patient-to-claim'};
   }
   const session=activeSession(actorId),ack=await session.post({...envelope,targetPatientUid:uid},actorId);
   await session.flush();awardMembers();return ack;
  },
  motion(actorId,target,sequence=null){
   if(!members.some(m=>m.id===actorId)||!Array.isArray(target)||target.length!==2||!target.every(Number.isFinite))return false;
   if(sequence!==null&&(!Number.isSafeInteger(sequence)||sequence<1||sequence>1e9))return false;
   if(sequence!==null&&sequence<=(motionReceipts.get(actorId)??0))return true;
   const ok=actorId===hostId?world.target(...target):world.targetRemote(actorId,...target);
   if(ok&&sequence!==null)motionReceipts.set(actorId,sequence);
   return ok;
  },
  typing(actorId,active,atMs){if(actorId===hostId)typingUntilMs=active?atMs+5000:0;},
  confirm(actorId,revision,eventId){
   const state=activeSession(actorId).read();
   if(!members.some(m=>m.id===actorId)||!Number.isSafeInteger(revision)||revision<0||
    revision>state.room.revision||eventId!=null&&eventId!==outcomeId(state.patient))return false;
   const prior=deliveries.get(actorId);
   deliveries.set(actorId,{revision:Math.max(revision,prior?.revision??0),outcomeId:eventId??prior?.outcomeId??null});
   return true;
  },
  view(actorId=hostId){
   const scene=world.snapshot(),session=activeSession(actorId);
   return clone({clinical:clinicalView(actorId),catalog:session.catalog(),
    spatial:{nurses:scene.nurses,doctors:[{...scene.player,id:hostId,kind:'doctor'},...scene.others]},
    motionReceipts:[...motionReceipts],claims:[...claims],deliveries:[...deliveries]});
  },
  async checkpoint(){
   await flush();
   return clone({schemaVersion:1,modelVersion:CLINICAL_RUNTIME_VERSION,contentHash,roomId,caseId,members,hostId,mode,
    ownerId:shift.record(firstUid)?.ownerId??null,shift:shift.checkpoint(),focused:[...focused],
    lastWallMs,pendingQuanta,typingUntilMs,motionReceipts:[...motionReceipts],claims:[...claims],
    deliveries:[...deliveries],world:world.checkpoint(),
    session:await sessions.get(firstUid).checkpoint(),
    sessions:await Promise.all([...sessions].filter(([uid])=>uid!==firstUid)
     .map(async([uid,s])=>[uid,await s.checkpoint()]))});
  },
  dispose(){for(const s of sessions.values())s.dispose();world.enterLobby();}
 });
}
