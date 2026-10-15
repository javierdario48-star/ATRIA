// Read-only client projection. Network snapshots never execute clinical effects.
export function createRoomReplica(roomId){
 let revision=-1;
 let state=null;
 return Object.freeze({
  apply(snapshot){
   if(!snapshot||snapshot.roomId!==roomId||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0)
    return {applied:false,reason:'wrong-room-or-invalid-revision'};
   if(snapshot.revision<=revision)return {applied:false,reason:'stale-or-duplicate'};
   revision=snapshot.revision;
   state=structuredClone(snapshot);
   return {applied:true,revision};
  },
  snapshot:()=>state?structuredClone(state):null,
  revision:()=>revision
 });
}
