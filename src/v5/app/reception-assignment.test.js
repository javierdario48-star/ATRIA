import test from 'node:test';
import assert from 'node:assert/strict';
import {createReceptionAssignment} from './reception-assignment.js';

function fixture(){
 const claimed=[],canceled=[];
 const flow=createReceptionAssignment({
  claim:uid=>claimed.push(uid),cancelClaim:uid=>canceled.push(uid)
 });
 return {flow,claimed,canceled};
}
const stopped={moving:false,target:null,pathIndex:2,path:[1,2]};
const moving={moving:true,target:[10,20],pathIndex:0,path:[1,2]};
const clinical=(owner=null)=>({shift:{mode:'competitive',ended:false,patients:[
 {uid:'p1',bedId:'B1',ownerId:owner,closed:false,departed:false,patientDied:false}
 ]},patient:{uid:'p1'}});

test('reception does not claim while walking; claims once on arrival and only server confirms',()=>{
 const {flow,claimed,canceled}=fixture();
 assert.equal(flow.begin('p1'),true);
 assert.equal(flow.arrive(moving,()=>true),null);
 assert.deepEqual(claimed,[]);
 assert.equal(flow.arrive(stopped,()=>true),'claiming');
 assert.deepEqual(claimed,['p1']);
 assert.equal(flow.arrive(stopped,()=>true),null,'same arrival never submits a second claim');
 assert.equal(flow.observe(clinical(null),'doctor'),null,'unconfirmed assignment never opens the case');
 assert.equal(flow.observe(clinical('doctor'),'doctor').status,'assigned');
 assert.equal(flow.status(),null);
 assert.deepEqual(canceled,['p1']);
});
test('a rival claim or completed case cancels the local intent but cannot mutate clinical state',()=>{
 const {flow,claimed,canceled}=fixture();
 flow.begin('p1');
 assert.deepEqual(flow.observe(clinical('rival'),'doctor'),{status:'occupied',uid:'p1'});
 assert.deepEqual(claimed,[]);
 assert.equal(flow.status(),null);
 flow.begin('p1');
 assert.deepEqual(flow.observe({...clinical(null),shift:{...clinical(null).shift,ended:true}},'doctor'),
  {status:'unavailable',uid:'p1'});
 assert.deepEqual(canceled,['p1','p1']);
});
test('failed approach, changed destination and user cancellation never create ghost claims',()=>{
 const {flow,claimed,canceled}=fixture();
 flow.begin('p1');
 assert.equal(flow.arrive(stopped,()=>false),'missed');
 assert.deepEqual(claimed,[]);
 flow.begin('p1');flow.begin('p2');flow.cancel();
 assert.deepEqual(canceled,['p1','p1','p2']);
 assert.equal(flow.arrive(stopped,()=>true),null);
 assert.equal(flow.status(),null);
});
test('cooperative reception requires arrival even when shared focus already points at the patient',()=>{
 const {flow,claimed}=fixture(),state={...clinical(null),shift:{...clinical(null).shift,mode:'coop'}};
 flow.begin('p1',{firstContact:true});
 assert.equal(flow.observe(state,'doctor'),null,'default room focus is not a bedside arrival');
 assert.equal(flow.arrive(moving,()=>true),null);
 assert.deepEqual(claimed,[]);
 assert.equal(flow.arrive(stopped,()=>true),'claiming');
 assert.deepEqual(claimed,['p1']);
 assert.deepEqual(flow.observe(state,'doctor'),
  {status:'assigned',uid:'p1',bedId:'B1',firstContact:true});
 assert.equal(flow.observe(state,'doctor'),null,'never repeat after a server reconnection');
});

test('first reception claim authorizes exactly one greeting after arrival and server confirmation',()=>{
 const {flow,claimed}=fixture();
 assert.equal(flow.begin('p1',{firstContact:true}),true);
 assert.equal(flow.observe(clinical(null),'doctor'),null);
 assert.equal(flow.arrive(moving,()=>true),null);
 assert.deepEqual(claimed,[]);
 assert.equal(flow.arrive(stopped,()=>true),'claiming');
 assert.deepEqual(claimed,['p1']);
 assert.deepEqual(flow.observe(clinical('doctor'),'doctor'),
  {status:'assigned',uid:'p1',bedId:'B1',firstContact:true});
 assert.equal(flow.observe(clinical('doctor'),'doctor'),null);
});
test('returning to an already assigned patient does not auto-greet or hijack another patient',()=>{
 const {flow}=fixture();
 flow.begin('p1',{firstContact:false});
 flow.arrive(stopped,()=>true);
 assert.deepEqual(flow.observe(clinical('doctor'),'doctor'),
  {status:'assigned',uid:'p1',bedId:'B1',firstContact:false});
 flow.begin('p1',{firstContact:true});
 assert.deepEqual(flow.observe(clinical('rival'),'doctor'),{status:'occupied',uid:'p1'});
 assert.equal(flow.status(),null);
});
