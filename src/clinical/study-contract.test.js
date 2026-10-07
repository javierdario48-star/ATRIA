import assert from'node:assert/strict';import{gameHoursToRealMs,resolveStudy,orderUniversalStudy}from'./study-contract.js';
assert.equal(gameHoursToRealMs(1),60000);
assert.deepEqual(resolveStudy({nativeResult:'Lipasa 900 U/L',fallbackResult:'Lipasa normal',turnaroundGameHours:2}),{result:'Lipasa 900 U/L',source:'native',delayMs:120000});
assert.equal(resolveStudy({nativeResult:null,fallbackResult:'Troponina negativa',turnaroundGameHours:1}).source,'universal-fallback');
const o=orderUniversalStudy({id:'x',label:'Estudio irrelevante',nativeResult:null,fallbackResult:'Sin alteraciones significativas',turnaroundGameHours:1,now:1000});
assert.equal(o.status,'pending');assert.equal(o.readyAt,61000);assert.equal(o.resultSource,'universal-fallback');
console.log('study contract OK');
