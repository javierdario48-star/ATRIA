import test from 'node:test';
import assert from 'node:assert/strict';
import {createLobbyCoordinator} from './lobby-coordinator.js';
import {createRoomAuthority} from '../core/room-authority.js';
import {createNativeClinicalPort} from '../adapters/native-clinical-port.js';

const therapies=[{id:'ceftriaxone',label:'Ceftriaxona',aliases:['ceftriaxona']},
 {id:'metronidazole',label:'Metronidazol',aliases:['metronidazol']}];
async function fixture(n,mode,serial=0){
 const tokens=new Map(Array.from({length:n},(_,i)=>['token-'+i,{id:'actor-'+i}]));
 const hub=createLobbyCoordinator({authenticate:t=>tokens.get(t)||null,newId:()=>String(++serial)});
 const sessions=[];
 for(let i=0;i<n;i++){
  const x=await hub.join('token-'+i,{name:'Dr '+i,x:300+i*20,y:200});
  sessions.push(x.sessionId);
 }
 const ticket=await hub.createParty('token-0',{sessionId:sessions[0],mode,caseId:'APP-001'});
 for(let i=1;i<n;i++){
  await hub.invite('token-0',{sessionId:sessions[0],partyId:ticket.id,targetId:'actor-'+i});
  await hub.accept('token-'+i,{sessionId:sessions[i],partyId:ticket.id});
 }
 const roomTicket=await hub.start('token-0',{sessionId:sessions[0],partyId:ticket.id});
 const calls=[];
 const port=createNativeClinicalPort({withPatient:(uid,fn)=>fn({uid}),
  invoke:request=>{calls.push(request);return {status:'executed',eventId:request.eventId,
   patientUid:request.patientUid,receipt:{eventId:request.eventId,patientUid:request.patientUid}};}});
 const room=createRoomAuthority({roomId:roomTicket.roomId,mode:roomTicket.mode,
  members:roomTicket.members.map(id=>({id})),patients:[{uid:'patient-1'}],
  authenticate:t=>{const a=tokens.get(t);return a&&{...a,roomId:roomTicket.roomId};},
  clinicalPort:port,resolveSpeechContext:()=>({patientUid:'patient-1',therapies,studies:[]})});
 const send=(i,id,text)=>room.dispatch({id,kind:'chat.post',text},'token-'+i);
 return {hub,room,ticket:roomTicket,sessions,calls,send};
}
test('C20a lobby grants 2/3/4 authenticated members the same clinical engine with mode-specific permissions',async()=>{
 for(const n of [2,3,4])for(const mode of ['coop','competitive']){
  const f=await fixture(n,mode);
  assert.deepEqual(f.ticket.members,Array.from({length:n},(_,i)=>'actor-'+i));
  // No lobby ghosts while all members are in the active guard.
  const near=await f.hub.nearby('token-0',{sessionId:f.sessions[0]});
  assert.deepEqual(near,[]);
  const outcomes=await Promise.all(Array.from({length:n},(_,i)=>f.send(i,'rx-'+i,
   'Enfermera ceftriaxona')));
  assert.equal(outcomes.length,n);
  if(mode==='coop'){
   assert(outcomes.every(x=>x.clinical[0].status==='executed'));
   assert.equal(f.calls.length,n,'all cooperative members use the one native port');
   assert.equal(f.room.snapshot().patients[0].ownerId,null);
  }else{
   assert.equal(outcomes[0].clinical[0].status,'executed');
   assert(outcomes.slice(1).every(x=>x.clinical[0].reason==='other-player-owns-patient'));
   assert.equal(f.calls.length,1,'one competitor owns that patient');
   assert.equal(f.room.snapshot().patients[0].ownerId,'actor-0');
  }
  assert.equal(f.room.snapshot().transcript.length,n,'global chat is shared even when clinical action rejected');
  const replay=await f.send(0,'rx-0','Enfermera ceftriaxona');
  assert.deepEqual(replay,outcomes[0]);assert.equal(f.calls.length,mode==='coop'?n:1);
  assert.equal((await f.hub.finish('token-0',{sessionId:f.sessions[0],partyId:f.ticket.roomId})).finished,true);
  assert.equal((await f.hub.nearby('token-0',{sessionId:f.sessions[0]})).length,n-1);
  assert.equal(f.hub.diagnostics().parties,0);
  f.room.dispose();f.hub.dispose();
 }
});
test('C20a different accepted parties never share a clinical room or patient',async()=>{
 const first=await fixture(2,'coop'),second=await fixture(2,'competitive',100);
 assert.notEqual(first.ticket.roomId,second.ticket.roomId);
 await first.send(0,'rx','Enfermera ceftriaxona');
 assert.equal(first.room.snapshot().transcript.length,1);
 assert.equal(second.room.snapshot().transcript.length,0);
 await second.send(0,'rx','Enfermera metronidazol');
 assert.equal(second.calls.length,1);assert.equal(first.calls.length,1);
 const wrong=await first.room.dispatch({id:'wrong',kind:'chat.post',
  text:'Enfermera ceftriaxona',actorId:'actor-1',patientUid:'patient-other'},'wrong-token');
 assert.equal(wrong.reason,'unauthenticated-or-not-member');
 first.room.dispose();second.room.dispose();first.hub.dispose();second.hub.dispose();
});
