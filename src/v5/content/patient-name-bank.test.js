import test from 'node:test';
import assert from 'node:assert/strict';

test('the reusable Latin-American name bank supplies at least one million real nominal combinations',async()=>{
 const module=await import('./patient-name-bank.js').catch(()=>null);
 assert(module,'a reusable patient name bank must be available');
 const bank=module.PATIENT_NAME_BANKS[module.PATIENT_NAME_BANK_ID];
 assert(bank,'the default bank reference must resolve');
 const canonical=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 for(const [label,names] of [['first names',bank.firstNames],['surnames',bank.lastNames]]){
  assert(names.length>=1000,label+' require at least 1000 entries');
  assert.equal(new Set(names.map(canonical)).size,names.length,label+' must be distinct beyond accent variants');
  assert(names.every(name=>/^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u.test(name)),label+' must contain names, never numbered placeholders');
  assert(Object.isFrozen(names),'shared name lists must not be mutable');
 }
 assert(bank.firstNames.length*bank.lastNames.length>=1_000_000);
 assert(bank.firstNames.includes('María'));
 assert(bank.firstNames.includes('José'));
 assert(bank.lastNames.includes('García'));
 assert(bank.lastNames.includes('Rodríguez'));
});
