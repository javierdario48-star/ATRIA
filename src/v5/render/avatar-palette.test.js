import test from 'node:test';
import assert from 'node:assert/strict';
import {navyScrubPixels} from './avatar-palette.js';
test('blue palette changes cloth while preserving skin, white mask, cyan trim and transparency',()=>{
 const source=new Uint8ClampedArray([18,70,52,255,240,160,90,255,230,240,250,255,0,150,240,255,0,80,30,0]);
 const blue=navyScrubPixels(source);
 assert(blue[2]>blue[1]&&blue[1]>blue[0]);assert.equal(blue[3],255);
 assert.deepEqual([...blue.slice(4)],[...source.slice(4)]);
 assert.deepEqual([...source.slice(0,4)],[18,70,52,255]);
});
