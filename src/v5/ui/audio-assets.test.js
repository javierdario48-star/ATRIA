import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudioAssetCache} from './audio-assets.js';
test('theme decoding is shared, with universal AAC fallback when Opus decoding fails',async()=>{
 const requests=[];let decodes=0;
 const cache=createAudioAssetCache({window:{fetch:async url=>{requests.push(String(url));return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}},
  context:{decodeAudioData:async()=>{if(++decodes===1)throw Error('unsupported Opus');return {duration:164.4};}}});
 const [a,b]=await Promise.all([cache.load('theme'),cache.load('theme')]);
 assert.equal(a,b);assert.equal(requests.length,2);assert.match(requests[0],/atria-theme\.m4a$/);assert.match(requests[1],/aac\.m4a$/);
 await cache.load('theme');assert.equal(decodes,2);
});
test('destruction aborts an outstanding fetch and prevents later asset loading',async()=>{
 let signal;const cache=createAudioAssetCache({window:{fetch:async(_,o)=>{signal=o.signal;return new Promise(()=>{});}},context:{}});
 void cache.load('click');cache.destroy();assert.equal(signal.aborted,true);
 await assert.rejects(cache.load('theme'),/destroyed/);
});
