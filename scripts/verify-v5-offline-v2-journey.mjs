// Actual downloaded HTML, file://, real controls and real browser time.
// evaluate() reads diagnostics only: no injected commands, clock or awards.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {clickHudAction} from '../qa/v5/hud-actions.mjs';
const {chromium,devices}=createRequire(import.meta.url)(process.env.ATRIA_PLAYWRIGHT_MODULE);
const out='out-solo-html/qa-v2-journey';await mkdir(out,{recursive:true});
const url=pathToFileURL(process.cwd()+'/out-solo-html/ATRIA-5-RESP01-V2-Experimental.html').href;
const report={sourceSha:process.env.GITHUB_SHA||null,source:'file:// self-contained HTML',
 acceleratedClock:false,physicalAndroid:false,server:false,scenarios:[]};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/google-chrome',headless:true});
try{for(const [name,options] of [['desktop',{viewport:{width:1120,height:800}}],['android-emulated',devices['Pixel 5']]]){
 const context=await browser.newContext(options),page=await context.newPage(),errors=[];let phase='boot';
 page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
 const send=async text=>{
  const n=(await state()).room.transcript.length;
  await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type="submit"]').click();
  await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,n);
  await page.locator('#dieInput').blur();
  if(await page.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await page.locator('#keyboardToggleButton').click();
 };
 try{
  await page.goto(url);await page.waitForFunction(()=>document.body.dataset.boot==='ready',null,{timeout:90000});
  assert.equal(await page.locator('meta[name="atria-clinical-revision"]').getAttribute('content'),'resp01-v2-experimental');
  if(report.sourceSha)assert.equal(await page.locator('meta[name="atria-source-sha"]').getAttribute('content'),report.sourceSha);
  await page.locator('#enterButton').click();await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
  await clickHudAction(page,'guardButton');await page.locator('[data-mode="solo"]').click();
  await page.locator('input[name="guardScope"][value="specific"]').check();await page.locator('#caseChoice').selectOption('RESP-01');
  assert.equal(await page.locator('#caseChoice option').count(),55,'55 unique cases remain available');
  await page.locator('[data-action="start-guard"]').click();await page.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
  const uid=(await state()).patient.uid;phase='reception';
  await page.locator('#receptionButton').click();await page.locator('[data-action="reception-approach"]').first().click();
  await page.waitForFunction(()=>{const s=atriaV5.snapshot(),e=s.entities.find(e=>e.kind==='patient');
   return !s.player.moving&&e&&Math.hypot(e.x-s.player.x,e.y-s.player.y)<100;},null,{timeout:90000});
  if(await page.locator('#patientWheel').isVisible())await page.locator('#patientWheel [data-patient-action="talk"]').click();
  phase='unsafe decision';await send('/disposicion alta');
  assert.equal((await state()).patient.caseEnded,false);assert.equal((await state()).progress.penalties.length,1);
  await page.waitForFunction(()=>document.getElementById('guardScoreboard')?.textContent?.includes('Sanciones −15 XP'));
  assert.match(await page.locator('#guardScoreboard').innerText(),/EXP neta/);
  // Ask a deliberately unrecognised question. A real user tap chooses a
  // question; the ordinary patient authority must provide the real answer.
  phase='patient follow-ups';await send('¿Cuál es la capital de Marte?');
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.messages.some(m=>
   m.role==='patient'&&m.text.includes('No entendí la pregunta')));
  const quick=page.locator('#chatHistory .chat-followups button');
  assert.deepEqual(await quick.allTextContents(),['Inicio','Síntomas','Antecedentes']);
  await quick.first().click();
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.intentHistory.some(e=>e.id==='onset'));
  assert.match((await state()).messages.filter(m=>m.role==='patient').at(-1).text,/tres días/i);
  await send('cómo iniciaron los síntomas');
  assert.match((await state()).messages.filter(m=>m.role==='patient').at(-1).text,/tres días/i);
  // The hint is displayed and charged through its actual patient menu.
  // A compact Android viewport can make canvas-center taps miss the patient.
  // Use the visible Reception > Approach action, never hidden DOM controls.
  const wheel=page.locator('#patientWheel');
  if(!await wheel.isVisible()){
   await clickHudAction(page,'receptionButton');
   await page.locator('[data-action="reception-approach"]').first().click();
  }
  await wheel.waitFor({state:'visible',timeout:30000});
  await page.screenshot({path:out+'/'+name+'-hint-wheel.png'});
  const hint=wheel.locator('[data-patient-action="hint"]');
  await hint.waitFor({state:'visible'});
  await hint.click();
  await page.locator('#vegaClinicalHint').waitFor({state:'visible'});await page.waitForFunction(()=>atriaV5.snapshot().clinical.hintCount===1);
  await page.locator('#vegaClinicalHint button').click();
  phase='real care';
  for(const text of ['¿Desde cuándo?','¿Antecedentes?','¿Tiene alergias?','¿Con quién vive?',
   '/monitor conectar','/examen general','/examen inspection','/examen auscultation','/examen percussion','/examen palpation',
   '/diagnostico neumonía adquirida en la comunidad','/estudio g_resp01_cxr'])await send(text);
  await send('Enfermera amoxicilina 1000 mg oral');
  phase='save pending nursing';await clickHudAction(page,'guardButton');
  await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
  const saved=await page.evaluate(()=>{
   const key=Object.keys(localStorage).find(k=>k.includes('resp01-v2-offline:atria.v5.local-guard.v1:'));
   return key?JSON.parse(localStorage.getItem(key)):null;});
  assert(saved,'explicit save must create a complete guard checkpoint');assert.equal(saved.focusedUid,uid);
  assert(saved.sessions[0].pendingNurseJobs.length>0||saved.sessions[0].patient.pendingTreatments.length>0,
   'save captures unfinished bedside travel or an already preparing treatment');
  assert(saved.world.nursing.tasks.length>0,'the physical nursing dispatcher must also be saved');
  phase='reload and resume';await page.reload();await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#enterButton').click();await clickHudAction(page,'guardButton');
  await page.locator('[data-action="resume-local-guard"]').click();await page.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
  const recovered=await state();assert.equal(recovered.patient.uid,uid);assert.equal(recovered.hintCount,1);
  assert.equal(recovered.progress.penalties.length,1);assert.equal(recovered.patient.diagnosis,saved.sessions[0].patient.diagnosis);
  phase='nursing confirmation';
  await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.administrationLog.some(x=>x.id==='amoxicillin'),null,{timeout:90000});
  // A seeded setback needs real oxygen administration and native recovery.
  // The doctor observes the patient and can still choose any destination.
  phase='native recovery';let oxygen=false;
  const deadline=Date.now()+240000;
  while(Date.now()<deadline){
   const s=await state();if(s.patient.patientDied)throw Error('unexpected death during competent bedside care');
   const active=(s.patient.policyState?.complications||[]).some(x=>x.status!=='recovered');
   if(active&&!oxygen){await send('Enfermera oxígeno 4 L/min');oxygen=true;}
   await send('/reevaluar');const current=await state();if(current.eligibleDestinations.includes('alta'))break;
   await page.waitForTimeout(2500);
  }
  const prepared=await state();assert(prepared.eligibleDestinations.includes('alta'),JSON.stringify(prepared.closure));
  assert(prepared.patient.orders.some(x=>x.id==='g_resp01_cxr'&&x.status==='done'&&x.result));
  phase='closure';await send('/disposicion alta');await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.caseEnded);
  const final=await state();assert.equal(final.patient.closure.destination,'alta');assert.equal(final.progress.receipts.length,1);
  assert.equal(final.progress.penalties.length,1);assert.equal(final.progress.xp,final.caseReward.xp-15);
  assert.match(await page.locator('#guardScoreboard').innerText(),/Sanciones −15 XP/);
  const debrief=await page.locator('#caseResult').innerText();
  assert.match(debrief,/Decisiones inseguras ya descontadas/);
  assert.match(debrief,/Balance neto de esta atención/);
  assert(debrief.includes('+'+String(final.caseReward.xp-15)+' XP'));
  assert.equal(final.patient.administrationLog.filter(x=>x.id==='amoxicillin').length,1,'pending nursing restore must not duplicate a dose');
  await page.screenshot({path:out+'/'+name+'-closed.png'});await page.locator('#modalClose').click();
  await clickHudAction(page,'guardButton');await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
  await page.reload();await page.waitForFunction(()=>document.body.dataset.boot==='ready');await page.locator('#enterButton').click();
  assert.match(await page.locator('#playerProgress').innerText(),new RegExp(String(final.progress.xp)));
  assert.deepEqual(errors,[]);report.scenarios.push({name,passed:true,patientUid:uid,sourceSha:report.sourceSha,
   savedPendingNursing:true,recoveredSamePatient:true,closed:true,destination:'alta',
   grossXP:final.patient.closure.xp,hintAdjustedXP:final.caseReward.xp,unsafeDebit:15,netXP:final.progress.xp,
   administrations:final.patient.administrationLog,complications:final.patient.policyState?.complications,
   controls:'avatar, mode, reception, movement, chat, history, exam, studies, medication, hint, save, recovery, closure, XP'});
 }catch(error){report.scenarios.push({name,passed:false,phase,error:String(error.stack||error),errors,
   clinical:await state().catch(()=>null)});
  await page.screenshot({path:out+'/'+name+'-failed.png'}).catch(()=>{});
 }finally{await context.close();}
}}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report.scenarios.map(x=>({name:x.name,passed:x.passed,phase:x.phase,error:x.error}))));
if(report.scenarios.length!==2||report.scenarios.some(x=>!x.passed))process.exitCode=1;
