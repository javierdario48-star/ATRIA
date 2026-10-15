import {createNavigation} from '../engine/navigation.js';

const nurseHomes=[[8,14],[8,22],[8,28],[24,13],[27,23],[27,29]];
const actor=(id,point,extra={})=>({id,...point,r:10.5,speed:205,path:[],pathIndex:0,target:null,
 dir:'S',moving:false,walkPhase:0,lastSide:1,...extra});

/** Owns spatial state only. No DOM, clock, clinical execution or network writes. */
export function createWorld(content,profile){
 const navigation=createNavigation(content.map);
 const start=content.map.player_start_tile;
 const point=tile=>navigation.center(...(navigation.nearest(...tile,8)||start));
 let phase='title',mode=null,caseId=null,generation=0,player,nurses=[],patients=[],expert=null;
 function lobbyTile(){
  let hash=0;for(const char of profile.name||'Medico')hash=(hash*31+char.charCodeAt(0))>>>0;
  const offsets=[[-3,-2],[0,-3],[3,-2],[-4,1],[4,1],[-2,3],[2,3],[0,1]],d=offsets[hash%offsets.length];
  return [start[0]+d[0],start[1]+d[1]];
 }
 function resetPlayer(tile){player=actor('self',point(tile),{name:profile.name,color:profile.scrubColor||'navy',level:1});}
 resetPlayer(lobbyTile());
 function enterLobby(){generation++;phase='lobby';mode=null;caseId=null;nurses=[];patients=[];expert=null;resetPlayer(lobbyTile());}
 function enterGuard(options={}){
  const selected=options.mode||'solo';
  if(!['solo','apprentice'].includes(selected))throw Error('multiplayer mode not migrated');
  const c=content.cases.find(c=>c.id===options.caseId);if(!c)throw Error('unknown clinical case');
  generation++;phase='guard';mode=selected;caseId=c.id;resetPlayer(start);
  nurses=nurseHomes.map((home,index)=>actor('nurse-'+index,point(home),{kind:'nurse',r:8.5,speed:140,home:[...home],patrolAt:index*2}));
  const bed=content.beds.find(b=>b.id===(options.bedId||'B1'))||content.beds[0];
  patients=[{id:'patient-'+generation,uid:'patient-'+generation,caseId:c.id,bedId:bed.id,
   x:bed.patient[0],y:bed.patient[1],approach:[...bed.approach],name:c.demo,chief:c.chief}];
  expert=selected==='apprentice'?actor('vega',point([14,45]),{kind:'vega',name:'Dr. Vega',r:9.5,speed:220}):null;
 }
 function step(dt){
  if(phase==='title')return;
  navigation.move(player,dt);
  for(const n of nurses){
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
 const snapshot=()=>structuredClone({phase,mode,caseId,generation,player,nurses,patients,expert});
 return Object.freeze({navigation,enterLobby,enterGuard,step,snapshot,
  target:(x,y)=>phase!=='title'&&navigation.target(player,x,y),
  stop(){player.path=[];player.pathIndex=0;player.target=null;player.moving=false;},
  nearby(){return patients.filter(p=>Math.hypot(player.x-p.x,player.y-p.y)<=150).sort((a,b)=>
   Math.hypot(player.x-a.x,player.y-a.y)-Math.hypot(player.x-b.x,player.y-b.y))[0]?.uid||null;}
 });
}
