import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation} from './navigation.js';
import {createNurseDispatcher} from './nurse-dispatcher.js';

const openMap=(columns=8,rows=8)=>({source_size_px:[columns*32,rows*32],
 grid:{columns,rows},state_matrix:Array.from({length:rows},()=>Array(columns).fill(0)),
 doors:[],door_state:{}});
const actor=(nav,id,c,r)=>({id,...nav.center(c,r),r:8.5,speed:140,
 path:[],pathIndex:0,target:null,dir:'S',moving:false,walkPhase:0});
const fixture=()=>{
 const nav=createNavigation(openMap()),nurse=actor(nav,'N1',1,1),patient={uid:'P1',approach:[6,6]};
 const dispatcher=createNurseDispatcher({navigation:nav,nurses:[nurse],patients:[patient]});
 return {nav,nurse,patient,dispatcher};
};
function arrive(dispatcher,max=400){
 for(let i=0;i<max;i++){dispatcher.advance(1/60);const events=dispatcher.takeArrivals();
  if(events.length)return events;}
 assert.fail('nurse never reached the bedside');
}
test('C08a nurse walks through the original collision navigation and does not administer on arrival',()=>{
 const f=fixture(),initial={...f.nurse},command={eventId:'ROOM:doctor:cmd:0',patientUid:'P1',kind:'procedure.request'};
 const result=f.dispatcher.enqueue(command);
 assert.equal(result.status,'travelling');
 assert.equal(f.dispatcher.enqueue(command).status,'duplicate');
 assert.equal(f.dispatcher.enqueue({...command,patientUid:'P2'}).status,'conflict');
 assert.equal(f.dispatcher.snapshot().length,1);
 const early=f.dispatcher.acceptClinicalResult({...command,status:'executed',
  receipt:{eventId:command.eventId,patientUid:'P1'}});
 assert.equal(early.status,'nurse-not-at-bed','travel alone cannot authorize execution');
 const events=arrive(f.dispatcher);
 assert.deepEqual(events.map(e=>[e.eventId,e.patientUid,e.kind,e.nurseId]),
  [[command.eventId,'P1','procedure.request','N1']]);
 assert(Math.hypot(f.nurse.x-initial.x,f.nurse.y-initial.y)>50);
 assert.equal(f.nav.circleBlocked(f.nurse.x,f.nurse.y,f.nurse.r),false);
 assert.equal(f.dispatcher.snapshot()[0].stage,'at-bed');
 assert.deepEqual(f.dispatcher.takeArrivals(),[]);
 assert.equal(f.dispatcher.acceptClinicalResult({...command,status:'executed',receipt:{eventId:'forgery',patientUid:'P1'}}).status,'invalid-receipt');
 assert.equal(f.dispatcher.snapshot()[0].stage,'at-bed');
 assert.equal(f.dispatcher.acceptClinicalResult({...command,status:'executed',
  receipt:{eventId:command.eventId,patientUid:'P1'}}).status,'confirmed');
 assert.equal(f.nurse.journeyId,null);
 assert.equal(f.dispatcher.snapshot()[0].stage,'confirmed');
 assert.equal(f.dispatcher.enqueue(command).status,'duplicate','retry does not recreate a trip');
});
test('C08a two orders share one nurse FIFO, preserving independent patient event identities',()=>{
 const f=fixture();
 const first={eventId:'order-a',patientUid:'P1',kind:'monitor'};
 const second={eventId:'order-b',patientUid:'P1',kind:'iv'};
 assert.equal(f.dispatcher.enqueue(first).status,'travelling');
 assert.equal(f.dispatcher.enqueue(second).status,'queued');
 assert.deepEqual(arrive(f.dispatcher).map(x=>x.eventId),['order-a']);
 assert.equal(f.dispatcher.snapshot()[1].stage,'queued');
 f.dispatcher.acceptClinicalResult({...first,status:'executed',receipt:{eventId:'order-a',patientUid:'P1'}});
 assert.equal(f.dispatcher.snapshot()[1].stage,'travelling');
 assert.deepEqual(arrive(f.dispatcher).map(x=>x.eventId),['order-b']);
 assert.equal(f.dispatcher.acceptClinicalResult({...second,status:'rejected'}).status,'rejected');
 assert.equal(f.nurse.journeyId,null);
});
test('C08a unknown patient, cancellation and disposal cannot produce phantom clinical completion',()=>{
 const f=fixture();
 assert.equal(f.dispatcher.enqueue({eventId:'x',patientUid:'P404',kind:'iv'}).status,'unknown-patient');
 assert.equal(f.dispatcher.enqueue({eventId:'',patientUid:'P1',kind:'iv'}).status,'invalid-task');
 assert.equal(f.dispatcher.enqueue({eventId:'valid',patientUid:'P1',kind:'iv'}).status,'travelling');
 assert.equal(f.dispatcher.cancel('valid'),true);
 assert.equal(f.nurse.journeyId,null);
 assert.equal(f.dispatcher.snapshot()[0].stage,'cancelled');
 assert.equal(f.dispatcher.cancel('valid'),false);
 assert.equal(f.dispatcher.acceptClinicalResult({eventId:'valid',patientUid:'P1',status:'executed',
  receipt:{eventId:'valid',patientUid:'P1'}}).status,'already-final');
 assert.equal(f.dispatcher.snapshot()[0].stage,'cancelled','late receipt cannot revive cancelled work');
 f.dispatcher.dispose();f.dispatcher.dispose();
 assert.deepEqual(f.dispatcher.snapshot(),[]);
 assert.deepEqual(f.dispatcher.takeArrivals(),[]);
 assert.equal(f.dispatcher.enqueue({eventId:'new',patientUid:'P1',kind:'iv'}).status,'disposed');
});
test('C08a closed door prevents misleading arrival even if a task was queued',()=>{
 const map=openMap(5,3);
 for(let c=0;c<5;c++){map.state_matrix[0][c]=1;map.state_matrix[2][c]=1;}
 map.state_matrix[1][2]=2;
 map.doors=[{id:'ward',tiles:[[2,1]],initial_open:false}];
 map.door_state={ward:false};
 const nav=createNavigation(map),n=actor(nav,'N',1,1);
 const d=createNurseDispatcher({navigation:nav,nurses:[n],patients:[{uid:'P',approach:[3,1]}]});
 assert.equal(d.enqueue({eventId:'door-task',patientUid:'P',kind:'monitor'}).status,'queued');
 for(let i=0;i<120;i++)d.advance(1/60);
 assert.deepEqual(d.takeArrivals(),[]);
 assert.equal(d.snapshot()[0].stage,'queued');
 nav.setDoor('ward',true);
 const ev=arrive(d);
 assert.equal(ev[0].eventId,'door-task');
 assert.equal(d.snapshot()[0].stage,'at-bed');
});

