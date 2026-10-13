import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';

const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const lobbyStart=html.indexOf('function tick(t){const dt=Math.max(0,Math.min(.08,(t-state.lastTick)/1000))');
const lobbyEnd=html.indexOf('requestAnimationFrame(tick)}requestAnimationFrame(tick);',lobbyStart);
assert(lobbyStart>=0&&lobbyEnd>lobbyStart,'compiled primary lobby tick found');
const lobbySource=html.slice(lobbyStart,lobbyEnd+'requestAnimationFrame(tick)}requestAnimationFrame(tick);'.length);
const remote={x:10,y:20,_tx:150,_ty:20,_vx:0,_vy:0,_seen:0,dir:'E',moving:true,walkPhase:0};
const lobby={active:true,lastTick:0,players:new Map([['FRIEND',remote]]),demo:true,_lastSocial:999999};
const context={state:lobby,player:{path:[],pathIndex:0,target:null,moving:false},advanceActor(){},window:{nsLobbyRtcPulse(){}},
 performance:{now:()=>time},requestAnimationFrame(){},C:null,sim:null,csV41Challenge:{active:false},Math,Number};
let time=0;vm.createContext(context);vm.runInContext(html.match(/<script id="atria-remote-motion-487">([\s\S]*?)<\/script>/)[1],context);vm.runInContext(lobbySource,context);
let seq=1;context.seed={...remote,peerId:'FRIEND',motionSession:'FRIEND',motionAt:0,seq,motionCadence:100};vm.runInContext("state.players.get('FRIEND')._motion=csMotionReceive487(null,seed,'rtc',0,100)",context);
for(let frame=1;frame<=100;frame++){time=frame*16;if(frame%6===0){context.seed={...context.seed,x:10+time*.1,motionAt:time,seq:++seq};vm.runInContext("csMotionReceive487(state.players.get('FRIEND')._motion,seed,'rtc',performance.now(),100)",context)}context.tick(time)}
assert(remote.x>100,'remote position follows network target');
assert(Math.abs(remote.walkPhase-(remote.x-10)/18)<0.00001,'remote stride advances by actual displayed distance / 18, like advanceActor');
assert(remote.walkPhase>4,'feet must visibly animate while remotely traveling');
context.seed={...context.seed,motionAt:time+1,seq:++seq,moving:false};vm.runInContext("csMotionReceive487(state.players.get('FRIEND')._motion,seed,'rtc',performance.now()+1,100)",context);
for(let frame=101;frame<130;frame++){time=frame*16;context.tick(time)}
const stoppedPhase=remote.walkPhase;
for(let frame=130;frame<146;frame++){time=frame*16;context.tick(time)}
assert.equal(remote.walkPhase,stoppedPhase,'stationary remote actor does not walk in place');
assert.equal(remote.moving,false,'remote actor stops stepping when visually stationary');

const marker='csDrawRemote=function(){if(!shared())';
const adapter=html.match(/<script id="atria-guard-remote-adapter-487">([\s\S]*?)<\/script>/)[1];
const drawStart=adapter.indexOf(marker),drawEnd=adapter.indexOf('// remote renderer end',drawStart);
assert(drawStart>=0&&drawEnd>drawStart,'compiled shared guard render function found');
const renderSource=adapter.slice(drawStart,drawEnd).trim();
const players={
 SELF:{peerId:'SELF',userId:'account-self',roomId:'CS_GUARD',name:'Yo',x:80,y:60,dir:'E',moving:true,walkPhase:100,coat:false},
 OTHER:{peerId:'OTHER',userId:'account-other',roomId:'CS_GUARD',name:'Amigo',x:120,y:60,dir:'E',moving:true,walkPhase:0,coat:false,stateSeq:1,motionAt:0,motionSession:'CS_GUARD:OTHER',motionCadence:192}
};
players.OUTSIDER={...players.OTHER,peerId:'OUTSIDER',roomId:'OTHER_GUARD',name:'Otra guardia',x:600};
const actors=[],names=[],face={complete:true};
let drawTime=0;
const guard={csDrawRemote:null,csSharedRemotePose:new Map(),csCoop:{remotes:players},challenge:{id:'CS_GUARD'},selfId:'SELF',shared:()=>true,oldRemoteDraw(){},
 performance:{now:()=>drawTime},window:{nsSocial:{state:()=>({user:{id:'account-self'}})}},
 csVariantImgs:{navy:face},drawSprite:(img,actor)=>actors.push({...actor}),csDrawNameplate:(actor,name)=>names.push(name),
 Map,Set,Object,Number,String,Math};
vm.createContext(guard);vm.runInContext(html.match(/<script id="atria-remote-motion-487">([\s\S]*?)<\/script>/)[1],guard);vm.runInContext('csDrawRemote=null; const csSharedRemotePose=new Map();\n'+renderSource,guard);
let movingFrames=0,phaseStart=null,phaseEnd=null;
for(let frame=0;frame<120;frame++){
 drawTime=frame*16;
 if(frame>0&&frame%12===0){players.OTHER.x+=26;players.OTHER.motionAt=drawTime;players.OTHER.stateSeq++;}
 const prior=actors.length;
 guard.csDrawRemote();
 assert.equal(actors.length-prior,1,'guard draws exactly one remote; self echo is never drawn');
 assert.equal(names.at(-1),'Amigo','only genuine companion nameplate is drawn');
 const actor=actors.at(-1);
 if(phaseStart===null)phaseStart=actor.walkPhase;
 phaseEnd=actor.walkPhase;
 if(actor.moving)movingFrames++;
}
assert(movingFrames>25,'rendered movement activates remote walking animation');
assert(phaseEnd>phaseStart+1,'guard remote stride accumulates traveled pixels');
const hold=players.OTHER.x;
for(let frame=120;frame<165;frame++){drawTime=frame*16;guard.csDrawRemote()}
assert.equal(players.OTHER.x,hold);
assert.equal(actors.at(-1).moving,false,'remote stops foot motion after interpolation settles');
// Independent guards can contain the same peer identifier without sharing
// buffered positions or gait. Foreign-room actors never enter this renderer.
guard.challenge.id='NEXT_GUARD';Object.assign(players.OTHER,{roomId:'NEXT_GUARD',x:700,motionAt:0,stateSeq:1,motionSession:'NEXT_GUARD:OTHER'});
drawTime+=16;const beforeRoomSwitch=actors.length;guard.csDrawRemote();
assert.equal(actors.length-beforeRoomSwitch,1,'only the current guard companion is rendered');
assert.equal(actors.at(-1).x,700,'another guard starts from its actual pose rather than a prior room buffer');
assert.equal(actors.at(-1).walkPhase,0,'another guard does not inherit prior footsteps');
assert.deepEqual(Array.from(vm.runInContext('[...csSharedRemotePose.keys()]',guard)),['NEXT_GUARD:OTHER'],'retired room buffers are released');
assert(html.includes("if(packet?.type==='state'&&m.userId===own)continue"),'authenticated server self echo filtered before legacy receive');
console.log('ATRIA REMOTE AVATAR ANIMATION QA BOT PASS',JSON.stringify({lobbyFrames:115,guardFrames:165,actorsDrawnPerGuardFrame:1,guardMovingFrames:movingFrames,hostEchoExcluded:true,phaseDrivesVisibleDistance:true}));
