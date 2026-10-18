import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name,import.meta.url)));
test('cooperative world has one spatial nurse owner, shared patient UID and independently navigable doctors',async()=>{
 const {createWorld}=await import('./world.js'),content={map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')};
 const members=[{id:'A',name:'Ana',color:'navy'},{id:'B',name:'Bruno',color:'green'}];
 const a=createWorld(content,{id:'A',name:'Ana'}),b=createWorld(content,{id:'B',name:'Bruno'});
 a.enterGuard({mode:'coop',caseId:'PERI-PBE-001',patientUid:'shared-patient',members});
 b.enterGuard({mode:'coop',caseId:'PERI-PBE-001',patientUid:'shared-patient',members,authoritative:false});
 assert.equal(a.snapshot().patients[0].uid,b.snapshot().patients[0].uid);
 const goal=a.navigation.center(15,40),before=a.snapshot().others[0];assert(a.targetRemote('B',goal.x,goal.y));
 for(let i=0;i<180;i++)a.step(1/60);
 assert(Math.hypot(before.x-a.snapshot().others[0].x,before.y-a.snapshot().others[0].y)>30);
 assert.equal(a.targetRemote('intruder',goal.x,goal.y),false);
 assert.equal(b.enqueueNurseJourney({eventId:'bad',patientUid:'shared-patient',kind:'iv'}).status,'no-guard');
 b.applySharedSpatial({nurses:a.snapshot().nurses,doctors:[{...a.snapshot().player,id:'A'},...a.snapshot().others]});
 assert.equal(b.snapshot().others[0].name,'Ana');assert.deepEqual(b.snapshot().nurses,a.snapshot().nurses);
 a.reconcileDoctors([{userId:'A'}]);assert.equal(a.snapshot().others.length,0,'an explicit departure removes the remote avatar');
 assert.equal(a.targetRemote('B',goal.x,goal.y),false);assert.equal(a.snapshot().patients[0].uid,'shared-patient','departure does not reset care');
});
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

test('scrub changes preserve actual position, path, level, and lobby identity',async()=>{
 const {createWorld}=await import('./world.js');
 const world=createWorld({map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')},
  {name:'Javier',scrubColor:'navy'});
 world.enterLobby();
 const current=world.snapshot().player;
 const goal=world.navigation.center(15,40);
 assert(world.target(goal.x,goal.y));
 for(let i=0;i<80;i++)world.step(1/60);
 world.setLevel(12);
 const before=world.snapshot();
 assert(Math.hypot(before.player.x-current.x,before.player.y-current.y)>1);
 world.setAppearance({name:'Dr. Torres',scrubColor:'teal'});
 const after=world.snapshot();
 assert.equal(after.player.color,'teal');assert.equal(after.player.name,'Dr. Torres');
 for(const key of ['x','y','path','pathIndex','target','walkPhase','level']){
  assert.deepEqual(after.player[key],before.player[key],'appearance must not change '+key);
 }
 assert.equal(after.generation,before.generation);
 assert.equal(after.phase,'lobby');
 assert.deepEqual(after.nurses,before.nurses);
 assert.deepEqual(after.patients,before.patients);
 world.step(1/60);
 assert.notDeepEqual(world.snapshot().player.pathIndex,undefined);
 assert.throws(()=>world.setAppearance({name:'x',scrubColor:'not-a-color'}),/invalid appearance/);
 assert.equal(world.snapshot().player.color,'teal');
});

test('C08a nurse traversal uses the actual ATRIA map and cannot confirm a procedure before arrival',async()=>{
 const {createWorld}=await import('./world.js');
 const content={map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')};
 const world=createWorld(content,{name:'Javier',scrubColor:'navy'});
 world.enterLobby();world.enterGuard({mode:'solo',caseId:'APP-001'});
 const patient=world.snapshot().patients[0],before=world.snapshot().nurses;
 const eventId='room:doctor:nursing:0';
 const queued=world.enqueueNurseJourney({eventId,patientUid:patient.uid,kind:'iv'});
 assert.equal(queued.status,'travelling','one of the actual guard nurses must reach B1');
 assert.equal(world.acceptNurseClinicalResult({eventId,patientUid:patient.uid,status:'executed',
  receipt:{eventId,patientUid:patient.uid}}).status,'nurse-not-at-bed');
 let arrivals=[];
 for(let frame=0;frame<1800&&!arrivals.length;frame++){
  world.step(1/60);arrivals=world.takeNurseArrivals();
 }
 assert.equal(arrivals.length,1,'physically traversed nurse must signal actual B1 arrival');
 assert.equal(arrivals[0].patientUid,patient.uid);
 const selected=world.snapshot().nurses.find(n=>n.id===arrivals[0].nurseId);
 const initial=before.find(n=>n.id===selected.id);
 assert(Math.hypot(selected.x-initial.x,selected.y-initial.y)>25);
 assert.equal(world.navigation.circleBlocked(selected.x,selected.y,selected.r),false);
 assert.equal(world.nurseJourneySnapshot()[0].stage,'at-bed');
 assert.equal(world.acceptNurseClinicalResult({eventId,patientUid:patient.uid,status:'executed',
  receipt:{eventId,patientUid:patient.uid}}).status,'confirmed');
 const completed=world.nurseJourneySnapshot();
 assert.equal(completed[0].stage,'confirmed');
 world.enterLobby();
 assert.deepEqual(world.nurseJourneySnapshot(),[]);
 assert.deepEqual(world.takeNurseArrivals(),[]);
 world.enterGuard({mode:'solo',caseId:'CIRR-001'});
 assert.equal(world.nurseJourneySnapshot().length,0,'new guard cannot inherit old nursing job');
});
