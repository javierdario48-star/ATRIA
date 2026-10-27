const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function playerProfileCardHTML(profile,{friendship='stranger',canInvite=false,cases=[]}={}){
 const id=esc(profile.actorId),self=profile.self,verified=profile.verified;
 const friendshipText={friend:'Amigos',incoming:'Solicitud recibida',outgoing:'Solicitud enviada',stranger:'Colega'}[friendship];
 return '<article class="doctor-profile"><header><canvas id="socialProfileAvatar" aria-label="Avatar de '+esc(profile.name)+'"></canvas><div><h2>'+esc(profile.name)+'</h2>'+
  (profile.username?'<small>@'+esc(profile.username)+'</small>':'')+'<p class="doctor-status">'+esc(profile.status)+' · '+(self?'Tu perfil':friendshipText)+'</p></div></header>'+
  (verified?'<div class="doctor-stats"><span><b>'+profile.level+'</b>Nivel</span><span><b>'+profile.casesResolved+'</b>Casos resueltos</span><span><b>'+profile.friendsCount+'</b>Amigos</span></div>'+
   '<label class="doctor-xp">'+profile.xp+' XP · '+profile.xpInLevel+'/200 al próximo nivel<progress max="200" value="'+profile.xpInLevel+'"></progress></label>':'<p>Identidad de este dispositivo · progreso sin vincular.</p>')+
  '<div class="actions">'+(!self?(friendship==='incoming'?'<button data-action="accept-friend" data-user="'+id+'">Aceptar amistad</button>':
   friendship==='stranger'?'<button data-action="add-friend" data-user="'+id+'">Agregar a amigos</button>':''):'')+
  (!self&&friendship==='friend'?'<button data-action="remove-friend" data-user="'+id+'">Eliminar amigo</button>':'')+
  (canInvite&&!self&&profile.status==='disponible'?'<label class="field">Paciente<select id="friendCase">'+cases.map(c=>'<option value="'+esc(c.id)+'" '+(c.id==='PERI-PBE-001'?'selected':'')+'>'+esc(c.selector)+'</option>').join('')+'</select></label><button class="primary" data-action="invite-friend" data-user="'+id+'">Invitar a guardia</button>':'')+
  '<button data-action="close">Cerrar</button></div></article>';
}
