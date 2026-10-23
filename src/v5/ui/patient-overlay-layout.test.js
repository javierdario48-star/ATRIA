import test from 'node:test';
import assert from 'node:assert/strict';
import {positionPatientOverlay} from './patient-overlay-layout.js';
test('beside-bed badge uses an exterior lane instead of intercepting approach tiles',()=>{
 const p=positionPatientOverlay({x:144,y:420,width:122,height:30,viewportWidth:694,
  top:180,bottom:930,scale:1});
 assert(p.left>=144+90,'badge must sit past the adjacent walking tiles');
 assert(p.left+122<694);
 assert(p.top>=188&&p.top+30<=922);
});
test('near the right border the same policy chooses the left exterior lane',()=>{
 const p=positionPatientOverlay({x:620,y:500,width:120,height:29,viewportWidth:694,
 top:200,bottom:950});
 assert(p.left+120<=620-76);
});
test('tiny landscape can clamp without moving the patient or altering hit-test world coordinates',()=>{
 const p=positionPatientOverlay({x:90,y:130,width:135,height:29,viewportWidth:260,
 top:70,bottom:171,scale:.74});
 assert(p.left>=8&&p.left+135<=252);
 assert(p.top>=78&&p.top+29<=163);
});

test('a known solid bedside region wins over a visible but walkable exterior lane',()=>{
 const p=positionPatientOverlay({x:144,y:420,width:122,height:30,viewportWidth:694,
  top:180,bottom:930,scale:1,
  isWalkableScreen:(cx,cy)=>cx>220&&cy>390&&cy<465});
 assert(!(p.left>=220&&p.top>=390&&p.top<=465),
  'prefer a nearby wall/bed region to a path-blocking diagnosis button');
});

test('when the whole bedside approach is walkable the badge yields to the map',()=>{
 const placement=positionPatientOverlay({x:144,y:420,width:122,height:30,
  viewportWidth:694,top:180,bottom:930,scale:1,isWalkableScreen:()=>true});
 assert.equal(placement.safe,false,'never claim a safe position on a walking lane');
});
test('when the badge fits over solid furniture it remains usable',()=>{
 const placement=positionPatientOverlay({x:144,y:420,width:122,height:30,
  viewportWidth:694,top:180,bottom:930,scale:1,isWalkableScreen:()=>false});
 assert.equal(placement.safe,true);
});
