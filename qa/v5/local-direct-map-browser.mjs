import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
import {walk,send} from './cooperative-ui.mjs';

// Bot uses actual Pixel taps and navigation. Read-only diagnostics supply the
// map projection, never patient assignments, movements or clinical writes.
const h=await browserHarness(),results=[],errors=[];
try{
 for(const mode of ['solo','apprentice']){
  const ctx=await h.browser.newContext(h.devices['Pixel 5']);
  try{
   const p=await ctx.newPage();p.setDefaultTimeout(80000);
   p.on('pageerror',e=>errors.push({mode,error:e.message}));
   await p.goto(h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
   await p.locator('#playerName').fill('Direct map QA '+mode);
   await p.locator('#enterButton').click();await p.locator('#guardButton').click();
   await p.locator('[data-mode="'+mode+'"]').click();
   await p.locator('#caseChoice').selectOption('CIRR-001');
   await p.locator('[data-action="start-guard"]').click();
   await p.waitForFunction(x=>atriaV5.snapshot().mode===x,mode);
   const uid=(await p.evaluate(()=>atriaV5.snapshot())).clinical.patient.uid;
   await p.waitForFunction(()=>document.querySelectorAll('.unassigned-patient-marker').length===1);
   if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')
    await p.locator('#keyboardToggleButton').click();
   await walk(p,144);
   const xy=await p.evaluate(()=>{
    const e=atriaV5.snapshot().entities.find(x=>x.kind==='patient');
    const r=atriaV5.diagnostics().renderer;
    return {x:(e.x-r.camera.x)*r.scale+r.anchorX,y:(e.y-r.camera.y)*r.scale+r.anchorY};
   });
   await p.locator('#game').click({position:xy});
   await p.locator('#patientWheel').waitFor({state:'visible'});
   assert.equal(await p.locator('#patientWheel').getAttribute('data-patient-uid'),uid);
   assert.equal(await p.locator('#patientWheel [data-patient-action="talk"]').evaluate(
    e=>e.classList.contains('patient-wheel-guided')),true);
   assert.equal(await p.locator('#bedsideChecklist').isVisible(),true);
   await p.locator('#patientWheel [data-patient-action="talk"]').click();
   await send(p,'¿Desde cuándo empezó la hinchazón?');
   await p.waitForFunction(()=>atriaV5.snapshot().clinical.messages.some(m=>m.role==='patient'));
   const state=(await p.evaluate(()=>atriaV5.snapshot())).clinical;
   assert.equal(state.patient.uid,uid);
   assert(state.patient.intentHistory.length>0);
   assert.equal(state.patient.administrationLog.length,0);
   assert.equal(state.progress.receipts.length,0);
   results.push({mode,caseId:'CIRR-001',realMapSelection:true,nativePatientResponse:true});
  }finally{await ctx.close();}
 }
 assert.deepEqual(errors,[]);
 assert.equal(results.length,2);
 console.log('ATRIA_LOCAL_DIRECT_MAP_BOTS='+JSON.stringify(results));
}finally{await h.close();}
