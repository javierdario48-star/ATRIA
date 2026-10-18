import {createHash} from 'node:crypto';
export function clinicalActorId(clientKey){
 if(typeof clientKey!=='string'||!/^[-a-zA-Z0-9]{32,120}$/.test(clientKey))throw Error('invalid recovery credential');
 return 'qa_'+createHash('sha256').update('atria-preview:'+clientKey).digest('hex').slice(0,30);
}
const statusFor={forbidden:403,missing:404,exists:409,busy:409,fenced:409,incompatible:409,invalid:400};
/** The transport verifies initial social invitation once. Thereafter the
 * durable roster and possession of the existing device secret suffice, even
 * if the ephemeral social cache or original host has disappeared. */
export function createClinicalHttp({authority,verifiedRoom,probe,onUnavailable=()=>{},enabled=false}){
 return async function route({method,headers={},body={}}){
  if(method!=='POST')return {status:405,body:{error:'POST required'}};
  let actorId;try{actorId=clinicalActorId(body.clientKey);}catch{return {status:401,body:{error:'invalid recovery credential'}};}
  try{
   if(body.action==='capability')return {status:200,body:{...await probe(),clinicalEnabled:enabled}};
   if(!enabled)return {status:503,body:{error:'clinical recovery client not enabled',code:'recovery-client-not-enabled'}};
   if(typeof body.roomId!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(body.roomId))return {status:400,body:{error:'invalid room'}};
   if(body.action==='start'){
    const room=await verifiedRoom(headers,body.roomId,actorId);
    if(!room||room.id!==body.roomId||room.mode!=='coop'||!room.allAccepted||room.hostUserId!==actorId||room.members.length<2||room.members.length>4)
     return {status:403,body:{error:'verified accepted cooperative invitation required'}};
    const result=await authority.bootstrap({roomId:room.id,caseId:body.caseId,actorId,hostId:room.hostUserId,
     members:room.members.map(x=>({id:x.userId,name:x.name}))});return {status:200,body:result};
   }
   if(body.action!=='sync')return {status:400,body:{error:'invalid clinical operation'}};
   const result=await authority.transact({roomId:body.roomId,actorId,commands:body.commands??[],motion:body.motion??null,
    typing:body.typing??null,confirmation:body.confirmation??null});
   return {status:200,body:result};
  }catch(error){
   if(!statusFor[error.code])try{onUnavailable(error,body.action);}catch{/* diagnostics cannot publish or retry a clinical effect */}
   return {status:statusFor[error.code]??503,body:{error:statusFor[error.code]?error.message:'private-durable-clinical-store-unavailable',code:error.code??'unavailable'}};
  }
 };
}
