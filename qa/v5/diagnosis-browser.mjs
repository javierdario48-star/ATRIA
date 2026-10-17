// Public controls only. evaluate() observes snapshots and dispatches an IME
// key event; it never writes clinical state or issues a hidden medication.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results',h=await browserHarness(),results=[];
await fs.mkdir(out,{recursive:true});
try{
 for(const name of ['desktop','pixel']){
  const ctx=await h.browser.newContext(name==='pixel'?h.devices['Pixel 5']:{viewport:{width:1024,height:768}});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.goto(process.env.V5_BROWSER_URL||h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#enterButton').click();await page.locator('#guardButton').click();
  await page.locator('#caseChoice').selectOption('APP-001');await page.locator('[data-action="start-guard"]').click();
  if(await page.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await page.locator('#keyboardToggleButton').click();
  const state=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
  const send=async text=>{
   const n=(await state()).room.transcript.length;
   await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type="submit"]').click();
   await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,n);
   await page.locator('#dieInput').blur();
  };
  for(const [x,y] of [[496,1060],[496,800],[400,580],[250,470],[144,420]]){
   await page.waitForFunction(()=>{const p=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;return Math.abs(c.x-p.x)<1&&Math.abs(c.y-p.y)<1;});
   const r=await page.evaluate(()=>atriaV5.diagnostics().renderer);
   await page.locator('#game').click({position:{x:(x-r.camera.x)*r.scale+r.anchorX,y:(y-r.camera.y)*r.scale+r.anchorY}});
   await page.waitForFunction(()=>atriaV5.snapshot().player.moving);await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
  }
  assert.equal(await page.locator('[data-patient-destination]').count(),0);
  await send('Enfermera cirugía');await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.consults.length===1);
  assert.equal((await state()).patient.consults[0].accepted,false);
  await page.locator('[data-patient-diagnosis]').click();
  const field=page.locator('#diagnosisInput');await field.fill('peritonitis');
  const text=await page.locator('#diagnosisSuggestions').innerText();
  for(const term of ['Peritonitis bacteriana espontánea','Peritonitis secundaria','Peritonitis terciaria'])assert(text.includes(term));
  await field.evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,isComposing:true})));
  assert.equal((await state()).patient.diagnosis,'','IME confirmation must not save a draft');
  await page.locator('[data-action="save-diagnosis"]').click();
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='peritonitis');
  await page.locator('[data-action="clear-diagnosis"]').click();
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='');
  await field.fill('apendi');await page.locator('[data-diagnosis="apendicitis aguda"]').click();await field.press('Enter');
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='apendicitis aguda');
  await page.locator('#modalClose').click();
  assert.match(await page.locator('[data-patient-diagnosis]').innerText(),/apendicitis aguda/);
  await page.screenshot({path:out+'/diagnosis-'+name+'.png'});
  await page.locator('[data-patient-diagnosis]').click();assert.equal(await field.inputValue(),'apendicitis aguda');
  await page.locator('#modalClose').click();
  await send('Enfermera cirugía');await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.consults.length===2);
  assert.equal((await state()).patient.consults[1].reviewStatus,'missing-exam');
  assert.equal((await state()).patient.treatments.length,0);
  assert.equal((await state()).progress.receipts.length,0);
  await page.locator('#guardButton').click();
  assert.equal(await page.locator('#patientClinicalActions').isVisible(),false);
  assert.deepEqual(errors,[]);
  results.push({name,globalVocabulary:true,saveClearReedit:true,imeSafe:true,refusals:2,
   noPrematureDestinations:true,noPerformedSurgery:true,physicalAndroid:false,errors});
  await ctx.close();
 }
 await fs.writeFile(out+'/diagnosis-summary.json',JSON.stringify(results,null,2)+'\n');
 console.log('FLOATING DIAGNOSIS BROWSER PASS',JSON.stringify(results));
}finally{await h.close();}
