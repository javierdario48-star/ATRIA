import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';await fs.mkdir(out,{recursive:true});
let page;
try{
 const context=await h.browser.newContext(h.devices['Pixel 5']);page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.V5_BROWSER_URL||h.url);await page.locator('#enterButton').click();
 const state=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
 const send=async text=>{const before=(await state()).room.transcript.length;await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type="submit"]').click();
  await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,before);return (await state()).messages.at(-1);};
 async function guard(caseId){
  await page.locator('#guardButton').click();await page.locator('#caseChoice').selectOption(caseId);await page.locator('[data-action="start-guard"]').click();
  const before=(await state()).messages.length;await send('¿Dónde te duele?');assert.equal((await state()).messages.length,before+1,'distant question is global but has no patient reply');
  await page.locator('#dieInput').blur();if(await page.evaluate(()=>atriaV5.diagnostics().keyboard.open))await page.locator('#keyboardToggleButton').click();
  await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
  for(const [x,y] of [[496,1060],[496,800],[400,580],[250,470],[144,420]]){
   const r=await page.evaluate(()=>atriaV5.diagnostics().renderer);
   await page.locator('#game').click({position:{x:(x-r.camera.x)*r.scale+r.anchorX,y:(y-r.camera.y)*r.scale+r.anchorY}});
   await page.waitForFunction(()=>atriaV5.snapshot().player.moving);await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
  }
 }
 await guard('APP-001');
 for(const text of ['¿Dónde le duele al comer?','¿Cuánto le duele al comer?','¿Comer le empeora el dolor?']){
  await send(text);assert(!(await state()).patient.intentHistory.some(x=>x.id==='anorexia'),'pain questions cannot credit appetite');
 }
 let reply=await send('¿Dónde te duele y desde cuándo empezó?');
 assert.equal(reply.role,'patient');assert.match(reply.text,/derecha.*ocho horas/);
 await send('¿Y cómo es?');reply=await send('¿Y qué tan fuerte?');assert.match(reply.text,/7 de 10/);
 let app=(await state()).patient;assert(app.intentHistory.some(x=>x.id==='onset'));assert(app.intentHistory.some(x=>x.id==='migration'));
 assert.equal(app.lastVitalsKnown,null);assert.equal(app.examDone,false);assert.equal(app.reassessments,0);assert.deepEqual(app.treatments,[]);
 await send('¿Tiene apetito?');assert((await state()).patient.intentHistory.some(x=>x.id==='anorexia'));
 await send('¿Cómo te sentís ahora?');assert.equal((await state()).patient.reassessments,0);
 await page.locator('#peopleButton').click();await page.locator('[data-action="clinical-history"]').click();
 const chart=await page.locator('#fullClinicalHistory').innerText();assert.match(chart,/ALiCIA/);assert.match(chart,/ocho horas/);assert.match(chart,/7 de 10/);
 await page.screenshot({path:out+'/contextual-patient-history.png'});await page.locator('#modalClose').click();
 await page.locator('#recipientButton').click();await send('Vega, dame una pista');
 assert.equal((await state()).room.transcript.at(-1).recipient,'vega','explicit Vega overrides nurse focus');
 await send('Enfermera, hemograma');assert.equal((await state()).room.transcript.at(-1).recipient,'nurse');
 assert.equal((await state()).patient.orders.length,1);assert.deepEqual((await state()).patient.treatments,[]);
 await page.locator('#recipientButton').click();await page.locator('#recipientButton').click();
 reply=await send('¿Cuál es su planeta favorito?');assert.equal(reply.role,'patient');assert.doesNotMatch(reply.text,/No ejecutado/);
 const appUid=(await state()).patient.uid;
 await page.locator('#guardButton').click();assert.equal(await state(),null);await guard('CIRR-001');
 reply=await send('¿Tuvo fiebre?');assert.match(reply.text,/No tuve fiebre/);
 reply=await send('¿Y desde cuándo empezó?');assert.match(reply.text,/No tuve fiebre/);
 assert(!(await state()).patient.intentHistory.some(x=>x.id==='onset'));
 reply=await send('¿Desde cuándo empezó la hinchazón?');assert.match(reply.text,/varias semanas/);
 reply=await send('Hola doctor, ¿toma alcohol y qué medicación usa?');assert.match(reply.text,/Hola, doctor.*alcohol.*años.*presión/);
 const cirr=await state();assert.notEqual(cirr.patient.uid,appUid);assert.equal(cirr.patient.lastVitalsKnown,null);assert.deepEqual(cirr.patient.treatments,[]);
 assert.equal(new Set(cirr.messages.map(m=>m.id)).size,cirr.messages.length);
 await page.locator('#historyButton').click();await page.screenshot({path:out+'/contextual-global-dialogue.png'});
 await page.locator('#guardButton').click();assert.equal(await state(),null);assert.deepEqual(errors,[]);
 const report={test:'contextual-patient-dialogue',realBrowser:true,androidEmulated:true,physicalAndroid:false,
  compoundQuestions:true,shortFollowUps:true,symptomBoundDuration:true,caseScopedContext:true,acquiredHistory:true,
  greetingQuestionPreserved:true,painKeywordCollisionCovered:true,
  oneGlobalTranscript:true,explicitNpcOverridesFocus:true,noFakeAssessmentOrMedication:true,cleanLobbyReturn:true,errors};
 await fs.writeFile(out+'/patient-dialogue-summary.json',JSON.stringify(report,null,2));console.log('PATIENT DIALOGUE REAL UI PASS',JSON.stringify(report));await context.close();
}catch(error){if(page){await page.screenshot({path:out+'/patient-dialogue-failure.png'}).catch(()=>{});
 await fs.writeFile(out+'/patient-dialogue-failure.json',JSON.stringify({error:String(error),snapshot:await page.evaluate(()=>atriaV5.snapshot()).catch(()=>null)},null,2));}throw error;
}finally{await h.close();}
