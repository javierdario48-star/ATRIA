import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardRuntime} from './guard-runtime.js';
import {createWorld} from '../app/world.js';
import {clinicalContent as content} from '../server/content.js';

const members=[{id:'a',name:'Doctora Alba'},{id:'b',name:'Doctor Bruno'}];
const wire=value=>JSON.parse(JSON.stringify(value));
async function make({mode='coop',roomId='communication',caseId='CIRR-001',checkpoint=null}={}){
 return createGuardRuntime({content,roomId,mode,caseId,hostId:'a',members:['solo','apprentice'].includes(mode)?members.slice(0,1):members,
  nowMs:checkpoint?.lastWallMs??0,checkpoint,guardSelection:checkpoint?null:{scope:'specific',selection:caseId}});
}
async function walk(r,actorId,patientUid,nowMs){
 const record=r.view(actorId).clinical.shift.patients.find(row=>row.uid===patientUid);
 const bed=content.beds.find(row=>row.id===record.bedId),navigation=createWorld(content,{id:actorId,name:actorId}).navigation;
 const point=navigation.center(...bed.approach);assert(r.motion(actorId,[point.x,point.y]));
 while((await r.advanceTo(nowMs,{maxSteps:12000})).recovering){}
}
const post=(r,actorId,id,text,patientUid)=>r.post(actorId,{id,text,targetPatientUid:patientUid});

for(const mode of ['solo','apprentice','coop'])test(mode+': projected patient views preserve actual focus and selection revision',async t=>{
 const r=await make({mode,roomId:'project-'+mode});t.after(()=>r.dispose());
 await r.advanceTo(180000,{maxSteps:12000});
 const [first,second]=r.view().clinical.shift.patients;
 await walk(r,'a',first.uid,200000);assert(r.claim('a',first.uid));
 const before=wire(await r.checkpoint()),revision=r.view().clinical.hintBinding.selectionRevision;
 for(let i=0;i<12;i++){
  const uid=i%2?first.uid:second.uid,projected=r.view('a',{patientUid:uid}).clinical;
  assert.equal(projected.patient.uid,uid,'a read-only observe must return its requested patient');
  assert.equal(projected.shift.focusPatientUid,uid);assert.equal(projected.shift.confirmedFocusPatientUid,first.uid);
  assert.equal(projected.hintBinding.selectionRevision,revision);
 }
 assert.equal(r.view().clinical.patient.uid,first.uid);
 const after=wire(await r.checkpoint());assert.deepEqual(after.focused,before.focused);assert.deepEqual(after.focusVersions,before.focusVersions);
 assert.deepEqual(after.session,before.session);assert.deepEqual(after.sessions,before.sessions);
 assert.throws(()=>r.view('a',{patientUid:'unknown'}),error=>error.code==='invalid');
 assert.throws(()=>r.view('intruder',{patientUid:first.uid}),error=>error.code==='forbidden');
});

test('team text is durable communication with no clinical, nurse, patient or hint effects',async t=>{
 let r=await make({roomId:'team-channel'});t.after(()=>r.dispose());
 const before=wire(await r.checkpoint()),envelope={id:'team-medication',channel:'team',text:'Enfermera ceftriaxona 1 g. Vega, ¿qué hago?'};
 const ack=await r.post('a',envelope);assert.equal(ack.status,'received');assert.equal(ack.channel,'team');assert.deepEqual(ack.clinical,[]);
 const state=r.view('b').clinical.communication;assert(state,'the team projection is available away from every bedside');
 assert.equal(state.channelAvailable,true);assert.equal(state.team.length,1);assert.equal(state.team[0].text,envelope.text);
 assert.equal(state.team[0].actorName,'Doctora Alba');assert.equal(state.team[0].actorId,'a');
 assert.deepEqual(r.view('a').clinical.communication,state);
 const after=wire(await r.checkpoint());
 for(const field of ['world','session','sessions','claims','focused','focusVersions'])assert.deepEqual(after[field],before[field],field);
 assert.deepEqual(await r.post('a',envelope),ack);
 assert.equal((await r.post('a',{...envelope,text:'otro texto'})).reason,'command-id-reused-with-different-payload');
 assert.equal((await r.post('a',{...envelope,channel:undefined})).reason,'command-id-reused-with-different-payload');
 assert.equal(r.view().clinical.communication.team.length,1);
 r.dispose();r=await make({roomId:'team-channel',checkpoint:after});
 assert.deepEqual(r.view('b').clinical.communication,state);assert.deepEqual(await r.post('a',envelope),ack);
 assert.equal(r.view().clinical.hintCount,0);assert.equal(r.view().clinical.patient.administrationLog.length,0);
});

