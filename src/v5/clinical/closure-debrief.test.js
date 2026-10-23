import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {confirmedRespiratoryAdverse} from './clinical-risk.js';
import {createClosureDebrief} from './closure-debrief.js';
import {caseDebriefHTML} from '../ui/case-debrief.js';
import {createGuardSession} from './guard-session.js';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const cirr=content.cases.find(x=>x.id==='CIRR-001');
const quality=(extra=0,adverse=0)=>({
 score:100-Math.min(5,extra*2)-Math.min(20,adverse*5),
 diagnosis:15,history:15,safety:25,studies:15,treatment:25,
 efficiency:5-Math.min(5,extra*2),
 penalty:Math.min(5,extra*2)+Math.min(20,adverse*5),
 extraStudies:extra});
test('V4-native scoring exposes four truthful scorecard divisions without synthetic XP',()=>{
 const stable={uid:'P',administrationLog:[],liveVitals:{spo2:96,rr:20}};
 const good=createClosureDebrief(stable,cirr,quality());
 assert.equal(good.score,100);
 assert.equal(good.earned.reduce((s,r)=>s+r.points,0),100);
 assert.deepEqual(good.deductions,[]);
 assert.deepEqual(good.missing,[]);
 const ugly={uid:'P',liveVitals:{spo2:90,rr:30},
   administrationLog:[{id:'fluid',patientUid:'P',sourceEventId:'A',
     dose:{amount:4000,unit:'ml'}}]};
 assert.equal(confirmedRespiratoryAdverse(ugly,cirr).adverseCount,1);
 const report=createClosureDebrief(ugly,cirr,quality(1,1));
 assert.equal(report.score,93);
 assert.deepEqual(report.deductions.map(x=>x.points),[-2,-5]);
 assert(report.unnecessary.some(x=>x.includes('Sobrecarga')));
 assert(report.unnecessary.some(x=>x.includes('estudios')));
 const markup=caseDebriefHTML({destination:'sala',xp:122,quality:quality(1,1),debrief:report});
 for(const phrase of ['Sumaste puntos','Te descontaron','Te faltó','No debías hacer',
  'Estudios innecesarios','Sobrecarga IV','+122 XP'])
  assert(markup.includes(phrase),phrase);
 assert(!/script>/.test(markup));
});
test('scorecard reports unearned optional points separately from clinical closure barriers',()=>{
 const q={...quality(),history:4,studies:7,score:81};
 const result=createClosureDebrief({uid:'P',administrationLog:[],liveVitals:{}},cirr,q);
 assert.equal(result.score,81);
 assert.equal(result.deductions.length,0);
 assert(result.missing.some(x=>x.includes('anamnesis')));
 assert(result.missing.some(x=>x.includes('estudios')));
});
test('real 4L harmful fluid contributes adverse penalty to compatible clinical policy snapshots',async()=>{
 const s=createGuardSession({roomId:'score-harm',mode:'solo',actorId:'doc',actorName:'Doctor',
  patient:{uid:'P',caseId:'CIRR-001'},content,resolveContext:()=>({patientUid:'P'})});
 let i=0;const send=text=>s.post({id:'m'+(++i),text});
 try{
  await send('Enfermera una vía');
  await send('Enfermera Ringer 4 litros');
  s.advance(.81);await s.flush();s.advance(55);await s.flush();
  const state=s.read();
  assert.equal(state.exposure.confirmedCrystalloidMl,4000);
  assert.equal(confirmedRespiratoryAdverse(state.patient,cirr).adverseCount,1);
  assert.equal(state.closure.quality.penalty>=5,true);
  assert.equal(state.closure.quality.score<100,true);
 }finally{s.dispose();}
});

test('case feedback names actual omitted requirements in three short lines or fewer',async()=>{
 const s=createGuardSession({roomId:'debrief-specific',mode:'solo',actorId:'doc',actorName:'Doc',
  patient:{uid:'P',caseId:'CIRR-001'},content,resolveContext:()=>({patientUid:'P'})});
 try{
  await s.post({id:'diagnosis',text:'/diagnostico cirrosis'});
  await s.post({id:'closure',text:'/cierre-parcial observacion'});
  const d=s.read().patient.closure.debrief;
  assert(d.missing.length>0&&d.missing.length<=3);
  assert(d.missing.some(x=>/Espironolactona|Restricción de sodio|Hepatograma|Ecografía|distensión abdominal/i.test(x)));
  assert(!d.missing.some(x=>/Completar los estudios pertinentes|Completar las intervenciones recomendadas/.test(x)));
 }finally{s.dispose();}
});
