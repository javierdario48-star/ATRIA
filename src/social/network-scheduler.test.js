import assert from 'node:assert/strict';import{NetworkScheduler}from'./network-scheduler.js';
const s=new NetworkScheduler();let sent=0,audio=0;const dc={readyState:'open',bufferedAmount:0};
s.tick(0,{channel:dc,sendState:()=>sent++,updateAudio:()=>audio++});
s.tick(120,{moving:true,channel:dc,sendState:()=>sent++,updateAudio:()=>audio++});assert.equal(sent,1);
dc.bufferedAmount=70000;s.tick(240,{moving:true,channel:dc,sendState:()=>sent++,updateAudio:()=>audio++});assert.equal(sent,1);
dc.bufferedAmount=0;s.tick(520,{moving:false,channel:dc,sendState:()=>sent++,updateAudio:()=>audio++});assert.equal(sent,2);assert.equal(audio,1);
console.log('network scheduler OK',{sent,audio});
