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
 assert.equal(provenance.referenceCommit,'64fedba8c8a0fb49fca58e210985740b09e26bed');
 assert.deepEqual(map.source_size_px,[1024,1536]);
 assert.deepEqual([map.grid.columns,map.grid.rows],[32,53]);
 assert.equal(map.state_matrix.length,53);
 assert(map.state_matrix.every(row=>row.length===32));
 assert.deepEqual(map.player_start_tile,[15,45]);
 assert.equal(cases.length,13);assert.equal(new Set(cases.map(c=>c.id)).size,13);
 for(const c of cases){assert(c.studies.length);assert(c.interventions.length);assert(c.intents.length);}
 for(const name of ['hospital','nurse','patient','vega','pavement','garden','player-navy','player-green','player-gray','player-pink']){
  const bytes=fs.readFileSync(path.join(root,assets[name].path));
  assert.equal(hash(bytes),provenance.files[assets[name].path],name+' original asset hash');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
 }
 for(const [name,expected] of Object.entries(provenance.files))assert.equal(hash(fs.readFileSync(path.join(root,name))),expected,name);
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
 assert.equal(hash(bytes),'09fa1b5c34b9a2394537b61a3e4ecf1f6498ec92d23e1a03126f683229df8344');
 assert(bytes.length<65000,'one HD AVIF wardrobe atlas must stay lightweight for mobile');
 assert.equal(bytes.toString('ascii',4,8),'ftyp');
});
