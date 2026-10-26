import test from 'node:test';
import assert from 'node:assert/strict';
import {createAvatarSelection,avatarAssetSpec} from './avatar-creator.js';
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
