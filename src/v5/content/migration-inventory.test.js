import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
test('C02 accounts for every original production module and preserves the characterized reference hashes',()=>{
 const inventory=JSON.parse(fs.readFileSync('docs/migration/legacy-module-inventory.json','utf8'));
 const expected=['app','clinical','integration','social','voice','render','ui'].flatMap(domain=>
  fs.readdirSync('src/'+domain).filter(n=>n.endsWith('.js')&&!n.endsWith('.test.js')).map(n=>'src/'+domain+'/'+n)).sort();
 assert.deepEqual(inventory.modules.map(m=>m.path).sort(),expected);
 for(const m of inventory.modules){
  assert(['reutilizar puro','extraer','reconstruir','descartar obsoleto','pendiente deliberado'].includes(m.decision));
  assert.equal(createHash('sha256').update(fs.readFileSync(m.path)).digest('hex'),m.sha256,m.path);
 }
});
