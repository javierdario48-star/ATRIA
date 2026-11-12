import {awaitAbortable} from '../core/abortable-operation.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const verified=account=>account?.activeGuardId&&account.guardRecovery?.status==='available'&&
 account.guardRecovery.roomId===account.activeGuardId;

/** UI transaction only. Account inspection and native resume/leave retain authority. */
export function createGuardRecovery({account,render,hide,notify=()=>{},resume,release,operationTimeoutMs=30000}){
 let generation=0,pending=null,target=null,working=false;
 function cancel(){generation++;pending?.abort();pending=null;target=null;working=false;}
 function begin(){
  pending?.abort();pending=new AbortController();working=true;
  return {id:++generation,signal:AbortSignal.any([pending.signal,AbortSignal.timeout(operationTimeoutMs)])};
 }
 function present(phase,error=''){render({phase,error,available:!!target,busy:working});}
 function failure(error,operation){
  working=false;
  present('error',error?.name==='TimeoutError'?
   'La guardia tardó demasiado en responder. Tu progreso se conserva. Volvé a intentarlo.':
   error?.status===409&&error?.code==='busy'?'La guardia todavía se está actualizando. Volvé a intentarlo.':
   error?.message||'No se pudo '+operation+'. Volvé a intentarlo.');
 }
 async function show(){
  if(!account.read())return false;
  const request=begin();target=null;present('checking');
  try{
   const value=await awaitAbortable(account.restore({signal:request.signal}),request.signal);
   if(request.id!==generation)return true;
   working=false;
   if(!value?.activeGuardId){target=null;hide();return false;}
   if(!verified(value))throw Error('No pudimos comprobar tu guardia. Tu progreso se conserva; volvé a intentarlo.');
   target={actorId:value.actorId,roomId:value.activeGuardId};present('available');return true;
  }catch(error){if(request.id!==generation)return true;failure(error,'comprobar la guardia');return true;}
 }
 async function run(operation){
  if(working||!target||!['resume','release'].includes(operation))return false;
  const expected={...target},request=begin();present(operation==='resume'?'resuming':'releasing');
  try{
   const value=await awaitAbortable(account.restore({signal:request.signal}),request.signal);
   if(request.id!==generation)return false;
   if(!value||value.actorId!==expected.actorId||value.activeGuardId&&value.activeGuardId!==expected.roomId){
    target=null;throw Error('La cuenta o la guardia cambió. Comprobá nuevamente antes de continuar.');
   }
   if(!value.activeGuardId){working=false;target=null;hide();notify('Ya no tenés una guardia pendiente de recuperación.');return true;}
   if(!verified(value)){target=null;throw Error('No pudimos comprobar tu guardia. Volvé a intentarlo.');}
   const confirmed=await awaitAbortable((operation==='resume'?resume:release)({...expected,signal:request.signal}),request.signal);
   if(confirmed!==true)throw Error('No se confirmó la operación. Tu progreso se conserva; volvé a intentarlo.');
   if(request.id!==generation)return false;
   working=false;target=null;hide();return true;
  }catch(error){if(request.id!==generation)return false;failure(error,'recuperar la guardia');return false;}
 }
 return Object.freeze({show,run,cancel,busy:()=>working});
}

export function guardRecoveryHTML({phase,error='',available=false}){
 const busy=['checking','resuming','releasing'].includes(phase),checking=phase==='checking',
  title=checking?'Comprobando guardia…':available?'Tu guardia está guardada':'No pudimos comprobar tu guardia',
  status=checking?'Consultando tu progreso guardado…':phase==='resuming'?'Retomando tus pacientes y tratamientos…':
   phase==='releasing'?'Guardando tu salida de la guardia…':'';
 return `<h2>${title}</h2>${available?'<p>Si retomás, este dispositivo controlará tu guardia. Podés volver al lobby en cualquier momento.</p>':''}
  ${status?`<p role="status" aria-live="polite">${status}</p>`:''}
  ${error?`<p role="alert">${escape(error)}</p>`:''}
  <div class="actions">${available?`<button data-action="account-recover"${busy?' disabled':''}>Retomar guardia</button><button data-action="account-release"${busy?' disabled':''}>Finalizar participación</button>`:
   !busy?'<button data-action="account-check">Reintentar</button>':''}
   <button data-action="close">Después</button></div>`;
}
