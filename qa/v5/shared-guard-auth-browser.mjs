// Two independent Chromium processes and authenticated, isolated accounts.
// All care and movement enter through public UI. SQLite only replaces the
// private durable CAS adapter; no checkpoint, physiology or actor is injected.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
import {accountGatewayFixture} from './account-fixture.mjs';
import {clickHudAction} from './hud-actions.mjs';
import {state,clinical,send,walk,study} from './cooperative-ui.mjs';

const output=process.env.V5_QA_OUTPUT||'/tmp/atria-shared-guard-auth';
await fs.mkdir(output,{recursive:true});
let clockOffsetMs=0,stage='boot',roomId=null;
const fixture=accountGatewayFixture(),h=await browserHarness({accounts:fixture,durable:true,apiLatency:40,now:()=>Date.now()+clockOffsetMs});
const browsers=[h.browser,await h.newBrowser()],contexts=[],pages=[],errors=[],wire=[],releases=[];
const names=['Doctora Alba QA','Doctor Bruno QA'],actors=[];
const report={passed:false,browserProcesses:2,independentStorage:true,authenticated:true,
 desktop:{width:1280,height:960},androidEmulation:'Pixel 5',physicalAndroid:false,
 durableAdapter:'local SQLite CAS with account/session gate',liveSupabase:false,
 acceleratedServerClock:true,real24MinuteRun:false,checks:[],timings:{}};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function waitGate(gate,message){
 let timeout;
 try{return await Promise.race([gate.promise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error(message)),60000);})]);}
 finally{clearTimeout(timeout);}
}
const faults=[null,null];
async function until(test,message,timeout=60000){
 const deadline=Date.now()+timeout;
 while(!await test()){assert(Date.now()<deadline,message);await new Promise(resolve=>setTimeout(resolve,40));}
}
function check(name,evidence={}){report.checks.push({name,...evidence});console.log('SHARED GUARD CHECK',name);}
async function dismiss(page){
 await page.keyboard.press('Escape');
 if(await page.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await page.locator('#keyboardToggleButton').click();
 if(await page.locator('#hudMenu').getAttribute('open')!==null)await page.locator('#hudMenu > summary').click();
}
async function submit(page,text){
 await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type=submit]').click();await page.locator('#dieInput').blur();
}
async function channel(page,name){await page.locator('[data-guard-channel='+name+']').click();}
async function teamPresent(page,text){await page.waitForFunction(text=>atriaV5.snapshot().clinical.communication.team.some(row=>row.text===text),text);}
async function choose(page,uid,{confirmed=true}={}){
 await dismiss(page);
 const point=await page.evaluate(uid=>{
  const p=atriaV5.snapshot().patients.find(row=>row.uid===uid),r=atriaV5.diagnostics().renderer,b=document.getElementById('game').getBoundingClientRect();
  if(!p)throw Error('patient absent from physical world');
  const x=b.x+(p.x-r.camera.x)*r.scale+r.anchorX,y=b.y+(p.y-r.camera.y)*r.scale+r.anchorY;
  return {x,y,hit:document.elementFromPoint(x,y)?.id};
 },uid);
 assert.equal(point.hit,'game','patient canvas target must be physically visible');
 await page.mouse.click(point.x,point.y);
 if(confirmed)await page.waitForFunction(uid=>{
  const c=atriaV5.snapshot().clinical;return c.patient.uid===uid&&c.shift.confirmedFocusPatientUid===uid;
 },uid);
}
async function boot(page){await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');}
async function recover(page){
 await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#welcomeContinue').click();
 await page.locator('[data-action=account-recover]').click();
 await page.waitForFunction(roomId=>atriaV5.snapshot().phase==='guard'&&atriaV5.snapshot().clinical?.room.roomId===roomId,roomId);
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.shift.turn.actor.participating);
}
const sessions=guard=>[[guard.runtime.session.patient.uid,guard.runtime.session],...(guard.runtime.sessions||[])];
const commands=guard=>sessions(guard).flatMap(([uid,session])=>(session.authority.transcript||[]).map(row=>({uid,...row})));
const administrations=guard=>sessions(guard).flatMap(([uid,session])=>(session.patient.administrationLog||[]).map(row=>({uid,...row})));
const fingerprint=guard=>({
 patients:guard.runtime.shift.records.map(row=>row.uid),
 commands:commands(guard).map(row=>[row.uid,row.actorId,row.id,row.text]),
 administrations:administrations(guard).map(row=>[row.uid,row.actorId,row.sourceEventId,row.id,row.dose]),
 team:guard.runtime.communication.team.map(row=>[row.id,row.actorId,row.text])
});
async function screenshot(label){for(const [index,page] of pages.entries())await page.screenshot({path:output+'/'+label+'-'+(index?'pixel':'desktop')+'.png'});}

