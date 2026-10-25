import test from 'node:test';
import assert from 'node:assert/strict';
import {SCRUB_COLORS,presenceAppearance,socialAppearance,playerSpriteKey} from './avatar-appearance.js';
test('12 avatar combinations roundtrip through legacy-safe social presence',()=>{
 for(const color of SCRUB_COLORS)for(const sex of ['male','female']){
  assert.deepEqual(presenceAppearance(socialAppearance(color,sex)),{color,sex});
  assert.equal(playerSpriteKey({color,sex}),
   sex==='male'?'player-'+color:'player-female-'+color);
 }
 assert.deepEqual(presenceAppearance('invalid'),{color:'navy',sex:'male'});
 assert.deepEqual(presenceAppearance('female-invalid'),{color:'navy',sex:'female'});
});
