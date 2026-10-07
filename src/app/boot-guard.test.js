import assert from'node:assert/strict';import{assertBootReady}from'./boot-guard.js';
const mk=(ids,display={})=>{const nodes=Object.fromEntries(ids.map(id=>[id,{id,style:{display:display[id]||'block'}}]));const doc={getElementById:id=>nodes[id]||null,querySelector:q=>q==='canvas'&&nodes.canvas||null};const win={C:null,player:null,getComputedStyle:e=>e.style};return{doc,win}};
let x=mk(['canvas','chatDock','selector']);assert.doesNotThrow(()=>assertBootReady(x.doc,x.win));
x=mk(['canvas','chatDock']);assert.throws(()=>assertBootReady(x.doc,x.win),/map-only/);
x=mk(['canvas','chatDock','act']);x.win.C={};x.win.player={};assert.doesNotThrow(()=>assertBootReady(x.doc,x.win));
console.log('boot guard OK');
