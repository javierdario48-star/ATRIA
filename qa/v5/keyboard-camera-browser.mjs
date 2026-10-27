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
 await page.waitForFunction(()=>{
  const r=atriaV5.diagnostics().renderer,b=r.playableBounds;
  if(!b)return false;
  return Math.abs(r.anchorY-(b.top+(b.bottom-b.top)*.55))<2;
 },null,{timeout:15000});
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

 // Real UI regression: profile is presentation only, not a world reset.
 const spawn=await page.evaluate(()=>atriaV5.snapshot().player);
 const cameraBefore=await page.evaluate(()=>atriaV5.diagnostics().renderer);
 await page.locator('#game').click({position:{x:cameraBefore.anchorX,y:cameraBefore.anchorY-96}});
 await page.waitForFunction(p=>Math.hypot(atriaV5.snapshot().player.x-p.x,atriaV5.snapshot().player.y-p.y)>25,spawn);
 await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
 const located=await page.evaluate(()=>atriaV5.snapshot());
 await page.locator('#profileButton').click();
 await page.locator('#aliasChoice').fill('Dr. Torres');
 await page.locator('#colorChoice').selectOption('teal');
 await page.locator('[data-action="save-profile"]').click();
 const afterProfile=await page.evaluate(()=>atriaV5.snapshot());
 assert.equal(afterProfile.phase,located.phase);
 assert.equal(afterProfile.generation,located.generation,'profile must not start a new room');
 assert.equal(afterProfile.player.x,located.player.x,'scrub change cannot teleport x');
 assert.equal(afterProfile.player.y,located.player.y,'scrub change cannot teleport y');
 assert.equal(afterProfile.player.color,'teal');
 assert.equal(afterProfile.player.name,'Dr. Torres');
 assert(await page.locator('#chatHistory').innerText().then(s=>s.includes('hola')),'chat remains intact');
 assert.equal(await page.locator('#modal').evaluate(x=>x.open),false);
 await page.screenshot({path:out+'/atria-scrubs-preserve-location.png'});

 // A new message in the guard uses the same authority, never a second chat.
 await page.locator('#guardButton').click();await page.locator('input[name="guardScope"][value="specific"]').check();
 await page.locator('#caseChoice').selectOption('CIRR-001');await page.locator('[data-action="start-guard"]').click();
 for(const key of ['h','o','l','a'])await page.locator('#atriaKeyboard [data-key="'+key+'"]').click();
 await page.locator('#atriaKeyboard [data-key="send"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical?.room?.transcript?.some(x=>x.text==='hola'));
 assert.equal((await page.evaluate(()=>atriaV5.snapshot().clinical.room.transcript.filter(x=>x.text==='hola').length)),1);
 // Nurse shortcut and shared clinical autocomplete are presentation-only.
 const beforeCompletion=(await page.evaluate(()=>atriaV5.snapshot().clinical.room.transcript.length));
 await page.locator('#nurseQuickButton').click();
 assert.equal(await page.locator('#dieInput').inputValue(),'Enfermera, ');
 await page.locator('#dieInput').fill('Enfermera, ceftr');
 await page.locator('#chatSuggestions').waitFor({state:'visible'});
 const cef=page.locator('#chatSuggestions [data-assist-kind="order"]').filter({hasText:'Ceftriaxona'}).first();
 assert.equal(await cef.count(),1,'case-scoped nurse command suggestion is visible');
 await cef.click();
 assert.match(await page.locator('#dieInput').inputValue(),/^Enfermera, ceftriaxona/i);
 assert.equal(await page.evaluate(()=>atriaV5.snapshot().clinical.room.transcript.length),
  beforeCompletion,'choosing a suggestion does not send any medicine');
 await page.locator('#dieInput').fill('');
 await page.locator('#atriaKeyboard [data-key="nurse"]').click();
 assert.equal(await page.locator('#dieInput').inputValue(),'Enfermera, ');
 await page.locator('#dieInput').fill('qeu');
 await page.locator('#atriaKeyboard [data-key="space"]').click();
 assert.equal(await page.locator('#dieInput').inputValue(),'que ');
 await page.locator('#dieInput').fill('');
 // Actual touch taps, not mouse clicks: no duplicate letters and safe spelling.
 for(const letter of ['h','o','l','s'])await page.locator('#atriaKeyboard [data-key="'+letter+'"]').tap();
 assert.equal(await page.locator('#dieInput').inputValue(),'hols');
 await page.locator('#atriaKeyboard [data-key="space"]').tap();
 assert.equal(await page.locator('#dieInput').inputValue(),'hola ');
 await page.locator('#atriaKeyboard [data-key="backspace"]').tap();
 assert.equal(await page.locator('#dieInput').inputValue(),'hols',
  'backspace immediately after autocorrection restores the intended draft');
 await page.locator('#dieInput').fill('');

 // An unaccented real word remains untouched and can be accented with one tap.
 await page.locator('#dieInput').fill('paso');
 const accentOption=page.locator('#chatSuggestions [data-assist-kind="spelling"]').filter({hasText:'pasó'});
 await accentOption.waitFor();
 assert.equal(await page.locator('#dieInput').inputValue(),'paso');
 await accentOption.click();
 assert.equal(await page.locator('#dieInput').inputValue(),'pasó');
 await page.locator('#dieInput').fill('pas');
 const vowel=page.locator('#atriaKeyboard [data-key="o"]');
 await vowel.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{
  pointerType:'touch',pointerId:33,bubbles:true,cancelable:true,clientX:0,clientY:0
 })));
 await page.waitForTimeout(530);
 await vowel.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerup',{
  pointerType:'touch',pointerId:33,bubbles:true,cancelable:true,clientX:0,clientY:0
 })));
 assert.equal(await page.locator('#dieInput').inputValue(),'pasó',
  'long hold adds an accent without a second keyboard');
 await page.locator('#dieInput').fill('');
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
