// Public UI, actual authenticated social API, two independent Chromium
// processes, one WebRTC host, the same native guard and physical nursing.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
import {state,clinical,send,walk,study,chooseDestination} from './cooperative-ui.mjs';
const h=await browserHarness({apiLatency:35}),second=await h.newBrowser(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';
await fs.mkdir(out,{recursive:true});const contexts=[],pages=[],errors=[],report={browserProcesses:2,physicalAndroid:false,apiLatencyMs:35};let stage='boot';
async function invite(caseId){
 const [a,b]=pages;await a.locator('#guardButton').click();await a.locator('[data-mode="coop"]').click();await a.locator('input[name="guardScope"][value="specific"]').check();await a.locator('#caseChoice').selectOption(caseId);
 await a.locator('#coopDoctors label').filter({hasText:'Dr. Bruno'}).locator('input').check();await a.locator('[data-action="start-guard"]').click();
 await b.locator('#peopleButton').click();await b.locator('[data-action="join-coop"]').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().mode==='coop'&&!!atriaV5.snapshot().clinical,null,{timeout:60000})));
 const [x,y]=await Promise.all(pages.map(clinical));assert.equal(x.patient.uid,y.patient.uid);assert.equal(x.room.roomId,y.room.roomId);
 assert.equal(x.room.mode,'coop');assert.equal(x.room.members.length,2);
 for(const p of pages)if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await p.locator('#keyboardToggleButton').click();
 await Promise.all([walk(a),walk(b,176)]);
 await a.waitForFunction(()=>atriaV5.snapshot().others.some(x=>x.name==='Dr. Bruno'));
 await b.waitForFunction(()=>atriaV5.snapshot().others.some(x=>x.name==='Dra. Ana'));
 assert.equal((await a.evaluate(()=>atriaV5.diagnostics())).cooperative.authority,true);
 assert.equal((await b.evaluate(()=>atriaV5.diagnostics())).cooperative.authority,false);
 assert.equal((await b.evaluate(()=>atriaV5.diagnostics())).cooperative.replica,true);
 return x.patient.uid;
}

