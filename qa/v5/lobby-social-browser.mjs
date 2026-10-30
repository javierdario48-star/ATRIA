import {clickHudAction} from './hud-actions.mjs';
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';

const h=await browserHarness({apiLatency:110}),guestBrowser=await h.newBrowser(),contexts=[],pages=[],errors=[];
let stage='boot';
try{
 for(const [i,browser] of [h.browser,guestBrowser].entries()){
  const ctx=await browser.newContext(i?h.devices['Pixel 5']:{viewport:{width:1280,height:960}});
  contexts.push(ctx);
  const page=await ctx.newPage();pages.push(page);page.setDefaultTimeout(40000);
  page.on('pageerror',e=>errors.push({doctor:i,error:e.message}));
  await page.goto(h.url);
  await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#playerName').fill(i?'Dr. Bruno':'Dra. Ana');
  await page.locator('#enterButton').click();
 }
 const [ana,bruno]=pages;
 stage='automatic lobby roster';
 await Promise.all([
  ana.waitForFunction(()=>atriaV5.snapshot().others.some(x=>x.name==='Dr. Bruno')),
  bruno.waitForFunction(()=>atriaV5.snapshot().others.some(x=>x.name==='Dra. Ana'))
 ]);
 stage='real HTTP lobby movement across two independent browsers';
 // Keep the directory open on the observing device: fast roster updates must
 // not replace the button the player is about to tap.
 await clickHudAction(ana,'peopleButton');
 assert.match(await ana.locator('#peopleButton').innerText(),/Personas · 1/);
 assert.equal(await ana.locator('#onlineDoctorsCount').innerText(),'1');
 await ana.evaluate(()=>window.__contactBeforeMotion=document.querySelector('#lobbyContacts [data-action="inspect-player"]'));
 const sampled=ana.evaluate(async()=>{
  const frames=[],start=performance.now();
  await new Promise(resolve=>{
   const read=()=>{
    const doctor=atriaV5.snapshot().others.find(p=>p.name==='Dr. Bruno');
    if(doctor)frames.push({at:performance.now(),x:doctor.x,y:doctor.y,moving:doctor.moving});
    if(performance.now()-start>4600)resolve();
    else requestAnimationFrame(read);
   };
   read();
  });
  return frames;
 });
 // Tap a reachable corridor tile instead of blindly tapping the avatar's
 // center or a part of the map covered by the in-game keyboard.
 if(await bruno.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')
  await bruno.locator('#keyboardToggleButton').click();
 await bruno.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
 const movementTap=await bruno.evaluate(()=>{
  const r=atriaV5.diagnostics().renderer,b=document.getElementById('game').getBoundingClientRect();
  return {x:b.left+(496-r.camera.x)*r.scale+r.anchorX,
   y:b.top+(1200-r.camera.y)*r.scale+r.anchorY};
 });
 await bruno.mouse.click(movementTap.x,movementTap.y);
 await bruno.waitForFunction(()=>{const p=atriaV5.snapshot().player;return p.moving||p.pathIndex>0;});
 const frames=await sampled;
 assert.equal(await ana.evaluate(()=>document.querySelector('#lobbyContacts [data-action="inspect-player"]')===window.__contactBeforeMotion),true,
  'frequent remote pose updates must not destroy the opened directory or pressed contacts');
 await ana.locator('#modalClose').click();
 const distances=frames.slice(1).map((p,i)=>Math.hypot(p.x-frames[i].x,p.y-frames[i].y));
 const remoteTravel=distances.reduce((a,b)=>a+b,0),maxRemoteJump=Math.max(0,...distances);
 assert(frames.length>60,'observe many distinct rendering frames on the other device');
 assert(remoteTravel>20,'the remote companion must really walk in the lobby');
 assert(maxRemoteJump<45,'remote pose must not jump across multiple steps as in the broken 1s transport');
 stage='global chat on both devices';
 const text='Hola Bruno, nos vemos en la guardia';
 await ana.locator('#dieInput').fill(text);await ana.locator('#chatForm [type="submit"]').click();
 await Promise.all(pages.map(p=>p.waitForFunction(text=>
  [...document.querySelectorAll('#chatHistory .line')].some(x=>x.textContent.includes(text)),text)));
 assert.equal((await bruno.locator('#chatHistory').innerText()).match(/Hola Bruno, nos vemos en la guardia/g)?.length,1);
 await bruno.waitForFunction(text=>atriaV5.snapshot().others.some(x=>x.name==='Dra. Ana'&&x.speechBubble?.text===text),text);
 await ana.waitForFunction(text=>atriaV5.snapshot().player.speechBubble?.text===text,text);
 stage='tap remote player on the original canvas';
 const tap=await ana.evaluate(()=>{
  const remote=atriaV5.snapshot().others.find(x=>x.name==='Dr. Bruno'),r=atriaV5.diagnostics().renderer,
   box=document.getElementById('game').getBoundingClientRect();
  const x=box.left+(remote.x-r.camera.x)*r.scale+r.anchorX,y=box.top+(remote.y-r.camera.y)*r.scale+r.anchorY;
  return {x,y,tag:document.elementFromPoint(x,y)?.id};
 });
 assert.equal(tap.tag,'game','the remote doctor must be tappable, not behind the HUD');
 await ana.mouse.click(tap.x,tap.y);
 await ana.locator('[data-action="add-friend"]').waitFor();
 stage='friend request and acceptance';
 await ana.locator('[data-action="add-friend"]').click();
 await ana.locator('#modalClose').click();
 await bruno.locator('#friendRequestNotice').waitFor({state:'visible',timeout:30000});
 assert.match(await bruno.locator('#friendRequestNotice').innerText(),/Dra\. Ana/);
 assert.equal(await bruno.locator('#notificationsCount').innerText(),'1');
 await bruno.locator('#friendRequestAccept').click();
 await bruno.locator('#friendRequestNotice').waitFor({state:'hidden'});
 await bruno.locator('#notificationsCount').waitFor({state:'hidden'});
 stage='direct invitation from tapped friend';
 await clickHudAction(ana,'peopleButton');
 await ana.locator('#lobbyContacts [data-action="inspect-player"]').filter({hasText:'Dr. Bruno'}).click();
 await ana.locator('[data-action="invite-friend"]').waitFor();
 assert.equal(await ana.locator('#friendCase').inputValue(),'PERI-PBE-001');
 await ana.locator('[data-action="invite-friend"]').dblclick();
 await ana.getByRole('heading',{name:'Invitación enviada'}).waitFor();
 stage='unilateral notification, acceptance without making another invitation';
 await bruno.locator('#coopInviteNotice').waitFor({state:'visible',timeout:30000});
 assert.match(await bruno.locator('#coopInviteNotice').innerText(),/Dra\. Ana/);
 assert.equal(await bruno.locator('#notificationsCount').innerText(),'1');
 await bruno.locator('#notificationsButton').click();
 assert.match(await bruno.locator('#coopInvitations').innerText(),/Dra\. Ana/);
 await bruno.locator('#modalClose').click();
 await bruno.locator('#coopInviteAccept').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().phase==='guard'&&
  atriaV5.snapshot().mode==='coop',null,{timeout:75000})));
 assert.equal(h.requests.filter(x=>x.path==='/api/rooms'&&x.status===201).length,1,
  'even a double tap creates one room; guest accepts without a counterinvitation');
 assert.deepEqual(errors,[]);
 console.log('V5 LOBBY SOCIAL UI PASS',JSON.stringify({chatBoth:true,bubble:true,friendTap:true,
  friendAccepted:true,unilateralInvitation:true,joinByNotification:true,remoteTravel,maxRemoteJump,phonesPhysical:false}));
}catch(e){const snapshots=await Promise.all(pages.map(async p=>p.evaluate(()=>({phase:atriaV5.snapshot().phase,
 mode:atriaV5.snapshot().mode,cooperative:atriaV5.diagnostics().cooperative,
 modal:document.getElementById('modalContent').textContent,toast:document.getElementById('toast').textContent}))));
 console.error('V5 LOBBY SOCIAL UI FAIL',JSON.stringify({stage,error:e.message,errors,snapshots}));throw e;}
finally{for(const ctx of contexts)await ctx.close().catch(()=>{});await guestBrowser.close().catch(()=>{});await h.close();}
