/** Bound the response body and non-fetch promises as well as the connection. */
export async function awaitAbortable(promise,signal){
 signal.throwIfAborted();
 let abort;
 const cancelled=new Promise((_,reject)=>{
  abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});
 });
 try{
  const value=await Promise.race([promise,cancelled]);
  signal.throwIfAborted();return value;
 }finally{signal.removeEventListener('abort',abort);}
}
