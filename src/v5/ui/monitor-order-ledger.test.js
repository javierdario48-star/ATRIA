import test from 'node:test';
import assert from 'node:assert/strict';
import {monitorOrderLedger,administeredTreatmentHistory,latestMonitorOrderState} from './monitor-order-ledger.js';
test('monitor receipt progresses from pending to executed using same native event ID',()=>{
 const room={roomId:'B1',events:[{type:'chat.posted',message:{id:'one',actorId:'doc',patientUid:'P',at:1},
  clinical:[{kind:'therapy.request',id:'fluid',status:'pending'}]}]};
 const patient={uid:'P',administrationLog:[]};
 assert.equal(latestMonitorOrderState(monitorOrderLedger(room,patient),'one').status,'pending');
 assert.deepEqual(administeredTreatmentHistory(patient),[]);
 room.events.push({type:'clinical.completed',patientUid:'P',commandId:'one',eventId:'B1:doc:one:0',at:3,
  clinical:[{kind:'therapy.request',id:'fluid',status:'executed',
   receipt:{eventId:'B1:doc:one:0',patientUid:'P',message:'Administración confirmada'}}]});
 let state=latestMonitorOrderState(monitorOrderLedger(room,patient),'one');
 assert.equal(state.status,'executed');assert.equal(state.completed,1);
 assert.equal(state.details[0].receipt.patientUid,'P');
 patient.administrationLog.push({sourceEventId:'B1:doc:one:0',id:'fluid',label:'Ringer',patientUid:'P',
  dose:{display:'500 ml'},administeredAtRealSecond:3});
 assert.deepEqual(administeredTreatmentHistory(patient).map(t=>[t.label,t.dose,t.time]),[['Ringer','500 ml',3]]);
});
test('a partially rejected compound request is never presented as fully administered',()=>{
 const room={roomId:'B1',events:[{type:'chat.posted',message:{id:'two',actorId:'doc',patientUid:'P'},
  clinical:[{kind:'procedure.request',id:'iv',status:'pending'},{kind:'therapy.request',id:'ceftriaxone',status:'rejected',reason:'unsupported-dose'}]}]};
 const p={uid:'P'};
 assert.equal(latestMonitorOrderState(monitorOrderLedger(room,p),'two').status,'rejected');
 room.events.push({type:'clinical.completed',patientUid:'P',commandId:'two',eventId:'B1:doc:two:0',at:2,
  clinical:[{kind:'procedure.request',id:'iv',status:'executed',receipt:{eventId:'B1:doc:two:0',patientUid:'P'}}]});
 const result=latestMonitorOrderState(monitorOrderLedger(room,p),'two');
 assert.deepEqual([result.completed,result.rejected,result.pending],[1,1,0]);
 assert.equal(result.status,'rejected');
});
test('patient isolation and native administration history survive truncated chat events',()=>{
 const room={roomId:'B1',events:[
  {type:'chat.posted',message:{id:'x',actorId:'doc',patientUid:'OTHER'},clinical:[{kind:'therapy.request',id:'fluid',status:'executed'}]},
  {type:'clinical.completed',patientUid:'OTHER',commandId:'y',eventId:'X',clinical:[{kind:'therapy.request',id:'fluid',status:'executed'}]}
 ]};
 assert.deepEqual(monitorOrderLedger(room,{uid:'P'}),[]);
 const p={uid:'P',administrationLog:[{id:'metronidazole',patientUid:'P',label:'Metronidazol',
  sourceEventId:'old',dose:{display:'500 mg'},administeredAtRealSecond:4}]};
 assert.equal(administeredTreatmentHistory(p).length,1);
 assert.equal(latestMonitorOrderState([], 'unknown'),null);
});

test('oxygen suspension follows the same pending-to-terminal receipt ledger',()=>{
 const room={roomId:'R',events:[{type:'chat.posted',message:{id:'stop',actorId:'doc',patientUid:'P'},
  clinical:[{kind:'therapy.stop',id:'oxygen',status:'pending'}]}]};
 assert.equal(latestMonitorOrderState(monitorOrderLedger(room,{uid:'P'}),'stop').status,'pending');
 room.events.push({type:'clinical.completed',patientUid:'P',eventId:'R:doc:stop:0',commandId:'stop',
  clinical:[{kind:'therapy.stop',id:'oxygen',status:'executed',receipt:{eventId:'R:doc:stop:0',patientUid:'P'}}]});
 assert.equal(latestMonitorOrderState(monitorOrderLedger(room,{uid:'P'}),'stop').status,'executed');
});
