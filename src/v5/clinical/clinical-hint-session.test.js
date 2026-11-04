import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent as content} from '../server/content.js';
import {createGuardSession} from './guard-session.js';

const members=[{id:'a',name:'A'},{id:'b',name:'B'}];
const options={roomId:'hint-session',mode:'coop',actorId:'a',actorName:'A',members,patient:{uid:'patient',caseId:'CIRR-001'},content,
 authenticate:id=>members.some(m=>m.id===id)?{id,roomId:'hint-session'}:null,resolveContext:()=>({patientUid:'patient'})};
async function reveal(s,actorId='a'){
 const b=s.hintBinding(actorId),make=(op,more={})=>({...b,op,requestId:crypto.randomUUID(),...more});
 const p=await s.hint(make('prepare'),actorId),v=await s.hint(make('revalidate',{offerId:p.offerId}),actorId);
 assert.equal(v.status,'verified');return s.hint(make('displayed',{offerId:p.offerId}),actorId);
}
test('session binds offers to room encounter patient and authenticated physician',async()=>{
 const s=createGuardSession(options),b=s.hintBinding('a');
 assert.equal((await s.hint({...b,actorId:'b',op:'prepare',requestId:'spoof'},'a')).status,'rejected');
 assert.equal((await s.hint({...b,patientUid:'wrong',op:'prepare',requestId:'wrong'},'a')).status,'rejected');
 await reveal(s);assert.equal(s.hintCount('a'),1);assert.equal(s.hintCount('b'),0);s.dispose();
});
test('history survives restart and the same clinical action remains free',async()=>{
 let s=createGuardSession(options);await reveal(s);const saved=await s.checkpoint();s.dispose();
 s=createGuardSession({...options,checkpoint:saved});await reveal(s);assert.equal(s.hintCount('a'),1);s.dispose();
});
test('changed evidence invalidates prepared hints without a fee',async()=>{
 const s=createGuardSession(options),b=s.hintBinding('a');const p=await s.hint({...b,op:'prepare',requestId:'prepare'},'a');
 await s.post({id:'vitals',text:'/signos'},'b');
 assert.equal((await s.hint({...b,op:'revalidate',requestId:'verify',offerId:p.offerId},'a')).status,'stale');
 assert.equal(s.hintCount('a'),0);s.dispose();
});
test('individual reward applies hint factor without changing clinical score or another doctor',async()=>{
 const s=createGuardSession(options);await reveal(s,'a');const raw={xp:133,quality:{score:100},actorId:'a'};
 assert.equal(s.rewardFor(raw,'a').xp,126);assert.equal(s.rewardFor(raw,'a').quality.score,100);
 assert.equal(s.rewardFor(raw,'b').xp,133);s.dispose();
});
test('both doctors see the same canonical clinical closure with separate XP projections',async()=>{
 const s=createGuardSession(options);
 await reveal(s,'a');
 await s.post({id:'dx',text:'/diagnostico cirrosis descompensada'},'b');
 await s.post({id:'close',text:'/cierre-parcial observacion'},'b');
 const a=s.read('a'),b=s.read('b');
 assert.equal(b.patient.closure.actorId,'b');
 assert.deepEqual(a.patient,b.patient);
 assert.equal(a.caseReward.xp,Math.floor(b.caseReward.xp*95/100));
 assert.equal(a.caseReward.quality.score,b.caseReward.quality.score);
 const late=await s.hint({...s.hintBinding('a'),op:'prepare',requestId:'closed-encounter'},'a');
 assert.equal(late.reason,'patient-not-active');assert.equal(s.hintCount('a'),1);
 s.dispose();
});
