import test from 'node:test';
import assert from 'node:assert/strict';
import {guardScoreModelV5,guardScoreboardHTML} from './guard-scoreboard.js';
test('solo and cooperative share only a confirmed outcome, never multiply EXP by players',()=>{
 const waiting={uid:'P',caseEnded:false,closure:null};
 assert.deepEqual(guardScoreModelV5({mode:'solo',patient:waiting}),{mode:'solo',resolved:0,xp:0});
 const p={uid:'P',caseEnded:true,patientDied:false,
  closure:{closed:true,xp:71,quality:{score:45}}};
 assert.deepEqual(guardScoreModelV5({mode:'solo',patient:p}),{mode:'solo',resolved:1,xp:71});
 assert.deepEqual(guardScoreModelV5({mode:'coop',patient:p,players:[
  {id:'a'},{id:'b'},{id:'c'},{id:'d'}]}),{mode:'coop',resolved:1,xp:71});
 assert.match(guardScoreboardHTML(guardScoreModelV5({mode:'coop',patient:p})),/EQUIPO/);
 assert.deepEqual(guardScoreModelV5({mode:'solo',patient:{...p,patientDied:true}}),
  {mode:'solo',resolved:0,xp:0});
});
test('the competitive scoreboard ranks only real assigned outcomes; ties do not fabricate a leader',()=>{
 const players=[{id:'a',name:'Médica Uno'},{id:'b',name:'Médico Dos'}];
 let model=guardScoreModelV5({mode:'competitive',players,outcomes:[]});
 assert.equal(model.players.length,2);
 assert(model.players.every(p=>p.leader===false));
 const outcomes=[{ownerId:'a',closed:true,survived:true,score:85,xp:120,points:140},
 {ownerId:'b',closed:true,survived:true,score:75,xp:110,points:100}];
 model=guardScoreModelV5({mode:'competitive',players,outcomes});
 assert(model.players[0].leader&&!model.players[1].leader);
 assert.equal(model.players[0].resolved,1);
 assert(guardScoreboardHTML(model).includes('Médica Uno'));
 assert(!guardScoreboardHTML(model).includes('<script'));
});

test('sequential patients within one guard aggregate only distinct receipts and count positive resolution',()=>{
 const outcomes=[
  {patientUid:'first',closed:true,survived:true,score:45,xp:71},
  {patientUid:'second',closed:true,survived:true,score:90,xp:120}
 ];
 const next={uid:'third',caseEnded:false,closure:null};
 assert.deepEqual(guardScoreModelV5({mode:'solo',patient:next,outcomes}),
  {mode:'solo',resolved:2,xp:191});
 const third={uid:'third',caseEnded:true,patientDied:false,
  closure:{closed:true,quality:{score:65},xp:92}};
 assert.deepEqual(guardScoreModelV5({mode:'solo',patient:third,outcomes}),
  {mode:'solo',resolved:3,xp:283});
 const replay=[...outcomes,outcomes[0]];
 assert.deepEqual(guardScoreModelV5({mode:'solo',patient:next,outcomes:replay}),
  {mode:'solo',resolved:2,xp:191});
});