test('team history retains 300 immutable rows and receipts survive history eviction',async t=>{
 const r=await make({roomId:'team-retention'});t.after(()=>r.dispose());
 const first={id:'team-0',channel:'team',text:'primero'},ack=await r.post('a',first);
 for(let index=1;index<=300;index++)assert.equal((await r.post('a',{id:'team-'+index,channel:'team',text:'mensaje '+index})).status,'received');
 const view=r.view('b').clinical.communication;assert.equal(view.team.length,300);assert.equal(view.team[0].commandId,'team-1');
 assert.equal(view.team.at(-1).commandId,'team-300');assert.equal(new Set(view.team.map(row=>row.id)).size,300);
 assert.deepEqual(await r.post('a',first),ack);assert.equal(r.view().clinical.communication.team.length,300);
 assert.equal((await r.post('a',{...first,text:'reemplazo'})).reason,'command-id-reused-with-different-payload');
});

test('team channel rejects noncooperative, invalid and explicitly departed senders',async t=>{
 for(const mode of ['solo','apprentice','competitive']){
  const r=await make({mode,roomId:'team-'+mode});t.after(()=>r.dispose());
  assert.equal((await r.post('a',{id:'unavailable',channel:'team',text:'hola'})).reason,'team-channel-unavailable');
  if(mode==='competitive')assert.equal(Object.hasOwn(r.view('a').clinical.communication,'team'),false);
 }
 const r=await make({roomId:'team-members'});t.after(()=>r.dispose());
 for(const envelope of [{id:'empty',text:''},{id:'long',text:'a'.repeat(501)},{id:'',text:'hola'}])
  assert.equal((await r.post('a',{...envelope,channel:'team'})).status,'rejected');
 await r.shiftControl('b',{op:'leave',requestId:'leave',turnId:r.view('b').clinical.shift.turn.id});
 assert.equal((await r.post('b',{id:'left',channel:'team',text:'hola'})).reason,'shift-member-left');
 await assert.rejects(r.post('intruder',{id:'forged',channel:'team',text:'hola'}),/member/);
 assert.equal(r.view('a').clinical.communication.team.length,0);
});

test('an explicit cooperative bedside target routes immediately without a previous focus-changing claim',async t=>{
 const r=await make({roomId:'explicit-target'});t.after(()=>r.dispose());
 await r.advanceTo(180000,{maxSteps:12000});const [first,second]=r.view().clinical.shift.patients;
 await walk(r,'a',first.uid,200000);assert(r.claim('a',first.uid));
 await walk(r,'a',second.uid,220000);
 const ack=await post(r,'a','second-question','¿Desde cuándo empezó el dolor?',second.uid);
 assert.equal(ack.status,'received');assert.equal(ack.patientUid,second.uid);assert.equal(ack.clinical[0].kind,'history.ask');
 assert.equal(ack.clinical[0].status,'executed');assert.equal(r.view().clinical.shift.confirmedFocusPatientUid,second.uid);
 const firstState=r.view('a',{patientUid:first.uid}).clinical;assert(!firstState.room.transcript.some(row=>row.id==='second-question'));
 const rejected=await post(r,'a','remote-first','Enfermera ceftriaxona 1 g',first.uid);
 assert.equal(rejected.status,'rejected');assert.equal(rejected.reason,'approach-patient-to-claim');
 assert.equal(r.view().clinical.shift.confirmedFocusPatientUid,second.uid);
});

