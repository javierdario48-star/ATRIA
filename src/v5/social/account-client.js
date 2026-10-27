/** The browser holds public profile data only. Auth tokens live in server-set
 * HttpOnly cookies; all account and clinical requests use that same session. */
export function createAccountClient({window,onChange=()=>{}}){
 let current=null,enabled=true;
 const accept=value=>{if(value?.actorId&&Number.isSafeInteger(value.xp)&&Number.isSafeInteger(value.level)){
  current=structuredClone(value);onChange(structuredClone(current));}return current;};
 async function call(action,body){
  const response=await window.fetch('/api/account/'+action,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
   headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
  let data;try{data=await response.json();}catch{data={};}
  if(!response.ok)throw Object.assign(Error(data.error||'No se pudo acceder a la cuenta.'),{status:response.status});
   if(action==='session')enabled=data.enabled!==false;
   if(data.account)accept(data.account);else if(action==='session')current=null;return data;
 }
 return Object.freeze({call,accept,enabled:()=>enabled,read:()=>current?structuredClone(current):null,
  async restore(){try{await call('session');return current;}catch(error){if(error.status===401){current=null;return null;}if(error.status===404){enabled=false;current=null;return null;}throw error;}},
  async logout(){try{await call('logout',{});}catch(error){if(error.status!==401)throw error;}current=null;onChange(null);}
 });
}
