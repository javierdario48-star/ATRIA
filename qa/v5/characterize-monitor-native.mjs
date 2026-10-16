// QA-only: compare the effective last monitor layout, not the earlier v40 hint.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {apply487} from '../../src/integration/apply-487.js';
import {hospitalEntities} from '../../src/v5/engine/interactions.js';
const source=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const script=source.match(/<script id="cs413-monitor-walk-v4_1_3">([\s\S]*?)<\/script>/)?.[1];
assert(script,'effective final monitor scene missing');
const read=n=>JSON.parse(fs.readFileSync('src/v5/content/'+n+'.json','utf8'));
const beds=read('beds'),map=read('hospital');
const excerpt=(first,next)=>{const a=script.indexOf(first),b=script.indexOf(next,a);assert(a>=0&&b>a);return script.slice(a,b);};
const ctx=vm.createContext({window:{csBedRegistryV39:beds},W:map.source_size_px[0],normalizeApproach:()=>{}});
vm.runInContext(excerpt(' const screens=',' for(const im')+excerpt(' function monitorFor(',' function patients(')+'\nglobalThis.monitor=monitorFor;',ctx,{timeout:1000});
let comparisons=0;
for(const b of beds){
 const p={uid:'P-'+b.id,bedId:b.id,x:b.patient[0],y:b.patient[1]};
 for(const moved of [false,true]){
  const patient=moved?{...p,x:p.x+32,y:p.y+16}:p;
  const expected=ctx.monitor({bedId:b.id,bed:{...b,patient:[patient.x,patient.y]}});
  const actual=hospitalEntities({patients:[patient],nurses:[],expert:null},map,beds).find(e=>e.kind==='monitor');
  assert.deepEqual([actual.x,actual.y],[expected.x,expected.y],b.id+' '+(moved?'relocated':'artwork'));
  assert.equal(actual.added,expected.added,b.id+' visible extra screen');comparisons++;
 }
}
console.log(JSON.stringify({test:'effective-original-monitor-placement',comparisons,passed:true,
 source:'cs413-monitor-walk-v4_1_3 (supersedes v40MonitorPoint)',scope:'8 original screens and 8 relocated fallbacks; no proximity/clinical rule change'}));
