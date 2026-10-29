import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicTransport} from './music-transport.js';

// Web Audio is the external boundary; clocks advance explicitly, with no timers.
class Param{
 constructor(){this.value=0;this.events=[];}
 cancelScheduledValues(t){this.events.push(['cancel',t]);}
 setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}
 linearRampToValueAtTime(v,t){this.events.push(['ramp',v,t]);}
}
class Node{
 constructor(){this.gain=new Param();this.connected=true;}
 connect(node){this.output=node;return node;}
 disconnect(){this.connected=false;}
}
class Source extends Node{
 start(t,offset){this.started={t,offset};}
 stop(){this.stopped=true;this.onended?.();}
}
function fixture(load=async()=>({duration:164.4135})){
 const context={currentTime:0,sources:[],createGain:()=>new Node(),
  createBufferSource(){const s=new Source();this.sources.push(s);return s;}};
 const music=createMusicTransport({context,destination:new Node(),loadBuffer:load});
 const settle=async()=>{await Promise.resolve();await Promise.resolve();music.tick();};
 return {context,music,settle,advance(t){context.currentTime=t;music.tick();}};
}
test('new theme loops once, without restarting across title, lobby and guard selection of the same track',async()=>{
 const f=fixture();f.music.select('new');await f.settle();f.advance(1);
 assert.equal(f.music.state().sourceCount,1);
 assert.equal(f.music.state().duration,164.4135);
 const s=f.context.sources[0];assert.equal(s.loop,true);assert.equal(s.loopEnd,164.4135);
 f.music.select('new');f.advance(166);f.music.select('new');
 assert.equal(f.music.state().starts,1);
 assert(Math.abs(f.music.state().position-1.5865)<.0001,'sample-accurate loop has no artificial gap');
});
test('different tracks really overlap for 2.5s and reversed ramps start at the current gain',async()=>{
 const f=fixture();f.music.select('new');await f.settle();f.advance(1);
 f.music.select('classic');f.advance(2.25);
 assert.equal(f.music.state().mix.new,.5);assert.equal(f.music.state().mix.classic,.5);
 assert.equal(f.music.state().sourceCount,1);assert.equal(f.music.classicAudible(),true);
 f.music.select('new');
 assert.equal(f.music.state().mix.new,.5,'no discontinuity at reversal');
 f.advance(3.5);
 assert.equal(f.music.state().mix.new,.75);assert.equal(f.music.state().mix.classic,.25);
 f.advance(4.75);assert.equal(f.music.state().mix.classic,0);assert.equal(f.music.state().starts,1);
 assert.equal(f.music.classicAudible(),false);
});
test('mute fades for 250ms and reactivation continues from the paused position',async()=>{
 const f=fixture();f.music.select('new');await f.settle();f.advance(10);
 f.music.setLevel(1,false);f.advance(10.125);
 assert.equal(f.music.state().level,.5);assert.equal(f.music.state().sourceCount,1);
 f.advance(10.25);assert.equal(f.music.state().sourceCount,0);
 const offset=f.music.state().position;f.advance(20);f.music.setLevel(1,true);
 assert.equal(f.music.state().sourceCount,1);
 assert.equal(f.context.sources[1].started.offset,offset);
 f.advance(20.25);assert.equal(f.music.state().level,1);
});
test('late loading cannot resurrect an obsolete selection or disposed owner',async()=>{
 let resolve;const f=fixture(()=>new Promise(r=>resolve=r));
 f.music.select('new');f.music.select('classic');resolve({duration:164.4});await f.settle();
 assert.equal(f.music.state().sourceCount,0);assert.equal(f.music.state().track,'classic');
 const g=fixture(()=>new Promise(r=>resolve=r));g.music.select('new');g.music.destroy();
 resolve({duration:164.4});await g.settle();assert.equal(g.music.state().sourceCount,0);
});
test('loading the alternative holds the current music until it can actually crossfade',async()=>{
 let resolve;const f=fixture(()=>new Promise(r=>resolve=r));
 f.music.select('classic');f.advance(1);f.music.select('new');f.advance(5);
 assert.equal(f.music.state().mix.classic,1);assert.equal(f.music.state().mix.new,0);
 resolve({duration:164.4});await f.settle();f.advance(6.25);
 assert.equal(f.music.state().mix.new,.5);assert.equal(f.music.state().mix.classic,.5);
});
test('background pause and quick resume preserve the loop offset, bounded nodes and safe teardown',async()=>{
 const f=fixture();f.music.select('new');await f.settle();f.advance(5);f.music.pause();
 assert.equal(f.music.state().sourceCount,0);const offset=f.music.state().position;
 f.advance(40);f.music.resume();assert.equal(f.context.sources[1].started.offset,offset);
 for(let i=0;i<20;i++){f.music.select(i%2?'new':'classic');f.advance(40+i*.1);}
 assert.equal(f.music.state().sourceCount,1);f.music.destroy();
 assert.equal(f.music.state().sourceCount,0);assert(f.context.sources.every(s=>s.stopped&&!s.connected));
 f.music.resume();assert.equal(f.music.state().sourceCount,0);
});
test('a failed music load falls back to classic without throwing or retrying each tick',async()=>{
 let loads=0;const f=fixture(async()=>{loads++;throw Error('network');});
 f.music.select('new');await f.settle();f.advance(5);
 assert.equal(f.music.state().status,'error');assert.equal(f.music.state().track,'classic');
 assert.equal(f.music.state().mix.classic,1);
 for(let i=0;i<20;i++){f.music.select('new');f.advance(6+i);}
 assert.equal(loads,1);
});

test('a source that fails to start is disconnected before falling back',async()=>{
 const f=fixture();let failed;
 f.context.createBufferSource=()=>{failed=new Source();failed.start=()=>{throw Error('unavailable output');};return failed;};
 f.music.select('new');await f.settle();f.advance(4);
 assert.equal(f.music.state().track,'classic');assert.equal(failed.connected,false);assert.equal(f.music.state().sourceCount,0);
});
