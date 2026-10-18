import * as blob from '@vercel/blob';
import {getCache} from '@vercel/functions';
import {createQaSocialServer} from '../src/social/qa-social-server.js';
import {createPrivateBlobGuardStore} from '../src/v5/server/private-blob-guard-store.js';
import {createDurableGuardAuthority} from '../src/v5/server/durable-guard-authority.js';
import {createClinicalHttp} from '../src/v5/server/clinical-http.js';
import {clinicalContent} from '../src/v5/server/content.js';
const store=createPrivateBlobGuardStore(blob),authority=createDurableGuardAuthority({store,content:clinicalContent});
const social=createQaSocialServer(getCache(undefined,'atria-social-qa-v1',':'));
const route=createClinicalHttp({authority,
 onUnavailable(error,action){if(action==='capability')console.error('ATRIA durable storage capability failed',
  error?.name||'Error',String(error?.message||'').replace(/vercel_blob_[a-z_]+_[A-Za-z0-9_-]+/gi,'[redacted]').slice(0,400));},
 async verifiedRoom(headers,roomId,actorId){
  const me=await social.route({method:'GET',path:'/api/me',headers});if(me.status!==200||me.body.user.id!==actorId)return null;
  const result=await social.route({method:'GET',path:'/api/rooms/'+roomId+'/messages',headers,query:{after:0}});
  return result.status===200?result.body.room:null;
 },
 async probe(){
  const id='storage-capability',seed={kind:'atria-private-cas-probe',counter:0};
  await store.compareAndSwap(id,null,seed);const before=await store.read(id);if(!before)throw Error('private Blob read unavailable');
  const value={...seed,counter:before.value.counter+1};const etag=await store.compareAndSwap(id,before.etag,value);
  if(!etag||await store.compareAndSwap(id,before.etag,seed)!==null)throw Error('atomic Blob precondition unavailable');
  const after=await store.read(id);if(after.etag!==etag||after.value.counter!==value.counter)throw Error('consistent Blob read unavailable');
  return {durable:true,kind:'private-blob-etag-cas',schemaVersion:1};
 }});
export default async function clinical(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
 const origin=req.headers?.origin,host=req.headers?.host;
 if(origin){try{if(new URL(origin).host!==host)throw Error('origin');}catch{res.statusCode=403;res.end(JSON.stringify({error:'invalid origin'}));return;}}
 try{
  let body=req.body??{};if(Buffer.isBuffer(body))body=body.toString('utf8');
  if(typeof body==='string'){if(Buffer.byteLength(body)>16000){res.statusCode=413;res.end(JSON.stringify({error:'request too large'}));return;}body=JSON.parse(body||'{}');}
  if(JSON.stringify(body).length>16000){res.statusCode=413;res.end(JSON.stringify({error:'request too large'}));return;}
  const result=await route({method:req.method,headers:req.headers,body});res.statusCode=result.status;res.end(JSON.stringify(result.body));
 }catch{res.statusCode=400;res.end(JSON.stringify({error:'invalid clinical request'}));}
}
