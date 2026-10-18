import {createNavigation} from '../engine/navigation.js';
import {createNurseDispatcher} from '../engine/nurse-dispatcher.js';
import {hospitalEntities,hitWorldEntity,canInteract,PATIENT_RANGE} from '../engine/interactions.js';

const nurseHomes=[[8,14],[8,22],[8,28],[24,13],[27,23],[27,29]];
const actor=(id,point,extra={})=>({id,...point,r:10.5,speed:205,path:[],pathIndex:0,target:null,
 dir:'S',moving:false,walkPhase:0,lastSide:1,...extra});

/** Owns spatial state only. No DOM, clock, clinical execution or network writes. */
export function createWorld(content,profile){
 const identity=globalThis.crypto.randomUUID();
 const navigation=createNavigation(content.map);
 const start=content.map.player_start_tile;
 const point=tile=>navigation.center(...(navigation.nearest(...tile,8)||start));
 let phase='title',mode=null,caseId=null,generation=0,player,nurses=[],patients=[],expert=null,pendingInteraction=null,nursing=null,others=[],authoritative=true;
 const entities=()=>hospitalEntities({patients,nurses,expert},content.map,content.beds);
 function lobbyTile(){
  let hash=0;for(const char of profile.name||'Medico')hash=(hash*31+char.charCodeAt(0))>>>0;
  const offsets=[[-3,-2],[0,-3],[3,-2],[-4,1],[4,1],[-2,3],[2,3],[0,1]],d=offsets[hash%offsets.length];
  return [start[0]+d[0],start[1]+d[1]];
 }
 function resetPlayer(tile){player=actor('self',point(tile),{name:profile.name,color:profile.scrubColor||'navy',level:1});}
 resetPlayer(lobbyTile());
 function enterLobby(){nursing?.dispose();nursing=null;others=[];authoritative=true;generation++;phase='lobby';mode=null;caseId=null;nurses=[];patients=[];expert=null;pendingInteraction=null;resetPlayer(lobbyTile());}
 function enterGuard(options={}){
  const selected=options.mode||'solo';
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
 function step(dt){
  if(phase==='title')return;
  navigation.move(player,dt);
  if(!authoritative)return;
  for(const other of others)navigation.move(other,dt);
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
 return Object.freeze({navigation,enterLobby,enterGuard,step,snapshot,
  setSocialIdentity(id){profile={...profile,id};},
  showLobbyPlayers(list){if(phase!=='lobby')return;others=list.filter(x=>x.userId!==profile.id).map(x=>actor(x.userId,{x:x.x,y:x.y},
   {kind:'doctor',name:x.name,color:x.color||'navy',level:x.level||1,dir:x.dir,walkPhase:x.walkPhase}));},
  targetRemote(id,x,y){const other=others.find(x=>x.id===id);return !!other&&authoritative&&navigation.target(other,x,y);},
  reconcileDoctors(members){if(phase==='guard'&&mode==='coop'&&authoritative)others=others.filter(x=>members.some(m=>m.userId===x.id));},
  stopRemote(id){const other=others.find(x=>x.id===id);if(other){other.path=[];other.pathIndex=0;other.target=null;other.moving=false;}},
  patientInRangeFor(id,uid){const a=id===profile.id?player:others.find(x=>x.id===id),p=patients.find(x=>x.uid===uid);
   return a&&p&&Math.hypot(a.x-p.x,a.y-p.y)<=PATIENT_RANGE?uid:null;},
  applySharedSpatial({nurses:sharedNurses,doctors}){
   if(authoritative||mode!=='coop')return false;
   nurses=structuredClone(sharedNurses);others=structuredClone(doctors.filter(x=>x.id!==profile.id));
   const self=doctors.find(x=>x.id===profile.id);
   if(self&&!player.moving&&Math.hypot(self.x-player.x,self.y-player.y)>3){player.x=self.x;player.y=self.y;}
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
  target(x,y){pendingInteraction=null;return phase!=='title'&&navigation.target(player,x,y);},
  stop(){pendingInteraction=null;player.path=[];player.pathIndex=0;player.target=null;player.moving=false;},
  interactionAt:(x,y)=>structuredClone(hitWorldEntity(entities(),x,y)),
  patientInRange(uid){const p=patients.find(p=>p.uid===uid);return p&&Math.hypot(player.x-p.x,player.y-p.y)<=PATIENT_RANGE?uid:null;},
  beginInteraction(id){
   pendingInteraction=null;
   const entity=entities().find(e=>e.id===id);if(!entity)return {status:'missing'};
   if(canInteract(player,entity,patients))return {status:'ready',entity:structuredClone(entity)};
   const p=patients.find(p=>p.uid===entity.patientUid);
   if(!p?.approach)return {status:'out-of-range'};
   const goal=navigation.center(...(navigation.nearest(...p.approach,8)||p.approach));
   if(!navigation.target(player,goal.x,goal.y))return {status:'unreachable'};
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
