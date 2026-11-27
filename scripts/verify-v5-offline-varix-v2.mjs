// Black-box pilot for the exact, self-contained VARIX-001 V2 file.
// Player clicks, chat, Reception, penalty and checkpoint: no injected care,
// no accelerated native clock and no secret case examination.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {clickHudAction} from '../qa/v5/hud-actions.mjs';
const {chromium,devices}=createRequire(import.meta.url)(process.env.ATRIA_PLAYWRIGHT_MODULE);
const combined=process.env.ATRIA_OFFLINE_COMBINED==='1';
const card=process.env.ATRIA_OFFLINE_CASE==='CARD-08';
const stroke=process.env.ATRIA_OFFLINE_CASE==='NEUR-01';
const caseId=stroke?'NEUR-01':card?'CARD-08':'VARIX-001';
const out=stroke?'out-solo-html/qa-lab-stroke':card?'out-solo-html/qa-lab-card':combined?'out-solo-html/qa-lab-varix':'out-solo-html/qa-varix-v2';await mkdir(out,{recursive:true});
const url=pathToFileURL(process.cwd()+'/out-solo-html/'+(combined?'ATRIA-5-V2-Laboratorio.html':'ATRIA-5-VARIX-V2-Experimental.html')).href;
const report={sourceSha:process.env.GITHUB_SHA||null,physicalAndroid:false,server:false,
 contentSource:'real downloaded HTML, not an injected application',scenarios:[]};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/google-chrome',headless:true});
try{for(const [name,options] of [['desktop',{viewport:{width:1150,height:820}}],['android-emulated',devices['Pixel 5']]]){
 const context=await browser.newContext(options),page=await context.newPage(),errors=[];let phase='boot';
 page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
 const snapshot=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
 const send=async text=>{
  const previous=(await snapshot()).room.transcript.length;
  await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type="submit"]').click();
  await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,previous);
  await page.locator('#dieInput').blur();
  if(await page.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')
   await page.locator('#keyboardToggleButton').click();
 };
 try{
  await page.goto(url);
  await page.waitForFunction(()=>['ready','failed'].includes(document.body.dataset.boot),null,{timeout:90000});
  assert.equal(await page.evaluate(()=>document.body.dataset.boot),'ready');
  assert.equal(await page.locator('meta[name="atria-clinical-revision"]').getAttribute('content'),combined?'all-v2-experimental':'varix-v2-experimental');
  if(report.sourceSha)assert.equal(await page.locator('meta[name="atria-source-sha"]').getAttribute('content'),report.sourceSha);
  phase='lobby';await page.locator('#enterButton').click();await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
  await clickHudAction(page,'guardButton');
  await page.locator('[data-mode="solo"]').click();
  await page.locator('input[name="guardScope"][value="specific"]').check();
  assert.equal(await page.locator('#caseChoice option').count(),55);
  await page.locator('#caseChoice').selectOption(caseId);
  await page.locator('[data-action="start-guard"]').click();await page.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
  const uid=(await snapshot()).patient.uid;assert.equal((await snapshot()).patient.caseId,caseId);
  assert((await snapshot()).patient.policyState,'the new native V2 physiology was not initialized');
  phase='recepcion';
  await clickHudAction(page,'receptionButton');
  await page.locator('[data-action="reception-approach"]').first().click();
  await page.waitForFunction(()=>{const s=atriaV5.snapshot(),p=s.entities.find(x=>x.kind==='patient');
   return p&&!s.player.moving&&Math.hypot(p.x-s.player.x,p.y-s.player.y)<100;},null,{timeout:90000});
  if(await page.locator('#patientWheel').isVisible())
   await page.locator('#patientWheel [data-patient-action="talk"]').click();
  phase='dialogue';await send(stroke?'¿Cómo iniciaron los síntomas?':card?'¿Tiene hipertensión?':'¿Tiene cirrosis?');
  const history=(await snapshot()).patient.intentHistory;
  assert(history.some(x=>x.patientUid===uid&&(stroke?x.id==='onset'&&/80 minutos/i.test(x.answer):
   card?x.id==='pmh'&&/hipertensi/i.test(x.answer):/cirrosis/i.test(x.answer))),JSON.stringify(history));
  phase='unsafe discharge';await send('/disposicion alta');
  assert.equal((await snapshot()).progress.penalties.length,1);
  assert.equal((await snapshot()).patient.caseEnded,false);
  await page.waitForFunction(()=>document.getElementById('guardScoreboard')?.textContent?.includes('Sanciones −15 XP'));
  await page.screenshot({path:out+'/'+name+'-debit.png'});
  phase='false endoscopy';
  const before=(await snapshot()).patient.orders.length;
  await send(stroke?'/estudio alteplase_stroke':card?'/estudio aortic_surgery':'/estudio g_varix_egd');
  assert.equal((await snapshot()).patient.orders.length,before,
   'legacy lab disguised as a finished endoscopy must not be available in V2');
  phase='real study';const studyId=stroke?'g_neur01_ct':card?'g_card08_cta':'g_varix_cbc';
  await send('/estudio '+studyId);
  assert((await snapshot()).patient.orders.some(x=>x.id===studyId));
  phase='save';await clickHudAction(page,'guardButton');await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
  await page.reload();await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#enterButton').click();await clickHudAction(page,'guardButton');
  await page.locator('[data-action="resume-local-guard"]').click();await page.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
  assert.equal((await snapshot()).patient.uid,uid);
  assert.equal((await snapshot()).progress.penalties.length,1);
  assert.equal((await snapshot()).patient.caseEnded,false);
  assert.deepEqual(errors,[]);report.scenarios.push({name,passed:true,uid,
   checked:['V2 source SHA','55 cases','visible Reception approach','native dialogue',
    'bad high-risk discharge debit',card?'no surgery-as-study':'no false endoscopy','real lab order',
    'save / reload / same patient / same penalty']});
 }catch(err){report.scenarios.push({name,passed:false,phase,error:String(err.stack||err),errors,
  clinical:await snapshot().catch(()=>null)});
  await page.screenshot({path:out+'/'+name+'-failed.png'}).catch(()=>{});
 }finally{await context.close();}
}}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
console.log('VARIX_V2_OFFLINE_BROWSER '+JSON.stringify(report.scenarios.map(x=>({name:x.name,passed:x.passed,phase:x.phase,error:x.error}))));
if(report.scenarios.length!==2||report.scenarios.some(x=>!x.passed))process.exitCode=1;
