/** Non-clinical, repeatable verification of the durable CAS store.
 * A shared bounded probe row avoids unbounded storage growth. A concurrent
 * capability request may supersede our revision, but not invalidate its CAS.
 */
const ROOM='storage-capability',MARKER='atria-private-cas-probe';
export function createClinicalStoreProbe({store,kind,maxAttempts=16}){
 if(typeof store?.read!=='function'||typeof store?.compareAndSwap!=='function'
    ||typeof kind!=='string'||!kind||!Number.isInteger(maxAttempts)||maxAttempts<1)
  throw Error('durable capability probe requires a CAS store');
 return async function probe(){
  for(let attempt=0;attempt<maxAttempts;attempt++){
   const before=await store.read(ROOM);
   if(!before){
    await store.compareAndSwap(ROOM,null,{kind:MARKER,counter:0});
    continue;
   }
   const counter=before.value?.counter;
   if(before.value?.kind!==MARKER||!Number.isSafeInteger(counter)||counter<0
       ||!Number.isSafeInteger(counter+1))
    throw Error('invalid clinical capability checkpoint');
   const next={kind:MARKER,counter:counter+1};
   const revision=await store.compareAndSwap(ROOM,before.etag,next);
   if(!revision)continue;
   if(await store.compareAndSwap(ROOM,before.etag,{kind:MARKER,counter})!==null)
    throw Error('atomic durability precondition unavailable');
   const after=await store.read(ROOM);
   if(!after||after.value?.kind!==MARKER||!Number.isSafeInteger(after.value.counter)
       ||after.value.counter<next.counter)
    throw Error('consistent durability read unavailable');
   return {durable:true,kind,schemaVersion:1};
  }
  throw Error('clinical storage capability busy; retry');
 };
}
