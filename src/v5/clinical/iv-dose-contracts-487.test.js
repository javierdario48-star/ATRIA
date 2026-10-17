import test from 'node:test';
import assert from 'node:assert/strict';
import {noradrenalineOrderIssue487 as original} from '../../integration/nurse-execution-487.js';
import {noradrenalineOrderIssue487,parseSpecialIVDose487} from './iv-dose-contracts-487.js';
test('native norepinephrine interpretation is the exact effective original pure function, not its HTML wrapper',()=>{
 assert.equal(noradrenalineOrderIssue487.toString(),original.toString());
 for(const text of ['noradrenalina','noradrenalina 0,05 µg/kg/min EV','norepinefrina 0.05 μg/kg/min IV',
  'nora 0.05 ug/kg/min IV','noradrenalina via IV 0.2 mcg/kg/min'])
  assert.equal(noradrenalineOrderIssue487(text),null,text);
 for(const text of ['vasopresor 0.05 mcg/kg/min','noradrenalina 0.05 mg IV','noradrenalina en bolo IV',
  'noradrenalina -0.05 mcg/kg/min IV','noradrenalina .05 mcg/kg/min IV','noradrenalina 0 mcg/kg/min IV',
  'noradrenalina 0.05 mcg/kg/min oral','noradrenalina cinco miligramos IV','noradrenalina via'])
  assert.notEqual(noradrenalineOrderIssue487(text),null,text);
});
test('special formulations retain original units, decimal comma, defaults and permission to take excessive doses',()=>{
 const refs={albumin:{amount:1.5,unit:'g/kg',display:'1.5 g/kg'},transfusion:{amount:1,unit:'unidad',display:'1 unidad'},
  vasopressor:{amount:.05,unit:'µg/kg/min',display:'0.05 µg/kg/min'},amphotericin:{amount:.7,unit:'mg/kg',display:'0.7 mg/kg'}};
 for(const [id,text,amount] of [['albumin','albumina 1,5 g/kg',1.5],['albumin','albumina 8 g/kg',8],
  ['transfusion','transfusion 2 unidades',2],['transfusion','transfusion 1 unidad',1],
  ['vasopressor','noradrenalina 1 mcg/kg/min IV',1],['amphotericin','anfotericina 0.7 mg/kg',.7]]){
  const result=parseSpecialIVDose487(id,text,refs[id]);assert.equal(result.amount,amount,text);
  assert.equal(result.unit,refs[id].unit);assert.equal(result.defaultApplied,false);
 }
 assert.equal(parseSpecialIVDose487('vasopressor','noradrenalina',refs.vasopressor).defaultApplied,true);
 for(const [id,text] of [['albumin','albumina 1.5 mg/kg'],['albumin','albumina -1.5 g/kg'],
  ['transfusion','transfusion 1 unidad 5 mg'],['amphotericin','anfotericina 0.7 mg'],
  ['amphotericin','anfotericina 0.7 mg/kg oral'],['albumin','albumina 1.5 g/kg 2 g/kg']])
  assert.throws(()=>parseSpecialIVDose487(id,text,refs[id]),/dose/,text);
});
