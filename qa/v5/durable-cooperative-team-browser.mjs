// C5.b.3: independent Chrome processes exercise the durable server path for
// three/four doctors. This is NOT a host-owned C5.a clinical session.
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
import {clinical,send,walk} from './cooperative-ui.mjs';

const count=Number(process.env.V5_DURABLE_PLAYERS||3);
assert([3,4].includes(count));
const names=['Dra. Ana','Dr. Bruno','Dra. Celia','Dr. Diego'].slice(0,count);
const h=await browserHarness({apiLatency:count===3?70:110,durable:true});
const browsers=[h.browser],contexts=[],pages=[],errors=[];
let stage='boot';
try{
 for(let i=0;i<count;i++){
  if(i)browsers.push(await h.newBrowser());
  const ctx=await browsers[i].newContext(i===count-1?h.devices['Pixel 5']:{viewport:{width:1280,height:960}});
  contexts.push(ctx);
  const page=await ctx.newPage();pages.push(page);page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push({doctor:i,message:e.message}));
  await page.goto(h.url);
  await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#playerName').fill(names[i]);
  await page.locator('#enterButton').click();
  await page.locator('#peopleButton').click();await page.locator('#modalClose').click();
 }
 const host=pages[0],guest=pages.at(-1);
 stage='create accepted cooperative room';
 await host.waitForFunction(n=>atriaV5.snapshot().others.length===n-1,count,{timeout:90000});
 await host.locator('#guardButton').click();
 await host.locator('[data-mode="coop"]').click();
 await host.locator('input[name="guardScope"][value="specific"]').check();await host.locator('#caseChoice').selectOption('PERI-PBE-001');
 for(const name of names.slice(1))
  await host.locator('#coopDoctors label').filter({hasText:name}).locator('input').check();
 await host.locator('[data-action="start-guard"]').click();
 await host.getByRole('heading',{name:'Invitación enviada',exact:true}).waitFor();
 const roomId=await host.evaluate(()=>localStorage.getItem('atria.v5.coop.room'));
 assert(roomId);
 for(const p of pages.slice(1)){
  await p.locator('#peopleButton').click();
  const button=p.locator('[data-action="join-coop"]');
  assert.equal(await button.getAttribute('data-room'),roomId);
  await button.click();
 }
 await Promise.all(pages.map(p=>p.waitForFunction(n=>{
  const s=atriaV5.snapshot(),d=atriaV5.diagnostics();
  return s.mode==='coop'&&s.clinical?.room.members.length===n&&d.cooperative.durable&&!d.cooperative.authority;
 },count,{timeout:120000})));
 const joined=await Promise.all(pages.map(clinical));
 assert(joined.every(x=>x.patient.uid===joined[0].patient.uid));
 stage='movement and shared single-authority transcript';
 for(const p of pages)if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')
  await p.locator('#keyboardToggleButton').click();
 await Promise.all(pages.map((p,i)=>walk(p,144+(i%2)*32,420-Math.floor(i/2)*32)));
 for(const [i,p] of pages.entries())await send(p,'Médico presente '+names[i]);
 await Promise.all(pages.map(p=>p.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length===n,count)));
 const before=await clinical(host);
 assert.equal(new Set(before.room.transcript.map(x=>x.actorId)).size,count);
 stage='physical nursing order is shared, not merely displayed';
 await send(host,'Enfermera monitor');
 await send(pages[1],'Enfermera ceftriaxona 1 g');
 await send(pages[2],'Enfermera albumina 1.5 g/kg');
 await host.waitForFunction(()=>atriaV5.snapshot().clinical.patient.orders?.length>=0);
 await host.waitForFunction(()=>{
  const c=atriaV5.snapshot().clinical;return c.patient.administrationLog.length>=2&&c.patient.procedures?.monitor?.connected===true;
 },null,{timeout:120000});
 // The host's committed result is not proof that every replica has
 // received that version yet. Require the guest to observe both real
 // administrations and the physical monitor receipt before comparing.
 await guest.waitForFunction(()=>{
  const c=atriaV5.snapshot().clinical;
  return c?.patient.administrationLog.length===2&&c.patient.procedures?.monitor?.connected===true;
 },null,{timeout:120000});
 const medicated=await clinical(guest);
 assert.equal(medicated.patient.administrationLog.length,2);
 assert.equal(new Set(medicated.patient.administrationLog.map(x=>x.sourceEventId)).size,2);
 stage='original host tab stops: remaining doctors continue one durable guard';
 await host.close();
 await send(guest,'La guardia sigue sin el anfitrión');
 const continuing=await clinical(guest);
 assert.equal(continuing.patient.uid,joined[0].patient.uid);
 assert.equal(continuing.patient.administrationLog.length,2);
 stage='reloaded host returns to same clinical data';
 const returning=await contexts[0].newPage();returning.setDefaultTimeout(60000);
 returning.on('pageerror',e=>errors.push({doctor:'returning-host',message:e.message}));
 await returning.goto(h.url);
 await returning.waitForFunction(()=>document.body.dataset.boot==='ready');
 await returning.locator('#enterButton').click();
 await returning.waitForFunction(n=>{
  const d=atriaV5.diagnostics(),c=atriaV5.snapshot().clinical;
  return d.cooperative.durable&&c?.room.members.length===n&&
   c?.room.transcript.length>=n+4&&c?.patient.administrationLog.length===2;
 },count,{timeout:120000});
 const recovered=await clinical(returning);
 assert.equal(recovered.patient.uid,continuing.patient.uid);
 assert.equal(recovered.patient.administrationLog.length,2);
 assert.equal(recovered.room.transcript.length,continuing.room.transcript.length);
 assert.deepEqual(errors,[]);
 console.log('DURABLE TEAM PASS',JSON.stringify({doctors:count,serverOnly:true,
  hostRecovered:true,sharedNursing:true,medicationReceipts:2,transcript:recovered.room.transcript.length}));
}catch(error){
 const clinicalStates=await Promise.all(pages.map(async(p,i)=>{
  try{return await p.evaluate(index=>{
   const snapshot=atriaV5.snapshot(),patient=snapshot.clinical?.patient,diagnostics=atriaV5.diagnostics();
   return {doctor:index,phase:snapshot.phase,mode:snapshot.mode,
    durable:diagnostics.cooperative?.durable,
    room:snapshot.clinical?.room?.roomId,
    clinicalClock:snapshot.clinical?.clock?.gameMinute,
    ended:patient?.caseEnded,died:patient?.patientDied,
    orders:patient?.orders?.map(x=>({id:x.id,status:x.status})),
    administrations:patient?.administrationLog?.map(x=>({actorId:x.actorId,sourceEventId:x.sourceEventId})),
    monitor:patient?.procedures?.monitor?.connected,events:snapshot.clinical?.room?.events?.slice(-5),
    transcript:snapshot.clinical?.room?.transcript?.slice(-6).map(x=>({actorId:x.actorId,id:x.id,text:x.text}))};
  },i)}catch{return {doctor:i,unavailable:true}}
 }));
 const statuses=Object.entries(h.requests.reduce((acc,x)=>{
  const key=x.path+':'+x.status;acc[key]=(acc[key]||0)+1;return acc;
 },{})).filter(([key])=>key.startsWith('/api/clinical')).slice(0,15);
 console.error('DURABLE TEAM FAIL',JSON.stringify({doctors:count,stage,error:error.message,
  pageErrors:errors,clinicalStates,requestStatuses:statuses}));
 throw error;
}finally{
 for(const ctx of contexts)await ctx.close().catch(()=>{});
 for(const browser of browsers.slice(1))await browser.close().catch(()=>{});
 await h.close();
}
