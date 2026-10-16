// APP-001 public-interface end-to-end. Never mutates clinical state through evaluate().
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results',h=await browserHarness();
await fs.mkdir(out,{recursive:true});
let page;
try{
 const ctx=await h.browser.newContext(h.devices['Pixel 5']);
 page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.goto(process.env.V5_BROWSER_URL||h.url);
 await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#playerName').fill('APP UI doctor');await page.locator('#enterButton').click();
 await page.locator('#guardButton').click();
 await page.locator('#caseChoice').selectOption('APP-001');
 await page.locator('[data-action="start-guard"]').click();
 const state=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
 const send=async text=>{
  const before=(await state()).room.transcript.length;
  await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type="submit"]').click();
  await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,before);
 };
 await send('Enfermera ceftriaxona 1 g');
 assert.equal((await state()).patient.administrationLog.length,0,'no treatment remotely from lobby position');
 await page.locator('#dieInput').blur();
 await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
 for(const [x,y] of [[496,1060],[496,800],[400,580],[250,470],[144,420]]){
  await page.waitForFunction(()=>{
   const p=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;
   return Math.abs(c.x-p.x)<1&&Math.abs(c.y-p.y)<1;
  });
  const t=await page.evaluate(()=>({p:atriaV5.snapshot().player,r:atriaV5.diagnostics().renderer}));
  await page.locator('#game').click({position:{x:(x-t.r.camera.x)*t.r.scale+t.r.anchorX,y:(y-t.r.camera.y)*t.r.scale+t.r.anchorY}});
  await page.waitForFunction(()=>atriaV5.snapshot().player.moving);
  await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
 }
 for(const question of ['¿desde cuando empezo?','¿se movio el dolor?','¿tiene apetito?'])await send(question);
 await page.locator('#peopleButton').click();
 await page.locator('[data-action="examination"]').click();
 for(const section of ['general','inspection','auscultation','percussion','palpation']){
  await page.locator('#examRegions [data-exam-region="'+(section==='general'?'general':'abdomen')+'"]').click();
  await page.locator('[data-exam-section="'+section+'"]').click();
  await page.waitForFunction(s=>!!atriaV5.snapshot().clinical.patient.exam[s],section);
 }
 assert.match(await page.locator('#examResults').innerText(),/McBurney/);
 await page.locator('#modalClose').click();
 await page.locator('#peopleButton').click();
 await page.locator('[data-action="record-vitals"]').click();
 assert.match(await page.locator('#clinicalVitals').innerText(),/118\/72/);
 await page.locator('#modalClose').click();
 for(const id of ['app_cbc','app_us']){
  await page.locator('#peopleButton').click();
  await page.locator('[data-action="studies"]').click();
  await page.locator('#studyChoice').selectOption(id);
  await page.locator('[data-action="request-study"]').click();
  await page.waitForFunction(key=>atriaV5.snapshot().clinical.patient.orders.some(o=>o.id===key),id);
 }
 await page.locator('#peopleButton').click();
 await page.locator('[data-action="treatment"]').click();
 await page.locator('#therapyOrder').fill('ceftriaxona 1 g y metronidazol 500 mg');
 await page.locator('[data-action="order-therapy"]').click();
 const autoOrder=(await state()).room.events.filter(e=>e.type==='chat.posted').at(-1);
 assert.deepEqual(autoOrder.clinical.map(x=>[x.id,x.status]),
  [['iv','pending'],['ceftriaxone','pending'],['metronidazole','pending']],
  'medication-only order must visibly request a line before either medicine');
 assert.equal((await state()).patient.venousAccessCount,0,'access remains pending during nurse travel');
 assert.equal((await state()).patient.administrationLog.length,0);
 await send('Enfermera monitor');
 const bedsidePending=await page.evaluate(()=>atriaV5.snapshot());
 assert.equal(bedsidePending.clinical.patient.venousAccessCount,0,
  'nursing orders remain pending while the real NPC travels');
 assert.equal(bedsidePending.clinical.patient.procedures.monitor?.connected??false,false);
 assert(bedsidePending.nurses.some(n=>n.journeyId),'nurse must begin a physical hospital path');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.venousAccessCount===1);
 const pending=await state();
 assert.equal(pending.patient.pendingTreatments.length,0,'no medicine is preparing before an NPC arrives');
 assert.equal(pending.patient.administrationLog.length,0);
 assert((await page.evaluate(()=>atriaV5.snapshot())).nurses.some(n=>n.journeyId),'two antibiotics require nursing work');
 assert.equal((await state()).room.events.filter(e=>e.type==='clinical.completed'&&e.clinical[0]?.id==='iv').length,1,
  'automatic IV is only performed once');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.administrationLog.length===2);
 const delivered=await state();
 assert.deepEqual(delivered.patient.administrationLog.map(x=>x.id),['ceftriaxone','metronidazole']);
 assert.deepEqual(delivered.patient.administrationLog.map(x=>x.dose.amount),[1000,500]);
 assert.equal(delivered.patient.venousAccessCount,1);
 await send('Enfermera ceftriaxona y metronidazol');
 await page.locator('#peopleButton').click();
 await page.locator('[data-action="treatment"]').click();
 await page.locator('#therapyOrder').fill('Ringer 500 ml');
 await page.locator('[data-action="order-therapy"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.liveVitals.sys>118.01);
 const afterFluid=await state();
 assert.equal(afterFluid.patient.administrationLog.length,3);
 assert.equal(afterFluid.patient.administrationLog[2].id,'fluid');
 assert(afterFluid.patient.liveVitals.hr<108);
 await page.locator('#peopleButton').click();
 await page.locator('[data-action="treatment"]').click();
 await page.locator('[data-action="request-surgery"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.consults.length===1);
 const consult=(await state()).patient.consults[0];
 assert.equal(consult.accepted,true);
 assert.equal((await state()).patient.treatments.some(x=>x.id==='source_control'),false,'handoff is not performed surgery');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.orders.every(o=>o.status==='done'),null,{timeout:150000});
 await page.locator('#peopleButton').click();
 await page.locator('[data-action="reassess"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.reassessments>0);
 await page.locator('#diagnosisInput').fill('apendicitis aguda');
 await page.locator('[data-action="save-diagnosis"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='apendicitis aguda');
 await page.locator('[data-destination="quirofano"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.caseEnded);
 const closed=await state();
 assert.equal(closed.patient.closure.destination,'quirofano');
 assert.equal(closed.patient.closure.quality.score,100);
 assert.equal(closed.progress.xp,133);
 assert.equal(closed.progress.receipts.length,1);
 assert.equal(closed.patient.administrationLog.length,3);
 assert.equal(closed.patient.treatments.some(x=>x.id==='source_control'),false);
 assert.match(await page.locator('#caseResult').innerText(),/100\/100/);
 await page.screenshot({path:out+'/app-surgical-handoff.png'});
 await page.locator('#modalClose').click();
 await send('/disposicion quirofano');await send('Enfermera ceftriaxona');
 assert.equal((await state()).progress.xp,133);
 assert.equal((await state()).patient.administrationLog.length,3);
 await page.locator('#guardButton').click();
 await page.reload();await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#enterButton').click();
 assert.match(await page.locator('#playerProgress').innerText(),/133/);
 assert.deepEqual(errors,[]);
 const report={caseId:'APP-001',browser:true,mobileEmulation:true,physicalAndroid:false,
  confirmedVenousAccess:true,antibiotics:delivered.patient.administrationLog,
  fluidVitalResponse:afterFluid.patient.liveVitals,surgeryConsult:consult,
  disposition:'ED transfer to surgery, not performed appendectomy',closure:closed.patient.closure,
  exactlyOnceXP:true,persistedAfterReload:true,errors};
 await fs.writeFile(out+'/app-summary.json',JSON.stringify(report,null,2));
 console.log('APP COMPLETE REAL UI PASS',JSON.stringify({caseId:'APP-001',score:closed.patient.closure.quality.score,
  xp:closed.progress.xp,drugs:closed.patient.administrationLog.length,physicalAndroid:false}));
 await ctx.close();
}catch(e){
 if(page){await page.screenshot({path:out+'/app-failure.png'}).catch(()=>{});
  const snapshot=await page.evaluate(()=>({state:globalThis.atriaV5?.snapshot().clinical,
   modal:document.querySelector('#modalContent')?.innerText})).catch(()=>null);
  await fs.writeFile(out+'/app-failure.json',JSON.stringify({error:String(e),snapshot},null,2));}
 throw e;
}finally{await h.close();}
