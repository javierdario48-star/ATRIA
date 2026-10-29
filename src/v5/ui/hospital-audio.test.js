import test from 'node:test';
import assert from 'node:assert/strict';
import {createHospitalAudio,monitorBeatIntervalMs,audibleMonitorVitals} from './hospital-audio.js';
const patient=(hr=80)=>({uid:'P1',caseEnded:false,patientDied:false,
 procedures:{monitor:{connected:true}},lastVitalsKnown:{vitals:{
  hr,sys:120,spo2:98,rr:16
 }}});
class Param{
 constructor(){this.value=0;}
 setValueAtTime(n){this.value=n;}
 exponentialRampToValueAtTime(n){this.value=n;}
 linearRampToValueAtTime(n){this.value=n;}
 cancelScheduledValues(){}
}
class Oscillator{
 constructor(){this.frequency=new Param();this.stopCalls=0;}
 connect(){return this;}
 disconnect(){}
 start(){}
 stop(){this.stopCalls++;this.onended?.();}
}
class Gain{
 constructor(){this.gain=new Param();}
 connect(){return this;}
 disconnect(){}
}
class AudioContext{
 constructor(){this.currentTime=0;this.state='running';this.destination={};this.oscillators=[];this.sources=[];}
 createGain(){return new Gain();}
 createOscillator(){const o=new Oscillator();this.oscillators.push(o);return o;}
 createBufferSource(){const o=new Oscillator();o.start=(time,offset)=>{o.offset=offset;};o.stop=()=>{o.stopped=true;o.onended?.();};this.sources.push(o);return o;}
 decodeAudioData(bytes){return Promise.resolve({duration:new Uint8Array(bytes)[0]===1?.19:164.4135});}
 resume(){this.state='running';return Promise.resolve();}
 close(){this.state='closed';return Promise.resolve();}
}
const fixture=()=>{
 let context;class RecordingContext extends AudioContext{constructor(){super();context=this;}}
 const store=new Map(),ctx={document:{hidden:false},AudioContext:RecordingContext,
  fetch:async url=>({ok:true,arrayBuffer:async()=>new Uint8Array([String(url).endsWith('.wav')?1:2]).buffer})},
 storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 const audio=createHospitalAudio({window:ctx,storage});
 return {audio,ctx,store,get context(){return context;}};
};
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
test('a new player gets a moderate louder default while saved volume and mute remain exact',()=>{
 const fresh=fixture();assert(fresh.audio.state().volume>.62&&fresh.audio.state().volume<=.78);
 const storage={getItem:()=>JSON.stringify({volume:.31,enabled:false}),setItem:()=>{}};
 const saved=createHospitalAudio({window:fresh.ctx,storage});assert.equal(saved.state().volume,.31);assert.equal(saved.state().enabled,false);
});
test('menu clicks use the supplied sample, rate-limit fast taps, and never cancel clinical effects',async()=>{
 const f=fixture(),a=f.audio;a.unlock();await settle();
 a.cue('studyReady');const clinical=f.context.oscillators.length;
 a.cue('uiTap');const count=f.context.sources.length;
 a.cue('uiChange');a.cue('uiTap');assert.equal(f.context.sources.length,count);
 assert.equal(f.context.oscillators.length,clinical,'no synthetic UI motif or added echoes');
 assert.equal(a.state().counters.effects,2);
 f.context.currentTime=.12;a.cue('uiChange');assert.equal(f.context.sources.length,count+1);
 assert.equal(a.state().counters.effects,3);a.setEnabled(false);a.cue('uiChange');
 assert.equal(f.context.sources.length,count+1);a.destroy();
});
test('monitor follows real measured HR and never invents a beep for missing or disconnected readings',()=>{
 assert.equal(monitorBeatIntervalMs(60),1000);
 assert.equal(monitorBeatIntervalMs(120),500);
 assert.equal(monitorBeatIntervalMs(0),null);
 assert.equal(audibleMonitorVitals({procedures:{monitor:{connected:true}}}),null);
 assert.equal(audibleMonitorVitals({...patient(),patientDied:true}),null);
 assert.equal(audibleMonitorVitals({...patient(),procedures:{monitor:{connected:false}}}),null);
 assert.equal(audibleMonitorVitals(patient(82)).hr,82);
});
test('V4-inspired music and monitor run on caller tick, with mute and teardown',()=>{
 const {audio,ctx,store}=fixture();
 audio.tick(200,{phase:'guard',patient:patient(60)});
 assert.equal(audio.state().counters.monitor,0,'never creates audio before user gesture');
 audio.unlock();
 audio.tick(300,{phase:'guard',patient:patient(60)});
 assert(audio.state().counters.music>0,'melody starts with a gesture');
 assert.equal(audio.state().monitorHR,60);
 let count=audio.state().counters.monitor;
 // Fake AudioContext clock is moved explicitly; there is no extra timer.
 audio.tick(500,{phase:'guard',patient:patient(60)});
 audio.setChannel('monitor',false);
 audio.tick(700,{phase:'guard',patient:patient(120)});
 assert.equal(audio.state().monitorHR,null);
 assert.equal(audio.state().counters.monitor,count);
 audio.setChannel('monitor',true);
 audio.tick(900,{phase:'guard',patient:patient(120)});
 assert.equal(audio.state().monitorHR,120);
 audio.setEnabled(false);
 audio.tick(1200,{phase:'guard',patient:patient(120)});
 assert.equal(audio.state().activeNodes,0);
 assert.equal(audio.state().enabled,false);
 assert(store.has('atria.v5.audio.v1'));
 audio.destroy();assert.equal(audio.state().contextState,'uninitialized');
});
test('background suspends both music and heart monitor; patient death mutes beats',()=>{
 const {audio,ctx}=fixture();audio.unlock();
 audio.tick(500,{phase:'guard',patient:patient()});
 assert.equal(audio.state().monitorHR,80);
 ctx.document.hidden=true;
 audio.tick(700,{phase:'guard',patient:patient()});
 assert.equal(audio.state().activeNodes,0);
 ctx.document.hidden=false;
 audio.tick(900,{phase:'guard',patient:patient()});
 assert.equal(audio.state().monitorHR,80);
 audio.tick(1200,{phase:'guard',patient:{...patient(),patientDied:true}});
 assert.equal(audio.state().monitorHR,null);
 audio.destroy();
});

