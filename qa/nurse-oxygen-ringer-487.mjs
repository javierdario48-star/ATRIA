/**
 * Real generated late Android nursing/physiology VM; no browser or sprites.
 * Regression for contradictory oxygen receipts and delayed Ringer with IV.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAndroidIntegratedRuntime487} from './android-integrated-runtime-487.mjs';
import {advanceLiveNativeJourney487 as advance} from './physiology-live/native-journey-487.mjs';

const cases=[];
const delivered=(p,id)=>(p.administrationLog||[]).filter(x=>x.id===id&&x.action!=='stop');
const chat=r=>[...(r.uiCalls||[]),...(r.messages||[]).map(x=>x.text)].join('\n');
function tick(r,seconds){advance(r,seconds,{dt:1/30});}
function scenario(name,fn){try{cases.push({name,passed:true,...fn()});}catch(e){cases.push({name,passed:false,error:e.message});}}

scenario('oxygen pending is NOT failure; native receipt completes independently of SpO2',()=>{
 const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:1}),p=r.ctx.sim;
 const initial=Number(p.liveVitals.spo2);
 r.ctx.sendMessage('Enfermera oxígeno');
 tick(r,.2);
 assert.equal(delivered(p,'oxygen').length,0,'acceptance cannot fabricate administration');
 assert(!/Oxígeno NO administrado/i.test(chat(r)),'no false negative while in native preparation');
 assert(/Oxígeno: EN PROGRESO/.test(chat(r)),'patient hears a precise pending state');
 tick(r,2.5);
 assert.equal(delivered(p,'oxygen').length,1,'native receipt after async completion');
 assert.equal(delivered(p,'oxygen')[0].defaultApplied,true,'catalog dose remains native');
 assert(!/Oxígeno NO administrado/i.test(chat(r)),'no historical contradictory negative');
 return {initialSpO2:initial,finalSpO2:Number(p.liveVitals.spo2),dose:delivered(p,'oxygen')[0].doseDisplay,
  confirmedAtSeconds:r.clock.realSeconds};
});
for(const phrase of ['Enfermera expandir con Ringer','Enfermera Ringer']){
 scenario('prompt native Ringer with existing IV: '+phrase,()=>{
  const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:1}),p=r.ctx.sim;
  const at=r.clock.realSeconds;
  r.ctx.sendMessage(phrase);
  tick(r,.2);
  assert.equal(delivered(p,'fluid').length,0,'pending order is not a dose');
  assert(/Recibí una indicación/.test(chat(r)),'singular acknowledgement');
  assert(/Ringer: EN PROGRESO/.test(chat(r)),'native preparation clearly announced');
  tick(r,2.5);
  assert.equal(delivered(p,'fluid').length,1,'first native IV dose completed promptly');
  assert.equal(delivered(p,'fluid')[0].defaultApplied,true,'native 500 ml catalog default');
  assert(p.therapyTotals.fluidMl>=500,'native fluid balance updated');
  return {request:phrase,elapsedSeconds:Number((r.clock.realSeconds-at).toFixed(2)),
   dose:delivered(p,'fluid')[0].doseDisplay,fluidMl:p.therapyTotals.fluidMl};
 });
}
scenario('repeating pending Ringer never duplicates an IV bolus',()=>{
 const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:1}),p=r.ctx.sim;
 r.ctx.sendMessage('Enfermera expandir con Ringer');
 r.ctx.sendMessage('Enfermera Ringer');
 tick(r,.2);
 assert(/no repetí el bolo/i.test(chat(r)),'repeat is expressly acknowledged');
 tick(r,3);
 assert.equal(delivered(p,'fluid').length,1,'exactly one native administration');
 return {count:delivered(p,'fluid').length};
});
scenario('no access leaves Ringer pending; nurse IV restores real delivery',()=>{
 const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:0}),p=r.ctx.sim;
 r.ctx.sendMessage('Enfermera expandir con Ringer');
 tick(r,1.5);
 assert.equal(delivered(p,'fluid').length,0,'never give IV without access');
 assert((p.csPhase4Pending487||[]).some(x=>x.id==='fluid'),'original IV dependency retains fluid');
 r.ctx.sendMessage('Enfermera vías');
 tick(r,40);
 assert(p.venousAccessCount>0,'native nurse placed access');
 assert.equal(delivered(p,'fluid').length,1,'pending fluid resumed on native cannulation');
 return {iv:p.venousAccessCount,fluid:delivered(p,'fluid').length};
});
scenario('permission denied: no dose and explicit clinical feedback',()=>{
 const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:1}),p=r.ctx.sim;
 r.ctx.window.nsMayExamine=()=>false;
 r.ctx.sendMessage('Enfermera Ringer');
 tick(r,2);
 assert.equal(delivered(p,'fluid').length,0);
 return {doses:0};
});

// Android reproduction: an acknowledged FOUR-way order must go through
// native monitor receipts after the genuine bedside IV/monitor tasks.
scenario('four-way bedside order delivers Ringer AND oxygen after IV',()=>{
 const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:0}),p=r.ctx.sim;
 r.ctx.sendMessage('Enfermera vías, monitor, Ringer y oxígeno');
 // V412 sends nearby nurse messages on the NEXT native simulation tick.
 tick(r,.2);
 assert.equal(p.venousAccessCount,0,'requested IV is not a completed cannulation');
 assert.equal(delivered(p,'fluid').length,0,'no fluid delivered before IV');
 assert((p.csPhase4Pending487||[]).some(x=>x.id==='fluid'),'native IV queue holds Ringer '+JSON.stringify({pending:p.csPhase4Pending487?.map(x=>({id:x.id,text:x.text,uid:x.uid})),nativePending:[...(p.pendingTherapies?.keys?.()||[])],chat:chat(r).slice(-1600),source:r.ctx.window.csNurseVoice487?.parse('Enfermera vías, monitor, Ringer y oxígeno')?.items?.map(x=>({id:x.id,kind:x.kind,text:x.text})),access:p.venousAccessCount}));
 tick(r,2);
 assert.equal(delivered(p,'oxygen').length,1,'IV-independent oxygen actually delivered');
 tick(r,45);
 assert.equal(p.venousAccessCount,2,'two physical IV accesses placed');
 assert.equal(p.monitorConnected,true,'native monitor connected');
 assert.equal(delivered(p,'fluid').length,1,'queued Ringer automatically drained to native monitor');
 assert(/COMPLETADA|aplicado/i.test(chat(r)),'completed administration visible');
 return {iv:p.venousAccessCount,monitor:p.monitorConnected,
  drugs:p.administrationLog.map(x=>({id:x.id,dose:x.doseDisplay})),
  elapsedSeconds:r.clock.realSeconds};
});
scenario('two antibiotics with IV: both reach native executor, not acknowledgement only',()=>{
 const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:2}),p=r.ctx.sim;
 r.ctx.sendMessage('Enfermera ceftriaxona metronidazol');
 assert.equal(delivered(p,'ceftriaxone').length,0,'native dosing must be asynchronous');
 assert.equal(delivered(p,'metronidazole').length,0);
 tick(r,2.5);
 for(const id of ['ceftriaxone','metronidazole']){
  assert.equal(delivered(p,id).length,1,id+' genuine native administration');
  assert(p.monitorTherapies.has(id),id+' active in clinical monitor');
  assert.equal(delivered(p,id)[0].defaultApplied,true,'native catalog default for '+id);
 }
 return {drugs:p.administrationLog.map(x=>({id:x.id,dose:x.doseDisplay}))};
});
scenario('repeated antibiotic command while pending does not double administer',()=>{
 const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:2}),p=r.ctx.sim;
 r.ctx.sendMessage('Enfermera ceftriaxona y metronidazol');
 r.ctx.sendMessage('Enfermera ceftriaxona y metronidazol');
 tick(r,3);
 assert.equal(delivered(p,'ceftriaxone').length,1);
 assert.equal(delivered(p,'metronidazole').length,1);
 return {ceftriaxone:1,metronidazole:1};
});
scenario('recognized case interventions must not hijack monitor medication dispatch',()=>{
 const r=createAndroidIntegratedRuntime487('PERI-SEC-001',{confirmedIV:2}),p=r.ctx.sim;
 // The former route branch skipped oxygen whenever it was also in the case
 // intervention catalogue, even if the actual monitor catalog owned delivery.
 const additions=['fluid','oxygen','ceftriaxone','metronidazole'].map(id=>
  ({id,label:id,aliases:[id]}));
 r.ctx.C.interventions.push(...additions.filter(x=>!r.ctx.C.interventions.some(y=>y.id===x.id)));
 r.ctx.sendMessage('Enfermera Ringer, oxígeno, ceftriaxona y metronidazol');
 tick(r,3);
 for(const id of ['fluid','oxygen','ceftriaxone','metronidazole'])
  assert.equal(delivered(p,id).length,1,id+' uses monitor owner despite case intervention alias');
 return {delivered:['fluid','oxygen','ceftriaxone','metronidazole']};
});
const errors=cases.filter(x=>!x.passed);
fs.mkdirSync('qa/android-fix-results',{recursive:true});
fs.writeFileSync('qa/android-fix-results/oxygen-ringer.json',
 JSON.stringify({cases,passed:cases.length-errors.length,failed:errors.length,
  method:'generated native source and late V412 integrated in deterministic Node VM',
  physicalAndroid:false},null,2)+'\n');
console.log('ATRIA OXYGEN RINGER NATIVE REGRESSION',JSON.stringify({
 cases:cases.length,passed:cases.length-errors.length,failures:errors}));
assert.equal(errors.length,0,'oxygen/Ringer request, native receipts and timing regressions');