try{
 for(const [index,browser] of browsers.entries()){
  const context=await browser.newContext(index?h.devices['Pixel 5']:{viewport:report.desktop});contexts.push(context);
  await context.route('**/api/clinical',async route=>{
   const body=route.request().postDataJSON(),fault=faults[index];
   const command=body?.commands?.find(row=>row.text===fault?.text);
   if(!fault||fault.used||!command)return route.continue();
   fault.used=true;fault.commandId=command.id;fault.entered.resolve();
   if(fault.kind==='hold-before-commit'){
    await fault.release.promise;return route.continue().catch(()=>{});
   }
   const response=await route.fetch(),value=await response.json();
   const ack=value.acknowledgements?.find(row=>row.commandId===command.id&&row.status==='received');
   if(response.status()!==200||!ack){fault.used=false;return route.fulfill({response});}
   fault.ack=ack;fault.committed.resolve();await fault.release.promise;
   return route.abort('failed').catch(()=>{});
  });
  const page=await context.newPage();pages.push(page);page.setDefaultTimeout(60000);
  page.on('pageerror',error=>errors.push({doctor:index,message:error.message}));
  page.on('response',async response=>{
   if(new URL(response.url()).pathname!=='/api/clinical')return;
   const receivedAt=Date.now();
   try{const value=await response.json(),request=response.request().postDataJSON();
    wire.push({doctor:index,at:receivedAt,action:request.action,status:response.status(),epoch:value.epoch,
     commands:(request.commands||[]).map(row=>({id:row.id,patientUid:row.targetPatientUid,channel:row.channel||'clinical'})),
     acknowledgements:(value.acknowledgements||[]).map(row=>({commandId:row.commandId,patientUid:row.patientUid,channel:row.channel||'clinical',status:row.status,reason:row.reason})),
     ...(value.shiftAcknowledgement?{shiftAcknowledgement:value.shiftAcknowledgement}:{})});
   }catch{}
  });
  await boot(page);assert.equal(await context.cookies().then(rows=>rows.length),0,'fresh browser must start without another session');
  await page.locator('#doctorName').fill(names[index]);await page.locator('#welcomeNameForm button').click();
  await page.locator('[data-avatar-sex='+(!index?'female':'male')+']').click();await page.locator('#enterButton').click();
  await page.locator('#newDoctorPassword').fill('safe-test-password-123');await page.locator('#welcomePasswordForm button').click();
  await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&document.getElementById('splash').hidden);
  actors.push(await page.evaluate(async()=>(await (await fetch('/api/account/session')).json()).account.actorId));
 }
 const [a,b]=pages;
 const cookies=await Promise.all(contexts.map(context=>context.cookies()));
 assert.notEqual(cookies[0].find(row=>row.name==='__Host-atria_v5').value,cookies[1].find(row=>row.name==='__Host-atria_v5').value);
 assert.notEqual(actors[0],actors[1]);assert.equal(fixture.sessions.size,2);
 assert.notEqual(await a.evaluate(()=>localStorage.getItem('atria.v5.social.client')),await b.evaluate(()=>localStorage.getItem('atria.v5.social.client')));
 check('two separately launched Chromium processes hold independent authenticated accounts');

 stage='lobby to authenticated cooperative guard';
 await Promise.all(pages.map((page,index)=>page.waitForFunction(name=>atriaV5.snapshot().others.some(row=>row.name===name),names[1-index])));
 await a.locator('#guardButton').click();await a.locator('[data-mode=coop]').click();
 await a.locator('input[name=guardScope][value=specific]').check();await a.locator('#caseChoice').selectOption('PERI-PBE-001');
 await a.locator('#coopDoctors label').filter({hasText:names[1]}).locator('input').check();await a.locator('[data-action=start-guard]').click();
 await b.locator('#coopInviteNotice').waitFor({state:'visible'});await b.locator('#coopInviteAccept').click();
 await Promise.all(pages.map(page=>page.waitForFunction(()=>atriaV5.snapshot().phase==='guard'&&atriaV5.diagnostics().cooperative.durable)));
 const enteredAt=Date.now(),initial=await Promise.all(pages.map(clinical));roomId=initial[0].room.roomId;
 assert.equal(initial[1].room.roomId,roomId);assert.equal(initial[1].patient.uid,initial[0].patient.uid);
 for(const page of pages)assert.equal(await page.evaluate(()=>atriaV5.diagnostics().cooperative.authority),false);
 assert([...fixture.rows.values()].every(account=>account.active_guard_id===roomId&&account.controller_session_id));
 check('accepted authenticated room admits both members through one durable authority',{roomId});

 stage='initial seconds team bidirectionality and pending acknowledgement';
 await Promise.all(pages.map(page=>channel(page,'team')));
 const first='Equipo inicial: Enfermera ceftriaxona 1 g y monitor';
 const held={kind:'hold-before-commit',text:first,entered:deferred(),release:deferred()};faults[0]=held;releases.push(held.release.resolve);
 const firstAt=Date.now();report.timings.firstTeamSubmissionFromEntryMs=firstAt-enteredAt;
 assert(report.timings.firstTeamSubmissionFromEntryMs<5000,'the first team input must be sent within five seconds of entering the guard');
 await submit(a,first);await waitGate(held.entered,'initial team message did not enter the HTTP transport');
 await a.locator('#chatHistory [data-message-id="pending:'+held.commandId+'"]').waitFor({state:'visible'});
 assert(!(await clinical(b)).communication.team.some(row=>row.text===first),'unconfirmed local message must not be presented as server-confirmed to a peer');
 assert.equal((await h.readGuard(roomId)).runtime.communication.team.length,0);
 held.release.resolve();await Promise.all(pages.map(page=>teamPresent(page,first)));
 await b.locator('#chatHistory .line').filter({hasText:first}).waitFor({state:'visible'});
 const firstDomAt=Date.now();
 await until(()=>wire.some(row=>row.doctor===0&&row.acknowledgements.some(ack=>ack.commandId===held.commandId)),'sender team ACK was not observed');
 report.timings.firstTeamAckToOtherDomMs=firstDomAt-wire.find(row=>row.doctor===0&&row.acknowledgements.some(ack=>ack.commandId===held.commandId)).at;
 report.timings.firstTeamConfirmedMs=Date.now()-firstAt;assert(report.timings.firstTeamConfirmedMs<10000);
 const reply='Equipo inicial recibido por Bruno',replyAt=Date.now();await submit(b,reply);
 await Promise.all(pages.map(page=>teamPresent(page,reply)));report.timings.reverseTeamConfirmedMs=Date.now()-replyAt;
 await a.locator('#chatHistory .line').filter({hasText:reply}).waitFor({state:'visible'});const replyDomAt=Date.now();
 const replyId=(await clinical(b)).communication.team.find(row=>row.text===reply).commandId;
 await until(()=>wire.some(row=>row.doctor===1&&row.acknowledgements.some(ack=>ack.commandId===replyId)),'reply team ACK was not observed');
 report.timings.reverseTeamAckToOtherDomMs=replyDomAt-wire.find(row=>row.doctor===1&&row.acknowledgements.some(ack=>ack.commandId===replyId)).at;
 assert(report.timings.reverseTeamConfirmedMs<10000);report.timings.bidirectionalFromGuardEntryMs=Date.now()-enteredAt;
 // The first message is deliberately held before commit above, while the
 // test reads the separate browser and durable store. Measure delivery from
 // the server acknowledgement; that injected precommit delay is not latency.
 assert(report.timings.firstTeamAckToOtherDomMs<5000,'the initial committed message must reach the peer promptly');
 assert(report.timings.reverseTeamAckToOtherDomMs<5000,'the initial committed reply must reach the peer promptly');
 // Probe the rejected legacy path after measuring real first-contact chat;
 // an adversarial extra request is not part of a doctor's lobby transition.
 const legacyKey=await a.evaluate(()=>localStorage.getItem('atria.v5.social.client'));
 const bypass=await fetch(h.url+'/api/clinical',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync',roomId,clientKey:legacyKey})});
 assert.equal(bypass.status,401,'claimed account cannot fall back to its legacy client key');
 check('a claimed account cannot bypass authentication with its old device key',{legacyKeyDenied:true});
 for(const page of pages){
  assert.equal(await page.locator('#chatHistory .line').filter({hasText:first}).count(),1);
  assert.equal(await page.locator('#chatHistory .line').filter({hasText:reply}).count(),1);
  assert.equal(await page.locator('#chatHistory [data-message-id^="pending:"]').count(),0);
 }
 const teamOnly=await h.readGuard(roomId);
 assert.equal(commands(teamOnly).length,0);assert.equal(administrations(teamOnly).length,0);assert.equal(teamOnly.runtime.session.patient.orders.length,0);
 assert.equal(teamOnly.runtime.session.hints.displays?.length||0,0);
 check('first seconds bidirectional team chat shows pending then one durable acknowledgement',{...report.timings,teamCreatedClinicalOrders:false});
 await screenshot('initial-team');

 stage='physical bedside and simultaneous care by two doctors';
 await Promise.all(pages.map(dismiss));await Promise.all([walk(a,144),walk(b,176)]);
 const uidA=initial[0].patient.uid;
 await Promise.all(pages.map(page=>choose(page,uidA)));await Promise.all(pages.map(dismiss));
 await Promise.all([send(a,'¿Tuvo fiebre?'),send(b,'¿Desde cuándo empezó el dolor?')]);
 for(const page of pages)await page.waitForFunction(({actors,uid})=>{
  const rows=atriaV5.snapshot().clinical.communication.activity;
  return actors.every(actor=>rows.some(row=>row.actorId===actor&&row.patientUid===uid&&row.kind==='question'));
 },{actors,uid:uidA});
 await clickHudAction(a,'peopleButton');await a.locator('[data-action=examination]').click();await a.locator('#examRegions [data-exam-region=general]').click();await a.locator('#modalClose').click();
 await clickHudAction(b,'peopleButton');await b.locator('[data-action=examination]').click();await b.locator('#examRegions [data-exam-region=abdomen]').click();
 await b.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings?.abdomen?.palpation);await b.locator('#modalClose').click();
 const jointlyExamined=await clinical(b);
 assert.equal(jointlyExamined.shift.patients.find(row=>row.uid===uidA).ownerId,null,'cooperative bedside care must not assign an exclusive owner');
 assert(actors.every(actor=>jointlyExamined.communication.activity.some(row=>row.actorId===actor&&row.patientUid===uidA&&row.kind==='exam')));
 check('two doctors concurrently question and examine the same physical patient without exclusive ownership',{patientUid:uidA,authors:actors});
 await send(b,'Enfermera monitor');

 stage='lost committed medication acknowledgement and browser reconnection';
 const lost={kind:'drop-after-commit',text:'Enfermera ceftriaxona 1 g',entered:deferred(),committed:deferred(),release:deferred()};faults[0]=lost;releases.push(lost.release.resolve);
 await submit(a,lost.text);await waitGate(lost.committed,'medication did not receive a committed acknowledgement before response loss');
 const committed=await h.readGuard(roomId),originalCommand=commands(committed).filter(row=>row.actorId===actors[0]&&row.id===lost.commandId);
 assert.equal(originalCommand.length,1);assert.equal(lost.ack.patientUid,uidA);
 await a.locator('#chatHistory [data-message-id="pending:'+lost.commandId+'"]').waitFor({state:'visible'});
 const reloading=a.reload();lost.release.resolve();await reloading;await recover(a);
 await a.waitForFunction(id=>!JSON.parse(sessionStorage.getItem('atria.v5.durable.pending:'+atriaV5.snapshot().clinical.room.roomId)||'[]').some(row=>row.id===id),lost.commandId);
 await choose(a,uidA);await dismiss(a);await study(b,'pbe_renal');
 await send(a,'Enfermera albumina 1.5 g/kg');
 await until(async()=>administrations(await h.readGuard(roomId)).some(row=>row.id==='ceftriaxone'),'physical nursing did not produce ceftriaxone administration',75000);
 const afterReconnect=await h.readGuard(roomId),once=commands(afterReconnect).filter(row=>row.actorId===actors[0]&&row.id===lost.commandId);
 assert.equal(once.length,1);
 const ceftriaxone=administrations(afterReconnect).filter(row=>row.id==='ceftriaxone');assert.equal(ceftriaxone.length,1);
 assert.equal(new Set(administrations(afterReconnect).map(row=>row.sourceEventId)).size,administrations(afterReconnect).length);
 check('lost HTTP response after a committed order survives reload with one command and one physical dose',{commandId:lost.commandId,patientUid:uidA,administrations:ceftriaxone.length});

 stage='accelerated authoritative admission and cross-patient activity';
 clockOffsetMs+=181000;
 await Promise.all(pages.map(page=>page.waitForFunction(()=>atriaV5.snapshot().clinical.shift.patients.length>=2,null,{timeout:90000})));
 await until(async()=>((await h.readGuard(roomId)).runtime.pendingQuanta||0)<1000,'server runtime catch-up did not settle',90000);
 const uidB=(await clinical(a)).shift.patients[1].uid;
 await choose(b,uidB);await dismiss(b);await send(b,'¿Tiene alergias a medicamentos?');
 const secondQuestion=(await clinical(b)).communication.activity.find(row=>row.kind==='question'&&row.actorId===actors[1]&&row.patientUid===uidB);
 assert(secondQuestion,'the authenticated sender must receive its second-patient question');
 await Promise.all(pages.map(page=>page.waitForFunction(id=>atriaV5.snapshot().clinical.communication.activity.some(row=>row.id===id),secondQuestion.id,{timeout:5000})));
 await b.waitForFunction(()=>atriaV5.snapshot().clinical.communication.activity.some(row=>row.kind==='result'),null,{timeout:75000});
 await Promise.all(pages.map(page=>channel(page,'activity')));
 await a.locator('#chatHistory [data-message-id]').filter({hasText:'¿Tiene alergias a medicamentos?'}).waitFor({state:'visible'});
 const activityDomAt=Date.now();
 await until(()=>wire.some(row=>row.doctor===1&&row.acknowledgements.some(ack=>ack.commandId===secondQuestion.commandId)),'second-patient activity ACK was not observed');
 report.timings.activityAckToOtherDomMs=activityDomAt-wire.find(row=>row.doctor===1&&row.acknowledgements.some(ack=>ack.commandId===secondQuestion.commandId)).at;
 assert(report.timings.activityAckToOtherDomMs<5000,'a shared activity entry must reach the other doctor within five seconds');
 const activity=(await clinical(a)).communication.activity;
 assert(activity.some(row=>row.kind==='question'&&row.actorId===actors[0]&&row.patientUid===uidA));
 assert(activity.some(row=>row.kind==='question'&&row.actorId===actors[1]&&row.patientUid===uidB));
 for(const kind of ['answer','exam','order','result','administration'])assert(activity.some(row=>row.kind===kind),'missing shared clinical activity kind '+kind);
 assert(activity.every(row=>row.actorName&&row.patientName&&row.bedId&&row.patientUid));
 for(const [index,page] of pages.entries()){
  const text=await page.locator('#chatHistory').innerText();assert(text.includes(names[0])&&text.includes(names[1]));
  assert(text.includes('B1')&&text.includes('B2'));assert(await page.locator('#dieInput').isDisabled());
  const ids=await page.locator('#chatHistory [data-message-id]').evaluateAll(rows=>rows.map(row=>row.dataset.messageId));
  assert.equal(new Set(ids).size,ids.length,'shared activity UI must not duplicate source rows');
 }
 check('shared activity includes both authors, patients, answers, exams, orders, results and physical administrations',{patients:[uidA,uidB],kinds:[...new Set(activity.map(row=>row.kind))],ackToOtherDomMs:report.timings.activityAckToOtherDomMs});
 await screenshot('shared-activity');

 stage='rapid physical patient selection A B A B and bound orders';
 await channel(a,'clinical');await choose(a,uidB);await dismiss(a);await choose(a,uidA);await dismiss(a);
 const switches=[];
 for(const uid of [uidB,uidA,uidB,uidA,uidB]){
  const started=Date.now();await choose(a,uid,{confirmed:false});
  await a.waitForFunction(uid=>atriaV5.snapshot().clinical.patient.uid===uid,uid,{timeout:10000});
  switches.push({uid,presentedMs:Date.now()-started});
 }
 await dismiss(a);const boundAt=wire.length;await send(a,'¿Qué medicamentos toma todos los días?');
 await until(()=>wire.slice(boundAt).some(row=>row.commands.some(command=>command.patientUid===uidB)),
  'the rapid-selection question must carry the selected patient UID');
 const bound=wire.slice(boundAt).flatMap(row=>row.commands).find(row=>row.patientUid===uidB);
 assert(bound,'the rapid-selection question must carry the selected patient UID');
 const selected=await clinical(a);assert.equal(selected.patient.uid,uidB);
 assert(selected.room.transcript.some(row=>row.actorId===actors[0]&&row.text==='¿Qué medicamentos toma todos los días?'));
 const raw=await h.readGuard(roomId);
 assert.equal(commands(raw).filter(row=>row.text==='¿Qué medicamentos toma todos los días?'&&row.uid===uidA).length,0);
 check('rapid A B switches retain final patient and send the real question to that patient',{switches});

 stage='save exit preserves guard and original peer room';
 await dismiss(a);const beforeSave=fingerprint(await h.readGuard(roomId));
 await a.locator('#guardButton').click();await a.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
 const accountA=[...fixture.rows.values()].find(row=>row.actor_id===actors[0]);assert.equal(accountA.active_guard_id,roomId);
 await b.waitForFunction(actor=>atriaV5.snapshot().clinical.shift.turn.leftIds.includes(actor),actors[0]);
 await a.locator('#guardButton').click();await a.locator('[data-action=account-recover]').click();
 await a.waitForFunction(()=>atriaV5.snapshot().phase==='guard'&&atriaV5.snapshot().clinical.shift.turn.actor.participating);
 assert.deepEqual(fingerprint(await h.readGuard(roomId)),beforeSave);
 await channel(a,'team');await channel(b,'team');const recoveredTeam='Equipo confirmado después de guardar y retomar';
 await submit(a,recoveredTeam);await Promise.all(pages.map(page=>teamPresent(page,recoveredTeam)));
 check('save and explicit recovery preserve patients, clinical receipts and original team room');

 stage='accelerated 24 minute boundary and cooperative continuation';
 report.clockAdvanceMs=clockOffsetMs+1440000;clockOffsetMs+=1440000;
 await Promise.all(pages.map(page=>page.waitForFunction(()=>atriaV5.snapshot().clinical.shift.ended&&atriaV5.snapshot().clinical.shift.turn.status==='decision',null,{timeout:180000})));
 const boundary=await h.readGuard(roomId),boundaryFingerprint=fingerprint(boundary);
 assert.equal(boundary.runtime.shift.elapsedSeconds,1440);assert.equal(boundary.runtime.shift.durationSeconds,1440);
 await a.locator('[data-action=continue-shift]').click();
 await a.waitForFunction(actor=>atriaV5.snapshot().clinical.shift.turn.continuedIds.includes(actor),actors[0]);
 assert.equal((await clinical(a)).shift.turn.number,1,'one physician cannot extend a shared shift alone');
 await b.locator('[data-action=continue-shift]').click();
 await Promise.all(pages.map(page=>page.waitForFunction(()=>atriaV5.snapshot().clinical.shift.turn.number===2&&!atriaV5.snapshot().clinical.shift.ended)));
 const continued=await h.readGuard(roomId);assert.equal(continued.runtime.shift.durationSeconds,2880);
 assert.deepEqual(fingerprint(continued),boundaryFingerprint);
 check('accelerated server clock reaches the exact 1440 second boundary; both doctors consent to one preserved 24 minute extension',{
  acceleratedServerClock:true,real24MinuteRun:false,boundarySeconds:boundary.runtime.shift.elapsedSeconds,durationSeconds:continued.runtime.shift.durationSeconds,turn:continued.runtime.turn.number});

 stage='save all and restore continuation without duplicate orders';
 await Promise.all(pages.map(dismiss));const finalBefore=fingerprint(await h.readGuard(roomId));
 for(const page of pages){await page.locator('#guardButton').click();await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');}
 const paused=await h.readGuard(roomId);assert.equal(paused.runtime.turn.participantIds.length,0);
 await a.reload();await recover(a);await b.reload();await recover(b);
 const recovered=await h.readGuard(roomId);assert.deepEqual(fingerprint(recovered),finalBefore);
 assert.equal(recovered.runtime.turn.number,2);assert.equal(recovered.runtime.shift.durationSeconds,2880);
 assert.equal(new Set(administrations(recovered).map(row=>row.sourceEventId)).size,administrations(recovered).length);
 check('both saved doctors recover the continued shift with the same patients, messages and unique clinical effects');
 await screenshot('continued-recovered');
 assert.deepEqual(errors,[]);report.passed=true;report.errors=errors;
 report.clinicalCommands=commands(recovered).length;report.physicalAdministrations=administrations(recovered).length;
 report.teamMessages=recovered.runtime.communication.team.length;report.httpResponses=wire.length;
 await fs.writeFile(output+'/summary.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile(output+'/transport.json',JSON.stringify(wire,null,2)+'\n');
 console.log('AUTHENTICATED SHARED GUARD PASS',JSON.stringify(report));
}catch(error){
 report.stage=stage;report.error=error.message;report.errors=errors;
 const snapshots=await Promise.all(pages.map(async(page,index)=>{
  await page.screenshot({path:output+'/failure-'+index+'.png'}).catch(()=>{});
  return page.evaluate(()=>({snapshot:atriaV5?.snapshot(),diagnostics:atriaV5?.diagnostics(),modal:document.querySelector('#modalContent')?.innerText,chat:document.querySelector('#chatHistory')?.innerText})).catch(()=>null);
 }));
 await fs.writeFile(output+'/summary.json',JSON.stringify(report,null,2)+'\n');
 await fs.writeFile(output+'/failure.json',JSON.stringify({report,snapshots,guard:roomId?await h.readGuard(roomId):null,wire,requests:h.requests},null,2)+'\n');
 console.error('AUTHENTICATED SHARED GUARD FAIL',JSON.stringify({stage,message:error.message,checks:report.checks.length,errors}));throw error;
}finally{
 for(const release of releases)release();
 for(const context of contexts)await context.close().catch(()=>{});
 await browsers[1].close().catch(()=>{});await h.close();
}
