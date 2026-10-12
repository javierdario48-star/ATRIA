import assert from 'node:assert/strict';
import {blockedByPlant,behindFoliage} from './asymmetric-plant-collider.mjs';
const base={source_bbox:[288,905,68,115],depth_anchor_world_px:[322,995],
 collision_mask_base:{pot_center_world_px:[322,988],pot_radius_world_px:[13,7],
 character_radius_px:7,rear_lift_px:6,rear_extra_y_px:5,front_extra_y_px:0,side_extra_x_px:7}};
assert(blockedByPlant(base,322,972),'rear upper lip blocks');
assert(blockedByPlant(base,322,988),'pot center blocks');
assert(!blockedByPlant(base,322,1009),'front corridor stays open');
assert(!blockedByPlant(base,348,988),'side remains passable');
assert(behindFoliage(base,320,963),'behind foliage occlusion');
assert(!behindFoliage(base,320,1005),'in-front character should not be occluded');
console.log('ATRIA plant rear restriction PASS — base, back, lateral and depth');