test('measured monitor sound tracks variable ECG HR without fixed bpm presets',()=>{
 const {audio}=fixture();audio.unlock();
 const p=patient(78);
 audio.tick(100,{phase:'guard',patient:p});
 assert.equal(audio.state().monitorHR,78);
 p.lastVitalsKnown.vitals.hr=109;
 audio.tick(220,{phase:'guard',patient:p});
 assert.equal(audio.state().monitorHR,109);
 assert.equal(monitorBeatIntervalMs(audio.state().monitorHR),60000/109);
 p.procedures.monitor.connected=false;
 audio.tick(340,{phase:'guard',patient:p});
 assert.equal(audio.state().monitorHR,null);
 audio.destroy();
});

test('subtle patient message, echoed nurse, and independent default-on mute channels',()=>{
 const {audio}=fixture();audio.unlock();
 audio.speech('patient');audio.speech('nurse');
 assert.equal(audio.state().counters.speech,2);
 assert.equal(audio.state().activeNodes,0,'fake osc.onended cleans up synchronously');
 audio.setChannel('speech',false);assert.equal(audio.state().activeNodes,0);
 audio.speech('patient');assert.equal(audio.state().counters.speech,2);
 audio.setChannel('effects',false);audio.cue('uiAccept');
 assert.equal(audio.state().counters.effects,0);
 audio.destroy();
});