test('cooperative activity labels every patient and doctor, includes native exams, and keeps source chronology',async t=>{
 let r=await make({roomId:'shared-activity'});t.after(()=>r.dispose());
 const first=r.view().clinical.patient.uid;await walk(r,'a',first,20000);assert(r.claim('a',first));
 await post(r,'a','a-question','¿Desde cuándo empezó el dolor?',first);
 await post(r,'a','a-exam','/examen general',first);
 await post(r,'a','a-meds','Enfermera ceftriaxona 1 g',first);
 await post(r,'a','a-sample','Enfermera hemograma',first);
 while((await r.advanceTo(180000,{maxSteps:12000})).recovering){}
 const second=r.view().clinical.shift.patients[1].uid;
 await walk(r,'b',second,200000);
 await post(r,'b','b-question','¿Tiene alergias a medicamentos?',second);
 const a=r.view('a').clinical,b=r.view('b').clinical,activity=a.communication?.activity;
 assert(activity,'activity projects the existing native room events across beds');
 assert.deepEqual(activity,b.communication.activity);
 assert(activity.some(row=>row.kind==='question'&&row.actorId==='a'&&row.patientUid===first));
 assert(activity.some(row=>row.kind==='answer'&&row.actorId==='a'&&row.patientUid===first));
 const exam=activity.find(row=>row.kind==='exam'&&row.actorId==='a');assert(exam);
 assert.equal(exam.actorName,'Doctora Alba');assert.equal(exam.patientName,r.view('a',{patientUid:first}).clinical.patient.name);
 assert.equal(exam.bedId,a.shift.patients[0].bedId);assert.match(exam.text,/Impresión general|Aspecto general/);
 assert(!a.messages.some(row=>/a-exam/.test(row.id)),'the shared exam is derived even though native chat omits it');
 assert(activity.some(row=>row.kind==='administration'&&row.actorName==='Doctora Alba'&&row.patientUid===first));
 assert(activity.some(row=>row.kind==='result'&&row.actorName==='Doctora Alba'&&row.patientUid===first));
 const secondQuestion=activity.find(row=>row.commandId==='b-question'&&row.kind==='question');assert(secondQuestion);
 assert.equal(secondQuestion.actorName,'Doctor Bruno');assert(secondQuestion.at>=200-1e-8);
 assert(activity.every(row=>row.id&&row.patientUid&&row.patientName&&row.bedId&&row.actorName&&Number.isFinite(row.at)));
 assert.equal(new Set(activity.map(row=>row.id)).size,activity.length);
 for(let i=1;i<activity.length;i++)assert(activity[i].at>=activity[i-1].at,'cross-patient chronology uses arrival offset');
 const cp=wire(await r.checkpoint()),communication=wire(a.communication);r.dispose();r=await make({roomId:'shared-activity',checkpoint:cp});
 assert.deepEqual(wire(r.view('b').clinical.communication),communication);
 delete cp.communication;r.dispose();r=await make({roomId:'shared-activity',checkpoint:cp});
 assert.deepEqual(wire(r.view('a').clinical.communication.activity),wire(activity),'legacy checkpoints derive activity from their original events');
 assert.deepEqual(r.view('a').clinical.communication.team,[]);
});

test('competitive projection and activity keep rival conversations private',async t=>{
 const r=await make({mode:'competitive',roomId:'competitive-privacy'});t.after(()=>r.dispose());
 const [first,second]=r.view('a').clinical.shift.patients;
 await walk(r,'a',first.uid,20000);assert(r.claim('a',first.uid));
 await walk(r,'b',second.uid,40000);assert(r.claim('b',second.uid));
 await post(r,'a','private-a','¿Desde cuándo empezó el dolor?',first.uid);
 await post(r,'b','private-b','¿Tiene alergias a medicamentos?',second.uid);
 const a=r.view('a').clinical,b=r.view('b').clinical;
 assert.throws(()=>r.view('a',{patientUid:second.uid}),error=>error.code==='forbidden');
 assert.equal(r.view('a').clinical.shift.confirmedFocusPatientUid,first.uid);
 assert(a.communication.activity.some(row=>row.commandId==='private-a'));
 assert(!a.communication.activity.some(row=>row.patientUid===second.uid||row.commandId==='private-b'));
 assert(b.communication.activity.some(row=>row.commandId==='private-b'));
 assert(!b.communication.activity.some(row=>row.patientUid===first.uid||row.commandId==='private-a'));
});

test('a competitive default view uses an unowned patient instead of a rival clinical session',async t=>{
 const r=await make({mode:'competitive',roomId:'default-privacy'});t.after(()=>r.dispose());
 const [first,second]=r.view('a').clinical.shift.patients;
 await walk(r,'a',first.uid,20000);assert(r.claim('a',first.uid));
 await post(r,'a','private-first','¿Desde cuándo empezó el dolor?',first.uid);
 const view=r.view('b');
 assert.equal(view.clinical.patient.uid,second.uid);
 assert.equal(view.clinical.shift.confirmedFocusPatientUid,null);
 assert(!JSON.stringify(view).includes('private-first'));
 assert.throws(()=>r.view('b',{patientUid:first.uid}),error=>error.code==='forbidden');
});