test('an unreachable nursing journey expires visibly, releases the nurse and can be retried after checkpoint recovery',()=>{
 const map=openMap(5,3);
 for(let c=0;c<5;c++){map.state_matrix[0][c]=1;map.state_matrix[2][c]=1;}
 map.state_matrix[1][2]=2;map.doors=[{id:'ward',tiles:[[2,1]],initial_open:false}];map.door_state={ward:false};
 const nav=createNavigation(map),n=actor(nav,'N',1,1),patients=[{uid:'P',approach:[3,1]}];
 let d=createNurseDispatcher({navigation:nav,nurses:[n],patients});
 d.enqueue({eventId:'blocked',patientUid:'P',kind:'iv'});d.advance(45);
 const checkpoint=d.checkpoint();
 d=createNurseDispatcher({navigation:nav,nurses:[n],patients,checkpoint});d.advance(46);
 const errors=d.takeArrivals();
 assert.equal(errors.length,1);assert.equal(errors[0].status,'error-recoverable');
 assert.equal(errors[0].reason,'nursing-arrival-timeout');
 assert.equal(d.snapshot()[0].stage,'rejected');assert.equal(n.journeyId,undefined);
 nav.setDoor('ward',true);
 assert.equal(d.enqueue({eventId:'retry',patientUid:'P',kind:'iv'}).status,'travelling');
 assert.equal(arrive(d)[0].eventId,'retry');
 assert.equal(d.snapshot()[1].stage,'at-bed');
});

