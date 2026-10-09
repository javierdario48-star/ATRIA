import assert from 'node:assert/strict';
import fs from 'node:fs';
import {csNurseScan487} from './nurse-scanner-487.js';
const source=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const start=source.indexOf('const CASES=')+'const CASES='.length;
const cases=JSON.parse(source.slice(start).split('\n')[0].replace(/;\\s*$/,''));
const c=cases.find(x=>x.id==='PERI-SEC-001');
const therapies=[
 {id:'oxygen',label:'Oxígeno',aliases:['oxigeno','o2','canula']},
 {id:'fluid',label:'Cristaloides',aliases:['ringer','ringer lactato','suero','expandir']},
 {id:'vasopressor',label:'Noradrenalina',aliases:['noradrenalina','vasopresor']}
];
const scan=(text,cc=c)=>csNurseScan487(text,cc.studies,therapies,cc.interventions);
const ids=t=>scan(t).items.filter(x=>!x.negated).map(x=>x.id);
assert.deepEqual(ids('enfermera monitor vías hemograma y honograma'),['monitor','iv','peri_cbc']);
assert(scan('enfermera monitor vias hemograma y honograma').unknown.some(x=>x.includes('honograma')));
assert.deepEqual(ids('Enfermera, dos vías, Ringer y oxígeno'),['iv','fluid','oxygen']);
assert.equal(scan('enfermera dos vias ringer').items[0].count,2);
assert.deepEqual(ids('enfermera oxigeno 4 litros ceftriaxona 1 g metronidazol 500 mg'),['oxygen','ceftriaxone','metronidazole']);
assert.deepEqual(ids('enfermera signos vitales'),['vitals']);
assert.deepEqual(ids('enfermera cirugia'),['cirugia']);
assert.deepEqual(ids('enfermera monitor, vias, gases, ceftriaxona, metronidazol y cirugia'),
 ['monitor','iv','peri_gas','ceftriaxone','metronidazole','cirugia']);
assert(!scan('enfermera no cirugia').active);
assert.equal(scan('enfermera, ¿cirugia?').active,false);
assert.equal(scan('enfermera ringer pero no oxigeno').items.find(x=>x.id==='oxygen')?.negated,true);
const other=cases.find(x=>x.id==='PERI-PBE-001');
assert.deepEqual(scan('enfermera paracentesis hemograma',other).items.map(x=>x.id),
 ['pbe_paracentesis','pbe_cbc']);
assert(scan('enfermera antibioticos').unknown.length>0,'ambiguous antibiotic must not be assigned by inference');
for(const seed of cases){
 const q='enfermera '+seed.studies[0].aliases[0];
 assert(scan(q,seed).items.some(x=>x.id===seed.studies[0].id),seed.id+' study auto-registered');
}
console.log('NURSE VOICE SCANNER BOTS PASS',JSON.stringify({cases:cases.length,unpunctuated:true,mixed:true,negation:true,unknownReported:true}));
