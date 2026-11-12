// Opt-in live Preview journey: separate browser processes, real Auth/Postgres,
// public controls only. No injected clocks, checkpoints, cookies or treatments.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes,randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import {waitForPreviewBuild} from './preview-build.mjs';
import {clickHudAction} from './hud-actions.mjs';
import {walk,send} from './cooperative-ui.mjs';

const origin=new URL(process.env.V5_BROWSER_URL).origin;
assert(/^https:\/\/night-shift-clinical-[\w-]+\.vercel\.app$/.test(origin));
const output=process.env.V5_QA_OUTPUT||'qa/v5-live-shared-results';await fs.mkdir(output,{recursive:true});
const {chromium,devices}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const browsers=[],contexts=[],pages=[],actors=[],errors=[],wire=[],roomDenials=[];
const report={passed:false,preview:origin,browserProcesses:2,authenticated:true,liveSupabase:true,
 androidEmulation:'Pixel 5',physicalAndroid:false,acceleratedServerClock:false,real24MinuteRun:false,checks:[],timings:{}};
let stage='matching published source';
const suffix=Date.now().toString(36),password=randomBytes(24).toString('base64url');
const clinical=page=>page.evaluate(()=>atriaV5.snapshot().clinical);
const api=(page,path,body,token)=>page.evaluate(async({path,body,token})=>{
 const response=await fetch('/api/'+path,{method:body?'POST':'GET',
  headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,body:await response.json()};
},{path,body,token});
const check=(name,evidence={})=>{report.checks.push({name,...evidence});console.log('LIVE SHARED CHECK',name);};
async function dismiss(page){
 await page.keyboard.press('Escape');
 if(await page.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await page.locator('#keyboardToggleButton').click();
}
async function team(page,text,index,{peerPresent=true}={}){
 await page.locator('[data-guard-channel=team]').click();
 await page.locator('#dieInput').fill(text);
 const acknowledgement=page.waitForResponse(response=>{
  if(new URL(response.url()).pathname!=='/api/clinical'||response.status()!==200)return false;
  return response.request().postDataJSON()?.commands?.some(command=>command.channel==='team'&&command.text===text);
 });
 await page.locator('#chatForm [type=submit]').click();
 const response=await acknowledgement,value=await response.json(),at=Date.now();
 assert(value.acknowledgements.some(row=>row.channel==='team'&&row.status==='received'));
 if(!peerPresent)return null;
 const other=pages[1-index];await other.locator('[data-guard-channel=team]').click();
 await other.locator('#chatHistory .line').filter({hasText:text}).waitFor({state:'visible',timeout:15000});
 return Date.now()-at;
}
async function picture(name){for(const [index,page] of pages.entries())await page.screenshot({path:output+'/'+name+'-'+(index?'android':'desktop')+'.png'});}
async function save(page){
 await dismiss(page);await page.locator('#guardButton').click();
 await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
}
async function recover(page){
 await page.locator('#guardButton').click();await page.locator('[data-action=account-recover]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().phase==='guard'&&atriaV5.diagnostics().cooperative.durable);
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.shift.turn.actor.participating);
}
async function finishParticipation(page,roomId){
 const before=await api(page,'account/session');
 assert.equal(before.status,200);
 assert.equal(before.body.account.activeGuardId,roomId);
 await page.locator('#guardButton').click();
 const released=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/account/release-guard');
 await page.locator('[data-action=account-release]').click();
 const response=await released,result=await response.json();
 assert.equal(response.status(),200,result.error);
 assert.equal(result.account.activeGuardId,null);
 await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&!document.getElementById('modal').open);
}
async function reloadGuard(page,roomId){
 await page.reload();
 await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#welcomeContinue').click();
 await page.locator('[data-action=account-recover]').click();
 await page.waitForFunction(id=>atriaV5.snapshot().clinical?.room.roomId===id&&
  atriaV5.snapshot().clinical?.shift.turn.actor.participating,roomId);
}
async function register(page,index){
 await page.goto(origin);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#doctorName').fill('QA Compartida '+index+' '+suffix);await page.locator('#welcomeNameForm button').click();
 await page.locator('#enterButton').click();await page.locator('#newDoctorPassword').fill(password);
 const registered=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/account/register');
 await page.locator('#welcomePasswordForm button').click();assert.equal((await registered).status(),200);
 await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&document.getElementById('splash').hidden);
 const account=await api(page,'account/session');assert.equal(account.status,200);return account.body.account.actorId;
}
async function newContext(device){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
  args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling']});browsers.push(browser);
 const context=await browser.newContext(device);contexts.push(context);return context;
}
try{
 report.sourceFiles=Object.keys(await waitForPreviewBuild(origin));
 for(let index=0;index<2;index++){
  const context=await newContext(index?devices['Pixel 5']:{viewport:{width:1280,height:960}});
  const page=await context.newPage();pages.push(page);page.setDefaultTimeout(60000);
  page.on('pageerror',error=>errors.push({doctor:index,message:error.message}));
  page.on('response',async response=>{
   const path=new URL(response.url()).pathname;
   if(/^\/api\/rooms\/[^/]+\/messages$/.test(path)&&response.status()===403)roomDenials.push({doctor:index,path});
   if(path!=='/api/clinical')return;
   try{const request=response.request().postDataJSON(),value=await response.json();
    wire.push({doctor:index,at:Date.now(),action:request.action,status:response.status(),epoch:value.epoch,
     commands:(request.commands||[]).map(row=>({id:row.id,channel:row.channel||'clinical',patientUid:row.targetPatientUid})),
     acknowledgements:(value.acknowledgements||[]).map(row=>({commandId:row.commandId,status:row.status,reason:row.reason}))});
   }catch{}
  });
  actors.push(await register(page,index));
 }
 const [a,b]=pages,cookies=await Promise.all(contexts.map(context=>context.cookies()));
 assert.notEqual(actors[0],actors[1]);
 assert.notEqual(cookies[0].find(row=>row.name==='__Host-atria_v5').value,cookies[1].find(row=>row.name==='__Host-atria_v5').value);
 check('two independent browser processes hold distinct real authenticated sessions');
 stage='lobby and guard entry';
 await Promise.all(pages.map((page,index)=>page.waitForFunction(id=>atriaV5.snapshot().others.some(row=>row.id===id),actors[1-index])));
 const lobby='Coordinamos esta guardia '+suffix;await a.locator('#dieInput').fill(lobby);await a.locator('#chatForm [type=submit]').click();
 await b.locator('#chatHistory .line').filter({hasText:lobby}).waitFor({state:'visible'});
 await a.locator('#guardButton').click();await a.locator('[data-mode=coop]').click();
 await a.locator('input[name=guardScope][value=specific]').check();await a.locator('#caseChoice').selectOption('FECAL-001');
 await a.locator('#coopDoctors input[value="'+actors[1]+'"]').check();await a.locator('[data-action=start-guard]').click();
 await b.locator('#coopInviteNotice').waitFor({state:'visible'});await b.locator('#coopInviteAccept').click();
 await Promise.all(pages.map(page=>page.waitForFunction(()=>atriaV5.snapshot().phase==='guard'&&atriaV5.diagnostics().cooperative.durable)));
 const entryAt=Date.now(),initial=await clinical(a),roomId=initial.room.roomId,uid=initial.patient.uid;
 assert.equal((await clinical(b)).room.roomId,roomId);
 stage='first seconds team messages';
 const before=initial.patient.orders.length;
 report.timings.firstTeamAckToPeerDomMs=await team(a,'Yo reviso al paciente · '+suffix,0);
 report.timings.reverseTeamAckToPeerDomMs=await team(b,'Recibido; Enfermera, morfina 40 mg IV · '+suffix,1);
 report.timings.bidirectionalFromEntryMs=Date.now()-entryAt;
 assert.equal((await clinical(a)).patient.orders.length,before);
 assert.deepEqual((await clinical(a)).patient.administrationLog,[],'team speech cannot execute medicine');
 check('real lobby to guard transition delivers both team messages without clinical orders',report.timings);await picture('team');
 stage='shared clinical care';
 for(const page of pages){await page.locator('[data-guard-channel=clinical]').click();await dismiss(page);}
 await Promise.all(pages.map((page,index)=>walk(page,index?176:144,420)));
 for(const page of pages){await page.locator('#receptionButton').click();await page.locator('[data-action=reception-approach][data-patient-uid="'+uid+'"]').click();
  await page.waitForFunction(uid=>atriaV5.snapshot().clinical.shift.confirmedFocusPatientUid===uid,uid);await dismiss(page);}
 await send(a,'¿Desde cuándo empezó esto?');await send(b,'¿Tomás alguna medicación?');
 await send(a,'/examen general');await send(b,'Enfermera, hemograma');
 for(const page of pages)await page.locator('[data-guard-channel=activity]').click();
 await Promise.all(pages.map(page=>page.waitForFunction(()=>{
  const activity=atriaV5.snapshot().clinical.communication.activity;
  return activity.some(row=>row.kind==='exam')&&activity.some(row=>row.kind==='question')&&activity.some(row=>row.kind==='order');
 })));
 const activities=(await clinical(b)).communication.activity;
 assert(activities.every(row=>row.patientUid&&row.patientName&&row.actorName));
 check('both doctors see questions, answers, examinations and orders with physician and patient identity');await picture('activity');
 stage='save and recover while a colleague continues';
 const beforeSave=await clinical(a);await save(a);
 assert.equal((await api(a,'account/session')).body.account.activeGuardId,roomId);
 await b.waitForFunction(actor=>!atriaV5.snapshot().clinical.shift.turn.participantIds.includes(actor),actors[0]);
 await team(b,'Sigo en la guardia mientras volvés · '+suffix,1,{peerPresent:false});
 await recover(a);await a.locator('[data-guard-channel=team]').click();
 await a.locator('#chatHistory .line').filter({hasText:'Sigo en la guardia mientras volvés'}).waitFor({state:'visible'});
 const recovered=await clinical(a);assert.equal(recovered.room.roomId,roomId);assert.equal(recovered.patient.uid,beforeSave.patient.uid);
 assert.equal(recovered.patient.orders.length,beforeSave.patient.orders.length);
 assert.equal(new Set(recovered.patient.orders.map(row=>row.sourceEventId)).size,recovered.patient.orders.length);
 check('saving keeps the active guard, colleagues channel and original order identities on recovery');
 stage='guest and host reload';
 for(const page of [b,a]){
  await reloadGuard(page,roomId);
  assert.equal((await clinical(page)).patient.uid,uid);
  assert.equal((await api(page,'rooms/'+roomId+'/messages')).status,200);
 }
 assert.deepEqual(roomDenials,[],'accepted members never lose social access');
 check('guest and host reload in independent processes and recover the same patient and room');
 if(process.env.V5_REAL_TURN==='1'){
  stage='real 24 minute boundary';
  while(!(await clinical(a)).shift.ended){
   console.log('LIVE TURN',JSON.stringify({elapsed:(await clinical(a)).shift.turn.elapsedSeconds}));
   await new Promise(resolve=>setTimeout(resolve,30000));
  }
  await Promise.all(pages.map(page=>page.locator('[data-action=continue-shift]').waitFor({state:'visible'})));
  const end=await clinical(a);assert.equal(end.shift.elapsedSeconds,1440);
  await a.locator('[data-action=continue-shift]').click();
  await a.waitForFunction(()=>atriaV5.snapshot().clinical.shift.turn.actor.continued);
  assert.equal((await clinical(a)).shift.turn.number,1,'one doctor cannot consent for the other');
  await b.locator('[data-action=continue-shift]').click();
  await Promise.all(pages.map(page=>page.waitForFunction(()=>atriaV5.snapshot().clinical.shift.turn.number===2)));
  const next=await clinical(a);assert.equal(next.shift.turn.durationSeconds,1440);assert.equal(next.shift.turn.remainingSeconds<=1440,true);
  assert.deepEqual(next.shift.patients.map(row=>row.uid),end.shift.patients.map(row=>row.uid));
  assert.equal(next.room.roomId,roomId);report.real24MinuteRun=true;
  check('real 24 minute clock pauses for explicit cooperative consent and continues the same patients without a new reward');
 }
 await picture('continued');await save(a);await save(b);
 stage='finalize participation through recovery';
 for(const page of pages)await finishParticipation(page,roomId);
 check('both doctors confirm permanent participation release and return to the lobby');
 stage='room isolation, revocation and cleanup';
 const external=await (await newContext({viewport:{width:1100,height:800}})).newPage();
 await external.goto(origin);
 // A separate unclaimed social identity exercises the public member fence
 // without spending another persistent-account registration from this IP.
 const clientKey=randomUUID(),visitor=await api(external,'register',{clientKey,name:'QA Visitante '+suffix});
 assert.equal(visitor.status,200);const token=visitor.body.token;
 const path='rooms/'+roomId;
 assert.equal((await api(external,path+'/messages')).status,401);
 assert.equal((await api(external,path+'/messages',undefined,token)).status,403);
 assert.equal((await api(external,'rooms/join',{roomId},token)).status,403);
 assert.equal((await api(external,'clinical',{action:'observe',roomId,clientKey},token)).status,403);
 assert.equal((await api(external,'rooms/'+randomUUID()+'/messages',undefined,token)).status,404);
 assert.equal((await api(b,path+'/leave',{})).status,200);
 assert.equal((await api(b,path+'/messages')).status,403);
 assert.equal((await api(b,'rooms/join',{roomId})).status,403);
 assert.equal((await api(a,path+'/messages')).status,200);
 assert.equal((await api(a,path+'/cancel',{})).status,200);
 assert.equal((await api(a,path+'/messages')).status,404);
 for(const page of pages)assert.equal((await api(page,'account/logout',{})).status,200);
 assert.deepEqual(errors,[]);
 check('authenticated outsider, revoked guest and closed room retain 401/403/404 boundaries');
 report.passed=true;report.errors=errors;
 await fs.writeFile(output+'/summary.json',JSON.stringify(report,null,2)+'\n');
 console.log('LIVE SHARED GUARD PASS',JSON.stringify(report));
}catch(error){
 report.stage=stage;report.error=error.message;report.errors=errors;
 await picture('failure').catch(()=>{});await fs.writeFile(output+'/summary.json',JSON.stringify(report,null,2)+'\n');throw error;
}finally{
 await fs.writeFile(output+'/transport.json',JSON.stringify(wire,null,2)+'\n');
 for(const context of contexts)await context.close().catch(()=>{});
 for(const browser of browsers)await browser.close().catch(()=>{});
}
