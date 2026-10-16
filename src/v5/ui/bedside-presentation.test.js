import test from 'node:test';
import assert from 'node:assert/strict';
import {monitorHTML} from './clinical-panels.js';
import {PATIENT_ACTIONS} from './patient-actions.js';

const base=()=>({uid:'P1',lastVitalsKnown:null,procedures:{},caseEnded:false});

test('C05.c unmeasured patient has no revealed physiological numbers or fake ECG',()=>{
 const html=monitorHTML(base());
 assert.match(html,/Monitor desconectado/);
 assert.match(html,/SIN TRAZADO CONTINUO/);
 assert.match(html,/SIN DATOS ELECTROCARDIOGRÁFICOS/);
 for(const value of ['108/68','94','96','37.2'])assert(!html.includes('>'+value+'<'));
 assert(!html.includes('<svg'),'no fake signal for unmeasured patient');
});
test('C05.c spot measurement remains visible but does not imply a continuous bedside signal',()=>{
 const p=base();
 p.lastVitalsKnown={vitals:{sys:108,dia:68,hr:94,rr:20,spo2:96,temp:37.2}};
 const html=monitorHTML(p);
 assert.match(html,/108\/68/);assert.match(html,/94/);assert.match(html,/96/);
 assert.match(html,/37\.2/);assert.match(html,/Monitor desconectado/);
 assert(!html.includes('<svg'),'measured is not the same as connected');
});
test('C05.c connected monitor uses only known readings and labels pulse trace non-diagnostic',()=>{
 const p=base();p.procedures.monitor={connected:true};
 assert.match(monitorHTML(p),/Monitorización continua/);
 assert(!monitorHTML(p).includes('<svg'),'connected does not invent measurements');
 p.lastVitalsKnown={vitals:{sys:110,dia:70,hr:90,rr:19,spo2:97,temp:37.1}};
 const html=monitorHTML(p);
 assert(html.includes('<svg'));assert.match(html,/NO ECG/);assert.match(html,/no es un registro diagnóstico|NO ECG DIAGNÓSTICO/i);
 p.caseEnded=true;
 assert(!monitorHTML(p).includes('<svg'),'completed care cannot show continuous monitor activity');
 assert.match(monitorHTML(p),/Atención cerrada/);
});
test('C05.c patient actions map only to the six existing clinical destinations',()=>{
 assert.deepEqual(PATIENT_ACTIONS.map(a=>a.id),['talk','examination','history','studies','treatment','patient']);
 assert.equal(new Set(PATIENT_ACTIONS.map(a=>a.id)).size,PATIENT_ACTIONS.length);
});

test('C05.d autocomplete never authorizes an order, filters by the active case and accepts accents',async()=>{
 const {monitorOrderExamples}=await import('./monitor-order-suggestions.js');
 assert.deepEqual(monitorOrderExamples('APP-001'),[],'no unsolicited prescriptions before search or hint');
 const app=monitorOrderExamples('APP-001','ceftr');
 assert.equal(app.length,1);assert.equal(app[0].command,'ceftriaxona 1 g');
 assert.equal(monitorOrderExamples('CIRR-001','ceftr').length,0,'must not offer foreign-case antibiotic');
 const cirr=monitorOrderExamples('CIRR-001','restricción');
 assert.deepEqual(cirr.map(x=>x.command),['restricción de sodio']);
 assert.equal(monitorOrderExamples('APP-001','rInGeR')[0].command,'Ringer 500 ml');
 assert(monitorOrderExamples('APP-001','',{hint:true}).length>0);
 assert.equal(monitorOrderExamples('UNKNOWN','',{hint:true}).length,0);
});
test('C05.d native APP crystalloid response changes measured rate and the displayed ECG period',async()=>{
 const {initialAppVitals,advanceAppVitals}=await import('../clinical/native-app.js');
 const {ecgPresentation,ecgPath}=await import('../clinical/ecg-morphology.js');
 const c={id:'APP-001',vitals:{bp:'118/72',temp:38.1,hr:108,rr:20,spo2:98}};
 const p={liveVitals:initialAppVitals(c),treatments:[],procedures:{monitor:{connected:true}},caseEnded:false};
 p.lastVitalsKnown={vitals:{...p.liveVitals}};
 const first=ecgPresentation(p);
 assert.equal(first.hr,108);
 const before=ecgPath({seconds:5,hr:first.hr,rhythm:first.rhythm});
 p.treatments.push({id:'fluid',patientUid:'P1',administeredAtRealSecond:0});
 advanceAppVitals(p,c,20);
 // refreshMonitoring is the sole producer of actual monitored measurements;
 // only once it refreshes may the UI display the new rate.
 const {refreshMonitoring}=await import('../clinical/observations.js');
 p.uid='P1';refreshMonitoring(p,{nativeMinute:20});
 const next=ecgPresentation(p);
 assert(next.hr<first.hr);assert(next.hr>95);
 assert.notEqual(ecgPath({seconds:5,hr:next.hr,rhythm:next.rhythm}),before);
});
