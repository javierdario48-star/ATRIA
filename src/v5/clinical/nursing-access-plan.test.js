import test from 'node:test';
import assert from 'node:assert/strict';
import {planNursingIVAccess} from './nursing-access-plan.js';
const doses={ceftriaxone:{amount:1000,unit:'mg',display:'1 g'},
 fluid:{amount:500,unit:'ml',display:'500 ml'},metronidazole:{amount:500,unit:'mg',display:'500 mg'}};
const iv=(id,clause)=>({kind:'therapy.request',id,clause,sourceText:clause});
const line=count=>({kind:'procedure.request',id:'iv',count,clause:count===2?'dos vías':'una vía'});
test('reorders explicitly prescribed access before IV medication without losing intents',()=>{
 const intents=[iv('ceftriaxone','ceftriaxona 1 g'),{kind:'procedure.request',id:'monitor'},line(2),iv('metronidazole','metronidazol 500 mg')];
 const planned=planNursingIVAccess(intents,{venousAccessCount:0,pendingIV:false,defaultDoses:doses});
 assert.deepEqual(planned.map(x=>x.id),['iv','ceftriaxone','monitor','metronidazole']);
 assert.equal(planned[0].count,2);
 assert.equal(planned.length,intents.length);
 assert.equal(planned[0].automatic,undefined);
});
test('valid IV medicine without access requests one visible automatic line',()=>{
 const intents=[iv('fluid','Ringer 500 ml'),iv('ceftriaxone','ceftriaxona 1 g')];
 const planned=planNursingIVAccess(intents,{venousAccessCount:0,pendingIV:false,defaultDoses:doses});
 assert.deepEqual(planned.map(x=>x.id),['iv','fluid','ceftriaxone']);
 assert.equal(planned[0].count,1);assert.equal(planned[0].automatic,true);
 assert.equal(planned.filter(x=>x.id==='iv').length,1);
});
test('existing/pending IV does not create another catheterization',()=>{
 const command=[iv('ceftriaxone','ceftriaxona 1 g')];
 for(const context of [{venousAccessCount:1,pendingIV:false},{venousAccessCount:0,pendingIV:true}]){
  assert.deepEqual(planNursingIVAccess(command,{...context,defaultDoses:doses}),command);
 }
});
test('invalid dose, route, negation and unknown context never cause automatic cannulation',()=>{
 const invalid=[iv('ceftriaxone','ceftriaxona 2 g'),iv('ceftriaxone','ceftriaxona oral 1 g'),iv('fluid','Ringer 300 ml')];
 for(const item of invalid)assert.deepEqual(planNursingIVAccess([item],{venousAccessCount:0,pendingIV:false,defaultDoses:doses}),[item]);
 assert.deepEqual(planNursingIVAccess([iv('fluid','Ringer')],{}),[iv('fluid','Ringer')]);
 assert.deepEqual(planNursingIVAccess([{kind:'history.ask',id:'dialogue'}],{venousAccessCount:0,defaultDoses:doses}),[{kind:'history.ask',id:'dialogue'}]);
});
