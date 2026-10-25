import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createNavigation} from '../engine/navigation.js';
import {canHearWardDoctor,canHearWardPatient,WARD_SPEECH_RADIUS,PATIENT_SPEECH_RADIUS} from './spatial-ward-speech.js';

const openMap=(cols=8,rows=8)=>({
 source_size_px:[cols*32,rows*32],
 grid:{columns:cols,rows:rows},
 state_matrix:Array.from({length:rows},()=>Array(cols).fill(0)),
 doors:[],door_state:{}
});
test('voices are short range, with a hard fail-closed line-of-sight check',()=>{
 const nav=createNavigation(openMap(40,40));
 const scene={player:{id:'a',x:120,y:440},others:[{id:'b',x:950,y:540}],
  patients:[{uid:'p1',x:97,y:430},{uid:'p2',x:947,y:560}]};
 assert(canHearWardDoctor(scene,'a','a',nav));
 assert.equal(canHearWardDoctor(scene,'b','a',nav),false);
 assert(canHearWardPatient(scene,'p1',nav));
 assert.equal(canHearWardPatient(scene,'p2',nav),false);
 scene.player={id:'a',x:930,y:540};
 assert(canHearWardDoctor(scene,'b','a',nav));
 assert(canHearWardPatient(scene,'p2',nav));
 assert.equal(canHearWardPatient(scene,'p1',nav),false);
 scene.patients[1].departed=true;
 assert.equal(canHearWardPatient(scene,'p2',nav),false);
 assert(WARD_SPEECH_RADIUS<=100&&PATIENT_SPEECH_RADIUS<=120);
});
test('one narrow wall mutes an adjacent box despite both doctors being nearby',()=>{
 const map=openMap(6,5);
 for(let r=0;r<5;r++)map.state_matrix[r][3]=1;
 const nav=createNavigation(map),left=nav.center(2,2),right=nav.center(4,2);
 const scene={player:{id:'a',...left},others:[{id:'b',...right}],
  patients:[{uid:'right-patient',...right,approach:[4,2]}]};
 assert(Math.hypot(left.x-right.x,left.y-right.y)<WARD_SPEECH_RADIUS);
 assert.equal(canHearWardDoctor(scene,'b','a',nav),false);
 assert.equal(canHearWardPatient(scene,'right-patient',nav),false);
 assert(canHearWardDoctor({...scene,others:[{id:'b',...nav.center(1,2)}]},'b','a',nav));
});
test('a closed door acoustically isolates bays, and opening it restores nearby hearing',()=>{
 const map=openMap(6,5);
 for(let r=0;r<5;r++)map.state_matrix[r][3]=1;
 map.state_matrix[2][3]=2;
 map.doors=[{id:'bay-door',tiles:[[3,2]],initial_open:false}];
 map.door_state={'bay-door':false};
 const nav=createNavigation(map),left=nav.center(2,2),right=nav.center(4,2);
 const scene={player:{id:'a',...left},others:[{id:'b',...right}],
  patients:[{uid:'right-patient',...right,approach:[4,2]}]};
 assert.equal(canHearWardDoctor(scene,'b','a',nav),false);
 assert.equal(canHearWardPatient(scene,'right-patient',nav),false);
 assert(nav.setDoor('bay-door',true));
 assert(canHearWardDoctor(scene,'b','a',nav));
 assert(canHearWardPatient(scene,'right-patient',nav));
 assert(nav.setDoor('bay-door',false));
 assert.equal(canHearWardDoctor(scene,'b','a',nav),false);
});
test('non-wall furniture does not create artificial acoustic isolation',()=>{
 const map=openMap(6,5);map.state_matrix[2][3]=3;
 const nav=createNavigation(map);
 const scene={player:{id:'a',...nav.center(2,2)},
  others:[{id:'b',...nav.center(4,2)}],patients:[]};
 assert(canHearWardDoctor(scene,'b','a',nav));
});
test('invalid or missing poses and nav reject rather than reveal other chats',()=>{
 const nav=createNavigation(openMap());
 assert.equal(canHearWardDoctor({player:{x:5,y:5},others:[]},'b','a',nav),false);
 assert.equal(canHearWardDoctor({player:{x:5,y:5},others:[{id:'b',x:NaN,y:0}]},'b','a',nav),false);
 assert.equal(canHearWardDoctor({player:{x:5,y:5},others:[{id:'b',x:8,y:5}]},'b','a'),false);
 assert.equal(canHearWardPatient({player:{x:5,y:5},patients:[]},'p',nav),false);
 assert.equal(canHearWardPatient({player:{x:5,y:5},patients:[{uid:'p',x:8,y:5}]},'p'),false);
});
test('actual ATRIA beds are audible from their authored bedside approach',()=>{
 const map=JSON.parse(fs.readFileSync(new URL('../content/hospital.json',import.meta.url)));
 const beds=JSON.parse(fs.readFileSync(new URL('../content/beds.json',import.meta.url)));
 const nav=createNavigation(map);
 // Use the authored safe bedside as the physician pose; never infer that
 // the visual center of a bed is walkable.
 const patient=beds.find(b=>b.id==='B1'),left=nav.center(...patient.approach);
 const scene={player:{id:'a',...left},others:[],
  patients:[{uid:'p',x:patient.patient[0],y:patient.patient[1],approach:patient.approach}]};
 assert(canHearWardPatient(scene,'p',nav),'normal care beside B1 remains audible');
});

test('all eight authored ATRIA beds have audible speech from their respective bedside approach tiles',()=>{
 const map=JSON.parse(fs.readFileSync(new URL('../content/hospital.json',import.meta.url)));
 const beds=JSON.parse(fs.readFileSync(new URL('../content/beds.json',import.meta.url)));
 const navigation=createNavigation(map);
 for(const bed of beds){
  const doctor={id:'doctor',...navigation.center(...bed.approach)};
  const scene={player:doctor,patients:[{uid:'own',x:bed.patient[0],y:bed.patient[1],approach:bed.approach}]};
  assert(canHearWardPatient(scene,'own',navigation),bed.id+' must allow patient replies at the bedside');
 }
});
test('blocked solid walls still prevent patient speech through adjacent bays, even when close',()=>{
 const map=openMap(6,5);for(let y=0;y<5;y++)map.state_matrix[y][3]=1;
 const nav=createNavigation(map),doctor=nav.center(2,2),patient=nav.center(4,2);
 assert.equal(canHearWardPatient({player:doctor,patients:[{uid:'other',...patient,approach:[4,2]}]},
  'other',nav),false);
});
