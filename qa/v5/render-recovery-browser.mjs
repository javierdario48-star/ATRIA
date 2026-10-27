import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';

const out=process.env.V5_RENDER_QA_OUTPUT||'qa/v5-render-recovery-results';
const soakMs=Number(process.env.V5_RENDER_SOAK_MS||28000);
await fs.mkdir(out,{recursive:true});
const h=await browserHarness(),checks=[];
const errors=[],consoleErrors=[];
let page,context,nativeContextEvents=[];
const pixels=()=>page.evaluate(()=>{
 const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
 const bytes=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 let sampled=0,opaque=0;const colors=new Set();
 for(let i=0;i<bytes.length;i+=256){sampled++;if(bytes[i+3]>0)opaque++;
  if(bytes[i+3])colors.add((bytes[i]>>4)+','+(bytes[i+1]>>4)+','+(bytes[i+2]>>4));}
 return {width:canvas.width,height:canvas.height,opaque:opaque/Math.max(1,sampled),colors:colors.size};
});
const identity=s=>({phase:s.phase,generation:s.generation,uid:s.clinical.patient.uid,
 roomId:s.clinical.room.roomId,caseId:s.caseId,patientUids:s.patients.map(p=>p.uid),
 x:s.player.x,y:s.player.y});
async function healthy(label){
 const bitmap=await pixels(),diagnostics=await page.evaluate(()=>atriaV5.diagnostics());
 assert(bitmap.width>0&&bitmap.height>0,label+': usable backing dimensions');
 assert(bitmap.opaque>.95,label+': the hospital map must actually paint the canvas: '+JSON.stringify(bitmap));
 assert(bitmap.colors>30,label+': original hospital/sprite artwork must have varied pixels: '+JSON.stringify(bitmap));
 assert.equal(diagnostics.raf,1,label+': exactly one game RAF remains active');
 checks.push({label,bitmap,frames:diagnostics.frames,renderer:diagnostics.renderer});
}
try{
 context=await h.browser.newContext(h.devices['Pixel 5']);page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 await page.addInitScript(()=>localStorage.setItem('atria.v5.profile.v1',
  JSON.stringify({name:'Render QA',scrubColor:'burgundy',sex:'female'})));
 await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#enterButton').click();await page.locator('#guardButton').click();
 await page.locator('[data-mode="solo"]').click();await page.locator('input[name="guardScope"][value="specific"]').check();await page.locator('#caseChoice').selectOption('CIRR-001');
 await page.locator('[data-action="start-guard"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
 const guardStarted=Date.now();
 if(!await page.evaluate(()=>atriaV5.diagnostics().keyboard.open))await page.locator('#keyboardToggleButton').click();
 await page.locator('#dieInput').fill('Borrador clínico que debe conservarse');
 // Crash Chromium's real GPU process before getImageData readbacks can move
 // Canvas2D to software. These must be native, trusted browser loss events.
 await page.evaluate(()=>{
  window.nativeContextEvents=[];
  for(const name of ['contextlost','contextrestored'])document.getElementById('game').addEventListener(name,
   event=>window.nativeContextEvents.push({name,trusted:event.isTrusted}));
 });
 const cdp=await h.browser.newBrowserCDPSession();await cdp.send('Browser.crashGpuProcess');
 await page.waitForFunction(()=>window.nativeContextEvents.some(e=>e.name==='contextlost'&&e.trusted)&&
  window.nativeContextEvents.some(e=>e.name==='contextrestored'&&e.trusted));
 nativeContextEvents=await page.evaluate(()=>window.nativeContextEvents);
 await page.waitForTimeout(100);await healthy('native GPU Canvas2D loss restored');
 await healthy('solo with ATRIA keyboard');
 // Exercise the original report's time boundary with real animation frames.
 await page.waitForTimeout(Math.max(0,soakMs-(Date.now()-guardStarted)));
 await healthy('solo after '+soakMs/1000+' seconds');
 const before=await page.evaluate(()=>atriaV5.snapshot());
 const beforeRenderer=await page.evaluate(()=>atriaV5.diagnostics().renderer);
 await page.screenshot({path:out+'/android-before-fault.png'});
 // A real drawImage exception after clearRect reproduces the reported split:
 // DOM controls survive while the world bitmap and RAF disappear.
 await page.evaluate(()=>{
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),draw=ctx.drawImage;
  window.renderFaultInjected=false;
  ctx.drawImage=function(...args){ctx.drawImage=draw;
   window.renderFaultInjected=true;
   throw new DOMException('Injected one-frame Canvas2D draw failure','InvalidStateError');};
 });
 await page.waitForFunction(()=>window.renderFaultInjected);
 const stalledAt=await page.evaluate(()=>atriaV5.diagnostics().frames);
 await page.waitForTimeout(200);
 const afterFault=await page.evaluate(()=>({s:atriaV5.snapshot(),d:atriaV5.diagnostics()}));
 await page.screenshot({path:out+'/android-after-draw-fault.png'});
 assert(afterFault.d.frames>stalledAt,'one transient Canvas2D error must not permanently kill the application RAF');
 await healthy('recovered one-frame draw exception');
 assert.deepEqual(identity(afterFault.s),identity(before),'render recovery must preserve clinical room/patient identity and world pose');
 assert.deepEqual(afterFault.d.renderer.camera,beforeRenderer.camera,'render recovery keeps the same camera');
 assert.equal(await page.locator('#dieInput').inputValue(),'Borrador clínico que debe conservarse');
 assert(afterFault.s.clinical.clock.clinicalMinute>=before.clinical.clock.clinicalMinute,'clinical time cannot rewind');
 // Actual viewport changes occur while the input is focused. Returning to
 // portrait must recover dimensions without a new clinical session.
 await page.setViewportSize({width:851,height:393});await page.waitForTimeout(250);
 await healthy('focused landscape');
 await page.setViewportSize({width:393,height:851});await page.waitForTimeout(250);
 await healthy('focused portrait restored');
 assert.deepEqual(identity(await page.evaluate(()=>atriaV5.snapshot())),identity(before));
 // Native context-loss delivery is browser/GPU dependent. A synthetic event
 // around an actual cleared bitmap deterministically verifies our handlers.
 await page.evaluate(()=>{
  const canvas=document.getElementById('game');canvas.getContext('2d').reset();
  canvas.dispatchEvent(new Event('contextlost',{cancelable:true}));
 });
 await page.waitForTimeout(80);
 const lost=await page.evaluate(()=>atriaV5.diagnostics());
 assert.equal(lost.renderer.contextLost,true,'renderer records context-loss without stopping the game loop');
 await page.evaluate(()=>document.getElementById('game').dispatchEvent(new Event('contextrestored')));
 await page.waitForTimeout(100);await healthy('canvas context restored');
 assert.deepEqual(identity(await page.evaluate(()=>atriaV5.snapshot())),identity(before));
 // Missed resize notifications and externally discarded backing storage heal
 // from the next frame, using the original map/images and current world.
 await page.evaluate(()=>{const canvas=document.getElementById('game');canvas.width=0;canvas.height=0;});
 await page.waitForTimeout(100);await healthy('backing store rebuilt');
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
 assert.equal((await page.evaluate(()=>atriaV5.diagnostics())).raf,0);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await page.waitForTimeout(100);await healthy('BFCache page restored');
 // A throwing periodic DOM update used to stop animation as well. It remains
 // diagnosable while the current hospital scene continues to paint.
 await page.evaluate(()=>{
  const get=document.getElementById;window.hudFaultInjected=false;
  document.getElementById=function(id){
   if(id==='guardTimeNow'){document.getElementById=get;window.hudFaultInjected=true;
    throw Error('Injected one-frame HUD update failure');}
   return get.call(this,id);
  };
 });
 await page.waitForFunction(()=>window.hudFaultInjected);await page.waitForTimeout(100);
 await healthy('recovered HUD update exception');
 // Reach the actual bedside and request a native study. Recovery must retain
 // that command and pending clinical work, not merely recreate a fresh guard.
 await page.locator('#dieInput').blur();
 if(await page.evaluate(()=>atriaV5.diagnostics().keyboard.open))await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
 for(const [x,y] of [[496,1060],[496,800],[400,580],[250,470],[144,420]]){
  const r=await page.evaluate(()=>atriaV5.diagnostics().renderer);
  const px=(x-r.camera.x)*r.scale+r.anchorX,py=(y-r.camera.y)*r.scale+r.anchorY;
  assert(px>=0&&px<r.width&&py>65&&py<r.height-60,'bedside waypoint must be exposed on the real canvas');
  await page.locator('#game').click({position:{x:px,y:py}});
  await page.waitForFunction(()=>atriaV5.snapshot().player.moving);
  await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
 }
 await page.locator('#dieInput').fill('Enfermera hemograma');await page.locator('#chatForm [type="submit"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.orders.length===1);
 const pending=await page.evaluate(()=>atriaV5.snapshot());
 assert.equal(pending.clinical.patient.orders[0].status,'pending');
 await page.locator('#dieInput').fill('Borrador clínico conservado con estudio pendiente');
 await page.evaluate(()=>{
  const ctx=document.getElementById('game').getContext('2d'),draw=ctx.drawImage;
  window.repeatedDrawFaults=0;
  ctx.drawImage=function(...args){
   if(window.repeatedDrawFaults++<2)throw new DOMException('Injected pending-study draw failure','InvalidStateError');
   ctx.drawImage=draw;return draw.apply(this,args);
  };
 });
 await page.waitForFunction(()=>window.repeatedDrawFaults>=3);await page.waitForTimeout(100);
 await healthy('pending native study survives repeated render errors');
 const retained=await page.evaluate(()=>atriaV5.snapshot());
 assert.deepEqual(identity(retained),identity(pending));
 assert.equal(retained.clinical.patient.orders.length,1,'render recovery cannot request a duplicate study');
 assert.equal(retained.clinical.patient.orders[0].id,pending.clinical.patient.orders[0].id);
 assert.deepEqual(retained.clinical.room.transcript,pending.clinical.room.transcript,'confirmed command history survives canvas rebuild');
 assert(retained.clinical.room.events.length>=pending.clinical.room.events.length);
 assert.equal(await page.locator('#dieInput').inputValue(),'Borrador clínico conservado con estudio pendiente');
 if(!await page.evaluate(()=>atriaV5.diagnostics().keyboard.open))await page.locator('#keyboardToggleButton').click();
 await page.waitForTimeout(150);await healthy('bedside map and avatar visible behind clinical keyboard');
 await page.screenshot({path:out+'/android-recovered.png'});
 assert.deepEqual(errors,[],'injected render failure is handled, no uncaught browser errors');
 assert.equal(consoleErrors.filter(line=>line.includes('Injected one-frame Canvas2D draw failure')).length,1,
  'the caught render failure remains visible in diagnostics/console');
 await page.evaluate(()=>atriaV5.destroy());
 const destroyed=await page.evaluate(()=>atriaV5.diagnostics());
 assert.equal(destroyed.raf,0);assert.equal(destroyed.listeners,0);
 await fs.writeFile(out+'/summary.json',JSON.stringify({checks,errors,consoleErrors,
  physicalAndroid:false,mobileChromium:true,browserVersion:h.browser.version(),soakMs,
  contextLoss:{nativeGpuCrash:true,trustedEvents:nativeContextEvents,syntheticRestoration:true}},null,2));
 console.log('V5 RENDER RECOVERY PASS',JSON.stringify({checks:checks.map(x=>x.label),errors,physicalAndroid:false}));
}catch(error){
 await fs.writeFile(out+'/failure.json',JSON.stringify({message:error.message,checks,errors,consoleErrors,
  diagnostics:page?await page.evaluate(()=>window.atriaV5?.diagnostics()).catch(()=>null):null},null,2));
 throw error;
}finally{await context?.close();await h.close();}
