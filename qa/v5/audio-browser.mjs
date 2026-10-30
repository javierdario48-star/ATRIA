import {clickHudAction,musicControl} from './hud-actions.mjs';
// Audio acceptance only: no clinical commands, accelerated cases or physiology writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';

const output='qa/v5-audio-results';await fs.mkdir(output,{recursive:true});
// Web Audio on a top-level page requires document activation; the older
// user-gesture policy only blocks cross-origin frames in current Chromium.
const h=await browserHarness({durable:true,browserArgs:['--autoplay-policy=document-user-activation-required']}),errors=[],results=[];
const initialAudio=new WeakMap();
async function pageFor(context,name){
 const p=await context.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  window.qaAudio={contexts:0,decodes:0,starts:[]};const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   constructor(...args){super(...args);qaAudio.contexts++;
    const make=this.createBufferSource.bind(this),decode=this.decodeAudioData.bind(this);
    this.createBufferSource=()=>{const s=make(),start=s.start.bind(s);
     s.start=(when=0,offset=0)=>{qaAudio.starts.push({duration:s.buffer?.duration,loop:s.loop,offset});return start(when,offset);};return s;};
    this.decodeAudioData=(...args)=>{qaAudio.decodes++;return decode(...args);};
   }
  };
 });
 await p.goto(h.url);
 // Playwright evaluate/waitForFunction grants a synthetic user gesture. Read
 // initial state through passive CDP so the observer cannot unlock the audio.
 const observer=await context.newCDPSession(p),deadline=Date.now()+45000;
 try{
  while(true){
   const {result,exceptionDetails}=await observer.send('Runtime.evaluate',{
    expression:"({ready:document.body?.dataset.boot==='ready',audio:window.atriaV5?.diagnostics().audio,activated:navigator.userActivation.hasBeenActive})",
    returnByValue:true,userGesture:false});
   assert(!exceptionDetails,'passive audio observation must succeed');
   if(result.value?.ready&&result.value.audio?.music?.status==='ready'){
    initialAudio.set(p,result.value);break;
   }
   if(Date.now()>deadline)throw Error('Audio did not become ready: '+JSON.stringify(result.value));
   await new Promise(resolve=>setTimeout(resolve,50));
  }
 }finally{await observer.detach();}
 if(name)await p.locator('#playerName').fill(name);return p;
}
const audio=p=>p.evaluate(()=>atriaV5.diagnostics().audio);
async function lobby(p){await p.locator('#enterButton').click();await p.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');}
async function settings(p){await clickHudAction(p,'audioButton');}
async function leaveSettings(p){await p.locator('#modalClose').click();}
async function choose(p,mode){
 await p.locator('#guardButton').click();await p.locator('[data-mode="'+mode+'"]').click();
 await p.locator('input[name="guardScope"][value="specific"]').check();await p.locator('#caseChoice').selectOption('PUD-001');
}
async function start(p,mode){await choose(p,mode);await p.locator('[data-action="start-guard"]').click();await p.waitForFunction(()=>atriaV5.snapshot().phase==='guard');}
async function visibleControl(p){
 if(!await p.locator('#musicToggleButton').isVisible()){
  const control=await musicControl(p);
  assert(await control.action.isVisible(),'compact Audio menu exposes the music channel');
  await control.close();return;
 }
 assert(await p.locator('#musicToggleButton').isVisible());
 const layout=await p.evaluate(()=>{
  const a=document.getElementById('musicToggleButton').getBoundingClientRect();
  const overlaps=[...document.querySelectorAll('#guardTime,#chatDock,#hud button:not(#musicToggleButton)')].filter(el=>{
   const b=el.getBoundingClientRect();return b.width&&b.height&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  }).map(el=>el.id);
  return {overlaps,fits:a.left>=0&&a.top>=0&&a.right<=innerWidth&&a.bottom<=innerHeight};
 });
 assert.equal(layout.fits,true);assert.deepEqual(layout.overlaps,[]);
}
async function toggleMusic(p,{double=false}={}){
 const control=await musicControl(p),before=(await audio(p)).counters.effects;
 if(double)await control.action.dblclick();else await control.action.click();
 const effects=(await audio(p)).counters.effects-before;
 await control.close();return effects;
}
async function offlineGraph(p){
 return p.evaluate(async()=>{
  const {createMusicTransport}=await import('/src/v5/ui/music-transport.js');
  const ctx=new OfflineAudioContext(1,6*48000,48000),buffer=ctx.createBuffer(1,48000,48000);
  buffer.getChannelData(0).fill(1);
  const m=createMusicTransport({context:ctx,destination:ctx.destination,loadBuffer:async()=>buffer});
  const classic=ctx.createBufferSource();classic.buffer=buffer;classic.loop=true;classic.connect(m.classicOutput);classic.start();
  m.select('new');await Promise.resolve();await Promise.resolve();let crossAt,muteAt;
  const cross=ctx.suspend(1).then(()=>{crossAt=ctx.currentTime;m.select('classic');return ctx.resume();});
  const mute=ctx.suspend(4).then(()=>{muteAt=ctx.currentTime;m.setLevel(1,false);return ctx.resume();});
  const rendered=await ctx.startRendering();await Promise.all([cross,mute]);const x=rendered.getChannelData(0);
  const sample=t=>x[Math.round(t*48000)];
  const values={crossHalf:sample(crossAt+1.25),classic:sample(crossAt+2.6),muteHalf:sample(muteAt+.125),muted:sample(muteAt+.3)};
  m.destroy();return values;
 });
}
async function offlineOriginalLoop(p){
 return p.evaluate(async()=>{
  const [{createAudioAssetCache},{createMusicTransport}]=await Promise.all([
   import('/src/v5/ui/audio-assets.js'),import('/src/v5/ui/music-transport.js')]);
  const decode=new OfflineAudioContext(1,1,48000),cache=createAudioAssetCache({window,context:decode}),buffer=await cache.load('theme');
  const frames=buffer.length,ctx=new OfflineAudioContext(2,frames+24000,buffer.sampleRate);
  const music=createMusicTransport({context:ctx,destination:ctx.destination,loadBuffer:async()=>buffer});
  music.select('new');await Promise.resolve();await Promise.resolve();
  const rendered=await ctx.startRendering(),x=rendered.getChannelData(0),source=buffer.getChannelData(0);
  const offset=7200;const result={duration:buffer.duration,frames,starts:music.state().starts,
   repeated:x[frames+offset],expected:source[offset]*.308,seamDelta:Math.abs(x[frames]-x[frames-1]),
   outputAfterLoop:x.slice(frames+4800,frames+9600).some(v=>Math.abs(v)>.001)};
  music.destroy();cache.destroy();return result;
 });
}
try{
 for(const name of ['desktop','mobile','landscape']){
  const options=name==='mobile'?h.devices['Pixel 5']:{viewport:name==='desktop'?{width:1280,height:800}:{width:844,height:390},hasTouch:name==='landscape'};
  const context=await h.browser.newContext(options);
  try{
   const p=await pageFor(context);
   const initial=initialAudio.get(p),locked=initial.audio;
   assert.equal(initial.activated,false,'audio inspection must not grant user activation');
   assert.equal(locked.lobbyTrack,'new');assert.equal(locked.guardTrack,'classic');
   assert.equal(locked.contextState,'suspended','strict autoplay policy blocks until a gesture');
   await p.locator('#avatarNextColor').click();await p.waitForFunction(()=>atriaV5.diagnostics().audio.contextState==='running');
   await visibleControl(p);await p.screenshot({path:output+'/'+name+'-title.png'});
   await p.locator('#playerName').fill('Audio '+name);
   assert.equal((await audio(p)).music.track,'new');assert.equal((await audio(p)).clickStatus,'ready');
   const first=(await audio(p)).music.starts;assert.equal(first,1);
   await p.locator('[data-avatar-sex="female"]').click();await lobby(p);await visibleControl(p);
   assert.equal((await audio(p)).music.starts,first,'title/avatar/lobby share the same source');
   await p.waitForTimeout(120);
   // Debounced UI sounds belong to the native button. Compact screens use
   // the channel checkbox, whose changes do not synthesize button sounds.
   if(await p.locator('#musicToggleButton').isVisible()){
    const tapEffects=await toggleMusic(p,{double:true});
    assert.equal(tapEffects,1,'rapid double-click produces exactly one sample');
   }
   await toggleMusic(p);
   await p.waitForFunction(()=>{const m=atriaV5.diagnostics().audio.music;return m.level===0&&m.sourceCount===0;});
   const muted=await audio(p);assert.equal(muted.channels.monitor,true);assert.equal(muted.channels.speech,true);
   assert.equal(muted.music.sourceCount,0);const offset=muted.music.position;
   await toggleMusic(p);await p.waitForFunction(()=>atriaV5.diagnostics().audio.music.sourceCount===1);
   const starts=await p.evaluate(()=>qaAudio.starts.filter(s=>s.loop));assert(Math.abs(starts.at(-1).offset-offset)<.02);
   await settings(p);
   for(const [id,value] of [['audioMusicVolume','47'],['audioEffectsVolume','61']])
    await p.locator('#'+id).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await leaveSettings(p);
   for(const mode of ['solo','apprentice']){
    await start(p,mode);await p.waitForFunction(()=>{const m=atriaV5.diagnostics().audio.music;return m.track==='classic'&&m.mix.new>.05&&m.mix.classic>.05;});
    const mix=(await audio(p)).music.mix;assert(Math.abs(mix.new+mix.classic-1)<.002);await visibleControl(p);
    await p.waitForFunction(()=>atriaV5.diagnostics().audio.music.sourceCount===0);
    if(mode==='solo')await p.screenshot({path:output+'/'+name+'-guard.png'});
    await p.locator('#guardButton').click();await p.waitForFunction(()=>atriaV5.diagnostics().audio.music.track==='new');
    await p.waitForFunction(()=>atriaV5.diagnostics().audio.music.mix.new===1);
   }
   await settings(p);await p.locator('[data-audio-screen="guard"]').selectOption('new');await leaveSettings(p);
   const sharedStarts=(await audio(p)).music.starts;
   for(let i=0;i<4;i++){
    await start(p,i%2?'apprentice':'solo');await p.locator('#guardButton').click();
    await p.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
   }
   assert.equal((await audio(p)).music.starts,sharedStarts,'same composition never restarts on rapid entry/exit');
   await settings(p);await p.locator('[data-audio-screen="lobby"]').selectOption('classic');
   await p.waitForFunction(()=>atriaV5.diagnostics().audio.music.mix.classic>.05);
   await p.locator('[data-audio-screen="lobby"]').selectOption('new');await leaveSettings(p);
   await p.waitForFunction(()=>atriaV5.diagnostics().audio.music.mix.new===1);
   assert.equal(await p.evaluate(()=>qaAudio.contexts),1);assert((await p.evaluate(()=>qaAudio.decodes))<=3);
   if(name==='desktop'){
    const real=await offlineGraph(p);assert(Math.abs(real.crossHalf-.854)<.002,JSON.stringify(real));
    assert(Math.abs(real.classic-1.4)<.002);assert(Math.abs(real.muteHalf-.7)<.002);assert.equal(real.muted,0);
    const loop=await offlineOriginalLoop(p);assert(loop.duration>164&&loop.duration<165);assert.equal(loop.starts,1);
    assert(Math.abs(loop.repeated-loop.expected)<.00001);assert(loop.seamDelta<.00001);assert.equal(loop.outputAfterLoop,true);
    results.push({realWebAudioCrossfade:real,realOriginalLoop:loop});
   }
   await toggleMusic(p);await p.reload();await p.waitForFunction(()=>document.body.dataset.boot==='ready');
   const saved=await audio(p);assert.equal(saved.channels.music,false);assert.equal(saved.musicVolume,.47);assert.equal(saved.effectsVolume,.61);
   assert.equal(saved.guardTrack,'new');assert.equal(saved.lobbyTrack,'new');assert.equal(saved.music.sourceCount,0);
   await toggleMusic(p);await p.waitForFunction(()=>atriaV5.diagnostics().audio.contextState==='running');
   await p.evaluate(()=>atriaV5.destroy());const disposed=await audio(p);assert.equal(disposed.music.sourceCount,0);assert.equal(disposed.activeNodes,0);
   assert.equal(disposed.contextState,'uninitialized');results.push({viewport:name,autoplay:true,solo:true,apprentice:true,persistence:true,cleanup:true});
  }finally{await context.close();}
 }
 for(const mode of ['coop','competitive']){
  const contexts=await Promise.all([h.browser.newContext({viewport:{width:1280,height:800}}),h.browser.newContext(h.devices['Pixel 5'])]);
  try{
   const host=await pageFor(contexts[0],'Audio host '+mode),guest=await pageFor(contexts[1],'Audio guest '+mode);
   await lobby(host);await lobby(guest);
   await host.waitForFunction(n=>atriaV5.snapshot().others.some(p=>p.name===n),'Audio guest '+mode);
   await choose(host,mode);await host.locator('#coopDoctors label').filter({hasText:'Audio guest '+mode}).locator('input').check();
   await host.locator('[data-action="start-guard"]').click();
   await guest.locator('#coopInviteNotice').waitFor({state:'visible'});await guest.locator('#coopInviteAccept').click();
   for(const p of [host,guest]){
    await p.waitForFunction(mode=>atriaV5.snapshot().phase==='guard'&&atriaV5.snapshot().mode===mode&&atriaV5.diagnostics().cooperative.durable,mode);
    await p.waitForFunction(()=>atriaV5.diagnostics().audio.music.track==='classic');await visibleControl(p);
    await toggleMusic(p);assert.equal((await audio(p)).channels.monitor,true);
   }
   results.push({mode,desktopAndMobile:true,durable:true,musicAndClinicalChannelsIndependent:true});
  }finally{for(const c of contexts)await c.close();}
 }
 assert.deepEqual(errors,[]);await fs.writeFile(output+'/results.json',JSON.stringify({passed:true,results,errors},null,2));
 console.log('ATRIA AUDIO BROWSER PASS',JSON.stringify(results));
}catch(error){
 await fs.writeFile(output+'/failure.json',JSON.stringify({error:error.stack,results,errors},null,2));throw error;
}finally{await h.close();}
