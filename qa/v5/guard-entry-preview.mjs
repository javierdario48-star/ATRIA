import {clickHudAction,musicControl} from './hud-actions.mjs';
// Real Preview navigation with disposable QA identities. Credentials stay in
// memory; no cookies, tokens, auth state or request bodies enter the evidence.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
import {send} from './cooperative-ui.mjs';
import {waitForPreviewBuild} from './preview-build.mjs';

const origin=new URL(process.env.V5_BROWSER_URL).origin;
assert(origin.startsWith('https://night-shift-clinical-')&&origin.endsWith('.vercel.app'));
const output=process.env.V5_QA_OUTPUT||'qa/v5-guard-entry-results';await fs.mkdir(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.PLAYWRIGHT_MODULE_PATH||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling']});
const contexts=[],pages=[],errors=[],traffic=[],results=[];let stage='boot',applicationHash=null;
const suffix=Date.now().toString(36),password=randomBytes(24).toString('base64url');
const api=(p,path,body)=>p.evaluate(async({path,body})=>{
 const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 return {status:r.status,body:await r.json()};
},{path,body});
async function toggleMusic(p){const control=await musicControl(p);await control.action.click();await control.close();}
async function boot(mobile=false){
 const context=await browser.newContext(mobile?devices['Pixel 5']:{viewport:{width:1280,height:900}});contexts.push(context);
 const p=await context.newPage();pages.push(p);p.setDefaultTimeout(45000);
 p.on('pageerror',error=>errors.push(error.message));
 p.on('response',async response=>{
  if(new URL(response.url()).pathname!=='/api/clinical')return;
  const request=response.request();let action;try{action=request.postDataJSON()?.action;}catch{}
  const record={action,status:response.status()};
  if(response.status()!==200)try{const value=await response.json();record.error=value.error;record.code=value.code;}catch{}
  traffic.push(record);
 });
 await p.goto(origin);await p.waitForFunction(()=>document.body.dataset.boot==='ready');return p;
}
async function register(p,index){
 await p.locator('#doctorName').fill('QA Guardia '+index+' '+suffix);
 await p.locator('#welcomeNameForm button').click();await p.locator('#enterButton').click();
 await p.locator('#newDoctorPassword').fill(password);
 const response=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/account/register');
 await p.locator('#welcomePasswordForm button').click();assert.equal((await response).status(),200);
 await p.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&document.getElementById('splash').hidden);
}
async function choose(p,mode){
 await p.locator('#guardButton').click();await p.locator('[data-mode="'+mode+'"]').click();
 await p.locator('input[name="guardScope"][value="specific"]').check();await p.locator('#caseChoice').selectOption('CIRR-001');
}
async function entered(p,mode){
 await p.waitForFunction(mode=>atriaV5.snapshot().phase==='guard'&&atriaV5.snapshot().mode===mode&&
  atriaV5.diagnostics().cooperative.durable,mode,{timeout:30000});
 const value=await p.evaluate(()=>({patient:atriaV5.snapshot().clinical.patient,
  patients:atriaV5.snapshot().patients,frameErrors:atriaV5.diagnostics().frameErrors}));
 assert(value.patients.some(x=>x.uid===value.patient.uid),'the admitted patient is present in the rendered world');
 assert.equal(value.patient.caseId,'CIRR-001');
 const music=await musicControl(p);assert(await music.action.isVisible());await music.close();
 await p.waitForFunction(()=>atriaV5.diagnostics().audio.music.track==='classic');
 await toggleMusic(p);
 await p.waitForFunction(()=>atriaV5.diagnostics().audio.music.level===0);
 assert.equal(await p.evaluate(()=>atriaV5.diagnostics().audio.channels.monitor),true);
 await toggleMusic(p);
 await clickHudAction(p,'audioButton');await p.locator('[data-audio-screen="guard"]').selectOption('new');
 await p.locator('#modalClose').click();await p.waitForFunction(()=>atriaV5.diagnostics().audio.music.mix.new===1);
 await clickHudAction(p,'audioButton');await p.locator('[data-audio-screen="guard"]').selectOption('classic');await p.locator('#modalClose').click();
 return value.patient.uid;
}
async function interact(p,uid,mode){
 if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await p.locator('#keyboardToggleButton').click();
 await p.locator('#receptionButton').click();
 await p.locator('[data-action="reception-approach"][data-patient-uid="'+uid+'"]').click();
 await p.locator('#patientWheel').waitFor({state:'visible',timeout:60000});
 await p.locator('#patientWheel [data-patient-action="talk"]').click();
 await send(p,'¿Desde cuándo empezó la hinchazón?');
 await p.waitForFunction(()=>atriaV5.snapshot().clinical.messages.some(x=>x.role==='patient'));
 assert.equal(await p.evaluate(()=>atriaV5.snapshot().phase),'guard');
 await p.screenshot({path:output+'/'+mode+'-guard.png'});
 results.push({mode,patientVisible:true,realAccount:true,patientReplied:true,musicControls:true});
}
async function release(p){
 if(await p.evaluate(()=>atriaV5.snapshot().phase==='guard'))await p.locator('#guardButton').click();
 await p.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
 const r=await api(p,'account/release-guard',{});assert.equal(r.status,200);
 await p.reload();await p.waitForFunction(()=>document.body.dataset.boot==='ready');
 await p.locator('#welcomeContinue').click();await p.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
}
try{
 stage='wait for the checked-out Preview application';
 const verifiedFiles=await waitForPreviewBuild(origin);applicationHash=verifiedFiles['src/v5/app/application.js'];
 const host=await boot();stage='register host';await register(host,'A');
 for(const mode of ['solo','apprentice']){
  stage='enter '+mode;await choose(host,mode);await host.locator('[data-action="start-guard"]').click();
  const uid=await entered(host,mode);stage='interact '+mode;await interact(host,uid,mode);
  if(mode==='solo'){
   stage='resume an existing guard after dismissing its reminder';
   await host.reload();await host.waitForFunction(()=>document.body.dataset.boot==='ready');
   await host.locator('#welcomeContinue').click();await host.locator('[data-action="account-recover"]').waitFor({state:'visible'});
   await host.locator('[data-action="close"]').click();await host.locator('#guardButton').click();
   if(await host.locator('[data-action="account-recover"]').isVisible()){
    await host.locator('[data-action="account-recover"]').click();
   }else{
    // Reproduce the player's ordinary selection flow when the entry point
    // forgets the retained guard. The real server then rejects a second one.
    await host.locator('input[name="guardScope"][value="specific"]').check();await host.locator('#caseChoice').selectOption('CIRR-001');
    await host.locator('[data-action="start-guard"]').click();
   }
   assert.equal(await entered(host,'solo'),uid,'re-entry must retain the existing patient');
   results.push({retainedGuard:true,reminderDismissed:true,samePatient:true});
  }
  await release(host);
 }
 const guest=await boot(true);stage='register guest';await register(guest,'B');
 const guestName='QA Guardia B '+suffix;
 for(const mode of ['coop','competitive']){
  stage='invite '+mode;await host.waitForFunction(name=>atriaV5.snapshot().others.some(x=>x.name===name),guestName);
  await choose(host,mode);await host.locator('#coopDoctors label').filter({hasText:guestName}).locator('input').check();
  await host.locator('[data-action="start-guard"]').click();await guest.locator('#coopInviteNotice').waitFor({state:'visible'});
  await guest.locator('#coopInviteAccept').click();
  stage='enter '+mode;const uids=await Promise.all([host,guest].map(p=>entered(p,mode)));
  stage='interact '+mode;await interact(host,uids[0],mode);await release(host);await release(guest);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(output+'/results.json',JSON.stringify({passed:true,origin,applicationHash,verifiedFiles,physicalDevices:false,results,traffic,errors},null,2));
 console.log('ATRIA LIVE GUARD ENTRY PASS '+JSON.stringify({origin,applicationHash,results,errors}));
}catch(error){
 const diagnostics=await Promise.all(pages.map(async p=>{
  await p.screenshot({path:output+'/failure-'+pages.indexOf(p)+'.png'}).catch(()=>{});
  return p.evaluate(()=>({phase:atriaV5.snapshot().phase,mode:atriaV5.snapshot().mode,
   frameErrors:atriaV5.diagnostics().frameErrors,audio:atriaV5.diagnostics().audio,
   toast:document.getElementById('toast').textContent,modal:document.getElementById('modalContent').textContent,
   welcomeError:document.getElementById('welcomeError').textContent})).catch(()=>null);
 }));
 const report={passed:false,origin,stage,error:error.message,errors,traffic,diagnostics,results};
 await fs.writeFile(output+'/failure.json',JSON.stringify(report,null,2));console.error('ATRIA LIVE GUARD ENTRY FAIL '+JSON.stringify(report));throw error;
}finally{
 for(const p of pages){await api(p,'account/release-guard',{}).catch(()=>{});await api(p,'account/logout',{}).catch(()=>{});}
 for(const context of contexts)await context.close();await browser.close();
}
