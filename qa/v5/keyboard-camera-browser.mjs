import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';

// Visual interaction contract for a REAL Chromium Pixel 5 surface.
// Physical Android is still a separate acceptance check.
const out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';
await fs.mkdir(out,{recursive:true});
const h=await browserHarness();
try{
 const context=await h.browser.newContext(h.devices['Pixel 5']);
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(h.url);
 await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#enterButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds!==null);
 const metrics=await page.evaluate(()=>{
  const k=document.getElementById('atriaKeyboard').getBoundingClientRect();
  const r=atriaV5.diagnostics().renderer;
  return {height:k.height,viewport:window.innerHeight,rows:document.querySelectorAll('.atria-key-row').length,
   inputmode:document.getElementById('dieInput').getAttribute('inputmode'),
   anchorY:r.anchorY,playable:r.playableBounds,scale:r.scale,dpr:r.dpr,camera:r.camera};
 });
 assert.equal(metrics.rows,4,'exactly four rows');
 assert.equal(metrics.inputmode,'none','OS touch keyboard must not be requested');
 assert(metrics.height/metrics.viewport>=.18&&metrics.height/metrics.viewport<=.28,
  'portrait keyboard is approximately 22 percent of screen');
 assert(metrics.anchorY>metrics.playable.top&&metrics.anchorY<metrics.playable.bottom,
  'player is centered in the remaining map, not in the physical viewport');
 assert(metrics.anchorY<metrics.viewport*.48,'player is above the full-screen midpoint');
 assert(Math.abs(metrics.camera.x*metrics.scale*metrics.dpr-
   Math.round(metrics.camera.x*metrics.scale*metrics.dpr))<1e-6,'camera x snaps to physical pixels');
 assert(Math.abs(metrics.camera.y*metrics.scale*metrics.dpr-
   Math.round(metrics.camera.y*metrics.scale*metrics.dpr))<1e-6,'camera y snaps to physical pixels');

 for(const key of ['h','o','l','a'])await page.locator('#atriaKeyboard [data-key="'+key+'"]').click();
 assert.equal(await page.locator('#dieInput').inputValue(),'hola');
 await page.locator('#atriaKeyboard [data-key="backspace"]').click();
 assert.equal(await page.locator('#dieInput').inputValue(),'hol');
 await page.locator('#atriaKeyboard [data-key="a"]').click();
 await page.locator('#atriaKeyboard [data-key="send"]').click();
 await page.waitForFunction(()=>document.getElementById('chatHistory').textContent.includes('hola'));
 assert.equal(await page.locator('#dieInput').inputValue(),'');
 await page.screenshot({path:out+'/atria-keyboard-portrait.png'});

 // A new message in the guard uses the same authority, never a second chat.
 await page.locator('#guardButton').click();await page.locator('[data-action="start-guard"]').click();
 for(const key of ['h','o','l','a'])await page.locator('#atriaKeyboard [data-key="'+key+'"]').click();
 await page.locator('#atriaKeyboard [data-key="send"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical?.room?.transcript?.some(x=>x.text==='hola'));
 assert.equal((await page.evaluate(()=>atriaV5.snapshot().clinical.room.transcript.filter(x=>x.text==='hola').length)),1);

 // Toggle compares original camera and input mode; map is not scaled or cropped.
 await page.locator('#keyboardToggleButton').click();
 assert.equal(await page.locator('#dieInput').getAttribute('inputmode'),'text');
 await page.waitForFunction(()=>Math.abs(atriaV5.diagnostics().renderer.anchorY-innerHeight/2)<1.1);
 assert.equal(await page.evaluate(()=>atriaV5.diagnostics().renderer.playableBounds),null);
 await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds!==null);

 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(350);
 const landscape=await page.evaluate(()=>({keyboard:document.getElementById('atriaKeyboard').getBoundingClientRect().height,
  height:innerHeight,layout:atriaV5.diagnostics().renderer.playableBounds}));
 assert(landscape.keyboard/landscape.height<.40,'landscape keyboard must remain shallow');
 assert(landscape.layout?.bottom>landscape.layout?.top+100,'landscape preserves a playable area');
 await page.screenshot({path:out+'/atria-keyboard-landscape.png'});
 assert.deepEqual(errors,[],'no browser errors');
 console.log('ATRIA COMPACT KEYBOARD/CAMERA PASS',JSON.stringify({portrait:metrics,landscape,physicalAndroid:false}));
 await context.close();
}finally{await h.close();}
