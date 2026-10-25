import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleWardChatRows,pruneWardSpeechPreviews} from './guard-chat-view.js';
import {createNavigation} from '../engine/navigation.js';
import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync(new URL('../content/hospital.json',import.meta.url)));
const navigation=createNavigation(map);
const point=navigation.center(4,14);
const clinic={patient:{uid:'P'},messages:[
 {id:'own',role:'player',actorId:'A',text:'Hola',name:'A'},
 {id:'patient',role:'patient',text:'Tengo fiebre',name:'Paciente'},
 {id:'own',role:'player',actorId:'A',text:'Hola',name:'A'}
]};
test('native chat rows are limited to this session, audible room and unique receipt ids',()=>{
 const scene={player:{...point,id:'A'},others:[{...point,id:'B'}],
  patients:[{uid:'P',...point,approach:[4,14]}]};
 const v=visibleWardChatRows({clinicalState:clinic,scene,self:'A',roomId:'R',navigation});
 assert.deepEqual(v.map(x=>x.id),['own','patient']);
 assert.equal(v[1].text,'Tengo fiebre');
 const away={...scene,player:{id:'A',x:800,y:1300}};
 const muted=visibleWardChatRows({clinicalState:clinic,scene:away,self:'A',roomId:'R',navigation});
 assert.deepEqual(muted.map(x=>x.id),['own'],'patient voice cannot appear from another room');
 assert.equal(visibleWardChatRows({clinicalState:clinic,scene:away,self:'A',roomId:null,navigation}).length,2,
  'solo and apprentice preserve their existing own clinical history');
});
test('fast room preview vanishes after clinical acknowledgement or if actor moved away',()=>{
 const scene={player:{...point,id:'A'},others:[{...point,id:'B'}]};
 const cache=new Map([['m1',{actorId:'B',time:100}],['m2',{actorId:'B',time:100}]]);
 pruneWardSpeechPreviews(cache,{rows:[{id:'m1'}],scene,self:'A',navigation,now:300});
 assert.deepEqual([...cache.keys()],['m2']);
 pruneWardSpeechPreviews(cache,{rows:[],scene,self:'A',navigation,now:16000});
 assert.equal(cache.size,0);
});
