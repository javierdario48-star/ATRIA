import assert from'node:assert/strict';import{classifyClinicalUtterance,routeSpeaker}from'./dialogue-router.js';
for(const q of['hola','buen día','buenas','¿cómo está?']){const r=classifyClinicalUtterance(q);assert.equal(r.intent,'greeting');assert.equal(r.target,'patient')}
for(const q of['¿qué medicamentos toma?','toma algún remedio','tratamiento habitual'])assert.equal(classifyClinicalUtterance(q).intent,'medication-history');
assert.equal(classifyClinicalUtterance('/hemograma').target,'nurse');assert.equal(classifyClinicalUtterance('/monitor').target,'nurse');assert.equal(classifyClinicalUtterance('/vega no sé qué hacer').target,'vega');
assert.equal(routeSpeaker({intentTarget:'patient',nearPatient:true,nearNurse:true}),'patient','nurse must never impersonate patient');
assert.equal(routeSpeaker({intentTarget:'nurse',nearPatient:true,nearNurse:true}),'nurse');
console.log('clinical dialogue router OK');