try{
 for(const [i,browser] of [h.browser,second].entries()){
  const ctx=await browser.newContext(i===1?h.devices['Pixel 5']:{viewport:{width:1024,height:768}});contexts.push(ctx);
  const p=await ctx.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push({doctor:i,message:e.message,stack:e.stack}));pages.push(p);
  await p.goto(process.env.V5_BROWSER_URL||h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
  await p.locator('#playerName').fill(i===0?'Dra. Ana':'Dr. Bruno');await p.locator('#enterButton').click();
  await p.locator('#peopleButton').click();await p.locator('#modalClose').click();
 }
 const [a,b]=pages;
 stage='real lobby/invitation and remote walking';await a.waitForFunction(()=>atriaV5.snapshot().others.some(x=>x.name==='Dr. Bruno'));
 const uid=await invite('PERI-PBE-001');report.patientUid=uid;
 const positions=await Promise.all(pages.map(state));
 assert(Math.hypot(positions[0].others[0].x-positions[1].player.x,positions[0].others[0].y-positions[1].player.y)<45,'host sees the guest at the real destination');
 assert(Math.hypot(positions[1].others[0].x-positions[0].player.x,positions[1].others[0].y-positions[0].player.y)<45,'guest sees host motion');
 stage='one ward chat and real orders from both doctors';
 await send(a,'Hola, estamos atendiendo juntos');await send(b,'Enfermera monitor y ceftriaxona 1 g');await send(a,'Enfermera albumina 1.5 g/kg');
 assert.equal((await clinical(a)).patient.administrationLog.length,0,'no effects before physical nurse arrival');
 for(const [p,questions] of [[a,['¿Tiene cirrosis?','¿Tuvo fiebre?']],[b,['¿Tiene ascitis?','¿Notó confusión?']]])for(const text of questions)await send(p,text);
 await a.locator('#peopleButton').click();await a.locator('[data-action="record-vitals"]').click();await a.locator('[data-action="examination"]').click();
 await a.locator('#examRegions [data-exam-region="general"]').click();await a.locator('#modalClose').click();
 await b.locator('#peopleButton').click();await b.locator('[data-action="examination"]').click();
 await b.locator('#examRegions [data-exam-region="abdomen"]').click();
await b.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings?.abdomen?.palpation);await b.locator('#modalClose').click();
 await study(b,'pbe_paracentesis');await study(a,'pbe_renal');
 await a.locator('[data-patient-diagnosis]').click();await a.locator('#diagnosisInput').fill('PBE');await a.locator('[data-diagnosis="Peritonitis bacteriana espontánea"]').click();await a.locator('#diagnosisInput').press('Enter');await a.waitForFunction(()=>document.querySelector('#modal')?.open===false);
 await a.waitForFunction(()=>atriaV5.snapshot().clinical.patient.administrationLog.length===2,null,{timeout:45000});
 const before=await clinical(a),roomId=before.room.roomId;
 assert.equal(new Set(before.patient.administrationLog.map(x=>x.actorId)).size,2,'both doctors really administered through the same nurse executor');
 stage='guest actual browser reload/reconnection preserves ongoing care';await b.reload();await b.waitForFunction(()=>document.body.dataset.boot==='ready');await b.locator('#enterButton').click();
 await b.waitForFunction(uid=>atriaV5.snapshot().clinical?.patient.uid===uid,uid,{timeout:60000});
 const recovered=await clinical(b);assert.equal(recovered.room.roomId,roomId);assert(recovered.clock.clinicalMinute>before.clock.clinicalMinute);
 assert.deepEqual(recovered.patient.administrationLog,before.patient.administrationLog);assert(recovered.patient.orders.some(x=>x.id==='pbe_paracentesis'));
 report.guestReload={samePatient:true,sameAdministrations:true,clockContinued:true,previousClock:before.clock.clinicalMinute,recoveredClock:recovered.clock.clinicalMinute};
 if(await b.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await b.locator('#keyboardToggleButton').click();
 stage='shared actual results, reassessment and confirmed closure delivery';
 await a.waitForFunction(()=>atriaV5.snapshot().clinical.patient.orders.every(x=>x.status==='done'),null,{timeout:75000});
 await b.locator('#peopleButton').click();await b.locator('[data-action="reassess"]').click();await b.locator('#modalClose').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().clinical.eligibleDestinations.includes('sala'))));
 for(const [i,p] of pages.entries())await p.screenshot({path:out+'/coop-'+(i?'pixel':'desktop')+'-ready.png'});
 // Stall only the guest runtime, not clinical state. The host must keep the
 // final native receipt alive until the real guest receives and saves it.
 const debuggerSession=await contexts[1].newCDPSession(b);let hostClosed;
 try{
  await debuggerSession.send('Debugger.enable');await debuggerSession.send('Debugger.pause');
  await chooseDestination(a,'sala');await a.waitForFunction(()=>atriaV5.snapshot().clinical.patient.caseEnded);
  hostClosed=await clinical(a);await a.screenshot({path:out+'/coop-desktop-closed.png'});
  await a.locator('[data-action="return-lobby"]').click();assert.equal((await state(a)).phase,'guard','host departure must wait for the stalled guest receipt');
 }finally{await debuggerSession.send('Debugger.resume').catch(()=>{});await debuggerSession.detach();}
 await b.waitForFunction(()=>atriaV5.snapshot().clinical.patient.caseEnded);await a.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
 const closed=[hostClosed,await clinical(b)];
 for(const s of closed){assert.equal(s.patient.closure.quality.score,100);assert.equal(s.progress.xp,111);assert.equal(s.progress.receipts.length,1);assert.equal(s.patient.administrationLog.length,2);}
 assert.deepEqual(closed[0].patient.closure,closed[1].patient.closure);assert.deepEqual(closed[0].patient.orders,closed[1].patient.orders);
 assert.deepEqual(closed[0].patient.liveVitals,closed[1].patient.liveVitals);
 await b.screenshot({path:out+'/coop-pixel-closed.png'});for(const p of pages)assert.match(await p.locator('#playerProgress').innerText(),/111/);
 report.closureDelivery={soleHostClosure:true,guestRuntimeStalled:true,hostDepartureWaited:true,guestReceiptPersisted:true};
 report.closure=closed[0].patient.closure;report.administrations=closed[0].patient.administrationLog;report.studies=closed[0].patient.orders;
 const human=closed[0].room.transcript;assert.equal(new Set(human.map(x=>x.actorId)).size,2);assert.equal(new Set(human.map(x=>x.actorId+':'+x.id)).size,human.length);report.globalTranscriptMessages=human.length;
 stage='shared actual complication and sustained death';
 await b.locator('[data-action="return-lobby"]').click();await b.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
 const fatalUid=await invite('PERI-TER-001');
 await send(a,'Enfermera monitor y morfina 30 mg');await send(b,'Enfermera Ringer 6000 ml');
 await a.waitForFunction(()=>atriaV5.snapshot().clinical.patient.adverseEvents.some(x=>x.kind==='opioid-respiratory-depression'),null,{timeout:60000});
 await b.waitForFunction(()=>atriaV5.snapshot().clinical.patient.adverseEvents.some(x=>x.kind==='opioid-respiratory-depression'),null,{timeout:30000});
 const harm=await clinical(a);assert.equal(harm.patient.uid,fatalUid);assert(harm.patient.liveVitals.spo2<94);report.complications=harm.patient.adverseEvents;
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().clinical.patient.patientDied,null,{timeout:600000})));
 const deaths=await Promise.all(pages.map(clinical));
 for(const d of deaths){assert.equal(d.progress.xp,0);assert.equal(d.room.events.filter(x=>x.type==='clinical.patient-died').length,1);}
 assert.equal(deaths[0].patient.deathReason,deaths[1].patient.deathReason);assert.equal(deaths[0].patient.survival.atRealSecond,deaths[1].patient.survival.atRealSecond);
 for(const p of pages)assert.match(await p.locator('#playerProgress').innerText(),/111/);
 report.death={patientUid:fatalUid,cause:deaths[0].patient.deathReason,atRealSecond:deaths[0].patient.survival.atRealSecond,oneEvent:true,xp:0};
 assert.deepEqual(errors,[]);report.errors=errors;report.realUi=true;report.realWebRTC=true;report.oneClinicalAuthority=true;
 await fs.writeFile(out+'/cooperative-clinical-summary.json',JSON.stringify(report,null,2)+'\n');console.log('COOPERATIVE REAL CLINICAL UI PASS',JSON.stringify({players:2,score:100,xp:111,reconnection:true,sharedComplication:true,sharedDeath:true}));
}catch(error){
 const snapshots=[];for(const [i,p] of pages.entries()){await p.screenshot({path:out+'/coop-failure-'+i+'.png'}).catch(()=>{});snapshots.push(await p.evaluate(()=>({snapshot:atriaV5?.snapshot(),diagnostics:atriaV5?.diagnostics(),modal:document.querySelector('#modalContent')?.innerText})).catch(()=>null));}
 await fs.writeFile(out+'/cooperative-clinical-failure.json',JSON.stringify({stage,error:String(error),errors,snapshots},null,2)+'\n');throw error;
}finally{for(const c of contexts)await c.close();await second.close();await h.close();}
