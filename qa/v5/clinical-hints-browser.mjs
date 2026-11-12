import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
import {send,walk} from './cooperative-ui.mjs';
import {clickHudAction} from './hud-actions.mjs';

const h=await browserHarness(),results=[],errors=[];
await mkdir('qa/v5-hint-browser-results',{recursive:true});
try{
 for(const [name,device,mode] of [['desktop',null,'solo'],['android',h.devices['Pixel 5'],'apprentice']]){
  const browser=name==='desktop'?h.browser:await h.newBrowser();
  const context=await browser.newContext(device||{viewport:{width:1280,height:800}});
  try{
   const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
   await p.goto(h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
   await p.locator('#playerName').fill('Hints QA '+name);await p.locator('#enterButton').click();
   await p.locator('#guardButton').click();await p.locator('[data-mode="'+mode+'"]').click();
   await p.locator('input[name="guardScope"][value="specific"]').check();await p.locator('#caseChoice').selectOption('CIRR-001');
   await p.locator('[data-action="start-guard"]').click();
   await p.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
   assert.equal(await p.locator('[data-patient-action="hint"]:visible').count(),0,'no global hint control');
   if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await p.locator('#keyboardToggleButton').click();
   await walk(p,144);
   const tap=async()=>{
    const xy=await p.evaluate(()=>{const e=atriaV5.snapshot().entities.find(x=>x.kind==='patient'),r=atriaV5.diagnostics().renderer;
     return {x:(e.x-r.camera.x)*r.scale+r.anchorX,y:(e.y-r.camera.y)*r.scale+r.anchorY};});
    await p.locator('#game').click({position:xy});await p.locator('#patientWheel').waitFor({state:'visible'});
   };
   await clickHudAction(p,'audioButton');
   await p.locator('#modalClose').click();
   assert(await p.locator('#hudMenu').evaluate(menu=>menu.open),'Audio leaves the HUD menu open');
   await tap();const before=await p.evaluate(()=>atriaV5.snapshot().clinical),uid=before.patient.uid;
   const button=p.locator('#patientWheel [data-patient-action="hint"]');await button.waitFor({state:'visible'});
   assert.equal(await button.textContent(),'💡¿Qué hago ahora? · −5% XP');
   const rect=await button.boundingBox();assert(rect.width>=180&&rect.height>=40);
   await button.click();await p.locator('#vegaClinicalHint').waitFor({state:'visible'});
   assert.equal(await p.locator('#hudMenu').evaluate(menu=>menu.open),false,'Vega help dismisses the overlapping HUD menu');
   await p.waitForFunction(()=>atriaV5.snapshot().clinical.hintCount===1);
   assert.equal(await p.locator('#vegaClinicalHint').getAttribute('data-patient-uid'),uid);
   assert.match(await p.locator('#vegaClinicalHint').textContent(),/Dr. Vega — Pista clínica/);
   const after=await p.evaluate(()=>atriaV5.snapshot().clinical);
   assert.equal(after.patient.treatments.length,before.patient.treatments.length);assert.equal(after.patient.orders.length,before.patient.orders.length);
   await p.screenshot({path:'qa/v5-hint-browser-results/'+name+'.png'});
   await p.locator('#vegaClinicalHint button').click();await tap();await button.click();
   await p.locator('#vegaClinicalHint').waitFor({state:'visible'});
   assert.equal((await p.evaluate(()=>atriaV5.snapshot().clinical)).hintCount,1,'same action must not charge again');
   await p.locator('#vegaClinicalHint button').click();
   const reveal=name==='android';
   if(reveal){
    await tap();await p.locator('[data-patient-action="diagnosis"]').click();
    const button=p.locator('[data-action="reveal-diagnosis"]');
    assert.match(await button.textContent(),/−50% de XP/);
    await button.click();
    await p.locator('#diagnosisReveal .note').filter({hasText:/cirrosis/i}).waitFor();
    const first=await p.evaluate(()=>atriaV5.snapshot().clinical);
    assert.equal(first.patient.diagnosis,'');
    assert.equal(first.hintCount,1);
    await p.locator('#modalClose').click();
    await tap();await p.locator('[data-patient-action="diagnosis"]').click();
    await p.locator('#diagnosisReveal .note').waitFor();
    assert.equal(await button.count(),0);
    assert.deepEqual(await p.evaluate(()=>atriaV5.snapshot().clinical.diagnosisReveal),first.diagnosisReveal);
    await p.locator('#modalClose').click();
   }
   await send(p,'/diagnostico cirrosis descompensada');
   await send(p,'/cierre-parcial observacion');
   await p.locator('#caseResult .case-experience').waitFor({state:'visible'});
   const closed=await p.evaluate(()=>atriaV5.snapshot().clinical);
   const award=Math.floor(closed.patient.closure.xp*95/(reveal?200:100));
   assert(award>0);assert.equal(closed.progress.xp,award);
   const experience=await p.locator('#caseResult .case-experience').innerText();
   assert.match(experience,/Pistas nuevas utilizadas\s+1/);
   assert.match(experience,/Penalización por pistas\s+−5%/);
   if(reveal)assert.match(experience,/Diagnóstico revelado\s+−50%/);
   assert.match(experience,new RegExp('XP final obtenida\\s+'+award+' XP'));
   await p.screenshot({path:'qa/v5-hint-browser-results/'+name+'-xp.png'});
   results.push({device:name,mode,patientUid:uid,contextMenu:true,individualFee:true,repeatFree:true,noClinicalExecution:true,
    creditedXP:award,visibleDiscount:5,diagnosisReveal:reveal});
  }finally{await context.close();if(browser!==h.browser)await browser.close();}
 }
 assert.deepEqual(errors,[]);await writeFile('qa/v5-hint-browser-results/results.json',JSON.stringify(results,null,2)+'\n');
 console.log('ATRIA_CLINICAL_HINT_BROWSER='+JSON.stringify(results));
}finally{await h.close();}
