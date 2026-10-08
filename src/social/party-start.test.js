import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {apply487} from '../integration/apply-487.js';

const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const start=html.indexOf('window.nsLobbyPartyPacket=function('),end=html.indexOf('function maybeAutoStart(){',start);
assert(start>=0&&end>start,'actual integrated multiplayer start-ack functions must exist');
const source=html.slice(start,end);
let successes=0,rejections=0,ackPackets=0;
function client(userId,room,send){
 const state={active:true,partyHandshake:null,status:''},timers=[];
 const ctx={window:{},state,csCoop:{dc:{readyState:'open',send}},uid:()=>userId,
  social:()=>({room}),setTimeout:fn=>{timers.push(fn);return timers.length},
  Date,Math,JSON,Set,renderHud(){}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,state,timers,sendPacket:(packet,from)=>ctx.window.nsLobbyPartyPacket(packet,from,room.id),start:()=>ctx.waitForPartyAcknowledgement(room.id)};
}
for(let i=0;i<120;i++){
 const hostId=i%2?'B':'A',guestId=i%2?'A':'B',mode=i%2?'competitive':'coop';
 const roomId='room-'+i,base={id:roomId,hostUserId:hostId,allAccepted:true,mode,
  members:[{userId:hostId,online:true,accepted:true},{userId:guestId,online:true,accepted:true}]};
 const hostRoom={...base,role:'host'},guestRoom={...base,role:'guest'};
 const toGuest=[],toHost=[];
 const h=client(hostId,hostRoom,msg=>toGuest.push(JSON.parse(msg)));
 const g=client(guestId,guestRoom,msg=>toHost.push(JSON.parse(msg)));
 const wait=h.start();assert.equal(toGuest.length,1,'host emits one prepare before entering');
 const prep=toGuest.shift();
 assert.equal(prep.type,'atria_party_prepare');
 assert.equal(prep.roomId,roomId);
 // Wrong sender/room/mode cannot coerce the guest to acknowledge.
 g.sendPacket({...prep,mode:mode==='coop'?'competitive':'coop'},hostId);
 g.sendPacket(prep,'intruder');assert.equal(toHost.length,0,'unverified prepares rejected');
 g.sendPacket(prep,hostId);assert.equal(toHost.length,1,'genuine host prepare elicits guest ACK');
 const ack=toHost.shift();ackPackets++;
 assert.equal(ack.token,prep.token);assert.equal(ack.type,'atria_party_ready');
 h.sendPacket({...ack,token:'wrong'},guestId);
 h.sendPacket(ack,'intruder');
 assert(h.state.partyHandshake,'spoofed ACK must not release host');
 h.sendPacket(ack,guestId);
 assert.equal(await wait,true,'host transitions only after valid guest ACK');
 assert.equal(h.state.partyHandshake,null);
 // Duplicate stale ACK cannot resurrect a settled handshake.
 h.sendPacket(ack,guestId);assert.equal(h.state.partyHandshake,null);
 successes++;
}
for(let i=0;i<24;i++){
 const room={id:'timeout-'+i,hostUserId:'H',allAccepted:true,mode:'coop',role:'host',members:[{userId:'H'},{userId:'G'}]};
 const h=client('H',room,()=>{}),waiting=h.start();
 assert(h.state.partyHandshake,'handshake pending until guest response');
 for(const fn of h.timers)fn();
 assert.equal(await waiting,false,'unacknowledged start must not proceed');
 assert.equal(h.state.partyHandshake,null);
 rejections++;
}
console.log('ATRIA TWO-CLIENT GUARD START BOT PASS',JSON.stringify({acknowledged:successes,timedOut:rejections,ackPackets,roleReversals:60,modes:['coop','competitive'],scope:'two isolated JS clients + actual integrated event handlers; network/browser simulated'}));
