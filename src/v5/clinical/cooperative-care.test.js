import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
test('two authenticated cooperative doctors share the genuine patient, transcript, pending medications, results and one closure',async()=>{
 const keys=new Map([['host-token','A'],['guest-token','B']]),roomId='cooperative';
 const s=createGuardSession({roomId,mode:'coop',actorId:'A',actorName:'Ana',members:[{id:'A',name:'Ana'},{id:'B',name:'Bruno'}],
  authenticate:key=>keys.has(key)?{id:keys.get(key),roomId}:null,patient:{uid:'P',caseId:'PERI-PBE-001'},content,
  resolveContext:({actorId})=>({patientUid:['A','B'].includes(actorId)?'P':null})});
 const send=(key,id,text)=>s.post({id,text},key);
 try{
  assert.equal((await send('forged','x','Enfermera ceftriaxona')).status,'rejected');
  await send('host-token','same','¿Tiene cirrosis?');await send('guest-token','same','¿Tiene ascitis?');
  const names=s.read().messages.filter(x=>x.role==='player');assert.deepEqual(names.map(x=>x.name),['Ana','Bruno']);assert.equal(new Set(names.map(x=>x.id)).size,2);
  await send('guest-token','iv','Enfermera una vía');
  const dose=await send('guest-token','dose','Enfermera ceftriaxona 1 g');assert.equal(dose.clinical[0].status,'pending');
  await send('host-token','albumin','Enfermera albumina 1.5 g/kg');
  assert.equal(s.read().patient.administrationLog.length,0);s.advance(1.51);await s.flush();
  await send('guest-token','dose','Enfermera ceftriaxona 1 g');assert.equal(s.read().patient.administrationLog.length,2);
  assert.equal(s.read().patient.administrationLog.find(x=>x.id==='ceftriaxone').actorId,'B');
  await send('guest-token','para','/estudio pbe_paracentesis');await send('host-token','renal','/estudio pbe_renal');
  await send('host-token','fever','¿Tuvo fiebre?');await send('guest-token','confusion','¿Notó confusión?');
  await send('guest-token','vitals','/signos');await send('host-token','dx','/diagnostico PBE');
  for(const t of ['general','inspection','auscultation','percussion','palpation'])await send('guest-token','exam-'+t,'/examen '+t);
  s.advance(45);await s.flush();assert(s.read().patient.orders.every(o=>o.status==='done'));
  await send('guest-token','recheck','/reevaluar');
  const outcomes=await Promise.all([send('guest-token','close','/disposicion sala'),send('host-token','close','/disposicion sala')]);
  assert.equal(outcomes.filter(x=>x.clinical[0]?.status==='executed').length,1);assert.equal(s.read().progress.receipts.length,1);
  assert.equal(s.read().patient.closure.quality.score,100);assert.equal(s.read().progress.xp,111,'native cooperative mode has no solo autonomy multiplier');
 }finally{s.dispose();}
});
