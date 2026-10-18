/** Private Vercel Blob: origin-consistent reads + atomic ETag preconditions.
 * Server-only. An access mismatch fails; never fall back to public/cache/memory.
 * https://vercel.com/docs/vercel-blob/using-blob-sdk */
export function createPrivateBlobGuardStore({get,put,BlobPreconditionFailedError}){
 const path=id=>{if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(id))throw Error('invalid durable room ID');return 'atria-v5/clinical-v1/'+id+'.json';};
 return Object.freeze({
  async read(id){const result=await get(path(id),{access:'private',useCache:false});if(!result)return null;
   if(result.statusCode!==200||!result.blob.etag||!new URL(result.blob.url).hostname.endsWith('.private.blob.vercel-storage.com'))throw Error('consistent private Blob required');
   return {etag:result.blob.etag,value:JSON.parse(await new Response(result.stream).text())};
  },
  async compareAndSwap(id,etag,value){try{
   const result=await put(path(id),JSON.stringify(value),{access:'private',addRandomSuffix:false,
    contentType:'application/json',...(etag?{allowOverwrite:true,ifMatch:etag}:{allowOverwrite:false})});
   if(!result.etag||!new URL(result.url).hostname.endsWith('.private.blob.vercel-storage.com'))throw Error('private Blob required');
   return result.etag;
  }catch(error){if(error instanceof BlobPreconditionFailedError||error?.name==='BlobPreconditionFailedError')return null;
   // A first-create race (or a lost successful first response) is reconciled
   // through the same origin-consistent private read, never an overwrite.
   if(etag===null){const existing=await this.read(id);if(existing)return null;}
   throw error;}}
 });
}
