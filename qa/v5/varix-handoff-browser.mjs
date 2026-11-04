import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
import {clinical,chooseDestination,send,study} from './cooperative-ui.mjs';
import {clickHudAction} from './hud-actions.mjs';

const h=await browserHarness();
try{
 const results=await Promise.all([
  ['desktop',{viewport:{width:1280,height:900}},'solo'],
  ['android',h.devices['Pixel 5'],'apprentice']
 ].map(async([device,options,mode])=>{
  const context=await h.browser.newContext(options);
  try{
   const p=await context.newPage(),errors=[];p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
   await p.goto(h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
   await p.locator('#playerName').fill('VARIX QA '+device);await p.locator('#enterButton').click();
   await p.locator('#guardButton').click();await p.locator('[data-mode="'+mode+'"]').click();
   await p.locator('input[name="guardScope"][value="specific"]').check();await p.locator('#caseChoice').selectOption('VARIX-001');
   await p.locator('[data-action="start-guard"]').click();
   await p.waitForFunction(()=>atriaV5.snapshot().clinical?.patient.caseId==='VARIX-001');
   if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await p.locator('#keyboardToggleButton').click();
   await p.locator('#receptionButton').click();
   const uid=(await clinical(p)).patient.uid;
   await p.locator('[data-action="reception-approach"][data-patient-uid="'+uid+'"]').click();
   await p.locator('#patientWheel').waitFor({state:'visible'});
   await p.locator('#patientWheel [data-patient-action="examination"]').click();
   for(const region of ['general','abdomen']){
    await p.locator('#examRegions [data-exam-region="'+region+'"]').click();
    await p.waitForFunction(region=>!!atriaV5.snapshot().clinical.patient.examFindings[region],region);
   }
   await p.locator('#modalClose').click();
   await send(p,'¿Qué antecedentes tiene?');
   await study(p,'g_varix_cbc');
   await clickHudAction(p,'peopleButton');
   await p.locator('#diagnosisInput').fill('HDA');await p.locator('[data-action="save-diagnosis"]').click();
   await p.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='HDA');
   await p.locator('#modalClose').click();
   await send(p,'Enfermera monitor y transfusion 1 unidad y ceftriaxona 1 g y terlipresina 2 mg');
   await p.waitForFunction(()=>{
    const p=atriaV5.snapshot().clinical.patient;
    return p.procedures.monitor?.connected&&p.orders.some(o=>o.id==='g_varix_cbc'&&o.status==='done')&&
     ['transfusion','ceftriaxone','terlipressin'].every(id=>p.treatments.some(t=>t.id===id));
   },null,{timeout:120000});
   const prepared=await clinical(p);
   assert.equal(prepared.patient.reassessments,0);
   assert.equal(prepared.patient.consults.length,0);
   await chooseDestination(p,'procedimiento');
   await p.waitForFunction(()=>atriaV5.snapshot().clinical.patient.caseEnded);
   const final=await clinical(p);
   assert.equal(final.patient.closure.destination,'procedimiento');
   assert.equal(final.patient.lastReassessment.source,'disposition');
   assert.equal(final.patient.lastVitalsKnown.source,'monitor');
   assert.deepEqual(final.patient.consults.map(x=>[x.id,x.accepted]),[['gastro',true]]);
   assert.deepEqual(final.patient.administrationLog.map(x=>x.sourceEventId),prepared.patient.administrationLog.map(x=>x.sourceEventId));
   assert.equal(final.progress.receipts.length,1);
   assert.deepEqual(errors,[]);
   return {device,mode,destination:'procedimiento',uniqueAdministrations:final.patient.administrationLog.length};
  }finally{await context.close();}
 }));
 console.log('VARIX PUBLIC HANDOFF PASS '+JSON.stringify(results));
}finally{await h.close();}
