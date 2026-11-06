import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardSpeechMemory} from './guard-speech-memory.js';

const storageFixture=()=>{
 const values=new Map();
 return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
};
const clinical=()=>({
 patient:{uid:'room:patient:A',closure:{closed:true,destination:'sala',eventId:'close-A'}},
 messages:[{id:'player:doctor:message-1',role:'player'},{id:'ack:doctor:message-1:0',role:'patient'}],
 communication:{activity:[
  {id:'room:patient:A:activity:ack:doctor:message-1:0',patientUid:'room:patient:A',kind:'answer'},
  {id:'room:activity:patient:B:activity:completion:order-B',patientUid:'room:activity:patient:B',kind:'result'},
  {id:'room:activity:patient:B:activity:ack:doctor:close:0',patientUid:'room:activity:patient:B',kind:'disposition',eventId:'close-B'},
 ]}
});

test('recovery silences known patient, nurse and farewell history from every authorized patient projection',()=>{
 const memory=createGuardSpeechMemory(),state=clinical(),before=structuredClone(state);
 memory.seed(state,'room','doctor');
 assert.equal(memory.has('room:patient:A','player:doctor:message-1'),true);
 assert.equal(memory.has('room:patient:A','ack:doctor:message-1:0'),true);
 assert.equal(memory.has('room:patient:A','nurse-final:room:patient:A:close-A'),true);
 assert.equal(memory.has('room:activity:patient:B','completion:order-B'),true);
 assert.equal(memory.has('room:activity:patient:B','nurse-final:room:activity:patient:B:close-B'),true);
 assert.deepEqual(state,before,'presentation memory cannot change authoritative clinical data');
 assert.equal(memory.has('room:patient:A','ack:doctor:later:0'),false);
 assert.equal(memory.mark('room:patient:A','ack:doctor:later:0'),true,'a genuinely new message may play once');
 assert.equal(memory.mark('room:patient:A','ack:doctor:later:0'),false,'the same receipt never replays');
});

test('the same message ID at another patient remains a distinct audible event',()=>{
 const memory=createGuardSpeechMemory();memory.seed(clinical(),'room','doctor');
 assert.equal(memory.has('room:activity:patient:B','player:doctor:message-1'),false);
 assert.equal(memory.mark('room:activity:patient:B','player:doctor:message-1'),true);
 assert.equal(memory.mark('room:activity:patient:B','player:doctor:message-1'),false);
 assert.equal(memory.has('room:patient:A','completion:order-B'),false);
});

test('source IDs use the exact patient prefix without splitting patient UIDs or accepting a different patient',()=>{
 const memory=createGuardSpeechMemory();
 memory.seed({patient:{uid:'selected'},messages:[],communication:{activity:[
  {id:'room:activity:patient:B:activity:ack:doctor:m:0',patientUid:'room:activity:patient:B'},
  {id:'another:activity:wrong-row',patientUid:'selected'},
  {id:'selected:activity:',patientUid:'selected'},
 ]}},'room','doctor');
 assert.equal(memory.has('room:activity:patient:B','ack:doctor:m:0'),true);
 assert.equal(memory.has('room:activity:patient:B','patient:B:activity:ack:doctor:m:0'),false);
 assert.equal(memory.has('selected','wrong-row'),false);
 assert.equal(memory.has('selected',''),false);
});

test('newly heard rows survive reload while room and actor scopes remain independent',()=>{
 const storage=storageFixture(),first=createGuardSpeechMemory({storage});
 first.seed(clinical(),'room','doctor');first.mark('room:patient:A','heard-after-entry');
 const recovered=createGuardSpeechMemory({storage});
 recovered.seed({patient:{uid:'room:patient:A'},messages:[]},'room','doctor');
 assert.equal(recovered.has('room:patient:A','heard-after-entry'),true);
 recovered.seed({patient:{uid:'room:patient:A'},messages:[]},'room','colleague');
 assert.equal(recovered.has('room:patient:A','heard-after-entry'),false);
 recovered.mark('room:patient:A','colleague-only');
 recovered.seed({patient:{uid:'room:patient:A'},messages:[]},'different-room','doctor');
 assert.equal(recovered.has('room:patient:A','heard-after-entry'),false);
 recovered.seed({patient:{uid:'room:patient:A'},messages:[]},'room','doctor');
 assert.equal(recovered.has('room:patient:A','heard-after-entry'),true);
 assert.equal(recovered.has('room:patient:A','colleague-only'),false);
});

test('optional unavailable or corrupt browser storage never prevents speech deduplication',()=>{
 for(const storage of [undefined,{getItem(){throw Error('denied');},setItem(){throw Error('full');}},
  {getItem:()=>'{broken',setItem(){throw Error('full');}}]){
  const memory=createGuardSpeechMemory({storage});
  assert.doesNotThrow(()=>memory.seed(clinical(),'room','doctor'));
  assert.equal(memory.has('room:patient:A','ack:doctor:message-1:0'),true);
  assert.equal(memory.mark('room:patient:A','new'),true);
  assert.equal(memory.mark('room:patient:A','new'),false);
 }
});
