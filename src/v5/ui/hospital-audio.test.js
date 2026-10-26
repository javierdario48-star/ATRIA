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
 constructor(){this.currentTime=0;this.state='running';this.destination={};this.oscillators=[];}
 createGain(){return new Gain();}
 createOscillator(){const o=new Oscillator();this.oscillators.push(o);return o;}
 resume(){this.state='running';return Promise.resolve();}
 close(){this.state='closed';return Promise.resolve();}
}
const fixture=()=>{
 const store=new Map(),ctx={document:{hidden:false},AudioContext},
 storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 const audio=createHospitalAudio({window:ctx,storage});
 return {audio,ctx,store};
};
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
 assert(audio.state().activeNodes>=8);
 audio.setChannel('speech',false);assert.equal(audio.state().activeNodes,0);
 audio.speech('patient');assert.equal(audio.state().counters.speech,2);
 audio.setChannel('effects',false);audio.cue('uiAccept');
 assert.equal(audio.state().counters.effects,0);
 audio.destroy();
});
