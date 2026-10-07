import assert from'node:assert/strict';import{roomReducer}from'./room-state.js';
let s={phase:'lobby',players:[]};for(const id of ['a','b','c','d'])s=roomReducer(s,{type:'JOIN',id});assert.equal(s.players.length,4);
s=roomReducer(s,{type:'READY'});assert.equal(s.phase,'ready');s=roomReducer(s,{type:'START',token:'g1'});assert.equal(s.phase,'starting');
for(const id of ['a','b','c'])s=roomReducer(s,{type:'ACK_START',id});assert.equal(s.phase,'starting');s=roomReducer(s,{type:'ACK_START',id:'d'});assert.equal(s.phase,'active');
console.log('room state OK');
