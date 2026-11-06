import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardRuntime} from './guard-runtime.js';
import {createShiftFlow} from './shift-flow.js';
import {createWorld} from '../app/world.js';
import {clinicalContent as content} from '../server/content.js';

const roster=[{id:'a',name:'A'},{id:'b',name:'B'}];
const wire=value=>JSON.parse(JSON.stringify(value));
const control=(r,actorId,op,requestId,turnId=r.view('a').clinical.shift.turn.id)=>
 r.shiftControl(actorId,{op,requestId,turnId});
async function make({mode='solo',roomId='turn-runtime',checkpoint=null,caseId='CIRR-001'}={}){
 return createGuardRuntime({content,roomId,mode,hostId:'a',members:mode==='solo'||mode==='apprentice'?roster.slice(0,1):roster,
  nowMs:checkpoint?.lastWallMs??0,caseId,checkpoint,
  guardSelection:checkpoint?null:{scope:'specific',selection:caseId}});
}
async function bedside(r,actorId='a'){
 const point=createWorld(content,{id:actorId,name:actorId}).navigation.center(...content.beds[0].approach);
 assert(r.motion(actorId,[point.x,point.y]));await r.advanceTo(20000);
 assert(r.claim(actorId,r.view(actorId).clinical.patient.uid));
}
async function boundary(r){
 // The runtime and its native clinical sessions are real. Move only the
 // admission schedule near its boundary to exercise queued work without
 // ageing that work before the test starts.
 const checkpoint=wire(await r.checkpoint());r.dispose();
 checkpoint.shift.elapsedSeconds=1440-1/60;
 r=await make({roomId:checkpoint.roomId,checkpoint});
 await r.advanceTo(checkpoint.lastWallMs+17);
 return r;
}

test('an extended shift retains its admission identities, schedule and cumulative elapsed time',()=>{
 const args={content,mode:'coop',firstCaseId:'CIRR-001',roomId:'extended-flow'};
 const s=createShiftFlow(args);s.advance(1440);const records=s.records();
 assert.equal(typeof s.extend,'function','ended shift exposes continuation rather than recreating the schedule');
 assert(s.extend());assert.equal(s.elapsed(),1440);assert.equal(s.remaining(),1440);
 assert.equal(s.advance(1440).length,0);assert.equal(s.elapsed(),2880);assert(s.ended());
 const restored=createShiftFlow({...args,snapshot:wire(s.checkpoint())});
 assert.deepEqual(restored.records(),records);assert.equal(restored.elapsed(),2880);
 assert(restored.extend());assert.equal(restored.remaining(),1440);
 assert.equal(restored.extend(),false,'a second extension cannot be added while a turn is active');
 const legacy=s.checkpoint();delete legacy.durationSeconds;legacy.elapsedSeconds=1440;
 assert(createShiftFlow({...args,snapshot:legacy}).ended());
});

test('successive extended turns each reach their boundary in exactly 86400 native frames',()=>{
 const s=createShiftFlow({content,mode:'solo',firstCaseId:'CIRR-001',roomId:'turn-frames'});
 for(let turn=1;turn<=8;turn++){
  for(let frame=0;frame<86400;frame++)s.advance(1/60);
  assert.equal(s.elapsed(),turn*1440,'turn '+turn+' must end without an extra frame');
  assert(s.ended());if(turn<8)assert(s.extend());
 }
});

test('the real 24 minute runtime boundary pauses native clocks and an explicit solo continuation preserves the guard',async t=>{
 let r=await make({caseId:'FECAL-001',roomId:'exact-turn'});t.after(()=>r.dispose());
 await r.advanceTo(1440000,{maxSteps:90000});
 assert.equal(r.view().clinical.shift.elapsedSeconds,1440);
 const before=wire(r.view()),turn=before.clinical.shift.turn;
 assert(turn,'the boundary publishes a persisted turn decision');
 assert.equal(turn.status,'decision');assert.equal(turn.number,1);assert.equal(turn.remainingSeconds,0);
 assert.equal(before.clinical.shift.patients.length,6);
 await r.advanceTo(5040000,{maxSteps:1});
 assert.deepEqual(r.view().clinical.clock,before.clinical.clock,'a pending decision cannot age native physiology');
 assert.equal(r.view().clinical.shift.elapsedSeconds,1440);
 const request={op:'continue',requestId:'solo-continue',turnId:turn.id};
 const ack=await r.shiftControl('a',request);assert.equal(ack.status,'accepted');
 const after=wire(r.view());assert.equal(after.clinical.shift.turn.number,2);
 assert.equal(after.clinical.shift.turn.status,'active');assert.equal(after.clinical.shift.remainingSeconds,1440);
 for(const field of ['patient','clock','progress','hintCount'])assert.deepEqual(after.clinical[field],before.clinical[field]);
 assert.deepEqual(after.clinical.room,before.clinical.room);assert.deepEqual(after.claims,before.claims);
 assert.deepEqual(after.clinical.shift.patients,before.clinical.shift.patients);
 const cp=wire(await r.checkpoint());r.dispose();r=await make({roomId:'exact-turn',checkpoint:cp});
 assert.deepEqual(await r.shiftControl('a',request),ack,'a replay after service recreation returns the saved receipt');
 assert.equal(r.view().clinical.shift.turn.number,2);
 await r.advanceTo(5041000);
 assert(Math.abs(r.view().clinical.shift.elapsedSeconds-1441)<1e-8);
 assert.equal(r.view().clinical.shift.turn.number,2);
 assert(Math.abs(r.view().clinical.shift.turn.elapsedSeconds-1)<1e-8);
});

