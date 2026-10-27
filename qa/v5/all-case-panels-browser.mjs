// Real mobile UI for EVERY case. Production sessions and DOM actions only;
// diagnostics observe pixels, render errors and authoritative exam provenance.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
import {CLINICAL_EXECUTORS} from '../../src/v5/content/clinical-cases.js';
const h=await browserHarness(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';
await fs.mkdir(out,{recursive:true});
let page;const errors=[],runs=[];
try{
 const context=await h.browser.newContext(h.devices['Pixel 5']);page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#playerName').fill('Paneles 25 casos');await page.locator('#enterButton').click();
 const state=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
 for(const mode of ['solo','apprentice'])for(const caseId of Object.keys(CLINICAL_EXECUTORS)){
  await page.locator('#guardButton').click();await page.locator('[data-mode="'+mode+'"]').click();
  await page.locator('input[name="guardScope"][value="specific"]').check();await page.locator('#caseChoice').selectOption(caseId);await page.locator('[data-action="start-guard"]').click();
  await page.waitForFunction(id=>atriaV5.snapshot().clinical?.patient.caseId===id,caseId);
  const uid=(await state()).patient.uid;
  const before=await page.evaluate(()=>atriaV5.diagnostics().frames);
  for(const section of ['examination','clinical-history','studies','treatment']){
   await page.locator('#peopleButton').click();
   await page.locator('[data-action="'+section+'"]').first().click();
   assert.equal(await page.locator('#modalContent').getAttribute('data-patient-uid'),uid);
   if(section==='examination')await page.locator('#examRegions').waitFor();
   if(section==='clinical-history')await page.locator('#fullClinicalHistory').waitFor();
   await page.locator('#modalClose').click();
  }
  if(caseId==='FECAL-001'&&mode==='solo'){
   if(await page.evaluate(()=>atriaV5.diagnostics().keyboard.open))await page.locator('#keyboardToggleButton').click();
   await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
   for(const [x,y] of [[496,1060],[496,800],[400,580],[250,470],[144,420]]){
    const r=await page.evaluate(()=>atriaV5.diagnostics().renderer);
    await page.locator('#game').click({position:{x:(x-r.camera.x)*r.scale+r.anchorX,y:(y-r.camera.y)*r.scale+r.anchorY}});
    await page.waitForFunction(()=>atriaV5.snapshot().player.moving);
    await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
   }
   await page.locator('#peopleButton').click();await page.locator('[data-action="examination"]').click();
   await page.locator('#examRegions [data-exam-region="perineum"]').click();
   await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings.perineum?.rectal);
   assert.match(await page.locator('#examRegions [data-exam-region="perineum"]').innerText(),/materia fecal dura/i);
   const examined=await state();
   assert.equal(examined.patient.examFindings.perineum.rectal.patientUid,uid);
   assert(!examined.messages.some(m=>m.role==='nurse'&&/Ampolla rectal|materia fecal dura/i.test(m.text)));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
   await page.screenshot({path:out+'/fecal-physician-rectal-examination.png'});
   await page.locator('#modalClose').click();
  }
  await page.waitForFunction(n=>atriaV5.diagnostics().frames>n+2,before);
  const diagnostics=await page.evaluate(()=>atriaV5.diagnostics());
  assert.equal(diagnostics.frameErrors.count,0,caseId+' panel must not throw and rely on frame recovery');
  assert.equal(diagnostics.raf,1);assert.equal(diagnostics.renderer.images,22);
  assert.equal((await state()).patient.uid,uid);
  runs.push({mode,caseId,panels:4,rendererErrors:0});
  await page.locator('#guardButton').click();
  await page.waitForFunction(()=>atriaV5.snapshot().clinical===null);
 }
 assert.equal(runs.length,50);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/all-case-panels-summary.json',JSON.stringify({realBrowser:true,mobileEmulated:'Pixel 5',
  physicalDevice:false,cases:25,modes:['solo','apprentice'],panelsOpened:200,rectalPhysicianExam:true,runs,errors},null,2));
 console.log('ALL 25 CASE MOBILE PANELS PASS '+JSON.stringify({guards:runs.length,panels:200,errors}));
 await context.close();
}catch(error){
 if(page){await page.screenshot({path:out+'/all-case-panels-failure.png'}).catch(()=>{});
  await fs.writeFile(out+'/all-case-panels-failure.json',JSON.stringify({error:String(error),runs,
   state:await page.evaluate(()=>atriaV5?.snapshot()).catch(()=>null)},null,2));}
 throw error;
}finally{await h.close();}
