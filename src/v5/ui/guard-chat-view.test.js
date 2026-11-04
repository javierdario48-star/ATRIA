import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleWardChatRows,createWardChatHistory} from './guard-chat-view.js';
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
test('confirmed patient and nurse replies survive moving away and reloading the same guard',()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 const scene={player:{...point,id:'A'},others:[{...point,id:'B'}],
  patients:[{uid:'P',...point,approach:[4,14]}]};
 const args={clinicalState:clinic,scene,self:'A',roomId:'R',navigation};
 const history=createWardChatHistory({storage});
 assert.deepEqual(history.read(args).map(row=>row.id),['own','patient']);
 const late=[{id:'nurse:own',role:'nurse',actorId:'A',text:'Orden completada',name:'Enfermera'},
  {id:'nurse:other',role:'nurse',actorId:'B',text:'Orden de otra médica',name:'Enfermera'}];
 const away={...args,scene:{...scene,player:{id:'A',x:800,y:1300}},clinicalState:{...clinic,messages:[...clinic.messages,...late]}};
 assert.deepEqual(createWardChatHistory({storage}).read(away).map(row=>row.id),['own','patient','nurse:own']);
 assert.deepEqual(history.read({...away,roomId:'other',clinicalState:{patient:{uid:'Q'},messages:[]}}),[]);
});
