import * as blob from '@vercel/blob';
import {socialService as social,accountBackend,accountGateway} from './_accounts.js';
import {createPrivateBlobGuardStore} from '../src/v5/server/private-blob-guard-store.js';
import {createPostgresGuardStore} from '../src/v5/server/postgres-guard-store.js';
import {createDurableGuardAuthority} from '../src/v5/server/durable-guard-authority.js';
import {createClinicalHttp,clinicalActorId} from '../src/v5/server/clinical-http.js';
import {publicAccount} from '../src/v5/server/account-gateway.js';
import {createClinicalStoreProbe} from '../src/v5/server/clinical-store-probe.js';
import {clinicalContent} from '../src/v5/server/content.js';
// C5.b.2: the Postgres store is selected only if BOTH server-only secrets
// are present. Clinical requests remain disabled until replica migration.
const sqlConfigured=!!process.env.SUPABASE_URL&&!!process.env.SUPABASE_SECRET_KEY;
const store=sqlConfigured?createPostgresGuardStore({
 url:process.env.SUPABASE_URL,secretKey:process.env.SUPABASE_SECRET_KEY
}):createPrivateBlobGuardStore(blob);
// Match api/_core.js: verified clinical admission must see guest acceptance
// in the dedicated membership slots, not the host-only legacy room record.
function routeFor(identity){
 const scopedStore=identity?createPostgresGuardStore({url:process.env.SUPABASE_URL,
  secretKey:process.env.SUPABASE_SECRET_KEY,accountSession:identity}):store;
 return createClinicalHttp({authority:createDurableGuardAuthority({store:scopedStore,content:clinicalContent}),
 resolveActor:accountGateway?async({body})=>{
  if(identity)return {...identity,id:identity.actorId};
  if(await accountBackend.byActor(clinicalActorId(body.clientKey)))
   throw Object.assign(Error('account login required'),{status:401});
  return null;
 }:null,
 async memberProfile(member){
  const a=accountBackend?await accountBackend.byActor(member.id):null;
  if(identity&&!a)throw Object.assign(Error('Todos los médicos deben vincular su cuenta antes de esta guardia.'),{code:'invalid'});
  return a?{...member,name:a.name,sex:a.sex,scrubColor:a.scrub_color,level:publicAccount(a).level}:member;
 },
 async beforeTransact({roomId}){
  if(identity?.account.active_guard_id&&identity.account.active_guard_id!==roomId)
   throw Object.assign(Error('Tu cuenta ya tiene una guardia activa.'),{code:'busy'});
 },
 async afterTransact({roomId}){
  if(!identity)return null;
  await accountBackend.award(identity.actorId,roomId);
  return publicAccount(await accountBackend.byAuth(identity.account.auth_user_id));
 },
 // C5.b.3: activation requires an explicit Preview-only server variable.
 // Production is always disabled, even if the variable is accidentally set.
 enabled:process.env.VERCEL_ENV==='preview'&&process.env.ATRIA_DURABLE_COOP_ENABLED==='1',
 onUnavailable(error,action){if(action==='capability')console.error('ATRIA durable storage capability failed',
  error?.name||'Error',String(error?.message||'').replace(/vercel_blob_[a-z_]+_[A-Za-z0-9_-]+/gi,'[redacted]').slice(0,400));},
 async verifiedRoom(headers,roomId,actorId){
  const me=await social.route({method:'GET',path:'/api/me',headers});if(me.status!==200||me.body.user.id!==actorId)return null;
  const result=await social.route({method:'GET',path:'/api/rooms/'+roomId+'/messages',headers,query:{after:0}});
  return result.status===200?result.body.room:null;
 },
 probe:createClinicalStoreProbe({store,kind:sqlConfigured?'postgres-atomic-cas':'private-blob-etag-cas'})});
}
export default async function clinical(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
 const origin=req.headers?.origin,host=req.headers?.host;
 if(origin){try{if(new URL(origin).host!==host)throw Error('origin');}catch{res.statusCode=403;res.end(JSON.stringify({error:'invalid origin'}));return;}}
 try{
  let body=req.body??{};if(Buffer.isBuffer(body))body=body.toString('utf8');
  if(typeof body==='string'){if(Buffer.byteLength(body)>16000){res.statusCode=413;res.end(JSON.stringify({error:'request too large'}));return;}body=JSON.parse(body||'{}');}
  if(JSON.stringify(body).length>16000){res.statusCode=413;res.end(JSON.stringify({error:'request too large'}));return;}
  const identity=accountGateway?await accountGateway.authenticate(req.headers):null;
  const result=await routeFor(identity)({method:req.method,headers:req.headers,body});
  if(identity?.cookies?.length)res.setHeader('Set-Cookie',identity.cookies);
  res.statusCode=result.status;res.end(JSON.stringify(result.body));
 }catch(error){res.statusCode=error.status||400;res.end(JSON.stringify({error:error.status===401?'Sesión vencida. Iniciá sesión.':'invalid clinical request'}));}
}
