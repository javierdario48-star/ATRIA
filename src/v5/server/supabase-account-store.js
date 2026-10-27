const error=(status,message)=>Object.assign(Error(message),{status});
const SELECT='auth_user_id,actor_id,username,name,sex,scrub_color,avatar,legacy_key,social_token,xp,cases_resolved,legacy_progress,active_guard_id,controller_session_id,created_at';
/** Private REST adapter. Passwords go directly to Supabase Auth, never to
 * application tables, logs, browser storage, or returned profiles. */
export function createSupabaseAccountStore({url,secretKey,fetchImpl=globalThis.fetch}){
 const origin=new URL(url);
 if(origin.protocol!=='https:'||!origin.hostname.endsWith('.supabase.co')||origin.pathname!=='/'||!secretKey?.startsWith('sb_secret_'))throw Error('private Supabase configuration required');
 async function request(path,{method='GET',body,accessToken,prefer}={}){
  const response=await fetchImpl(new URL(path,origin),{method,cache:'no-store',headers:{apikey:secretKey,
   ...(body?{'Content-Type':'application/json'}:{}),...(accessToken?{Authorization:'Bearer '+accessToken}:{}),...(prefer?{Prefer:prefer}:{})},
   ...(body?{body:JSON.stringify(body)}:{})});
  const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{throw error(503,'Respuesta de cuenta inválida.');}
  if(!response.ok)throw error(response.status===401||response.status===400&&path.includes('/token')?401:data?.code==='23505'?409:response.status>=500?503:400,
   path.startsWith('/auth/')?'Usuario o contraseña incorrectos.':'No se pudo guardar la cuenta.');
  return data;
 }
 const one=async(field,value)=>(await request('/rest/v1/atria_v5_accounts?'+new URLSearchParams({[field]:'eq.'+value,select:SELECT,limit:'1'})))[0]||null;
 const rpc=(name,body)=>request('/rest/v1/rpc/'+name,{method:'POST',body});
 return Object.freeze({request,rpc,
  byActor:id=>one('actor_id',id),byAuth:id=>one('auth_user_id',id),byUsername:username=>one('username',username),
  createIdentity:async(username,password)=>request('/auth/v1/admin/users',{method:'POST',body:{email:username+'@accounts.atria.invalid',password,email_confirm:true}}),
  removeIdentity:id=>request('/auth/v1/admin/users/'+encodeURIComponent(id),{method:'DELETE'}),
  passwordSession:(username,password)=>request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:username+'@accounts.atria.invalid',password}}),
  async validateSession(tokens){
   let claims;try{claims=JSON.parse(Buffer.from(tokens.access_token.split('.')[1],'base64url').toString());}catch{throw error(401,'Sesión inválida.');}
   // Decode only to schedule refresh; Auth verifies the resulting JWT.
   if(!Number.isFinite(claims.exp)||claims.exp*1000<Date.now()+30000){
    tokens=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:tokens.refresh_token}});
    try{claims=JSON.parse(Buffer.from(tokens.access_token.split('.')[1],'base64url').toString());}catch{throw error(401,'Sesión inválida.');}
   }
   const user=await request('/auth/v1/user',{accessToken:tokens.access_token});
   if(!user?.id||claims.sub!==user.id||!claims.session_id||!await rpc('atria_v5_session_active',{p_auth_user_id:user.id,p_session_id:claims.session_id}))
    throw error(401,'La sesión venció. Iniciá sesión nuevamente.');
   return {userId:user.id,sessionId:claims.session_id,tokens};
  },
  logout:tokens=>request('/auth/v1/logout?scope=local',{method:'POST',accessToken:tokens.access_token}),
  async insertAccount(row){return (await request('/rest/v1/atria_v5_accounts',{method:'POST',body:row,prefer:'return=representation'}))[0];},
  async updateAccount(id,body){return (await request('/rest/v1/atria_v5_accounts?auth_user_id=eq.'+encodeURIComponent(id),{method:'PATCH',body,prefer:'return=representation'}))[0];},
  award:(actorId,roomId=null)=>rpc('atria_v5_award_verified',{p_actor_id:actorId,p_room_id:roomId})
 });
}
const durableKey=/^qa-v1:(user|friends|requests|outgoing|invites):qa_[0-9a-f]{30}$/;
export function createPersistentSocialStorage({backend,cache}){
 return Object.freeze({
  async get(key){if(!durableKey.test(key))return cache.get(key);
   const rows=await backend.request('/rest/v1/atria_v5_social?'+new URLSearchParams({key:'eq.'+key,select:'value',limit:'1'}));
   if(rows.length)return rows[0].value;
   const old=await cache.get(key);if(old!==undefined&&old!==null)await this.set(key,old);return old;
  },
  async set(key,value,options){if(!durableKey.test(key))return cache.set(key,value,options);
   await backend.request('/rest/v1/atria_v5_social',{method:'POST',body:{key,value,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates'});
  },
  async delete(key){if(!durableKey.test(key))return cache.delete(key);
   await backend.request('/rest/v1/atria_v5_social?key=eq.'+encodeURIComponent(key),{method:'DELETE'});
  }
 });
}
