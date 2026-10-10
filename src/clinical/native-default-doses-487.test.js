import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const start=html.indexOf('const DEFAULT_THERAPY_DOSES={');
const end=html.indexOf('function activeTherapyLabel(x){',start);
assert(start>0&&end>start);
const source=html.slice(start,end);
const C={physiology:{doseRules:{ceftriaxone:{amount:1000,unit:'mg'},metronidazole:{amount:500,unit:'mg'}}}};
const ctx={C,norm:x=>String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')};
vm.runInNewContext(source+';this.parse=parseTherapyOrder;',ctx,{timeout:4000});
const test=[
 ['Oxígeno suplementario','oxygen','oxigeno',4,'L/min'],
 ['Ringer','fluid','ringer',500,'ml'],
 ['Ceftriaxona','ceftriaxone','ceftriaxona',1000,'mg'],
 ['Metronidazol','metronidazole','metronidazol',500,'mg']
];
for(const [label,id,text,expected,unit] of test){
 const dose=ctx.parse(text,{id,label});
 assert.equal(dose.amount,expected,label+' default amount');
 assert.equal(dose.unit,unit,label+' default unit');
 assert.equal(dose.defaultApplied,true,label+' must explicitly mark default dose');
}
const specified=ctx.parse('ringer 1000 ml',{id:'fluid',label:'Ringer'});
assert.equal(specified.amount,1000,'explicit dose overrides default');
assert.equal(specified.defaultApplied,false,'explicit dose not flagged default');
console.log('NATIVE DEFAULT DOSE CONTRACT PASS',JSON.stringify({
 medications:4,defaultAmounts:[4,500,1000,500],explicitOverride:true}));
