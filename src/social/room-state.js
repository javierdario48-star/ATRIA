export const ROOM_STATES=Object.freeze({LOBBY:'lobby',READY:'ready',STARTING:'starting',ACTIVE:'active',ENDED:'ended'});
export function roomReducer(state,event){
 const s={...state,players:[...(state.players||[])],startAcks:[...(state.startAcks||[])]};
 switch(event.type){
  case'JOIN':if(!s.players.includes(event.id))s.players.push(event.id);return s;
  case'LEAVE':s.players=s.players.filter(x=>x!==event.id);s.startAcks=s.startAcks.filter(x=>x!==event.id);if(s.players.length<2&&s.phase==='starting'){s.phase=s.players.length?'ready':'lobby';s.startToken=null;s.startAcks=[]}else if(s.players.length<2&&s.phase==='active')s.phase='ended';return s;
  case'READY':s.phase=s.players.length>=2?'ready':'lobby';return s;
  case'START':if(s.players.length<2)throw new Error('need at least two players');s.phase='starting';s.startToken=event.token;s.startAcks=[];return s;
  case'ACK_START':{if(s.phase!=='starting'||event.token!==s.startToken||!s.players.includes(event.id))return s;const a=new Set(s.startAcks);a.add(event.id);s.startAcks=[...a];if(s.players.every(id=>a.has(id)))s.phase='active';return s}
  case'START_TIMEOUT':if(s.phase==='starting'){s.phase=s.players.length>=2?'ready':'lobby';s.startAcks=[];s.startToken=null;}return s;
  case'END':s.phase='ended';return s;
  default:return s;
 }
}
