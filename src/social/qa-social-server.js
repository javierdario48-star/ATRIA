import crypto from 'node:crypto';

// ATRIA QA social transport. Short-lived test identities, not production account migration.
// Storage is injectable: in QA, getCache() provides regional ephemeral KV.
// The QA gate must not promote this to production until a transactional durable store is attached.
const ttl={profile:604800,token:604800,presence:60,chat:3600,room:21600,signal:25};
const idHash=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
const safe=(x,n=32)=>String(x??'').replace(/[<>]/g,'').trim().slice(0,n);
const handle=x=>safe(x,24).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/^_+|_+$/g,'');
const finite=(n,min,max,fallback=0)=>Number.isFinite(Number(n))?Math.min(max,Math.max(min,Number(n))):fallback;
const key=(type,id)=>'qa-v1:'+type+':'+id;
const failure=(status,error)=>({status,body:{error}});
const success=(body,status=200)=>({status,body});
const bucketCount=48;
const bucket=id=>parseInt(idHash(id).slice(0,8),16)%bucketCount;
export function createQaSocialServer(storage,{now=()=>Date.now(),uuid=()=>crypto.randomUUID()}={}){
 const get=async(t,id,def=null)=>(await storage.get(key(t,id)))??def;
 const put=(t,id,val,seconds=ttl.profile)=>storage.set(key(t,id),val,{ttl:seconds});
 const del=(t,id)=>storage.delete(key(t,id));
 const profile=id=>get('user',id);
 const validUser=async header=>{
  const raw=String(header?.authorization??header?.Authorization??'').replace(/^Bearer\s+/i,'');
  if(!/^[0-9a-f-]{32,80}$/i.test(raw))return null;
  const id=await get('token',idHash(raw));return id?profile(id):null;
 };
 async function roster(){
  const slots=await Promise.all(Array.from({length:bucketCount},(_,i)=>get('presence',i)));
  const cutoff=now()-35000;
  return slots.flatMap(x=>Array.isArray(x)?x:[]).filter(x=>x&&x.lastSeen>=cutoff).sort((a,b)=>a.userId.localeCompare(b.userId));
 }
 async function updatePresence(user,body){
  const p={userId:user.id,name:user.name,handle:user.handle,peerId:safe(body.peerId,100),x:finite(body.x,0,10000),y:finite(body.y,0,10000),dir:/^[NESW]$/.test(body.dir)?body.dir:'S',moving:!!body.moving,walkPhase:finite(body.walkPhase,0,1),color:safe(body.color||'navy',24),coat:!!body.coat,level:finite(body.level,1,1000,1),seq:finite(body.seq,0,1e9),lastSeen:now()};
  if(!p.peerId||p.peerId.length<6)return failure(400,'Identificador del dispositivo inválido');
  const k=bucket(user.id),prev=await get('presence',k,[]),list=(Array.isArray(prev)?prev:[]).filter(x=>x.userId!==user.id&&x.lastSeen>=now()-35000);
  list.push(p);await put('presence',k,list,ttl.presence);return success({ok:true,seq:p.seq});
 }
 async function publicRoom(raw,viewer){
  const live=await roster(),on=new Set(live.map(p=>p.userId)),r={...raw};
  r.members=(raw.members||[]).map(m=>({...m,online:on.has(m.userId)}));
  r.role=viewer===raw.hostUserId?'host':'guest';
  r.allAccepted=r.members.length>1&&r.members.every(m=>m.accepted);
  r.maxPlayers=4;
  return r;
 }
 async function userCard(id){const u=await profile(id);if(!u)return null;const live=await roster();return {id:u.id,handle:u.handle,name:u.name,online:live.some(p=>p.userId===id)}}
 async function links(id){
  const ids=await get('friends',id,[]),incoming=await get('requests',id,[]),outgoing=await get('outgoing',id,[]),inv=await get('invites',id,[]);
  const cards=await Promise.all(ids.map(userCard)),i=await Promise.all(incoming.map(userCard)),o=await Promise.all(outgoing.map(userCard));
  const invites=await Promise.all(inv.map(async v=>{const r=await get('room',v.roomId);if(!r||r.closed)return null;const host=await userCard(r.hostUserId);return {roomId:r.id,host:host||{id:r.hostUserId,name:'Anfitrión',handle:'medico'},mode:r.mode,members:r.members.length,maxPlayers:4}}));
  return {friends:cards.filter(Boolean),requests:{incoming:i.filter(Boolean),outgoing:o.filter(Boolean)},invites:invites.filter(Boolean)};
 }
 const addUnique=(items,x,max=50)=>[...new Set([...(Array.isArray(items)?items:[]),x])].slice(-max);
 async function writeUserList(type,id,edit){const old=await get(type,id,[]);const next=edit(Array.isArray(old)?old:[]);await put(type,id,next);return next}
 async function addChat(user,text){
  text=safe(text,180);if(!text)return failure(400,'Mensaje vacío');
  const seq=await get('chat-seq','global',0)+1;
  // QA delivery is at-least-once via sequence and client dedupe; cache is not a transactional queue.
  await put('chat-seq','global',seq,ttl.chat);
  const msg={sequence:seq,userId:user.id,name:user.name,handle:user.handle,text,createdAt:now()};
  const k=bucket(user.id),prev=await get('chat',k,[]);
  await put('chat',k,[...(Array.isArray(prev)?prev:[]),msg].slice(-40),ttl.chat);
  return success({message:msg});
 }
 async function lobbyRead(after){
  const parts=await Promise.all(Array.from({length:bucketCount},(_,i)=>get('chat',i,[])));
  const messages=parts.flat().filter(x=>x&&x.sequence>after).sort((a,b)=>a.createdAt-b.createdAt||a.sequence-b.sequence).slice(-90);
  return success({players:await roster(),messages,cursor:Math.max(after,...messages.map(x=>x.sequence),0)});
 }
 async function route({method='GET',path='health',query={},headers={},body={}}){
  method=String(method).toUpperCase();path=String(path).replace(/^\/?(?:api\/)?/,'').split('?')[0].replace(/^\//,'');
  if(method!=='GET'&&method!=='POST')return failure(405,'Método no permitido');
  if(path==='health'&&method==='GET')return success({service:'ATRIA Social QA',version:'4.4.1',protocol:'4.4.1-clean',storage:'qa-regional-cache',experimental:true});
  if(['register','resume'].includes(path)&&method==='POST'){
   const client=safe(body.clientKey,120),n=safe(body.name,32),h=handle(body.handle||n);
   if(client.length<20||n.length<2||h.length<3)return failure(400,'Perfil o clave local inválidos');
   const id='qa_'+idHash('atria-preview:'+client).slice(0,30);
   let user=await profile(id);
   if(!user){user={id,handle:h,name:n,createdAt:now()};await put('user',id,user)}
   const token=uuid()+'-'+uuid();await put('token',idHash(token),id,ttl.token);
   return success({user,token,expiresIn:ttl.token});
  }
  const user=await validUser(headers);
  if(!user)return failure(401,'Sesión social inexistente o vencida');
  if(path==='me'&&method==='GET')return success({user,...await links(user.id)});
  if(path==='search'&&method==='GET'){
   const q=handle(query.q||'');if(q.length<3)return success({users:[]});
   const live=await roster();return success({users:live.filter(p=>p.userId!==user.id&&(p.handle.includes(q)||handle(p.name).includes(q))).map(p=>({id:p.userId,name:p.name,handle:p.handle,online:true})).slice(0,30)});
  }
  if(path==='friends'&&method==='POST'){
   const other=safe(body.userId,64);if(!other||other===user.id||!await profile(other))return failure(404,'Usuario no encontrado');
   await writeUserList('outgoing',user.id,a=>addUnique(a,other));await writeUserList('requests',other,a=>addUnique(a,user.id));return success({ok:true});
  }
  if(/^friends\/(accept|decline|remove)$/.test(path)&&method==='POST'){
   const action=path.split('/')[1],other=safe(body.userId,64);
   if(!other)return failure(400,'Falta el usuario');
   if(action==='accept'){
    const inc=await get('requests',user.id,[]);if(!inc.includes(other))return failure(409,'No existe solicitud pendiente');
    await writeUserList('friends',user.id,a=>addUnique(a,other));await writeUserList('friends',other,a=>addUnique(a,user.id));
   }
   await writeUserList('requests',user.id,a=>a.filter(x=>x!==other));await writeUserList('outgoing',other,a=>a.filter(x=>x!==user.id));
   if(action==='remove'){await writeUserList('friends',user.id,a=>a.filter(x=>x!==other));await writeUserList('friends',other,a=>a.filter(x=>x!==user.id))}
   return success({ok:true});
  }
  if(path==='lobby/state'&&method==='POST')return updatePresence(user,body);
  if(path==='lobby/leave'&&method==='POST'){
   const k=bucket(user.id),items=await get('presence',k,[]);await put('presence',k,items.filter(x=>x.userId!==user.id),ttl.presence);return success({ok:true});
  }
  if(path==='lobby'&&method==='GET')return lobbyRead(finite(query.after,0,1e12));
  if(path==='lobby/chat'&&method==='POST')return addChat(user,body.text);
  if(path==='rooms'&&method==='POST'){
   const mode=body.mode;
   if(!['coop','competitive'].includes(mode))return failure(400,'Modo inválido');
   const invites=[...new Set((Array.isArray(body.invitees)?body.invitees:[]).map(x=>safe(x,64)))].filter(x=>x&&x!==user.id).slice(0,3);
   if(!invites.length)return failure(400,'Invitá al menos a un compañero');
   const people=await Promise.all(invites.map(profile));if(people.some(x=>!x))return failure(404,'Un invitado no existe');
   const id=uuid(),room={id,code:id.slice(0,8).toUpperCase(),mode,hostUserId:user.id,members:[{userId:user.id,name:user.name,handle:user.handle,peerId:safe(body.peerId,100),accepted:true}],pending:invites,closed:false,createdAt:now()};
   await put('room',id,room,ttl.room);
   for(const other of invites)await writeUserList('invites',other,a=>[...a.filter(x=>x.roomId!==id),{roomId:id}].slice(-20));
   return success({room:await publicRoom(room,user.id)},201);
  }
  if(path==='rooms/join'&&method==='POST'){
   const id=safe(body.roomId,64),code=safe(body.code,10).toUpperCase();
   let room=id?await get('room',id):null;
   if(!room&&code)return failure(404,'Solo se aceptan invitaciones directas en el entorno QA');
   if(!room||room.closed)return failure(404,'Guardia inexistente');
   if(!room.pending.includes(user.id)&&!room.members.some(x=>x.userId===user.id))return failure(403,'No estás invitado');
   if(!room.members.some(x=>x.userId===user.id)){
    if(room.members.length>=4)return failure(409,'Grupo completo');
    room.members.push({userId:user.id,name:user.name,handle:user.handle,peerId:safe(body.peerId,100),accepted:true});
   }
   room.pending=room.pending.filter(x=>x!==user.id);
   await put('room',room.id,room,ttl.room);await writeUserList('invites',user.id,a=>a.filter(x=>x.roomId!==room.id));
   return success({room:await publicRoom(room,user.id)});
  }
  const match=path.match(/^rooms\/([a-f0-9-]{36})\/(messages|invite|leave|cancel)(?:\/(remove|decline))?$/);
  if(match){const [,id,action,sub]=match,room=await get('room',id);if(!room||room.closed)return failure(404,'Guardia inexistente');
   const member=room.members.find(m=>m.userId===user.id),host=room.hostUserId===user.id;
   if(action==='messages'){
    if(!member)return failure(403,'No sos integrante de esta guardia');
    if(method==='GET'){
     const all=await get('room-msg',id,[]),after=finite(query.after,0,1e12);
     return success({room:await publicRoom(room,user.id),messages:all.filter(x=>x.sequence>after).slice(-100),cursor:Math.max(after,...all.map(x=>x.sequence),0),closed:false});
    }
    if(method==='POST'){
     const data=body.message;if(!data||typeof data!=='object'||JSON.stringify(data).length>6000)return failure(400,'Mensaje inválido');
     const q=await get('room-msg',id,[]);const sequence=(q.at(-1)?.sequence||0)+1;
     const obj={sequence,userId:user.id,data,createdAt:now()};
     const isSnapshot=data.type==='state'||data.kind==='snapshot';
     const items=isSnapshot?q.filter(x=>!(x.userId===user.id&&(x.data.type==='state'||x.data.kind==='snapshot'))):q;
     await put('room-msg',id,[...items,obj].slice(-120),ttl.room);
     return success({ok:true,sequence});
    }
   }
   if(method!=='POST')return failure(405,'Método no permitido');
   if(action==='leave'){
    room.members=room.members.filter(m=>m.userId!==user.id);
    if(!room.members.length)room.closed=true;
    if(host&&!room.closed)room.hostUserId=room.members[0].userId;
   }else if(action==='cancel'){
    if(!host)return failure(403,'Solo el anfitrión puede cancelar');room.closed=true;
   }else if(action==='invite'&&!sub){
    if(!host)return failure(403,'Solo el anfitrión puede invitar');
    const other=safe(body.userId,64);if(!await profile(other))return failure(404,'Invitado inexistente');
    if(room.members.length+room.pending.length>=4)return failure(409,'Grupo completo');
    room.pending=addUnique(room.pending,other,3);
    await writeUserList('invites',other,a=>[...a,{roomId:id}].slice(-20));
   }else if(action==='invite'&&sub==='decline'){
    if(!room.pending.includes(user.id))return failure(403,'No existe invitación para este usuario');
    room.pending=room.pending.filter(x=>x!==user.id);await writeUserList('invites',user.id,a=>a.filter(x=>x.roomId!==id));
   }else if(action==='invite'&&sub==='remove'){
    if(!host)return failure(403,'Solo el anfitrión puede quitar invitados');
    const other=safe(body.userId,64);room.pending=room.pending.filter(x=>x!==other);await writeUserList('invites',other,a=>a.filter(x=>x.roomId!==id));
   }
   await put('room',id,room,ttl.room);return success({room:await publicRoom(room,user.id),ok:true});
  }
  return failure(404,'Ruta social no implementada en QA');
 }
 async function signalRoute({method='GET',query={},body={},headers={}}){
  // This endpoint must NOT accept unauthenticated SDP from other origins.
  const user=await validUser(headers);if(!user)return failure(401,'Se requiere sesión social');
  if(method==='POST'&&body.presence)return updatePresence(user,body.presence);
  if(method==='POST'&&body.signal){
   const s=body.signal;
   const from=safe(s.fromPeerId,100),to=safe(s.toPeerId,100),type=safe(s.type,10);
   if(!from||!to||!['offer','answer','ice'].includes(type))return failure(400,'Señal inválida');
   if(safe(s.fromUserId,64)!==user.id)return failure(403,'Emisor no autorizado');
   const me=(await roster()).find(x=>x.userId===user.id&&x.peerId===from);
   if(!me)return failure(403,'Señal sin presencia activa');
   const signal={type,fromUserId:user.id,fromPeerId:from,toPeerId:to,description:s.description};
   if(JSON.stringify(signal).length>12000)return failure(413,'Señal demasiado extensa');
   await put('signal',idHash(to+':'+from+':'+type),signal,ttl.signal);
   return success({ok:true});
  }
  if(method==='GET'&&query.signal){
   const type=safe(query.signal,10),to=safe(query.toPeer,100),from=safe(query.fromPeer,100);
   const self=(await roster()).find(x=>x.userId===user.id&&x.peerId===to);
   if(!self)return failure(403,'Presencia no verificada');
   return success({signal:await get('signal',idHash(to+':'+from+':'+type))});
  }
  if(method==='GET'&&String(query.roster)==='1')return success({players:await roster()});
  return failure(400,'Solicitud inválida');
 }
 return {route,signalRoute,roster};
}
