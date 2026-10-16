import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';

const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
function setup(caseId='CIRR-001',uid='P1'){
 let near=uid,n=0;
 const s=createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Javier',patient:{uid,caseId},content,
  resolveContext:()=>({patientUid:near})});
 return {s,send:text=>s.post({id:'exam-'+(++n),text}),near:value=>near=value};
}
test('regional examination records only the selected anatomy and technique, with patient/event provenance',async()=>{
 const f=setup(),initial=f.s.read();
 const ack=await f.send('/examen abdomen palpation');
 assert.equal(ack.clinical[0]?.status,'executed');
 const p=f.s.read().patient;
 assert.deepEqual(Object.keys(p.examFindings),['abdomen']);
 assert.deepEqual(Object.keys(p.examFindings.abdomen),['palpation']);
 const finding=p.examFindings.abdomen.palpation;
 assert.equal(finding.patientUid,'P1');assert.equal(finding.eventId,ack.clinical[0].receipt.eventId);
 assert.match(finding.rows[0].text,/Ascitis moderada/);
 assert(!JSON.stringify(finding).includes('Esplenomegalia'),'unexplored spleen must not be disclosed');
 assert.equal(p.examDone,false);assert.deepEqual(p.treatments,[]);
 assert.deepEqual(p.liveVitals,initial.patient.liveVitals);assert.deepEqual(f.s.read().clock,initial.clock);
 f.s.dispose();
});
test('general examination observes the original subjective pain and real physiological trend without changing either',async()=>{
 for(const [caseId,pain] of [['CIRR-001',3],['APP-001',7]]){
  const f=setup(caseId),before=f.s.read().patient.liveVitals;
  await f.send('/examen general general');
  assert.match(f.s.read().patient.examFindings.general.general.rows.find(r=>r.organ==='Dolor observado').text,new RegExp(pain+'/10'));
  assert.deepEqual(f.s.read().patient.liveVitals,before);f.s.dispose();
 }
});
test('exam completion requires general impression and each performed abdominal technique; thorax cannot substitute',async()=>{
 const f=setup();await f.send('/examen general general');
 for(const tech of ['inspection','auscultation'])await f.send('/examen thorax '+tech);
 for(const tech of ['inspection','percussion','palpation'])await f.send('/examen abdomen '+tech);
 assert.equal(f.s.read().patient.examDone,false);
 await f.send('/examen abdomen auscultation');assert.equal(f.s.read().patient.examDone,true);
 assert.match(JSON.stringify(f.s.read().patient.examFindings.abdomen.auscultation),/Sin hallazgo específico modelado/);
 f.s.dispose();
});
test('APP findings match the effective original and do not fabricate inspection or percussion findings',async()=>{
 const f=setup('APP-001');
 for(const tech of ['inspection','percussion','palpation'])await f.send('/examen abdomen '+tech);
 const ex=f.s.read().patient.examFindings.abdomen;
 assert.match(ex.inspection.rows[0].text,/Sin hallazgo específico modelado/);
 assert.match(ex.percussion.rows[0].text,/Sin hallazgo específico modelado/);
 assert.match(ex.palpation.rows[0].text,/McBurney.*Blumberg.*psoas/);
 f.s.dispose();
});
test('Glasgow components remain unknown until assessed; their total requires all three and does not complete the exam',async()=>{
 const f=setup();assert.equal(f.s.read().patient.glasgow??null,null);
 await f.send('/glasgow eye');let g=f.s.read().patient.glasgow;
 assert.equal(g.eye.score,4);assert.equal(g.verbal,undefined);assert.equal(g.total,null);
 await f.send('/glasgow verbal');assert.equal(f.s.read().patient.glasgow.total,null);
 await f.send('/glasgow motor');g=f.s.read().patient.glasgow;
 assert.equal(g.total,15);assert.equal(g.motor.score,6);assert.equal(g.motor.patientUid,'P1');
 assert.equal(f.s.read().patient.examDone,false);f.s.dispose();
});
test('invalid anatomy/technique, wrong or distant target and repeated envelopes cannot reveal or duplicate findings',async()=>{
 const f=setup(),other=setup('APP-001','P2');
 for(const text of ['/examen liver auscultation','/examen unknown palpation','/glasgow invalid','/examen constructor','/examen __proto__ palpation','/glasgow constructor']){
  const a=await f.send(text);assert.equal(a.status,'received-not-executed');
 }
 f.near('P2');await f.send('/examen abdomen palpation');f.near(null);await f.send('/examen abdomen palpation');
 assert.deepEqual(f.s.read().patient.examFindings||{},{});
 f.near('P1');const envelope={id:'same',text:'/examen spleen palpation'};
 const first=await f.s.post(envelope);assert.deepEqual(await f.s.post(envelope),first);
 assert.equal(f.s.read().patient.examLog.length,1);assert.deepEqual(other.s.read().patient.examFindings||{},{});
 assert.equal(f.s.read().patient.lastVitalsKnown,null);f.s.dispose();other.s.dispose();
});
