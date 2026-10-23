import test from 'node:test';
import assert from 'node:assert/strict';
import {distinctOrderSuggestions} from './monitor-order-suggestions.js';
test('bedside command assistance keeps one button per canonical command across spelling dictionaries',()=>{
 const items=[{label:'Espiro',replacement:'espironolactona 100 mg oral'},
  {label:'Espironolactona',command:'Espironolactona 100 mg oral'},
  {label:'Ceftriaxona',command:'ceftriaxona 1 g'}];
 assert.deepEqual(distinctOrderSuggestions(items).map(x=>x.label),['Espiro','Ceftriaxona']);
});
