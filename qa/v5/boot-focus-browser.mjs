import {clickHudAction} from './hud-actions.mjs';
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness();const findings=[];
try{
 for(const scenario of ['saved-avatar','modal-stops-walk','composer-stops-walk','module-failure','entry-failure','focused-rotation']){
  const context=await h.browser.newContext(h.devices['Pixel 5']),page=await context.newPage();page.setDefaultTimeout(5000);
  try{
   await page.addInitScript(color=>localStorage.setItem('atria.v5.profile.v1',JSON.stringify({name:'Javier',scrubColor:color})),scenario==='saved-avatar'?'blue':'navy');
   if(scenario==='module-failure')await page.route('**/src/v5/render/hospital.js',route=>route.abort());
   if(scenario==='entry-failure')await page.route('**/src/v5/app/main.js',route=>route.abort());
   await page.goto(h.url);
   if(scenario.endsWith('failure')){
    await page.waitForFunction(()=>document.body.dataset.boot==='failed');
    assert(await page.locator('#fatal').isVisible());assert(await page.locator('#fatalText').innerText());
    continue;
   }
   await page.waitForFunction(()=>document.body.dataset.boot==='ready');await page.locator('#enterButton').click();
   if(scenario==='saved-avatar')assert.equal(await page.evaluate(()=>atriaV5.snapshot().player.color),'navy');
   if(scenario.includes('stops-walk')){
    const box=await page.locator('#game').boundingBox();await page.locator('#game').click({position:{x:box.width/2,y:box.height/2-150}});
    await page.waitForFunction(()=>atriaV5.snapshot().player.moving);
    if(scenario==='modal-stops-walk')await clickHudAction(page,'profileButton');else await page.locator('#dieInput').focus();
    assert.equal(await page.evaluate(()=>atriaV5.snapshot().player.moving),false,'focus/modal must immediately stop movement');
    assert.equal(await page.evaluate(()=>atriaV5.snapshot().player.target),null);
   }
   if(scenario==='focused-rotation'){
    await page.locator('#dieInput').focus();await page.setViewportSize({width:851,height:393});
    await page.waitForFunction(()=>atriaV5.diagnostics().renderer.width===851);
    assert.equal((await page.evaluate(()=>atriaV5.diagnostics())).renderer.height,393);
    assert(await page.locator('#dieInput').evaluate(el=>document.activeElement===el));
   }
  }catch(error){findings.push({scenario,error:error.message});}
  finally{await context.close();}
 }
 assert.deepEqual(findings,[]);console.log('V5 BOOT/FOCUS BROWSER PASS: saved appearance, editing movement, module/entry failure and focused rotation; physicalAndroid=false');
}finally{await h.close();}
