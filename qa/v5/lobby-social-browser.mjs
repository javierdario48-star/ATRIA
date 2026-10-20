import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';

const h=await browserHarness({apiLatency:25}),guestBrowser=await h.newBrowser(),contexts=[],pages=[],errors=[];
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
 await bruno.locator('#peopleButton').click();
 await bruno.locator('#friendRequests [data-action="accept-friend"]').waitFor();
 await bruno.locator('#friendRequests [data-action="accept-friend"]').click();
 await bruno.locator('#modalClose').click();
 stage='direct invitation from tapped friend';
 await ana.locator('#peopleButton').click();
 await ana.locator('#lobbyContacts [data-action="inspect-player"]').filter({hasText:'Dr. Bruno'}).click();
 await ana.locator('[data-action="invite-friend"]').waitFor();
 assert.equal(await ana.locator('#friendCase').inputValue(),'PERI-PBE-001');
 await ana.locator('[data-action="invite-friend"]').click();
 await ana.getByRole('heading',{name:'Invitación enviada'}).waitFor();
 stage='unilateral notification, acceptance without making another invitation';
 await bruno.locator('#coopInviteNotice').waitFor({state:'visible',timeout:30000});
 assert.match(await bruno.locator('#coopInviteNotice').innerText(),/Dra\. Ana/);
 await bruno.locator('#coopInviteAccept').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().phase==='guard'&&
  atriaV5.snapshot().mode==='coop',null,{timeout:75000})));
 assert.equal(h.requests.filter(x=>x.path==='/api/rooms'&&x.status===201).length,1,
  'only the host creates an invitation; guest accepts it without a counterinvitation');
 assert.deepEqual(errors,[]);
 console.log('V5 LOBBY SOCIAL UI PASS',JSON.stringify({chatBoth:true,bubble:true,friendTap:true,
  friendAccepted:true,unilateralInvitation:true,joinByNotification:true,phonesPhysical:false}));
}catch(e){console.error('V5 LOBBY SOCIAL UI FAIL',JSON.stringify({stage,error:e.message,errors}));throw e;}
finally{for(const ctx of contexts)await ctx.close().catch(()=>{});await guestBrowser.close().catch(()=>{});await h.close();}
