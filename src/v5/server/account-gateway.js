import {createHash,randomUUID} from 'node:crypto';
import {clinicalActorId} from './clinical-http.js';
import {scrubAppearance,socialAppearance} from '../app/avatar-appearance.js';
import {avatarAssetSpec} from '../ui/avatar-creator.js';
import {privateRoomMotionPrefix} from '../social/room-motion-scope.js';

const COOKIE='__Host-atria_v5';
const fail=(status,message)=>Object.assign(Error(message),{status});
const reply=(status,body,cookies=[])=>({status,body,cookies});
const pathOf=x=>String(x||'').replace(/^\/?(?:api\/)?/,'').split('?')[0];
export function publicAccount(a){
 const xp=Number(a.xp)||0;
 return {actorId:a.actor_id,username:a.username,name:a.name,sex:a.sex,scrubColor:a.scrub_color,
  avatar:a.avatar,xp,level:1+Math.floor(xp/200),nextLevelXP:200,xpInLevel:xp%200,
  casesResolved:Number(a.cases_resolved)||0,activeGuardId:a.active_guard_id||null,
  legacyProgressRetained:!!a.legacy_progress,
  legacyPracticeXP:a.legacy_progress?.unverified===true&&Number.isSafeInteger(a.legacy_progress.data?.xp)?Math.max(0,a.legacy_progress.data.xp):0};
}
function readCookie(headers){
 const raw=String(headers.cookie||headers.Cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 if(!raw)return null;
 try{const value=JSON.parse(Buffer.from(raw.slice(COOKIE.length+1),'base64url').toString());
  if(typeof value.access_token!=='string'||typeof value.refresh_token!=='string')throw Error();return value;
 }catch{throw fail(401,'La sesión venció. Iniciá sesión nuevamente.');}
}
function sessionCookie(tokens){
 const value=tokens?Buffer.from(JSON.stringify({access_token:tokens.access_token,refresh_token:tokens.refresh_token})).toString('base64url'):'';
 return COOKIE+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+(tokens?31536000:0);
}
function appearance(body,previous={}){
 const name=String(body.name??previous.name??'Médico').trim();
 if(name.length<2||name.length>32||/[<>\x00-\x1f]/.test(name))throw fail(400,'Elegí un nombre de 2 a 32 caracteres.');
 const a=scrubAppearance(body.scrubColor??previous.scrub_color,body.sex??previous.sex);
 return {name,sex:a.sex,scrub_color:a.color,avatar:avatarAssetSpec(a).key};
}
/** Adapts verified Supabase sessions to the existing social owner. The private
 * bridge token never leaves the server or authenticates a browser. */
export function createAccountGateway({backend,legacy,storage}){
 const publisherKey=id=>'atria-v5:presence-controller:'+id;
 async function claimPublisher(identity){
  const old=await storage.get(publisherKey(identity.actorId));
  const value={sessionId:identity.sessionId,nonce:randomUUID(),epoch:Math.max(Date.now(),(old?.epoch||0)+1),clientEpoch:0,source:null};
  await storage.set(publisherKey(identity.actorId),value,{ttl:604800});return value;
 }
 async function publishLogin(identity){
  if(!identity.account.active_guard_id)await claimPublisher(identity);
 }
 async function throttle(request,kind){
  const ip=String(request.headers?.['x-vercel-forwarded-for']||request.headers?.['x-forwarded-for']||'local').split(',')[0].trim();
  const key='atria-v5:auth-rate:'+kind+':'+createHash('sha256').update(ip).digest('hex');
  const now=Date.now(),period=kind==='register'?3600000:600000,limit=kind==='register'?5:12;
  const old=await storage.get(key),attempts=(Array.isArray(old)?old:[]).filter(t=>now-t<period);
  if(attempts.length>=limit)throw fail(429,'Demasiados intentos. Esperá unos minutos antes de reintentar.');
  await storage.set(key,[...attempts,now],{ttl:period/1000});
 }
 async function authenticate(headers={}){
  const tokens=readCookie(headers);if(!tokens)return null;
  let cookies=[];
  try{const verified=await backend.validateSession(tokens);
   cookies=verified.tokens.access_token!==tokens.access_token?[sessionCookie(verified.tokens)]:[];
   const account=await backend.byAuth(verified.userId);
   if(!account)throw fail(401,'Cuenta médica no disponible.');
   return {...verified,account,actorId:account.actor_id,cookies};
  }catch(error){error.cookies=error.refreshedTokens?[sessionCookie(error.refreshedTokens)]:cookies;throw error;}
 }
 async function socialHeaders(identity){
  const a=identity.account,token=a.social_token;
  await Promise.all([
   storage.set('qa-v1:token:'+createHash('sha256').update(token).digest('hex'),a.actor_id,{ttl:60}),
   storage.set('qa-v1:user:'+a.actor_id,{id:a.actor_id,handle:a.username,name:a.name,createdAt:a.created_at})
  ]);
  return {authorization:'Bearer '+token};
 }
 async function resolve(request){
  const identity=await authenticate(request.headers);
  if(identity){try{return {identity,headers:await socialHeaders(identity)};}
   catch(error){error.cookies=identity.cookies;throw error;}}
  const who=await legacy.route({method:'GET',path:'me',headers:request.headers});
  if(who.status===200&&await backend.byActor(who.body.user.id))throw fail(401,'Esta identidad requiere iniciar sesión con contraseña.');
  return {identity:null,headers:request.headers};
 }
 async function summary(identity,project=false){
  if(project){await backend.award(identity.actorId);identity.account=await backend.byAuth(identity.account.auth_user_id);}
  return publicAccount(identity.account);
 }
 async function route(request){
  const path=pathOf(request.path),method=request.method||'GET',body=request.body||{};
  let pendingCookies=[];
  try{
   if(path==='account/session'&&method==='GET'&&!readCookie(request.headers||{}))return reply(200,{account:null});
   if(path==='account/register'&&method==='POST'){
    await throttle(request,'register');
    const username=String(body.username||'').trim().toLowerCase(),password=body.password;
    if(!/^[a-z][a-z0-9_]{2,23}$/.test(username)||typeof password!=='string'||password.length<12||password.length>128)
     throw fail(400,'Usá un usuario de 3–24 letras, números o guion bajo y una contraseña de 12–128 caracteres.');
    const actorId=clinicalActorId(body.clientKey),look=appearance(body);
    if(await backend.byActor(actorId)||await backend.byUsername(username))throw fail(409,'La identidad o el usuario ya tiene una cuenta. Iniciá sesión.');
    const old=await storage.get('qa-v1:user:'+actorId),user=await backend.createIdentity(username,password);
    let account;
    try{account=await backend.insertAccount({auth_user_id:user.id,actor_id:actorId,username,...look,
     legacy_key:body.clientKey,social_token:randomUUID()+'-'+randomUUID(),xp:0,cases_resolved:0,
     legacy_progress:body.legacyProgress&&typeof body.legacyProgress==='object'?{unverified:true,data:body.legacyProgress}:null,
     created_at:old?.createdAt?new Date(old.createdAt).toISOString():new Date().toISOString()});}
    catch(error){await backend.removeIdentity?.(user.id);throw error;}
    const tokens=await backend.passwordSession(username,password);pendingCookies=[sessionCookie(tokens)];
    const verified=await backend.validateSession(tokens);
    const identity={...verified,actorId,account};await socialHeaders(identity);
    await publishLogin(identity);
    return reply(200,{account:await summary(identity,true)},[sessionCookie(tokens)]);
   }
   if(path==='account/login'&&method==='POST'){
    await throttle(request,'login');
    const username=String(body.username||'').trim().toLowerCase();
    if(!/^[a-z][a-z0-9_]{2,23}$/.test(username)||typeof body.password!=='string'||body.password.length>128)throw fail(401,'Usuario o contraseña incorrectos.');
    const tokens=await backend.passwordSession(username,body.password);pendingCookies=[sessionCookie(tokens)];
    const verified=await backend.validateSession(tokens),account=await backend.byAuth(verified.userId);
    if(!account)throw fail(401,'Usuario o contraseña incorrectos.');
    const identity={...verified,account,actorId:account.actor_id};await socialHeaders(identity);
    await publishLogin(identity);
    return reply(200,{account:await summary(identity,true)},[sessionCookie(tokens)]);
   }
   if(path==='lobby/state'&&method==='POST')return signalRoute({...request,body:{presence:body}});
   const {identity,headers}=await resolve(request);
   pendingCookies=identity?.cookies||[];
   if(path.startsWith('account/')){
    if(!identity)throw fail(401,'Iniciá sesión para acceder a tu cuenta.');
    if(path==='account/session'&&method==='GET')return reply(200,{account:await summary(identity,true)},identity.cookies);
    if(path==='account/logout'&&method==='POST'){
     await backend.rpc('atria_v5_set_active_guard',{p_actor_id:identity.actorId,p_room_id:null,p_session_id:identity.sessionId});
     await backend.logout(identity.tokens);
     if((await storage.get(publisherKey(identity.actorId)))?.sessionId===identity.sessionId)await storage.delete(publisherKey(identity.actorId));
     return reply(200,{ok:true},[sessionCookie(null)]);
    }
    if(path==='account/profile'&&method==='POST'){
     identity.account=await backend.updateAccount(identity.account.auth_user_id,appearance(body,identity.account));
     await socialHeaders(identity);return reply(200,{account:await summary(identity)},identity.cookies);
    }
    if(path==='account/use-device'&&method==='POST'){
     if(identity.account.active_guard_id&&identity.account.controller_session_id!==identity.sessionId)throw fail(409,'Recuperá primero la guardia para usar este dispositivo.');
     await claimPublisher(identity);return reply(200,{ok:true},identity.cookies);
    }
    if(['account/release-guard','account/take-control'].includes(path)&&method==='POST'){
     const take=path.endsWith('take-control');
     const ok=await backend.rpc(take?'atria_v5_take_control':'atria_v5_set_active_guard',{
      p_actor_id:identity.actorId,p_session_id:identity.sessionId,...(take?{}:{p_room_id:null})});
     if(!ok)throw fail(409,'La guardia está controlada desde otro dispositivo.');
     if(take)await claimPublisher(identity);
     return reply(200,{ok:true},identity.cookies);
    }
    throw fail(404,'Operación de cuenta inexistente.');
   }
   if(['register','resume'].includes(path)&&method==='POST'){
    if(identity)return reply(200,{user:{id:identity.actorId,name:identity.account.name,handle:identity.account.username},token:null,account:await summary(identity)},identity.cookies);
    if(await backend.byActor(clinicalActorId(body.clientKey)))throw fail(401,'Esta identidad requiere iniciar sesión con contraseña.');
   }
   if(path.startsWith('profiles/')&&method==='GET'){
    const viewer=identity?.actorId||(await legacy.route({method:'GET',path:'me',headers})).body?.user?.id;
    if(!viewer)throw fail(401,'Iniciá sesión para consultar perfiles.');
    const id=path.slice(9);if(!/^qa_[0-9a-f]{30}$/.test(id))throw fail(404,'Médico no encontrado.');
    const a=await backend.byActor(id);
    if(!a){const profile=await legacy.readPlayerProfile(id,viewer);
     if(!profile)throw fail(404,'Médico no encontrado.');return reply(200,{profile},identity?.cookies);}
    const [friends,live]=await Promise.all([storage.get('qa-v1:friends:'+id),legacy.roster()]);
    const online=live.some(p=>p.userId===id),s=publicAccount(a);
    delete s.activeGuardId;delete s.legacyProgressRetained;delete s.legacyPracticeXP;
    return reply(200,{profile:{...s,verified:!!a,friendsCount:Array.isArray(friends)?friends.length:0,
     status:online?(a?.active_guard_id?'en guardia':'disponible'):'desconectado',self:viewer===id}},identity?.cookies);
   }
   const result=await legacy.route({...request,headers});
   if(identity&&path==='me'&&result.status===200)result.body.account=await summary(identity);
   return {...result,cookies:identity?.cookies||[]};
  }catch(error){return reply(error.status||503,{error:error.status?error.message:'No se pudo acceder a la cuenta. Intentá nuevamente.'},error.cookies||pendingCookies);}
 }
 async function signalRoute(request){
  let pendingCookies=[];
  try{const {identity,headers}=await resolve(request);pendingCookies=identity?.cookies||[];let body=request.body;
   if(identity){
    let publisher=await storage.get(publisherKey(identity.actorId));
    const controller=identity.account.active_guard_id?identity.account.controller_session_id:publisher?.sessionId;
    if(controller&&controller!==identity.sessionId)return reply(200,{ok:true,observer:true,signal:null},identity.cookies);
    if(!publisher||publisher.sessionId!==identity.sessionId)publisher=await claimPublisher(identity);
    if(body?.presence){
     const p=body.presence;
     if(publisher.source!==p.motionSession){
      if(publisher.source&&Number(p.motionEpoch)<=publisher.clientEpoch)return reply(200,{ok:true,stale:true},identity.cookies);
      publisher={...publisher,source:p.motionSession,clientEpoch:Number(p.motionEpoch)||0,nonce:randomUUID(),epoch:Math.max(Date.now(),publisher.epoch+1)};
      await storage.set(publisherKey(identity.actorId),publisher,{ttl:604800});
     }
     body={...body,presence:{...p,
      motionSession:(p.phase==='guard'?privateRoomMotionPrefix(identity.account.active_guard_id):'')+publisher.nonce,motionEpoch:publisher.epoch,
      level:publicAccount(identity.account).level,color:socialAppearance(identity.account.scrub_color,identity.account.sex)}};
    }
   }
   return {...await legacy.signalRoute({...request,headers,body}),cookies:identity?.cookies||[]};
  }catch(error){return reply(error.status||503,{error:error.status?error.message:'Servicio social no disponible.'},error.cookies||pendingCookies);}
 }
 return Object.freeze({route,signalRoute,authenticate,socialHeaders});
}
