// Presentation policy for persistent clinical transport. Acknowledgement,
// retries and retained orders remain exclusively owned by the durable replica.
// This module never changes the clinical queue or its request cadence.
export function createClinicalConnectionNotice({failuresBeforeWarning=4,cooldownMs=12000,maxGapMs=10000}={}){
 let consecutive=0,lastFailure=-Infinity,lastNotice=-Infinity;
 const warning='Esperando la conexión clínica persistente. Las órdenes pendientes se conservan.';
 const accessWarning='No se pudo verificar el acceso a la guardia. Las órdenes pendientes se conservan.';
 return Object.freeze({
  failed(error,now){
   if(!Number.isFinite(now))return null;
   if(now-lastFailure>maxGapMs)consecutive=0;
   consecutive++;lastFailure=now;
   // Invalid authorization is not ordinary connection contention.
   const denied=error?.status===401||error?.status===403;
   if(!denied&&consecutive<failuresBeforeWarning)return null;
   if(now-lastNotice<cooldownMs)return null;
   lastNotice=now;return denied?accessWarning:warning;
  },
  succeeded(){consecutive=0;lastFailure=-Infinity;},
  state:()=>({consecutive,lastNotice})
 });
}
