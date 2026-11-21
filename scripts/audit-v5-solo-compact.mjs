// Platform-only end-to-end audit for the actual one-file ATRIA 5 HTML.
// Drives real page controls. Read-only diagnostics inspect the public client;
// the Playwright virtual clock is strictly confined to the admissions test.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const {chromium,devices}=createRequire(import.meta.url)(process.env.ATRIA_PLAYWRIGHT_MODULE);
const htmlPath=path.resolve('out-solo-html/ATRIA-5-Solitario.html');
const url=pathToFileURL(htmlPath).href;
const dest='out-solo-html/qa-platform';
await fs.mkdir(dest,{recursive:true});
const report={kind:'ATRIA 5 standalone HTML game platform',
 sourceSha:process.env.GITHUB_SHA||'unverified',browser:'Chrome',
 androidPhysical:false,server:'none',multiplayer:false,clinicalCaseCertification:false,
 checks:[],errors:[],screenshots:[],started:new Date().toISOString()};
let serial=0,activePage=null;
const safeName=s=>s.replace(/[^a-zA-Z0-9-]/g,'-').slice(0,65);
const record=async(name,fn,page=activePage)=>{
 const start=Date.now();
 try{
  const evidence=await fn();
  report.checks.push({name,status:'PASS',ms:Date.now()-start,...(evidence&&typeof evidence==='object'?evidence:{})});
  console.log('ATRIA PLATFORM PASS',name);
  return true;
 }catch(error){
  const entry={name,status:'FAIL',ms:Date.now()-start,error:String(error?.stack||error).slice(0,1200)};
  report.checks.push(entry);console.error('ATRIA PLATFORM FAIL',name,entry.error);
  if(page){try{
   const filename=String(++serial).padStart(2,'0')+'-'+safeName(name)+'.png';
   await page.screenshot({path:dest+'/'+filename,timeout:5000});
   report.screenshots.push(filename);
  }catch{}}
  return false;
 }
};
function wire(page,label){
 page.on('pageerror',e=>report.errors.push({device:label,kind:'pageerror',text:e.message}));
 page.on('console',m=>{if(m.type()==='error')report.errors.push({device:label,kind:'console',text:m.text().slice(0,320)});});
}
async function boot(browser,label,options,{clock=false}={}){
 const context=await browser.newContext(options),page=await context.newPage();
 activePage=page;wire(page,label);page.setDefaultTimeout(9500);
 if(clock)await page.clock.install();
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>document.body.dataset.boot==='ready',null,{timeout:90000});
 assert.equal(await page.locator('#fatal').isVisible(),false,'no fatal overlay');
 assert(await page.locator('#enterButton').isVisible(),'practice profile form must be visible');
 return {context,page};
}
async function openHudMenu(page){
 const menu=page.locator('#hudMenu');
 if(!await menu.evaluate(el=>el.open))await menu.locator('summary').click();
}
async function lobby(page){
 await page.locator('#enterButton').click();
 await page.waitForFunction(()=>window.atriaV5?.snapshot()?.phase==='lobby');
}
async function startGuard(page,{mode='solo',caseId='CIRR-001'}={}){
 await page.locator('#guardButton').click();
 await page.locator('[data-mode="'+mode+'"]').click();
 await page.locator('input[name="guardScope"][value="specific"]').check();
 await page.locator('#caseChoice').selectOption(caseId);
 await page.locator('[data-action="start-guard"]').click();
 await page.waitForFunction(()=>window.atriaV5?.snapshot()?.phase==='guard');
}
async function receptionCount(page){
 await page.locator('#receptionButton').click();
 const count=await page.locator('#modalContent .reception-patient').count();
 const lines=await page.locator('#modalContent .reception-patient small').allTextContents();
 await page.locator('#modalClose').click();
 return {count,lines:lines.filter(s=>s.includes('Ingreso min '))};
}
const browser=await chromium.launch({
 executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/google-chrome',
 headless:true,args:['--disable-dev-shm-usage']
});
try{
 for(const [label,options] of [
  ['desktop',{viewport:{width:1024,height:768}}],
  ['android-portrait',devices['Pixel 5']],
  ['android-landscape',{viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2}]
 ]){
  let context,page;
  try{
   ({context,page}=await boot(browser,label,options));
   await record(label+' welcome artwork',async()=>{
    const loaded=await page.locator('.welcome-art').evaluate(img=>img.complete&&img.naturalWidth>0);
    assert(loaded,'downloadable welcome image did not load');
   },page);
   await record(label+' avatar controls',async()=>{
    const old=await page.locator('#avatarColorName').innerText();
    await page.locator('#avatarNextColor').click();
    const next=await page.locator('#avatarColorName').innerText();
    assert.notEqual(next,old,'avatar color must change');
    await page.locator('#avatarPreviousColor').click();
    assert.equal(await page.locator('#avatarColorName').innerText(),old);
    await page.locator('[data-avatar-sex="female"]').click();
    assert.equal(await page.locator('[data-avatar-sex="female"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-avatar-sex="male"]').click();
   },page);
   await record(label+' title and lobby',async()=>{
    await lobby(page);
    assert(await page.locator('#hud').isVisible(),'hud must be visible');
    assert.equal(await page.evaluate(()=>atriaV5.diagnostics().raf),1,'exactly one animation loop');
   },page);
   await record(label+' music toggle',async()=>{
    const button=page.locator('#musicToggleButton');
    if(!await button.isVisible()){
     // Mobile hides the compact HUD music toggle; Audio menu stays available.
     assert((await page.evaluate(()=>innerWidth))<=600,'music toggle unexpectedly hidden on wide screen');
     return {compactHudMusicHidden:true};
    }
    const before=await button.getAttribute('aria-pressed');
    await button.click();
    assert.notEqual(await button.getAttribute('aria-pressed'),before,'music toggle must change');
   },page);
   await record(label+' profile panel and save',async()=>{
    await openHudMenu(page);
    await page.locator('#profileButton').click();
    assert(await page.locator('#modal').evaluate(el=>el.open));
    await page.locator('#aliasChoice').fill('Médico Auditor');
    await page.locator('[data-action="save-profile"]').click();
    await openHudMenu(page);
    await page.locator('#profileButton').click();
    assert.equal(await page.locator('#aliasChoice').inputValue(),'Médico Auditor');
    await page.locator('#modalClose').click();
   },page);
   await record(label+' audio panel',async()=>{
    await openHudMenu(page);
    await page.locator('#audioButton').click();
    assert(await page.locator('#modal').evaluate(el=>el.open));
    assert(await page.locator('#modalContent').innerText().then(t=>/Audio|audio|Música|música/.test(t)));
    await page.locator('#modalClose').click();
   },page);
   await record(label+' notifications and people',async()=>{
    await page.locator('#notificationsButton').click();
    assert(await page.locator('#modalContent').innerText().then(t=>t.includes('Personas')));
    await page.locator('#modalClose').click();
   },page);
   await record(label+' chat history and virtual keyboard',async()=>{
    const h=page.locator('#historyButton');
    await h.click();
    assert.equal(await h.getAttribute('aria-expanded'),'true');
    await h.click();
    assert.equal(await h.getAttribute('aria-expanded'),'false');
    const keyboard=page.locator('#keyboardToggleButton');
    const state=await keyboard.getAttribute('aria-pressed');
    await keyboard.click();
    assert.notEqual(await keyboard.getAttribute('aria-pressed'),state);
    await keyboard.click();
   },page);
   await record(label+' mode menu and solo guard',async()=>{
    await page.locator('#guardButton').click();
    await page.locator('input[name="guardScope"][value="specialty"]').check();
    assert(await page.locator('#guardSpecialtyField').isVisible(),'specialty selector missing');
    await page.locator('input[name="guardScope"][value="specific"]').check();
    assert(await page.locator('#guardCaseField').isVisible(),'specific case selector missing');
    await page.locator('[data-mode="solo"]').click();
    await page.locator('input[name="guardScope"][value="specific"]').check();
    await page.locator('#caseChoice').selectOption('CIRR-001');
    await page.locator('[data-action="start-guard"]').click();
    await page.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
    assert.equal(await page.evaluate(()=>atriaV5.snapshot().patients.length),1);
    assert(await page.locator('#receptionButton').isVisible(),'reception missing in active guard');
   },page);
   await record(label+' reception initial admission',async()=>{
    const state=await receptionCount(page);
    assert.equal(state.count,1,'one patient should be present at 0 real minutes');
    return {admissions:state.count};
   },page);
   await record(label+' reception navigation button',async()=>{
    await page.locator('#receptionButton').click();
    const target=page.locator('#modalContent [data-action="reception-approach"]').first();
    assert(await target.isEnabled(),'first patient not selectable');
    await target.click();
    assert.equal(await page.locator('#modal').evaluate(el=>el.open),false,'approach must close the modal');
    // Toast confirmation alone is not an actual arrival.
    await page.waitForFunction(()=>{
     const s=atriaV5.snapshot(),p=s.patients[0],d=Math.hypot(s.player.x-p.x,s.player.y-p.y);
     return d<=150||(!s.player.moving&&!s.player.target&&/No llegaste|No hay una ruta/.test(document.getElementById('toast').textContent));
    },null,{timeout:13000});
    const outcome=await page.evaluate(()=>{
     const s=atriaV5.snapshot(),p=s.patients[0];
     return {distance:Math.hypot(s.player.x-p.x,s.player.y-p.y),
      player:{x:s.player.x,y:s.player.y,moving:s.player.moving,target:s.player.target},
      patient:{x:p.x,y:p.y},toast:document.getElementById('toast').textContent};
    });
    assert(outcome.distance<=150,'Reception did not reach the actual patient bedside: '+JSON.stringify(outcome));
    return outcome;
   },page);
   await record(label+' patient action wheel and history',async()=>{
    await page.waitForFunction(()=>!document.getElementById('patientWheel').hidden,null,{timeout:13000});
    const wheel=page.locator('#patientWheel');
    assert(await wheel.locator('[data-patient-action="history"]').isVisible());
    await wheel.locator('[data-patient-action="history"]').click();
    assert(await page.locator('#modal').evaluate(el=>el.open),'patient history button did not open a dialog');
    await page.locator('#modalClose').click();
   },page);
   await record(label+' nurse and chat controls',async()=>{
    await page.locator('#nurseQuickButton').click();
    // A recently delivered automatic patient greeting can update the recipient
    // label on the same frame. The nurse shortcut must preserve its actual
    // outgoing "Enfermera," command prefix even during that transition.
    assert.match(await page.locator('#dieInput').inputValue(),/^Enfermera,s*/,'nurse shortcut must prepare the nurse command');
    const input=page.locator('#dieInput');
    await input.fill('Enfermera, hemograma');
    await page.locator('#chatForm [type="submit"]').click();
    assert.equal(await input.inputValue(),'','send must clear input');
    const before=await page.locator('#recipientButton').innerText();
    await page.locator('#recipientButton').click();
    assert.notEqual(await page.locator('#recipientButton').innerText(),before,'recipient button must switch its displayed target');
    assert.match(await page.locator('#chatHistory').innerText(),/Enfermera, hemograma/,'outgoing clinical message missing from history');
    const diagnostics=await page.evaluate(()=>atriaV5.diagnostics());
    assert.equal(diagnostics.raf,1,'app must continue rendering after nursing input');
   },page);
   await record(label+' clinical history button',async()=>{
    await openHudMenu(page);
    await page.locator('#peopleButton').click();
    assert(await page.locator('#modal').evaluate(el=>el.open),'history panel did not open');
    await page.locator('#modalClose').click();
   },page);
   await record(label+' lobby return and cleanup',async()=>{
    await page.locator('#guardButton').click();
    await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
    const d=await page.evaluate(()=>atriaV5.diagnostics());
    assert.equal(d.raf,1);
    assert.equal(d.frameErrors.count,0,'render errors: '+JSON.stringify(d.frameErrors.last));
    assert.equal(await page.locator('#receptionButton').isVisible(),false);
    return {frameErrors:d.frameErrors.count};
   },page);
  }catch(error){
   await record(label+' primary journey',()=>{throw error;},page);
  }finally{if(context)await context.close();}
 }
 // Time travel tests ONLY the real client and its own clock logic, not treatment speed.
 let context,page;
 try{
  ({context,page}=await boot(browser,'admissions-accelerated',{viewport:{width:1024,height:768}},{clock:true}));
  await lobby(page);await startGuard(page);
  await record('admissions start 0 minutes',async()=>{
   assert.equal((await receptionCount(page)).count,1);
  },page);
  // Fast-forward drives performance.now and the application's normal RAF.
  // No game code, server snapshots or clinical records are injected.
  const timetable=[[3,2],[7,3],[12,4],[17,5],[21,6]];
  let current=0;
  for(const [minutes,expected] of timetable){
   const passed=await record('admissions at '+minutes+' minutes',async()=>{
    await page.clock.fastForward((minutes-current)*60*1000);
    await page.clock.runFor(250);
    const result=await receptionCount(page);
    assert.equal(result.count,expected,'expected '+expected+' admissions at '+minutes+' minutes');
    return {expected,observed:result.count,arrivalLabels:result.lines};
   },page);
   current=minutes;
   if(!passed)break;
  }
  await record('guard finishes at 24 minutes',async()=>{
   await page.clock.fastForward((24-current)*60*1000);
   await page.clock.runFor(250);
   assert(await page.locator('[data-action="continue-shift"]').isVisible(),'continue shift not offered');
   assert(await page.locator('[data-action="save-shift"]').isVisible(),'save and leave not offered');
  },page);
  await record('continue another 24-minute guard and save',async()=>{
   await page.locator('[data-action="continue-shift"]').click();
   assert.equal(await page.evaluate(()=>atriaV5.snapshot().phase),'guard','continue must retain active guard');
   await page.clock.fastForward(24*60*1000);
   await page.clock.runFor(250);
   assert(await page.locator('[data-action="save-shift"]').isVisible(),'second turn must offer save and exit');
   await page.locator('[data-action="save-shift"]').click();
   await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
  },page);
 }catch(error){
  await record('admissions primary journey',()=>{throw error;},page);
 }finally{if(context)await context.close();}
}finally{
 await browser.close();
 report.completed=new Date().toISOString();
 report.summary={passed:report.checks.filter(c=>c.status==='PASS').length,
  failed:report.checks.filter(c=>c.status==='FAIL').length,
  browserErrors:report.errors.length,total:report.checks.length};
 await fs.writeFile(dest+'/report.json',JSON.stringify(report,null,2)+'\n');
 console.log('ATRIA PLATFORM AUDIT SUMMARY',JSON.stringify(report.summary));
}
assert.equal(report.summary.failed,0,'Platform audit failed; inspect qa-platform/report.json');
assert.equal(report.summary.browserErrors,0,'Platform browser errors; inspect qa-platform/report.json');
