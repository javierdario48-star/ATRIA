import test from 'node:test';
import assert from 'node:assert/strict';
import {respiratoryPack} from './respiratory-pack.js';
import {cardiologyPack} from './cardiology-pack.js';
import {neurologyPack} from './neurology-pack.js';

const cases = [...respiratoryPack.cases, ...cardiologyPack.cases, ...neurologyPack.cases];

test('all thirty specialty cases offer compatible, mutually exclusive medical backgrounds', () => {
 assert.equal(cases.length, 30);
 let options = 0;
 for (const c of cases) {
  const backgrounds = c.variation.backgroundHistory;
  assert.equal(backgrounds?.length, 2, `${c.id}: two authored background choices`);
  assert.equal(new Set(backgrounds.map(x => x.id)).size, 2, c.id);
  assert.equal(new Set(backgrounds.map(x => x.history.pmh)).size, 2, c.id);
  for (const background of backgrounds) {
   assert.match(background.id, /^[a-z][a-z0-9-]*$/, c.id);
   assert.deepEqual(Object.keys(background.history), ['pmh'], `${c.id}: background does not change drugs or acute risks`);
   assert.ok(background.history.pmh.startsWith(c.history.pmh + ' '), `${c.id}: all diagnostic and safety premises remain explicit`);
   assert.ok(background.history.pmh.length > c.history.pmh.length + 30, `${c.id}: background adds an actual medical history`);
   options++;
  }
 }
 assert.equal(options, 60);
});

test('subarachnoid hemorrhage history distinguishes a sentinel headache from the unprecedented current severity', () => {
 const c = neurologyPack.cases.find(x => x.id === 'NEUR-05');
 assert.match(c.history.risk, /[Cc]efalea centinela/);
 assert.doesNotMatch(c.history.pmh, /[Nn]o cefalea similar previa/);
 assert.match(c.history.pmh, /[Nn]o cefalea de esta intensidad/);
});
