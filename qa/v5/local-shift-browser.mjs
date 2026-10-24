import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness(),errors=[];
try{
 const results=[];
 for(const mode of ['solo','apprentice']){
  const ctx=await h.browser.newContext(h.devices['Pixel 5']);
  try{
   const p=await ctx.newPage();p.setDefaultTimeout(20000);
   p.on('pageerror',e=>errors.push({mode,message:e.message}));
   await p.goto(h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
   await p.locator('#playerName').fill('Guardia '+mode);await p.locator('#enterButton').click();
   await p.locator('#guardButton').click();
   await p.locator('[data-mode="'+mode+'"]').click();
   await p.locator('#caseChoice').selectOption('PERI-TER-001');
   await p.locator('[data-action="start-guard"]').click();
   await p.waitForFunction(expected=>atriaV5.snapshot().mode===expected,mode);
   const state=await p.evaluate(()=>atriaV5.snapshot());
   assert.equal(!!state.expert,mode==='apprentice','Dr. Vega belongs to apprentice mode only');
   assert.equal(state.patients.length,1,'the first arrival must be at the initial bed');
   await p.locator('#receptionButton').click();
   assert.equal(await p.locator('.reception-patient').count(),1);
   const triage=await p.locator('.reception-patient').first().getAttribute('data-acuity');
   assert(['critical','urgent','warning','stable'].includes(triage));
   assert.match(await p.locator('#modalContent').innerText(),/24 min reales/);
   results.push({mode,triage,mentor:!!state.expert,firstPatient:true});
  }finally{await ctx.close();}
 }
 assert.deepEqual(errors,[]);
 console.log('LOCAL CONTINUOUS SHIFT BROWSER PASS',JSON.stringify({results,errors}));
}finally{await h.close();}
