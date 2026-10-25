// Independent browsers verify two real beds and separate clinical owners.
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
import {walk,clinical,send} from './cooperative-ui.mjs';
const h=await browserHarness({durable:true,apiLatency:40}),other=await h.newBrowser(),errors=[];
try{
 const pages=[];
 for(const [i,b] of [h.browser,other].entries()){
  const ctx=await b.newContext(i?h.devices['Pixel 5']:{viewport:{width:1280,height:960}});
  const p=await ctx.newPage();p.setDefaultTimeout(70000);p.on('pageerror',e=>errors.push(e.message));
  pages.push(p);await p.goto(h.url);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
  await p.locator('#playerName').fill(i?'Bruno':'Ana');await p.locator('#enterButton').click();
  await p.locator('#peopleButton').click();await p.locator('#modalClose').click();
 }
 const [host,guest]=pages;
 await host.waitForFunction(()=>atriaV5.snapshot().others.some(x=>x.name==='Bruno'));
 await host.locator('#guardButton').click();await host.locator('[data-mode="competitive"]').click();
 await host.locator('#caseChoice').selectOption('PERI-PBE-001');
 await host.locator('#coopDoctors label').filter({hasText:'Bruno'}).locator('input').check();
 await host.locator('[data-action="start-guard"]').click();
 await guest.locator('#peopleButton').click();await guest.locator('[data-action="join-coop"]').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().clinical?.shift?.patients.length===2&&atriaV5.snapshot().mode==='competitive')));
 const records=(await clinical(host)).shift.patients;
 assert.notEqual(records[0].bedId,records[1].bedId);
 for(const p of pages)if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await p.locator('#keyboardToggleButton').click();
 await walk(guest,176);
 const at=await guest.evaluate(()=>{
  const e=atriaV5.snapshot().entities.find(e=>e.kind==='patient'),r=atriaV5.diagnostics().renderer;
  return {x:(e.x-r.camera.x)*r.scale+r.anchorX,y:(e.y-r.camera.y)*r.scale+r.anchorY};
 });
 await guest.locator('#game').click({position:at});
 await guest.waitForFunction(()=>!!atriaV5.snapshot().clinical.competition?.ownerId);
 const owner=(await clinical(guest)).competition.ownerId;
 await host.locator('#receptionButton').click();
 await host.locator('[data-action="reception-approach"][data-patient-uid="'+records[1].uid+'"]').click();
 await host.waitForFunction(uid=>{
  const s=atriaV5.snapshot(),p=s.patients.find(p=>p.uid===uid);
  return p&&Math.hypot(p.x-s.player.x,p.y-s.player.y)<145&&!s.player.moving;
 },records[1].uid);
 // Reception must assign this doctor automatically after reaching bed 2.
 // Neither tapping the patient nor typing a greeting is required to claim.
 await host.waitForFunction(uid=>{
  const c=atriaV5.snapshot().clinical;
  return c?.patient.uid===uid&&!!c.competition?.ownerId&&
   c.shift.patients.some(p=>p.uid===uid&&p.ownerId===c.competition.ownerId);
 },records[1].uid,{timeout:70000});
 assert.notEqual((await clinical(host)).shift.patients[1].ownerId,owner,
  'the second patient belongs to this doctor, never the distant rival');
 assert.equal((await clinical(host)).shift.patients[0].ownerId,owner);
 await send(host,'hola');
 assert.equal((await clinical(host)).patient.uid,records[1].uid);
 assert.notEqual((await clinical(host)).competition.ownerId,owner);
 // Physically separated attending physicians should each hear only their
 // own bedside history, even though their server is one persistent guard.
 await send(guest,'¿Tiene ascitis?');
 await guest.waitForFunction(()=>atriaV5.snapshot().clinical.messages.some(m=>m.role==='patient'),
  null,{timeout:18000});
 await host.waitForFunction(()=>atriaV5.snapshot().clinical.shift?.patients.some(p=>p.ownerId),
  null,{timeout:18000});
 assert(!(await host.locator('#chatHistory').innerText()).includes('¿Tiene ascitis?'),
  'far-away physician cannot see the first bed conversation');
 await send(host,'¿Desde cuándo empezó?');
 assert(!(await guest.locator('#chatHistory').innerText()).includes('¿Desde cuándo empezó?'),
  'the other bedside must not see this physician conversation');
 assert.deepEqual(errors,[]);
 console.log('CONTINUOUS WARD TWO OWNERS PASS',JSON.stringify({beds:records.map(r=>r.bedId),errors}));
}finally{await other.close();await h.close();}
