import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomAuthority} from './room-authority.js';
import {routeWardSpeech} from './speech-router.js';
import {createRoomReplica} from './replica.js';
import {createNativeClinicalPort} from '../adapters/native-clinical-port.js';

const studies=[{id:'hemogram',label:'Hemograma',aliases:['hemograma']}];
const therapies=[{id:'albumin',label:'Albúmina',aliases:['albumina']},
 {id:'ceftriaxone',label:'Ceftriaxona',aliases:['ceftriaxona']},
 {id:'metronidazole',label:'Metronidazol',aliases:['metronidazol']}];

test('disposal during a native invocation stops remaining composite effects and presentation commits',async()=>{
 let release,started;const gate=new Promise(r=>release=r),entered=new Promise(r=>started=r),calls=[],emitted=[];
 const port=createNativeClinicalPort({withPatient:(uid,fn)=>fn({uid}),invoke:async({eventId,patientUid,intent})=>{
  calls.push(intent.id);started();await gate;return {status:'executed',patientUid,receipt:{eventId,patientUid}};
 }});
 const room=createRoomAuthority({roomId:'dispose-room',mode:'solo',members:[{id:'doctor'}],patients:[{uid:'P1'}],
  authenticate:()=>({id:'doctor',roomId:'dispose-room'}),clinicalPort:port,
  resolveSpeechContext:()=>({patientUid:'P1',therapies,studies:[]}),emit:event=>emitted.push(event)});
 const pending=room.dispatch({id:'combo',kind:'chat.post',text:'Enfermera ceftriaxona y metronidazol'},'credentials');
 await entered;room.dispose();release();const ack=await pending;await room.flush();
 assert.equal(ack.status,'rejected');assert.equal(ack.reason,'authority-disposed');
 assert.deepEqual(calls,['ceftriaxone']);assert.deepEqual(emitted,[]);assert.deepEqual(room.snapshot().transcript,[]);
});
function fixture(count=2,mode='coop',selection='patient-a'){
 const people=Array.from({length:count},(_,n)=>({id:'doctor-'+(n+1)}));
 const tokens=new Map(people.map(x=>['token-'+x.id,{id:x.id,roomId:'room-1'}]));
 const native={calls:[],studies:[],drugs:[],procedures:[]};
 const nativePort=createNativeClinicalPort({
  withPatient:(uid,fn)=>fn({uid}),
  invoke:({eventId,patientUid,actorId,intent})=>{
   native.calls.push({eventId,patientUid,actorId,intent});
   const target=intent.kind==='study.request'?native.studies:
    intent.kind.startsWith('therapy.')?native.drugs:native.procedures;
   target.push({eventId,patientUid,id:intent.id,actorId});
   return {status:intent.kind==='study.request'?'pending':'executed',patientUid,
    receipt:{eventId,patientUid,kind:intent.kind,id:intent.id}};
  }
 });
 const events=[];
 const authority=createRoomAuthority({roomId:'room-1',mode,members:people,
  patients:[{uid:'patient-a'},{uid:'patient-b'}],
  authenticate:token=>tokens.get(token)||null,
  clinicalPort:nativePort,
  resolveSpeechContext:({actorId})=>({patientUid:selection,studies,therapies,
   focusedNpc:actorId==='doctor-2'?'nurse':null}),
  emit:event=>events.push(event),time:()=>42
 });
 const send=(n,id,text,extra={})=>authority.dispatch({id,kind:'chat.post',text,...extra},'token-doctor-'+n);
 return {send,authority,native,events,people,nativePort};
}

test('one global transcript and one native study, never albumin',async()=>{
 const f=fixture(4);
 const result=await f.send(1,'study-1','Enfermera hemograma');
 assert.equal(result.recipient,'nurse');
 assert.deepEqual(result.clinical.map(x=>[x.kind,x.status]),[['study.request','pending']]);
 assert.equal(f.native.studies.length,1);
 assert.equal(f.native.drugs.length,0);
 assert.equal(f.authority.snapshot().transcript.length,1);
 assert.equal(f.events.length,1);
 assert.equal(f.events[0].message.text,'Enfermera hemograma');
});

