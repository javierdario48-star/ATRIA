import {createHash} from 'node:crypto';
export function clinicalActorId(clientKey){
 if(typeof clientKey!=='string'||!/^[-a-zA-Z0-9]{32,120}$/.test(clientKey))throw Error('invalid recovery credential');
 return 'qa_'+createHash('sha256').update('atria-preview:'+clientKey).digest('hex').slice(0,30);
}
const statusFor={forbidden:403,'42501':403,missing:404,exists:409,busy:409,fenced:409,incompatible:409,invalid:400};
/** The transport verifies initial social invitation once. Thereafter the
 * durable roster and possession of the existing device secret suffice, even
 * if the ephemeral social cache or original host has disappeared. */
export function createClinicalHttp({authority,verifiedRoom,probe,onUnavailable=()=>{},enabled=false,
 resolveActor=null,beforeTransact=async()=>{},afterTransact=async()=>{},memberProfile=async m=>m}){
 return async function route({method,headers={},body={}}){
  if(method!=='POST')return {status:405,body:{error:'POST required'}};
  let actorId,identity;try{identity=resolveActor?await resolveActor({headers,body}):null;actorId=identity?.id||clinicalActorId(body.clientKey);}
  catch(error){return {status:error.status||401,body:{error:'invalid or expired clinical credentials',code:'unauthenticated'}};}
  try{
   if(body.action==='capability')return {status:200,body:{...await probe(),clinicalEnabled:enabled}};
   if(!enabled)return {status:503,body:{error:'clinical recovery client not enabled',code:'recovery-client-not-enabled'}};
   if(typeof body.roomId!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(body.roomId))return {status:400,body:{error:'invalid room'}};
   if(body.action==='start'){
    const personal=identity?.account&&['solo','apprentice'].includes(body.mode);
    const room=personal?{id:body.roomId,mode:body.mode,allAccepted:true,hostUserId:actorId,
     members:[{userId:actorId,name:identity.account.name}]}:await verifiedRoom(headers,body.roomId,actorId);
    if(!room||room.id!==body.roomId||!['solo','apprentice','coop','competitive'].includes(room.mode)||!room.allAccepted||room.hostUserId!==actorId||room.members.length<(personal?1:2)||room.members.length>4)
     return {status:403,body:{error:'verified accepted cooperative invitation required'}};
    await beforeTransact({identity,roomId:room.id,action:'start'});
    const result=await authority.bootstrap({roomId:room.id,caseId:body.caseId,guardSelection:room.guardSelection??body.guardSelection??null,actorId,hostId:room.hostUserId,
     mode:room.mode,members:await Promise.all(room.members.map(x=>memberProfile({id:x.userId,name:x.name})))});
    const account=await afterTransact({identity,roomId:room.id,result,action:'start'});
    return {status:200,body:{...result,...(account?{account}:{})}};
   }
   if(body.action!=='sync')return {status:400,body:{error:'invalid clinical operation'}};
   await beforeTransact({identity,roomId:body.roomId,action:'sync'});
   const result=await authority.transact({roomId:body.roomId,actorId,actorProfile:identity?.account?await memberProfile({id:actorId,name:identity.account.name}):null,
    commands:body.commands??[],motion:body.motion??null,motionSequence:body.motionSequence??null,claim:body.claim??null,
    typing:body.typing??null,confirmation:body.confirmation??null});
   const account=await afterTransact({identity,roomId:body.roomId,result,action:'sync'});
   return {status:200,body:{...result,...(account?{account}:{})}};
  }catch(error){
   if(!statusFor[error.code])try{onUnavailable(error,body.action);}catch{/* diagnostics cannot publish or retry a clinical effect */}
   return {status:statusFor[error.code]??503,body:{error:statusFor[error.code]?error.message:'private-durable-clinical-store-unavailable',code:error.code??'unavailable'}};
  }
 };
}
