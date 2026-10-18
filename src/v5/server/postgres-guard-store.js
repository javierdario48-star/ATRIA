/**
 * Server-only Supabase/PostgREST implementation of the existing durable CAS
 * contract. SQL function atria_guard_cas performs the revision check and
 * replacement in a single PostgreSQL transaction. This module never runs in
 * the browser and does not enable C5.b until its database has been verified.
 */
const ROOM_ID=/^[A-Za-z0-9_-]{1,100}$/;
function validRoom(id){if(typeof id!=='string'||!ROOM_ID.test(id))throw Error('invalid durable room ID');}
const failure=(response,body)=>Object.assign(Error('clinical Postgres store request failed ('+response.status+')'),
 {status:response.status,code:body?.code||'database-unavailable'});
export function createPostgresGuardStore({url,secretKey,fetchImpl=globalThis.fetch}){
 if(typeof url!=='string'||typeof secretKey!=='string'||!secretKey.startsWith('sb_secret_')||typeof fetchImpl!=='function')
  throw Error('Supabase private backend URL and secret API key required');
 let origin;
 try{origin=new URL(url);}catch{throw Error('invalid Supabase origin');}
 if(origin.protocol!=='https:'||!origin.hostname.endsWith('.supabase.co')||origin.pathname!=='/'||origin.search||origin.hash)
  throw Error('Supabase backend HTTPS origin required');
 const headers={apikey:secretKey,Accept:'application/json'};
 async function request(method,path,body){
  const response=await fetchImpl(new URL(path,origin),{method,cache:'no-store',headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const raw=await response.text();let parsed;
  try{parsed=raw?JSON.parse(raw):null;}catch{throw failure(response,{code:'invalid-postgres-response'});}
  if(!response.ok)throw failure(response,parsed);
  return parsed;
 }
 return Object.freeze({
  async read(roomId){validRoom(roomId);
   const params=new URLSearchParams({room_id:'eq.'+roomId,select:'revision,state',limit:'1'});
   const rows=await request('GET','/rest/v1/atria_clinical_guards?'+params.toString());
   if(!Array.isArray(rows)||rows.length>1)throw Error('invalid clinical guard query result');
   if(rows.length===0)return null;
   const {revision,state}=rows[0];if(!Number.isSafeInteger(revision)||revision<1||!state||typeof state!=='object')
    throw Error('invalid clinical guard database record');
   return {etag:String(revision),value:structuredClone(state)};
  },
  async compareAndSwap(roomId,etag,value){validRoom(roomId);
   if(etag!==null&&(!/^[1-9][0-9]*$/.test(String(etag))||!Number.isSafeInteger(Number(etag))))
    throw Error('invalid expected clinical revision');
   if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid clinical checkpoint');
   const revision=await request('POST','/rest/v1/rpc/atria_guard_cas',{
    p_room_id:roomId,p_expected_revision:etag===null?null:Number(etag),p_state:value});
   if(revision===null)return null;
   if(!Number.isSafeInteger(revision)||revision<1)throw Error('invalid clinical CAS result');
   return String(revision);
  }
 });
}