test('one message is processed once even after transport retries',async()=>{
 const f=fixture();
 const request=f.send(1,'once','Enfermera ceftriaxona y metronidazol');
 const retry=f.send(1,'once','Enfermera ceftriaxona y metronidazol');
 const [a,b]=await Promise.all([request,retry]);
 assert.deepEqual(a,b);
 assert.deepEqual(f.native.drugs.map(x=>x.id),['ceftriaxone','metronidazole']);
 assert.equal(f.authority.snapshot().transcript.length,1);
 assert.equal(f.authority.snapshot().revision,1);
});

test('the same command id cannot be reused for another dose',async()=>{
 const f=fixture();
 await f.send(1,'same','Enfermera ceftriaxona');
 const later=await f.send(1,'same','Enfermera metronidazol');
 assert.equal(later.status,'rejected');
 assert.equal(later.reason,'command-id-reused-with-different-payload');
 assert.deepEqual(f.native.drugs.map(x=>x.id),['ceftriaxone']);
});

test('untrusted actor and patient fields never choose ownership or target',async()=>{
 const f=fixture();
 const a=await f.send(1,'forgery','Enfermera ceftriaxona',
  {actorId:'doctor-2',patientUid:'patient-b'});
 assert.equal(a.patientUid,'patient-a');
 assert.equal(f.native.drugs[0].actorId,'doctor-1');
 assert.equal(f.native.drugs[0].patientUid,'patient-a');
 const invalid=await f.authority.dispatch({id:'invalid',kind:'chat.post',text:'hola'},'unknown');
 assert.equal(invalid.status,'rejected');
 assert.equal(f.authority.snapshot().transcript.length,1);
});

test('competitive first valid clinical action claims a patient',async()=>{
 const f=fixture(3,'competitive');
 const [first,second]=await Promise.all([
  f.send(1,'first','Enfermera ceftriaxona'),
  f.send(2,'second','metronidazol')
 ]);
 assert.equal(first.clinical[0].status,'executed');
 assert.equal(second.clinical[0].status,'rejected');
 assert.equal(second.clinical[0].reason,'other-player-owns-patient');
 assert.equal(f.authority.snapshot().patients[0].ownerId,'doctor-1');
 assert.equal(f.native.drugs.length,1);
});

test('nonclinical chat does not claim competitive ownership',async()=>{
 const f=fixture(2,'competitive');
 await f.send(1,'hello','Hola, cómo estás?');
 assert.equal(f.authority.snapshot().patients[0].ownerId,null);
 await f.send(2,'treatment','ceftriaxona');
 assert.equal(f.authority.snapshot().patients[0].ownerId,'doctor-2');
});

test('a rejected/unknown nursing clause never partially administers',async()=>{
 const f=fixture();
 const x=await f.send(1,'unclear','Enfermera ceftriaxona y dispositivo desconocido');
 assert.equal(x.routeError,'unknown-clause');
 assert.equal(x.clinical.length,0);
 assert.equal(f.native.drugs.length,0);
 assert.equal(f.authority.snapshot().transcript.length,1);
});

test('question, negation and human chat never create medication',async()=>{
 const f=fixture();
 await f.send(1,'question','Enfermera ¿ceftriaxona?');
 await f.send(1,'negative','Enfermera no ceftriaxona');
 await f.send(1,'human','¿Ya está la ceftriaxona?');
 assert.equal(f.native.drugs.length,0);
 assert.equal(f.authority.snapshot().transcript.length,3);
});

test('nurse focus is contextual, while nearest patient is default',async()=>{
 const f=fixture();
 const nurse=await f.send(2,'nurse-short','hemograma');
 const other=await f.send(1,'patient-short','hemograma');
 assert.equal(nurse.recipient,'nurse');
 assert.equal(other.recipient,'patient');
 assert.equal(f.native.studies.length,1);
});

