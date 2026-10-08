// Never equate an accepted invitation or a stale/closed peer with a usable transport.
export function roomTransportReady({room,localUserId,connected,channelState}){
 return !!(room?.allAccepted && Array.isArray(room.members) && room.members.length>=2 &&
 room.members.some(p=>p?.userId!==localUserId && p?.online===true) &&
 connected===true && channelState==='open');
}
