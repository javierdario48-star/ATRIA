// UI acceptance on the built application and original durable authority.
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness({durable:true}),errors=[],results=[];
const scopes=['random','specialty','specific'];
async function boot(context,name){
 const p=await context.newPage();p.setDefaultTimeout(30000);
 p.on('pageerror',e=>errors.push(e.message));await p.goto(h.url);
 await p.waitForFunction(()=>document.body.dataset.boot==='ready');
 await p.locator('#playerName').fill(name);await p.locator('#enterButton').click();return p;
}
async function choose(p,mode,scope){
 await p.locator('#guardButton').click();await p.locator('[data-mode="'+mode+'"]').click();
 assert(await p.locator('#guardSpecialtyField').isHidden());assert(await p.locator('#guardCaseField').isHidden());
 await p.locator('input[name="guardScope"][value="'+scope+'"]').check();
 assert.equal(await p.locator('#guardSpecialtyField').isVisible(),scope==='specialty');
 assert.equal(await p.locator('#guardCaseField').isVisible(),scope==='specific');
 if(scope==='specialty'){
  assert.deepEqual(await p.locator('#guardSpecialty option').allTextContents(),['Gastroenterología']);
  await p.locator('#guardSpecialty').selectOption('Gastroenterología');
 }
 if(scope==='specific')await p.locator('#caseChoice').selectOption('FECAL-001');
}
try{
 for(const mode of ['solo','apprentice'])for(const scope of scopes){
  const ctx=await h.browser.newContext(mode==='apprentice'?{viewport:{width:851,height:393},isMobile:true,deviceScaleFactor:2}:h.devices['Pixel 5']);
  try{const p=await boot(ctx,'Selección '+mode);await choose(p,mode,scope);
   await p.locator('[data-action="start-guard"]').click();await p.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
   const s=await p.evaluate(()=>atriaV5.snapshot());assert.equal(s.mode,mode);assert.equal(s.player.speed,184.5);
   if(scope==='specific')assert.equal(s.clinical.patient.caseId,'FECAL-001');
   assert.match(await p.locator('#guardTimeNow').innerText(),/☀️.*08:15 AM/);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   results.push({mode,scope,mobile:true});
  }finally{await ctx.close();}
 }
 for(const mode of ['coop','competitive'])for(const [index,scope] of scopes.entries()){
  const contexts=await Promise.all([h.browser.newContext({viewport:{width:1280,height:960}}),h.browser.newContext(h.devices['Pixel 5'])]);
  try{const guestName='Colega '+mode+' '+scope;
   const host=await boot(contexts[0],'Selección '+mode+' '+scope),guest=await boot(contexts[1],guestName);
   await host.waitForFunction(name=>atriaV5.snapshot().others.some(p=>p.name===name),guestName);
   await choose(host,mode,scope);
   await host.locator('#coopDoctors label').filter({hasText:guestName}).locator('input').check();await host.locator('[data-action="start-guard"]').click();
   if(mode==='coop'&&scope==='specific'){
    await host.reload();await host.waitForFunction(()=>document.body.dataset.boot==='ready');
    if(await host.locator('#enterButton').isVisible())await host.locator('#enterButton').click();
   }
   await guest.locator('#coopInviteNotice').waitFor({state:'visible'});await guest.locator('#coopInviteAccept').click();
   await Promise.all([host,guest].map(p=>p.waitForFunction(()=>atriaV5.diagnostics().cooperative.durable&&atriaV5.snapshot().clinical?.shift)));
   const states=await Promise.all([host,guest].map(p=>p.evaluate(()=>atriaV5.snapshot().clinical.shift)));
   assert.deepEqual(states[0].patients.map(p=>[p.uid,p.caseId]),states[1].patients.map(p=>[p.uid,p.caseId]));
   for(const s of states){assert.equal(s.guardSelection.scope,scope);assert.equal(s.guardSelection.multiplier,[1.5,1.2,1][index]);}
   if(scope==='specific')assert(states[0].patients.every(p=>p.caseId==='FECAL-001'));
   await host.reload();await host.waitForFunction(()=>document.body.dataset.boot==='ready');
   if(await host.locator('#enterButton').isVisible())await host.locator('#enterButton').click();
   await host.waitForFunction(()=>atriaV5.diagnostics().cooperative.durable&&atriaV5.snapshot().clinical?.shift);
   const recovered=await host.evaluate(()=>atriaV5.snapshot().clinical.shift);
   assert.deepEqual(recovered.guardSelection,states[0].guardSelection);
   assert.deepEqual(recovered.patients.map(p=>p.uid),states[0].patients.map(p=>p.uid));
   if(mode==='competitive'&&scope==='specific'){
    // One actual wall-clock admission in the browser. No clock mutation.
    await host.waitForFunction(()=>atriaV5.snapshot().clinical.shift.patients.length>=3,null,{timeout:200000});
    await guest.waitForFunction(()=>atriaV5.snapshot().clinical.shift.patients.length>=3,null,{timeout:15000});
    const later=await Promise.all([host,guest].map(p=>p.evaluate(()=>atriaV5.snapshot().clinical.shift)));
    assert(later.every(s=>s.patients.every(p=>p.caseId==='FECAL-001')));
    assert.deepEqual(later[0].patients.map(p=>[p.uid,p.caseId]),later[1].patients.map(p=>[p.uid,p.caseId]));
    assert(Math.abs(later[0].elapsedSeconds-later[1].elapsedSeconds)<3);
   }
   results.push({mode,scope,recovery:true,sharedSequence:true});console.log('SCOPE PASS',mode,scope);
  }finally{for(const c of contexts)await c.close();}
 }
 assert.deepEqual(errors,[]);console.log('GUARD SELECTION BROWSER PASS',JSON.stringify(results));
}finally{await h.close();}