test('closed or unavailable patient never receives clinical treatment',async()=>{
 const f=fixture();
 const snap=f.authority.snapshot();
 assert.equal(snap.patients[0].closed,false);
 const closed=createRoomAuthority({
  roomId:'room-c',mode:'coop',members:[{id:'one'}],
  patients:[{uid:'p',closed:true}],
  authenticate:key=>key==='ok'?{id:'one',roomId:'room-c'}:null,
  clinicalPort:{execute:()=>{throw Error('must never run')}},
  resolveSpeechContext:()=>({patientUid:'p',studies,therapies})
 });
 const r=await closed.dispatch({id:'a',kind:'chat.post',text:'Enfermera ceftriaxona'},'ok');
 assert.equal(r.clinical[0].status,'rejected');
});

test('2, 3, 4 independent members share a single ordered room history',async()=>{
 for(const count of [2,3,4]){
  const f=fixture(count);
  await Promise.all(f.people.map((_,n)=>f.send(n+1,'message-'+n,'Hola doctor '+(n+1))));
  const state=f.authority.snapshot();
  assert.equal(state.transcript.length,count);
  assert.equal(state.revision,count);
  assert.equal(new Set(state.transcript.map(x=>x.actorId)).size,count);
  assert.equal(f.native.calls.length,0);
 }
});

test('client projection refuses duplicate and out-of-order snapshots',async()=>{
 const f=fixture();
 const mirror=createRoomReplica('room-1');
 await f.send(1,'first','hola');
 const one=f.authority.snapshot();
 await f.send(1,'second','doctor Vega cómo está?');
 const two=f.authority.snapshot();
 assert.equal(mirror.apply(two).applied,true);
 assert.equal(mirror.apply(one).applied,false);
 assert.equal(mirror.apply(two).applied,false);
 assert.equal(mirror.snapshot().revision,2);
 const stolen=mirror.snapshot();stolen.transcript.splice(0);
 assert.equal(mirror.snapshot().transcript.length,2);
 assert.equal(mirror.apply({...two,roomId:'other-room',revision:99}).applied,false);
});

test('speech classifier uses native scanner but never executes',()=>{
 const nursing=routeWardSpeech('Enfermera hemograma',{patientUid:'p',studies,therapies});
 assert.equal(nursing.intents.length,1);
 assert.equal(nursing.intents[0].kind,'study.request');
 assert.equal(routeWardSpeech('Vega, explicame esto',{patientUid:'p'}).recipient,'vega');
 assert.equal(routeWardSpeech('¿Te duele aquí?',{patientUid:'p'}).recipient,'patient');
 assert.equal(routeWardSpeech('Enfermera albúmina',{patientUid:'p',studies,therapies}).intents[0].id,'albumin');
});

function completed(call,status='executed'){
 return {eventId:call.eventId,patientUid:call.patientUid,status,
  ...(status==='executed'?{receipt:{eventId:call.eventId,patientUid:call.patientUid,
   kind:call.intent.kind,id:call.intent.id}}:{reason:'native '+status})};
}

test('native completion updates the original acknowledgement and emits one room revision',async()=>{
 const f=fixture();
 const original=await f.send(1,'study','Enfermera hemograma');
 const result=completed(f.native.calls[0]);
 f.nativePort.complete(result);
 await f.authority.flush();
 assert.equal(f.authority.readRevision(),2);
 assert.equal(f.authority.snapshot().transcript.length,1);
 assert.equal(f.events.length,2);
 const event=f.events[1];
 assert.equal(event.type,'clinical.completed');
 assert.equal(event.roomId,'room-1');
 assert.equal(event.commandId,'study');
 assert.equal(event.actorId,'doctor-1');
 assert.equal(event.patientUid,'patient-a');
 assert.equal(event.eventId,result.eventId);
 assert.equal(event.clinical[0].status,'executed');
 assert.equal(event.revision,2);
 const retry=await f.send(1,'study','Enfermera hemograma');
 assert.equal(retry.revision,2);
 assert.equal(retry.clinical[0].status,'executed');
 assert.deepEqual(retry.clinical[0].receipt,result.receipt);
 assert.equal(original.clinical[0].status,'pending');
 assert.equal(f.events[0].clinical[0].status,'pending');
 assert.equal(f.native.calls.length,1);
 f.nativePort.complete(result);
 await f.authority.flush();
 assert.equal(f.authority.readRevision(),2);
 assert.equal(f.events.length,2);
});