test('a competitive spectator receives no rival history or private reward receipt when all beds are owned',async t=>{
 let r=await make({mode:'competitive',roomId:'all-owned-privacy'});t.after(()=>r.dispose());
 const [first,second]=r.view('a').clinical.shift.patients;
 await walk(r,'a',first.uid,20000);assert(r.claim('a',first.uid));
 await post(r,'a','private-first','¿Desde cuándo empezó el dolor?',first.uid);
 for(const [id,text] of [['private-dx','/diagnostico cirrosis descompensada'],['private-close','/cierre-parcial observacion']])
  await post(r,'a',id,text,first.uid);
 assert.equal(r.view('a').claims.length,1);
 await walk(r,'a',second.uid,40000);assert(r.claim('a',second.uid));
 await post(r,'a','private-second','¿Tiene alergias a medicamentos?',second.uid);
 const saved=wire(await r.checkpoint()),view=r.view('b');
 assert.equal(view.clinical.canEdit,false);assert.equal(view.clinical.readOnly,true);
 assert.deepEqual(view.clinical.messages,[]);assert.deepEqual(view.clinical.room.transcript,[]);
 assert.deepEqual(view.clinical.room.events,[]);assert.deepEqual(view.clinical.progress.receipts,[]);
 assert.deepEqual(view.claims,[]);assert.deepEqual(view.catalog,[]);
 assert.equal(view.clinical.caseReward,null);assert.equal(view.clinical.closure,null);
 assert.deepEqual(view.clinical.patient,{uid:first.uid,caseId:first.caseId});
 assert(!JSON.stringify(view).includes('private-first')&&!JSON.stringify(view).includes('private-second'));
 assert.throws(()=>r.view('b',{patientUid:second.uid}),error=>error.code==='forbidden');
 assert(r.view('a').clinical.messages.some(row=>row.id.includes('private-second')));
 const after=wire(await r.checkpoint());assert.deepEqual(after.focused,saved.focused);assert.deepEqual(after.session,saved.session);
 r.dispose();r=await make({mode:'competitive',roomId:'all-owned-privacy',checkpoint:after});
 assert.deepEqual(r.view('b').clinical.patient,{uid:first.uid,caseId:first.caseId});
 assert.deepEqual(r.view('b').claims,[]);assert.equal(r.view('a').claims.length,1);
});

test('a competitive checkpoint without a saved focus defaults to the doctor’s own patient',async t=>{
 let r=await make({mode:'competitive',roomId:'legacy-focus-privacy'});t.after(()=>r.dispose());
 const [first,second]=r.view('a').clinical.shift.patients;
 await walk(r,'a',first.uid,20000);assert(r.claim('a',first.uid));
 await walk(r,'b',second.uid,40000);assert(r.claim('b',second.uid));
 await post(r,'b','own-interview','¿Tiene alergias a medicamentos?',second.uid);
 const saved=wire(await r.checkpoint());saved.focused=saved.focused.filter(([actorId])=>actorId!=='b');
 r.dispose();r=await make({mode:'competitive',roomId:'legacy-focus-privacy',checkpoint:saved});
 const view=r.view('b').clinical;assert.equal(view.patient.uid,second.uid);
 assert(view.messages.some(row=>row.id.includes('own-interview')));
 assert.equal(view.shift.confirmedFocusPatientUid,null,'a fallback view does not create another bedside claim');
});

test('native disposition and death events appear without creating another clinical log',async t=>{
 const closing=await make({roomId:'activity-close'});t.after(()=>closing.dispose());
 const uid=closing.view().clinical.patient.uid;await walk(closing,'a',uid,20000);
 for(const [id,text] of [['dx','/diagnostico cirrosis descompensada'],['close','/cierre-parcial observacion']])
  await post(closing,'a',id,text,uid);
 assert(closing.view('b').clinical.communication?.activity.some(row=>row.kind==='disposition'&&row.actorName==='Doctora Alba'&&row.patientUid===uid));
 const dying=await make({roomId:'activity-death',caseId:'PERI-PBE-001'});t.after(()=>dying.dispose());
 await dying.advanceTo(500000,{maxSteps:40000});
 assert(dying.view().clinical.patient.patientDied);
 const death=dying.view('b').clinical.communication?.activity.find(row=>row.kind==='death');assert(death);
 assert.equal(death.patientUid,'activity-death:patient');assert.equal(death.name,'ATRIA');assert.match(death.text,/falleció/);
 const cp=await dying.checkpoint();assert(!Object.hasOwn(cp.communication,'activity'),'activity must remain a projection of native room events');
});
