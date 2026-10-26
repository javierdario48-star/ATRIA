// Real-session clinical bots for an anticoagulant inadvertently given to
// a patient with active GI hemorrhage. Paired untreated controls share the
// same case, clock, starting condition, and native physiological owner.
// ACG/CAG 2022 antithrombotic management in acute GI bleeding:
// https://pubmed.ncbi.nlm.nih.gov/35297395/
// The IV heparin choice is deliberately WRONG for this educational scenario.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
const load=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const cases=['HDA-001','VARIX-001','LGIB-001'];
const modes=['solo','apprentice','coop'];
const report=[];
function fixture(caseId,mode,name){
 const uid='qa-'+caseId+'-'+mode+'-'+name,roomId='qa-bleed-'+uid;
 const s=createGuardSession({roomId,mode,actorId:'a',actorName:'Physician bot',
  patient:{uid,caseId,clinicalFlags:{activeBleeding:true}},content,
  members:mode==='coop'?[{id:'a',name:'Physician bot'},{id:'b',name:'Peer'}]:
   [{id:'a',name:'Physician bot'}],
  resolveContext:()=>({patientUid:uid})});
 let sequence=0;
 return {s,post:text=>s.post({id:'bot-'+(++sequence),text}),
  async advance(seconds){s.advance(seconds);await s.flush();}};
}
for(const caseId of cases)for(const mode of modes){
 test(caseId+' '+mode+': physician gives harmful heparin only after authenticated IV receipt',async()=>{
  assert(CLINICAL_EXECUTORS[caseId]);
  const untreated=fixture(caseId,mode,'untreated');
  const harmed=fixture(caseId,mode,'heparin');
  try{
   await untreated.post('/signos');
   await harmed.post('/signos');
   await harmed.post('Enfermera una vía');
   const response=await harmed.post('Enfermera heparina IV');
   assert.equal(response.clinical[0].status,'pending');
   const before=harmed.s.read().patient;
   assert.equal(before.administrationLog.length,0,'order does not equal an administered drug');
   await harmed.advance(1.4);
   assert.equal(harmed.s.read().patient.administrationLog.length,0,
    'preparation must finish before physiological effects');
   // Clinical decline at a matched elapsed time; neither bot orders
   // surgery, blood products, or a destination to fake a good outcome.
   await untreated.advance(27);
   await harmed.advance(25.6);
   const a=untreated.s.read(),b=harmed.s.read(),patient=b.patient;
   const administered=patient.administrationLog.filter(x=>x.id==='anticoagulation');
   assert.equal(administered.length,1,'exactly one actual patient-bound heparin exposure');
   assert.equal(administered[0].patientUid,patient.uid);
   assert.equal(administered[0].dose.unit,'protocolo');
   assert.equal(administered[0].dose.amount,1);
   assert(patient.liveVitals.sys<a.patient.liveVitals.sys-1,
    caseId+' heparin must worsen pressure compared with untreated identical hemorrhage');
   assert(patient.liveVitals.hr>a.patient.liveVitals.hr+1,
    caseId+' heparin must worsen tachycardia compared with untreated identical hemorrhage');
   assert(patient.adverseEvents.some(x=>x.kind==='anticoagulant-bleeding'),
    'confirmed iatrogenic hemorrhage must appear in the clinical history');
   assert.equal(b.progress.xp,0,'harmful medicine must never reward XP');
   assert.equal(a.progress.xp,0);
   assert.equal(b.progress.receipts.length,0,'no accidental closure during medication harm');
   assert(b.closure.quality.penalty>=5,'debrief must account for the confirmed harm');
   await harmed.s.post({id:'bot-3',text:'Enfermera heparina IV'}); // replay exact accepted request
   await harmed.advance(1);
   assert.equal(harmed.s.read().patient.administrationLog.filter(x=>x.id==='anticoagulation').length,1,
    'network retry cannot re-administer anticoagulant');
   report.push({caseId,mode,untreatedSys:a.patient.liveVitals.sys,
    harmedSys:patient.liveVitals.sys,untreatedHr:a.patient.liveVitals.hr,
    harmedHr:patient.liveVitals.hr,administered:1,xp:0});
  }finally{untreated.s.dispose();harmed.s.dispose();}
 });
}
test('hemorrhage harm matrix covers three GI presentations and three game modes',()=>{
 assert.equal(report.length,9);
 assert.equal(new Set(report.map(x=>x.caseId)).size,3);
 assert.equal(new Set(report.map(x=>x.mode)).size,3);
 fs.mkdirSync('qa/v5-medical-bot-results',{recursive:true});
 fs.writeFileSync('qa/v5-medical-bot-results/anticoagulant-bleeding.json',
  JSON.stringify({guideline:'ACG/CAG 2022',kind:'paired real-session harm vs untreated',rows:report},null,2));
 console.log('ATRIA_GI_HEPARIN_HARM_BOTS='+JSON.stringify(report));
});
