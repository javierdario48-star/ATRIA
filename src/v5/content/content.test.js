import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.dirname(new URL(import.meta.url).pathname);
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('canonical content preserves effective original map, cases and artwork',()=>{
 assert(fs.existsSync(path.join(root,'provenance.json')),'canonical content has not been migrated');
 const provenance=read('provenance.json'),map=read('hospital.json'),cases=read('cases.json'),assets=read('assets.json');
 const original=read('cases-original.json');
 assert.deepEqual(cases.slice(0,original.length),original,'the 13 canonical patient seeds are structurally unchanged');
 assert.equal(provenance.referenceCommit,'64fedba8c8a0fb49fca58e210985740b09e26bed');
 assert.deepEqual(map.source_size_px,[1024,1536]);
 assert.deepEqual([map.grid.columns,map.grid.rows],[32,53]);
 assert.equal(map.state_matrix.length,53);
 assert(map.state_matrix.every(row=>row.length===32));
 assert.deepEqual(map.player_start_tile,[15,45]);
 assert.equal(original.length,13);assert.equal(cases.length,25);
 assert.equal(new Set(cases.map(c=>c.id)).size,25);
 for(const c of cases){assert(c.studies.length);assert(c.interventions.length);assert(c.intents.length);}
 for(const name of ['hospital','nurse','patient','vega','pavement','garden','player-navy','player-green','player-gray','player-pink']){
  const bytes=fs.readFileSync(path.join(root,assets[name].path));
  assert.equal(hash(bytes),provenance.files[assets[name].path],name+' original asset hash');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
 }
 for(const [name,expected] of Object.entries(provenance.files)){
  const canonicalPath=name==='cases.json'?'cases-original.json':
   name==='therapies.json'?'therapies-original.json':name;
  assert.equal(hash(fs.readFileSync(path.join(root,canonicalPath))),expected,canonicalPath);
 }
});

test('captured effective case rules include the later corrections',()=>{
 assert(fs.existsSync(path.join(root,'cases.json')),'effective cases are required');
 const cases=read('cases.json');
 const panc=cases.find(c=>c.id==='PANC-001');
 assert(panc.keyInterventions.includes('fluid'));
 assert(!panc.keyInterventions.includes('source_control'));
 assert(!panc.keyStudies.includes('tc'),'uncomplicated pancreatitis does not require CT');
 const beds=read('beds.json');assert.equal(beds.length,8);
 assert.deepEqual(beds.find(b=>b.id==='B4').patient,[947,424]);
});

test('V5 wardrobe atlas is versioned separately from original immutable asset hashes',()=>{
 const bytes=fs.readFileSync(path.join(root,'assets/player-wardrobe.avif'));
 assert.equal(hash(bytes),'93a7f7bf8fb36a3dc808cc5c7f923e633697a6b48729a647e37320d37171e69b');
 assert(bytes.length<250000,'HD AVIF atlas should stay below a quarter megabyte for mobile');
 assert.equal(bytes.toString('ascii',4,8),'ftyp');
});

test('the 30 original therapies are immutable and the 14 V5 additions are additive',()=>{
 const legacy=read('therapies-original.json'),active=read('therapies.json');
 assert.equal(legacy.length,30);
 assert.equal(active.length,44);
 assert.deepEqual(active.slice(0,legacy.length),legacy,
  'a newly modeled treatment cannot silently rewrite the original formulary');
 const newEntries=active.slice(legacy.length);
 assert.equal(new Set(newEntries.map(x=>x.id)).size,14);
 for(const x of newEntries){
  assert(x.id&&x.label&&Array.isArray(x.aliases)&&x.aliases.length,
   'new medicines must have a real UI identity and speech aliases');
 }
});
