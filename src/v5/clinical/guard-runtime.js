import {createWorld} from '../app/world.js';
import {createGuardSession} from './guard-session.js';
import {clinicalExecutorFor,playableClinicalCaseIds} from '../content/clinical-cases.js';
import {previousClinicalContents} from '../content/clinical-content.js';
import {createShiftFlow,receptionAcuity} from './shift-flow.js';
import {outcomeId} from '../social/cooperative-lifecycle.js';
import {resolveGuardSelection,guardCaseSequence,guardScopeMultiplier} from './guard-selection-policy.js';
import {createGuardTurnControl} from './guard-turn-control.js';
import {createGuardCommunication} from './guard-communication.js';

export const CLINICAL_RUNTIME_VERSION='atria-guard-runtime-1';
const STEP=1/60;
const clone=x=>structuredClone(x);
export async function clinicalContentHash(content){
 const bytes=new TextEncoder().encode(JSON.stringify(content));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
/** One world, nurse dispatcher and shift clock; one original native clinical
 * session per patient. Only the existing durable CAS owner can mutate them. */
export async function createGuardRuntime({content,roomId,caseId,members,hostId,mode='coop',nowMs,checkpoint=null,guardSelection=null}){
 let contentHash=await clinicalContentHash(content);
 if(checkpoint&&checkpoint.contentHash!==contentHash){
  for(const previous of previousClinicalContents(content)){
   const previousHash=await clinicalContentHash(previous);
   if(previousHash===checkpoint.contentHash){content=previous;contentHash=previousHash;break;}
  }
 }
 if(checkpoint){
  if(checkpoint.schemaVersion!==1||checkpoint.modelVersion!==CLINICAL_RUNTIME_VERSION||
    checkpoint.contentHash!==contentHash||checkpoint.roomId!==roomId)throw Error('incompatible runtime checkpoint');
  ({caseId,members,hostId,mode='coop'}=clone(checkpoint));
  guardSelection=checkpoint.guardSelection??null;
 }
 if(guardSelection!==null){
  const verified=resolveGuardSelection(content.cases,playableClinicalCaseIds(content.cases),guardSelection);
  // jsonb reorders object keys; compare policy values, never object key order.
  if(checkpoint&&(guardSelection.version!==1||guardSelection.selection!==verified.selection||
   JSON.stringify(guardSelection.caseIds)!==JSON.stringify(verified.caseIds)))
   throw Error('incompatible guard selection');
  guardSelection=verified;
 }
 const caseSequence=checkpoint?.shift?.caseSequence??(guardSelection?guardCaseSequence(guardSelection.caseIds):null);
 if(guardSelection&&!caseSequence)throw Error('missing admission sequence');
 if(!checkpoint&&caseSequence)caseId=caseSequence[0];
 if(!['solo','apprentice','coop','competitive'].includes(mode)||!Number.isSafeInteger(nowMs)||nowMs<0||
   !Array.isArray(members)||members.length<(['solo','apprentice'].includes(mode)?1:2)||members.length>4||
   new Set(members.map(x=>x.id)).size!==members.length)throw Error('invalid multiplayer clinical runtime');
 if(!clinicalExecutorFor(content.cases.find(c=>c.id===caseId)))throw Object.assign(Error('clinical case is not migrated'),{code:'invalid'});
 const host=members.find(m=>m.id===hostId);if(!host)throw Error('runtime host not in roster');
 const world=createWorld(content,{id:hostId,name:host.name,scrubColor:host.scrubColor||'navy',sex:host.sex,level:host.level},checkpoint?.world);
 if(!checkpoint)world.enterGuard({mode,caseId,patientUid:roomId+':patient',members});
 const shift=createShiftFlow({content,mode,firstCaseId:caseId,roomId,snapshot:checkpoint?.shift,
  allowedCaseIds:guardSelection?.caseIds??null,caseSequence});
 const turn=createGuardTurnControl({roomId,members,shift,snapshot:checkpoint?.turn??null});
 const communication=createGuardCommunication({roomId,mode,members,snapshot:checkpoint?.communication??null});
 const sessions=new Map(),focused=new Map(clone(checkpoint?.focused??[])),focusVersions=new Map(clone(checkpoint?.focusVersions??[]));
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
  const session=createGuardSession({roomId,mode:['solo','apprentice'].includes(mode)?mode:'coop',actorId:hostId,actorName:host.name,members,patient,content,
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
 function setFocus(actorId,uid){
  if(focused.get(actorId)!==uid)focusVersions.set(actorId,(focusVersions.get(actorId)||0)+1);
  focused.set(actorId,uid);
 }
 function claimPatient(actorId,uid){
  const r=shift.record(uid);
  if(!members.some(m=>m.id===actorId)||!turn.participating(actorId)||!r||r.closed||shift.ended())return false;
  if(!world.patientInRangeFor(actorId,uid))return false;
  // Reject a rival's occupied bed BEFORE changing the actor's clinical focus.
  // Otherwise clicking an occupied bedside silently switches the active
  // patient, even though the order dispatcher correctly blocks that patient.
  if(mode==='competitive'){
   if(r.ownerId&&r.ownerId!==actorId)return false;
   if(!r.ownerId&&!shift.owner(uid,actorId))return false;
  }
  setFocus(actorId,uid);return true;
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
    if(!claims.has(key))claims.set(key,sessions.get(r.uid).rewardFor(receipt,m.id));
   }
  }
 }
 async function flush(){for(const s of sessions.values())await s.flush();}
 function clinicalView(actorId,session=activeSession(actorId)){
  const state=session.read(actorId),rows=shift.records();
  const patientStates=new Map(rows.map(record=>[record.uid,record.uid===state.patient.uid?state:
   sessions.get(record.uid).read(actorId,{includeChecklist:false})]));
  state.hintBinding.selectionRevision=focusVersions.get(actorId)||0;
  const items=rows.map(r=>{
   const p=patientStates.get(r.uid)?.patient,c=content.cases.find(x=>x.id===r.caseId);
   const triage=receptionAcuity({caseData:c,patient:p,waitingSeconds:r.ownerId?0:Math.max(0,shift.elapsed()-r.arrivalAt)});
   return {...r,triage,closed:!!p?.caseEnded,patientDied:!!p?.patientDied,ownerId:r.ownerId||null,
    score:p?.closure?.quality?.score??null};
  });
  const outcomes=items.filter(r=>r.closed||r.patientDied).map(r=>{
   const {patient:p,caseReward}=sessions.get(r.uid).read(mode==='competitive'?(r.ownerId||actorId):actorId);
   return {patientUid:r.uid,ownerId:r.ownerId,closed:!!p.closure?.closed,
    survived:!p.patientDied,score:p.closure?.quality?.score??0,
    xp:caseReward?.xp??p.closure?.xp??0,points:p.closure?.quality?.score??0};
  });
  state.shift={mode,elapsedSeconds:shift.elapsed(),remainingSeconds:shift.remaining(),ended:shift.ended(),
   turn:turn.view(actorId),
   guardSelection:guardSelection?{scope:guardSelection.scope,selection:guardSelection.selection,multiplier:guardScopeMultiplier(guardSelection.scope)}:null,
   focusPatientUid:state.patient.uid,
   // The default first patient is not necessarily physically claimed.
   // This UID exists only after this actor's server-side proximity validation.
   confirmedFocusPatientUid:focused.get(actorId)||null,patients:items,outcomes};
  state.communication=communication.read({actorId,patients:rows.map(record=>({record,state:patientStates.get(record.uid),
   visible:mode!=='competitive'||record.ownerId===actorId||!record.ownerId&&!!world.patientInRangeFor(actorId,record.uid)}))});
  if(mode==='competitive'){
   const ownerId=items.find(r=>r.uid===state.patient.uid)?.ownerId||null;
   state.competition={mode,ownerId,patientUid:state.patient.uid,outcomes};
   if(state.caseReward&&ownerId!==actorId)
    state.caseReward={...state.caseReward,xp:0,creditStatus:'ineligible'};
  }
  return state;
 }
 return Object.freeze({
  updateDoctorLevel(actorId,level){
   const member=members.find(x=>x.id===actorId);if(!member)return false;
   if(!world.setDoctorLevel(actorId,level))return false;member.level=level;return true;
  },
  async advanceTo(targetMs,{maxSteps=3600}={}){
   if(!Number.isSafeInteger(targetMs)||targetMs<lastWallMs||!Number.isSafeInteger(maxSteps)||maxSteps<1)
    throw Error('invalid recovery wall clock');
   pendingQuanta+=(targetMs-lastWallMs)*60;lastWallMs=targetMs;
   if(!Number.isSafeInteger(pendingQuanta))throw Error('recovery interval outside supported clock');
   // Decision/leave pauses have no offline clinical debt. Advancing the wall
   // anchor here makes a later explicit resume begin at the recovered present.
   if(!turn.running()){pendingQuanta=0;return {recovering:false,steps:0,lastWallMs};}
   let steps=0;
   while(pendingQuanta>=1000&&steps<maxSteps){
    pendingQuanta-=1000;
    const atMs=lastWallMs-pendingQuanta/60;
    if(turn.running()){
     world.step(STEP);
     for(const session of sessions.values()){session.finishNurseArrivals();session.advance(STEP,{typing:atMs<typingUntilMs});}
     for(const r of shift.advance(STEP))makeSession(r);
    }
    steps++;
    if(steps%60===0)await flush();
    if(!turn.running()){pendingQuanta=0;break;}
   }
   await flush();awardMembers();return {recovering:pendingQuanta>=1000,steps,lastWallMs};
  },
  claim:claimPatient,
  shiftControl(actorId,request){
   const wasRunning=turn.running(),result=turn.control(actorId,request);
   if(wasRunning!==turn.running()){pendingQuanta=0;typingUntilMs=0;}
   return result;
  },
  async hint(actorId,request){
   const reject=reason=>({status:'rejected',reason});
   if(!members.some(m=>m.id===actorId)||request?.actorId!==actorId)return reject('hint-forbidden');
   if(!turn.participating(actorId))return reject('shift-member-left');
   if(shift.ended())return reject('shift-ended');
   const uid=request.patientUid,r=shift.record(uid);
   if(request.roomId!==roomId||!r||r.closed)return reject('patient-not-active');
   if(focused.get(actorId)!==uid||request.selectionRevision!==(focusVersions.get(actorId)||0))return reject('patient-selection-changed');
   if(mode==='competitive'&&r.ownerId!==actorId)return reject('other-player-owns-patient');
   return sessions.get(uid).hint(request,actorId);
  },
  async post(actorId,envelope){
   if(!members.some(m=>m.id===actorId))throw Error('not a clinical member');
   // An explicit team envelope is consumed before speech/NPC/clinical routing.
   // A retry cannot change channels to turn an acknowledged team line into care.
   if(envelope?.channel==='team'||communication.hasCommand(actorId,envelope?.id)){
    if(envelope?.channel!=='team'||[...sessions.values()].some(session=>session.hasCommand(actorId,envelope.id)))
     return {roomId,commandId:envelope?.id??null,status:'rejected',reason:'command-id-reused-with-different-payload'};
    return communication.post(actorId,envelope,{at:shift.elapsed(),participating:turn.participating(actorId)});
   }
   // The existing room receipt is authoritative even after movement,
   // another selection or closure. Revalidate the original payload there.
   for(const [uid,session] of sessions)
    if(session.hasCommand(actorId,envelope.id))
     return session.post({...envelope,targetPatientUid:envelope.targetPatientUid??uid},actorId);
   if(!turn.participating(actorId))return {roomId,commandId:envelope.id,status:'rejected',reason:'shift-member-left'};
   // An old client queue with no bedside binding may look up a committed
   // receipt, but cannot execute a fresh order after the doctor has moved.
   if(envelope.targetPatientUid===null)return {roomId,commandId:envelope.id,status:'rejected',reason:'patient-selection-changed'};
   if(shift.ended())return {roomId,commandId:envelope.id,status:'rejected',reason:'shift-ended'};
   let uid=preferred(actorId),record=shift.record(uid);
   if(mode==='competitive'){
    // A generic chat utterance belongs to the actor's OWN physical bedside.
    // Never route it to firstUid or to a rival's focused patient just because
    // those are the currently published clinical snapshot.
    const bedside=world.nearbyPatientsFor(actorId).map(id=>shift.record(id))
     .filter(r=>r&&!r.closed);
    const explicit=envelope.targetPatientUid;
    if(explicit&&explicit!==focused.get(actorId)&&(bedside.length!==1||bedside[0].uid!==explicit))
     return {roomId,commandId:envelope.id,status:'rejected',reason:'patient-selection-changed'};
    if(explicit)record=bedside.find(r=>r.uid===explicit)||null;
    else{
     const selected=bedside.find(r=>r.uid===focused.get(actorId)&&r.ownerId===actorId);
     if(!selected&&bedside.length>1)
      return {roomId,commandId:envelope.id,status:'rejected',reason:'ambiguous-patient-selection'};
     record=selected||bedside[0]||null;
    }
    if(!record)
     return {roomId,commandId:envelope.id,status:'rejected',reason:'approach-patient-to-claim'};
    if(record.ownerId&&record.ownerId!==actorId)
     return {roomId,commandId:envelope.id,status:'rejected',reason:'other-player-owns-patient'};
    // Speaking to exactly one reachable, unclaimed patient is valid first
    // bedside contact. Speaking from a corridor or another box never is.
    if(!record.ownerId&&!shift.owner(record.uid,actorId))
     return {roomId,commandId:envelope.id,status:'rejected',reason:'patient-claim-conflict'};
    setFocus(actorId,record.uid);uid=record.uid;
   }else if(envelope.targetPatientUid){
    uid=envelope.targetPatientUid;record=shift.record(uid);
    if(record&&!record.closed){
     if(!world.patientInRangeFor(actorId,uid))
      return {roomId,commandId:envelope.id,status:'rejected',reason:'approach-patient-to-claim'};
     setFocus(actorId,uid);
    }
   }
   if(!record||record.closed)return {roomId,commandId:envelope.id,status:'rejected',
    reason:'patient-not-active',clinical:[{kind:'case.close',status:'rejected',reason:'patient-not-active'}]};
   const session=activeSession(actorId),ack=await session.post({...envelope,targetPatientUid:uid},actorId);
   await session.flush();awardMembers();return ack;
  },
  motion(actorId,target,sequence=null){
   if(!members.some(m=>m.id===actorId)||!turn.participating(actorId)||!Array.isArray(target)||target.length!==2||!target.every(Number.isFinite))return false;
   if(sequence!==null&&(!Number.isSafeInteger(sequence)||sequence<1||sequence>1e9))return false;
   if(sequence!==null&&sequence<=(motionReceipts.get(actorId)??0))return true;
   const ok=actorId===hostId?world.target(...target):world.targetRemote(actorId,...target);
   if(ok&&sequence!==null)motionReceipts.set(actorId,sequence);
   return ok;
  },
  typing(actorId,active,atMs){if(actorId===hostId&&turn.participating(actorId))typingUntilMs=active?atMs+5000:0;},
  confirm(actorId,revision,eventId){
   const state=activeSession(actorId).read();
   if(!members.some(m=>m.id===actorId)||!Number.isSafeInteger(revision)||revision<0||
    revision>state.room.revision||eventId!=null&&eventId!==outcomeId(state.patient))return false;
   const prior=deliveries.get(actorId);
   deliveries.set(actorId,{revision:Math.max(revision,prior?.revision??0),outcomeId:eventId??prior?.outcomeId??null});
   return true;
  },
  view(actorId=hostId,{patientUid=null}={}){
   if(!members.some(member=>member.id===actorId))throw Object.assign(Error('not a clinical member'),{code:'forbidden'});
   let session=activeSession(actorId);
   if(mode==='competitive'&&patientUid===null){
    const records=shift.records(),preferredRecord=shift.record(preferred(actorId))||records[0];
    const own=preferredRecord?.ownerId===actorId?preferredRecord:records.find(record=>record.ownerId===actorId);
    const available=!preferredRecord?.ownerId?preferredRecord:records.find(record=>!record.ownerId);
    session=sessions.get((own||available||preferredRecord).uid);
   }
   if(patientUid!==null){
    const record=shift.record(patientUid);
    if(!record||!sessions.has(patientUid))throw Object.assign(Error('unknown clinical patient'),{code:'invalid'});
    if(mode==='competitive'&&(record.ownerId&&record.ownerId!==actorId||
     !record.ownerId&&!world.patientInRangeFor(actorId,patientUid)))
     throw Object.assign(Error('clinical patient projection forbidden'),{code:'forbidden'});
    session=sessions.get(patientUid);
   }
   let clinical=clinicalView(actorId,session),catalog=session.catalog();
   if(mode==='competitive'&&clinical.competition.ownerId&&clinical.competition.ownerId!==actorId){
    // When every bed belongs to a rival, preserve the reception/scoreboard
    // contract without returning that rival's clinical session. Allowlist the
    // public aggregate fields so new patient/history fields stay private.
    clinical={canEdit:false,readOnly:true,hintBinding:clinical.hintBinding,hintCount:0,caseReward:null,
     room:{roomId,mode:clinical.room.mode,revision:0,events:[],transcript:[]},
     patient:{uid:clinical.patient.uid,caseId:clinical.patient.caseId},clock:clinical.clock,messages:[],
     exposure:{patientUid:clinical.patient.uid,confirmedIvEventCount:0,confirmedCrystalloidMl:0,byDrug:{}},
     progress:{xp:0,level:1,receipts:[],penalties:[]},eligibleDestinations:[],closure:null,
     shift:clinical.shift,competition:clinical.competition,communication:clinical.communication};
    catalog=[];
   }
   const scene=world.snapshot();
   const deaths=[];
   for(const record of shift.records()){
    const state=sessions.get(record.uid).read(actorId,{includeChecklist:false}),p=state.patient;
    if(p.patientDied&&p.deathAttribution?.classification==='treatment-contributed'&&p.deathAttribution.actorIds?.includes(actorId))
     deaths.push({kind:'clinical.death',actorId,patientUid:record.uid,eventId:roomId+':death:'+record.uid});
   }
   return clone({clinical,catalog,
    spatial:{nurses:scene.nurses,doctors:[{...scene.player,id:hostId,kind:'doctor'},...scene.others],expert:scene.expert},
    motionReceipts:[...motionReceipts],claims:[...claims].filter(([,claim])=>mode!=='competitive'||claim.actorId===actorId),
    deaths,deliveries:[...deliveries].filter(([id])=>mode!=='competitive'||id===actorId)});
  },
  async checkpoint(){
   await flush();
   return clone({schemaVersion:1,modelVersion:CLINICAL_RUNTIME_VERSION,contentHash,roomId,caseId,members,hostId,mode,
    ...(guardSelection?{guardSelection}:{}),
    ownerId:shift.record(firstUid)?.ownerId??null,shift:shift.checkpoint(),turn:turn.checkpoint(),communication:communication.checkpoint(),focused:[...focused],focusVersions:[...focusVersions],
    lastWallMs,pendingQuanta,typingUntilMs,motionReceipts:[...motionReceipts],claims:[...claims],
    deliveries:[...deliveries],world:world.checkpoint(),
    session:await sessions.get(firstUid).checkpoint(),
    sessions:await Promise.all([...sessions].filter(([uid])=>uid!==firstUid)
     .map(async([uid,s])=>[uid,await s.checkpoint()]))});
  },
  dispose(){for(const s of sessions.values())s.dispose();world.enterLobby();}
 });
}
