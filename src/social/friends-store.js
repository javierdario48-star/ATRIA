const KEY='atria.social.v1';
export function loadSocial(store=localStorage){try{return JSON.parse(store.getItem(KEY)||'{"friends":[]}')}catch{return{friends:[]}}}
export function saveSocial(state,store=localStorage){store.setItem(KEY,JSON.stringify({friends:[...new Set(state.friends||[])]}))}
export function addFriend(state,id){return{...state,friends:[...new Set([...(state.friends||[]),id])]}}
export function presenceFor(state,onlineIds=[]){const on=new Set(onlineIds);return(state.friends||[]).map(id=>({id,online:on.has(id)}))}
export function socialSession(profile){return{available:!!profile?.nick,nick:profile?.nick||'',requiresActivation:false}}
