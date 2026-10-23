// Public controls only. evaluate() observes snapshots and dispatches an IME
// key event; it never writes clinical state or issues a hidden medication.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results',h=await browserHarness(),results=[];
await fs.mkdir(out,{recursive:true});
let page,stage='boot';
try{
 for(const name of ['desktop','pixel']){
  const ctx=await h.browser.newContext(name==='pixel'?h.devices['Pixel 5']:{viewport:{width:1024,height:768}});
  page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
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
  // Short visible steps work at BOTH desktop scale and the mobile scale.
  // The previous copied Pixel route clicked behind the desktop HUD.
  for(const [x,y] of [[496,1200],[496,1080],[496,960],[496,840],[496,720],[400,580],[250,470],[144,420]]){
   stage=name+' walk '+x+','+y;
   await page.waitForFunction(()=>{const p=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;return Math.abs(c.x-p.x)<1&&Math.abs(c.y-p.y)<1;});
   const r=await page.evaluate(()=>atriaV5.diagnostics().renderer);
   const point={x:(x-r.camera.x)*r.scale+r.anchorX,y:(y-r.camera.y)*r.scale+r.anchorY};
   const hud=await page.locator('#hud').boundingBox(),dock=await page.locator('#chatDock').boundingBox();
   assert(point.y>hud.y+hud.height+5&&point.y<dock.y-5,'waypoint must be an exposed map touch, never behind HUD/chat');
   const before=await page.evaluate(()=>({x:atriaV5.snapshot().player.x,y:atriaV5.snapshot().player.y}));
   // A waypoint already reached in the same tile must not require a new movement transition.
   if(Math.hypot(before.x-x,before.y-y)<=8)continue;
   await page.locator('#game').click({position:point});
   await page.waitForFunction(start=>{
    const p=atriaV5.snapshot().player;
    return Math.hypot(p.x-start.x,p.y-start.y)>8;
   },before);
   await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
  }
  stage=name+' diagnosis and consultation';
  assert.equal((await state()).eligibleDestinations.includes('quirofano'),false);
  await send('Enfermera cirugía');await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.consults.length===1);
  assert.equal((await state()).patient.consults[0].accepted,false);
  // The floating edit badge deliberately yields to walkable approach tiles.
  // The patient chart is the same supported public diagnosis workflow.
  const openEditor=async()=>{
   const badge=page.locator('[data-patient-diagnosis]');
   const floating=await badge.isVisible();
   if(floating)await badge.click();
   else await page.locator('#peopleButton').click();
   return floating;
  };
  const closeIfOpen=async()=>{
   if(await page.locator('#modal').evaluate(el=>el.open))await page.locator('#modalClose').click();
  };
  let floating=await openEditor();
  const field=page.locator('#diagnosisInput');await field.fill('peritonitis');
  const terms=await page.locator('#diagnosisSuggestions').innerText();
  for(const term of ['Peritonitis bacteriana espontánea','Peritonitis secundaria','Peritonitis terciaria'])assert(terms.includes(term));
  await field.evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,isComposing:true})));
  assert.equal((await state()).patient.diagnosis,'','IME confirmation must not save a draft');
  await page.locator('[data-action="save-diagnosis"]').click();
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='peritonitis');
  if(floating)assert.equal(await page.locator('#modal').evaluate(el=>el.open),false,
   'dedicated diagnosis dialog auto-closes after save');
  else await closeIfOpen();
  floating=await openEditor();
  await page.locator('[data-action="clear-diagnosis"]').click();
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='');
  await field.fill('apendi');await page.locator('[data-diagnosis="apendicitis aguda"]').click();await field.press('Enter');
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='apendicitis aguda');
  if(floating)assert.equal(await page.locator('#modal').evaluate(el=>el.open),false);
  else await closeIfOpen();
  if(await page.locator('[data-patient-diagnosis]').isVisible())
   assert.match(await page.locator('[data-patient-diagnosis]').innerText(),/apendicitis aguda/);
  await page.screenshot({path:out+'/diagnosis-'+name+'.png'});
  await openEditor();assert.equal(await field.inputValue(),'apendicitis aguda');
  await closeIfOpen();
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
 console.log('DIAGNOSIS PUBLIC UI PASS',JSON.stringify(results));
}catch(error){
 if(page&&!page.isClosed()){
  await page.screenshot({path:out+'/diagnosis-failure.png'}).catch(()=>{});
  const snapshot=await page.evaluate(()=>({state:globalThis.atriaV5?.snapshot(),modal:document.querySelector('#modalContent')?.innerText})).catch(()=>null);
  await fs.writeFile(out+'/diagnosis-failure.json',JSON.stringify({stage,error:String(error),snapshot},null,2)+'\n');
 }
 throw error;
}finally{await h.close();}
