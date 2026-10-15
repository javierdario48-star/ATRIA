import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name,import.meta.url)));
test('patients in independent world instances cannot share a persistent XP identity',async()=>{
 const {createWorld}=await import('./world.js'),content={map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')};
 const worlds=[createWorld(content,{name:'same'}),createWorld(content,{name:'same'})];
 for(const world of worlds){world.enterLobby();world.enterGuard({mode:'solo',caseId:'CIRR-001'});}
 assert.notEqual(worlds[0].snapshot().patients[0].uid,worlds[1].snapshot().patients[0].uid);
});
test('one world owns lobby and guard navigation; repeated transitions reset rather than duplicate actors',async()=>{
 const file=new URL('./world.js',import.meta.url);assert(fs.existsSync(file),'modular world is missing');
 const {createWorld}=await import('./world.js');
 const content={map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')};
 const world=createWorld(content,{name:'Javier',scrubColor:'navy'});
 assert.equal(world.snapshot().phase,'title');
 world.enterLobby();assert.equal(world.snapshot().phase,'lobby');
 const spawn=world.snapshot().player;
 const target=world.navigation.center(15,40);assert(world.target(target.x,target.y));
 for(let i=0;i<600;i++)world.step(1/60);
 const moved=world.snapshot().player;assert(Math.hypot(spawn.x-moved.x,spawn.y-moved.y)>50);assert(!moved.moving);
 for(let i=0;i<5;i++){
  world.enterGuard({mode:'solo',caseId:'CIRR-001'});const guard=world.snapshot();
  assert.equal(guard.patients.length,1);assert.equal(guard.nurses.length,6);
  assert.equal(guard.caseId,'CIRR-001');assert.equal(guard.mode,'solo');
  assert.equal(new Set(guard.nurses.map(n=>n.id)).size,6);
  world.enterLobby();const lobby=world.snapshot();assert.equal(lobby.patients.length,0);assert.equal(lobby.nurses.length,0);
  assert.equal(lobby.player.x,spawn.x);assert.equal(lobby.player.y,spawn.y);
 }
 assert.throws(()=>world.enterGuard({mode:'competitive',caseId:'CIRR-001'}),/not migrated/);
 const external=world.snapshot();external.player.x=-999;assert.notEqual(world.snapshot().player.x,-999);
});
