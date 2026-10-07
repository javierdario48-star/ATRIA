import assert from'node:assert/strict';import{buildStudyCatalog,resolveStudy,materializeStudy,studyReadyAt,REAL_MS_PER_GAME_HOUR}from'./study-registry.js';
const cases=[{studies:[{id:'cbc',label:'Hemograma',aliases:['cbc'],result:'Leucocitosis',gameHours:2}]},{studies:[{id:'mri-knee',label:'Resonancia de rodilla',aliases:['rm rodilla'],result:'Lesión meniscal',gameHours:4}]}];
const cat=buildStudyCatalog(cases);const cur=cases[0];
const native=materializeStudy(resolveStudy('hemograma',cur,cat),cur);assert.equal(native.result,'Leucocitosis');assert.equal(native.nativeResult,true);
const irrelevant=materializeStudy(resolveStudy('rm rodilla',cur,cat),cur);assert.equal(irrelevant.nativeResult,false);assert.match(irrelevant.result,/Sin alteraciones/);
assert.equal(studyReadyAt(1000,{gameHours:3}),1000+3*REAL_MS_PER_GAME_HOUR);
console.log('study registry OK');
