import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('vendor/atria-4.8.6/index.html', 'utf8');
const layout = JSON.parse(fs.readFileSync('experiments/map-physics/physics-layout.json', 'utf8'));
const map = JSON.parse(fs.readFileSync('experiments/map-physics/original-navigation-map.json', 'utf8'));
assert.equal(layout.beds.length, 8);
assert.equal(map.interactions.length, 18);
assert.equal(map.grid.columns, 32);
assert.equal(map.grid.rows, 53);
assert.equal(map.interactions.filter(i => i.type === 'hospital_bed').length, 9);

const start = html.indexOf('const V39_BEDS=[');
const end = html.indexOf('window.csBedRegistryV39');
assert(start >= 0 && end > start, 'V39 source missing');
const srcBeds = html.slice(start, end);
const matches = [...srcBeds.matchAll(/\{id:'(B\d+)',label:'([^']+)',acuity:'([^']+)',\s*patient:\[(\d+),(\d+)\],approach:\[(\d+),(\d+)\]\}/g)];
assert.equal(matches.length, 8, 'Original source must contain 8 clinical beds');
const monitorStart = html.indexOf('const screens={B1');
const monitorEnd = html.indexOf(';\n const beds=new Map', monitorStart);
assert(monitorStart >= 0 && monitorEnd > monitorStart, 'V413 monitor source missing');
const originalMonitors = html.slice(monitorStart, monitorEnd);
const monitorMatches = [...originalMonitors.matchAll(/(B\d+):\[(\d+),(\d+)\]/g)];
assert.equal(monitorMatches.length, 8);

for (const a of matches) {
  const bed = layout.beds.find(b => b.bedId === a[1]);
  assert(bed, a[1] + ' missing');
  assert.equal(bed.clinicalLabel, a[2]);
  assert.equal(bed.acuity, a[3]);
  assert.deepEqual([bed.bed.x, bed.bed.y], [+a[4], +a[5]]);
  assert.deepEqual([bed.approach.col, bed.approach.row], [+a[6], +a[7]]);
  const monitor = monitorMatches.find(m => m[1] === a[1]);
  assert(monitor);
  assert.deepEqual([bed.monitor.x, bed.monitor.y], [+monitor[2], +monitor[3]]);
  assert.equal(bed.monitor.pairedBedId, a[1]);
  assert.equal(bed.monitor.physics.blocksMovement, false);
  const dx = Math.abs(bed.approach.x - bed.bed.x);
  const dy = Math.abs(bed.approach.y - bed.bed.y);
  assert(dx > 24 + 10.5 || dy > 35 + 10.5, 'Proposed bed collider blocks approach ' + a[1]);
}
console.log('ATRIA map positions PASS: 8 beds, 8 monitors, 8 approaches; original navigation unchanged.');

