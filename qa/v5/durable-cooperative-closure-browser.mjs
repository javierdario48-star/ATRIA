// C5.b.3 clinical acceptance: real UI and durable HTTP authority, including
// physical nursing, required studies, shared disposition and once-only XP.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
import {clinical,send,walk,study} from './cooperative-ui.mjs';

const h=await browserHarness({apiLatency:Number(process.env.V5_DURABLE_LATENCY||35),durable:true});
const other=await h.newBrowser(),contexts=[],pages=[],errors=[],acknowledgements=[];
const out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';
const names=['Dra. Ana','Dr. Bruno'].map(name=>name+(process.env.V5_QA_NAME_SUFFIX?' '+process.env.V5_QA_NAME_SUFFIX:''));
await fs.mkdir(out,{recursive:true});
let stage='boot';
try{
 for(const [i,browser] of [h.browser,other].entries()){
  const ctx=await browser.newContext(i===1?h.devices['Pixel 5']:{viewport:{width:1280,height:960}});
  contexts.push(ctx);const p=await ctx.newPage();pages.push(p);
  p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push({actor:i,message:e.message}));
  p.on('response',async response=>{
   if(new URL(response.url()).pathname!=='/api/clinical')return;
   try{const value=await response.json();
    if(value.acknowledgements?.length)acknowledgements.push({doctor:i,epoch:value.epoch,
     acknowledgements:value.acknowledgements,doctors:value.spatial?.doctors});
   }catch{}
  });
  await p.goto(i===1&&process.env.V5_GUEST_BROWSER_URL||process.env.V5_BROWSER_URL||h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
  await p.locator('#playerName').fill(names[i]);
  await p.locator('#enterButton').click();
  await p.locator('#peopleButton').click();await p.locator('#modalClose').click();
 }
 let host=pages[0];const guest=pages[1];
 stage='accepted two-physician durable room';
 await host.waitForFunction(name=>atriaV5.snapshot().others.some(x=>x.name===name),names[1]);
 await host.locator('#guardButton').click();await host.locator('[data-mode="coop"]').click();
 await host.locator('#caseChoice').selectOption('PERI-PBE-001');
 await host.locator('#coopDoctors label').filter({hasText:names[1]}).locator('input').check();
 await host.locator('[data-action="start-guard"]').click();
 await guest.locator('#peopleButton').click();await guest.locator('[data-action="join-coop"]').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>{
  const s=atriaV5.snapshot(),d=atriaV5.diagnostics();
  return s.mode==='coop'&&s.clinical?.patient.caseId==='PERI-PBE-001'&&d.cooperative.durable&&!d.cooperative.authority;
 },null,{timeout:90000})));
 const uid=(await clinical(host)).patient.uid;
 for(const p of pages)if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')
  await p.locator('#keyboardToggleButton').click();
 stage='bedside navigation';
 await Promise.all([walk(host),walk(guest,176)]);
 stage='distributed interrogation, exam, diagnostic impression and studies';
 for(const [p,questions] of [[host,['¿Tiene cirrosis?','¿Tuvo fiebre?']],[guest,['¿Tiene ascitis?','¿Notó confusión?']]])
  for(const text of questions)await send(p,text);
 await host.locator('#peopleButton').click();await host.locator('[data-action="record-vitals"]').click();
 await host.locator('[data-action="examination"]').click();
 await host.locator('#examRegions [data-exam-region="abdomen"]').click();
  await host.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings?.abdomen?.palpation);
 await host.locator('#modalClose').click();
 await guest.locator('#peopleButton').click();await guest.locator('[data-action="examination"]').click();
 await guest.locator('#examRegions [data-exam-region="general"]').click();await guest.locator('#modalClose').click();
 await study(guest,'pbe_paracentesis');await study(host,'pbe_renal');
 await host.locator('[data-patient-diagnosis]').click();
 await host.locator('#diagnosisInput').fill('PBE');
 await host.locator('[data-diagnosis="Peritonitis bacteriana espontánea"]').click();
 await host.locator('#diagnosisInput').press('Enter');await host.waitForFunction(()=>document.querySelector('#modal')?.open===false);
 stage='bedside treatment using physical nurse';
 await send(host,'Enfermera monitor y ceftriaxona 1 g');
 const early=await clinical(host);
 assert.equal(early.patient.administrationLog.length,0,'an order must not bypass physical nurse');
 assert.equal(early.patient.orders.length,2,'both real studies must be admitted');
 assert(early.patient.orders.some(x=>x.status==='pending'),'host loss must occur with unfinished work');
 stage='host disconnects with nursing and studies pending';
 const albuminPending=send(guest,'Enfermera albumina 1.5 g/kg');
 albuminPending.catch(()=>{});
 await host.close();
 await albuminPending;
 const admitted=await clinical(guest);
 for(const item of admitted.room.events.filter(x=>x.type==='chat.posted'))
  assert.equal(item.routeError,null,'clinical command must be admitted: '+item.message.text);
 for(const id of ['ceftriaxone','albumin'])
  assert(admitted.room.events.some(event=>event.type==='chat.posted'&&event.clinical.some(item=>
   item.kind==='therapy.request'&&item.id===id&&item.status==='pending')),'the original order must wait for physical nurse: '+id);
 await guest.waitForFunction(()=>{
  const c=atriaV5.snapshot().clinical;
  return c?.patient.administrationLog.length===2&&c.patient.procedures?.monitor?.connected===true
   &&c.patient.orders.length===2&&c.patient.orders.every(x=>x.status==='done')
   &&c.patient.phys.inflammation<.62*.8&&c.patient.liveVitals.sys>=100;
 },null,{timeout:120000});
 const treated=await clinical(guest);
 assert.equal(new Set(treated.patient.administrationLog.map(x=>x.actorId)).size,2);
 assert.equal(new Set(treated.patient.administrationLog.map(x=>x.sourceEventId)).size,2);
 assert.deepEqual(treated.patient.administrationLog.map(x=>x.id).sort(),['albumin','ceftriaxone']);
 for(const administration of treated.patient.administrationLog){
  const completed=treated.room.events.filter(event=>event.type==='clinical.completed'&&event.eventId===administration.sourceEventId);
  assert.equal(completed.length,1,'exactly one authentic nursing completion per dose');
  const completion=completed[0],order=treated.room.events.find(event=>event.type==='chat.posted'&&event.message.id===completion.commandId&&event.message.actorId===administration.actorId);
  assert(order&&completion.revision>order.revision&&completion.at>order.message.at,'nursing must complete after the original order');
  assert.equal(completion.clinical[0].status,'executed');
  assert.equal(completion.clinical[0].receipt.sourceEventId,administration.sourceEventId);
 }
 assert.equal(new Set(treated.patient.orders.map(x=>x.sourceEventId)).size,2);
 stage='host returns to the same completed nursing, studies and history';
 host=await contexts[0].newPage();pages[0]=host;host.setDefaultTimeout(45000);
 host.on('pageerror',e=>errors.push({actor:'returning-host',message:e.message}));
 await host.goto(process.env.V5_BROWSER_URL||h.url);await host.waitForFunction(()=>document.body.dataset.boot==='ready');
 await host.locator('#enterButton').click();
 await host.waitForFunction(uid=>atriaV5.diagnostics().cooperative.durable&&
  atriaV5.snapshot().clinical?.patient.uid===uid,uid,{timeout:90000});
 const recovered=await clinical(host);
 assert.deepEqual(recovered.patient.administrationLog,treated.patient.administrationLog);
 assert.deepEqual(recovered.patient.orders,treated.patient.orders);
 assert.deepEqual(recovered.patient.intentHistory,treated.patient.intentHistory);
 stage='reassessment and actual shared destination';
 await guest.locator('#peopleButton').click();await guest.locator('[data-action="reassess"]').click();
 await guest.locator('#modalClose').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().clinical?.eligibleDestinations.includes('sala'),null,{timeout:80000})));
 await host.locator('[data-patient-destination="sala"]').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().clinical?.patient.caseEnded,null,{timeout:60000})));
 const closed=await Promise.all(pages.map(clinical));
 assert.equal(closed[0].patient.uid,uid);assert.equal(closed[1].patient.uid,uid);
 assert.equal(closed[0].patient.closure.quality.score,100);
 assert.equal(closed[0].progress.xp,111);
 assert.equal(closed[1].progress.xp,111);
 assert.deepEqual(closed[0].patient.closure,closed[1].patient.closure);
 assert.equal(closed[0].patient.administrationLog.length,2);
 for(const p of pages){
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('atria.v5.progress.v1')||'{}').xp===111);
  assert.equal((await p.evaluate(()=>JSON.parse(localStorage.getItem('atria.v5.progress.v1')))).receipts.length,1);
 }
 stage='reload both recipients after closure, no duplicate doses, results or XP';
 for(const p of pages){
  await p.reload();await p.waitForFunction(()=>document.body.dataset.boot==='ready');
  await p.locator('#enterButton').click();
  await p.waitForFunction(()=>atriaV5.snapshot().clinical?.patient.caseEnded,null,{timeout:90000});
  const resumed=await clinical(p);
  assert.deepEqual(resumed.patient.closure,closed[0].patient.closure);
  assert.deepEqual(resumed.patient.administrationLog,treated.patient.administrationLog);
  assert.deepEqual(resumed.patient.orders,treated.patient.orders);
  assert.deepEqual(resumed.patient.intentHistory,treated.patient.intentHistory);
  assert.equal(resumed.progress.xp,111);
  assert.equal((await p.evaluate(()=>JSON.parse(localStorage.getItem('atria.v5.progress.v1')))).receipts.length,1);
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/durable-cooperative-closure-summary.json',JSON.stringify({
  passed:true,url:process.env.V5_BROWSER_URL||'loopback',doctors:2,physicalAndroid:false,
  patientUid:uid,roomId:closed[0].room.roomId,hostLostWithWorkPending:true,hostRecovered:true,
  initialVitals:early.patient.liveVitals,treatedVitals:treated.patient.liveVitals,
  initialInflammation:early.patient.phys.inflammation,treatedInflammation:treated.patient.phys.inflammation,
  closure:closed[0].patient.closure,administrations:treated.patient.administrationLog,
  orders:treated.patient.orders,perDoctorXp:111,noDuplicateXpOnBothReloads:true,errors
 },null,2)+'\n');
 console.log('DURABLE PBE CLOSURE PASS',JSON.stringify({score:100,perDoctorXp:111,uniqueAdminReceipts:2,
  studies:2,sharedClosure:true,hostLostWithWorkPending:true,hostRecovered:true,noDuplicateXpOnBothReloads:true}));
}catch(error){
 const snapshots=await Promise.all(pages.map(async(p,i)=>{
  try{return await p.evaluate(index=>{
   const c=atriaV5.snapshot().clinical,p=c?.patient,d=atriaV5.diagnostics();
   return {actor:index,phase:atriaV5.snapshot().phase,durable:d.cooperative?.durable,
    clinicalMinute:c?.clock?.gameMinute,ended:p?.caseEnded,died:p?.patientDied,
    administrations:p?.administrationLog?.map(x=>({actorId:x.actorId,sourceEventId:x.sourceEventId})),
    orders:p?.orders?.map(x=>({id:x.id,status:x.status})),
    monitor:p?.procedures?.monitor?.connected,
    player:atriaV5.snapshot().player,
    messages:c?.messages,
    events:c?.room?.events,
    transcript:c?.room?.transcript?.map(x=>({actorId:x.actorId,id:x.id,text:x.text}))};
  },i);}catch{return {actor:i,unavailable:true};}
 }));
 const statuses=Object.entries(h.requests.reduce((all,x)=>{const key=x.path+':'+x.status;
  all[key]=(all[key]||0)+1;return all;},{})).filter(([key])=>key.startsWith('/api/clinical')).slice(0,12);
 console.error('DURABLE PBE CLOSURE FAIL',JSON.stringify({stage,error:error.message,
  pageErrors:errors,snapshots,requestStatuses:statuses}));
 await fs.writeFile(out+'/durable-cooperative-closure-failure.json',JSON.stringify({stage,error:error.message,
  pageErrors:errors,snapshots,acknowledgements,requestStatuses:statuses},null,2)+'\n');
 throw error;
}
finally{for(const context of contexts)await context.close().catch(()=>{});await other.close().catch(()=>{});await h.close();}
