import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent} from '../server/content.js';
import {resp01V2Candidate} from '../content/packs/respiratory-v2-candidate.js';
import {medicationIndicationReview as review} from './medication-indication-review.js';
import {createGuardSession} from './guard-session.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';

const catalog=clinicalContent.cases;
const v2Content={...clinicalContent,cases:catalog.map(c=>c.id===resp01V2Candidate.id?resp01V2Candidate:c)};
const initial=(uid='drug-indication:P')=>({uid,liveVitals:{sys:120,dia:80,spo2:96,hr:92,rr:19,temp:38.1},
 phys:{effectiveVolume:1,renalReserve:1},treatments:[],administrationLog:[],pendingTreatments:[],adverseEvents:[]});
test('generic class rule detects unsupported diuretic in low-risk pneumonia, but not prescribed ascites care',()=>{
 const p=initial(),c=resp01V2Candidate;
 const before=structuredClone(p);
 assert.equal(review(p,c,'furosemide')?.code,'clinical-indication-not-supported');
 assert.equal(review(p,c,'amoxicillin'),null,'appropriate antibiotic needs no incorrect indication advisory');
 const cirr=catalog.find(x=>x.id==='CIRR-001');
 assert.equal(review(p,cirr,'furosemide'),null,'ascites/congestion is a legitimate indication');
 assert.equal(review(p,cirr,'espironolactona'),null,'authored treatment must remain valid');
 assert.deepEqual(p,before,'indication check is pure and never administers or changes vital signs');
});
test('native nurse executes an unindicated medication but it earns no hidden-action credit and marks subsequent closure quality',async()=>{
 const roomId='resp-v2-wrong-furosemide-native',uid=roomId+':patient';
 const s=createGuardSession({roomId,mode:'solo',actorId:'doctor',actorName:'Bot',
  patient:{uid,caseId:resp01V2Candidate.id},content:v2Content,
  resolveContext:()=>({patientUid:uid})});
 try{
  const before=s.read(),base=before.closure.quality;
  assert.equal(before.progress.xp,0);
  const iv=await s.post({id:'iv-access',text:'Enfermera una vía'});
  assert(['pending','executed'].includes(iv.clinical?.[0]?.status));
  s.advance(4);await s.flush();
  const order=await s.post({id:'bad-drug',text:'Enfermera furosemida 40 mg IV'});
  assert.equal(order.clinical?.[0]?.status,'pending','medical freedom means clinical inappropriateness is not a prescription veto');
  assert.equal(s.read().patient.administrationLog.some(x=>x.id==='furosemide'),false,
   'a pending order has no delivered exposure yet');
  assert.equal(s.read().progress.penalties.length,0,'ordinary prescribing errors are assessed at case closure');
  s.advance(4);await s.flush();
  const p=s.read().patient,admin=p.administrationLog.find(x=>x.id==='furosemide');
  assert(admin,'the drug must actually be administered, not merely ordered');
  assert(admin.clinicalAdvisories?.some(x=>x.code==='clinical-indication-not-supported'),
   'the real administration should carry the universal indication advisory');
  const risk=confirmedClinicalMissteps(p,resp01V2Candidate);
  assert(risk.adverseCount>=1,'an executed unjustified diuretic must reduce final clinical quality');
  const quality=s.read().closure.quality;
  assert(quality.score<=base.score-5,
   'a wrong administered medicine cannot improve or preserve the hidden-requirements score');
  assert.equal(s.read().progress.penalties.length,0,
   'a clinical treatment mistake is debited by closure quality, not as a separate immediate XP penalty');
  assert.equal(s.read().patient.caseEnded,false,'erroneous medicine does not forcibly end the encounter');
 }finally{s.dispose();}
});
test('only real delivered receipts can incur drug-decision penalties; future orders and forged cross-patient administrations cannot',()=>{
 const c=resp01V2Candidate,p=initial('p');
 const advice=review(p,c,'furosemide');
 p.pendingTreatments=[{id:'furosemide',patientUid:'p',sourceEventId:'pending'}];
 assert.equal(confirmedClinicalMissteps(p,c).adverseCount,0);
 p.administrationLog=[{id:'furosemide',patientUid:'another',sourceEventId:'wrong-patient',
  dose:{amount:40,unit:'mg'},route:'iv',administeredAtNativeMinute:1,
  clinicalAdvisories:[advice]}];
 assert.equal(confirmedClinicalMissteps(p,c).adverseCount,0);
});
