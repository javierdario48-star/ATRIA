import {chooseDestination} from './cooperative-ui.mjs';
// Complete public UI journey, no game mutations or accelerated clinical clock.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results',reports=[];
await fs.mkdir(out,{recursive:true});let page,stage='boot';
try{
 for(const name of ['desktop','pixel']){
  const context=await h.browser.newContext(name==='pixel'?h.devices['Pixel 5']:{viewport:{width:1024,height:768}});
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.goto(process.env.V5_BROWSER_URL||h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#playerName').fill('PBE '+name);await page.locator('#enterButton').click();
  await page.locator('#guardButton').click();await page.locator('#caseChoice').selectOption('PERI-PBE-001');
  await page.locator('[data-action="start-guard"]').click();
  if(await page.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await page.locator('#keyboardToggleButton').click();
  const state=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
  const send=async text=>{const before=(await state()).room.transcript.length;
   await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type="submit"]').click();
   await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,before);await page.locator('#dieInput').blur();};
  for(const [x,y] of [[496,1200],[496,1080],[496,960],[496,840],[496,720],[400,580],[250,470],[144,420]]){
   stage=name+' walk '+x+','+y;
   await page.waitForFunction(()=>{const p=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;return Math.hypot(c.x-p.x,c.y-p.y)<2.5;});
   const r=await page.evaluate(()=>atriaV5.diagnostics().renderer),point={x:(x-r.camera.x)*r.scale+r.anchorX,y:(y-r.camera.y)*r.scale+r.anchorY};
   const hud=await page.locator('#hud').boundingBox(),dock=await page.locator('#chatDock').boundingBox();
   assert(point.y>hud.y+hud.height+5&&point.y<dock.y-5,'visible map route');
   const before=await page.evaluate(()=>({player:atriaV5.snapshot().player,
   renderer:atriaV5.diagnostics().renderer}));
   // The grid can already place us at this waypoint after the previous click.
   // A legitimate no-op must not be classified as blocked movement.
   if(Math.hypot(before.player.x-x,before.player.y-y)<=8)continue;
   await page.locator('#game').click({position:point});
   try{await page.waitForFunction(start=>{
    const p=atriaV5.snapshot().player;
    return p.moving||Math.hypot(p.x-start.x,p.y-start.y)>8;
   },{x:before.player.x,y:before.player.y},{timeout:9000});}
   catch(error){
    error.message+='; '+JSON.stringify({waypoint:[x,y],stage,before,after:await page.evaluate(()=>({
     player:atriaV5.snapshot().player,renderer:atriaV5.diagnostics().renderer,
     dialog:document.querySelector('#modal')?.open,
     modal:document.querySelector('#modalContent')?.textContent?.slice(0,180)}))});
    throw error;
   }
   await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
  }
  stage=name+' initial confusion';assert.equal((await state()).patient.phys.sourceControlled,true);
  assert.equal((await state()).patient.glasgow,null);assert.equal(await page.locator('[data-patient-destination]').count(),0);
  async function glasgow(){
   await page.locator('#peopleButton').click();await page.locator('[data-action="examination"]').click();
   await page.locator('#examRegions [data-exam-region="neurological"]').click();
   await page.waitForFunction(()=>{const g=atriaV5.snapshot().clinical.patient.glasgow;
    return !!g?.eye&&!!g?.verbal&&!!g?.motor;});
   const total=(await state()).patient.glasgow.total;await page.locator('#modalClose').click();return total;
  }
  assert.equal(await glasgow(),14);
  await page.locator('#peopleButton').click();await page.locator('[data-action="record-vitals"]').click();await page.locator('#modalClose').click();
  stage=name+' physical nursing';await send('Enfermera monitor y ceftriaxona 1 g y albumina 1.5 g/kg');
  const prescribed=await state(),batch=prescribed.room.events.filter(x=>x.type==='chat.posted').at(-1);
  assert.equal(batch.clinical.length,4);assert(batch.clinical.every(x=>x.status==='pending'));
  assert.equal(prescribed.patient.administrationLog.length,0);
  for(const text of ['¿Tiene cirrosis?','¿Tiene ascitis?','¿Tuvo fiebre?','¿Notó confusión?'])await send(text);
  await page.locator('#peopleButton').click();await page.locator('[data-action="examination"]').click();
  // Selecting a body region now executes all real constituent maneuvers.
  // The old per-maneuver buttons live under an optional collapsed detail.
  await page.locator('#examRegions [data-exam-region="general"]').click();
  await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings?.general);
  await page.locator('#examRegions [data-exam-region="abdomen"]').click();
  await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings?.abdomen?.palpation);
  await page.locator('.exam-advanced > summary').click();
  assert.match(await page.locator('#examResults').innerText(),/Molestia difusa leve/);await page.locator('#modalClose').click();
  for(const id of ['pbe_paracentesis','pbe_renal']){
   stage=name+' study '+id;await page.locator('#peopleButton').click();await page.locator('[data-action="studies"]').click();
   await page.locator('#studyChoice').selectOption(id);await page.locator('[data-action="request-study"]').click();
   await page.waitForFunction(id=>atriaV5.snapshot().clinical.patient.orders.some(x=>x.id===id),id);
  }
  const requested=(await state()).patient.orders;
  for(const [id,delay] of [['pbe_paracentesis',40],['pbe_renal',45]]){
   const o=requested.find(x=>x.id===id);assert.equal(o.status,'pending');assert(Math.abs(o.readyAtMinute-o.requestedAtMinute-delay)<1e-8);
  }
  stage=name+' floating diagnosis';const floatingDiagnosis=await page.locator('[data-patient-diagnosis]').isVisible();
  if(floatingDiagnosis)await page.locator('[data-patient-diagnosis]').click();
  else await page.locator('#peopleButton').click();
  await page.locator('#diagnosisInput').fill('PBE');
  await page.locator('[data-diagnosis="Peritonitis bacteriana espontánea"]').click();await page.locator('#diagnosisInput').press('Enter');
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='Peritonitis bacteriana espontánea');if(floatingDiagnosis)assert.equal(await page.locator('#modal').evaluate(el=>el.open),false,'floating diagnosis editor auto-closes');
  else await page.locator('#modalClose').click();
  stage=name+' real treatment and convalescence';
  await page.waitForFunction(()=>{const p=atriaV5.snapshot().clinical.patient;return p.administrationLog.length===2&&p.procedures.monitor?.connected;},null,{timeout:45000});
  const delivered=await state();assert.equal(delivered.patient.venousAccessCount,1);assert.equal(new Set(delivered.patient.administrationLog.map(x=>x.sourceEventId)).size,2);
  assert(delivered.patient.administrationLog.some(x=>x.id==='ceftriaxone'));assert(delivered.patient.administrationLog.some(x=>x.id==='albumin'));
  await page.waitForFunction(()=>{const p=atriaV5.snapshot().clinical.patient;return p.orders.every(x=>x.status==='done')&&p.phys.inflammation<.62*.8&&p.liveVitals.sys>=100;},null,{timeout:120000});
  assert.match((await state()).patient.orders.find(x=>x.id==='pbe_paracentesis').result,/780 PMN/);
  assert.equal(await glasgow(),15,'neurological recovery requires actual physiological improvement');
  await page.locator('#peopleButton').click();await page.locator('[data-action="reassess"]').click();await page.locator('#modalClose').click();
  assert.deepEqual((await state()).eligibleDestinations,['sala']);await page.screenshot({path:out+'/pbe-'+name+'-ready.png'});
  stage=name+' unique ward closure';await chooseDestination(page,'sala');await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.caseEnded);
  const closed=await state();assert.equal(closed.patient.closure.quality.score,100);assert.equal(closed.progress.xp,133);assert.equal(closed.progress.receipts.length,1);
  assert(closed.patient.phys.sourceControlled);assert(!closed.patient.treatments.some(x=>x.id==='source_control'));
  assert.match(await page.locator('#caseResult').innerText(),/100\/100/);await page.screenshot({path:out+'/pbe-'+name+'-closed.png'});
  await page.locator('#modalClose').click();await send('/disposicion sala');await send('Enfermera ceftriaxona');assert.equal((await state()).progress.xp,133);
  assert.equal((await state()).patient.administrationLog.length,2);await page.locator('#guardButton').click();await page.reload();
  await page.waitForFunction(()=>document.body.dataset.boot==='ready');await page.locator('#enterButton').click();assert.match(await page.locator('#playerProgress').innerText(),/133/);
  assert.deepEqual(errors,[]);reports.push({name,caseId:'PERI-PBE-001',realUi:true,physicalAndroid:false,initialGlasgow:14,recoveredGlasgow:15,
   receipts:closed.patient.administrationLog,studies:closed.patient.orders,quality:closed.patient.closure.quality,xp:133,oneAward:true,noOperation:true,persistedAfterReload:true,errors});await context.close();
 }
 await fs.writeFile(out+'/pbe-summary.json',JSON.stringify(reports,null,2)+'\n');console.log('PBE COMPLETE REAL UI PASS',JSON.stringify(reports.map(x=>({name:x.name,score:x.quality.score,xp:x.xp}))));
}catch(error){
 if(page&&!page.isClosed()){await page.screenshot({path:out+'/pbe-failure.png'}).catch(()=>{});
  const snapshot=await page.evaluate(()=>({state:globalThis.atriaV5?.snapshot(),modal:document.querySelector('#modalContent')?.innerText})).catch(()=>null);
  await fs.writeFile(out+'/pbe-failure.json',JSON.stringify({stage,error:String(error),snapshot},null,2)+'\n');}
 throw error;
}finally{await h.close();}
