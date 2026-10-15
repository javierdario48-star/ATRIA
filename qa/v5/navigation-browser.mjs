import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';

const out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';await fs.mkdir(out,{recursive:true});
const h=await browserHarness(),results=[];
try{
 for(const name of ['desktop','android-emulated','landscape']){
  const options=name==='android-emulated'?h.devices['Pixel 5']:{viewport:name==='desktop'?{width:1024,height:768}:{width:844,height:390},hasTouch:name==='landscape'};
  const context=await h.browser.newContext(options),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('atria.v5.profile.v1',JSON.stringify({name:'Javier',scrubColor:'navy'}));
   const metrics={listeners:0,timers:0},add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
   EventTarget.prototype.addEventListener=function(...args){metrics.listeners++;return add.apply(this,args);};
   EventTarget.prototype.removeEventListener=function(...args){metrics.listeners--;return remove.apply(this,args);};
   const interval=window.setInterval,clear=window.clearInterval;
   window.setInterval=function(...args){metrics.timers++;return interval.apply(this,args);};
   window.clearInterval=function(...args){metrics.timers--;return clear.apply(this,args);};
   window.resourceMetrics=()=>({...metrics});
  });
  await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  assert.equal(await page.locator('#fatal').isVisible(),false);
  await page.screenshot({path:out+'/'+name+'-title.png'});
  await page.locator('#enterButton').click();
  assert.equal((await page.evaluate(()=>atriaV5.snapshot())).phase,'lobby');
  await page.screenshot({path:out+'/'+name+'-lobby.png'});
  const initial=await page.evaluate(()=>({s:atriaV5.snapshot(),d:atriaV5.diagnostics(),r:resourceMetrics()}));
  assert.equal(initial.d.renderer.images,13);assert.equal(initial.d.raf,1);assert.equal(initial.r.timers,0);
  // Real canvas pointer events, not direct world mutations.
  const canvas=page.locator('#game'),box=await canvas.boundingBox();
  await canvas.click({position:{x:box.width/2,y:box.height/2-100}});
  await page.waitForFunction(()=>atriaV5.snapshot().player.moving);
  await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
  const moved=await page.evaluate(()=>atriaV5.snapshot().player);
  assert(Math.hypot(moved.x-initial.s.player.x,moved.y-initial.s.player.y)>30);
  await page.locator('#dieInput').fill('Hola antes de hablar con cualquier NPC');await page.locator('#chatForm [type="submit"]').click();
  assert(await page.locator('#chatHistory').innerText().then(x=>x.includes('Hola antes de hablar')));
  for(let round=0;round<5;round++){
   await page.locator('#guardButton').click();
   await page.locator('[data-mode="'+(round%2?'apprentice':'solo')+'"]').click();
   await page.locator('#caseChoice').selectOption('CIRR-001');await page.locator('[data-action="start-guard"]').click();
   const guard=await page.evaluate(()=>atriaV5.snapshot());
   assert.equal(guard.phase,'guard');assert.equal(guard.patients.length,1);assert.equal(guard.nurses.length,6);
   assert.equal(!!guard.expert,round%2===1);
   if(round===0)await page.screenshot({path:out+'/'+name+'-guard.png'});
   await page.locator('#guardButton').click();
   const after=await page.evaluate(()=>({s:atriaV5.snapshot(),d:atriaV5.diagnostics(),r:resourceMetrics()}));
   assert.equal(after.s.phase,'lobby');assert.equal(after.d.listeners,initial.d.listeners);
   assert.equal(after.r.listeners,initial.r.listeners,'no accumulating listeners');assert.equal(after.r.timers,0);
   assert.equal(after.d.raf,1);assert.equal(after.s.nurses.length,0);assert.equal(after.s.patients.length,0);
  }
  // Input is retained through selection and synthetic IME composition.
  await page.locator('#guardButton').click();await page.locator('[data-action="start-guard"]').click();
  const editor=page.locator('#dieInput');await editor.fill('hemograma');
  await editor.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'hemograma'})));
  await page.locator('#recipientButton').click();assert.equal(await editor.inputValue(),'hemograma');
  await editor.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'hemograma'})));
  assert.equal(await editor.inputValue(),'Enfermera, hemograma');
  assert(await editor.evaluate(el=>el===document.activeElement));
  const inputRect=await editor.boundingBox(),viewport=page.viewportSize();
  assert(inputRect.x>=0&&inputRect.y>=0&&inputRect.x+inputRect.width<=viewport.width+1&&inputRect.y+inputRect.height<=viewport.height+1);
  await page.locator('#historyButton').click();assert.equal(await page.locator('#historyButton').getAttribute('aria-expanded'),'true');
  const beforeDestroy=await page.evaluate(()=>resourceMetrics());
  await page.evaluate(()=>atriaV5.destroy());
  const disposed=await page.evaluate(()=>({d:atriaV5.diagnostics(),r:resourceMetrics()}));
  assert.equal(disposed.d.listeners,0);assert.equal(disposed.d.raf,0);assert.equal(disposed.d.timers,0);
  assert.equal(beforeDestroy.listeners-disposed.r.listeners,initial.d.listeners,'actual listeners removed at destroy');
  assert.deepEqual(errors,[]);results.push({name,boot:true,navigation:true,guardCycles:5,images:13,imeSynthetic:true,
   listenerCleanup:true,physicalAndroid:false,realClinicalSimulation:false,multiplayer:false});
  await context.close();
 }
 assert(!h.requests.some(r=>/vendor|integration|task\d+\.js/.test(r.path)),'no historical executable requests');
 assert(!h.requests.some(r=>r.status>=400),'all application resources loaded');
 await fs.writeFile(out+'/summary.json',JSON.stringify({results,requests:h.requests.length},null,2));
 console.log('V5 NAVIGATION BROWSER PASS',JSON.stringify(results));
}finally{await h.close();}
