import test from 'node:test';
import assert from 'node:assert/strict';
import {createClinicalHttp,clinicalActorId} from './clinical-http.js';
const key='a'.repeat(64),actorId=clinicalActorId(key);
const room={id:'room',mode:'coop',hostUserId:actorId,allAccepted:true,members:[{userId:actorId,name:'A'},{userId:'guest',name:'B'}]};
function fixture(verified=room){const calls=[];return {calls,http:createClinicalHttp({
 authority:{async bootstrap(input){calls.push(input);return {epoch:0};},async transact(input){calls.push(input);return {epoch:1};}},
 verifiedRoom:async()=>verified,probe:async()=>({durable:true,kind:'private-blob-cas'})})};}
test('HTTP bootstrap uses authenticated accepted roster; payload cannot choose actor, host or members',async()=>{
 const f=fixture();const response=await f.http({method:'POST',headers:{},body:{action:'start',clientKey:key,roomId:'room',caseId:'PERI-PBE-001',actorId:'guest',members:[{id:'intruder'}]}});
 assert.equal(response.status,200);assert.equal(f.calls[0].actorId,actorId);assert.equal(f.calls[0].hostId,actorId);assert.deepEqual(f.calls[0].members,room.members.map(x=>({id:x.userId,name:x.name})));
 const bad=fixture({...room,hostUserId:'guest'});assert.equal((await bad.http({method:'POST',headers:{},body:{action:'start',clientKey:key,roomId:'room',caseId:'PERI-PBE-001'}})).status,403);
});
test('recovery identity survives social-cache loss; only the durable membership authorizes it',async()=>{
 const f=fixture(null);const response=await f.http({method:'POST',headers:{},body:{action:'sync',clientKey:key,roomId:'room',actorId:'intruder',commands:[{id:'m',text:'Enfermera monitor'}]}});
 assert.equal(response.status,200);assert.equal(f.calls[0].actorId,actorId);
 assert.equal((await f.http({method:'POST',body:{action:'sync',clientKey:'short',roomId:'room'}})).status,401);
});

test('a storage probe failure is diagnosable server-side without exposing backend details to clients',async()=>{
 let observed;const error=Object.assign(Error('storage detail'),{name:'BlobError'});
 const route=createClinicalHttp({authority:{},verifiedRoom:async()=>null,probe:async()=>{throw error;},onUnavailable:(cause,action)=>observed={cause,action}});
 const response=await route({method:'POST',body:{clientKey:key,action:'capability'}});
 assert.equal(response.status,503);assert.equal(response.body.error,'private-durable-clinical-store-unavailable');
 assert.equal(observed.cause,error);assert.equal(observed.action,'capability');
});
