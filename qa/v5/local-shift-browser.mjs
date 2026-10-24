import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness(),errors=[];
try{
 const ctx=await h.browser.newContext(h.devices['Pixel 5']),p=await ctx.newPage();
 p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
 await p.locator('#playerName').fill('Guardia UI');await p.locator('#enterButton').click();
 await p.locator('#guardButton').click();await p.locator('#caseChoice').selectOption('PERI-TER-001');
 await p.locator('[data-action="start-guard"]').click();
 await p.waitForFunction(()=>atriaV5.snapshot().mode==='solo');
 await p.locator('#receptionButton').click();
 assert.equal(await p.locator('.reception-patient').count(),1);
 const triage=await p.locator('.reception-patient').first().getAttribute('data-acuity');
 assert(['critical','urgent','warning','stable'].includes(triage));
 assert.match(await p.locator('#modalContent').innerText(),/24 min reales/);
 assert.deepEqual(errors,[]);
 console.log('LOCAL CONTINUOUS SHIFT BROWSER PASS',JSON.stringify({triage,errors}));
}finally{await h.close();}