test('completion stays attached to its original actor and command after later chat',async()=>{
 const f=fixture();
 await f.send(1,'study','Enfermera hemograma');
 const later=f.send(2,'later','Hola');
 f.nativePort.complete(completed(f.native.calls[0]));
 await later;
 await f.authority.flush();
 const state=f.authority.snapshot(),event=f.events.at(-1);
 assert.deepEqual(state.events.map(x=>x.type),['chat.posted','chat.posted','clinical.completed']);
 assert.equal(event.commandId,'study');
 assert.equal(event.actorId,'doctor-1');
 assert.equal(state.transcript.length,2);
 assert.equal(state.revision,3);
 assert.equal((await f.send(2,'later','Hola')).clinical.length,0);
 assert.equal((await f.send(1,'study','Enfermera hemograma')).clinical[0].status,'executed');
 assert.equal(f.native.calls.length,1);
});

test('one completed action cannot overwrite another action in a composite command',async()=>{
 const f=fixture();
 await f.send(1,'mixed','Enfermera hemograma y ceftriaxona');
 f.nativePort.complete(completed(f.native.calls.find(x=>x.intent.kind==='study.request')));
 await f.authority.flush();
 const retry=await f.send(1,'mixed','Enfermera hemograma y ceftriaxona');
 assert.deepEqual(retry.clinical.map(x=>[x.id,x.status]),[['hemogram','executed'],['ceftriaxone','executed']]);
 assert.equal(f.native.studies.length,1);
 assert.equal(f.native.drugs.length,1);
 assert.deepEqual(f.events.at(-1).clinical.map(x=>x.id),['hemogram']);
});

function callbackFixture(){
 let notify,unsubscribed=0,calls=0;
 const port={execute:async request=>{calls++;return {status:'pending',
  patientUid:request.patientUid,eventId:request.eventId};},
  subscribeCompletion(callback){notify=callback;return ()=>{unsubscribed++;};}};
 const authority=createRoomAuthority({roomId:'callbacks',mode:'coop',members:[{id:'doctor'}],
  patients:[{uid:'patient'}],authenticate:()=>({id:'doctor',roomId:'callbacks'}),clinicalPort:port,
  resolveSpeechContext:()=>({patientUid:'patient',studies,therapies})});
 const send=()=>authority.dispatch({id:'study',kind:'chat.post',text:'Enfermera hemograma'},'ok');
 const outcome=(status='executed')=>({eventId:'callbacks:doctor:study:0',patientUid:'patient',status,
  ...(status==='executed'?{receipt:{eventId:'callbacks:doctor:study:0',patientUid:'patient'}}:
   {reason:'native '+status})});
 return {authority,send,outcome,notify:result=>notify(result),unsubscribed:()=>unsubscribed,calls:()=>calls};
}

test('authority ignores unknown, wrong-patient and unverified completion callbacks',async()=>{
 const f=callbackFixture();
 await f.send();
 for(const result of [{...f.outcome(),eventId:'unknown'},
  {...f.outcome(),patientUid:'other'}, {...f.outcome(),status:'pending'},
  {...f.outcome(),receipt:null},
  {...f.outcome(),receipt:{eventId:'wrong',patientUid:'patient'}}])f.notify(result);
 await f.authority.flush();
 assert.equal(f.authority.readRevision(),1);
 assert.equal((await f.send()).clinical[0].status,'pending');
 assert.equal(f.calls(),1);
 f.notify(f.outcome());
 await f.authority.flush();
 assert.equal(f.authority.readRevision(),2);
 f.notify(f.outcome('rejected'));
 f.notify(f.outcome('unconfirmed'));
 await f.authority.flush();
 assert.equal(f.authority.readRevision(),2);
 assert.equal((await f.send()).clinical[0].status,'executed');
});

