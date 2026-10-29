/** The existing audio dialog, shared by every screen and game mode. */
export function audioSettingsHTML(s){
 const channel=(id,label)=>'<label class="audio-option"><input type="checkbox" data-audio-channel="'+id+'" '+(s.channels[id]?'checked':'')+'>'+label+'</label>';
 const tracks=(screen,current)=>'<label class="field">Música '+(screen==='lobby'?'del lobby':'de guardia')+
  '<select data-audio-screen="'+screen+'"><option value="new" '+(current==='new'?'selected':'')+'>Nueva · piano y cuerdas'+
  (screen==='lobby'?' (predeterminada)':'')+'</option><option value="classic" '+(current==='classic'?'selected':'')+'>Clásica'+
  (screen==='guard'?' (predeterminada)':'')+'</option></select></label>';
 const slider=(id,label,value)=>'<label class="field">'+label+'<input id="'+id+'" type="range" min="0" max="100" value="'+Math.round(value*100)+'"></label>';
 return '<h2>Audio del hospital</h2><p>Elegí la música para cada pantalla y ajustá los sonidos del hospital.</p>'+
  channel('music','Activar música')+tracks('lobby',s.lobbyTrack)+tracks('guard',s.guardTrack)+
  slider('audioMusicVolume','Volumen de música',s.musicVolume)+
  slider('audioEffectsVolume','Volumen de efectos',s.effectsVolume)+
  '<details class="audio-advanced"><summary>Sonido general y canales</summary>'+
  '<label class="audio-option"><input type="checkbox" id="audioEnabled" '+(s.enabled?'checked':'')+'>Activar sonido general</label>'+
  slider('audioVolume','Volumen general',s.volume)+
  channel('monitor','Monitor y alarmas')+channel('speech','Pacientes y enfermería')+
  channel('effects','Interfaz, acciones y resultados')+channel('ambient','Ambiente del hospital')+
  '<label class="field">Variante de la música clásica<select id="audioTrack"><option value="guardia" '+(s.track==='guardia'?'selected':'')+'>Guardia clásica</option><option value="enfoque" '+(s.track==='enfoque'?'selected':'')+'>Enfoque tranquilo</option></select></label></details>'+
  '<p class="audio-note">El botón ♫ silencia solo la música. Las alarmas y demás sonidos conservan sus ajustes.</p>'+
  '<div class="actions"><button class="primary" data-action="close">Volver al juego</button></div>';
}

export function renderMusicToggle(document,s,{inHospital=false}={}){
 const button=document.getElementById('musicToggleButton'),
  slot=document.getElementById(inHospital?'hudMusicSlot':'titleMusicSlot');
 if(button.parentElement!==slot)slot.append(button);
 const active=!!(s.enabled&&s.volume>0&&s.channels.music&&s.musicVolume>0);
 button.setAttribute('aria-pressed',String(!!s.channels.music));
 button.dataset.muted=String(!active);
 const label=s.channels.music?'Silenciar música':'Activar música';
 button.setAttribute('aria-label',label);button.title=label+(!s.enabled?' · sonido general desactivado':'');
}
