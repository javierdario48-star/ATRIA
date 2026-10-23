import {createNavigation} from '../engine/navigation.js';
import {createRemotePose,receiveRemotePose,sampleRemotePose} from '../../social/remote-motion.js';
import {privateRoomMotionPrefix} from '../social/room-motion-scope.js';
import {createNurseDispatcher} from '../engine/nurse-dispatcher.js';
import {hospitalEntities,hitWorldEntity,canInteract,PATIENT_RANGE} from '../engine/interactions.js';

const nurseHomes=[[8,14],[8,22],[8,28],[24,13],[27,23],[27,29]];
const actor=(id,point,extra={})=>({id,...point,r:10.5,speed:205,path:[],pathIndex:0,target:null,
 dir:'S',moving:false,walkPhase:0,lastSide:1,...extra});

/** Owns spatial state only. No DOM, clock, clinical execution or network writes. */
export function createWorld(content,profile,checkpoint=null){
 let identity=globalThis.crypto.randomUUID();
 const navigation=createNavigation(content.map);
 const start=content.map.player_start_tile;
 const point=tile=>navigation.center(...(navigation.nearest(...tile,8)||start));
 let phase='title',mode=null,caseId=null,generation=0,player,nurses=[],patients=[],expert=null,pendingInteraction=null,nursing=null,others=[],authoritative=true,
  motionSequence=0,lastMotionIntent=null;
 const lobbyRemotes=new Map(),guardRemotes=new Map(),nurseRemotes=new Map();
 const entities=()=>hospitalEntities({patients,nurses,expert},content.map,content.beds);
 function lobbyTile(){
  let hash=0;for(const char of profile.name||'Medico')hash=(hash*31+char.charCodeAt(0))>>>0;
  const offsets=[[-3,-2],[0,-3],[3,-2],[-4,1],[4,1],[-2,3],[2,3],[0,1]],d=offsets[hash%offsets.length];
  return [start[0]+d[0],start[1]+d[1]];
 }
 function resetPlayer(tile){player=actor('self',point(tile),{name:profile.name,color:profile.scrubColor||'navy',level:1});lastMotionIntent=null;}
 // Outbound movement represents explicit input, never a pose received from
 // another authority. Navigation may finish or reconcile without canceling it.
 function targetPlayer(x,y){
  if(phase==='title'||!navigation.target(player,x,y))return false;
  lastMotionIntent={sequence:++motionSequence,target:[...player.target]};return true;
 }
 resetPlayer(lobbyTile());
 function enterLobby(){lobbyRemotes.clear();guardRemotes.clear();nurseRemotes.clear();nursing?.dispose();nursing=null;others=[];authoritative=true;generation++;phase='lobby';mode=null;caseId=null;nurses=[];patients=[];expert=null;pendingInteraction=null;resetPlayer(lobbyTile());}
 function enterGuard(options={}){
  lobbyRemotes.clear();guardRemotes.clear();nurseRemotes.clear();const selected=options.mode||'solo';
  if(!['solo','apprentice','coop'].includes(selected))throw Error('multiplayer mode not migrated');
  const c=content.cases.find(c=>c.id===options.caseId);if(!c)throw Error('unknown clinical case');
  nursing?.dispose();nursing=null;
  generation++;phase='guard';mode=selected;caseId=c.id;pendingInteraction=null;resetPlayer(start);
  authoritative=options.authoritative!==false;
  others=(options.members||[]).filter(x=>x.id!==profile.id).map(x=>actor(x.id,point(start),{kind:'doctor',name:x.name,color:x.color||'navy',level:1}));
  nurses=nurseHomes.map((home,index)=>actor('nurse-'+index,point(home),{kind:'nurse',r:8.5,speed:140,home:[...home],patrolAt:index*2}));
  const bed=content.beds.find(b=>b.id===(options.bedId||'B1'))||content.beds[0];
  patients=[{id:'patient-'+generation,uid:'patient-'+generation,caseId:c.id,bedId:bed.id,
   x:bed.patient[0],y:bed.patient[1],approach:[...bed.approach],name:c.demo,chief:c.chief}];
  patients[0].uid=identity+':'+patients[0].uid;
  if(selected==='coop'&&typeof options.patientUid==='string'&&options.patientUid)patients[0].uid=options.patientUid;
  expert=selected==='apprentice'?actor('vega',point([14,45]),{kind:'vega',name:'Dr. Vega',r:9.5,speed:220}):null;
  if(authoritative)nursing=createNurseDispatcher({navigation,nurses,patients});
 }
 function step(dt,now=Date.now()){
  if(phase==='title')return;
  navigation.move(player,dt);
  if(phase==='lobby')for(const other of others){
   const track=lobbyRemotes.get(other.id);if(!track)continue;
   const pose=sampleRemotePose(track,now);
   Object.assign(other,{x:pose.x,y:pose.y,dir:pose.dir,moving:pose.moving,walkPhase:pose.walkPhase});
  }
  if(phase==='guard'&&!authoritative)for(const other of others){
   const track=guardRemotes.get(other.id);if(!track)continue;
   const pose=sampleRemotePose(track.pose,now);
   Object.assign(other,{x:pose.x,y:pose.y,dir:pose.dir,moving:pose.moving,walkPhase:pose.walkPhase});
  }
  if(phase==='guard'&&!authoritative)for(const track of nurseRemotes.values())
   sampleRemotePose(track.pose,now);
  for(const actor of [player,...others,...nurses,...patients,...(expert?[expert]:[])])if(actor.speechBubble&&actor.speechBubble.until<=now)delete actor.speechBubble;
  if(!authoritative)return;
  if(phase==='guard')for(const other of others)navigation.move(other,dt);
  nursing?.advance(dt);
  for(const n of nurses){
   if(n.journeyId)continue; // Nurse movement is owned by dispatcher until clinical receipt.
   n.patrolAt-=dt;
   if(n.patrolAt<=0&&!n.moving){
    const offset=n.atHome?1:-1,goal=navigation.nearest(n.home[0],n.home[1]+offset,2);
    if(goal){const p=navigation.center(...goal);navigation.target(n,p.x,p.y);}
    n.atHome=!n.atHome;n.patrolAt=6;
   }
   navigation.move(n,dt);
  }
  if(expert){
   if(Math.hypot(expert.x-player.x,expert.y-player.y)>80&&!expert.moving){
    const tile=navigation.tileAt(player.x,player.y),goal=navigation.nearest(tile[0]-1,tile[1],2);
    if(goal){const p=navigation.center(...goal);navigation.target(expert,p.x,p.y);}
   }
   navigation.move(expert,dt);
  }
 }
 const snapshot=()=>structuredClone({phase,mode,caseId,generation,player,nurses,patients,expert,others,entities:entities()});
 if(checkpoint){
  if(checkpoint.schemaVersion!==1||checkpoint.profile.id!==profile.id||checkpoint.state.phase!=='guard')throw Error('incompatible world checkpoint');
  const saved=structuredClone(checkpoint);profile=saved.profile;identity=saved.identity;
  ({phase,mode,caseId,generation,player,nurses,patients,expert,others}=saved.state);
  authoritative=saved.authoritative;pendingInteraction=saved.pendingInteraction;
  if(authoritative)nursing=createNurseDispatcher({navigation,nurses,patients,checkpoint:saved.nursing});
 }
 return Object.freeze({navigation,enterLobby,enterGuard,step,snapshot,
  presentNurses(frame){
   if(phase!=='guard'||authoritative)return frame;
   for(const nurse of frame.nurses||[]){
    const pose=nurseRemotes.get(nurse.id)?.pose;
    if(!pose?.samples.length)continue;
    Object.assign(nurse,{x:pose.x,y:pose.y,dir:pose.dir,
     moving:pose.moving,walkPhase:pose.walkPhase});
   }
   return frame;
  },
  checkpoint:()=>structuredClone({schemaVersion:1,identity,profile,state:snapshot(),authoritative,pendingInteraction,nursing:nursing?.checkpoint()??null}),
  setSocialIdentity(id){profile={...profile,id};},
  showLobbyPlayers(list,now=Date.now()){
   if(phase!=='lobby')return;
   const previous=new Map(others.map(p=>[p.id,p])),ids=new Set(),updated=[];
   for(const remote of list){
    if(remote.userId===profile.id||ids.has(remote.userId))continue;
    ids.add(remote.userId);
    let other=previous.get(remote.userId),track=lobbyRemotes.get(remote.userId);
    if(!track){track=createRemotePose({x:remote.x,y:remote.y,now,cadence:260,speed:205});lobbyRemotes.set(remote.userId,track);}
    receiveRemotePose(track,{...remote,now,transport:'http',motionCadence:remote.motionCadence||260});
    if(!other)other=actor(remote.userId,{x:track.x,y:track.y},{kind:'doctor'});
    Object.assign(other,{name:remote.name,color:remote.color||'navy',level:remote.level||1});
    updated.push(other);
   }
   others=updated;
   for(const id of lobbyRemotes.keys())if(!ids.has(id))lobbyRemotes.delete(id);
  },
  showLobbyMessage(userId,text,now=Date.now()){
   if(phase!=='lobby')return;
   const speaker=userId===profile.id?player:others.find(p=>p.id===userId);
   if(speaker)speaker.speechBubble={text:String(text).slice(0,120),until:now+4500};
  },
  showGuardSocialPlayers(list,roomId,members,now=Date.now()){
   if(phase!=='guard'||mode!=='coop'||authoritative||!roomId)return false;
   const allowed=new Set(members),scope=privateRoomMotionPrefix(roomId);
   for(const remote of list){
    if(remote.userId===profile.id||!allowed.has(remote.userId)||
       !String(remote.motionSession||'').startsWith(scope))continue;
    // The durable clinical roster still owns admission. Public presence
    // can only move an already-authorized avatar on the client display.
    const other=others.find(p=>p.id===remote.userId);
    if(!other)continue;
    let track=guardRemotes.get(other.id);
    if(!track||track.source!=='social'){
     track={pose:createRemotePose({x:other.x,y:other.y,now,cadence:260,speed:205}),
      seq:0,source:'social',lastSocialAt:now};
     guardRemotes.set(other.id,track);
    }
    const lastReceived=track.pose.lastReceive;
    receiveRemotePose(track.pose,{...remote,now,transport:'http',motionCadence:260});
    // Old cached room presence is not a new movement packet. Once real
    // packets cease, allow the durable snapshot to recover the display.
    if(track.pose.lastReceive!==lastReceived)track.lastSocialAt=now;
   }
   return true;
  },
  showNpcMessage(role,text,now=Date.now()){
   if(phase!=='guard'||!['patient','nurse','mentor'].includes(role))return false;
   // One consistent speaking nurse across the entire guard, never a
   // fabricated NPC. All messages remain presentation-only.
   const speaker=role==='patient'?patients[0]:role==='mentor'?expert:nurses[0];
   if(!speaker)return false;
   speaker.speechBubble={text:String(text).slice(0,150),until:now+5000,role};
   return true;
  },
  showGuardMessage(userId,text,now=Date.now()){
   if(phase!=='guard')return;
   const speaker=userId===profile.id||userId==='local-player'?player:others.find(p=>p.id===userId);
   if(speaker)speaker.speechBubble={text:String(text).slice(0,120),until:now+4500};
  },
  targetRemote(id,x,y){const other=others.find(x=>x.id===id);return !!other&&authoritative&&navigation.target(other,x,y);},
  reconcileDoctors(members){if(phase==='guard'&&mode==='coop'&&authoritative)others=others.filter(x=>members.some(m=>m.userId===x.id));},
  stopRemote(id){const other=others.find(x=>x.id===id);if(other){other.path=[];other.pathIndex=0;other.target=null;other.moving=false;}},
  patientInRangeFor(id,uid){const a=id===profile.id?player:others.find(x=>x.id===id),p=patients.find(x=>x.uid===uid);
   return a&&p&&Math.hypot(a.x-p.x,a.y-p.y)<=PATIENT_RANGE?uid:null;},
  applySharedSpatial({nurses:sharedNurses,doctors},now=Date.now(),acknowledgedMotion=null){
   if(authoritative||mode!=='coop')return false;
   // A browser recovering an existing durable room starts its local counter
   // after the last sequence committed for this doctor, not at #1 again.
   if(Number.isSafeInteger(acknowledgedMotion)&&acknowledgedMotion>motionSequence)
    motionSequence=acknowledgedMotion;
   // The server owns all bedside receipts and nurse journeys. Clients only
   // interpolate the committed pose between clinical snapshots. Reuse the
   // same visual timeline as doctors, with the actual nurse speed.
   const activeNurses=new Set();
   const previousNurses=new Map(nurses.map(n=>[n.id,n]));
   nurses=sharedNurses.map(remote=>{
    const nurse=structuredClone(remote);
    const priorBubble=previousNurses.get(nurse.id)?.speechBubble;
    if(priorBubble?.until>now)nurse.speechBubble=priorBubble;
    activeNurses.add(nurse.id);
    let track=nurseRemotes.get(nurse.id);
    if(!track){
     track={pose:createRemotePose({x:nurse.x,y:nurse.y,now,cadence:900,speed:nurse.speed||140}),
      seq:0,previous:null};
     nurseRemotes.set(nurse.id,track);
    }
    const route=[{x:track.previous?.x??nurse.x,y:track.previous?.y??nurse.y}];
    if(track.previous&&Array.isArray(track.previous.path)&&Array.isArray(nurse.path)&&
       track.previous.path.length===nurse.path.length&&
       track.previous.path.every((p,i)=>p[0]===nurse.path[i][0]&&p[1]===nurse.path[i][1])){
     const begin=track.previous.pathIndex??0,end=nurse.pathIndex??0;
     if(begin<=end)for(let i=begin;i<end;i++)
      route.push(navigation.center(...nurse.path[i]));
    }
    route.push({x:nurse.x,y:nurse.y});
    receiveRemotePose(track.pose,{...nurse,now,route,transport:'clinical',
     motionSession:'clinical-nurse:'+nurse.id,motionEpoch:1,
     seq:++track.seq,motionCadence:900});
    track.previous=nurse;
    // Retain the exact authoritative nurse receipt/location in world state.
    // Visual-only positions are applied on a separate render snapshot.
    return nurse;
   });
   for(const id of nurseRemotes.keys())if(!activeNurses.has(id))nurseRemotes.delete(id);
   const previous=new Map(others.map(x=>[x.id,x]));
   const remoteIds=new Set();
   others=doctors.filter(x=>x.id!==profile.id).map(remote=>{
    remoteIds.add(remote.id);
    const old=previous.get(remote.id),other=structuredClone(remote);
    if(old?.speechBubble?.until>now)other.speechBubble=old.speechBubble;
    let track=guardRemotes.get(remote.id);
    if(track?.source==='social'){
     // Never switch this avatar back to a late clinical position: that
     // causes a second, backwards traversal when the next live social packet
     // arrives. A missing packet holds the last displayed pose; the server
     // remains authoritative for all interaction ranges and treatment.
     Object.assign(other,{x:old?.x??track.pose.x,y:old?.y??track.pose.y,
      dir:old?.dir??remote.dir,moving:old?.moving??remote.moving,
      walkPhase:old?.walkPhase??remote.walkPhase});
     return other;
    }
    if(!track){
     track={pose:createRemotePose({x:remote.x,y:remote.y,now,cadence:320,speed:205}),seq:0,source:'clinical'};
     guardRemotes.set(remote.id,track);
     // Seed the first *authoritative* point before receiving any later frame.
     // Without this, the second snapshot is treated as initial and teleports.
     receiveRemotePose(track.pose,{...remote,now,transport:'http',
      motionSession:'guard:'+remote.id,motionEpoch:1,seq:++track.seq,motionCadence:320});
    }else{
     // Reuse original V4 visual timeline; never change server-owned positions.
     receiveRemotePose(track.pose,{...remote,now,transport:'http',
      motionSession:'guard:'+remote.id,motionEpoch:1,seq:++track.seq,motionCadence:320});
     const sampled=sampleRemotePose(track.pose,now);
     Object.assign(other,{x:sampled.x,y:sampled.y,walkPhase:sampled.walkPhase});
    }
    return other;
   });
   for(const id of guardRemotes.keys())if(!remoteIds.has(id))guardRemotes.delete(id);
   const self=doctors.find(x=>x.id===profile.id);
   if(self&&!player.moving){
    // Local prediction must never be rewound to a server pose that predates
    // its input. Accept a final position only when the server has processed
    // this exact input sequence AND arrived at that destination.
    const intent=lastMotionIntent;
    const settled=(!self.moving&&!self.target);
    const admitted=intent&&Number.isSafeInteger(acknowledgedMotion)&&acknowledgedMotion>=intent.sequence;
    const arrived=intent&&Math.hypot(self.x-intent.target[0],self.y-intent.target[1])<2;
    if(!intent&&settled){
     player.x=self.x;player.y=self.y;
    }else if(admitted&&settled&&arrived&&Math.hypot(self.x-player.x,self.y-player.y)>1){
     // Final correction only. Do not reconstruct a path or walk it twice.
     player.x=self.x;player.y=self.y;
    }
   }
   return true;
  },
  /** Spatial nursing is deliberately not hooked to clinical effects until the
   * native port can gate procedures on arrival; no false execution is shown.
   */
  enqueueNurseJourney:task=>nursing?.enqueue(task)||{status:'no-guard'},
  nurseJourneySnapshot:()=>nursing?.snapshot()||[],
  takeNurseArrivals:()=>nursing?.takeArrivals()||[],
  acceptNurseClinicalResult:result=>nursing?.acceptClinicalResult(result)||{status:'no-guard'},
  cancelNurseJourney:eventId=>nursing?.cancel(eventId)||false,
  /** Appearance is an actor property, never a reason to recreate the room. */
  setAppearance({name,scrubColor}){
   if(typeof name!=='string'||!name.trim()||name.length>32||
      !['navy','green','gray','pink','teal'].includes(scrubColor))throw Error('invalid appearance');
   profile={...profile,name,scrubColor};
   player.name=name;player.color=scrubColor;
  },
  setLevel(level){if(!Number.isSafeInteger(level)||level<1)throw Error('invalid player level');player.level=level;},
  motionIntent:()=>lastMotionIntent?structuredClone(lastMotionIntent):null,
  seedMovementSequence(confirmed){
   // A reconnected doctor shares the same durable actor ID, but gets a new
   // world instance. Start above that actor's *persisted* last command,
   // otherwise input #1 is discarded forever after a reload.
   if(phase!=='guard'||authoritative||lastMotionIntent!==null||
      !Number.isSafeInteger(confirmed)||confirmed<0)return false;
   motionSequence=Math.max(motionSequence,confirmed);
   return true;
  },
  target(x,y){pendingInteraction=null;return targetPlayer(x,y);},
  stop(){pendingInteraction=null;player.path=[];player.pathIndex=0;player.target=null;player.moving=false;
   lastMotionIntent={sequence:++motionSequence,target:[player.x,player.y]};},
  interactionAt:(x,y)=>structuredClone(hitWorldEntity(entities(),x,y)),
  patientInRange(uid){const p=patients.find(p=>p.uid===uid);return p&&Math.hypot(player.x-p.x,player.y-p.y)<=PATIENT_RANGE?uid:null;},
  beginInteraction(id){
   pendingInteraction=null;
   const entity=entities().find(e=>e.id===id);if(!entity)return {status:'missing'};
   if(canInteract(player,entity,patients))return {status:'ready',entity:structuredClone(entity)};
   const p=patients.find(p=>p.uid===entity.patientUid);
   if(!p?.approach)return {status:'out-of-range'};
   const goal=navigation.center(...(navigation.nearest(...p.approach,8)||p.approach));
   if(!targetPlayer(goal.x,goal.y))return {status:'unreachable'};
   pendingInteraction=id;return {status:'walking'};
  },
  takeInteraction(){
   if(!pendingInteraction||player.moving||player.pathIndex<player.path.length)return null;
   const entity=entities().find(e=>e.id===pendingInteraction);pendingInteraction=null;
   return entity&&canInteract(player,entity,patients)?structuredClone(entity):null;
  },
  nearby(){return patients.filter(p=>Math.hypot(player.x-p.x,player.y-p.y)<=PATIENT_RANGE).sort((a,b)=>
   Math.hypot(player.x-a.x,player.y-a.y)-Math.hypot(player.x-b.x,player.y-b.y))[0]?.uid||null;}
 });
}
