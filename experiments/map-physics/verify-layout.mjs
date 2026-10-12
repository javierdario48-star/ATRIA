import fs from 'node:fs';import assert from 'node:assert/strict';
const html=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const p=JSON.parse(fs.readFileSync('experiments/map-physics/physics-layout.json','utf8'));
const m=JSON.parse(fs.readFileSync('experiments/map-physics/original-navigation-map.json','utf8'));
assert.equal(p.beds.length,8);assert.equal(m.interactions.length,18);assert.equal(m.grid.columns,32);assert.equal(m.grid.rows,53);
assert.equal(m.interactions.filter(x=>x.type==='hospital_bed').length,9);
const block=html.slice(html.indexOf('const V39_BEDS=['),html.indexOf('window.csBedRegistryV39'));
const mat=[...block.matchAll(/\\{id:'(B\\d+)',label:'([^']+)',acuity:'([^']+)',\\s*patient:\\[(\\d+),(\\d+)\\],approach:\\[(\\d+),(\\d+)\\]\\}/g)];assert.equal(mat.length,8);
const pos=html.indexOf('const screens={B1');const src=html.slice(pos,html.indexOf(';\\n const beds=new Map',pos));
for(const a of mat){const x=p.beds.find(q=>q.bedId===a[1]);assert(x,a[1]);assert.equal(x.clinicalLabel,a[2]);assert.equal(x.acuity,a[3]);assert.deepEqual([x.bed.x,x.bed.y],[+a[4],+a[5]]);assert.deepEqual([x.approach.col,x.approach.row],[+a[6],+a[7]]);const screens=[...src.matchAll(/(B\\d+):\\[(\\d+),(\\d+)\\]/g)].find(q=>q[1]===a[1]);assert(screens);assert.deepEqual([x.monitor.x,x.monitor.y],[+screens[2],+screens[3]]);const dx=Math.abs(x.approach.x-x.bed.x),dy=Math.abs(x.approach.y-x.bed.y);assert(dx>24+10.5||dy>35+10.5,'Approach blocked by proposed bed collider: '+a[1]);}
console.log('ATRIA physical map anchor checks: PASS — 8 beds, 8 monitors, 8 approaches, original map untouched');
