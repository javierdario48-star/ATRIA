import test from 'node:test';
import assert from 'node:assert/strict';
import {createAvatarSelection,avatarAssetSpec,avatarDrawRect,avatarCanvasResolution} from './avatar-creator.js';
import {SCRUB_COLORS} from '../app/avatar-appearance.js';

test('changing sex keeps color and cycling colors keeps sex across all 14 choices',()=>{
 const selection=createAvatarSelection({sex:'female',scrubColor:'pink'});
 assert.deepEqual(selection.read(),{sex:'female',color:'pink'});
 selection.chooseSex('male');assert.equal(selection.read().color,'pink');
 for(let i=0;i<SCRUB_COLORS.length;i++){
  assert.equal(selection.read().sex,'male');
  assert(avatarAssetSpec(selection.read()).key);
  selection.cycle(1);
 }
 assert.equal(selection.read().color,'pink');
 selection.chooseSex('female');
 for(let i=0;i<SCRUB_COLORS.length;i++){
  assert.equal(avatarAssetSpec(selection.read()).key,'wardrobe');
  selection.cycle(-1);
 }
 assert.deepEqual(selection.read(),{sex:'female',color:'pink'});
});
test('the creator frame is exactly the frame that the world sprite renderer extracts',()=>{
 assert.deepEqual(avatarAssetSpec({sex:'female',color:'burgundy'}),{key:'wardrobe',frame:[2,1]});
 assert.deepEqual(avatarAssetSpec({sex:'male',color:'burgundy'}),{key:'wardrobe',frame:[3,1]});
 assert.deepEqual(avatarAssetSpec({sex:'female',color:'teal'}),{key:'wardrobe',frame:[1,1]});
 assert.deepEqual(avatarAssetSpec({sex:'male',color:'gray'}),{key:'player-gray',frame:null});
});

test('HD preview is device-pixel-resolved and cannot distort native proportions',()=>{
 const css={width:240,height:285};
 const hd=avatarCanvasResolution(css.width,css.height,3);
 assert.deepEqual(hd,{width:600,height:713});
 const source={width:384,height:576};
 const fit=avatarDrawRect(source.width,source.height,hd.width,hd.height);
 assert(fit&&fit.x>=0&&fit.y>=0);
 assert(Math.abs(fit.width/fit.height-source.width/source.height)<1e-12);
 assert(fit.x+fit.width<=hd.width);
 assert(fit.y+fit.height<=hd.height);
 assert.equal(avatarDrawRect(0,576,hd.width,hd.height),null);
});

test('male blue and black cannot select the same bitmap; the blue uses its shared palette',()=>{
 const blue=avatarAssetSpec({sex:'male',color:'navy'}),black=avatarAssetSpec({sex:'male',color:'black'});
 assert.notEqual(blue.key,black.key);
 assert.equal(blue.palette,'navy');
});