test('legacy mute, volume, focus melody and custom preferences survive the compatible migration',()=>{
 const f=fixture(),old={enabled:false,volume:.31,track:'enfoque',channels:{music:false,effects:false,monitor:true},custom:'keep'};
 f.store.set('atria.v5.audio.v1',JSON.stringify(old));
 const audio=createHospitalAudio({window:f.ctx,storage:{getItem:k=>f.store.get(k),setItem:(k,v)=>f.store.set(k,v)}});
 assert.equal(audio.state().lobbyTrack,'new');assert.equal(audio.state().guardTrack,'classic');
 assert.equal(audio.state().track,'enfoque');assert.equal(audio.state().enabled,false);
 audio.setMusicVolume(.42);audio.setEffectsVolume(.6);
 const saved=JSON.parse(f.store.get('atria.v5.audio.v1'));
 assert.equal(saved.volume,.31);assert.equal(saved.custom,'keep');assert.equal(saved.channels.music,false);assert.equal(saved.channels.effects,false);
 audio.destroy();
});
test('title starts the new theme and music-only mute leaves clinical channels operating',async()=>{
 const f=fixture(),a=f.audio;a.unlock();await settle();a.tick(100,{phase:'title'});
 assert.equal(a.state().music.track,'new');assert.equal(a.state().music.sourceCount,1);
 a.setChannel('music',false);f.context.currentTime=1;a.tick(1100,{phase:'guard',patient:patient(80)});
 assert.equal(a.state().music.sourceCount,0);assert.equal(a.state().monitorHR,80);
 a.speech('nurse');a.cue('studyReady');
 assert.equal(a.state().counters.speech,1);assert.equal(a.state().counters.effects,1);
 a.setChannel('music',true);a.setMusicTrack('guard','new');a.tick(1300,{phase:'guard'});
 assert.equal(a.state().music.track,'new');assert.equal(a.state().enabled,true);a.destroy();
});
test('all guard modes use the same classic renderer and shared new music never restarts',async()=>{
 const f=fixture(),a=f.audio;a.unlock();await settle();
 for(const [i,mode] of ['apprentice','solo','coop','competitive'].entries()){
  f.context.currentTime=i+1;a.tick((i+1)*1000,{phase:'guard',mode});
  assert.equal(a.state().music.track,'classic',mode);
 }
 a.setMusicTrack('guard','new');a.tick(5100,{phase:'guard'});f.context.currentTime=8;a.tick(8100,{phase:'lobby'});
 const starts=a.state().music.starts;
 a.tick(8300,{phase:'guard'});a.tick(8500,{phase:'lobby'});
 assert.equal(a.state().music.starts,starts);assert.equal(a.state().music.sourceCount,1);a.destroy();
});
test('a saved music mute creates no audible source on initialization',async()=>{
 const f=fixture();f.store.set('atria.v5.audio.v1',JSON.stringify({channels:{music:false}}));
 const a=createHospitalAudio({window:f.ctx,storage:{getItem:k=>f.store.get(k)}});
 a.unlock();await settle();a.tick(100,{phase:'title'});
 assert.equal(a.state().music.sourceCount,0);assert.equal(a.state().counters.music,0);a.destroy();
});
test('one context and one asset decode are retained across mute, navigation and resumption',async()=>{
 const f=fixture(),a=f.audio;a.unlock();await settle();const context=f.context;
 a.tick(100,{phase:'title'});a.pause();a.unlock();a.tick(300,{phase:'lobby'});a.setMusicTrack('guard','new');
 a.tick(500,{phase:'guard'});a.unlock();assert.equal(f.context,context);
 a.destroy();a.unlock();assert.equal(a.state().contextState,'uninitialized','destroyed audio cannot resurrect');
});

test('a closed browser context recovers once and pauses retain silence until unlock',async()=>{
 const f=fixture(),a=f.audio;a.unlock();await settle();const first=f.context;
 a.pause();a.tick(100,{phase:'title'});assert.equal(a.state().music.sourceCount,0);
 a.unlock();first.state='closed';a.unlock();await settle();
 assert.notEqual(f.context,first);assert.equal(first.sources.filter(s=>!s.stopped).length,0,'old music graph released before recovery');a.destroy();
});

test('UI clicks recover immediately after replacing a context with a newer clock',async()=>{
 const f=fixture(),a=f.audio;a.unlock();await settle();
 f.context.currentTime=120;a.cue('uiTap');const before=a.state().counters.effects;
 f.context.state='closed';a.unlock();await settle();a.cue('uiChange');
 assert.equal(a.state().counters.effects,before+1,'new context must not inherit the old 120 second click cooldown');a.destroy();
});
