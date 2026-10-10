import assert from 'node:assert/strict';
import {csNurseScan487} from './nurse-scanner-487.js';
const therapies=[
 {id:'oxygen',label:'Oxígeno',aliases:['oxigeno','o2','oxigeno por canula']},
 {id:'fluid',label:'Ringer',aliases:['ringer','suero']},
 {id:'ceftriaxone',label:'Ceftriaxona',aliases:['ceftriaxona']},
 {id:'metronidazole',label:'Metronidazol',aliases:['metronidazol']},
 {id:'vasopressor',label:'Noradrenalina',aliases:['noradrenalina']}
];
const studies=[{id:'cbc',label:'Hemograma',aliases:['hemograma']}];
const scan=t=>csNurseScan487(t,studies,therapies,[]);
const m=[
 ['Enfermera monitor',['monitor']],
 ['Enfermera monitorizar',['monitor']],
 ['Enfermera conectar monitor',['monitor']],
 ['Enfermera poné el monitor',['monitor']],
 ['Enfermera monitor y signos vitales',['monitor','vitals']],
 ['Enfermera monitor y vías',['monitor','iv']],
 ['Enfermera monitor y accesos periféricos',['monitor','iv']],
 ['Enfermera vías y monitor',['iv','monitor']],
 ['Enfermera monitor y una vía',['monitor','iv']],
 ['Enfermera vías',['iv']],
 ['Enfermera una vía',['iv']],
 ['Enfermera dos vías',['iv']],
 ['Enfermera vías periféricas',['iv']],
 ['Enfermera accesos periféricos',['iv']],
 ['Enfermera accesos venosos',['iv']],
 ['Enfermera dos accesos periféricos',['iv']],
 ['Enfermera canalizá dos vías',['iv']],
 ['Enfermera poné una vía',['iv']],
 ['Vías',['iv']],
 ['Dos vías',['iv']],
 ['Enfermera oxígeno',['oxygen']],
 ['Enfermera poné oxígeno',['oxygen']],
 ['Enfermera oxígeno por cánula',['oxygen']],
 ['Enfermera oxígeno cuatro litros',['oxygen']],
 ['Enfermera vías oxígeno expansión',['iv','oxygen','fluid']],
 ['Enfermera monitor',['monitor']],
 ['Enfermera dos vías ceftriaxona y metronidazol',['iv','ceftriaxone','metronidazole']],
 ['Enfermera O2',['oxygen']],
 ['Enfermera oxígeno y monitor',['oxygen','monitor']],
 ['Enfermera accesos periféricos y oxígeno',['iv','oxygen']],
 ['Enfermera monitor vías y oxígeno',['monitor','iv','oxygen']],
 ['Enfermera dos vías Ringer y oxígeno',['iv','fluid','oxygen']],
 ['Enfermera monitor vías hemograma y Ringer',['monitor','iv','cbc','fluid']],
 ['Enfermera vías periféricas ceftriaxona y metronidazol',['iv','ceftriaxone','metronidazole']],
 ['Enfermera dos accesos periféricos, oxígeno, Ringer y hemograma',['iv','oxygen','fluid','cbc']],
 ['Enfermera monitor oxígeno vías hemograma ceftriaxona y metronidazol',['monitor','oxygen','iv','cbc','ceftriaxone','metronidazole']]
];
let validated=0;
for(const [phrase,expected] of m){
 for(const t of [phrase,phrase.replace(/[,.;:!?]/g,''),phrase.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[,.;:!?]/g,'')]){
  const result=scan(t);
  assert.equal(result.active,true,phrase+' must be an actionable indication');
  const got=result.items.filter(x=>!x.negated).map(x=>x.id);
  assert.deepEqual(got,expected,phrase+' :: '+t+' should dispatch every distinct action');
  const iv=result.items.find(x=>x.id==='iv');
  if(iv){
   const explicitOne=/\b(?:una?|1)\s+(?:v[ií]a|acceso)\b/i.test(t);
   const plural=/\b(?:v[ií]as|accesos)\b/i.test(t);
   assert.equal(iv.count,plural&&!explicitOne||/\b(?:dos|2)\s+(?:v[ií]as?|accesos?)\b/i.test(t)?2:1,
    'plural venous accesses must mean two, unless one is explicitly requested: '+t);
  }
  validated++;
 }
}
assert.equal(scan('Enfermera oxígeno cuatro litros').unknown.length,0,'oxygen dose must not become an unknown order');
assert.equal(scan('Enfermera accesos periféricos').unknown.length,0);
assert.equal(scan('Enfermera, ¿monitor?').active,false);
assert.equal(scan('Enfermera, no oxígeno').active,false);
const pressor=scan('Enfermera noradrenalina 0,05 µg/kg/min');
assert.equal(pressor.items.filter(x=>x.id==='vasopressor').length,1,
 'a single fractional vasopressor dose must dispatch once');
assert.match(pressor.items.find(x=>x.id==='vasopressor').text,/0[.]05/,
 'a real decimal-comma dose must survive scanner normalization as 0.05, never 0 or 5');
assert.equal(scan('Enfermera metronidazol').items.filter(x=>x.kind==='therapy').length,1,
 'one specific antibiotic never implies a second one');
console.log('NURSE SPEECH MATRIX PASS',JSON.stringify({spokenPhrases:m.length,variants:validated,fullCombinations:7,punctuationIndependent:true}));
