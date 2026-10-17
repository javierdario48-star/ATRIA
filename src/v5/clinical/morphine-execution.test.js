import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {morphineOrderIssue487} from '../../integration/morphine-487.js';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advanceLegacy}
 from '../../../qa/physiology-live/native-journey-487.mjs';
const load=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
function fixture(caseId='CIRR-001',mode='solo'){
 const s=createGuardSession({roomId:'morphine-'+caseId+'-'+mode,mode,actorId:'doc',actorName:'Doctor',
  patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'})});
 let n=0;return {s,post:text=>s.post({id:'m'+(++n),text})};
}
test('actual V5 morphine vital trajectories stay within .05 of V4 with long-frame catch-up',async()=>{
 for(const caseId of ['APP-001','CIRR-001']){
  const {s,post}=fixture(caseId),old=createLiveNativeJourney487(caseId);
  try{
   await post('Enfermera una vía');await post('Enfermera morfina 12 mg IV');
   old.ctx.addMonitorTherapy('morfina 12 mg IV');
   for(const seconds of [1,14,15,80]){
    s.advance(seconds);advanceLegacy(old,seconds);await s.flush();
    const p=s.read().patient;
    assert.equal(p.administrationLog.length,old.ctx.sim.administrationLog.length);
    for(const axis of ['sys','dia','hr','rr','spo2','temp'])
     assert(Math.abs(p.liveVitals[axis]-old.ctx.sim.liveVitals[axis])<.05,caseId+' '+seconds+' '+axis);
   }
  }finally{s.dispose();}
 }
});
test('morphine kinetics follow native time while the visible guard clock keeps its existing contract',async()=>{
 const a=fixture(),b=fixture();
 try{
  for(const {s,post} of [a,b]){
   await post('Enfermera una vía');await post('Enfermera morfina 4 mg IV');
   s.advance(1);await s.flush();
  }
  a.s.advance(8);b.s.advance(32,{typing:true});
  const x=a.s.read().clock,y=b.s.read().clock;
  assert(Math.abs(x.nativeMinute-y.nativeMinute)<1e-9);
  assert(y.gameMinute>x.gameMinute,'typing changes the legacy clinical domain, not the visible clock');
  assert(Math.abs(a.s.pharmacologyRead().drugs.find(x=>x.id==='morphine').kinetics.load-
   b.s.pharmacologyRead().drugs.find(x=>x.id==='morphine').kinetics.load)<1e-9);
 }finally{a.s.dispose();b.s.dispose();}
});
test('valid compound source identities remain readable after real morphine delivery',async()=>{
 const s=createGuardSession({roomId:'r'.repeat(160),mode:'solo',actorId:'d'.repeat(160),actorName:'D',
  patient:{uid:'P',caseId:'APP-001'},content,resolveContext:()=>({patientUid:'P'})});
 try{
  await s.post({id:'iv',text:'Enfermera una vía'});
  await s.post({id:'m'.repeat(160),text:'Enfermera morfina 4 mg IV'});
  s.advance(1);await s.flush();
  assert(s.read().patient.administrationLog[0].sourceEventId.length>160);
  assert.equal(s.pharmacologyRead().drugs.find(x=>x.id==='morphine').state,'confirmed');
 }finally{s.dispose();}
});
for(const mode of ['solo','apprentice'])for(const caseId of ['APP-001','CIRR-001'])
 test(mode+'/'+caseId+': morphine uses the shared IV preparation and actual dose receipt',async()=>{
  const {s,post}=fixture(caseId,mode);
  try{
   await post('Enfermera una vía');
   const baseline=s.read().patient.liveVitals;
   const ack=await post('Enfermera morfina 4 mg IV');
   assert.equal(ack.clinical[0].status,'pending');
   s.advance(.54);await s.flush();
   assert.equal(s.read().patient.administrationLog.length,0);
   assert.deepEqual(s.read().patient.liveVitals,baseline,'a pending dose has no opioid effect');
   s.advance(.02);await s.flush();
   const p=s.read().patient,row=p.administrationLog[0];
   assert.equal(row.id,'morphine');assert.equal(row.dose.amount,4);assert.equal(row.dose.unit,'mg');
   assert(Math.abs(row.administeredAtRealSecond-.55)<1e-9);
   const response=s.pharmacologyRead().drugs.find(x=>x.id==='morphine');
   assert.equal(response.state,'confirmed');assert.equal(response.model,'legacy-morphine-487');
   assert(response.rawOffsets.rr<0);
   assert(response.candidateOffsets.rr===0&&response.ownedAxes.includes('rr'),'one native writer');
   if(caseId==='APP-001')assert(response.kinetics.analgesia>0);
   else assert.equal(response.kinetics.analgesia,0,'no pain benefit invented for stable ascites');
  }finally{s.dispose();}
 });
test('a technically valid high morphine dose executes, depresses breathing and can be supported with real oxygen',async()=>{
 const a=fixture(),b=fixture();
 try{
  for(const {s,post} of [a,b]){
   await post('Enfermera una vía');
   assert.equal((await post('Enfermera morfina 12 mg IV')).clinical[0].status,'pending');
   s.advance(15);await s.flush();
   assert.equal(s.read().patient.administrationLog[0].dose.amount,12);
   assert(s.read().patient.liveVitals.spo2<94&&s.read().patient.liveVitals.rr<13,'measurable opioid harm');
   assert.equal(s.read().patient.adverseEvents.filter(x=>x.kind==='opioid-respiratory-depression').length,1);
   assert.equal(s.read().room.events.filter(x=>x.type==='clinical.complication'&&x.kind==='opioid-respiratory-depression').length,1,
    'the authority must publish the emerged complication in the shared transcript');
   assert(s.read().messages.some(x=>/Depresión respiratoria tras morfina/.test(x.text)),'nurse warning must reach the doctor');
   assert(s.read().closure.quality.penalty>=5,'observed opioid harm remains in quality assessment');
  }
  await b.post('Enfermera oxígeno 4 L/min');
  for(const x of [a,b]){x.s.advance(10);await x.s.flush();}
  assert(b.s.read().patient.liveVitals.spo2>a.s.read().patient.liveVitals.spo2+2,'confirmed support improves oxygenation');
  assert.equal(b.s.read().patient.administrationLog.filter(x=>x.id==='oxygen').length,1);
  b.s.advance(340);await b.s.flush();
  assert.equal(b.s.read().patient.adverseEvents[0].status,'resolved');
  assert(b.s.read().closure.quality.penalty>=5,'resolution does not erase a documented complication');
 }finally{a.s.dispose();b.s.dispose();}
});
test('fresh repeated opioid doses accumulate; replay does not redose and toxicity washes out',async()=>{
 const {s,post}=fixture('APP-001');
 try{
  await post('Enfermera una vía');await post('Enfermera morfina 4 mg IV');
  s.advance(1);await s.flush();
  const one=s.pharmacologyRead().drugs.find(x=>x.id==='morphine');
  const earlyPain=s.pharmacologyRead().outcomes.painIndex;
  const request={id:'repeat',text:'Enfermera morfina 4 mg IV'};
  await s.post(request);await s.post(request);s.advance(1);await s.flush();
  const two=s.pharmacologyRead().drugs.find(x=>x.id==='morphine');
  assert.equal(s.read().patient.administrationLog.length,2,'transport retry is not another dose');
  assert(two.kinetics.load>one.kinetics.load&&two.rawOffsets.spo2<one.rawOffsets.spo2);
  s.advance(110);await s.flush();
  const late=s.pharmacologyRead().drugs.find(x=>x.id==='morphine');
  assert(late.kinetics.load<two.kinetics.load*.55);
  assert(late.rawOffsets.rr>two.rawOffsets.rr&&late.rawOffsets.spo2===0,'no permanent old overdose flag');
  assert(s.pharmacologyRead().outcomes.painIndex>earlyPain,
   'the virtual analgesic outcome must also wear off');
  assert.equal(s.read().patient.administrationLog.length,2,'washout retains dose history');
 }finally{s.dispose();}
});
test('pre-existing fluid hypoxemia alone cannot be relabeled opioid toxicity before an opioid oxygenation effect',async()=>{
 const {s,post}=fixture();
 try{
  await post('Enfermera una vía');await post('Enfermera Ringer 4 l');
  s.advance(30);await s.flush();assert(s.read().patient.liveVitals.spo2<94);
  await post('Enfermera morfina 4.5 mg IV');s.advance(1);await s.flush();
  const r=s.pharmacologyRead().drugs.find(x=>x.id==='morphine');
  assert(r.kinetics.respiratoryRisk&&r.rawOffsets.spo2===0&&s.read().patient.liveVitals.rr>12);
  assert(!s.read().patient.adverseEvents.some(x=>x.kind==='opioid-respiratory-depression'),
   'a general risk flag cannot document a different complication without the corresponding modeled effect');
 }finally{s.dispose();}
});
for(const mode of ['solo','apprentice'])for(const rescue of ['early','late','none'])
 test(mode+': opioid after actual overload permits '+rescue+' rescue consequences through the existing survival owner',async()=>{
  const {s,post}=fixture('CIRR-001',mode);
  try{
   await post('Enfermera una vía');await post('Enfermera Ringer 6 l');
   s.advance(490);await s.flush();
   assert(!s.read().patient.patientDied,'overload alone must not be made arbitrarily fatal');
   assert(s.read().patient.liveVitals.spo2>=80);
   await post('Enfermera morfina 12 mg IV');s.advance(2);await s.flush();
   assert(!s.read().patient.patientDied,'no instant opioid death');
   if(rescue==='early')assert.equal((await post('Enfermera oxígeno 4 L/min')).clinical[0].status,'executed');
   if(rescue==='late'){
    s.advance(38);await s.flush();
    assert.equal((await post('Enfermera oxígeno 4 L/min')).clinical[0].status,'rejected');
   }
   s.advance(100);await s.flush();
   const p=s.read().patient;
   assert.equal(p.administrationLog.filter(x=>x.id==='morphine').length,1);
   assert.equal(s.read().progress.xp,0);
   if(rescue==='early'){
    assert(!p.patientDied&&p.liveVitals.spo2>90,'confirmed early support stabilizes the modeled oxygenation problem');
    assert(p.survival.rescueStartedAtSec!==null,'same finite original rescue policy');
   }else{
    assert(p.patientDied&&p.caseEnded&&p.survival.exposureNativeMinutes>=1.35);
    assert.equal(s.read().room.events.filter(x=>x.type==='clinical.patient-died').length,1);
    assert.equal((await post('/disposicion sala')).clinical[0].status,'rejected');
    assert.equal(s.read().progress.receipts.length,0);
   }
  }finally{s.dispose();}
 });
test('morphine retains the original route, unit and interpretation limits, including compound preflight',async()=>{
 const {s,post}=fixture();
 const invalid=['morfina 4 mg oral','morfina 4 mg VO','morfina 4 mcg IV','morfina 4 g IV',
  'morfina 4 ml IV','morfina 4','morfina -4 mg IV','morfina 4 mg IM','morfina 4 mg I.M.',
  'morfina 4 mg intranasal','morfina 4 mg vía desconocida','morfina 0 mg IV',
  'morfina 40 mg IV','morfina 4 mg y 8 mg'];
 try{
  await post('Enfermera una vía');
  for(const q of invalid){
   assert(morphineOrderIssue487(q),q+' original interpretation contract');
   const ack=await post('Enfermera '+q);
   assert(ack.routeError||ack.clinical.every(x=>x.status==='rejected'),q);
   assert.equal(s.read().patient.pendingTreatments.length,0,q);
  }
  const ack=await post('Enfermera morfina 4 mg oral y ceftriaxona 1 g');
  assert.equal(ack.routeError,'unsafe-compound-order');
  s.advance(2);await s.flush();assert.equal(s.read().patient.administrationLog.length,0);
 }finally{s.dispose();}
});
