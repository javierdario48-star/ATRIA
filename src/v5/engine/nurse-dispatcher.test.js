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
  receipt:{eventId:'valid',patientUid:'P1'}}).status,'nurse-not-at-bed');
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
