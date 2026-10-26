import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {evaluateGastroDisposition} from './gastro-closure-v5.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
for(const mode of ['solo','apprentice','coop'])test('physician rectal examination, actual disimpaction and safe handoff / '+mode,async()=>{
 const uid='rectal-'+mode,session=createGuardSession({roomId:uid,mode,actorId:'doctor',actorName:'Doctor',
  patient:{uid,caseId:'FECAL-001'},content,
  members:mode==='coop'?[{id:'doctor',name:'Doctor'},{id:'partner',name:'Partner'}]:[{id:'doctor',name:'Doctor'}],
  resolveContext:()=>({patientUid:uid})});
 let serial=0;const post=text=>session.post({id:'r'+(++serial),text});
 const advance=async seconds=>{session.advance(seconds);await session.flush();};
 try{
  assert(!session.catalog().some(s=>s.id==='g_fecal_rectal'),'a physician maneuver is not a selectable nurse study');
  await post('Enfermera tacto rectal dirigido');await post('/estudio g_fecal_rectal');
  await advance(30);
  assert.equal(session.read().patient.orders.length,0);
  assert.deepEqual(session.read().patient.examFindings,{});
  assert(session.read().messages.some(m=>m.role==='system'&&/Examen físico.*Periné/i.test(m.text)));
  for(const text of ['¿Tiene estreñimiento?','¿Toma opioides?','/signos',
   '/examen general','/examen inspection','/examen auscultation','/examen percussion','/examen palpation',
   '/diagnostico fecaloma'])await post(text);
  const exam=await post('/examen perineum rectal');
  assert.equal(exam.clinical[0]?.status,'executed');
  let finding=session.read().patient.examFindings.perineum.rectal;
  assert.equal(finding.patientUid,uid);assert.equal(finding.eventId,exam.clinical[0].receipt.eventId);
  assert.match(finding.rows[0].text,/materia fecal dura/i);
  assert(!session.read().messages.some(m=>m.role==='nurse'&&/Ampolla rectal|materia fecal dura/i.test(m.text)));
  assert.equal((await post('/disposicion alta')).clinical[0]?.status,'rejected','diagnosis alone cannot substitute disimpaction');
  await post('Enfermera desimpactacion');
  await post('/examen perineum rectal');
  assert.match(session.read().patient.examFindings.perineum.rectal.rows[0].text,/materia fecal dura/i,
   'a pending procedure does not remove the impaction');
  await advance(60);await post('/examen perineum rectal');
  finding=session.read().patient.examFindings.perineum.rectal;
  assert.match(finding.rows[0].text,/sin fecaloma palpable.*desimpactación/i);
  await post('/reevaluar');
  await post('Vega, ¿cómo seguimos?');
  assert(!/Elegí los pertinentes|esperá los resultados reales/i.test(session.read().messages.filter(m=>m.role==='mentor').at(-1)?.text||''));
  assert.equal((await post('/disposicion alta')).clinical[0]?.status,'executed');
  const closed=session.read();assert.equal(closed.progress.receipts.length,1);
  assert.equal(closed.patient.closure.quality.studies,15,'real physician diagnostic evidence earns the diagnostic-evidence credit');
  assert(!closed.patient.closure.debrief.missing.some(x=>/Estudios.*Tacto rectal/i.test(x)),
   'debrief cannot demand a retired nursing study');
  await post('/disposicion alta');assert.equal(session.read().progress.xp,closed.progress.xp);
 }finally{session.dispose();}
});

test('a legacy rectal study result cannot impersonate a physician examination at closure',()=>{
 const base={caseId:'FECAL-001',diagnosis:'fecaloma',acceptedDiagnoses:['fecaloma'],
  historyAnswered:['constipation'],historyRelevant:['constipation'],vitalsKnown:true,
  examDone:true,examRegionsCount:5,reassessments:1,studiesDone:['g_fecal_rectal'],
  delivered:['disimpaction'],consultsDone:[],disposition:'alta',sys:120,hr:80,rr:16,spo2:98};
 assert.equal(evaluateGastroDisposition(base).ready,false);
 assert.equal(evaluateGastroDisposition({...base,examPerformed:['perineum:rectal']}).ready,true);
});