test('cooperative continuation requires every participating doctor and persists votes across recovery',async t=>{
 let r=await make({mode:'coop',roomId:'consensus'});t.after(()=>r.dispose());r=await boundary(r);
 const turnId=r.view().clinical.shift.turn.id;
 const first=await control(r,'a','continue','a-vote');assert.equal(first.status,'accepted');
 assert.equal(r.view().clinical.shift.turn.status,'decision');assert.deepEqual(r.view().clinical.shift.turn.requiredIds,['b']);
 assert.equal(r.view().clinical.shift.ended,true);
 const cp=wire(await r.checkpoint());r.dispose();r=await make({roomId:'consensus',checkpoint:cp});
 assert.deepEqual(await control(r,'a','continue','a-vote',turnId),first);
 assert.equal(r.view().clinical.shift.turn.number,1);
 assert.equal((await control(r,'b','continue','b-vote')).status,'accepted');
 assert.equal(r.view().clinical.shift.turn.number,2);assert.deepEqual(r.view().clinical.shift.turn.participantIds,['a','b']);
 assert.equal((await control(r,'b','continue','old-turn',turnId)).reason,'shift-turn-changed');
 assert.equal((await control(r,'b','leave','b-vote',turnId)).reason,'shift-request-conflict');
 assert.equal(r.view().clinical.shift.turn.number,2);
});

test('leaving explicitly opts out of consent; a recovered member rejoins only through resume',async t=>{
 let r=await make({mode:'coop',roomId:'opt-out'});t.after(()=>r.dispose());r=await boundary(r);
 await control(r,'a','continue','a-vote');
 const before=wire(r.view('b').clinical.patient),ack=await control(r,'b','leave','b-leave');
 assert.equal(ack.status,'accepted');assert.equal(r.view('a').clinical.shift.turn.number,2);
 assert.deepEqual(r.view('a').clinical.shift.turn.participantIds,['a']);
 assert.equal(r.view('b').clinical.shift.turn.canResume,true);
 assert.equal((await r.post('b',{id:'left-order',text:'/signos'})).reason,'shift-member-left');
 assert.equal(r.claim('b',before.uid),false);assert.equal(r.motion('b',[100,100]),false);
 const cp=wire(await r.checkpoint());r.dispose();r=await make({roomId:'opt-out',checkpoint:cp});
 assert.deepEqual(r.view('a').clinical.shift.turn.participantIds,['a'],'reading/reconnecting cannot rejoin or invalidate consent');
 assert.deepEqual(r.view('b').clinical.patient,before);
 assert.equal((await control(r,'b','resume','b-resume')).status,'accepted');
 assert.deepEqual(r.view('a').clinical.shift.turn.participantIds,['a','b']);
 assert.equal(r.view('b').clinical.shift.turn.canResume,false);
});

test('all doctors may save and leave midturn without offline clinical catchup or an implicit extension',async t=>{
 let r=await make({mode:'coop',roomId:'all-left'});t.after(()=>r.dispose());
 await r.advanceTo(1000);const before=wire(r.view());
 await control(r,'a','leave','a-leave');await control(r,'b','leave','b-leave');
 assert.equal(r.view().clinical.shift.turn.status,'paused');
 await r.advanceTo(3601000,{maxSteps:1});
 assert.deepEqual(r.view().clinical.clock,before.clinical.clock);
 assert.equal(r.view().clinical.shift.elapsedSeconds,before.clinical.shift.elapsedSeconds);
 const cp=wire(await r.checkpoint());r.dispose();r=await make({roomId:'all-left',checkpoint:cp});
 assert.equal((await control(r,'a','resume','a-resume')).status,'accepted');
 assert.equal(r.view().clinical.shift.turn.number,1);assert.equal(r.view().clinical.shift.turn.status,'active');
 await r.advanceTo(3602000);assert(Math.abs(r.view().clinical.shift.elapsedSeconds-2)<1e-8);
 assert.equal(r.view('b').clinical.shift.turn.canResume,true);
});

