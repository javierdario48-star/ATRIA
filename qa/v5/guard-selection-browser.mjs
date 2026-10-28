// UI acceptance on the built application and original durable authority.
import assert from 'node:assert/strict';
import {clinicalContent} from '../../src/v5/server/content.js';
import {guardCaseSpecialty} from '../../src/v5/clinical/guard-selection-policy.js';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness({durable:true}),errors=[],results=[];
assert(!process.env.V5_SCOPE_MODE||['solo','apprentice','coop','competitive'].includes(process.env.V5_SCOPE_MODE));
assert(!process.env.V5_SCOPE_SELECTION||['random','specialty','specific'].includes(process.env.V5_SCOPE_SELECTION));
const scopes=['random','specialty','specific'].filter(s=>!process.env.V5_SCOPE_SELECTION||process.env.V5_SCOPE_SELECTION===s);
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
  assert.deepEqual(await p.locator('#guardSpecialty option').allTextContents(),[...new Set(clinicalContent.cases.map(guardCaseSpecialty))]);
  await p.locator('#guardSpecialty').selectOption('Gastroenterología');
 }
 if(scope==='specific')await p.locator('#caseChoice').selectOption('FECAL-001');
}
try{
 for(const mode of ['solo','apprentice'].filter(m=>!process.env.V5_SCOPE_MODE||process.env.V5_SCOPE_MODE===m))for(const scope of scopes){
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
 for(const mode of ['coop','competitive'].filter(m=>!process.env.V5_SCOPE_MODE||process.env.V5_SCOPE_MODE===m))for(const scope of scopes){
  const contexts=await Promise.all([h.browser.newContext({viewport:{width:1280,height:960}}),h.browser.newContext(h.devices['Pixel 5'])]);
  try{const guestName='Colega '+mode+' '+scope;
   const host=await boot(contexts[0],'Selección '+mode+' '+scope),guest=await boot(contexts[1],guestName);
   await host.waitForFunction(name=>atriaV5.snapshot().others.some(p=>p.name===name),guestName);
   await choose(host,mode,scope);
   await host.locator('#coopDoctors label').filter({hasText:guestName}).locator('input').check();await host.locator('[data-action="start-guard"]').click();
   if(mode==='coop'&&scope==='specific'){
    // A click dispatches an async invitation request. Wait for its committed
    // response; unloading an uncommitted request intentionally cancels it.
    await host.locator('#modalContent h2').filter({hasText:'Invitación enviada'}).waitFor();
    await host.reload();await host.waitForFunction(()=>document.body.dataset.boot==='ready');
    if(await host.locator('#enterButton').isVisible())await host.locator('#enterButton').click();
   }
   await guest.locator('#coopInviteNotice').waitFor({state:'visible'});await guest.locator('#coopInviteAccept').click();
   try{await Promise.all([host,guest].map(p=>p.waitForFunction(()=>atriaV5.diagnostics().cooperative.durable&&atriaV5.snapshot().clinical?.shift)));}
   catch(error){console.error('ADMISSION DIAGNOSTICS',await Promise.all([host,guest].map(p=>p.evaluate(()=>({
    phase:atriaV5.snapshot().phase,cooperative:atriaV5.diagnostics().cooperative,
    room:localStorage.getItem('atria.v5.coop.room'),actor:localStorage.getItem('atria.v5.coop.actor'),
    modal:document.getElementById('modalContent').innerText,toast:document.getElementById('toast').innerText
   })))));console.error('FAILED REQUESTS',h.requests.filter(x=>x.path==='/api/clinical'&&x.status!==200).slice(-12));throw error;}
   const states=await Promise.all([host,guest].map(p=>p.evaluate(()=>atriaV5.snapshot().clinical.shift)));
   assert.deepEqual(states[0].patients.map(p=>[p.uid,p.caseId]),states[1].patients.map(p=>[p.uid,p.caseId]));
   for(const s of states){assert.equal(s.guardSelection.scope,scope);assert.equal(s.guardSelection.multiplier,{random:1.5,specialty:1.2,specific:1}[scope]);}
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
