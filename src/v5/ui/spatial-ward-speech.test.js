import test from 'node:test';
import assert from 'node:assert/strict';
import {canHearWardDoctor,canHearWardPatient,WARD_SPEECH_RADIUS} from './spatial-ward-speech.js';

test('far-away doctors and other beds never leak their conversations',()=>{
 const scene={player:{id:'a',x:120,y:440},others:[{id:'b',x:950,y:540}],
  patients:[{uid:'p1',x:97,y:430},{uid:'p2',x:947,y:560}]};
 assert(canHearWardDoctor(scene,'a','a'));
 assert.equal(canHearWardDoctor(scene,'b','a'),false);
 assert(canHearWardPatient(scene,'p1'));
 assert.equal(canHearWardPatient(scene,'p2'),false);
 scene.player={id:'a',x:930,y:540};
 assert(canHearWardDoctor(scene,'b','a'));
 assert(canHearWardPatient(scene,'p2'));
 assert.equal(canHearWardPatient(scene,'p1'),false);
 scene.patients[1].departed=true;
 assert.equal(canHearWardPatient(scene,'p2'),false);
});
test('invalid or missing remote poses fail closed instead of exposing chat',()=>{
 assert(WARD_SPEECH_RADIUS<250);
 assert.equal(canHearWardDoctor({player:{x:5,y:5},others:[]},'b','a'),false);
 assert.equal(canHearWardDoctor({player:{x:5,y:5},others:[{id:'b',x:NaN,y:0}]},'b','a'),false);
 assert.equal(canHearWardPatient({player:{x:5,y:5},patients:[]},'p'),false);
});
