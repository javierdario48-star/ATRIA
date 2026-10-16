import test from 'node:test';
import assert from 'node:assert/strict';
import {monitorOrderExamples} from './monitor-order-suggestions.js';
test('C07 search uses one common IV vocabulary in both eligible native cases',()=>{
 for(const caseId of ['APP-001','CIRR-001']){
  for(const [query,command] of [['ringer','Ringer 500 ml'],['ceftriax','ceftriaxona 1 g'],
   ['metronidazol','metronidazol 500 mg'],['dos vías','dos vías']]){
   const suggestions=monitorOrderExamples(caseId,query);
   assert(suggestions.some(x=>x.command===command),caseId+' '+query);
  }
 }
 assert.deepEqual(monitorOrderExamples('UNKNOWN-CASE','ringer'),[]);
});
test('order autocomplete is presentation only, never sends a clinical administration',()=>{
 const found=monitorOrderExamples('CIRR-001','ringer');
 assert.equal(found.length,1);
 assert.deepEqual(found[0],{id:'fluid',label:'Ringer lactato 500 ml',command:'Ringer 500 ml'});
 assert.equal(monitorOrderExamples('CIRR-001','').length,0);
 assert(monitorOrderExamples('CIRR-001','',{hint:true}).length>0);
});