test('a legitimate lengthy bedside preparation does not expire the next queued order',()=>{
 const f=fixture();
 f.dispatcher.enqueue({eventId:'preparation',patientUid:'P1',kind:'vancomycin_iv'});
 arrive(f.dispatcher);
 f.dispatcher.enqueue({eventId:'following',patientUid:'P1',kind:'ampicillin'});
 f.dispatcher.advance(100);
 assert.equal(f.dispatcher.snapshot().find(t=>t.eventId==='following').stage,'queued');
 assert.deepEqual(f.dispatcher.takeArrivals(),[]);
 f.dispatcher.acceptClinicalResult({eventId:'preparation',patientUid:'P1',status:'executed',receipt:{eventId:'preparation',patientUid:'P1'}});
 assert.equal(arrive(f.dispatcher)[0].eventId,'following');
});

test('C08a compound order never floods one patient with multiple nurse sprites',()=>{
 const nav=createNavigation(openMap());
 const nurses=[actor(nav,'N1',1,1),actor(nav,'N2',1,2)];
 const p={uid:'P1',approach:[6,6]};
 const dispatcher=createNurseDispatcher({navigation:nav,nurses,patients:[p]});
 assert.equal(dispatcher.enqueue({eventId:'monitor-1',patientUid:'P1',kind:'monitor'}).status,'travelling');
 assert.equal(dispatcher.enqueue({eventId:'iv-2',patientUid:'P1',kind:'iv'}).status,'queued');
 assert.equal(nurses.filter(n=>n.journeyId).length,1);
 assert.deepEqual(arrive(dispatcher).map(x=>x.eventId),['monitor-1']);
 assert.equal(nurses.filter(n=>n.journeyId).length,1,'arrived nurse retains one bedside lock');
 assert.equal(dispatcher.acceptClinicalResult({eventId:'monitor-1',patientUid:'P1',status:'executed',
  receipt:{eventId:'monitor-1',patientUid:'P1'}}).status,'confirmed');
 assert.equal(dispatcher.snapshot().find(x=>x.eventId==='iv-2').stage,'travelling');
 assert.deepEqual(arrive(dispatcher).map(x=>x.eventId),['iv-2']);
});

test('C08a two distant beds may be served concurrently without leaking identity or receipts',()=>{
 const nav=createNavigation(openMap(12,12));
 const nurses=[actor(nav,'north',1,1),actor(nav,'south',10,10)];
 const patients=[{uid:'P1',approach:[3,3]},{uid:'P2',approach:[8,8]}];
 const work=createNurseDispatcher({navigation:nav,nurses,patients});
 assert.equal(work.enqueue({eventId:'alpha',patientUid:'P1',kind:'monitor'}).status,'travelling');
 assert.equal(work.enqueue({eventId:'beta',patientUid:'P2',kind:'iv'}).status,'travelling');
 assert.equal(nurses.filter(n=>n.journeyId).length,2);
 let arrived=[];
 for(let i=0;i<400&&arrived.length<2;i++){
  work.advance(1/60);arrived.push(...work.takeArrivals());
 }
 assert.deepEqual(new Set(arrived.map(a=>a.patientUid)),new Set(['P1','P2']));
 assert.equal(work.acceptClinicalResult({eventId:'alpha',patientUid:'P2',status:'executed',
  receipt:{eventId:'alpha',patientUid:'P2'}}).status,'unknown-task');
 assert.equal(work.acceptClinicalResult({eventId:'alpha',patientUid:'P1',status:'executed',
  receipt:{eventId:'alpha',patientUid:'P2'}}).status,'invalid-receipt');
 assert.equal(work.snapshot().find(x=>x.eventId==='alpha').stage,'at-bed');
 assert.equal(work.acceptClinicalResult({eventId:'beta',patientUid:'P2',status:'executed',
  receipt:{eventId:'beta',patientUid:'P2'}}).status,'confirmed');
 assert.equal(work.snapshot().find(x=>x.eventId==='alpha').stage,'at-bed',
  'P2 confirmation cannot complete P1 work');
 work.dispose();
});
