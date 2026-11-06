import {awaitAbortable} from '../core/abortable-operation.js';

/** The browser holds public profile data only. Auth tokens live in server-set
 * HttpOnly cookies; all account and clinical requests use that same session. */
export function createAccountClient({window,onChange=()=>{},requestTimeoutMs=12000}){
 let current=null,enabled=true;
 const valid=value=>value?.actorId&&Number.isSafeInteger(value.xp)&&Number.isSafeInteger(value.level);
 const accept=value=>{if(valid(value)){
  current=structuredClone(value);onChange(structuredClone(current));}return current;};
 async function call(action,body,{signal:caller}={}){
  const timeout=AbortSignal.timeout(requestTimeoutMs),signal=caller?AbortSignal.any([caller,timeout]):timeout;
  signal.throwIfAborted();
  let response,data;
  try{
   response=await awaitAbortable(window.fetch('/api/account/'+action,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal,
    headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})}),signal);
   data=await awaitAbortable(response.json(),signal);
  }catch(error){
   if(signal.aborted){
    if(timeout.aborted&&!caller?.aborted)throw Object.assign(Error('La cuenta tardó demasiado en responder. Tu progreso se conserva; volvé a intentarlo.'),{name:'TimeoutError'});
    throw signal.reason;
   }
   throw Error('No se pudo leer la respuesta de la cuenta. Volvé a intentarlo.',{cause:error});
  }
  if(!response.ok)throw Object.assign(Error(data?.error||'No se pudo acceder a la cuenta.'),{status:response.status});
   if(!data||typeof data!=='object'||(data.account!==undefined&&data.account!==null&&!valid(data.account))||
    (action==='session'&&!Object.hasOwn(data,'account')))
    throw Error('La respuesta de la cuenta está incompleta. Tu progreso se conserva; volvé a intentarlo.');
   if(action==='session')enabled=data.enabled!==false;
   if(data.account)accept(data.account);else if(action==='session')current=null;return data;
 }
 return Object.freeze({call,accept,enabled:()=>enabled,read:()=>current?structuredClone(current):null,
  async restore(options){try{await call('session',undefined,options);return current;}catch(error){if(error.status===401){current=null;return null;}if(error.status===404){enabled=false;current=null;return null;}throw error;}},
  async logout(){try{await call('logout',{});}catch(error){if(error.status!==401)throw error;}current=null;onChange(null);}
 });
}
