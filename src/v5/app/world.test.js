import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {privateRoomMotionPrefix} from '../social/room-motion-scope.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name,import.meta.url)));
test('old clinical positions cannot rewind and replay an already completed local route',async()=>{
 const {createWorld}=await import('./world.js');
 const content={map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')};
 const world=createWorld(content,{id:'A',name:'Ana'}),members=[{id:'A',name:'Ana'},{id:'B',name:'Bruno'}];
 world.enterGuard({mode:'coop',caseId:'PERI-PBE-001',patientUid:'shared-patient',members,authoritative:false});
 assert.equal(world.motionIntent(),null);
 const start=world.snapshot().player,goal=world.navigation.center(4,14);
 assert(world.target(goal.x,goal.y));const intent=world.motionIntent();
 for(let i=0;i<1200;i++)world.step(1/60);
 const finished=world.snapshot().player;
 assert.equal(finished.moving,false);
 assert.equal(finished.target,null);
 // A stale PostgreSQL response can arrive after the locally predicted walk.
 // Even if it corresponds to an accepted intent, the server may still be
 // traversing that route. Neither reply can start it again.
 for(const ack of [null,intent.sequence-1,intent.sequence]){
  world.applySharedSpatial({nurses:[],doctors:[{...start,id:'A',moving:true,target:intent.target}]},1800,ack);
  assert.deepEqual([world.snapshot().player.x,world.snapshot().player.y],[finished.x,finished.y]);
  assert.equal(world.snapshot().player.target,null,'the old route must never replay');
 }
 // A final authoritative arrival can settle a small mismatch, but still
 // may not create another movement command.
 const goalPose={...finished,id:'A',x:finished.x+1.5,y:finished.y,moving:false,target:null};
 world.applySharedSpatial({nurses:[],doctors:[goalPose]},2100,intent.sequence);
 assert.equal(world.snapshot().player.x,goalPose.x);
 assert.equal(world.snapshot().player.target,null);
 assert.deepEqual(world.motionIntent(),intent,'snapshots never create new movement intents');
 world.stop();
 const stopped=world.motionIntent();assert(stopped.sequence>intent.sequence);
 world.enterLobby();assert.equal(world.motionIntent(),null);
});

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

test('lobby preserves remote avatar identity and interpolates fresh presence instead of teleporting',async()=>{
 const {createWorld}=await import('./world.js');
 const w=createWorld({map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')},{id:'A',name:'Ana'});
 w.enterLobby();const at=w.navigation.center(15,45);
 const first={userId:'B',name:'Bruno',x:at.x,y:at.y,motionSession:'session-1',motionEpoch:10,seq:1,
  moving:true,dir:'E',color:'green'};
 w.showLobbyPlayers([first],1000);assert.equal(w.snapshot().others[0].x,at.x);
 w.showLobbyMessage('B','Hola!',1100);
 // Two real V4-style fallback packets 260 ms apart at ~200 px/s.
 w.showLobbyPlayers([{...first,x:at.x+52,moving:false,seq:2}],1260);
 const before=w.snapshot().others[0];
 assert.equal(before.x,at.x,'a new remote position must not instantly teleport the sprite');
 assert.equal(before.speechBubble?.text,'Hola!','new presence preserves the active bubble');
 for(let t=1280;t<=1420;t+=20)w.step(.02,t);
 const between=w.snapshot().others[0];
 assert(between.x>at.x&&between.x<at.x+52,'the public lobby interpolates an actual walk');
 assert.equal(between.color,'green');
 assert.equal(between.speechBubble?.text,'Hola!');
 for(let t=1440;t<=5900;t+=40)w.step(.04,t);
 assert.equal(w.snapshot().others[0].speechBubble,undefined,'expired bubbles are removed without timers');
 w.showLobbyPlayers([],6100);
 assert.equal(w.snapshot().others.length,0,'departed player is removed');
 w.showLobbyPlayers([first],6200);
 assert.equal(w.snapshot().others.length,1,'rejoining player is a fresh interpolation epoch');
 w.enterGuard({mode:'solo',caseId:'PERI-PBE-001'});
 assert.equal(w.snapshot().others.length,0,'lobby interpolator never owns clinical guard actors');
});


test('durable guard keeps speech bubbles and interpolated doctors between confirmed server snapshots',async()=>{
 const {createWorld}=await import('./world.js');
 const w=createWorld({map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')},{id:'A',name:'Ana'});
 w.enterGuard({mode:'coop',caseId:'PERI-PBE-001',members:[{id:'A',name:'Ana'},{id:'B',name:'Bruno'}],authoritative:false});
 const patient=w.snapshot().patients[0],base=w.snapshot().player;
 const remote={id:'B',kind:'doctor',name:'Bruno',color:'navy',x:base.x+60,y:base.y,dir:'E',moving:true};
 const nurse=w.snapshot().nurses;
 w.applySharedSpatial({nurses:nurse,doctors:[{...base,id:'A'},remote]},1000);
 w.showGuardMessage('B','Hola desde la guardia',1100);
 assert.equal(w.snapshot().others[0].speechBubble.text,'Hola desde la guardia');
 w.applySharedSpatial({nurses:nurse,doctors:[{...base,id:'A'}, {...remote,x:remote.x+50}]},1350);
 const after=w.snapshot().others[0];
 assert.equal(after.speechBubble.text,'Hola desde la guardia');
 assert(after.x<remote.x+50,'the server snapshot must not teleport the remotely rendered doctor');
 for(let t=1380;t<=1650;t+=30)w.step(.03,t);
 assert(w.snapshot().others[0].x>remote.x,'the remote actor progresses toward its confirmed server target');
 w.showGuardMessage('A','Mi mensaje',1700);
 assert.equal(w.snapshot().player.speechBubble.text,'Mi mensaje');
 for(let t=1740;t<=6300;t+=40)w.step(.04,t);
 assert.equal(w.snapshot().player.speechBubble,undefined);
 assert.equal(w.snapshot().others[0].speechBubble,undefined);
 assert.equal(w.snapshot().patients[0].uid,patient.uid,'visual interpolation does not mutate clinical patient');
});


test('private ward renders only verified room members through lobby social presence, retaining server clinical positions',async()=>{
 const {createWorld}=await import('./world.js');
 const w=createWorld({map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')},
  {id:'A',name:'Ana'});
 w.enterGuard({mode:'coop',caseId:'PERI-PBE-001',
  members:[{id:'A',name:'Ana'},{id:'B',name:'Bruno'}],authoritative:false});
 const self=w.snapshot().player,roomId='private-clinical-room',nurses=w.snapshot().nurses;
 const remote={id:'B',kind:'doctor',name:'Bruno',x:self.x+50,y:self.y,dir:'E',moving:true,color:'navy'};
 w.applySharedSpatial({nurses,doctors:[{...self,id:'A'},remote]},1000);
 const guardPose={userId:'B',name:'Bruno',x:remote.x,y:remote.y,phase:'guard',roomId,
  motionSession:privateRoomMotionPrefix(roomId)+'B-session',motionEpoch:12345,motionAt:1000,seq:1,dir:'E',moving:true};
 w.showGuardSocialPlayers([guardPose],roomId,['A','B'],1000);
 // A doctor in another ward or still in the public lobby is never rendered
 // as this private ward's occupant.
 w.showGuardSocialPlayers([{...guardPose,seq:2,x:remote.x+200,motionSession:privateRoomMotionPrefix('unrelated')+'other'}],roomId,['A','B'],1260);
 w.showGuardSocialPlayers([{...guardPose,seq:2,x:remote.x+200,motionSession:'lobby-session'}],roomId,['A','B'],1260);
 w.showGuardSocialPlayers([{...guardPose,userId:'C',seq:2,x:remote.x+200}],roomId,['A','B'],1260);
 assert.equal(w.snapshot().others[0].x,remote.x);
 const advanced={...guardPose,x:remote.x+45,motionAt:1260,seq:2};
 w.showGuardSocialPlayers([advanced],roomId,['A','B'],1260);
 for(let t=1280;t<=1420;t+=20)w.step(.02,t);
 const before=w.snapshot().others[0].x;
 assert(before>remote.x&&before<remote.x+45,'the private ward interpolates, not teleports');
 // A stale clinical checkpoint must not overwrite the social presentation.
 w.applySharedSpatial({nurses,doctors:[{...self,id:'A'},{...remote,x:remote.x-30}]},1420);
 assert(Math.abs(w.snapshot().others[0].x-before)<1,'slow CAS response does not pull the remote avatar backward');
 // The same stored doctor is still server-controlled for validation; the
 // renderer never manufactures a new clinical patient or treatment.
 assert.equal(w.snapshot().patients.length,1);
 assert.equal(w.snapshot().mode,'coop');
});


test('durable cooperative nurse walks between clinical snapshots without administering locally',async()=>{
 const {createWorld}=await import('./world.js');
 const w=createWorld({map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')},
  {id:'A',name:'Ana'});
 w.enterGuard({mode:'coop',caseId:'PERI-PBE-001',patientUid:'shared-patient',
  members:[{id:'A',name:'Ana'},{id:'B',name:'Bruno'}],authoritative:false});
 const base=w.snapshot(),n=base.nurses[0];
 const first={...n,moving:true,x:n.x,y:n.y,walkPhase:0};
 const second={...n,moving:true,x:n.x+84,y:n.y,walkPhase:84/18};
 const doctors=[{...base.player,id:'A'}];
 w.applySharedSpatial({nurses:[first,...base.nurses.slice(1)],doctors},1000);
 w.applySharedSpatial({nurses:[second,...base.nurses.slice(1)],doctors},1900);
 assert.equal(w.snapshot().nurses[0].x,n.x+84,
  'the exact authoritative nurse coordinate is retained for clinical state');
 assert.equal(w.presentNurses(w.snapshot()).nurses[0].x,n.x,
  'the rendered nurse is buffered instead of teleported');
 for(let now=1950;now<=2270;now+=40)w.step(.04,now);
 const middle=w.presentNurses(w.snapshot()).nurses[0];
 assert(middle.x>n.x&&middle.x<n.x+84,
  'the nurse interpolates a visible path between authoritative receipts');
 const before=middle.x;
 w.applySharedSpatial({nurses:[{...second,x:n.x+108},...base.nurses.slice(1)],doctors},2400);
 assert.equal(w.snapshot().nurses[0].x,n.x+108,'new server positions remain exact');
 assert.equal(w.presentNurses(w.snapshot()).nurses[0].x,before,
  'subsequent snapshots keep the displayed pose without snapping');
 assert.equal(w.nurseJourneySnapshot().length,0,
  'a nonauthoritative client cannot create nurse journeys or medication receipts');
 assert.equal(w.snapshot().patients[0].uid,'shared-patient');
});


test('rejoining a persistent clinical room continues after its last confirmed movement ID',async()=>{
 const {createWorld}=await import('./world.js');
 const c={map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')};
 const client=createWorld(c,{id:'A',name:'Ana'});
 client.enterGuard({mode:'coop',caseId:'PERI-PBE-001',
  members:[{id:'A',name:'Ana'},{id:'B',name:'Bruno'}],authoritative:false});
 assert(client.seedMovementSequence(41));
 assert(client.target(...Object.values(client.navigation.center(4,14))));
 assert.equal(client.motionIntent().sequence,42,
  'reconnected client sends the next sequence, not #1 from a new world');
 assert(!client.seedMovementSequence(99),
  'a delayed acknowledgement cannot replace the active local input sequence');
 client.stop();
 assert.equal(client.motionIntent().sequence,43);
 client.enterLobby();
 assert.equal(client.seedMovementSequence(99),false);
});


test('30 public presences cannot enter a private 4-member clinical motion scene',async()=>{
 const {createWorld}=await import('./world.js');
 const content={map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')};
 const world=createWorld(content,{id:'A',name:'Ana'});
 const roomId='shared-ward',members=['A','B','C','D'];
 world.enterGuard({mode:'coop',caseId:'PERI-PBE-001',patientUid:'p',
  members:members.map(id=>({id,name:id})),authoritative:false});
 const base=world.snapshot(),doctors=[{...base.player,id:'A'},
  ...members.slice(1).map((id,i)=>({id,name:id,kind:'doctor',x:base.player.x+i*24,y:base.player.y,dir:'E',moving:false}))];
 world.applySharedSpatial({nurses:base.nurses,doctors},1000);
 const original=world.snapshot().others.map(p=>({id:p.id,x:p.x,y:p.y}));
 const positions=Array.from({length:30},(_,i)=>({
  userId:i<3?members[i+1]:'outsider-'+i,dir:'E',moving:true,
  x:base.player.x+40+i*2,y:base.player.y,
  motionSession:privateRoomMotionPrefix(roomId)+'session-'+i,
  motionEpoch:100,seq:1,motionCadence:260
 }));
 world.showGuardSocialPlayers(positions,roomId,members,1000);
 assert.deepEqual(world.snapshot().others.map(p=>p.id),['B','C','D']);
 const next=positions.map((x,i)=>({...x,x:x.x+32,seq:2}));
 world.showGuardSocialPlayers(next,roomId,members,1260);
 for(let t=1280;t<=1400;t+=20)world.step(.02,t);
 assert.equal(world.snapshot().others.length,3,'26 public players never consume clinical actor slots');
 assert(world.snapshot().others.some((p,i)=>p.x!==original[i].x));
 assert.equal(world.snapshot().patients[0].uid,'p');
});


test('reload starts movement IDs above the persisted server receipt',async()=>{
 const {createWorld}=await import('./world.js');
 const content={map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')};
 const world=createWorld(content,{id:'A',name:'Ana'});
 world.enterGuard({mode:'coop',caseId:'PERI-PBE-001',patientUid:'p',
  members:[{id:'A',name:'Ana'},{id:'B',name:'Bruno'}],authoritative:false});
 const existing=world.snapshot();
 world.applySharedSpatial({nurses:existing.nurses,doctors:[{...existing.player,id:'A'}]},1000,17);
 const goal=world.navigation.center(15,42);
 assert(world.target(goal.x,goal.y));
 assert.equal(world.motionIntent().sequence,18,'first input after reconnection is accepted by persistent server');
 world.applySharedSpatial({nurses:existing.nurses,doctors:[{...existing.player,id:'A'}]},1100,15);
 assert.equal(world.motionIntent().sequence,18,'old ACK cannot decrease the local counter');
});


test('the same original nurse and patient speak in timed bubbles without modifying clinical state',async()=>{
 const {createWorld}=await import('./world.js');
 const content={map:read('hospital.json'),beds:read('beds.json'),cases:read('cases.json')};
 const w=createWorld(content,{id:'A',name:'Ana'});
 w.enterGuard({mode:'solo',caseId:'PERI-PBE-001'});
 const before=w.snapshot(),nurse=before.nurses[0].id,patient=before.patients[0].uid;
 assert(w.showNpcMessage('nurse','Doctor, ¿qué hacemos?',1000));
 assert(w.showNpcMessage('patient','Me duele el abdomen.',1100));
 let value=w.snapshot();
 assert.equal(value.nurses[0].id,nurse);
 assert.equal(value.nurses[0].speechBubble.role,'nurse');
 assert.equal(value.patients[0].speechBubble.role,'patient');
 assert.equal(value.patients[0].uid,patient);
 assert.equal(value.nurses.length,before.nurses.length,'no additional nurse NPC');
 assert.equal(w.showNpcMessage('patient','Tengo una sensación de dolor.',1100),true);
 for(let t=1140;t<=6200;t+=40)w.step(.04,t);
 value=w.snapshot();
 assert.equal(value.nurses[0].speechBubble,undefined);
 assert.equal(value.patients[0].speechBubble,undefined);
 assert.equal(value.patients[0].uid,patient);
});
