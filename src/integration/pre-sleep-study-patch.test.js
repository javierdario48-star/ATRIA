import assert from'node:assert/strict';
import fs from'node:fs';
import vm from'node:vm';

const patch=fs.readFileSync(new URL('./pre-sleep-study-patch.js',import.meta.url),'utf8');
const ordered=[];
const context={
  console,
  performance:{now:()=>1000},
  globalThis:null,
  C:{studies:[{id:'cbc',label:'Hemograma',aliases:['cbc'],result:'Leucocitosis',delay:2,type:'lab'}]},
  CASES:[
    {studies:[{id:'cbc',label:'Hemograma',aliases:['cbc'],result:'Leucocitosis',delay:2,type:'lab'}]},
    {studies:[{id:'mri',label:'Resonancia de rodilla',aliases:['rm rodilla'],result:'Lesión meniscal',delay:4,type:'image'}]}
  ]
};
context.globalThis=context;
context.findStudy=function(text){
 const n=String(text).toLowerCase();
 return context.C.studies.find(s=>[s.label,...s.aliases].some(a=>n.includes(String(a).toLowerCase())))||null;
};
context.orderStudy=function(s,quiet=false,requestedBy='Jugador'){ordered.push({s,quiet,requestedBy});return s};
context.processCommand=function(q){
 const raw=String(q).trim().replace(/^\//,'').trim();
 if(/^estudio\s+/i.test(raw)){
   const label=raw.replace(/^estudio\s+/i,'');
   const s=context.findStudy(label);
   if(s)return context.orderStudy(s);
 }
 return 'legacy';
};
vm.createContext(context);
vm.runInContext(patch,context);

const native=context.findStudy('hemograma');
assert.equal(native.result,'Leucocitosis');
assert.equal(native.universalFallback,undefined);

const crossCase=context.findStudy('rm rodilla');
assert.equal(crossCase.result,'Sin alteraciones significativas para esta patología.');
assert.equal(crossCase.universalFallback,true);

context.processCommand('/estudio ecocardiograma');
assert.equal(ordered.at(-1).s.label,'ecocardiograma');
assert.equal(ordered.at(-1).s.universalFallback,true);
assert.equal(ordered.at(-1).s.delay,120,'2 game hours must become 120 legacy seconds = 2 real minutes');

context.orderStudy({id:'ct',label:'TC',delay:3,type:'image'});
assert.equal(ordered.at(-1).s.delay,180,'legacy delay must be interpreted as game hours');

assert.equal(context.__atriaUniversalStudyPatch487,true);
console.log('pre-sleep study patch OK');
