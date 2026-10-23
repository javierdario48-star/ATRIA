// Run only after the two-doctor clinical route has passed. Every physician
// uses a separate Chromium process, the public UI and the same host executor.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
import {state,clinical,send,walk,study} from './cooperative-ui.mjs';
const count=Number(process.env.V5_COOP_PLAYERS||3);assert([3,4].includes(count));
const h=await browserHarness({apiLatency:count===3?70:110}),browsers=[h.browser],contexts=[],pages=[],errors=[];
const names=['Dra. Ana','Dr. Bruno','Dra. Celia','Dr. Diego'].slice(0,count),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';
await fs.mkdir(out,{recursive:true});let stage='boot';
const report={players:count,browserProcesses:count,apiLatencyMs:count===3?70:110,physicalAndroid:false};
async function invite(caseId){
 const a=pages[0];await a.locator('#guardButton').click();await a.locator('[data-mode="coop"]').click();await a.locator('#caseChoice').selectOption(caseId);
 for(const name of names.slice(1))await a.locator('#coopDoctors label').filter({hasText:name}).locator('input').check();
 await a.locator('[data-action="start-guard"]').click();
 await a.getByRole('heading',{name:'Invitación enviada',exact:true}).waitFor();
 const roomId=await a.evaluate(()=>localStorage.getItem('atria.v5.coop.room'));
 assert(roomId,'the public invitation must be committed before colleagues accept');
 const round={caseId,roomId,accepted:[]};(report.invitationRounds??=[]).push(round);
 for(const [i,p] of pages.slice(1).entries()){
  await p.locator('#peopleButton').click();const accept=p.locator('[data-action="join-coop"]');
  const selected=await accept.getAttribute('data-room');assert.equal(selected,roomId,'the visible invitation must belong to this new guard');
  round.accepted.push({doctor:i+1,roomId:selected});await accept.click();
  // Wait for the server-ACKNOWLEDGED join before the next doctor joins.
  // Two simultaneous read-modify-write joins can overwrite one another in
  // the QA social room. A button click alone is not membership confirmation.
  await p.waitForFunction(id=>localStorage.getItem('atria.v5.coop.room')===id,roomId);
 }
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().mode==='coop'&&!!atriaV5.snapshot().clinical,null,{timeout:60000})));
 const snapshots=await Promise.all(pages.map(clinical)),uid=snapshots[0].patient.uid;
 for(const s of snapshots){assert.equal(s.patient.uid,uid);assert.equal(s.room.members.length,count);}
 return uid;
}
try{
 for(let i=0;i<count;i++){
  if(i)browsers.push(await h.newBrowser());
  const ctx=await browsers[i].newContext(i===count-1?h.devices['Pixel 5']:{viewport:{width:1024,height:768}});contexts.push(ctx);
  const p=await ctx.newPage();pages.push(p);p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push({doctor:i,message:e.message,stack:e.stack}));
  await p.goto(process.env.V5_BROWSER_URL||h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
  await p.locator('#playerName').fill(names[i]);await p.locator('#enterButton').click();await p.locator('#peopleButton').click();await p.locator('#modalClose').click();
 }
 const a=pages[0],last=pages.at(-1);stage='accepted team and real remote movement';
 await a.waitForFunction(n=>atriaV5.snapshot().others.length===n-1,count);const uid=await invite('PERI-PBE-001');report.patientUid=uid;
 for(const p of pages)if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await p.locator('#keyboardToggleButton').click();
 await Promise.all(pages.map((p,i)=>walk(p,144+i*20)));
 for(const p of pages)await p.waitForFunction(n=>atriaV5.snapshot().others.length===n-1,count);
 const positions=await Promise.all(pages.map(state));
 for(const [i,p] of pages.entries()){
  const diagnostics=await p.evaluate(()=>atriaV5.diagnostics());assert.equal(diagnostics.cooperative.authority,i===0);
  assert.equal(diagnostics.cooperative.replica,i!==0);assert.equal(diagnostics.cooperative.connections.length,i===0?count-1:1);
  for(const [j,other] of positions.entries())if(j!==i){const visible=positions[i].others.find(x=>x.name===names[j]);assert(visible);assert(Math.hypot(visible.x-other.player.x,visible.y-other.player.y)<45);}
 }
 stage='one shared transcript, genuine nursing and distributed evaluation';
 for(const [i,p] of pages.entries())await send(p,'Hola, soy '+names[i]);
 await send(a,'Enfermera monitor');await send(pages[1],'Enfermera ceftriaxona 1 g');await send(pages[2],'Enfermera albumina 1.5 g/kg');
 if(count===4)await send(pages[3],'Enfermera oxigeno 2 L/min');
 for(const [i,text] of ['¿Tiene cirrosis?','¿Tiene ascitis?','¿Tuvo fiebre?','¿Notó confusión?'].entries())await send(pages[i%count],text);
 for(const p of pages){await p.locator('#peopleButton').click();await p.locator('[data-action="examination"]').click();await p.locator('#examRegions [data-exam-region="general"]').click();await p.locator('#modalClose').click();}
 await a.locator('#peopleButton').click();await a.locator('[data-action="record-vitals"]').click();await a.locator('[data-action="examination"]').click();await a.locator('#examRegions [data-exam-region="abdomen"]').click();
await a.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings?.abdomen?.palpation);await a.locator('#modalClose').click();
 await study(pages[1],'pbe_paracentesis');await study(last,'pbe_renal');
 await a.locator('[data-patient-diagnosis]').click();await a.locator('#diagnosisInput').fill('PBE');await a.locator('[data-diagnosis="Peritonitis bacteriana espontánea"]').click();await a.locator('#diagnosisInput').press('Enter');await a.waitForFunction(()=>document.querySelector('#modal')?.open===false);
 await a.waitForFunction(n=>atriaV5.snapshot().clinical.patient.administrationLog.length===n,count===4?3:2,{timeout:45000});
 await a.waitForFunction(()=>atriaV5.snapshot().clinical.patient.orders.every(x=>x.status==='done'),null,{timeout:75000});
 await last.locator('#peopleButton').click();await last.locator('[data-action="reassess"]').click();await last.locator('#modalClose').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().clinical.eligibleDestinations.includes('sala'))));
 const ready=await clinical(a);assert.equal(new Set(ready.patient.administrationLog.map(x=>x.sourceEventId)).size,ready.patient.administrationLog.length);
 assert.equal(new Set(ready.room.transcript.map(x=>x.actorId)).size,count);
 for(const [i,p] of pages.entries())await p.screenshot({path:out+'/team-'+count+'-doctor-'+i+'-ready.png'});
 stage='initial terminal snapshot after guest reload must persist XP before host departure';
 await last.reload();await last.waitForFunction(()=>document.body.dataset.boot==='ready');
 await a.locator('[data-patient-destination="sala"]').click();await a.waitForFunction(()=>atriaV5.snapshot().clinical.patient.caseEnded);
 const hostClosed=await clinical(a);await a.screenshot({path:out+'/team-'+count+'-doctor-0-closed.png'});
 await a.locator('[data-action="return-lobby"]').click();assert.equal((await state(a)).phase,'guard','host must wait for the colleague still on the title screen');
 await last.locator('#enterButton').click();
 await Promise.all(pages.slice(1).map(p=>p.waitForFunction(()=>atriaV5.snapshot().clinical?.patient.caseEnded,null,{timeout:60000})));
 await a.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
 const closed=[hostClosed,...await Promise.all(pages.slice(1).map(clinical))];
 for(const [i,s] of closed.entries()){
  assert.deepEqual(s.patient.closure,hostClosed.patient.closure);assert.deepEqual(s.patient.liveVitals,hostClosed.patient.liveVitals);assert.deepEqual(s.patient.orders,hostClosed.patient.orders);
  assert.equal(s.patient.closure.quality.score,100);assert.equal(s.progress.xp,111);assert.equal(s.progress.receipts.length,1);
  const privateProgress=await pages[i].evaluate(()=>JSON.parse(localStorage.getItem('atria.v5.progress.v1')));assert.equal(privateProgress.xp,111);assert.equal(privateProgress.receipts.length,1);
  if(i)await pages[i].screenshot({path:out+'/team-'+count+'-doctor-'+i+'-closed.png'});
 }
 report.closure=hostClosed.patient.closure;report.administrations=hostClosed.patient.administrationLog;report.studies=hostClosed.patient.orders;
 report.terminalReload={samePatient:true,hostDepartureWaited:true,allPersonalReceiptsPersistedOnce:true};
 for(const p of pages.slice(1))await p.locator('[data-action="return-lobby"]').click();
 stage='explicit guest departure removes its avatar without resetting ongoing care';
 const nextUid=await invite('PERI-TER-001');const before=await clinical(a);await last.locator('#guardButton').click();
 await a.waitForFunction(n=>atriaV5.snapshot().others.length===n-2,count);const after=await clinical(a);
 assert.equal(after.patient.uid,nextUid);assert(after.clock.clinicalMinute>=before.clock.clinicalMinute);assert.equal((await state(last)).phase,'lobby');
 for(const p of pages.slice(1,-1))await p.waitForFunction(n=>atriaV5.snapshot().others.length===n-2,count);
 report.guestDeparture={patientPreserved:true,avatarRemoved:true,remainingPeersAgree:true};
 await a.locator('#guardButton').click();await Promise.all(pages.slice(1,-1).map(p=>p.waitForFunction(()=>atriaV5.snapshot().phase==='lobby')));
 assert.deepEqual(errors,[]);report.errors=errors;report.realUi=true;report.realWebRTC=true;report.oneClinicalAuthority=true;
 await fs.writeFile(out+'/cooperative-team-'+count+'-summary.json',JSON.stringify(report,null,2)+'\n');console.log('COOPERATIVE TEAM UI PASS',JSON.stringify({players:count,score:100,xp:111,terminalReload:true,guestDeparture:true}));
}catch(error){
 const snapshots=[];for(const [i,p] of pages.entries()){await p.screenshot({path:out+'/team-'+count+'-failure-'+i+'.png'}).catch(()=>{});snapshots.push(await p.evaluate(()=>({snapshot:atriaV5?.snapshot(),diagnostics:atriaV5?.diagnostics(),modal:document.querySelector('#modalContent')?.innerText})).catch(()=>null));}
 console.error('COOPERATIVE TEAM FAILURE',JSON.stringify({stage,error:String(error),
  players:count,rooms:report.invitationRounds||[],
  snapshots:snapshots.map(x=>({phase:x?.snapshot?.phase,mode:x?.snapshot?.mode,
   social:x?.diagnostics?.cooperative,modal:x?.modal?.slice(0,250)}))}));
 await fs.writeFile(out+'/cooperative-team-'+count+'-failure.json',JSON.stringify({stage,error:String(error),errors,invitationRounds:report.invitationRounds||[],requests:h.requests,snapshots},null,2)+'\n');throw error;
}finally{for(const ctx of contexts)await ctx.close();for(const b of browsers.slice(1))await b.close();await h.close();}