test('queued native medication, samples, interview history and actor hints survive a boundary and continuation',async t=>{
 let r=await make({roomId:'native-turn'});t.after(()=>r.dispose());await bedside(r);
 const uid=r.view().clinical.patient.uid;
 const send=(id,text)=>r.post('a',{id,text,targetPatientUid:uid});
 await send('interview','¿Desde cuándo empezó el dolor?');
 const offer=await r.hint('a',{...r.view().clinical.hintBinding,op:'prepare',requestId:'hint-prepare'});
 for(const op of ['revalidate','displayed'])await r.hint('a',{...r.view().clinical.hintBinding,op,requestId:'hint-'+op,offerId:offer.offerId});
 const meds={id:'pending-meds',text:'Enfermera ceftriaxona 1 g y albumina 1.5 g/kg',targetPatientUid:uid};
 const originalMedsReceipt=wire(await r.post('a',meds));
 assert(originalMedsReceipt.clinical.some(x=>x.status==='pending'));
 await send('pending-sample','Enfermera hemograma');
 r=await boundary(r);const before=wire(await r.checkpoint()),view=wire(r.view());
 assert.equal(view.clinical.hintCount,1);assert(view.clinical.patient.orders.some(x=>x.status!=='done'));
 assert(before.session.pendingNurseJobs.length>0);
 await r.advanceTo(before.lastWallMs+3600000,{maxSteps:1});
 await control(r,'a','continue','continue-native');
 const after=wire(await r.checkpoint());
 for(const field of ['world','session','sessions','claims','focused','focusVersions','deliveries','motionReceipts'])
  assert.deepEqual(after[field],before[field],field+' must remain native and unchanged on continuation');
 assert.deepEqual(wire(await r.post('a',meds)),originalMedsReceipt,'the clinical receipt remains stable');
 const restored=await make({roomId:'native-turn',checkpoint:after});
 r.dispose();r=restored;
 assert.equal(r.view().clinical.hintCount,1);assert.deepEqual(r.view().clinical.room,view.clinical.room);
 await r.advanceTo(after.lastWallMs+100000);
 assert.equal(r.view().clinical.patient.administrationLog.filter(x=>x.id==='ceftriaxone').length,1);
 assert.equal(r.view().clinical.patient.orders.length,1);
 assert.equal(r.view().clinical.patient.orders[0].status,'done');
 assert.equal((await r.post('a',meds)).clinical.at(-1).status,'executed');
});

test('a completed case keeps its original XP receipt through turn changes and legacy checkpoint migration',async t=>{
 let r=await make({roomId:'xp-turn'});t.after(()=>r.dispose());await bedside(r);
 for(const [id,text] of [['dx','/diagnostico cirrosis descompensada'],['close','/cierre-parcial observacion']])
  await r.post('a',{id,text,targetPatientUid:r.view().clinical.patient.uid});
 const claims=wire(r.view().claims);assert.equal(claims.length,1);assert(claims[0][1].xp>0);
 let cp=wire(await r.checkpoint());r.dispose();delete cp.turn;delete cp.shift.durationSeconds;
 r=await make({roomId:'xp-turn',checkpoint:cp});assert.equal(r.view().clinical.shift.turn.number,1);
 r=await boundary(r);await control(r,'a','continue','xp-continue');
 assert.deepEqual(r.view().claims,claims);
 cp=wire(await r.checkpoint());r.dispose();r=await make({roomId:'xp-turn',checkpoint:cp});
 assert.deepEqual(r.view().claims,claims);assert.equal(r.view().clinical.shift.turn.number,2);
});

test('resume at a fully abandoned boundary restores an explicit pending vote and rejected controls cannot extend',async t=>{
 let r=await make({mode:'competitive',roomId:'boundary-resume'});t.after(()=>r.dispose());r=await boundary(r);
 const id=r.view().clinical.shift.turn.id;
 await control(r,'a','leave','a-left');await control(r,'b','leave','b-left');
 assert.equal(r.view().clinical.shift.turn.status,'paused');
 await control(r,'a','resume','a-return');
 assert.equal(r.view().clinical.shift.turn.status,'decision');assert.equal(r.view().clinical.shift.turn.number,1);
 assert.deepEqual(r.view().clinical.shift.turn.requiredIds,['a']);
 assert.equal((await control(r,'b','continue','left-vote')).reason,'shift-member-left');
 assert.equal((await control(r,'intruder','continue','intruder')).reason,'shift-forbidden');
 assert.equal((await r.shiftControl('a',{op:'continue',turnId:id,requestId:''})).reason,'invalid-shift-control');
 assert.equal((await control(r,'a','continue','a-new-vote')).status,'accepted');
 assert.equal(r.view().clinical.shift.turn.number,2);
 assert.equal((await control(r,'a','continue','too-early')).reason,'shift-not-ended');
 assert.equal(r.view().clinical.shift.turn.number,2);
});

test('a corrupted turn checkpoint cannot change the roster or detach continuation from its cumulative clock',async t=>{
 const r=await make({mode:'coop',roomId:'invalid-turn'});t.after(()=>r.dispose());
 await control(r,'a','leave','leave-once');const cp=wire(await r.checkpoint());
 for(const mutate of [saved=>saved.turn.number++,saved=>saved.turn.participantIds.push('intruder'),
  saved=>saved.turn.continuedIds.push('a'),saved=>saved.turn.receipts[0].actorId='intruder',
  saved=>saved.shift.durationSeconds=1500]){
  const invalid=wire(cp);mutate(invalid);
  await assert.rejects(make({roomId:'invalid-turn',checkpoint:invalid}),/invalid (guard turn|shift)/);
 }
});
