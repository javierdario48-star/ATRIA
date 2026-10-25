// Public lobby presentation only. Movement poses never rebuild actionable rows;
// only identity, friendship or invitation changes invalidate their markup.
export function createLobbyDirectory({document,escape}){
 const byId=id=>document.getElementById(id);
 const rosterSignatures=new WeakMap();
 const update=(id,markup)=>{
  const target=byId(id);
  if(target&&target.innerHTML!==markup)target.innerHTML=markup;
 };
 return Object.freeze({
  render(s){
   const connected=(s.roster||[]).filter(x=>x.userId!==s.user?.id);
   const list=byId('coopDoctors');
   const rosterSignature=JSON.stringify(connected.map(x=>[x.userId,x.name]));
   if(list&&rosterSignatures.get(list)!==rosterSignature){
    const selected=new Set([...list.querySelectorAll('input:checked')].map(x=>x.value));
    list.innerHTML=connected.map(x=>'<label><input type="checkbox" value="'+escape(x.userId)+'" '+(selected.has(x.userId)?'checked':'')+'>'+escape(x.name)+'</label>').join('')||'<p>Esperando colegas conectados…</p>';
    rosterSignatures.set(list,rosterSignature);
   }
   const friends=new Set((s.friends||[]).map(x=>x.id));
   const online=connected.length,people=byId('peopleButton');
   if(people&&people.textContent!=='Personas · '+online)
    people.textContent='Personas · '+online;
   const count=byId('onlineDoctorsCount');
   if(count)count.textContent=String(online);
   update('coopInvitations',(s.invites||[]).map(x=>'<div><b>'+escape(x.host.name)+'</b> invita a una guardia cooperativa. <button data-action="join-coop" data-room="'+escape(x.roomId)+'">Aceptar</button></div>').join('')||'<p>Sin invitaciones pendientes.</p>');
   update('friendRequests',(s.requests?.incoming||[]).map(x=>'<p>'+escape(x.name)+' te agregó. <button data-action="accept-friend" data-user="'+escape(x.id)+'">Aceptar amistad</button></p>').join(''));
   const cards=connected.map(x=>
    '<button data-action="inspect-player" data-user="'+escape(x.userId)+'">'+escape(x.name)+
    (friends.has(x.userId)?' · Amigo':'')+'</button>').join('');
   update('lobbyContacts',(cards||'<p>No hay otros médicos conectados.</p>')+
    (s.connectionIssue?'<p role="status">No se pudo sincronizar el lobby. Verificá la conexión y actualizá la página.</p>':''));
  }
 });
}
