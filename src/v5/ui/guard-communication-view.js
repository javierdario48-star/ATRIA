import {esc} from './clinical-panels.js';

// Presentation memory only; messages and clinical effects remain server-owned.
export function createGuardChannelView({storage}={}){
 const storageKey='atria.v5.guard-channel-view';
 let scope=null,active='clinical',available=false;
 let seen={team:new Set(),activity:new Set()},known={team:[],activity:[]},unread={team:0,activity:0};
 const save=()=>{try{storage?.setItem(storageKey,JSON.stringify({scope,active,seen:{team:[...seen.team].slice(-300),activity:[...seen.activity].slice(-300)}}));}catch{}};
 return Object.freeze({
  update({roomId,actorId,communication}){
   const nextScope=JSON.stringify([roomId,actorId]);
   known={team:communication?.team||[],activity:communication?.activity||[]};
   available=communication?.channelAvailable===true;
   if(scope!==nextScope){
    scope=nextScope;active='clinical';let saved;
    try{saved=JSON.parse(storage?.getItem(storageKey)||'null');}catch{}
    if(saved?.scope===scope&&Array.isArray(saved.seen?.team)&&Array.isArray(saved.seen?.activity)){
     seen={team:new Set(saved.seen.team),activity:new Set(saved.seen.activity)};
     if(['clinical','team','activity'].includes(saved.active))active=saved.active;
    }else seen={team:new Set(known.team.map(row=>row.id)),activity:new Set(known.activity.map(row=>row.id))};
   }
   if(!available)active='clinical';
   for(const channel of ['team','activity']){
    if(active===channel)for(const row of known[channel])seen[channel].add(row.id);
    unread[channel]=known[channel].filter(row=>!seen[channel].has(row.id)).length;
   }
   save();return {active,available,unread:{...unread}};
  },
  select(channel){
   if(!['clinical','team','activity'].includes(channel)||channel!=='clinical'&&!available)return false;
   active=channel;
   if(channel!=='clinical'){for(const row of known[channel])seen[channel].add(row.id);unread[channel]=0;}
   save();return true;
  },
  state:()=>({active,available,unread:{...unread}})
 });
}

export function guardActivityRows(rows=[]){
 return rows.map(row=>({...row,name:[...new Set([row.name,row.actorName,row.bedId,row.patientName].filter(Boolean))].join(' · ')}));
}

export function guardTurnDialogHTML(turn,{mode='solo'}={}){
 const cooperative=mode==='coop',voted=turn?.actor?.continued;
 const button=(action,text,disabled=false)=>'<button data-action="'+action+'"'+(disabled?' disabled':'')+'>'+text+'</button>';
 if(turn?.canResume)return '<h2>Retomar guardia</h2><p>Tu progreso y las atenciones pendientes están guardados.</p><div class="actions">'+
  button('resume-shift','Retomar la guardia')+button('save-shift','Guardar y salir')+'</div>';
 return '<h2>Guardia finalizada</h2><p>Completaste tu turno. Tu progreso está guardado.</p>'+
  (cooperative?'<p class="note">'+(voted?'Esperando la confirmación de tus colegas.':'Cada médico que continúa debe confirmar el nuevo turno.')+'</p>':'')+
  '<div class="actions" data-turn-id="'+esc(turn?.id||'local')+'">'+
  button('continue-shift',voted?'Esperando a tus colegas…':'Continuar otra guardia — 24 minutos',turn?.canContinue===false)+
  button('save-shift','Guardar y salir')+'</div>';
}