test('native rejection and uncertainty complete pending acknowledgements without another effect',async()=>{
 for(const status of ['rejected','unconfirmed']){
  const f=fixture();
  await f.send(1,'study','Enfermera hemograma');
  f.nativePort.complete(completed(f.native.calls[0],status));
  await f.authority.flush();
  assert.equal((await f.send(1,'study','Enfermera hemograma')).clinical[0].status,status);
  assert.equal(f.authority.readRevision(),2);
  assert.equal(f.native.calls.length,1);
 }
});

test('completion delivered before execute returns waits for the original command to be recorded',async()=>{
 const port=createNativeClinicalPort({withPatient:(uid,fn)=>fn({uid}),
  invoke:({patientUid})=>({status:'pending',patientUid})});
 const events=[];
 const authority=createRoomAuthority({roomId:'early',mode:'coop',members:[{id:'doctor'}],
  patients:[{uid:'patient'}],authenticate:()=>({id:'doctor',roomId:'early'}),
  clinicalPort:{subscribeCompletion:callback=>port.subscribeCompletion(callback),
   execute:async request=>{const pending=await port.execute(request);port.complete(completed(request));return pending;}},
  resolveSpeechContext:()=>({patientUid:'patient',studies,therapies}),emit:event=>events.push(event)});
 const command={id:'study',kind:'chat.post',text:'Enfermera hemograma'};
 await authority.dispatch(command,'ok');
 await authority.flush();
 assert.deepEqual(events.map(e=>e.type),['chat.posted','clinical.completed']);
 assert.equal((await authority.dispatch(command,'ok')).clinical[0].status,'executed');
 assert.equal(authority.snapshot().transcript.length,1);
});

test('disposing authority unsubscribes once and ignores already queued or later completions',async()=>{
 const f=callbackFixture();
 await f.send();
 f.notify(f.outcome());
 f.authority.dispose();
 f.authority.dispose();
 f.notify(f.outcome());
 await f.authority.flush();
 assert.equal(f.unsubscribed(),1);
 assert.equal(f.authority.readRevision(),1);
 const result=await f.send();
 assert.equal(result.status,'rejected');
 assert.equal(result.reason,'authority-disposed');
 assert.equal(f.calls(),1);
 assert.equal(f.authority.snapshot().transcript.length,1);
});

test('chat envelopes cannot submit a trusted native completion',async()=>{
 const f=fixture();
 await f.send(1,'study','Enfermera hemograma');
 const result=await f.authority.dispatch({id:'forged-completion',kind:'clinical.completed',
  ...completed(f.native.calls[0]),text:'completed'},'token-doctor-1');
 assert.equal(result.status,'rejected');
 assert.equal(result.reason,'invalid-command');
 assert.equal(f.authority.readRevision(),1);
 assert.equal(f.nativePort.receipt(f.native.calls[0].eventId).status,'pending');
});

test('an executor without completion subscriptions keeps the existing dispatch contract',async()=>{
 let calls=0;
 const authority=createRoomAuthority({roomId:'plain',mode:'coop',members:[{id:'doctor'}],
  patients:[{uid:'patient'}],authenticate:()=>({id:'doctor',roomId:'plain'}),
  clinicalPort:{execute:async request=>{calls++;return {status:'pending',
   patientUid:request.patientUid,eventId:request.eventId};}},
  resolveSpeechContext:()=>({patientUid:'patient',studies,therapies})});
 const command={id:'study',kind:'chat.post',text:'Enfermera hemograma'};
 const initial=await authority.dispatch(command,'ok');
 await authority.flush();
 assert.deepEqual(await authority.dispatch(command,'ok'),initial);
 assert.equal(initial.clinical[0].status,'pending');
 assert.equal(calls,1);
 assert.equal(authority.readRevision(),1);
 authority.dispose();
 assert.equal((await authority.dispatch(command,'ok')).status,'rejected');
});
