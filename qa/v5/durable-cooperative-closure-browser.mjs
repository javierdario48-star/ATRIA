// C5.b.3 clinical acceptance: real UI and durable HTTP authority, including
// physical nursing, required studies, shared disposition and once-only XP.
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
import {clinical,send,walk,study} from './cooperative-ui.mjs';

const h=await browserHarness({apiLatency:35,durable:true});
const other=await h.newBrowser(),contexts=[],pages=[],errors=[];
let stage='boot';
try{
 for(const [i,browser] of [h.browser,other].entries()){
  const ctx=await browser.newContext(i===1?h.devices['Pixel 5']:{viewport:{width:1024,height:768}});
  contexts.push(ctx);const p=await ctx.newPage();pages.push(p);
  p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push({actor:i,message:e.message}));
  await p.goto(h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
  await p.locator('#playerName').fill(i?'Dr. Bruno':'Dra. Ana');
  await p.locator('#enterButton').click();
  await p.locator('#peopleButton').click();await p.locator('#modalClose').click();
 }
 const [host,guest]=pages;
 stage='accepted two-physician durable room';
 await host.waitForFunction(()=>atriaV5.snapshot().others.some(x=>x.name==='Dr. Bruno'));
 await host.locator('#guardButton').click();await host.locator('[data-mode="coop"]').click();
 await host.locator('#caseChoice').selectOption('PERI-PBE-001');
 await host.locator('#coopDoctors label').filter({hasText:'Dr. Bruno'}).locator('input').check();
 await host.locator('[data-action="start-guard"]').click();
 await guest.locator('#peopleButton').click();await guest.locator('[data-action="join-coop"]').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>{
  const s=atriaV5.snapshot(),d=atriaV5.diagnostics();
  return s.mode==='coop'&&s.clinical?.patient.caseId==='PERI-PBE-001'&&d.cooperative.durable&&!d.cooperative.authority;
 },null,{timeout:90000})));
 const uid=(await clinical(host)).patient.uid;
 for(const p of pages)if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')
  await p.locator('#keyboardToggleButton').click();
 stage='bedside treatment using physical nurse';
 await Promise.all([walk(host),walk(guest,176)]);
 await send(host,'Enfermera monitor y ceftriaxona 1 g');
 await send(guest,'Enfermera albumina 1.5 g/kg');
 const early=await clinical(host);
 assert.equal(early.patient.administrationLog.length,0,'an order must not bypass physical nurse');
 stage='distributed interrogation, exam, diagnostic impression and studies';
 for(const [p,questions] of [[host,['¿Tiene cirrosis?','¿Tuvo fiebre?']],[guest,['¿Tiene ascitis?','¿Notó confusión?']]])
  for(const text of questions)await send(p,text);
 await host.locator('#peopleButton').click();await host.locator('[data-action="record-vitals"]').click();
 await host.locator('[data-action="examination"]').click();
 await host.locator('#examRegions [data-exam-region="abdomen"]').click();
 for(const t of ['inspection','auscultation','percussion','palpation'])
  await host.locator('[data-exam-section="'+t+'"]').click();
 await host.locator('#modalClose').click();
 await guest.locator('#peopleButton').click();await guest.locator('[data-action="examination"]').click();
 await guest.locator('[data-exam-section="general"]').click();await guest.locator('#modalClose').click();
 await study(guest,'pbe_paracentesis');await study(host,'pbe_renal');
 await host.locator('[data-patient-diagnosis]').click();
 await host.locator('#diagnosisInput').fill('PBE');
 await host.locator('[data-diagnosis="Peritonitis bacteriana espontánea"]').click();
 await host.locator('#diagnosisInput').press('Enter');await host.locator('#modalClose').click();
 stage='administered drugs with unique receipts and completed studies';
 await Promise.all(pages.map(p=>p.waitForFunction(()=>{
  const c=atriaV5.snapshot().clinical;
  return c?.patient.administrationLog.length===2&&c.patient.procedures?.monitor?.connected===true
   &&c.patient.orders.length===2&&c.patient.orders.every(x=>x.status==='done');
 },null,{timeout:120000})));
 const treated=await clinical(host);
 assert.equal(new Set(treated.patient.administrationLog.map(x=>x.actorId)).size,2);
 assert.equal(new Set(treated.patient.administrationLog.map(x=>x.sourceEventId)).size,2);
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
 stage='reload a recipient after closure, no duplicate XP';
 await guest.reload();await guest.waitForFunction(()=>document.body.dataset.boot==='ready');
 await guest.locator('#enterButton').click();
 await guest.waitForFunction(()=>atriaV5.snapshot().clinical?.patient.caseEnded,null,{timeout:90000});
 const resumed=await clinical(guest);
 assert.deepEqual(resumed.patient.closure,closed[0].patient.closure);
 assert.equal(resumed.progress.xp,111);
 assert.equal((await guest.evaluate(()=>JSON.parse(localStorage.getItem('atria.v5.progress.v1')))).receipts.length,1);
 assert.deepEqual(errors,[]);
 console.log('DURABLE PBE CLOSURE PASS',JSON.stringify({score:100,perDoctorXp:111,uniqueAdminReceipts:2,
  studies:2,sharedClosure:true,noDuplicateXpOnReload:true}));
}catch(error){
 const snapshots=await Promise.all(pages.map(async(p,i)=>{
  try{return await p.evaluate(index=>{
   const c=atriaV5.snapshot().clinical,p=c?.patient,d=atriaV5.diagnostics();
   return {actor:index,phase:atriaV5.snapshot().phase,durable:d.cooperative?.durable,
    clinicalMinute:c?.clock?.gameMinute,ended:p?.caseEnded,died:p?.patientDied,
    administrations:p?.administrationLog?.map(x=>({actorId:x.actorId,sourceEventId:x.sourceEventId})),
    orders:p?.orders?.map(x=>({id:x.id,status:x.status})),
    monitor:p?.procedures?.monitor?.connected,
    transcript:c?.room?.transcript?.slice(-10).map(x=>({actorId:x.actorId,id:x.id,text:x.text}))};
  },i);}catch{return {actor:i,unavailable:true};}
 }));
 const statuses=Object.entries(h.requests.reduce((all,x)=>{const key=x.path+':'+x.status;
  all[key]=(all[key]||0)+1;return all;},{})).filter(([key])=>key.startsWith('/api/clinical')).slice(0,12);
 console.error('DURABLE PBE CLOSURE FAIL',JSON.stringify({stage,error:error.message,
  pageErrors:errors,snapshots,requestStatuses:statuses}));
 throw error;
}
finally{for(const context of contexts)await context.close().catch(()=>{});await other.close().catch(()=>{});await h.close();}
