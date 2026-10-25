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
  // The artwork comparator expects the original center. Close the preview
  // keyboard for that specific control screenshot, then restore it for play.
  const opened=await page.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true';
  if(opened){await page.locator('#keyboardToggleButton').click();await page.waitForTimeout(1000);}
  await page.screenshot({path:out+'/'+name+'-lobby.png'});
  if(opened)await page.locator('#keyboardToggleButton').click();
  const initial=await page.evaluate(()=>({s:atriaV5.snapshot(),d:atriaV5.diagnostics(),r:resourceMetrics()}));
  assert.equal(initial.d.renderer.images,22,'13 canonical images + 1 wardrobe atlas + 8 decoded avatar frames');assert.equal(initial.d.raf,1);assert.equal(initial.r.timers,0);
  // Mobile keyboard covers different parts of the canvas. Test actual
  // reachable taps relative to the avatar rather than fixed world pixels.
  const canvas=page.locator('#game'),box=await canvas.boundingBox();
  // The movement test owns the unobscured viewport. Keyboard layout is
  // verified separately; close it regardless of the available screen height.
  if(await page.evaluate(()=>atriaV5.diagnostics().keyboard.open))
   await page.locator('#keyboardToggleButton').click();
  await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
  const startPoint=(await page.evaluate(()=>atriaV5.snapshot())).player;
  let walked=false;
  for(const [dx,dy] of [[0,-55],[0,-75],[0,-42],[0,120],[120,0],[-120,0],[0,-120],[80,80],[-80,80]]){
   const camera=await page.evaluate(()=>atriaV5.diagnostics().renderer);
   const x=(startPoint.x+dx-camera.camera.x)*camera.scale+camera.anchorX;
   const y=(startPoint.y+dy-camera.camera.y)*camera.scale+camera.anchorY;
   const hud=await page.locator('#hud').boundingBox(),dock=await page.locator('#chatDock').boundingBox();
   if(x<12||x>box.width-12||y<hud.y+hud.height-box.y+6||y>dock.y-box.y-6)continue;
   // A legitimate nearby avatar can open its person card. Dismiss it
   // and test the next navigable tile instead of blocking the canvas.
   await canvas.click({position:{x,y}});
   if(await page.locator('#modal').evaluate(el=>el.open)){
    await page.locator('#modalClose').click();
    continue;
   }
   try{
    await page.waitForFunction(p=>Math.hypot(
     atriaV5.snapshot().player.x-p.x,atriaV5.snapshot().player.y-p.y)>30,
     {x:startPoint.x,y:startPoint.y},{timeout:2600});
    walked=true;break;
   }catch{/* Try the next genuinely exposed reachable touch target. */}
  }
  assert(walked,'an exposed lobby touch must move the avatar more than 30 pixels: '+
   JSON.stringify(await page.evaluate(()=>({player:atriaV5.snapshot().player,
    renderer:atriaV5.diagnostics().renderer,toast:document.getElementById('toast')?.textContent}))));
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
