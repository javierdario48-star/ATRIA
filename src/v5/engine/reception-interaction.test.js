import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld} from '../app/world.js';
const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases')};
test('existing V4 reception counters are reachable only via native walking',()=>{
 const w=createWorld(content,{id:'doc',name:'Dra. A'});w.enterLobby();w.enterGuard({mode:'solo',caseId:'CIRR-001'});
 const counter=w.snapshot().entities.filter(e=>e.kind==='reception');
 assert.equal(counter.length,2);assert.equal(w.beginInteraction(counter[0].id).status,'walking');
 let reached=false;
 for(let i=0;i<600;i++){w.step(1/60);if(w.takeInteraction()?.id===counter[0].id){reached=true;break;}}
 assert(reached);w.enterLobby();assert.equal(w.snapshot().entities.some(e=>e.kind==='reception'),false);
});
