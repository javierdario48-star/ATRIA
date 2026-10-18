// Public UI only, desktop and Pixel. Snapshot reads never mutate the game.
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
  await page.locator('#playerName').fill('PERI '+name);await page.locator('#enterButton').click();
  await page.locator('#guardButton').click();await page.locator('#caseChoice').selectOption('PERI-SEC-001');
  await page.locator('[data-action="start-guard"]').click();
  if(await page.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await page.locator('#keyboardToggleButton').click();
  const state=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
  const send=async text=>{
   const before=(await state()).room.transcript.length;
   await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type="submit"]').click();
   await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,before);
   await page.locator('#dieInput').blur();
  };
  for(const [x,y] of [[496,1200],[496,1080],[496,960],[496,840],[496,720],[400,580],[250,470],[144,420]]){
   stage=name+' walking '+x+','+y;
   await page.waitForFunction(()=>{const p=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;return Math.abs(c.x-p.x)<1&&Math.abs(c.y-p.y)<1;});
   const r=await page.evaluate(()=>atriaV5.diagnostics().renderer),point={x:(x-r.camera.x)*r.scale+r.anchorX,y:(y-r.camera.y)*r.scale+r.anchorY};
   const hud=await page.locator('#hud').boundingBox(),dock=await page.locator('#chatDock').boundingBox();
   assert(point.y>hud.y+hud.height+5&&point.y<dock.y-5,'visible map route');
   await page.locator('#game').click({position:point});await page.waitForFunction(()=>atriaV5.snapshot().player.moving);
   await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
  }
  stage=name+' diagnosis and urgent surgical response';
  assert.equal((await state()).patient.phys.sourceControlled,false);
  assert.equal(await page.locator('[data-patient-destination]').count(),0);
  await page.locator('[data-patient-diagnosis]').click();await page.locator('#diagnosisInput').fill('peritonitis');
  await page.locator('[data-diagnosis="Peritonitis secundaria"]').click();await page.locator('#diagnosisInput').press('Enter');
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='Peritonitis secundaria');
  await page.locator('#modalClose').click();
  // The original surgeon requires DOCUMENTED shock. Hidden initial vitals
  // cannot substitute for the doctor's actual measurement.
  await page.locator('#peopleButton').click();await page.locator('[data-action="record-vitals"]').click();
  await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.lastVitalsKnown);
  await page.locator('#modalClose').click();
  await send('Enfermera cirugía');await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.consults.length===1);
  assert.equal((await state()).patient.consults[0].accepted,true,'specific initial shock permits urgent assessment');
  assert.deepEqual((await state()).eligibleDestinations,[],'urgent acceptance is not completed care');
  stage=name+' physical resuscitation';
  await send('Enfermera monitor y Ringer 1000 ml y ceftriaxona 1 g y metronidazol 500 mg y noradrenalina 0.05 mcg/kg/min IV y oxigeno 4 L/min');
  const prescribed=await state(),batch=prescribed.room.events.filter(x=>x.type==='chat.posted').at(-1);
  assert.equal(batch.clinical.length,7);assert(batch.clinical.every(x=>x.status==='pending'));
  assert.equal(prescribed.patient.administrationLog.length,0,'no dose before physical arrival');
  assert.deepEqual(prescribed.eligibleDestinations,[]);
  // Obtain history and an actual directed exam while nursing prepares care.
  for(const text of ['¿Desde cuándo empezó?','¿Dónde empezó el dolor?','¿Duele al moverte?','¿Elimina gases?','¿Tiene alergias?'])await send(text);
  await page.locator('#peopleButton').click();await page.locator('[data-action="examination"]').click();
  for(const technique of ['general','inspection','auscultation','percussion','palpation']){
   await page.locator('#examRegions [data-exam-region="'+(technique==='general'?'general':'abdomen')+'"]').click();
   await page.locator('[data-exam-section="'+technique+'"]').click();
   await page.waitForFunction(t=>!!atriaV5.snapshot().clinical.patient.exam[t],technique);
  }
  assert.match(await page.locator('#examResults').innerText(),/Defensa y contractura difusas/);
  await page.locator('#modalClose').click();
  for(const id of ['peri_cbc','peri_ct','peri_gas']){
   stage=name+' study '+id;
   await page.locator('#peopleButton').click();await page.locator('[data-action="studies"]').click();
   await page.locator('#studyChoice').selectOption(id);await page.locator('[data-action="request-study"]').click();
   await page.waitForFunction(id=>atriaV5.snapshot().clinical.patient.orders.some(x=>x.id===id),id);
  }
  stage=name+' actual administrations and results';
  await page.waitForFunction(()=>{
   const p=atriaV5.snapshot().clinical.patient;return p.administrationLog.length===5&&p.procedures.monitor?.connected;
  },null,{timeout:45000});
  const delivered=await state();assert.equal(delivered.patient.venousAccessCount,1);
  assert.equal(new Set(delivered.patient.administrationLog.map(x=>x.sourceEventId)).size,5);
  for(const id of ['fluid','ceftriaxone','metronidazole','vasopressor','oxygen'])assert(delivered.patient.administrationLog.some(x=>x.id===id));
  assert.equal(delivered.patient.phys.sourceControlled,false);assert.equal(delivered.progress.xp,0);
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.orders.every(x=>x.status==='done'),null,{timeout:150000});
  assert.match((await state()).patient.orders.find(x=>x.id==='peri_ct').result,/Diverticulitis sigmoidea perforada/);
  stage=name+' reevaluation and original surgical handoff';
  await page.locator('#peopleButton').click();await page.locator('[data-action="reassess"]').click();
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.reassessments>0);
  await page.locator('#modalClose').click();
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.eligibleDestinations.includes('quirofano'));
  await page.screenshot({path:out+'/peritonitis-'+name+'-ready.png'});
  await page.locator('[data-patient-destination="quirofano"]').click();
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.caseEnded);
  const closed=await state();assert.equal(closed.patient.closure.destination,'quirofano');
  assert.equal(closed.patient.closure.quality.score,95);assert.equal(closed.progress.xp,128);assert.equal(closed.progress.receipts.length,1);
  assert.equal(closed.patient.phys.sourceControlled,false);assert(!closed.patient.treatments.some(x=>x.id==='source_control'));
  const debrief=await page.locator('#caseResult').innerText();assert.match(debrief,/95\/100/);assert.match(debrief,/128/);
  await page.screenshot({path:out+'/peritonitis-'+name+'-closed.png'});
  await page.locator('#modalClose').click();await send('/disposicion quirofano');await send('Enfermera ceftriaxona');
  assert.equal((await state()).progress.xp,128);assert.equal((await state()).patient.administrationLog.length,5);
  await page.locator('#guardButton').click();await page.reload();await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#enterButton').click();assert.match(await page.locator('#playerProgress').innerText(),/128/);
  assert.deepEqual(errors,[]);
  reports.push({name,physicalAndroid:false,caseId:'PERI-SEC-001',realUi:true,realNursing:true,
   receipts:closed.patient.administrationLog,quality:closed.patient.closure.quality,xp:128,oneAward:true,
   sourceControlUnchanged:true,completedStudies:closed.patient.orders,consult:closed.patient.consults[0],
   originalFindings:true,allergyAsked:true,persistedAfterReload:true,errors});await context.close();
 }
 await fs.writeFile(out+'/peritonitis-summary.json',JSON.stringify(reports,null,2)+'\n');
 console.log('PERITONITIS COMPLETE REAL UI PASS',JSON.stringify(reports.map(x=>({name:x.name,score:x.quality.score,xp:x.xp,receipts:x.receipts.length}))));
}catch(error){
 if(page&&!page.isClosed()){
  await page.screenshot({path:out+'/peritonitis-failure.png'}).catch(()=>{});
  const snapshot=await page.evaluate(()=>({state:globalThis.atriaV5?.snapshot(),modal:document.querySelector('#modalContent')?.innerText})).catch(()=>null);
  await fs.writeFile(out+'/peritonitis-failure.json',JSON.stringify({stage,error:String(error),snapshot},null,2)+'\n');
 }
 throw error;
}finally{await h.close();}
