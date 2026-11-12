import {createHash} from 'node:crypto';
const TOKEN='qa-v1:token:',BUCKET='qa-v1:presence:',OWNED='atria-v5:presence-owned:';
const PHASES=['lobby','guard'];
const FRESH_MS=35000;
const queues=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
const bucketFor=actor=>parseInt(hash(actor).slice(0,8),16)%48;
const ownedKey=(actor,publisher,phase)=>OWNED+actor+':'+(publisher?.nonce||'device')+':'+phase;
const pageOf=row=>row?._presenceV5?.pageEpoch||0;
const publisherOf=row=>row?._presenceV5?.publisherNonce??null;
const bucketRows=value=>Array.isArray(value)?value:[];
const inBucket=(rows,actor,publisher)=>rows.find(row=>row.userId===actor&&publisherOf(row)===(publisher?.nonce??null));
export const stalePresenceWrite=Symbol('stale presence write');
export const presencePublisherKey=actor=>'atria-v5:presence-controller:'+actor;
export const presenceRevocationKey=(actor,session)=>'atria-v5:presence-revoked:'+actor+':'+session;
export const wardRoomId=value=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value)?value:null;

export function presenceActor(store,headers){
 const token=String(headers?.authorization??headers?.Authorization??'').replace(/^Bearer\s+/i,'');
 return store.get(TOKEN+hash(token));
}

function newer(a,b){
 if(!a||!b)return a||b;
 if(pageOf(a)!==pageOf(b))return pageOf(a)>pageOf(b)?a:b;
 if(a.motionEpoch!==b.motionEpoch)return a.motionEpoch>b.motionEpoch?a:b;
 if(a.motionSession===b.motionSession&&a.seq!==b.seq)return a.seq>b.seq?a:b;
 return a.lastSeen>=b.lastSeen?a:b;
}

async function ownedPresence(store,actor,publisher){
 const [lobby,guard]=await Promise.all(PHASES.map(phase=>store.get(ownedKey(actor,publisher,phase))));
 const latest=newer(lobby?.presence,guard?.presence);
 if(latest||publisher)return latest;
 return (await store.get(OWNED+actor))?.presence;
}

export async function readCurrentPresence(store,actor,now,{candidate=null,verified=false}={}){
 const publisher=await store.get(presencePublisherKey(actor));
 if(!publisher&&(verified||publisherOf(candidate)))return null;
 const [owned,shared,revoked]=await Promise.all([
  ownedPresence(store,actor,publisher),
  candidate?[candidate]:store.get(BUCKET+bucketFor(actor)),
  publisher&&store.get(presenceRevocationKey(actor,publisher.sessionId))
 ]);
 const live=newer(owned,inBucket(bucketRows(shared),actor,publisher));
 return !revoked&&live?.lastSeen>=now-FRESH_MS?live:null;
}

export function presenceStatus(row){
 if(!row)return 'desconectado';
 // Recognize earlier rows before a new, validated V5 heartbeat replaces them.
 return row._presenceV5?.phase==='guard'||/^ward-[a-f0-9]{8}-/.test(row.motionSession)?'en guardia':'disponible';
}

export function scopedMotionSession(source,{publisher,phase,pageEpoch},prefix=''){
 return prefix+hash(JSON.stringify([publisher?.nonce,phase,pageEpoch,String(source??'').slice(0,100)])).slice(0,36);
}

// The legacy bucket is a directory projection, not proof that a specific
// authenticated doctor disappeared. Each request reads/writes the doctor's
// independent presence through the same legacy validator and signal service.
export function scopedPresenceStorage(store,{publisher=null,phase='lobby',wardId=null,pageEpoch=null,leaving=false}={}){
 let actor=null,bucketKey=null;
 return {
  async get(key){
   const value=await store.get(key);
   if(key.startsWith(TOKEN)){
    actor=typeof value==='string'?value:null;bucketKey=actor?BUCKET+bucketFor(actor):null;
   }
   if(key!==bucketKey)return value;
   const rows=bucketRows(value);
   let owned=newer(await ownedPresence(store,actor,publisher),inBucket(rows,actor,publisher));
   if(owned&&pageEpoch!==null){
    if(pageEpoch<pageOf(owned))throw stalePresenceWrite;
    if(pageEpoch>pageOf(owned))owned=null;
   }
   return [...rows.filter(row=>row.userId!==actor),...(owned?[owned]:[])];
  },
  async set(key,value,options){
   if(key===bucketKey&&Array.isArray(value)){
    const presence=value.find(row=>row.userId===actor);
    if(leaving){
     await Promise.all([...PHASES.map(phase=>store.delete(ownedKey(actor,publisher,phase))),
      ...(!publisher?[store.delete(OWNED+actor)]:[])]);
    }else if(presence){
     const heartbeat={...presence,_presenceV5:{phase,wardId,pageEpoch,publisherNonce:publisher?.nonce??null}};
     const latest=await ownedPresence(store,actor,publisher);
     if(latest&&newer(latest,heartbeat)===latest)throw stalePresenceWrite;
     // Separate publishing generations and phases. An older write that was
     // already in flight cannot replace the active device or the other phase.
     await store.set(ownedKey(actor,publisher,phase),{presence:heartbeat},options);
     // A write already inside the cache can finish out of order. Keep a
     // newer shared row and merge other doctors' concurrent updates.
     const rows=bucketRows(await store.get(key)),published=inBucket(rows,actor,publisher);
     if(published&&newer(published,heartbeat)===published)throw stalePresenceWrite;
     value=[...rows.filter(row=>row.userId!==actor&&row.lastSeen>=heartbeat.lastSeen-FRESH_MS),heartbeat];
    }
   }
   return store.set(key,value,options);
  },
  delete:key=>store.delete(key)
 };
}

// Serialize only competing directory writes to the SAME bucket in a worker.
// Independent workers still authenticate against the per-doctor owned row.
// This is a storage adapter; auth, stale-sequence rules and SDP validation
// continue to belong to the existing social service.
export async function publishPresenceSerially(storage,request,run){
 const actor=await presenceActor(storage,request.headers);
 if(typeof actor!=='string')return run();
 let pending=queues.get(storage);if(!pending){pending=new Map();queues.set(storage,pending);}
 const bucket=bucketFor(actor);
 const previous=pending.get(bucket)||Promise.resolve();
 const task=previous.catch(()=>{}).then(run);pending.set(bucket,task);
 try{return await task;}finally{if(pending.get(bucket)===task)pending.delete(bucket);}
}
