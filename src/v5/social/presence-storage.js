import {createHash} from 'node:crypto';
const TOKEN='qa-v1:token:',BUCKET='qa-v1:presence:',OWNED='atria-v5:presence-owned:';
const queues=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');

// The legacy bucket is a directory projection, not proof that a specific
// authenticated doctor disappeared. Each request reads/writes the doctor's
// independent presence through the same legacy validator and signal service.
export function scopedPresenceStorage(store){
 let actor=null;
 return {
  async get(key){
   const value=await store.get(key);
   if(key.startsWith(TOKEN))actor=typeof value==='string'?value:null;
   if(!actor||!key.startsWith(BUCKET))return value;
   const owned=await store.get(OWNED+actor);
   if(owned?.bucketKey!==key)return value;
   return [...(Array.isArray(value)?value:[]).filter(row=>row.userId!==actor),owned.presence];
  },
  async set(key,value,options){
   if(actor&&key.startsWith(BUCKET)&&Array.isArray(value)){
    const presence=value.find(row=>row.userId===actor);
    if(presence)await store.set(OWNED+actor,{bucketKey:key,presence},options);
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
 const token=String(request.headers?.authorization??request.headers?.Authorization??'').replace(/^Bearer\s+/i,'');
 const actor=await storage.get(TOKEN+hash(token));
 if(typeof actor!=='string')return run();
 let pending=queues.get(storage);if(!pending){pending=new Map();queues.set(storage,pending);}
 const bucket=parseInt(hash(actor).slice(0,8),16)%48;
 const previous=pending.get(bucket)||Promise.resolve();
 const task=previous.catch(()=>{}).then(run);pending.set(bucket,task);
 try{return await task;}finally{if(pending.get(bucket)===task)pending.delete(bucket);}
}
