// Actual independent browsers, accepted competitive invitation, physical first
// contact and server-enforced ownership. No test-engine clinical shortcuts.
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
import {walk,clinical,send} from './cooperative-ui.mjs';

const count=Number(process.env.V5_COMPETITIVE_PLAYERS||2);
assert([2,3,4].includes(count));
const names=['Dra. Ana','Dr. Bruno','Dra. Celia','Dr. Diego'].slice(0,count);
const h=await browserHarness({durable:true,apiLatency:count===4?95:40});
const browsers=[h.browser],pages=[],contexts=[],errors=[],acks=[];
let stage='boot';
try{
 for(let i=0;i<count;i++){
  if(i)browsers.push(await h.newBrowser());
  const ctx=await browsers[i].newContext(i===count-1?h.devices['Pixel 5']:{viewport:{width:1280,height:960}});
  contexts.push(ctx);
  const page=await ctx.newPage();pages.push(page);
  page.setDefaultTimeout(60000);
  page.on('pageerror',error=>errors.push({doctor:i,message:error.message}));
  page.on('response',async res=>{
   if(!new URL(res.url()).pathname.endsWith('/api/clinical')||res.status()!==200)return;
   const value=await res.json().catch(()=>null);
   for(const ack of value?.acknowledgements||[])acks.push({doctor:i,...ack});
  });
  await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#playerName').fill(names[i]);await page.locator('#enterButton').click();
  await page.locator('#peopleButton').click();await page.locator('#modalClose').click();
 }
 const host=pages[0],owner=pages[1];
 stage='create competitive party';
 await host.waitForFunction(n=>atriaV5.snapshot().others.length===n-1,count);
 await host.locator('#guardButton').click();
 await host.locator('[data-mode="competitive"]').click();
 // This test measures chat/ownership after several independent browsers join.
 // PUD followed by CELIAC remains able to give history during CI latency.
 // Untreated septic shock correctly loses coherent speech (covered separately
 // by patient-dialogue.test.js); it cannot be a transport-success fixture.
 await host.locator('input[name="guardScope"][value="specific"]').check();await host.locator('#caseChoice').selectOption('PUD-001');
 for(const name of names.slice(1))
  await host.locator('#coopDoctors label').filter({hasText:name}).locator('input').check();
 await host.locator('[data-action="start-guard"]').click();
 await host.getByRole('heading',{name:'Invitación enviada'}).waitFor();
 for(const guest of pages.slice(1)){
  await guest.locator('#peopleButton').click();
  await guest.locator('[data-action="join-coop"]').click();
 }
 await Promise.all(pages.map(p=>p.waitForFunction(()=>{
  const s=atriaV5.snapshot(),d=atriaV5.diagnostics();
  return s.mode==='competitive'&&d.cooperative.durable&&!d.cooperative.authority
   &&s.clinical?.competition?.mode==='competitive';
 },null,{timeout:90000})));
 const opening=(await clinical(host)).shift;
 assert.equal(opening.patients.length,2,'competitive should begin with two patients');
 assert.deepEqual(opening.patients.map(p=>p.caseId),['PUD-001','PUD-001'],
  'specific pathology must apply to both independent competitive patients');
 assert.notEqual(opening.patients[0].uid,opening.patients[1].uid);
 assert.notEqual(opening.patients[0].bedId,opening.patients[1].bedId);
 assert(opening.remainingSeconds>1430&&opening.remainingSeconds<=1440);
 await host.waitForFunction(()=>document.querySelectorAll('.unassigned-patient-marker').length===2);
 assert.equal(await host.locator('.unassigned-patient-marker').count(),2,
  'both unclaimed patient beds must glow without intercepting a map tap');
 await host.locator('#receptionButton').click();
 assert.equal(await host.locator('.reception-patient').count(),2);
 await host.locator('#modalClose').click();
 assert((await clinical(host)).competition.ownerId===null);
 assert.match(await host.locator('#guardScoreboard').innerText(),/GUARDIA COMPETITIVA/);
 stage='greeting before bedside contact cannot claim clinical ownership';
 await owner.locator('#dieInput').fill('hola');
 await owner.locator('#chatForm [type="submit"]').click();
 await owner.waitForFunction(()=>document.querySelector('#toast')?.textContent?.includes('Acercate a una cama'),
  null,{timeout:18000});
 assert.equal((await clinical(owner)).competition.ownerId,null);
 assert.equal((await clinical(owner)).room.transcript.length,0,'a distant hello is not clinical first contact');
 stage='first physician physically approaches the patient';
 for(const p of pages)if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')
  await p.locator('#keyboardToggleButton').click();
 await walk(owner,176);
 await owner.waitForFunction(()=>Math.abs(atriaV5.snapshot().player.x-atriaV5.diagnostics().renderer.camera.x)<1);
 const aim=await owner.evaluate(()=>{
  const e=atriaV5.snapshot().entities.find(x=>x.kind==='patient');
  const r=atriaV5.diagnostics().renderer;
  return {x:(e.x-r.camera.x)*r.scale+r.anchorX,y:(e.y-r.camera.y)*r.scale+r.anchorY};
 });
 await owner.locator('#game').click({position:aim});
 await owner.locator('#patientWheel').waitFor({state:'visible'});
 await owner.locator('#patientWheel [data-patient-action="talk"].patient-wheel-guided').waitFor();
 await owner.waitForFunction(()=>!!atriaV5.snapshot().clinical?.competition?.ownerId,null,{timeout:65000});
 const ownerId=(await clinical(owner)).competition.ownerId;
 for(const p of pages)await p.waitForFunction(id=>atriaV5.snapshot().clinical?.competition?.ownerId===id,ownerId);
 stage='rival clinical command cannot mutate the case';
 await host.locator('#dieInput').fill('/signos');
 await host.locator('#chatForm [type="submit"]').click();
 await host.waitForFunction(()=>document.querySelector('#toast')?.textContent?.includes('Acercate a una cama'),
  null,{timeout:10000});
 assert.equal(acks.filter(x=>x.doctor===0&&x.status==='executed').length,0,'observer cannot administer clinical commands');
 await host.waitForFunction(()=>!atriaV5.snapshot().clinical.room.transcript.some(m=>m.text==='/signos'),null,{timeout:10000});
 stage='responsible doctor can treat';
 // A genuine tap on Hablar, not a forced DOM hide, must bind this exact
 // patient and produce an authenticated native answer to the doctor's question.
 await owner.locator('#patientWheel [data-patient-action="talk"]').click();
 await send(owner,'Hola, ¿qué te pasó?');
 await owner.waitForFunction(()=>{
  const s=atriaV5.snapshot().clinical;
  return s.room.events.some(e=>e.type==='chat.posted'&&e.message.text==='Hola, ¿qué te pasó?'&&
   e.message.patientUid===s.patient.uid&&e.clinical.some(c=>
    c.kind==='history.ask'&&c.status==='executed'&&!!c.receipt?.message));
 });
 assert(await owner.locator('#chatHistory [data-role="patient"]').count()>0,
  'touching Hablar must show the native patient reply in this physician browser');
 await send(owner,'/signos');
 await send(owner,'¿Toma ibuprofeno?');
 await send(owner,'Enfermera, mi diagnóstico presuntivo es enfermedad ulcerosa peptica');
 await owner.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='enfermedad ulcerosa peptica');
 assert.equal((await clinical(owner)).patient.diagnosis,'enfermedad ulcerosa peptica');
 await host.waitForFunction(()=>atriaV5.snapshot().clinical.room.transcript.some(x=>x.text==='¿Toma ibuprofeno?'),
  null,{timeout:18000});
 const hostChat=await host.locator('#chatHistory').innerText();
 assert(!hostChat.includes('¿Toma ibuprofeno?'),'doctor far away must not see the bedside dialogue');
 assert(!hostChat.includes('Paciente:'),'the patient cannot answer in a remote physician chat');
 assert((await owner.locator('#chatHistory').innerText()).includes('¿Toma ibuprofeno?'));
 const c=await clinical(owner);
 assert(c.room.transcript.some(m=>m.text==='/signos'));
 assert(c.patient.intentHistory.some(x=>x.id==='nsaid'&&x.patientUid===c.patient.uid),
  'the real bedside question must acquire this patient\'s NSAID history');
 assert.equal(c.competition.ownerId,ownerId);
 // The second independent doctor uses RECEPCIÓN (not a debug API or injected
 // clinical session) and must receive a true patient reply after arrival.
 stage='reception walk, verified ownership, authentic greeting and patient answer';
 const nextUid=opening.patients[1].uid;
 await host.locator('#receptionButton').click();
 const nextButton=host.locator('.reception-patient[data-patient-uid="'+nextUid+'"] [data-action="reception-approach"]');
 assert.match(await nextButton.innerText(),/Atender y asignarme/);
 await nextButton.click();
 await host.waitForFunction(uid=>{
  const s=atriaV5.snapshot();
  return s.clinical?.patient.uid===uid&&s.clinical.shift.patients.some(p=>
   p.uid===uid&&p.ownerId)&&!s.player.moving&&!s.player.target;
 },nextUid,{timeout:90000});
 const second=await clinical(host),secondOwner=second.shift.patients.find(p=>p.uid===nextUid).ownerId;
 assert.notEqual(secondOwner,ownerId,'different doctors have independently owned patients');
 const greeting='Hola ¿Qué te pasó?';
 await host.waitForFunction(({uid,greeting})=>{
  const s=atriaV5.snapshot().clinical;
  return s?.patient.uid===uid&&s.room.events.some(e=>e.type==='chat.posted'&&
   e.message.text===greeting&&e.message.patientUid===uid&&
   e.clinical.some(x=>x.kind==='history.ask'&&x.status==='executed'&&
    typeof x.receipt?.message==='string'&&x.receipt.message.length>0));
 },{uid:nextUid,greeting},{timeout:90000});
 await host.locator('#chatHistory [data-role="patient"]').first().waitFor({timeout:20000});
 const doctorReply=(await host.locator('#chatHistory [data-role="patient"]').allInnerTexts()).join(' ');
 assert(doctorReply.trim().length>20,'native patient answer must be visible, not a local greeting bubble');
 assert.match(doctorReply,/ardor/,'the second PUD patient must answer from its own native anamnesis');
 assert((await clinical(host)).patient.intentHistory.some(x=>
  x.id==='interview:symptoms'&&x.patientUid===nextUid),'greeting must update this patient\'s native anamnesis');
 // Check both beds stay distinct after the second physician arrives.
 assert.equal((await clinical(owner)).shift.patients.find(p=>p.uid===opening.patients[0].uid).ownerId,ownerId);
 assert.deepEqual(errors,[]);
 console.log('COMPETITIVE BROWSER PASS',JSON.stringify({count,ownerId,blockedRivals:acks.filter(x=>x.status==='rejected').length,authority:true,errors}));
}finally{
 for(const ctx of contexts)await ctx.close().catch(()=>{});
 for(const browser of browsers.slice(1))await browser.close().catch(()=>{});
 await h.close();
}
